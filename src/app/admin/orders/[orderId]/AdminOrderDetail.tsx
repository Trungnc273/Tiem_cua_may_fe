'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { commerceFetch, formatMoney } from '../../../../lib/commerce';

type Detail = {
  id: string; orderCode: string; customerName: string; customerPhone: string; provinceLabel: string; deliveryAddress: string; note: string;
  status: string; subtotalVnd: number; shippingFeeVnd: number | null; totalVnd: number | null; shippingStatus: string;
  shippingEstimateMinVnd: number | null; shippingEstimateMaxVnd: number | null; carrierCode: string | null; carrierCustomName: string | null; trackingNumber: string | null;
  notification: { status: string; attempts: number; lastErrorCode: string | null; sentAt: string | null } | null;
  items: { productName: string; sku: string; colorName: string; size: string; originalPriceVnd: number; discountPercent: number; saleUnitPriceVnd: number; quantity: number; lineTotalVnd: number }[];
};

export default function AdminOrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await commerceFetch(`/api/v1/admin/orders/${orderId}`);
    if (response.status === 401) { router.replace('/admin/login'); return; }
    const payload = await response.json();
    if (response.ok) setData(payload.data); else setError(payload.error?.message ?? 'Không tải được đơn hàng.');
  }
  useEffect(() => {
    let active = true;
    void commerceFetch(`/api/v1/admin/orders/${orderId}`).then(async (response) => {
      if (response.status === 401) { router.replace('/admin/login'); return; }
      const payload = await response.json();
      if (active && response.ok) setData(payload.data); else if (active) setError(payload.error?.message ?? 'Không tải được đơn hàng.');
    }).catch(() => { if (active) setError('Không thể kết nối máy chủ.'); });
    return () => { active = false; };
  }, [orderId, router]);

  async function update(status: string) {
    setBusy(true); setError('');
    try { const response = await commerceFetch(`/api/v1/admin/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); if (!response.ok) setError((await response.json()).error?.message ?? 'Không thể cập nhật trạng thái.'); else await load(); }
    catch { setError('Không thể kết nối máy chủ.'); } finally { setBusy(false); }
  }
  async function confirmShipping(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError('');
    const carrierCode = String(form.get('carrierCode'));
    const carrierCustomName = String(form.get('carrierCustomName') ?? '').trim();
    try {
      const response = await commerceFetch(`/api/v1/admin/orders/${orderId}/shipping`, { method: 'PATCH', body: JSON.stringify({ carrierCode, ...(carrierCode === 'OTHER' ? { carrierCustomName } : {}), shippingFinalVnd: Number(form.get('shippingFinalVnd')), trackingNumber: form.get('trackingNumber') }) });
      const payload = await response.json();
      if (!response.ok) setError(payload.error?.message ?? 'Không thể xác nhận phí vận chuyển.'); else await load();
    } catch { setError('Không thể kết nối máy chủ.'); } finally { setBusy(false); }
  }
  async function retryEmail() {
    setBusy(true); setError('');
    try { const response = await commerceFetch(`/api/v1/admin/orders/${orderId}/notification/retry`, { method: 'POST' }); if (!response.ok) setError((await response.json()).error?.message ?? 'Không thể gửi lại thông báo.'); else await load(); }
    catch { setError('Không thể kết nối máy chủ.'); } finally { setBusy(false); }
  }

  if (!data) return <section className="admin-content"><button className="text-action" onClick={() => router.back()}>← Quay lại</button>{error && <p className="commerce-error">{error}</p>}</section>;
  const actions: Record<string, string[]> = { NEW: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['SHIPPING', 'CANCELLED'], SHIPPING: ['COMPLETED'], COMPLETED: [], CANCELLED: [] };
  const actionLabels: Record<string, string> = { CONFIRMED: 'Xác nhận đơn', SHIPPING: 'Đánh dấu đang giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Hủy đơn' };
  const hasEstimate = data.shippingEstimateMinVnd !== null && data.shippingEstimateMaxVnd !== null;
  return <section className="admin-content">
    <button className="text-action" onClick={() => router.push('/admin/orders')}>← Danh sách đơn hàng</button>
    <div className="admin-page-heading"><div><p className="eyebrow">CHI TIẾT ĐƠN</p><h1>{data.orderCode}</h1></div><span className="order-status">{data.status}</span></div>
    {error && <p className="commerce-error" role="alert">{error}</p>}
    <div className="admin-detail-grid">
      <article className="admin-card"><h2>Thông tin nhận hàng</h2><p><b>{data.customerName}</b></p><p><a href={`tel:${data.customerPhone}`}>{data.customerPhone}</a></p><p><b>{data.provinceLabel}</b></p><p>{data.deliveryAddress}</p>{data.note && <p>Ghi chú: {data.note}</p>}</article>
      <article className="admin-card"><h2>Chi tiết tiền đơn hàng</h2><p>Tiền hàng <b>{formatMoney(Number(data.subtotalVnd))}</b></p><p>Phí ship dự kiến <b>{hasEstimate ? `${formatMoney(data.shippingEstimateMinVnd!)} – ${formatMoney(data.shippingEstimateMaxVnd!)}` : 'Chưa có mức dự kiến'}</b></p><p>Phí ship chính thức <b>{data.shippingFeeVnd === null ? 'Chưa xác nhận' : formatMoney(Number(data.shippingFeeVnd))}</b></p><p>Đơn vị vận chuyển <b>{data.carrierCode === 'OTHER' ? data.carrierCustomName : data.carrierCode ?? 'Chưa chọn'}</b></p><p>Mã vận đơn <b>{data.trackingNumber || 'Chưa có'}</b></p><p className="admin-total">Tổng đơn chính thức <b>{data.totalVnd === null ? 'Chưa xác nhận' : formatMoney(Number(data.totalVnd))}</b></p></article>
    </div>
    <article className="admin-card"><h2>Xác nhận phí vận chuyển</h2><p>Đơn vị vận chuyển: GHTK, J&amp;T Express, Viettel Post hoặc Khác. Phí chính thức được cộng vào tiền hàng ở phía máy chủ.</p>
      <form className="admin-settings-form shipping-confirm-form" onSubmit={confirmShipping}>
        <label>Đơn vị vận chuyển<select name="carrierCode" defaultValue={data.carrierCode ?? 'GHTK'}><option value="GHTK">GHTK</option><option value="J_AND_T">J&amp;T Express</option><option value="VIETTEL_POST">Viettel Post</option><option value="OTHER">Khác</option></select></label>
        <label>Tên đơn vị khác<input name="carrierCustomName" defaultValue={data.carrierCustomName ?? ''} maxLength={120} placeholder="Chỉ nhập khi chọn Khác" /></label>
        <label>Phí ship chính thức (₫)<input name="shippingFinalVnd" type="number" min="0" max="2000000000" step="1" defaultValue={data.shippingFeeVnd ?? ''} required /></label>
        <label>Mã vận đơn (không bắt buộc)<input name="trackingNumber" defaultValue={data.trackingNumber ?? ''} maxLength={120} /></label>
        <button className="commerce-primary" disabled={busy}>Lưu phí ship chính thức</button>
      </form>
    </article>
    <article className="admin-card"><h2>Thông báo email</h2>{data.notification ? <><p>Trạng thái: <strong>{data.notification.status}</strong> · Số lần thử: {data.notification.attempts}</p>{data.notification.lastErrorCode && <p>Mã lỗi: {data.notification.lastErrorCode}</p>}{data.notification.sentAt && <p>Đã gửi lúc: {new Date(data.notification.sentAt).toLocaleString('vi-VN')}</p>}{data.notification.status === 'FAILED' && <button type="button" className="commerce-primary" disabled={busy} onClick={() => void retryEmail()}>Gửi lại thông báo</button>}</> : <p>Thông báo email đã tắt hoặc chưa được tạo cho đơn này.</p>}</article>
    <article className="admin-card"><h2>Sản phẩm</h2>{data.items.map((item, index) => <div className="admin-order-item" key={`${item.sku}-${index}`}><div><b>{item.productName}</b><p>{item.colorName} · {item.size} · {item.sku}</p><p>{formatMoney(Number(item.saleUnitPriceVnd))}{Number(item.discountPercent) > 0 && <small> (giảm {item.discountPercent}%)</small>} × {item.quantity}</p></div><b>{formatMoney(Number(item.lineTotalVnd))}</b></div>)}</article>
    <div className="admin-actions">{actions[data.status]?.map((status) => <button key={status} disabled={busy || (status === 'CONFIRMED' && (data.shippingStatus !== 'CONFIRMED' || data.shippingFeeVnd === null || !data.carrierCode))} className={status === 'CANCELLED' ? 'admin-danger' : 'commerce-primary'} onClick={() => void update(status)}>{actionLabels[status]}</button>)}</div>
  </section>;
}
