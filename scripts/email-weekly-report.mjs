import { readFile, appendFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';

const recipient = process.env.KALIKA_REPORT_TO?.trim();
const sender = process.env.SMTP_USER?.trim();
const appPassword = process.env.SMTP_APP_PASSWORD?.replaceAll(' ', '');
const dryRun = process.argv.includes('--dry-run');

if (!recipient || !sender || !appPassword) {
  const message = 'Weekly email NOT sent: configure KALIKA_REPORT_TO and SMTP_USER as Actions variables (or secrets), and SMTP_APP_PASSWORD as an Actions secret.';
  console.error(`::error::${message}`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n## Email delivery\n${message}\n`);
  process.exit(1);
}

const [siteReport, competitorReport] = await Promise.all([
  readFile('reports/latest.md', 'utf8').catch(() => '# Kalika Site Check\n\nThe main report was not created.'),
  readFile('reports/competitor-seo.md', 'utf8').catch(() => ''),
]);

const date = new Date().toISOString().slice(0, 10);
const subject = `Kalika weekly site report — ${date}`;
const results = JSON.parse(process.env.KALIKA_CHECK_RESULTS || '{}');
const labels = { run_checks: 'Site monitoring', nepali: 'Nepali typing (checkout)', preeti: 'Preeti and language (checkout)', discovery: 'Search crawler access', calculator: 'Simple calculator (live)', pdf: 'PDF tools (live)', calculators: 'Additional calculators (live)', competitors: 'Competitor SEO review', scanner: 'Document scanner and JPG to PDF (live)', organizer: 'Organize PDF (live)', pdf_edits: 'Watermark, page numbers and crop PDF (live)' };
labels.fill_sign = 'Fill and Sign PDF (live)';
labels.tip_calculator = 'Tip and Bill Split Calculator (live)';
labels.shopping_calculators = 'Discount, sales tax and VAT calculators (live)';
labels.canvas_safety = 'Canvas restrictions and original image PDFs (live)';
labels.everyday_tools = 'Text, image and remaining calculators (live)';
const outcomes = Object.entries(labels).map(([id, label]) => `${label}: ${results[id]?.outcome || 'not reported'}`);
const runUrl = process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
  ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
const text = [
  `Kalika weekly maintenance report — ${date}`,
  '',
  'Check outcomes (failed, skipped or not reported checks are not passes):',
  ...outcomes,
  runUrl ? `Full logs and report downloads: ${runUrl}` : '',
  '',
  siteReport.trim(),
  competitorReport.trim() ? `\n---\n\n${competitorReport.trim()}` : '',
  '',
  'This report only observes the site. It does not make changes or publish content.',
].join('\n');

if (dryRun) {
  console.log(JSON.stringify({ recipient, sender, subject, characters: text.length, dryRun: true, outcomes, runUrl }));
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  connectionTimeout: 30000,
  socketTimeout: 60000,
  auth: { user: sender, pass: appPassword },
});

await transporter.verify();
await transporter.sendMail({
  from: `Kalika site monitor <${sender}>`,
  to: recipient,
  subject,
  text,
});
console.log(`Weekly report email sent to ${recipient}.`);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '\n## Email delivery\nGmail accepted the weekly report for delivery.\n');
