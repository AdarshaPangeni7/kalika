import crypto from "node:crypto";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const host = process.env.KALIKA_ADMIN_HOST || "127.0.0.1";
const port = Number(process.env.KALIKA_ADMIN_PORT || 8789);
const siteOrigin = (process.env.KALIKA_SITE_ORIGIN || "https://kalikatools.com").replace(/\/+$/, "");
const adminUser = process.env.KALIKA_ADMIN_USER || "admin";
const adminPassword = process.env.KALIKA_ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
const sessions = new Map();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);

    if (url.pathname === "/login" && request.method === "POST") return handleLogin(request, response);
    if (url.pathname === "/logout") return handleLogout(request, response);
    if (!isAuthenticated(request)) return sendLogin(response);

    if (url.pathname === "/") return sendHtml(response, dashboardHtml());
    if (url.pathname === "/api/scan") return sendJson(response, await scanSite());
    if (url.pathname === "/api/latest-report") return sendJson(response, await latestReport());

    sendText(response, "Not found", 404);
  } catch (error) {
    sendJson(response, { error: error.message }, 500);
  }
});

server.listen(port, host, () => {
  console.log(`Kalika SEO admin is running at http://${host}:${port}`);
  console.log(`Username: ${adminUser}`);
  console.log(`Password: ${adminPassword}`);
  if (!process.env.KALIKA_ADMIN_PASSWORD) {
    console.log("This one-time password changes each time. Set KALIKA_ADMIN_PASSWORD to keep your own password.");
  }
});

async function handleLogin(request, response) {
  const body = await readBody(request);
  const params = new URLSearchParams(body);
  const user = params.get("username") || "";
  const pass = params.get("password") || "";

  if (safeEqual(user, adminUser) && safeEqual(pass, adminPassword)) {
    const token = crypto.randomBytes(24).toString("base64url");
    sessions.set(token, Date.now() + 1000 * 60 * 60 * 8);
    response.writeHead(302, {
      Location: "/",
      "Set-Cookie": `kalika_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`
    });
    response.end();
    return;
  }

  sendLogin(response, true);
}

function handleLogout(_request, response) {
  response.writeHead(302, {
    Location: "/",
    "Set-Cookie": "kalika_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
  });
  response.end();
}

function isAuthenticated(request) {
  const token = parseCookies(request.headers.cookie || "").kalika_admin;
  if (!token || !sessions.has(token)) return false;
  if (sessions.get(token) < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

async function scanSite() {
  const routes = await getRoutes();
  const pages = [];
  for (const route of routes) pages.push(await scanRoute(route));
  return {
    siteOrigin,
    checkedAt: new Date().toISOString(),
    pages,
    summary: {
      pages: pages.length,
      tools: pages.filter((page) => page.route.startsWith("/tools/")).length,
      issues: pages.reduce((sum, page) => sum + page.issues.length, 0)
    }
  };
}

async function getRoutes() {
  const response = await fetch(`${siteOrigin}/sitemap.xml`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load sitemap.xml from ${siteOrigin}`);
  const text = await response.text();
  const routes = [...text.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname)
    .filter((route) => !route.startsWith("/admin"))
    .map((route) => route.endsWith("/") && route !== "/" ? route : route.replace(/\/$/, "") || "/");
  return [...new Set(routes)];
}

async function scanRoute(route) {
  const response = await fetch(`${siteOrigin}${route}`, { cache: "no-store", redirect: "follow" });
  const html = response.ok ? await response.text() : "";
  const seo = parseSeo(html);
  const issues = [];

  if (!response.ok) issues.push(`HTTP ${response.status}`);
  if (seo.title.length < 50 || seo.title.length > 60) issues.push(`Title is ${seo.title.length} chars; target 50-60`);
  if (seo.description.length < 140 || seo.description.length > 160) issues.push(`Description is ${seo.description.length} chars; target 140-160`);
  if (!seo.canonical) issues.push("Missing canonical");
  if (seo.h1Count !== 1) issues.push(`${seo.h1Count} H1 tags; target 1`);
  if (route.startsWith("/tools/") && !/WebApplication|SoftwareApplication/.test(seo.schemaText)) issues.push("Missing tool schema");
  if (route.startsWith("/tools/") && /Frequently Asked Questions|FAQ/i.test(html) && !/FAQPage/.test(seo.schemaText)) issues.push("Missing FAQPage schema");

  return { route, status: response.status, ...seo, issues };
}

function parseSeo(html) {
  const schemaText = [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join("\n");
  return {
    title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    titleLength: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i).length,
    description: firstMatch(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
      || firstMatch(html, /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i),
    descriptionLength: (firstMatch(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
      || firstMatch(html, /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)).length,
    canonical: firstMatch(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i)
      || firstMatch(html, /<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i),
    h1: firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    h1Count: (html.match(/<h1\b/gi) || []).length,
    schema: [...schemaText.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((match) => match[1]).join(", ") || "None",
    schemaText
  };
}

async function latestReport() {
  const file = path.join(process.cwd(), "reports", "latest.md");
  try {
    return { text: await readFile(file, "utf8") };
  } catch {
    return { text: "No local maintenance report found yet. Run npm run check:weekly to create one." };
  }
}

function dashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kalika Local SEO Admin</title>
<style>
:root{color-scheme:light;--ink:#102033;--muted:#5d6b7a;--line:#d9e2ea;--paper:#f7f3ec;--surface:#fffaf2;--brand:#0d6b78;--accent:#c8751a}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,Segoe UI,Arial,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:34px 18px 70px}.top{display:flex;justify-content:space-between;gap:18px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:22px}h1{font-size:clamp(2rem,5vw,4rem);margin:0}.kicker{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--brand)}.intro{max-width:740px;color:var(--muted);font-size:1.05rem}.actions{display:flex;gap:10px;flex-wrap:wrap}button,a.button{border:1px solid var(--ink);background:var(--ink);color:white;border-radius:7px;padding:11px 14px;font-weight:800;cursor:pointer;text-decoration:none}.secondary{background:transparent!important;color:var(--ink)!important}.grid{display:grid;grid-template-columns:280px minmax(0,1fr);gap:22px;margin-top:24px}.panel{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:18px}.cards{display:grid;gap:10px}.card{background:white;border:1px solid var(--line);border-radius:8px;padding:12px}.card strong{display:block;font-size:1.5rem}.filter{display:grid;gap:8px;margin-top:18px}input,textarea,select{width:100%;border:1px solid var(--line);border-radius:7px;padding:10px;background:white;color:var(--ink);font:inherit}.table{overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:10px}table{width:100%;border-collapse:collapse;min-width:940px}th,td{padding:12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;background:white}.pill{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:.78rem;font-weight:800}.good{background:#e9f6ef;color:#126032}.review{background:#fff4dc;color:#7a4b00}.bad{background:#fdecea;color:#8a1f11}.route{border:0;background:none;color:var(--brand);padding:0;font-weight:800}.draft{white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace;background:white;border:1px dashed var(--line);border-radius:8px;padding:12px;max-height:320px;overflow:auto}.quiet{color:var(--muted)}@media(max-width:860px){.top,.grid{display:block}.actions{margin-top:12px}}
</style>
</head>
<body>
<main class="wrap">
  <section class="top">
    <div>
      <p class="kicker">Kalika local admin</p>
      <h1>SEO Review Panel</h1>
      <p class="intro">This password-protected panel runs on your computer only. It scans ${escapeHtml(siteOrigin)}, drafts SEO review notes, and never publishes changes by itself.</p>
    </div>
    <div class="actions">
      <button id="scan">Scan pages</button>
      <button class="secondary" id="json" disabled>Export JSON</button>
      <button class="secondary" id="csv" disabled>Export CSV</button>
      <a class="button secondary" href="/logout">Log out</a>
    </div>
  </section>
  <section class="grid">
    <aside class="panel">
      <div class="cards">
        <div class="card"><strong id="pages">0</strong><span>pages scanned</span></div>
        <div class="card"><strong id="issues">0</strong><span>items to review</span></div>
        <div class="card"><strong id="tools">0</strong><span>tool pages</span></div>
      </div>
      <div class="filter">
        <label>Search<input id="q" placeholder="/tools/image-compressor"></label>
        <label>Status<select id="status"><option value="all">All</option><option value="bad">Needs review</option><option value="good">Looks good</option></select></label>
      </div>
      <p class="quiet">To apply a change, edit the file in public/, commit to GitHub, and deploy through Cloudflare.</p>
    </aside>
    <section>
      <div class="table"><table><thead><tr><th>Page</th><th>Status</th><th>Title</th><th>Description</th><th>H1 / Schema</th></tr></thead><tbody id="rows"><tr><td colspan="5">Log in and scan pages to begin.</td></tr></tbody></table></div>
      <div class="panel" style="margin-top:22px">
        <h2>Draft an SEO update</h2>
        <label>Selected page<input id="route" readonly></label>
        <label>SEO title<input id="title" maxlength="90"></label>
        <p class="quiet" id="titleCount">Target: 50-60 characters.</p>
        <label>Meta description<textarea id="desc" maxlength="220"></textarea></label>
        <p class="quiet" id="descCount">Target: 140-160 characters.</p>
        <button id="draftBtn">Generate review note</button>
        <div class="draft" id="draft">No draft yet.</div>
      </div>
    </section>
  </section>
</main>
<script>
const state={pages:[],selected:null};
const $=(id)=>document.getElementById(id);
$("scan").onclick=scan;$("json").onclick=()=>download("kalika-seo-review.json",JSON.stringify(state.pages,null,2));$("csv").onclick=exportCsv;$("q").oninput=render;$("status").onchange=render;$("title").oninput=count;$("desc").oninput=count;$("draftBtn").onclick=draft;
async function scan(){ $("scan").disabled=true; $("scan").textContent="Scanning..."; $("rows").innerHTML="<tr><td colspan='5'>Scanning pages...</td></tr>"; try{const r=await fetch("/api/scan"); const data=await r.json(); if(!r.ok) throw new Error(data.error||"Scan failed"); state.pages=data.pages; $("json").disabled=false; $("csv").disabled=false; render();}catch(e){$("rows").innerHTML="<tr><td colspan='5'>"+esc(e.message)+"</td></tr>";}finally{$("scan").disabled=false; $("scan").textContent="Scan pages";}}
function render(){const q=$("q").value.toLowerCase(),s=$("status").value;const pages=state.pages.filter(p=>(p.route+" "+p.title).toLowerCase().includes(q)&&(s==="all"||(s==="bad"?p.issues.length:p.issues.length===0)));$("pages").textContent=state.pages.length;$("issues").textContent=state.pages.reduce((n,p)=>n+p.issues.length,0);$("tools").textContent=state.pages.filter(p=>p.route.startsWith("/tools/")).length;$("rows").innerHTML=pages.length?pages.map(row).join(""):"<tr><td colspan='5'>No matching pages.</td></tr>";document.querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>select(b.dataset.route));}
function row(p){const ok=p.issues.length===0;return "<tr><td><button class='route' data-route='"+esc(p.route)+"'>"+esc(p.route)+"</button><br><small>"+p.status+"</small></td><td><span class='pill "+(ok?"good":"review")+"'>"+(ok?"Looks good":"Review")+"</span><br><small>"+esc(p.issues.join("; ")||"No issues found")+"</small></td><td>"+esc(p.title)+"<br><small>"+p.titleLength+" chars</small></td><td>"+esc(p.description)+"<br><small>"+p.descriptionLength+" chars</small></td><td>"+esc(p.h1||"No H1")+"<br><small>"+p.h1Count+" H1; schema: "+esc(p.schema)+"</small></td></tr>";}
function select(route){const p=state.pages.find(x=>x.route===route);if(!p)return;state.selected=p;$("route").value=p.route;$("title").value=p.title;$("desc").value=p.description;count();$("draft").textContent="Edit the title or description, then generate a review note.";}
function count(){$("titleCount").textContent=$("title").value.length+" characters. Target: 50-60.";$("descCount").textContent=$("desc").value.length+" characters. Target: 140-160.";}
function draft(){if(!$("route").value){$("draft").textContent="Select a page first.";return;}$("draft").textContent=["Page: "+$("route").value,"","Suggested SEO update for human review:","Title ("+$("title").value.length+" chars): "+$("title").value,"Meta description ("+$("desc").value.length+" chars): "+$("desc").value,"","Next step: update the matching file in public/, commit to GitHub, and deploy."].join("\\n");}
function exportCsv(){const h=["route","status","titleLength","descriptionLength","h1Count","issues","title","description"];download("kalika-seo-review.csv",[h.join(",")].concat(state.pages.map(p=>h.map(k=>csv(p[k]??"")).join(","))).join("\\n"))}
function download(name,text){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/plain"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function csv(v){return '"'+String(v).replaceAll('"','""')+'"'}function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]));}
</script>
</body>
</html>`;
}

function sendLogin(response, failed = false) {
  sendHtml(response, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kalika Admin Login</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f3ec;color:#102033;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif}.card{width:min(420px,92vw);background:#fffaf2;border:1px solid #d9e2ea;border-radius:12px;padding:28px;box-shadow:0 20px 70px #10203322}h1{margin:0 0 8px;font-size:2rem}p{color:#5d6b7a}label{display:block;margin-top:14px;font-weight:800}input{width:100%;box-sizing:border-box;border:1px solid #d9e2ea;border-radius:8px;padding:12px;margin-top:6px;font:inherit}button{width:100%;border:0;border-radius:8px;background:#102033;color:white;padding:12px;font-weight:900;margin-top:18px}.err{color:#8a1f11;background:#fdecea;border-radius:8px;padding:10px}</style></head>
<body><form class="card" action="/login" method="post"><h1>Kalika SEO Admin</h1><p>Local, password-protected review panel. This is separate from the public website.</p>${failed ? '<p class="err">Login failed. Check the username and password shown in the terminal.</p>' : ""}<label>Username<input name="username" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button>Log in</button></form></body></html>`);
}

function sendHtml(response, html, status = 200) {
  response.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  response.end(html);
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value, null, 2));
}

function sendText(response, text, status = 200) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  response.end(text);
}

function parseCookies(header) {
  return Object.fromEntries(header.split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) request.destroy();
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function firstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? decodeHtml(stripTags(match[1]).trim().replace(/\s+/g, " ")) : "";
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "");
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
