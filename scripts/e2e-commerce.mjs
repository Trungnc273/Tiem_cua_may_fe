import { chromium } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(process.cwd(),'..');
const backend=path.join(root,'TIEM_CUA_MAY_BE');
const output=path.join(root,'qa','screenshots','batch6');
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
const errors=[];const serverErrors=[];const directApiRequests=[];const failedRequests=[];const loginRequests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
page.on('response',response=>{if(response.status()>=500)serverErrors.push(`${response.status()} ${response.url()}`)});
page.on('request',request=>{const url=new URL(request.url());if(url.pathname==='/api/v1/admin/auth/login')loginRequests.push(`${request.method()} ${request.url()}`);if(url.origin===new URL(apiUrl).origin&&url.origin!==new URL(baseUrl).origin)directApiRequests.push(request.url())});
page.on('requestfailed',request=>{const reason=request.failure()?.errorText??'';if(reason!=='net::ERR_ABORTED')failedRequests.push(`${request.url()} ${reason}`)});
async function open(pathname){const response=await page.goto(`${baseUrl}${pathname}`,{waitUntil:'networkidle'});if(!response?.ok())throw new Error(`${pathname} returned ${response?.status()}`)}
async function overflow(label){const sizes=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));if(sizes.scroll>sizes.inner)throw new Error(`${label} overflows ${sizes.scroll}px > ${sizes.inner}px`)}
async function capture(name,pathname,viewport={width:390,height:844}){await page.setViewportSize(viewport);await open(pathname);await overflow(name);await page.screenshot({path:path.join(output,name),animations:'disabled',fullPage:true})}
try{
  const health=await fetch(`${apiUrl}/ready`);if(!health.ok)throw new Error('Commerce API is not ready.');
  for(const path of ['/health','/ready']){const response=await fetch(`${baseUrl}${path}`);if(!response.ok)throw new Error(`Storefront ${path} returned ${response.status}.`)}
  await page.setViewportSize({width:1440,height:900});await open('/admin/login');
  await page.locator('.admin-form input[name=email]').fill(adminEmail);await page.locator('.admin-form input[name=password]').fill(adminPassword);const loginResponsePromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/admin/auth/login',{timeout:10000}).catch(async()=>{const alert=await page.locator('[role=alert]').allTextContents();await page.screenshot({path:path.join(output,'admin-login-failure.png')});throw new Error(`Admin login API response timed out; requests=${JSON.stringify(loginRequests)} directApi=${JSON.stringify(directApiRequests)} failed=${JSON.stringify(failedRequests)} console=${JSON.stringify(errors)} alert=${JSON.stringify(alert)}`)});await page.locator('.admin-form button').click();const loginResponse=await loginResponsePromise;if(!loginResponse.ok())throw new Error(`Admin login API returned ${loginResponse.status()}: ${(await loginResponse.text()).slice(0,500)}`);await page.waitForURL('**/admin/orders',{timeout:10000});
  await open('/admin/products');
  const productRow=page.locator('.product-admin-table tbody tr').filter({hasText:'ao-blouse-no-tay'});
  await productRow.getByRole('button',{name:'Mở'}).click();
  await page.getByRole('heading',{name:'Thông tin sản phẩm'}).waitFor();
  await page.locator('.admin-product-editor input[name=price]').fill('259000');await page.locator('.admin-product-editor input[name=discount]').fill('20');await page.locator('.admin-product-editor button.commerce-primary').click();
  await page.getByRole('status').filter({hasText:'Đã lưu thông tin sản phẩm'}).waitFor();
  await open('/admin/settings');
  await page.locator('input[name=phone]').fill('0876146498');await page.locator('input[name=messenger]').fill('https://www.facebook.com/tiemcuamay04');await page.locator('.settings-single button').first().click();await page.getByRole('status').filter({hasText:'Đã lưu thông tin cửa hàng'}).waitFor();
  if(!(await page.locator('.shipping-rule-row').filter({hasText:'Tỉnh/thành khác'}).count()))throw new Error('The TEST database needs the fallback shipping estimate fixture (pnpm db:seed:test).');
  await overflow('admin-settings-desktop');await page.screenshot({path:path.join(output,'admin-settings-desktop-1440x900.png'),animations:'disabled',fullPage:true});

  await page.setViewportSize({width:390,height:844});await open('/products/ao-blouse-no-tay');
  await page.locator('.detail-gallery img').first().evaluate(img=>img.decode());
  await page.getByRole('button',{name:'Xanh baby'}).click();await page.getByRole('button',{name:'M',exact:true}).click();
  if(await page.locator('.discount-pill').innerText()!=='-20%')throw new Error('Product discount badge was not rendered.');
  if(!(await page.locator('.variant-price del').count()))throw new Error('Original price was not struck through.');
  const contactLinks=await page.locator('.product-contact a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  if(!contactLinks.includes('tel:0876146498')||!contactLinks.some(href=>href?.startsWith('https://www.facebook.com/')))throw new Error('Store phone and Messenger links are missing.');
  await overflow('product-detail-mobile');await page.screenshot({path:path.join(output,'product-detail-mobile-390x844.png'),animations:'disabled',fullPage:true});
  await page.getByRole('button',{name:'Thêm vào giỏ hàng'}).click();await page.getByRole('status').filter({hasText:'Đã thêm vào giỏ hàng'}).waitFor();
  await page.getByRole('link',{name:/Giỏ hàng/}).click();await page.waitForURL('**/gio-hang');
  await page.locator('input[name=customerName]').waitFor({state:'visible'});
  await page.locator('input[name=customerName]').fill('Khách thử nghiệm');await page.locator('input[name=customerPhone]').fill('0901234567');await page.locator('select[name=provinceCode]').selectOption('79');await page.waitForFunction(()=>document.querySelector('.checkout-totals')?.textContent?.includes('45.000'));await page.locator('textarea[name=deliveryAddress]').fill('12 Đường Thử Nghiệm, Phường 1, Thành phố Hồ Chí Minh');await page.locator('textarea[name=note]').fill('Đơn thử nghiệm QA');
  const estimatedTotals=await page.locator('.checkout-totals').innerText();if(!estimatedTotals.includes('30.000 ₫')||!estimatedTotals.includes('45.000 ₫'))throw new Error('The estimated shipping range is not displayed.');
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
  await page.locator('select[name=carrierCode]').selectOption('J_AND_T');await page.locator('input[name=shippingFinalVnd]').fill('28000');await page.locator('input[name=trackingNumber]').fill('QA-TRACK-001');const shippingSavePromise=page.waitForResponse(response=>/\/api\/v1\/admin\/orders\/[0-9a-f-]+\/shipping$/.test(new URL(response.url()).pathname)&&response.request().method()==='PATCH');await page.locator('.shipping-confirm-form button').click();const shippingSave=await shippingSavePromise;if(!shippingSave.ok())throw new Error(`Shipping confirmation returned ${shippingSave.status()}: ${(await shippingSave.text()).slice(0,500)}`);await page.waitForFunction(()=>{const total=document.querySelector('.admin-total')?.textContent??'';return total.includes('235.200')&&!total.includes('Chưa xác nhận')});await page.getByRole('button',{name:'Xác nhận đơn'}).click();await page.getByText('CONFIRMED',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'admin-order-confirmed-desktop-1440x900.png'),animations:'disabled',fullPage:true});
  await open('/admin/settings');const hcmRule=page.locator('.shipping-rule-row').filter({hasText:'Thành phố Hồ Chí Minh'});await hcmRule.getByRole('button',{name:'Tạm tắt'}).click();await page.getByRole('status').filter({hasText:'Đã cập nhật khoảng phí'}).waitFor();const fallbackRule=page.locator('.shipping-rule-row').filter({hasText:'Tỉnh/thành khác'});await fallbackRule.getByRole('button',{name:'Tạm tắt'}).click();await page.getByRole('status').filter({hasText:'Đã cập nhật khoảng phí'}).waitFor();
  await page.setViewportSize({width:390,height:844});await open('/products/ao-blouse-no-tay');await page.locator('.color-option').nth(1).click();await page.locator('.size-option').first().click();await page.locator('.add-to-cart').click();await page.locator('.variant-picker [role=status]').waitFor();await page.locator('.cart-button').click();await page.waitForURL('**/gio-hang');await page.locator('input[name=customerName]').waitFor({state:'visible'});
  await page.locator('input[name=customerName]').fill('Khách chưa có ước tính');await page.locator('input[name=customerPhone]').fill('0901234567');await page.locator('select[name=provinceCode]').selectOption('79');await page.locator('textarea[name=deliveryAddress]').fill('12 Đường Thử Nghiệm, Phường 1');
  await page.waitForFunction(()=>document.querySelector('.checkout-totals')?.textContent?.includes('Sẽ được nhân viên xác nhận'));
  if(!await page.locator('.checkout-form button.commerce-primary').isEnabled())throw new Error('Order submission should remain available without an estimate.');
  if(!(await page.getByText('Sẽ được nhân viên xác nhận',{exact:false}).count()))throw new Error('Checkout does not explain that shipping will be confirmed later.');
  await overflow('shipping-unconfigured-mobile');await page.screenshot({path:path.join(output,'shipping-unconfigured-mobile-390x844.png'),animations:'disabled',fullPage:true});
  await page.locator('.checkout-form button.commerce-primary').click();await page.locator('.order-success h1').waitFor();
  await open('/admin/settings');const hcmAfterTest=page.locator('.shipping-rule-row').filter({hasText:'Thành phố Hồ Chí Minh'});await hcmAfterTest.getByRole('button',{name:'Bật lại'}).click();await page.getByRole('status').filter({hasText:'Đã cập nhật khoảng phí'}).waitFor();const fallbackAfterTest=page.locator('.shipping-rule-row').filter({hasText:'Tỉnh/thành khác'});await fallbackAfterTest.getByRole('button',{name:'Bật lại'}).click();await page.getByRole('status').filter({hasText:'Đã cập nhật khoảng phí'}).waitFor();
  const insecureAssets=await page.evaluate(()=>Array.from(document.querySelectorAll('img[src],script[src],link[href],source[src]')).map(el=>el.getAttribute('src')??el.getAttribute('href')??'').filter(value=>value.startsWith('http://')&&!value.startsWith(`${location.origin}/`)));
  if(errors.length)throw new Error(`Browser console errors: ${errors.join(' | ')}`);
  if(serverErrors.length)throw new Error(`HTTP 5xx responses: ${serverErrors.join(' | ')}`);
  if(directApiRequests.length)throw new Error(`Browser called the API cross-origin: ${directApiRequests.join(' | ')}`);
  if(failedRequests.length)throw new Error(`Failed browser requests: ${failedRequests.join(' | ')}`);
  if(insecureAssets.length)throw new Error(`Insecure external asset URLs: ${insecureAssets.join(' | ')}`);
  console.log(JSON.stringify({status:'passed',orderCode,discount:true,cart:true,guestOrder:true,admin:true,contactLinks:true,screenshots:output,horizontalOverflow:false,browserErrors:errors.length,serverErrors:serverErrors.length,directApiRequests:directApiRequests.length,failedRequests:failedRequests.length,insecureExternalAssets:insecureAssets.length,healthAndReady:true},null,2));
}finally{await browser.close()}
