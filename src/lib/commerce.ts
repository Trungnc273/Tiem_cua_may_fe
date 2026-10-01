'use client';

export const commerceApi = (path: string) => `${(process.env.NEXT_PUBLIC_CATALOG_API_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '')}${path}`;
export async function commerceFetch(path: string, init: RequestInit = {}) {
  return fetch(commerceApi(path), { ...init, credentials: 'include', cache: 'no-store', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
}
export function notifyCartChanged() { window.dispatchEvent(new Event('tcm:cart-changed')); }
export function formatMoney(amount: number) { return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`; }
export async function responseMessage(response: Response) {
  try { const body = await response.clone().json(); return body.error?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.'; }
  catch { return 'Không thể kết nối. Vui lòng thử lại.'; }
}
