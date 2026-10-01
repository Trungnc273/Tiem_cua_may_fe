import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const output = path.join(root, 'qa', 'screenshots', 'batch2');
const baseUrl = process.env.FE_BASE_URL ?? 'http://127.0.0.1:3100';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const failures = [];
page.on('pageerror', (error) => failures.push(error.message));
async function open(pathname) {
  const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`${pathname} returned ${response?.status()}`);
}
async function noHorizontalOverflow(label) {
  const width = await page.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
  if (width.scroll > width.inner) throw new Error(`${label} overflows: ${width.scroll}px > ${width.inner}px`);
}
async function capture(view, name, pathName) {
  await page.setViewportSize(view);
  await open(pathName);
  await noHorizontalOverflow(name);
  await page.screenshot({ path: path.join(output, name), animations: 'disabled' });
}
try {
  await open('/');
  if (await page.locator('.product-card').count() !== 4) throw new Error('Homepage did not render the four API-backed new products');
  if (!(await page.getByText('Áo blouse nơ tay phồng').count())) throw new Error('Expected TEST catalog product was not rendered');
  await noHorizontalOverflow('homepage-mobile-390x844');
  const loadedImages = await page.locator('.product-card img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0));
  if (!loadedImages) throw new Error('One or more demo catalog images failed to load');
  await page.screenshot({ path: path.join(output, 'homepage-mobile-390x844.png'), animations: 'disabled' });

  await page.locator('.category[href*="vay-dam"]').click();
  await page.waitForURL('**/products?category=vay-dam');
  if (await page.locator('.product-card').count() !== 1) throw new Error('Category shortcut did not filter the listing');
  await page.getByRole('link', { name: 'Váy hoa nhí hai dây', exact: true }).click();
  await page.waitForURL('**/products/vay-hoa-nhi-hai-day');
  if (await page.locator('.size-option').count() !== 3) throw new Error('Product detail sizes did not render');
  if (await page.locator('.color-option').count() < 2) throw new Error('Product detail colors did not render');
  if (await page.locator('.detail-gallery img').count() !== 2) throw new Error('Ordered product images did not render');
  const detailImagesLoaded = await page.locator('.detail-gallery img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0));
  if (!detailImagesLoaded) throw new Error('One or more detail gallery images failed to load');
  await page.locator('.size-option').filter({ hasText: 'XL' }).click();
  if (!(await page.getByText('279.000đ').count())) throw new Error('Variant price override was not reflected in the detail view');

  await open('/products?q=Cardigan&sort=price_asc');
  if (await page.locator('.product-card').count() !== 1) throw new Error('Search did not return the matching catalog product');
  await page.locator('select[name="sort"]').selectOption('price_desc');
  await page.getByRole('button', { name: 'Lọc sản phẩm' }).click();
  await page.waitForURL((url) => url.pathname === '/products' && url.searchParams.get('q') === 'Cardigan' && url.searchParams.get('sort') === 'price_desc');

  for (const viewport of [{ width: 390, height: 844, label: 'mobile-390x844' }, { width: 1440, height: 900, label: 'desktop-1440x900' }]) {
    await capture(viewport, `homepage-${viewport.label}.png`, '/');
    await capture(viewport, `listing-${viewport.label}.png`, '/products');
    await capture(viewport, `detail-${viewport.label}.png`, '/products/vay-hoa-nhi-hai-day');
  }
  if (failures.length) throw new Error(`Browser errors: ${failures.join(' | ')}`);
  console.log(JSON.stringify({ status: 'passed', apiProducts: 4, categoryFilter: true, searchAndSort: true, variantsAndPrice: true, screenshots: output, overflow: 'none', browserErrors: failures.length }, null, 2));
} finally {
  await browser.close();
}
