import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const repo = process.cwd();
const output = path.resolve(process.env.PRODUCT_DETAIL_QA_OUTPUT_DIR ?? path.join(repo, '..', 'qa', 'screenshots', 'product-detail-redesign'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  response.end(JSON.stringify(body));
};
const imageData = (background, accent) => 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 920"><rect width="720" height="920" fill="' + background + '"/><path d="M235 130 360 78l125 52 105 165-94 57-44-63v483H268V289l-44 63-94-57z" fill="' + accent + '" stroke="#26394c" stroke-width="8" stroke-linejoin="round"/><path d="M360 83v685m-62-548h124" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="9"/><circle cx="325" cy="253" r="8" fill="#f5f7fa"/><circle cx="395" cy="253" r="8" fill="#f5f7fa"/></svg>',
);

const blueS = '00000000-0000-4000-8000-000000000001';
const blueM = '00000000-0000-4000-8000-000000000002';
const blackS = '00000000-0000-4000-8000-000000000003';
const redS = '00000000-0000-4000-8000-000000000004';
const fixtureVariants = [
  { variantId: blueS, size: 'S', colorCode: 'BLUE', colorName: 'Xanh khói', displayColor: 'Xanh khói', colorHex: '#7294ad', originalPriceVnd: 220000, salePriceVnd: 185000, discountPercent: 16, hasDiscount: true, stockQuantity: 5, priceVnd: 185000, availability: 'IN_STOCK' },
  { variantId: blueM, size: 'M', colorCode: 'BLUE', colorName: 'Xanh khói', displayColor: 'Xanh khói', colorHex: '#7294ad', originalPriceVnd: 220000, salePriceVnd: 185000, discountPercent: 16, hasDiscount: true, stockQuantity: 0, priceVnd: 185000, availability: 'OUT_OF_STOCK' },
  { variantId: blackS, size: 'S', colorCode: 'BLACK', colorName: 'Đen', displayColor: 'Đen', colorHex: '#272c32', originalPriceVnd: 235000, salePriceVnd: 195000, discountPercent: 17, hasDiscount: true, stockQuantity: 2, priceVnd: 195000, availability: 'IN_STOCK' },
  { variantId: redS, size: 'S', colorCode: 'RED', colorName: 'Đỏ đất', displayColor: 'Đỏ đất', colorHex: '#a85d55', originalPriceVnd: 225000, salePriceVnd: 189000, discountPercent: 16, hasDiscount: true, stockQuantity: 0, priceVnd: 189000, availability: 'OUT_OF_STOCK' },
];
const product = {
  slug: 'ao-khoac-test-fixture',
  name: 'Áo khoác thử nghiệm Midora',
  description: 'Thông tin dùng trong bộ kiểm thử giao diện.\nChất vải và hướng dẫn bảo quản không được giả định.',
  basePriceVnd: 220000,
  discountPercent: 16,
  isFeatured: false,
  isNew: false,
  categorySlug: 'test-fixtures',
  categoryName: 'Sản phẩm kiểm thử',
  variants: fixtureVariants,
  images: [
    { url: imageData('#e9eef2', '#7294ad'), altText: 'Ảnh thử nghiệm áo xanh, mặt trước', sortOrder: 1, isPrimary: true, variantId: null },
    { url: imageData('#e4e9ed', '#7294ad'), altText: 'Ảnh thử nghiệm áo xanh, góc nghiêng', sortOrder: 2, isPrimary: false, variantId: null },
    { url: imageData('#edf0f2', '#75899a'), altText: 'Ảnh thử nghiệm chi tiết chất vải', sortOrder: 3, isPrimary: false, variantId: null },
    { url: imageData('#eceff2', '#272c32'), altText: 'Ảnh áo màu đen', sortOrder: 0, isPrimary: true, variantId: blackS },
  ],
};

let cartItems = [];
const mockApi = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' });
    response.end();
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/public/products/ao-khoac-test-fixture') return json(response, 200, { data: product });
  if (request.method === 'GET' && url.pathname === '/api/v1/public/store-settings') return json(response, 200, { data: { contactPhone: '', messengerUrl: 'https://example.invalid/' } });
  if (request.method === 'GET' && url.pathname === '/api/v1/public/cart/count') return json(response, 200, { data: { count: cartItems.reduce((sum, item) => sum + item.quantity, 0) } });
  if (request.method === 'GET' && url.pathname === '/api/v1/public/cart') return json(response, 200, { data: { items: cartItems, subtotalVnd: cartItems.reduce((sum, item) => sum + item.lineTotalVnd, 0) } });
  if (request.method === 'GET' && url.pathname === '/api/v1/public/shipping/provinces') return json(response, 200, { data: [] });
  if (request.method === 'GET' && url.pathname === '/api/v1/public/shipping/estimate') return json(response, 200, { data: { estimate: null } });
  if (request.method === 'POST' && url.pathname === '/api/v1/public/cart/items') {
    let body = '';
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    const itemVariant = fixtureVariants.find((item) => item.variantId === payload.variantId);
    if (!itemVariant || itemVariant.availability !== 'IN_STOCK' || payload.quantity > itemVariant.stockQuantity) return json(response, 409, { error: { message: 'Không đủ hàng trong bộ kiểm thử.' } });
    const item = cartItems.find((candidate) => candidate.variantId === itemVariant.variantId);
    if (item) item.quantity += payload.quantity;
    else cartItems.push({
      itemId: 'test-cart-item-' + itemVariant.variantId,
      variantId: itemVariant.variantId,
      slug: product.slug,
      productName: product.name,
      sku: 'TEST-' + itemVariant.size,
      size: itemVariant.size,
      colorName: itemVariant.displayColor,
      quantity: payload.quantity,
      stock: itemVariant.stockQuantity,
      available: true,
      originalPriceVnd: itemVariant.originalPriceVnd,
      salePriceVnd: itemVariant.salePriceVnd,
      discountPercent: itemVariant.discountPercent,
      hasDiscount: itemVariant.hasDiscount,
      lineTotalVnd: itemVariant.salePriceVnd * payload.quantity,
      imageUrl: product.images[0].url,
    });
    for (const cartItem of cartItems) cartItem.lineTotalVnd = cartItem.salePriceVnd * cartItem.quantity;
    return json(response, 201, { data: { itemId: 'test-cart-item' } });
  }
  return json(response, 404, { error: { message: 'Test API route not configured.' } });
});

const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const apiPort = await listen(mockApi);
const apiOrigin = 'http://127.0.0.1:' + apiPort;
const frontendPortServer = createServer();
const frontendPort = await listen(frontendPortServer);
await new Promise((resolve, reject) => frontendPortServer.close((error) => error ? reject(error) : resolve()));
const baseUrl = 'http://127.0.0.1:' + frontendPort;
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(frontendPort)], {
  cwd: repo,
  stdio: 'ignore',
  env: { ...process.env, API_INTERNAL_URL: apiOrigin, CATALOG_API_URL: apiOrigin, NEXT_PUBLIC_CATALOG_API_URL: '' },
});
let browser;

async function waitForFrontend() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (next.exitCode !== null) throw new Error('Next.js dev server exited before becoming ready.');
    try {
      const response = await fetch(baseUrl + '/products/ao-khoac-test-fixture');
      if (response.ok) return;
    } catch { /* wait for the local test server */ }
    await delay(1000);
  }
  throw new Error('Timed out waiting for the local storefront.');
}

try {
  await mkdir(output, { recursive: true });
  await waitForFrontend();
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const browserErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (value) => { window.__midoraShare = value; },
    });
  });

  async function openProduct() {
    const response = await page.goto(baseUrl + '/products/' + product.slug, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error('Product detail page failed to load.');
    await page.getByRole('heading', { name: product.name }).waitFor();
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  }
  async function checkOverflow(label) {
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    if (dimensions.document > dimensions.viewport) throw new Error(label + ' has horizontal overflow: ' + JSON.stringify(dimensions));
  }
  async function checkStickyClearance() {
    for (const selector of ['.detail-option-section', '.detail-stock', '.detail-quantity-row', '.detail-information summary']) {
      const elements = page.locator(selector);
      for (let index = 0; index < await elements.count(); index += 1) {
        await elements.nth(index).evaluate((element) => {
          element.scrollIntoView({ block: 'center', behavior: 'instant' });
          return new Promise((resolve) => requestAnimationFrame(resolve));
        });
        const geometry = await elements.nth(index).evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const stickyTop = document.querySelector('.detail-sticky-purchase').getBoundingClientRect().top;
          return { top: bounds.top, bottom: bounds.bottom, stickyTop };
        });
        if (geometry.top < 0 || geometry.bottom > geometry.stickyTop - 2) {
          throw new Error('Mobile sticky CTA overlaps ' + selector + ': ' + JSON.stringify(geometry));
        }
      }
    }
  }
  async function capture(name, viewport) {
    await page.setViewportSize(viewport);
    await openProduct();
    await checkOverflow(name);
    await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' });
  }

  await openProduct();
  const metadata = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    openGraphTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
  }));
  if (!metadata.title.includes(product.name) || metadata.canonical !== 'https://midora.pro.vn/products/' + product.slug || metadata.openGraphTitle !== product.name) {
    throw new Error('Product metadata did not use the real product name and current canonical URL: ' + JSON.stringify(metadata));
  }
  if (await page.getByText('Đánh giá', { exact: true }).count()) throw new Error('Unsupported review UI was rendered without review data.');
  await checkOverflow('mobile 390x844');
  if (!(await page.getByText('1/3', { exact: true }).isVisible())) throw new Error('Product image count is not based on fixture images.');
  await page.screenshot({ path: path.join(output, 'product-detail-390x844.png'), animations: 'disabled' });
  await page.screenshot({ path: path.join(output, 'product-detail-390x844-full.png'), fullPage: true, animations: 'disabled' });

  await page.getByRole('button', { name: 'Ảnh 2 trên 3: Ảnh thử nghiệm áo xanh, góc nghiêng' }).click();
  if (!(await page.getByText('2/3', { exact: true }).isVisible())) throw new Error('Thumbnail selection did not update the active image count.');
  await page.getByRole('button', { name: 'Đen' }).click();
  if (!(await page.getByText('1/4', { exact: true }).isVisible())) throw new Error('Selecting a variant color did not switch to its associated gallery.');
  if (!(await page.locator('.detail-sale-price').innerText()).includes('195.000')) throw new Error('Selected color did not update its server-provided price.');
  await page.getByRole('button', { name: 'Đỏ đất' }).click();
  if (!(await page.getByText('Hết hàng', { exact: true }).isVisible())) throw new Error('Out-of-stock color was not communicated.');
  if (await page.locator('.detail-sticky-purchase .detail-buy-button').isEnabled()) throw new Error('Buy action remained enabled for an out-of-stock variant.');
  await page.getByRole('button', { name: 'Xanh khói' }).click();
  if (!(await page.getByRole('button', { name: 'M', exact: true }).isDisabled())) throw new Error('Unavailable size was not disabled.');
  await page.locator('#product-quantity').fill('9');
  if (await page.locator('#product-quantity').inputValue() !== '5') throw new Error('Quantity was not capped at available stock.');
  await page.locator('#product-quantity').fill('2');
  await page.getByRole('button', { name: 'Chia sẻ sản phẩm' }).click();
  const shared = await page.evaluate(() => window.__midoraShare);
  if (shared?.url !== baseUrl + '/products/' + product.slug) throw new Error('Share action did not share the current product URL.');
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await page.getByText('Đã thêm sản phẩm vào giỏ hàng.', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Giỏ hàng, 2 sản phẩm' }).waitFor();
  const description = page.locator('.detail-information details');
  await description.locator('summary').click();
  if (!(await description.evaluate((element) => element.open))) throw new Error('Product description accordion did not open.');
  await checkOverflow('mobile expanded details');
  await description.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'product-detail-390x844-expanded.png'), animations: 'disabled' });
  await checkStickyClearance();

  await capture('product-detail-430x932', { width: 430, height: 932 });
  await capture('product-detail-768x1024', { width: 768, height: 1024 });
  await capture('product-detail-1440x900', { width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
  await page.getByText('Đã thêm sản phẩm vào giỏ hàng.', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Giỏ hàng, 3 sản phẩm' }).waitFor();
  await page.getByRole('button', { name: 'Mua ngay', exact: true }).click();
  await page.waitForURL('**/gio-hang');
  await page.getByText(product.name, { exact: true }).waitFor();
  if (!(await page.locator('.cart-item').count())) throw new Error('Buy Now did not take the selected product to the existing cart.');
  if (browserErrors.length) throw new Error('Browser errors: ' + browserErrors.join(' | '));
  if (failedRequests.length) throw new Error('Failed requests: ' + failedRequests.join(' | '));
  console.log(JSON.stringify({
    status: 'passed',
    testData: 'isolated in-memory TEST fixtures; no production or database writes',
    gallery: 'thumbnail selection, real image count, and variant image update passed',
    variants: 'color selection, price update, disabled unavailable size, and out-of-stock CTA passed',
    quantity: 'quantity two added through existing cart API contract',
    cartAndBuyNow: 'cart badge updated and Buy Now navigated to the existing cart',
    share: 'navigator.share received the current product URL',
    accordion: 'description opens with real product content',
    screenshots: output,
    viewports: ['390x844', '430x932', '768x1024', '1440x900'],
    horizontalOverflow: false,
    browserErrors: browserErrors.length,
    failedRequests: failedRequests.length,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  mockApi.close();
  if (next.exitCode === null) {
    next.kill();
    await Promise.race([once(next, 'exit'), delay(5000)]);
  }
}
