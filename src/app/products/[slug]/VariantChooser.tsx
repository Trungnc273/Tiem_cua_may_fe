'use client';

import { useEffect, useState } from 'react';
import { commerceFetch, formatMoney, notifyCartChanged, responseMessage } from '../../../lib/commerce';

type Variant = { variantId: string; size: string; colorCode: string; colorName: string; displayColor: string | null; colorHex: string | null; priceVnd: number; originalPriceVnd: number; salePriceVnd: number; discountPercent: number; hasDiscount: boolean; stockQuantity: number; availability: 'IN_STOCK' | 'OUT_OF_STOCK' };
export default function VariantChooser({ variants, contactPhone, messengerUrl, onVariantChange }: { variants: Variant[]; contactPhone: string; messengerUrl: string; onVariantChange?: (variantId: string) => void }) {
  const colors = [...new Map(variants.map((variant) => [variant.colorCode, variant])).values()];
  const [selectedColor, setSelectedColor] = useState(colors[0]?.colorCode ?? '');
  const firstSize = variants.find((variant) => variant.colorCode === colors[0]?.colorCode)?.size ?? '';
  const [selectedSize, setSelectedSize] = useState(firstSize);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const sizes = variants.filter((variant) => variant.colorCode === selectedColor);
  const variant = sizes.find((item) => item.size === selectedSize) ?? sizes[0];
  const selectedVariantId = variant?.variantId;
  useEffect(() => { if (selectedVariantId) onVariantChange?.(selectedVariantId); }, [selectedVariantId, onVariantChange]);
  if (!variant) return <p className="empty-state">Chưa có biến thể đang bán.</p>;
  async function addToCart() {
    setBusy(true); setNotice('');
    try { const response = await commerceFetch('/api/v1/public/cart/items', { method: 'POST', body: JSON.stringify({ variantId: variant.variantId, quantity: 1 }) }); if (!response.ok) setNotice(await responseMessage(response)); else { setNotice('Đã thêm vào giỏ hàng.'); notifyCartChanged(); } }
    catch { setNotice('Không thể kết nối giỏ hàng. Vui lòng thử lại.'); } finally { setBusy(false); }
  }
  return <section className="variant-picker" aria-label="Chọn biến thể">
    <p><b>Màu:</b> {variant.displayColor ?? variant.colorName}</p><div className="variant-colors" aria-label="Chọn màu">{colors.map((item) => <button key={item.colorCode} type="button" className={selectedColor === item.colorCode ? 'color-option selected' : 'color-option'} onClick={() => { setSelectedColor(item.colorCode); setSelectedSize(variants.find((candidate) => candidate.colorCode === item.colorCode)?.size ?? ''); }} aria-pressed={selectedColor === item.colorCode} aria-label={item.displayColor ?? item.colorName}>
      {item.colorHex && <i style={{ backgroundColor: item.colorHex }}/>}<span>{item.displayColor ?? item.colorName}</span>
    </button>)}</div>
    <p><b>Kích cỡ</b></p><div className="variant-sizes" aria-label="Chọn kích cỡ">{sizes.map((item) => <button key={`${item.colorCode}-${item.size}`} type="button" className={`size-option${selectedSize === item.size ? ' selected' : ''}${item.availability === 'OUT_OF_STOCK' ? ' unavailable' : ''}`} onClick={() => setSelectedSize(item.size)} aria-pressed={selectedSize === item.size} aria-label={`${item.size}${item.availability === 'OUT_OF_STOCK' ? ', tạm hết hàng' : ''}`}>{item.size}</button>)}</div>
    <p className="variant-price">{variant.hasDiscount && <del>{formatMoney(variant.originalPriceVnd)}</del>} {formatMoney(variant.salePriceVnd)} {variant.hasDiscount && <span className="discount-pill">-{variant.discountPercent}%</span>}</p><p className={variant.availability === 'IN_STOCK' ? 'availability' : 'availability unavailable'}>{variant.availability === 'IN_STOCK' ? `Còn hàng · ${variant.stockQuantity} sản phẩm` : 'Tạm hết hàng'}</p>
    <button type="button" className="commerce-primary add-to-cart" disabled={busy || variant.availability !== 'IN_STOCK'} onClick={() => void addToCart()}>{busy ? 'Đang thêm…' : variant.availability === 'IN_STOCK' ? 'Thêm vào giỏ hàng' : 'Tạm hết hàng'}</button>
    {notice && <p role="status" className={notice.startsWith('Đã thêm') ? 'commerce-success' : 'commerce-error'}>{notice}</p>}
    <nav className="product-contact"><a href={`tel:${contactPhone}`}>Gọi Tiệm: {contactPhone}</a><a href={messengerUrl} target="_blank" rel="noopener noreferrer">Nhắn tin Messenger</a></nav>
  </section>;
}
