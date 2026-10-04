'use client';

const apiBase = process.env.NEXT_PUBLIC_CATALOG_API_URL ?? (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:4000' : '');
export const commerceApi = (path: string) => `${apiBase.replace(/\/$/, '')}${path}`;
export const commerceImageUrl = (path: string) => path.startsWith('/api/v1/public/media/products/') ? commerceApi(path) : path;
export async function commerceFetch(path: string, init: RequestInit = {}) {
  return fetch(commerceApi(path), { ...init, credentials: 'include', cache: 'no-store', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
}
export function commerceUpload(path: string, body: unknown, onProgress: (loaded: number, total: number) => void) {
  return new Promise<Response>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', commerceApi(path));
    request.withCredentials = true;
    request.setRequestHeader('Content-Type', 'application/json');
    request.upload.addEventListener('progress', (event) => { if (event.lengthComputable) onProgress(event.loaded, event.total); });
    request.addEventListener('load', () => resolve(new Response(request.responseText, { status: request.status, statusText: request.statusText, headers: { 'Content-Type': request.getResponseHeader('Content-Type') ?? 'application/json' } })));
    request.addEventListener('error', () => reject(new Error('Network request failed')));
    request.addEventListener('abort', () => reject(new Error('Upload was cancelled')));
    request.send(JSON.stringify(body));
  });
}
export function notifyCartChanged() { window.dispatchEvent(new Event('tcm:cart-changed')); }
export function formatMoney(amount: number) { return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`; }
export async function responseMessage(response: Response) {
  try { const body = await response.clone().json(); return body.error?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.'; }
  catch { return 'Không thể kết nối. Vui lòng thử lại.'; }
}
