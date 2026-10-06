'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { commerceFetch, commerceImageUrl, formatMoney, notifyCartChanged, responseMessage } from '../../lib/commerce';

type CartItem = { itemId: string; variantId: string; slug: string; productName: string; sku: string; size: string; colorName: string; quantity: number; stock: number; available: boolean; originalPriceVnd: number; salePriceVnd: number; discountPercent: number; hasDiscount: boolean; lineTotalVnd: number; imageUrl: string };
type CartData = { items: CartItem[]; subtotalVnd: number };
type Province = { code: string; label: string };
type Ward = { code: number; name: string; division_type: string; province_code: number };
type Estimate = { minVnd: number; maxVnd: number; label: string; isFallback: boolean } | null;
type OrderSummary = { code: string; subtotalVnd: number; estimateMinVnd: number | null; estimateMaxVnd: number | null };
const empty: CartData = { items: [], subtotalVnd: 0 };

export default function CartClient() {
  const [cart, setCart] = useState<CartData>(empty);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [provinceInput, setProvinceInput] = useState('');
  const [ward, setWard] = useState('');
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [wardsUnavailable, setWardsUnavailable] = useState(false);
  const wardCache = useRef(new Map<string, Ward[]>());
  const wardRequest = useRef<AbortController | null>(null);
  const [estimateResult, setEstimateResult] = useState<{ provinceCode: string; estimate: Estimate; state: 'loading' | 'loaded' | 'error' }>({ provinceCode: '', estimate: null, state: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [key, setKey] = useState(() => globalThis.crypto.randomUUID());
  const canSubmit = cart.items.length > 0 && Boolean(provinceCode) && Boolean(ward.trim()) && cart.items.every((item) => item.available && item.quantity <= item.stock);

  const reload = useCallback(async () => {
    try {
      const response = await commerceFetch('/api/v1/public/cart');
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.data) { setCart(payload.data as CartData); setError(''); }
      else setError(response.ok ? 'Dữ liệu giỏ hàng không hợp lệ.' : payload?.error?.message ?? 'Không tải được giỏ hàng. Vui lòng thử lại.');
    } catch { setError('Không thể kết nối giỏ hàng. Vui lòng thử lại.'); }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([commerceFetch('/api/v1/public/cart'), commerceFetch('/api/v1/public/shipping/provinces')]).then(async ([cartResponse, provinceResponse]) => {
      const [cartPayload, provincePayload] = await Promise.all([cartResponse.json(), provinceResponse.json()]);
      if (!active) return;
      if (cartResponse.ok && cartPayload?.data) setCart(cartPayload.data as CartData);
      else if (active) setError(cartPayload?.error?.message ?? 'Không tải được giỏ hàng. Vui lòng thử lại.');
      if (provinceResponse.ok && provincePayload?.data) setProvinces(provincePayload.data as Province[]);
      else if (active) setError(provincePayload?.error?.message ?? 'Không tải được danh sách tỉnh/thành phố.');
    }).catch(() => { if (active) setError('Không thể tải giỏ hàng. Vui lòng thử lại.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!provinceCode) return () => { active = false; };
    void commerceFetch(`/api/v1/public/shipping/estimate?provinceCode=${encodeURIComponent(provinceCode)}`).then(async (response) => {
      const payload = await response.json();
      if (active && response.ok) setEstimateResult({ provinceCode, estimate: payload.data.estimate as Estimate, state: 'loaded' });
      else if (active) setEstimateResult({ provinceCode, estimate: null, state: 'error' });
    }).catch(() => { if (active) setEstimateResult({ provinceCode, estimate: null, state: 'error' }); });
    return () => { active = false; };
  }, [provinceCode]);

  useEffect(() => () => wardRequest.current?.abort(), []);

  function selectProvince(value: string) {
    const match = provinces.find((item) => item.label.localeCompare(value, 'vi', { sensitivity: 'base' }) === 0 || item.label.replace(/^(T\u1ec9nh|Th\u00e0nh ph\u1ed1)\s+/i, '').localeCompare(value, 'vi', { sensitivity: 'base' }) === 0);
    const nextCode = match?.code ?? '';
    setProvinceInput(value);
    if (nextCode === provinceCode) return;
    setProvinceCode(nextCode);
    setWard('');
    setWardsUnavailable(false);
    wardRequest.current?.abort();
    if (!nextCode) { setWards([]); setWardsLoading(false); return; }
    const cached = wardCache.current.get(nextCode);
    if (cached) { setWards(cached); setWardsLoading(false); return; }
    const controller = new AbortController();
    wardRequest.current = controller;
    setWards([]);
    setWardsLoading(true);
    void fetch(`https://provinces.open-api.vn/api/v2/w/?province=${Number(nextCode)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Ward suggestions unavailable');
        return response.json() as Promise<Ward[]>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const items = Array.isArray(data) ? data.filter((item) => item && typeof item.name === 'string') : [];
        wardCache.current.set(nextCode, items);
        setWards(items);
      })
      .catch(() => { if (!controller.signal.aborted) { setWards([]); setWardsUnavailable(true); } })
      .finally(() => { if (!controller.signal.aborted) setWardsLoading(false); });
  }

  const estimate = estimateResult.provinceCode === provinceCode ? estimateResult.estimate : null;
  const estimateState = estimateResult.provinceCode === provinceCode ? estimateResult.state : 'loading';

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
    event.preventDefault(); if (!key || !provinceCode || !ward.trim()) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const province = provinces.find((item) => item.code === provinceCode);
    if (!province) { setBusy(false); setError('Vui lòng chọn tỉnh hoặc thành phố.'); return; }
    const detailAddress = String(form.get('deliveryAddress') ?? '').trim();
    const body = { customerName: String(form.get('customerName') ?? ''), customerPhone: String(form.get('customerPhone') ?? ''), provinceCode, provinceLabel: province.label, deliveryAddress: `${ward.trim()}, ${detailAddress}`, note: String(form.get('note') ?? '') };
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
    return <section className="order-success"><span className="success-mark">✓</span><p className="eyebrow">ĐẶT HÀNG THÀNH CÔNG</p><h1>Midora đã nhận đơn của bạn.</h1><p>Mã đơn hàng</p><strong className="order-code">{order.code}</strong><p>Nhân viên Midora sẽ liên hệ để xác nhận sản phẩm và phí vận chuyển chính thức trước khi gửi hàng.</p><div className="checkout-totals"><p><span>Tiền hàng</span><b>{formatMoney(order.subtotalVnd)}</b></p><p><span>Phí vận chuyển dự kiến</span><b>{hasEstimate ? `${formatMoney(order.estimateMinVnd!)} – ${formatMoney(order.estimateMaxVnd!)}` : 'Sẽ được xác nhận khi liên hệ'}</b></p>{hasEstimate && <p className="checkout-grand-total"><span>Tạm tính dự kiến</span><b>{formatMoney(order.subtotalVnd + order.estimateMinVnd!)} – {formatMoney(order.subtotalVnd + order.estimateMaxVnd!)}</b></p>}</div><p className="checkout-note">Phí vận chuyển trên chỉ là ước tính. Midora sẽ xác nhận phí chính thức.</p><Link className="commerce-primary" href="/products">Tiếp tục mua sắm</Link></section>;
  }

  return <>
    <section className="commerce-intro"><p className="eyebrow">MUA SẮM CÙNG MIDORA</p><h1>Giỏ hàng</h1><p>Kiểm tra sản phẩm trước khi gửi yêu cầu đặt hàng.</p></section>
    {error && <p className="commerce-error" role="alert">{error}</p>}
    {!cart.items.length
      ? <section className="commerce-empty"><p>Giỏ hàng của bạn đang trống.</p><Link className="commerce-primary" href="/products">Khám phá sản phẩm</Link></section>
      : <div className="cart-layout">
        <section className="cart-items" aria-label="Sản phẩm trong giỏ">
          {cart.items.map((item) => <article className="cart-item" key={item.itemId}>
            <Link href={`/products/${item.slug}`} className="cart-image">{item.imageUrl && <Image src={commerceImageUrl(item.imageUrl)} alt={item.productName} fill unoptimized/>}</Link>
            <div className="cart-item-copy"><Link href={`/products/${item.slug}`} className="cart-item-title">{item.productName}</Link><p>{item.colorName ? `${item.colorName} · ` : ''}{item.size}</p><p className="cart-current-price">{formatMoney(item.salePriceVnd)}{item.hasDiscount && <><del>{formatMoney(item.originalPriceVnd)}</del><span className="discount-pill">-{item.discountPercent}%</span></>}</p><div className="quantity-control"><button disabled={busy} onClick={() => void change(item, item.quantity - 1)} aria-label={`Giảm số lượng ${item.productName}`}>−</button><span>{item.quantity}</span><button disabled={busy || item.quantity >= item.stock} onClick={() => void change(item, item.quantity + 1)} aria-label={`Tăng số lượng ${item.productName}`}>+</button><button className="remove-item" disabled={busy} onClick={() => void change(item, 0)}>Xóa</button></div>{(!item.available || item.quantity > item.stock) && <p className="commerce-error">{item.available ? 'Số lượng vượt quá tồn kho hiện tại.' : 'Sản phẩm này hiện không còn bán.'}</p>}</div>
            <strong className="cart-line-total">{formatMoney(item.lineTotalVnd)}</strong>
          </article>)}
        </section>
        <aside className="checkout-panel">
          <h2>Thông tin giao hàng</h2>
          <form onSubmit={submit} className="checkout-form">
            <label>Họ và tên<input name="customerName" autoComplete="name" maxLength={120} required/></label>
            <label>Số điện thoại<input name="customerPhone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="Ví dụ: 0876146498" required/></label>
            <label>{'T\u1ec9nh / Th\u00e0nh ph\u1ed1'}<input name="provinceSearch" list="midora-province-options" value={provinceInput} autoComplete="address-level1" placeholder={'G\u00f5 \u0111\u1ec3 t\u00ecm t\u1ec9nh/th\u00e0nh ph\u1ed1'} onChange={(event) => selectProvince(event.target.value)} required/><datalist id="midora-province-options">{provinces.map((province) => <option key={province.code} value={province.label}/>)}</datalist><input type="hidden" name="provinceCode" value={provinceCode}/></label>
            <label>{'X\u00e3 / Ph\u01b0\u1eddng'}<input name="ward" list="midora-ward-options" value={ward} onChange={(event) => setWard(event.target.value)} autoComplete="address-level2" maxLength={120} placeholder={wardsLoading ? 'Đang tải gợi ý xã/phường…' : 'Gõ để tìm hoặc nhập tên xã/phường'} required/><datalist id="midora-ward-options">{wards.map((item) => <option key={item.code} value={item.name}/>)}</datalist>{wardsUnavailable && <small role="status">{ 'Ch\u01b0a t\u1ea3i \u0111\u01b0\u1ee3c g\u1ee3i \u00fd; b\u1ea1n v\u1eabn c\u00f3 th\u1ec3 nh\u1eadp t\u00ean x\u00e3/ph\u01b0\u1eddng.' }</small>}</label>
            <label>{'Đ\u1ecba ch\u1ec9 chi ti\u1ebft'}<textarea name="deliveryAddress" autoComplete="street-address" minLength={5} maxLength={350} rows={3} placeholder={'S\u1ed1 nh\u00e0, t\u00ean \u0111\u01b0\u1eddng, t\u00f2a nh\u00e0...'} required/></label>
            <label>Ghi chú <span>(không bắt buộc)</span><textarea name="note" maxLength={1000} rows={2}/></label>
            <div className="checkout-totals"><p><span>Tiền hàng</span><b>{formatMoney(cart.subtotalVnd)}</b></p><p><span>Phí vận chuyển dự kiến</span><b>{!provinceCode ? 'Chọn tỉnh/thành phố' : estimateState === 'loading' ? 'Đang tải mức phí…' : estimate ? `${formatMoney(estimate.minVnd)} – ${formatMoney(estimate.maxVnd)}` : estimateState === 'error' ? 'Chưa tải được mức phí' : 'Sẽ được nhân viên xác nhận'}</b></p>{estimate && <p className="checkout-grand-total"><span>Tạm tính dự kiến</span><b>{formatMoney(cart.subtotalVnd + estimate.minVnd)} – {formatMoney(cart.subtotalVnd + estimate.maxVnd)}</b></p>}</div>
            {estimateState === 'error' && provinceCode && <p className="shipping-unconfigured" role="status">Chưa tải được khoảng phí dự kiến. Bạn vẫn có thể gửi đơn; Midora sẽ xác nhận phí chính thức khi liên hệ.</p>}
            <p className="checkout-note">Phí vận chuyển trên chỉ là ước tính. Midora sẽ liên hệ để xác nhận đơn hàng và phí vận chuyển chính thức trước khi gửi hàng.</p>
            {cart.items.some((item) => !item.available || item.quantity > item.stock) && <p className="shipping-unconfigured">Một số sản phẩm không còn đủ hàng. Hãy điều chỉnh giỏ trước khi đặt.</p>}
            <button className="commerce-primary" disabled={busy || !canSubmit}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt hàng'}</button>
          </form>
        </aside>
      </div>}
  </>;
}
