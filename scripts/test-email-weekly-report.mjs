import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/email-weekly-report.mjs', '--dry-run'], {
  env: { ...process.env, KALIKA_REPORT_TO: 'owner@example.test', SMTP_USER: 'sender@example.test', SMTP_APP_PASSWORD: 'not-a-real-password', KALIKA_CHECK_RESULTS: JSON.stringify({ pdf: { outcome: 'failure' } }), GITHUB_REPOSITORY: 'example/test', GITHUB_RUN_ID: '123' },
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
  outcomes: output.outcomes,
  runUrl: 'https://github.com/example/test/actions/runs/123',
});
assert.ok(output.characters > 100);
assert.ok(output.outcomes.includes('PDF tools (live): failure'));
assert.ok(output.outcomes.includes('Site monitoring: not reported'));
const missing = spawnSync(process.execPath, ['scripts/email-weekly-report.mjs', '--dry-run'], {
  env: { ...process.env, SMTP_APP_PASSWORD: '', GITHUB_STEP_SUMMARY: '' }, encoding: 'utf8',
});
assert.equal(missing.status, 1);
assert.match(missing.stderr, /Weekly email NOT sent/);
console.log('Weekly email report configuration and report assembly test passed.');
