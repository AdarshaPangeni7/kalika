import { readFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';

const recipient = process.env.KALIKA_REPORT_TO?.trim();
const sender = process.env.SMTP_USER?.trim();
const appPassword = process.env.SMTP_APP_PASSWORD?.replaceAll(' ', '');
const dryRun = process.argv.includes('--dry-run');

if (!recipient || !sender || !appPassword) {
  throw new Error('Weekly email is not configured. Add KALIKA_REPORT_TO, SMTP_USER and SMTP_APP_PASSWORD as GitHub Actions secrets.');
}

const [siteReport, competitorReport] = await Promise.all([
  readFile('reports/latest.md', 'utf8').catch(() => '# Kalika Site Check\n\nThe main report was not created.'),
  readFile('reports/competitor-seo.md', 'utf8').catch(() => ''),
]);

const date = new Date().toISOString().slice(0, 10);
const subject = `Kalika weekly site report — ${date}`;
const text = [
  `Kalika weekly maintenance report — ${date}`,
  '',
  siteReport.trim(),
  competitorReport.trim() ? `\n---\n\n${competitorReport.trim()}` : '',
  '',
  'This report only observes the site. It does not make changes or publish content.',
].join('\n');

if (dryRun) {
  console.log(JSON.stringify({ recipient, sender, subject, characters: text.length, dryRun: true }));
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
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
