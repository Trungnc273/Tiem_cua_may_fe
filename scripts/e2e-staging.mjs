import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.STAGING_FE_URL;
const email = process.env.TCM_STAGE_ADMIN_EMAIL;
const password = process.env.TCM_STAGE_ADMIN_PASSWORD;
if (!baseUrl?.startsWith('https://') || !email || !password) throw new Error('Set the HTTPS staging URL and TEST-only admin credentials through the process environment.');
const output = path.resolve(process.cwd(), '..', 'qa', 'batch5');
const imagePath = path.resolve(process.cwd(), 'public/demo/product-blouse-clean.png');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
async function open(route) { const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' }); if (!response?.ok()) throw new Error(`${route} returned HTTP ${response?.status()}`); }
async function checkLayout(label) { const size = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth, bottom: Number.parseFloat(getComputedStyle(document.querySelector('main')).paddingBottom) })); if (size.scroll > size.inner) throw new Error(`${label} overflows horizontally.`); if (size.inner <= 699 && size.bottom < 90) throw new Error(`${label} does not reserve fixed-nav space.`); }
async function capture(name, fullPage = false) { await page.screenshot({ path: path.join(output, name), fullPage, animations: 'disabled' }); }
const suffix = Date.now().toString(36).toLowerCase();
const category = `qa-stage-${suffix}`; const slug = `qa-product-${suffix}`; const sku = `QA-STAGE-${suffix.toUpperCase()}`;
try {
  const health = await fetch(`${baseUrl}/api/v1/public/categories`, { signal: AbortSignal.timeout(12000) }); if (!health.ok) throw new Error('Same-origin HTTPS API route is unavailable.');
  await page.setViewportSize({ width: 1440, height: 900 }); await open('/admin/login');
  await page.locator('.admin-form input[name=email]').fill(email); await page.locator('.admin-form input[name=password]').fill(password); await page.locator('.admin-form button').click(); await page.waitForURL('**/admin/orders');
  await open('/admin/settings');
  if (await page.locator('input[name=phone]').inputValue() !== '0876146498' || await page.locator('input[name=messenger]').inputValue() !== 'https://www.facebook.com/tiemcuamay04') throw new Error('Staging settings do not show the owner-approved phone and Messenger link.');
  if (await page.locator('input[name=fee]').inputValue() !== '25000') throw new Error('The isolated TEST shipping fixture is not configured for the order journey.');
  await capture('admin-settings-desktop-1440x900.png', true);

  await open('/admin/products'); await page.getByRole('button', { name: 'Danh mục', exact: true }).click(); await page.getByRole('heading', { name: 'Thêm danh mục' }).waitFor();
  const categoryForm = page.locator('.admin-form').filter({ has: page.locator('input[name=name]') });
  await categoryForm.locator('input[name=name]').fill(`QA staging ${suffix}`); await categoryForm.locator('input[name=slug]').fill(category); await categoryForm.locator('select[name=iconKey]').selectOption('accessory'); await categoryForm.locator('input[name=sortOrder]').fill('90'); const categoryCreated = page.waitForResponse((response) => response.url().includes('/api/v1/admin/catalog/categories') && response.request().method() === 'POST'); await categoryForm.getByRole('button', { name: 'Tạo danh mục' }).click(); const categoryResult = await categoryCreated; if (categoryResult.status() !== 201) throw new Error(`Admin category creation returned ${categoryResult.status()}.`); await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Danh mục', exact: true }).click(); await page.getByRole('heading', { name: 'Thêm danh mục' }).waitFor(); await page.getByText(category, { exact: false }).waitFor();
  await checkLayout('admin categories desktop'); await capture('admin-categories-desktop-1440x900.png', true);
  if (!await page.getByText(category, { exact: false }).count()) throw new Error('Admin-created category is missing.');

  await page.getByRole('button', { name: 'Danh mục', exact: true }).click(); await page.getByRole('heading', { name: 'Tạo sản phẩm' }).waitFor(); await checkLayout('admin product list desktop'); await capture('admin-products-desktop-1440x900.png');
  const create = page.locator('#new-product').locator('..').locator('..').locator('form.admin-product-editor');
  await create.locator('input[name=name]').fill(`Sản phẩm TEST ${suffix}`); await create.locator('input[name=slug]').fill(slug); await create.locator('select[name=categoryId]').selectOption({ label: `QA staging ${suffix}` }); await create.locator('input[name=price]').fill('325000'); await create.locator('input[name=discount]').fill('15'); await create.locator('textarea[name=description]').fill('Dữ liệu kiểm thử Batch 5, không phải thông tin sản phẩm bán thật.'); await create.getByRole('button', { name: 'Tạo bản nháp' }).click(); await page.getByRole('heading', { name: 'Thông tin sản phẩm' }).waitFor();
  const variantForm = page.locator('.variant-add-row'); await variantForm.locator('input[name=sku]').fill(sku); await variantForm.locator('input[name=colorName]').fill('Xanh mây'); await variantForm.locator('input[name=colorHex]').fill('#A9D6F5'); await variantForm.locator('input[name=colorCode]').fill('CLOUD'); await variantForm.locator('input[name=size]').fill('Free size'); await variantForm.locator('input[name=stock]').fill('2'); await variantForm.getByRole('button', { name: 'Thêm mẫu' }).click();
  await page.locator('.upload-label input[type=file]').setInputFiles(imagePath); await page.locator('.admin-image-card img').waitFor(); await checkLayout('admin variants and image editor'); await capture('admin-product-editor-desktop-1440x900.png', true);
  await page.getByRole('button', { name: 'Lưu thông tin' }).click(); await page.getByRole('button', { name: 'Đăng sản phẩm' }).click(); await page.getByText('Sản phẩm đã được đăng.').waitFor();

  await page.setViewportSize({ width: 390, height: 844 }); await open('/'); await checkLayout('home mobile'); await capture('home-mobile-390x844.png');
  await open('/products'); await checkLayout('catalog mobile'); await capture('catalog-mobile-390x844.png');
  await open(`/products/${slug}`); await page.getByRole('heading', { name: `Sản phẩm TEST ${suffix}` }).waitFor(); await checkLayout('product detail mobile');
  await page.locator('.discount-pill').filter({ hasText: '15%' }).waitFor(); if (!await page.locator('.variant-price del').count()) throw new Error('Original and discounted prices are not both visible.');
  if (!await page.locator('a[href="tel:0876146498"]').count() || !await page.locator('a[href="https://www.facebook.com/tiemcuamay04"]').count()) throw new Error('Owner contact links are not rendered through store settings.');
  await page.getByRole('button', { name: 'Xanh mây' }).click(); await page.getByRole('button', { name: 'Free size' }).click(); await capture('product-detail-mobile-390x844.png');
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click(); await page.getByRole('status').waitFor(); await open('/gio-hang'); await page.locator('input[name=customerName]').waitFor(); await checkLayout('cart mobile'); await capture('cart-mobile-390x844.png');
  await page.locator('input[name=customerName]').fill('Khách TEST Batch 5'); await page.locator('input[name=customerPhone]').fill('0900000000'); await page.locator('textarea[name=deliveryAddress]').fill('Địa chỉ TEST 123, Thành phố Hồ Chí Minh'); await page.locator('textarea[name=note]').fill('Nội dung TEST, không phải dữ liệu khách thật.');
  if (!await page.getByText('25.000 ₫', { exact: true }).count() || !await page.getByText('301.250 ₫', { exact: true }).count()) throw new Error('TEST subtotal plus configured shipping total is incorrect.'); await page.locator('.checkout-form button.commerce-primary').click(); await page.locator('.order-success h1').waitFor(); await checkLayout('order success mobile'); await capture('order-success-mobile-390x844.png');
  const orderCode = (await page.locator('.order-code').innerText()).trim(); if (!/^TCM-[A-F0-9]{10}$/.test(orderCode)) throw new Error('Order confirmation code is invalid.');

  await page.setViewportSize({ width: 1440, height: 900 }); await open('/admin/orders'); await page.getByRole('link', { name: orderCode }).waitFor(); await capture('admin-orders-desktop-1440x900.png', true); await page.getByRole('link', { name: orderCode }).click(); await page.getByRole('heading', { name: orderCode }).waitFor();
  if (!await page.getByText('giảm 15%', { exact: false }).count() || !await page.getByText('276.250 ₫', { exact: false }).count()) throw new Error('Order price/discount snapshot was not preserved.');
  await open('/admin/products'); await page.getByLabel('Tìm theo tên hoặc SKU').fill(slug); await page.locator('.product-admin-table tbody tr').filter({ hasText: slug }).getByRole('button', { name: 'Mở' }).click(); await page.getByRole('heading', { name: 'Thông tin sản phẩm' }).waitFor(); if (await page.locator('.variant-admin-row input[name=stock]').first().inputValue() !== '1') throw new Error('Order submission did not decrement stock from two to one.');
  await open('/admin/orders'); await page.getByRole('link', { name: orderCode }).click(); await page.getByRole('heading', { name: orderCode }).waitFor();
  await page.getByRole('button', { name: 'Xác nhận' }).click(); await page.getByText('CONFIRMED', { exact: true }).waitFor(); await capture('admin-order-detail-desktop-1440x900.png', true);

  await open('/admin/products'); await page.getByLabel('Tìm theo tên hoặc SKU').fill(slug); const row = page.locator('.product-admin-table tbody tr').filter({ hasText: slug }); await row.getByRole('button', { name: 'Mở' }).click(); await page.getByRole('heading', { name: 'Thông tin sản phẩm' }).waitFor(); await page.locator('.admin-product-editor input[name=price]').fill('350000'); await page.locator('.admin-product-editor input[name=discount]').fill('20'); await page.getByRole('button', { name: 'Lưu thông tin' }).click(); await page.getByRole('status').filter({ hasText: 'Đã lưu thông tin sản phẩm.' }).waitFor();
  await open(`/products/${slug}`); await page.locator('.discount-pill').filter({ hasText: '20%' }).waitFor();
  await open(`/admin/orders`); await page.getByRole('link', { name: orderCode }).click(); await page.getByText('giảm 15%', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Hủy đơn' }).click(); await page.getByText('CANCELLED', { exact: true }).waitFor();

  await open('/admin/products'); await page.getByLabel('Tìm theo tên hoặc SKU').fill(slug); await page.locator('.product-admin-table tbody tr').filter({ hasText: slug }).getByRole('button', { name: 'Mở' }).click(); await page.getByRole('heading', { name: 'Thông tin sản phẩm' }).waitFor(); if (await page.locator('.variant-admin-row input[name=stock]').first().inputValue() !== '2') throw new Error('Eligible cancellation did not restore stock to two.');
  await open('/admin/settings'); await page.locator('input[name=fee]').fill(''); await page.locator('.settings-single button').click(); await page.getByRole('status').filter({ hasText: 'Đã lưu cài đặt cửa hàng.' }).waitFor();
  await open(`/products/${slug}`); await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click(); await page.getByRole('status').waitFor(); await open('/gio-hang'); await page.locator('input[name=customerName]').waitFor(); await page.locator('input[name=customerName]').fill('Khách TEST Batch 5'); await page.locator('input[name=customerPhone]').fill('0900000000'); await page.locator('textarea[name=deliveryAddress]').fill('Địa chỉ TEST 123, Thành phố Hồ Chí Minh'); if (!await page.locator('.shipping-unconfigured').count() || !await page.locator('.checkout-form button.commerce-primary').isDisabled()) throw new Error('Checkout was not blocked when shipping is unconfigured.');
  await open('/admin/settings'); await page.locator('input[name=fee]').fill('25000'); await page.locator('.settings-single button').click(); await page.getByRole('status').filter({ hasText: 'Đã lưu cài đặt cửa hàng.' }).waitFor();
  await page.getByRole('button', { name: 'Đăng xuất' }).click(); await page.waitForURL('**/admin/login');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ status: 'passed', tunnelOrigin: new URL(baseUrl).origin, testProductSlug: slug, testOrderCode: orderCode, pages: 12, screenshots: output, browserErrors: errors.length, horizontalOverflow: false }));
} finally { await context.close(); await browser.close(); }
