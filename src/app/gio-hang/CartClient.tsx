'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { commerceFetch, formatMoney, notifyCartChanged, responseMessage } from '../../lib/commerce';

type CartItem = { itemId: string; variantId: string; slug: string; productName: string; sku: string; size: string; colorName: string; quantity: number; stock: number; available: boolean; originalPriceVnd: number; salePriceVnd: number; discountPercent: number; hasDiscount: boolean; lineTotalVnd: number; imageUrl: string };
type CartData = { items: CartItem[]; subtotalVnd: number; shippingFeeVnd: number | null; shippingConfigured: boolean; totalVnd: number | null };
const empty: CartData = { items: [], subtotalVnd: 0, shippingFeeVnd: null, shippingConfigured: false, totalVnd: null };

export default function CartClient() {
  const [cart, setCart] = useState<CartData>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [key, setKey] = useState(() => globalThis.crypto.randomUUID());
  const canSubmit = cart.items.length > 0 && cart.shippingConfigured && cart.items.every((item) => item.available && item.quantity <= item.stock);

  const reload = useCallback(async () => {
    try {
      const response = await commerceFetch('/api/v1/public/cart');
      const payload = await response.json();
      if (response.ok) setCart(payload.data as CartData);
    } catch { setError('Không thể kết nối giỏ hàng. Vui lòng thử lại.'); }
  }, []);

  useEffect(() => {
    let active = true;
    void commerceFetch('/api/v1/public/cart').then(async (response) => {
      const payload = await response.json();
      if (active && response.ok) setCart(payload.data as CartData);
    }).catch(() => { if (active) setError('Không thể kết nối giỏ hàng. Vui lòng thử lại.'); });
    return () => { active = false; };
  }, []);

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
    event.preventDefault(); if (!key) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const body = { customerName: String(form.get('customerName') ?? ''), customerPhone: String(form.get('customerPhone') ?? ''), deliveryAddress: String(form.get('deliveryAddress') ?? ''), note: String(form.get('note') ?? '') };
    try {
      const response = await commerceFetch('/api/v1/public/orders', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) setError(payload.error?.message ?? 'Không thể gửi yêu cầu đặt hàng.');
      else { setOrderCode(payload.data.orderCode); setKey(globalThis.crypto.randomUUID()); setCart(empty); notifyCartChanged(); }
    } catch { setError('Không thể kết nối. Vui lòng thử lại với cùng thông tin.'); }
    finally { setBusy(false); }
  }

  if (orderCode) return <section className="order-success"><span className="success-mark">✓</span><p className="eyebrow">ĐÃ GỬI YÊU CẦU</p><h1>Cảm ơn bạn đã đặt hàng</h1><p>Mã đơn hàng của bạn</p><strong className="order-code">{orderCode}</strong><p>Tiệm sẽ liên hệ để xác nhận đơn và thông tin giao hàng.</p><Link className="commerce-primary" href="/products">Tiếp tục mua sắm</Link></section>;

  return <>
    <section className="commerce-intro"><p className="eyebrow">MUA SẮM CÙNG TIỆM</p><h1>Giỏ hàng</h1><p>Kiểm tra sản phẩm trước khi gửi yêu cầu đặt hàng.</p></section>
    {error && <p className="commerce-error" role="alert">{error}</p>}
    {!cart.items.length
      ? <section className="commerce-empty"><p>Giỏ hàng của bạn đang trống.</p><Link className="commerce-primary" href="/products">Khám phá sản phẩm</Link></section>
      : <div className="cart-layout">
        <section className="cart-items" aria-label="Sản phẩm trong giỏ">
          {cart.items.map((item) => <article className="cart-item" key={item.itemId}>
            <Link href={`/products/${item.slug}`} className="cart-image">{item.imageUrl && <Image src={item.imageUrl} alt={item.productName} fill unoptimized/>}</Link>
            <div className="cart-item-copy">
              <Link href={`/products/${item.slug}`} className="cart-item-title">{item.productName}</Link>
              <p>{item.colorName} · {item.size}</p>
              <p className="cart-current-price">{formatMoney(item.salePriceVnd)}{item.hasDiscount && <><del>{formatMoney(item.originalPriceVnd)}</del><span className="discount-pill">-{item.discountPercent}%</span></>}</p>
              <div className="quantity-control">
                <button disabled={busy} onClick={() => void change(item, item.quantity - 1)} aria-label={`Giảm số lượng ${item.productName}`}>−</button>
                <span>{item.quantity}</span>
                <button disabled={busy || item.quantity >= item.stock} onClick={() => void change(item, item.quantity + 1)} aria-label={`Tăng số lượng ${item.productName}`}>+</button>
                <button className="remove-item" disabled={busy} onClick={() => void change(item, 0)}>Xóa</button>
              </div>
              {(!item.available || item.quantity > item.stock) && <p className="commerce-error">{item.available ? 'Số lượng vượt quá tồn kho hiện tại.' : 'Sản phẩm này hiện không còn bán.'}</p>}
            </div>
            <strong className="cart-line-total">{formatMoney(item.lineTotalVnd)}</strong>
          </article>)}
        </section>
        <aside className="checkout-panel">
          <h2>Thông tin giao hàng</h2>
          <form onSubmit={submit} className="checkout-form">
            <label>Họ và tên<input name="customerName" autoComplete="name" maxLength={120} required/></label>
            <label>Số điện thoại<input name="customerPhone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="Ví dụ: 0876146498" required/></label>
            <label>Địa chỉ nhận hàng<textarea name="deliveryAddress" autoComplete="street-address" minLength={5} maxLength={500} rows={3} required/></label>
            <label>Ghi chú <span>(không bắt buộc)</span><textarea name="note" maxLength={1000} rows={2}/></label>
            <div className="checkout-totals">
              <p><span>Tạm tính</span><b>{formatMoney(cart.subtotalVnd)}</b></p>
              <p><span>Phí giao hàng</span><b>{cart.shippingConfigured ? formatMoney(cart.shippingFeeVnd ?? 0) : 'Chưa cấu hình'}</b></p>
              {cart.shippingConfigured && <p className="checkout-grand-total"><span>Tổng cộng</span><b>{formatMoney(cart.totalVnd ?? 0)}</b></p>}
            </div>
            {!cart.shippingConfigured && <p className="shipping-unconfigured">Tiệm chưa thiết lập phí giao hàng nên chưa thể nhận đơn lúc này.</p>}
            {cart.items.some((item) => !item.available || item.quantity > item.stock) && <p className="shipping-unconfigured">Một số sản phẩm không còn đủ hàng. Hãy điều chỉnh giỏ trước khi đặt.</p>}
            <button className="commerce-primary" disabled={busy || !canSubmit}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt hàng'}</button>
            <p className="checkout-note">Tiệm sẽ liên hệ xác nhận đơn hàng. Chưa có thanh toán trực tuyến.</p>
          </form>
        </aside>
      </div>}
  </>;
}
