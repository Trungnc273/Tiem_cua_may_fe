'use client';
import { useState } from 'react';
import { formatVnd } from '../../catalog';

type Variant = { size: string; colorCode: string; colorName: string; displayColor: string | null; colorHex: string | null; priceVnd: number; availability: 'IN_STOCK' | 'OUT_OF_STOCK' };
export default function VariantChooser({ variants }: { variants: Variant[] }) {
  const colors = [...new Map(variants.map((variant) => [variant.colorCode, variant])).values()];
  const [selectedColor, setSelectedColor] = useState(colors[0]?.colorCode ?? '');
  const firstSize = variants.find((variant) => variant.colorCode === colors[0]?.colorCode)?.size ?? '';
  const [selectedSize, setSelectedSize] = useState(firstSize);
  const sizes = variants.filter((variant) => variant.colorCode === selectedColor);
  const variant = sizes.find((item) => item.size === selectedSize) ?? sizes[0];
  if (!variant) return <p className="empty-state">Chưa có biến thể đang bán.</p>;
  return <section className="variant-picker" aria-label="Chọn biến thể">
    <p><b>Màu:</b> {variant.displayColor ?? variant.colorName}</p><div className="variant-colors" aria-label="Chọn màu">{colors.map((item) => <button key={item.colorCode} type="button" className={selectedColor === item.colorCode ? 'color-option selected' : 'color-option'} onClick={() => { setSelectedColor(item.colorCode); setSelectedSize(variants.find((candidate) => candidate.colorCode === item.colorCode)?.size ?? ''); }} aria-pressed={selectedColor === item.colorCode} aria-label={item.displayColor ?? item.colorName}>
      {item.colorHex && <i style={{ backgroundColor: item.colorHex }}/>}<span>{item.displayColor ?? item.colorName}</span>
    </button>)}</div>
    <p><b>Kích cỡ</b></p><div className="variant-sizes" aria-label="Chọn kích cỡ">{sizes.map((item) => <button key={`${item.colorCode}-${item.size}`} type="button" className={`size-option${selectedSize === item.size ? ' selected' : ''}${item.availability === 'OUT_OF_STOCK' ? ' unavailable' : ''}`} onClick={() => setSelectedSize(item.size)} aria-pressed={selectedSize === item.size} aria-label={`${item.size}${item.availability === 'OUT_OF_STOCK' ? ', tạm hết hàng' : ''}`}>{item.size}</button>)}</div>
    <p className="variant-price">{formatVnd(variant.priceVnd)}</p><p className={variant.availability === 'IN_STOCK' ? 'availability' : 'availability unavailable'}>{variant.availability === 'IN_STOCK' ? 'Còn hàng' : 'Tạm hết hàng'}</p>
  </section>;
}
