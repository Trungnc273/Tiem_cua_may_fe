import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${process.env.FE_BASE_URL ?? 'http://127.0.0.1:3101'}/`, { waitUntil: 'networkidle' });
  if (await page.locator('.product-card').count() !== 0) throw new Error('TEST products appeared in the production homepage');
  if (!(await page.getByText('Chưa có sản phẩm mới trong catalog.').count())) throw new Error('Homepage empty state was not shown');
  if (await page.locator('.category').count() !== 1) throw new Error('TEST categories appeared in production mode');
  await page.goto(`${process.env.FE_BASE_URL ?? 'http://127.0.0.1:3101'}/products`, { waitUntil: 'networkidle' });
  if (await page.locator('.product-card').count() !== 0) throw new Error('TEST products appeared in the production listing');
  if (!(await page.getByText('Không tìm thấy sản phẩm phù hợp.').count())) throw new Error('Listing empty state was not shown');
  const dimensions = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
  if (dimensions.scroll > dimensions.inner) throw new Error('Production empty state overflows on mobile');
  if (errors.length) throw new Error(errors.join(' | '));
  console.log(JSON.stringify({ status: 'passed', mode: 'production', testProductsVisible: false, testCategoriesVisible: false, emptyStates: true, overflow: 'none', browserErrors: 0 }));
} finally { await browser.close(); }
