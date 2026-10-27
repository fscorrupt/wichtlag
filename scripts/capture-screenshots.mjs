import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:5173';
const outputDirectory = new URL('../docs/screenshots/', import.meta.url);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined)
});

const event = {
  id: 'demo2026',
  title: 'Unsere Weihnachtsrunde 2026',
  description: 'Am 20. Dezember um 18 Uhr machen wir es uns gemütlich. Bringt euer Geschenk und gute Laune mit! Alles hier sind Demo-Daten.',
  event_date: '2026-12-20',
  max_budget: '20 €',
  banner_url: 'preset:winterwald',
  is_drawn: false
};
const participants = [
  { id: 'mara', name: 'Mara', avatar_url: 'avatar:elf', is_claimed: 1, is_ready: 1, has_wishlist: true },
  { id: 'jonas', name: 'Jonas', avatar_url: 'avatar:coffee', is_claimed: 1, is_ready: 1, has_wishlist: true },
  { id: 'lea', name: 'Lea', avatar_url: 'avatar:star', is_claimed: 1, is_ready: 1, has_wishlist: true },
  { id: 'ben', name: 'Ben', avatar_url: 'avatar:robot', is_claimed: 1, is_ready: 0, has_wishlist: false },
  { id: 'nora', name: 'Nora', avatar_url: 'avatar:snowflake', is_claimed: 0, is_ready: 0, has_wishlist: false },
  { id: 'emil', name: 'Emil', avatar_url: 'avatar:gift', is_claimed: 0, is_ready: 0, has_wishlist: false }
];
const stats = { totalCount: 6, claimedCount: 4, readyCount: 3, allReady: false };
const participant = {
  ...participants[0],
  wishlist_text: 'Ich freue mich über einen guten Tee, ein kleines Notizbuch oder etwas Selbstgemachtes. Bitte keine Duftkerzen. Danke, lieber Wichtel!',
  wishlist_url: ''
};
const target = {
  ...participants[1],
  wishlist_text: 'Kaffee aus einer kleinen Rösterei, dunkle Schokolade oder ein spannendes Taschenbuch. Über etwas Selbstgemachtes freue ich mich auch.',
  wishlist_url: ''
};

try {
  await mkdir(outputDirectory, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1060 }, locale: 'de-DE', deviceScaleFactor: 1 });
  await context.addInitScript(() => localStorage.setItem('wichtlag_appearance', 'dark'));
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() !== 'GET' || !new URL(request.url()).pathname.startsWith('/api/events/demo2026')) {
      await route.fulfill({ status: 405, json: { error: 'Screenshot-Modus: keine echten API-Aufrufe.' } });
      return;
    }
    await route.fulfill({
      json: {
        event,
        participants,
        participant,
        stats,
        exclusions: [{ giver_name: 'Mara', receiver_name: 'Jonas' }, { giver_name: 'Jonas', receiver_name: 'Mara' }],
        validation: { possible: true, message: 'Auslosung möglich.' },
        target: event.is_drawn ? target : null
      }
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const visit = async (path) => {
    await page.goto(new URL(path, baseUrl).href);
    await page.evaluate(() => document.fonts.ready);
  };
  const capture = async (name, locator) => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Horizontal overflow: ${name}`);
    await page.addStyleTag({ content: '.snowflake { animation-play-state: paused !important; }' });
    const options = { path: fileURLToPath(new URL(name, outputDirectory)) };
    if (locator) await locator.screenshot(options);
    else await page.screenshot(options);
    console.log(`Captured ${name}`);
  };

  await visit('/');
  await page.locator('.hero-photo').evaluate((image) => image.decode());
  await capture('startseite-desktop.png');
  assert.equal(await page.locator('.occasion-tile').count(), 14);
  await capture('themes.png', page.locator('.occasion-section'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await capture('startseite-mobil.png');

  await page.setViewportSize({ width: 1280, height: 1000 });
  await visit('/create');
  await page.locator('input[type="text"]').first().fill('Unsere Weihnachtsrunde 2026');
  await page.locator('input[type="date"]').fill('2026-12-20');
  await page.locator('textarea').fill(event.description);
  await capture('aktion-erstellen.png', page.locator('main'));
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Festlich Rot & Sterne', exact: true }).click();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  for (const person of participants) {
    await page.locator('input[type="text"]').first().fill(person.name);
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  }
  await page.locator('select').nth(0).selectOption('Mara');
  await page.locator('select').nth(1).selectOption('Jonas');
  await page.getByRole('button', { name: 'Ausschluss anlegen', exact: true }).click();
  await capture('teilnehmer-ausschluesse.png', page.locator('main'));

  await visit('/event/demo2026/join');
  await page.getByRole('heading', { name: event.title, exact: true }).waitFor();
  await capture('einladung.png', page.locator('main'));

  await visit('/event/demo2026/admin?token=demo-admin');
  await page.getByRole('heading', { name: event.title, exact: true }).waitFor();
  await capture('admin-dashboard.png', page.locator('main'));
  await page.getByRole('button', { name: 'QR-Code', exact: true }).click();
  await page.locator('.modal-content canvas, .modal-content img').first().waitFor();
  await capture('qr-einladung.png', page.locator('.modal-content'));

  await visit('/event/demo2026/me?token=demo-teilnehmer');
  await page.getByRole('heading', { name: 'Dein Profil & Wunschzettel', exact: true }).waitFor();
  assert.equal(await page.locator('.avatar-choice').count(), 28);
  await capture('wunschzettel-avatare.png', page.locator('form.glass-card'));

  event.is_drawn = true;
  await visit('/event/demo2026/me?token=demo-teilnehmer');
  await page.getByRole('button', { name: 'Geschenk jetzt öffnen', exact: true }).click();
  await page.locator('canvas').evaluateAll((canvases) => canvases.forEach((canvas) => canvas.remove()));
  await capture('wichtelkind.png', page.locator('.revealed-target-card'));

  assert.deepEqual(errors, [], 'Browser errors during screenshot capture');
  console.log('10 screenshots captured with demo data; no real API requests were sent.');
} finally {
  await browser.close();
}