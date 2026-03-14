/**
 * Save browser authentication state for Grok or Leonardo.ai
 * Run once before using Playwright-based generation:
 *
 *   npx ts-node src/auth/save-auth.ts --tool grok
 *   npx ts-node src/auth/save-auth.ts --tool leonardo
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const URLS: Record<string, string> = {
  grok: 'https://x.ai/grok',
  leonardo: 'https://app.leonardo.ai',
};

const STATE_PATHS: Record<string, string> = {
  grok: path.resolve('./auth/grok_state.json'),
  leonardo: path.resolve('./auth/leonardo_state.json'),
};

async function main() {
  const tool = process.argv.find((a) => a.startsWith('--tool='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--tool') + 1];

  if (!tool || !URLS[tool]) {
    console.error('Usage: npx ts-node src/auth/save-auth.ts --tool grok|leonardo');
    process.exit(1);
  }

  const authDir = path.resolve('./auth');
  fs.mkdirSync(authDir, { recursive: true });

  console.log(`\n🔑 Opening ${tool} — please log in manually in the browser window.`);
  console.log('   Once logged in, return to this terminal and press ENTER.\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(URLS[tool]);

  // Wait for user to log in
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });

  const statePath = STATE_PATHS[tool];
  await context.storageState({ path: statePath });
  console.log(`✅ Auth state saved to ${statePath}`);

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
