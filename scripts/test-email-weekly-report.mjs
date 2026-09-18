import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/email-weekly-report.mjs', '--dry-run'], {
  env: { ...process.env, KALIKA_REPORT_TO: 'owner@example.test', SMTP_USER: 'sender@example.test', SMTP_APP_PASSWORD: 'not-a-real-password' },
  encoding: 'utf8',
});
assert.equal(result.status, 0, result.stderr);
const output = JSON.parse(result.stdout);
assert.deepEqual(output, {
  recipient: 'owner@example.test',
  sender: 'sender@example.test',
  subject: `Kalika weekly site report — ${new Date().toISOString().slice(0, 10)}`,
  characters: output.characters,
  dryRun: true,
});
assert.ok(output.characters > 100);
console.log('Weekly email report configuration and report assembly test passed.');
