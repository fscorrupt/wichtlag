import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const source = await readFile(new URL('../public/logo.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined)
});

try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${source}`);
  const svgErrors = await page.evaluate((svgSource) => {
    const document = new DOMParser().parseFromString(svgSource, 'image/svg+xml');
    return document.querySelectorAll('parsererror').length;
  }, source);
  assert.equal(svgErrors, 0, 'Logo SVG must be valid XML');

  for (const [size, output] of [
    [512, '../public/logo.png'],
    [32, '../public/favicon-32.png'],
    [180, '../public/apple-touch-icon.png']
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.screenshot({ path: fileURLToPath(new URL(output, import.meta.url)), omitBackground: true });
    console.log(`Generated ${output} (${size} x ${size})`);
  }
} finally {
  await browser.close();
}