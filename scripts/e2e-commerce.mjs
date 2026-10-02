import { chromium } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(process.cwd(),'..');
const backend=path.join(root,'TIEM_CUA_MAY_BE');
const output=path.join(root,'qa','screenshots','batch3');
const baseUrl=process.env.FE_BASE_URL??'http://127.0.0.1:3100';
const apiUrl=process.env.COMMERCE_TEST_API_URL??'http://127.0.0.1:4000';
if(!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required for the admin bootstrap.');
const testDatabaseName=decodeURIComponent(new URL(process.env.TEST_DATABASE_URL).pathname.replace(/^\//,''));
const adminEmail=`commerce-${randomBytes(5).toString('hex')}@example.invalid`;
const adminPassword=randomBytes(24).toString('base64url');
const bootstrap=spawnSync(process.platform==='win32'?'pnpm.cmd':'pnpm',['admin:create'],{cwd:backend,encoding:'utf8',stdio:'ignore',shell:process.platform==='win32',env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL,NODE_ENV:'test',TCM_ENVIRONMENT:'test',TCM_SAFE_TEST_DATABASE:testDatabaseName,CATALOG_MODE:'test',ADMIN_EMAIL:adminEmail,ADMIN_PASSWORD:adminPassword}});
if(bootstrap.status!==0) throw new Error(`Admin bootstrap failed (${bootstrap.status??bootstrap.signal}).`);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN??'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function open(pathname){const response=await page.goto(`${baseUrl}${pathname}`,{waitUntil:'networkidle'});if(!response?.ok())throw new Error(`${pathname} returned ${response?.status()}`)}
async function overflow(label){const sizes=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));if(sizes.scroll>sizes.inner)throw new Error(`${label} overflows ${sizes.scroll}px > ${sizes.inner}px`)}
async function capture(name,pathname,viewport={width:390,height:844}){await page.setViewportSize(viewport);await open(pathname);await overflow(name);await page.screenshot({path:path.join(output,name),animations:'disabled',fullPage:true})}
try{
  const health=await fetch(`${apiUrl}/ready`);if(!health.ok)throw new Error('Commerce API is not ready.');
  await page.setViewportSize({width:1440,height:900});await open('/admin/login');
  await page.locator('.admin-form input[name=email]').fill(adminEmail);await page.locator('.admin-form input[name=password]').fill(adminPassword);await page.locator('.admin-form button').click();await page.waitForURL('**/admin/orders');
  await open('/admin/products');
  const productRow=page.locator('.product-admin-table tbody tr').filter({hasText:'ao-blouse-no-tay'});
  await productRow.getByRole('button',{name:'Mở'}).click();
  await page.getByRole('heading',{name:'Thông tin sản phẩm'}).waitFor();
  await page.locator('.admin-product-editor input[name=price]').fill('259000');await page.locator('.admin-product-editor input[name=discount]').fill('20');await page.locator('.admin-product-editor button.commerce-primary').click();
  await page.getByRole('status').filter({hasText:'Đã lưu thông tin sản phẩm'}).waitFor();
  await open('/admin/settings');
  await page.locator('input[name=phone]').fill('0876146498');await page.locator('input[name=messenger]').fill('https://www.facebook.com/tiemcuamay04');await page.locator('input[name=fee]').fill('25000');await page.locator('.settings-single button').click();await page.getByRole('status').filter({hasText:'Đã lưu cài đặt cửa hàng'}).waitFor();
  await overflow('admin-settings-desktop');await page.screenshot({path:path.join(output,'admin-settings-desktop-1440x900.png'),animations:'disabled',fullPage:true});

  await page.setViewportSize({width:390,height:844});await open('/products/ao-blouse-no-tay');
  await page.getByRole('button',{name:'Xanh baby'}).click();await page.getByRole('button',{name:'M',exact:true}).click();
  if(await page.locator('.discount-pill').innerText()!=='-20%')throw new Error('Product discount badge was not rendered.');
  if(!(await page.locator('.variant-price del').count()))throw new Error('Original price was not struck through.');
  const contactLinks=await page.locator('.product-contact a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  if(!contactLinks.includes('tel:0876146498')||!contactLinks.some(href=>href?.startsWith('https://www.facebook.com/')))throw new Error('Store phone and Messenger links are missing.');
  await overflow('product-detail-mobile');await page.screenshot({path:path.join(output,'product-detail-mobile-390x844.png'),animations:'disabled',fullPage:true});
  await page.getByRole('button',{name:'Thêm vào giỏ hàng'}).click();await page.getByRole('status').filter({hasText:'Đã thêm vào giỏ hàng'}).waitFor();
  await page.getByRole('link',{name:/Giỏ hàng/}).click();await page.waitForURL('**/gio-hang');
  await page.locator('input[name=customerName]').waitFor({state:'visible'});
  await page.locator('input[name=customerName]').fill('Khách thử nghiệm');await page.locator('input[name=customerPhone]').fill('0901234567');await page.locator('textarea[name=deliveryAddress]').fill('12 Đường Thử Nghiệm, Phường 1, Thành phố Hồ Chí Minh');await page.locator('textarea[name=note]').fill('Đơn thử nghiệm QA');
  if(!(await page.getByText('25.000 ₫',{exact:true}).count()))throw new Error('Configured shipping fee is not displayed.');
  await overflow('cart-order-form-mobile');await page.screenshot({path:path.join(output,'cart-order-form-mobile-390x844.png'),animations:'disabled',fullPage:true});
  await page.locator('.checkout-form button.commerce-primary').click();await page.locator('.order-success h1').waitFor();
  const orderCode=(await page.locator('.order-code').innerText()).trim();if(!/^TCM-[A-F0-9]{10}$/.test(orderCode))throw new Error('The customer confirmation did not show a valid order code.');
  await overflow('order-success-mobile');await page.screenshot({path:path.join(output,'order-success-mobile-390x844.png'),animations:'disabled',fullPage:true});

  await page.setViewportSize({width:390,height:844});await open('/');await overflow('homepage-regression-mobile');await page.screenshot({path:path.join(output,'homepage-regression-mobile-390x844.png'),animations:'disabled',fullPage:true});
  await open('/products');await overflow('listing-regression-mobile');await page.screenshot({path:path.join(output,'listing-regression-mobile-390x844.png'),animations:'disabled',fullPage:true});
  await page.setViewportSize({width:1440,height:900});await open('/');await overflow('homepage-regression-desktop');await page.screenshot({path:path.join(output,'homepage-regression-desktop-1440x900.png'),animations:'disabled',fullPage:true});
  await open('/products');await overflow('listing-regression-desktop');await page.screenshot({path:path.join(output,'listing-regression-desktop-1440x900.png'),animations:'disabled',fullPage:true});
  await open('/admin/orders');await page.getByText(orderCode,{exact:true}).waitFor();await overflow('admin-orders-desktop');await page.screenshot({path:path.join(output,'admin-orders-desktop-1440x900.png'),animations:'disabled',fullPage:true});
  await page.getByRole('link',{name:orderCode}).click();await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+$/);await page.getByRole('heading',{name:orderCode}).waitFor();await overflow('admin-order-detail-desktop');await page.screenshot({path:path.join(output,'admin-order-detail-desktop-1440x900.png'),animations:'disabled',fullPage:true});
  await open('/admin/settings');await page.locator('input[name=fee]').fill('');await page.locator('.settings-single button').click();await page.getByRole('status').filter({hasText:'Đã lưu cài đặt cửa hàng'}).waitFor();
  await page.setViewportSize({width:390,height:844});await open('/products/ao-blouse-no-tay');await page.locator('.color-option').nth(1).click();await page.locator('.size-option').first().click();await page.locator('.add-to-cart').click();await page.locator('.variant-picker [role=status]').waitFor();await page.locator('.cart-button').click();await page.waitForURL('**/gio-hang');await page.locator('input[name=customerName]').waitFor({state:'visible'});
  if(await page.locator('.shipping-unconfigured').count()<1)throw new Error('Unconfigured shipping was not explained to the customer.');
  if(!await page.locator('.checkout-form button.commerce-primary').isDisabled())throw new Error('Order submission stayed enabled without a shipping fee.');
  await overflow('shipping-unconfigured-mobile');await page.screenshot({path:path.join(output,'shipping-unconfigured-mobile-390x844.png'),animations:'disabled',fullPage:true});
  await open('/admin/settings');await page.locator('input[name=fee]').fill('25000');await page.locator('.settings-single button').click();await page.getByRole('status').filter({hasText:'Đã lưu cài đặt cửa hàng'}).waitFor();
  if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({status:'passed',orderCode,discount:true,cart:true,guestOrder:true,admin:true,contactLinks:true,screenshots:output,horizontalOverflow:false,browserErrors:errors.length},null,2));
}finally{await browser.close()}
