import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BATCH4_FE_URL ?? 'http://127.0.0.1:3100';
const apiUrl = process.env.BATCH4_API_URL ?? 'http://127.0.0.1:4000';
const email = process.env.BATCH4_ADMIN_EMAIL;
const password = process.env.BATCH4_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Set the isolated Batch 4 QA admin credentials through the environment.');
const output = path.resolve(process.cwd(), '..', 'qa', 'batch4');
const imagePath = path.resolve(process.cwd(), 'public/demo/product-blouse-clean.png');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
async function open(url) { const response = await page.goto(`${baseUrl}${url}`, { waitUntil: 'networkidle' }); if (!response?.ok()) throw new Error(`${url} returned HTTP ${response?.status()}`); }
async function noOverflow(label) { const size = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth, mainPadding: Number.parseFloat(getComputedStyle(document.querySelector('main')).paddingBottom) })); if (size.scroll > size.inner) throw new Error(`${label} overflows: ${size.scroll}px > ${size.inner}px`); if(size.inner<=699&&size.mainPadding<90)throw new Error(`${label} does not reserve space for the fixed mobile bottom navigation.`); }
async function capture(name, fullPage = false) { await page.screenshot({ path: path.join(output, name), fullPage, animations: 'disabled' }); }

try {
  const ready = await fetch(`${apiUrl}/ready`); if (!ready.ok) throw new Error('Batch 4 QA API is not ready.');
  await page.setViewportSize({ width: 1440, height: 900 }); await open('/admin/login');
  await page.getByLabel('Email').fill(email); await page.getByLabel('Mật khẩu').fill(password); await page.locator('.admin-form button').click(); await page.waitForURL('**/admin/orders');
  await open('/admin/products'); await page.getByRole('heading', { name: 'Sản phẩm', exact: true }).waitFor(); await noOverflow('admin products desktop');
  await capture('admin-products-list-1440x900.png', false);
  const suffix = Date.now().toString(36).toUpperCase(); const slug = `qa-ao-may-${suffix.toLowerCase()}`; const sku = `QA-B4-${suffix}`;
  const create = page.locator('#new-product').locator('..').locator('..').locator('form.admin-product-editor');
  await create.locator('input[name="name"]').fill(`Áo mây QA ${suffix}`); await create.locator('input[name="slug"]').fill(slug);
  await create.locator('select[name="categoryId"]').selectOption({ label: 'Váy đầm' }); await create.locator('input[name="price"]').fill('325000'); await create.locator('input[name="discount"]').fill('15'); await create.locator('textarea[name="description"]').fill('Mẫu thử giao diện quản trị Batch 4.');
  await create.getByRole('button', { name: 'Tạo bản nháp' }).click(); await page.getByRole('heading', { name: 'Thông tin sản phẩm' }).waitFor();
  const addVariant = page.locator('.variant-add-row'); await addVariant.locator('input[name="sku"]').fill(sku); await addVariant.locator('input[name="colorName"]').fill('Xanh mây'); await addVariant.locator('input[name="colorHex"]').fill('#A9D6F5'); await addVariant.locator('input[name="colorCode"]').fill('CLOUD'); await addVariant.locator('input[name="size"]').fill('Free size'); await addVariant.locator('input[name="stock"]').fill('2'); await addVariant.getByRole('button', { name: 'Thêm mẫu' }).click();
  const variantOption = `Xanh mây · Free size · ${sku}`; await page.getByLabel('Gắn ảnh với biến thể').selectOption({ label: variantOption });
  await page.locator('.upload-label input[type="file"]').setInputFiles(imagePath); await page.locator('.admin-image-card img').waitFor();
  await page.locator('.variant-admin-row').last().scrollIntoViewIfNeeded(); await noOverflow('admin product editor desktop'); await capture('admin-product-editor-variants-images-1440x900.png', true);
  await page.getByRole('button', { name: 'Lưu thông tin' }).click(); await page.getByRole('button', { name: 'Đăng sản phẩm' }).click(); await page.getByText('Sản phẩm đã được đăng.').waitFor();

  await page.setViewportSize({ width: 390, height: 844 }); await open('/'); await noOverflow('public homepage mobile'); await capture('public-home-mobile-390x844.png');
  await open('/products'); await noOverflow('public listing mobile'); await capture('public-list-mobile-390x844.png');
  await open(`/products/${slug}`); await page.getByRole('heading', { name: `Áo mây QA ${suffix}` }).waitFor(); await noOverflow('public product detail mobile'); await capture('public-detail-mobile-390x844.png');
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click(); await page.getByRole('status').waitFor(); await open('/gio-hang'); await page.locator('input[name="customerName"]').waitFor(); await noOverflow('public cart mobile'); await capture('public-cart-mobile-390x844.png'); await capture('public-cart-mobile-full.png',true);
  await page.locator('input[name="customerName"]').fill('Khách QA Batch 4'); await page.locator('input[name="customerPhone"]').fill('0876146498'); await page.locator('textarea[name="deliveryAddress"]').fill('12 Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh'); await page.locator('textarea[name="note"]').fill('Đơn thử giao diện Batch 4.');
  await page.locator('.checkout-form button.commerce-primary').click(); await page.locator('.order-success h1').waitFor(); await noOverflow('public order success mobile'); await capture('public-order-success-mobile-390x844.png');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ status: 'passed', productSlug: slug, screenshots: ['admin-products-list-1440x900.png','admin-product-editor-variants-images-1440x900.png','public-home-mobile-390x844.png','public-list-mobile-390x844.png','public-detail-mobile-390x844.png','public-cart-mobile-390x844.png','public-order-success-mobile-390x844.png'], pageErrors: errors.length }));
} finally { await context.close(); await browser.close(); }
