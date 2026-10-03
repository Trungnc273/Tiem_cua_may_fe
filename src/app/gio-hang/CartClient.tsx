'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { commerceFetch, commerceImageUrl, formatMoney, notifyCartChanged, responseMessage } from '../../lib/commerce';

type CartItem = { itemId: string; variantId: string; slug: string; productName: string; sku: string; size: string; colorName: string; quantity: number; stock: number; available: boolean; originalPriceVnd: number; salePriceVnd: number; discountPercent: number; hasDiscount: boolean; lineTotalVnd: number; imageUrl: string };
type CartData = { items: CartItem[]; subtotalVnd: number };
type Province = { code: string; label: string };
type Estimate = { minVnd: number; maxVnd: number; label: string; isFallback: boolean } | null;
type OrderSummary = { code: string; subtotalVnd: number; estimateMinVnd: number | null; estimateMaxVnd: number | null };
const empty: CartData = { items: [], subtotalVnd: 0 };

export default function CartClient() {
  const [cart, setCart] = useState<CartData>(empty);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [estimateResult, setEstimateResult] = useState<{ provinceCode: string; estimate: Estimate; loaded: boolean }>({ provinceCode: '', estimate: null, loaded: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [key, setKey] = useState(() => globalThis.crypto.randomUUID());
  const canSubmit = cart.items.length > 0 && Boolean(provinceCode) && cart.items.every((item) => item.available && item.quantity <= item.stock);

  const reload = useCallback(async () => {
    try {
      const response = await commerceFetch('/api/v1/public/cart');
      const payload = await response.json();
      if (response.ok) setCart(payload.data as CartData);
    } catch { setError('Không thể kết nối giỏ hàng. Vui lòng thử lại.'); }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([commerceFetch('/api/v1/public/cart'), commerceFetch('/api/v1/public/shipping/provinces')]).then(async ([cartResponse, provinceResponse]) => {
      const [cartPayload, provincePayload] = await Promise.all([cartResponse.json(), provinceResponse.json()]);
      if (!active) return;
      if (cartResponse.ok) setCart(cartPayload.data as CartData);
      if (provinceResponse.ok) setProvinces(provincePayload.data as Province[]);
    }).catch(() => { if (active) setError('Không thể tải giỏ hàng. Vui lòng thử lại.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!provinceCode) return () => { active = false; };
    void commerceFetch(`/api/v1/public/shipping/estimate?provinceCode=${encodeURIComponent(provinceCode)}`).then(async (response) => {
      const payload = await response.json();
      if (active && response.ok) setEstimateResult({ provinceCode, estimate: payload.data.estimate as Estimate, loaded: true });
      else if (active) setEstimateResult({ provinceCode, estimate: null, loaded: true });
    }).catch(() => { if (active) setEstimateResult({ provinceCode, estimate: null, loaded: true }); });
    return () => { active = false; };
  }, [provinceCode]);

  const estimate = estimateResult.provinceCode === provinceCode ? estimateResult.estimate : null;
  const estimateLoaded = estimateResult.provinceCode === provinceCode && estimateResult.loaded;

  async function change(item: CartItem, quantity: number) {
    setBusy(true); setError('');
    try {
      const response = quantity < 1
        ? await commerceFetch(`/api/v1/public/cart/items/${item.itemId}`, { method: 'DELETE' })
        : await commerceFetch(`/api/v1/public/cart/items/${item.itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
      if (!response.ok) setError(await responseMessage(response));
      else { await reload(); notifyCartChanged(); }
    } catch { setError('Không thể cập nhật giỏ hàng.'); }
    finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!key || !provinceCode) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const province = provinces.find((item) => item.code === provinceCode);
    if (!province) { setBusy(false); setError('Vui lòng chọn tỉnh hoặc thành phố.'); return; }
    const body = { customerName: String(form.get('customerName') ?? ''), customerPhone: String(form.get('customerPhone') ?? ''), provinceCode, provinceLabel: province.label, deliveryAddress: String(form.get('deliveryAddress') ?? ''), note: String(form.get('note') ?? '') };
    try {
      const response = await commerceFetch('/api/v1/public/orders', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) setError(payload.error?.message ?? 'Không thể gửi yêu cầu đặt hàng.');
      else {
        setOrder({ code: payload.data.orderCode, subtotalVnd: Number(payload.data.subtotalVnd), estimateMinVnd: payload.data.shippingEstimateMinVnd === null ? null : Number(payload.data.shippingEstimateMinVnd), estimateMaxVnd: payload.data.shippingEstimateMaxVnd === null ? null : Number(payload.data.shippingEstimateMaxVnd) });
        setKey(globalThis.crypto.randomUUID()); setCart(empty); notifyCartChanged();
      }
    } catch { setError('Không thể kết nối. Vui lòng thử lại với cùng thông tin.'); }
    finally { setBusy(false); }
  }

  if (order) {
    const hasEstimate = order.estimateMinVnd !== null && order.estimateMaxVnd !== null;
    return <section className="order-success"><span className="success-mark">✓</span><p className="eyebrow">ĐẶT HÀNG THÀNH CÔNG</p><h1>Tiệm Của Mây đã nhận đơn của bạn.</h1><p>Mã đơn hàng</p><strong className="order-code">{order.code}</strong><p>Nhân viên của Tiệm sẽ liên hệ để xác nhận sản phẩm và phí vận chuyển chính thức trước khi gửi hàng.</p><div className="checkout-totals"><p><span>Tiền hàng</span><b>{formatMoney(order.subtotalVnd)}</b></p><p><span>Phí vận chuyển dự kiến</span><b>{hasEstimate ? `${formatMoney(order.estimateMinVnd!)} – ${formatMoney(order.estimateMaxVnd!)}` : 'Sẽ được xác nhận khi liên hệ'}</b></p>{hasEstimate && <p className="checkout-grand-total"><span>Tạm tính dự kiến</span><b>{formatMoney(order.subtotalVnd + order.estimateMinVnd!)} – {formatMoney(order.subtotalVnd + order.estimateMaxVnd!)}</b></p>}</div><p className="checkout-note">Phí vận chuyển trên chỉ là ước tính. Phí chính thức sẽ được Tiệm xác nhận.</p><Link className="commerce-primary" href="/products">Tiếp tục mua sắm</Link></section>;
  }

  return <>
    <section className="commerce-intro"><p className="eyebrow">MUA SẮM CÙNG TIỆM</p><h1>Giỏ hàng</h1><p>Kiểm tra sản phẩm trước khi gửi yêu cầu đặt hàng.</p></section>
    {error && <p className="commerce-error" role="alert">{error}</p>}
    {!cart.items.length
      ? <section className="commerce-empty"><p>Giỏ hàng của bạn đang trống.</p><Link className="commerce-primary" href="/products">Khám phá sản phẩm</Link></section>
      : <div className="cart-layout">
        <section className="cart-items" aria-label="Sản phẩm trong giỏ">
          {cart.items.map((item) => <article className="cart-item" key={item.itemId}>
            <Link href={`/products/${item.slug}`} className="cart-image">{item.imageUrl && <Image src={commerceImageUrl(item.imageUrl)} alt={item.productName} fill unoptimized/>}</Link>
            <div className="cart-item-copy"><Link href={`/products/${item.slug}`} className="cart-item-title">{item.productName}</Link><p>{item.colorName} · {item.size}</p><p className="cart-current-price">{formatMoney(item.salePriceVnd)}{item.hasDiscount && <><del>{formatMoney(item.originalPriceVnd)}</del><span className="discount-pill">-{item.discountPercent}%</span></>}</p><div className="quantity-control"><button disabled={busy} onClick={() => void change(item, item.quantity - 1)} aria-label={`Giảm số lượng ${item.productName}`}>−</button><span>{item.quantity}</span><button disabled={busy || item.quantity >= item.stock} onClick={() => void change(item, item.quantity + 1)} aria-label={`Tăng số lượng ${item.productName}`}>+</button><button className="remove-item" disabled={busy} onClick={() => void change(item, 0)}>Xóa</button></div>{(!item.available || item.quantity > item.stock) && <p className="commerce-error">{item.available ? 'Số lượng vượt quá tồn kho hiện tại.' : 'Sản phẩm này hiện không còn bán.'}</p>}</div>
            <strong className="cart-line-total">{formatMoney(item.lineTotalVnd)}</strong>
          </article>)}
        </section>
        <aside className="checkout-panel">
          <h2>Thông tin giao hàng</h2>
          <form onSubmit={submit} className="checkout-form">
            <label>Họ và tên<input name="customerName" autoComplete="name" maxLength={120} required/></label>
            <label>Số điện thoại<input name="customerPhone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="Ví dụ: 0876146498" required/></label>
            <label>Tỉnh / Thành phố<select name="provinceCode" value={provinceCode} onChange={(event) => setProvinceCode(event.target.value)} required><option value="">Chọn tỉnh hoặc thành phố</option>{provinces.map((province) => <option key={province.code} value={province.code}>{province.label}</option>)}</select></label>
            <label>Địa chỉ chi tiết<textarea name="deliveryAddress" autoComplete="street-address" minLength={5} maxLength={500} rows={3} placeholder="Số nhà, đường, phường/xã" required/></label>
            <label>Ghi chú <span>(không bắt buộc)</span><textarea name="note" maxLength={1000} rows={2}/></label>
            <div className="checkout-totals"><p><span>Tiền hàng</span><b>{formatMoney(cart.subtotalVnd)}</b></p><p><span>Phí vận chuyển dự kiến</span><b>{!provinceCode || !estimateLoaded ? 'Chọn tỉnh/thành phố' : estimate ? `${formatMoney(estimate.minVnd)} – ${formatMoney(estimate.maxVnd)}` : 'Sẽ được nhân viên xác nhận'}</b></p>{estimate && <p className="checkout-grand-total"><span>Tạm tính dự kiến</span><b>{formatMoney(cart.subtotalVnd + estimate.minVnd)} – {formatMoney(cart.subtotalVnd + estimate.maxVnd)}</b></p>}</div>
            <p className="checkout-note">Phí vận chuyển trên chỉ là ước tính. Tiệm Của Mây sẽ liên hệ để xác nhận đơn hàng và phí vận chuyển chính thức trước khi gửi hàng.</p>
            {cart.items.some((item) => !item.available || item.quantity > item.stock) && <p className="shipping-unconfigured">Một số sản phẩm không còn đủ hàng. Hãy điều chỉnh giỏ trước khi đặt.</p>}
            <button className="commerce-primary" disabled={busy || !canSubmit}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt hàng'}</button>
          </form>
        </aside>
      </div>}
  </>;
}
