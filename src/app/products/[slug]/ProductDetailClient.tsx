'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { commerceFetch, formatMoney, notifyCartChanged, responseMessage } from '../../../lib/commerce';

type Variant = {
  variantId: string;
  size: string;
  colorCode: string | null;
  colorName: string | null;
  displayColor: string | null;
  colorHex: string | null;
  originalPriceVnd: number;
  salePriceVnd: number;
  discountPercent: number;
  hasDiscount: boolean;
  stockQuantity: number;
  priceVnd: number;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
};
type ProductImage = { url: string; altText: string; sortOrder: number; isPrimary: boolean; variantId?: string | null };
type Product = { slug: string; name: string; description: string; categoryName: string; isNew: boolean; isFeatured: boolean; images: ProductImage[]; variants: Variant[] };

const available = (variant: Variant) => variant.availability === 'IN_STOCK' && variant.stockQuantity > 0;

export default function ProductDetailClient({ product, contactPhone, messengerUrl }: { product: Product; contactPhone: string; messengerUrl: string }) {
  const router = useRouter();
  const initialVariant = product.variants.find(available) ?? product.variants[0];
  const [selectedColor, setSelectedColor] = useState(initialVariant?.colorCode ?? '');
  const [selectedSize, setSelectedSize] = useState(initialVariant?.size ?? '');
  const [activeImageSelection, setActiveImageSelection] = useState<{ variantId: string; url: string } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  const [failedImageUrl, setFailedImageUrl] = useState('');

  const variant = product.variants.find((item) => (item.colorCode ?? '') === selectedColor && item.size === selectedSize) ?? initialVariant;
  const colors = useMemo(() => [...new Map(product.variants.filter((item): item is Variant & { colorCode: string; colorName: string } => Boolean(item.colorCode && item.colorName)).map((item) => [item.colorCode, item])).values()], [product.variants]);
  const sizes = useMemo(() => [...new Set(product.variants.map((item) => item.size))], [product.variants]);
  const orderedImages = useMemo(() => [...product.images].sort((a, b) => a.sortOrder - b.sortOrder), [product.images]);
  const variantImages = variant ? orderedImages.filter((image) => image.variantId === variant.variantId) : [];
  const generalImages = orderedImages.filter((image) => !image.variantId);
  const images = variantImages.length ? [...variantImages, ...generalImages] : generalImages.length ? generalImages : orderedImages;
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0];
  const selectedImage = activeImageSelection?.variantId === variant?.variantId
    ? images.find((image) => image.url === activeImageSelection.url)
    : undefined;
  const activeImage = selectedImage ?? primaryImage;
  const safeImageIndex = Math.max(0, activeImage ? images.indexOf(activeImage) : 0);
  const inStock = Boolean(variant && available(variant));

  function selectColor(colorCode: string) {
    const candidates = product.variants.filter((item) => item.colorCode === colorCode);
    const next = candidates.find(available) ?? candidates[0];
    if (!next?.colorCode) return;
    setSelectedColor(next.colorCode);
    setSelectedSize(next.size);
    setQuantity(1);
  }

  function selectSize(size: string) {
    const next = product.variants.find((item) => (item.colorCode ?? '') === selectedColor && item.size === size);
    if (!next || !available(next)) return;
    setSelectedSize(next.size);
    setQuantity(1);
  }

  async function purchase(buyNow = false) {
    if (!variant || !inStock || quantity < 1 || quantity > variant.stockQuantity || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await commerceFetch('/api/v1/public/cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId: variant.variantId, quantity }),
      });
      if (!response.ok) {
        setNotice(await responseMessage(response));
        return;
      }
      notifyCartChanged();
      if (buyNow) router.push('/gio-hang');
      else setNotice('Đã thêm sản phẩm vào giỏ hàng.');
    } catch {
      setNotice('Chưa thể kết nối giỏ hàng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function shareProduct() {
    setShareNotice('');
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setShareNotice('Đã sao chép liên kết sản phẩm.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareNotice('Không thể chia sẻ liên kết trên thiết bị này.');
    }
  }

  const priceBlock = variant ? (
    <div className="detail-price-block" aria-label="Giá sản phẩm">
      <strong className={variant.hasDiscount ? 'detail-sale-price' : 'detail-regular-price'}>{formatMoney(variant.salePriceVnd)}</strong>
      {variant.hasDiscount && <del className="detail-original-price">{formatMoney(variant.originalPriceVnd)}</del>}
      {variant.hasDiscount && <span className="discount-pill">-{variant.discountPercent}%</span>}
    </div>
  ) : null;

  return (
    <>
      <div className="detail-layout">
        <section className="detail-gallery" aria-label="Ảnh sản phẩm">
          <div className="detail-thumbnails" role="group" aria-label="Chọn ảnh sản phẩm">
            {images.map((image, index) => (
              <button
                type="button"
                key={image.url + '-' + image.sortOrder}
                className={'detail-thumbnail' + (safeImageIndex === index ? ' is-selected' : '')}
                onClick={() => { if (variant) setActiveImageSelection({ variantId: variant.variantId, url: image.url }); setFailedImageUrl(''); }}
                aria-label={'Ảnh ' + (index + 1) + ' trên ' + images.length + ': ' + (image.altText || product.name)}
                aria-pressed={safeImageIndex === index}
              >
                <Image src={image.url} alt="" fill sizes="(max-width: 699px) 20vw, 72px" unoptimized loading="lazy" />
              </button>
            ))}
          </div>
          <div className="detail-main-media">
            {activeImage && failedImageUrl !== activeImage.url ? (
              <Image
                key={activeImage.url}
                src={activeImage.url}
                alt={activeImage.altText || product.name}
                fill
                sizes="(max-width: 699px) 100vw, (max-width: 1100px) 56vw, 690px"
                unoptimized
                preload
                onError={() => setFailedImageUrl(activeImage.url)}
              />
            ) : (
              <div className="detail-image-empty" role="img" aria-label="Ảnh sản phẩm đang được cập nhật">Ảnh sản phẩm đang được cập nhật</div>
            )}
            {images.length > 1 && (
              <>
                <button type="button" className="detail-gallery-arrow detail-gallery-previous" aria-label="Xem ảnh trước" onClick={() => { if (variant) setActiveImageSelection({ variantId: variant.variantId, url: images[(safeImageIndex - 1 + images.length) % images.length].url }); setFailedImageUrl(''); }}>‹</button>
                <button type="button" className="detail-gallery-arrow detail-gallery-next" aria-label="Xem ảnh tiếp theo" onClick={() => { if (variant) setActiveImageSelection({ variantId: variant.variantId, url: images[(safeImageIndex + 1) % images.length].url }); setFailedImageUrl(''); }}>›</button>
                <span className="detail-image-count" aria-live="polite">{safeImageIndex + 1}/{images.length}</span>
              </>
            )}
            <button type="button" className="detail-share" onClick={() => void shareProduct()} aria-label="Chia sẻ sản phẩm">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.2M8.7 13.4l6.6 4.2"/></svg>
            </button>
          </div>
          {shareNotice && <p className="detail-share-notice" role="status">{shareNotice}</p>}
        </section>

        <article className="detail-copy">
          <p className="eyebrow detail-category">{product.categoryName}</p>
          <div className="detail-product-heading">
            {priceBlock}
            <h1>{product.name}</h1>
          </div>
          {(product.isNew || product.isFeatured) && (
            <div className="detail-real-badges">
              {product.isNew && <span>Mẫu mới</span>}{product.isFeatured && <span>Nổi bật</span>}
            </div>
          )}

          {variant ? (
            <section className="detail-purchase" aria-label="Chọn phân loại và đặt mua">
              {colors.length > 0 && <div className="detail-option-section">
                <h2>Màu sắc <span>{variant.displayColor ?? variant.colorName}</span></h2>
                <div className="detail-color-options" role="group" aria-label="Chọn màu sắc">
                  {colors.map((color) => {
                    const colorVariant = product.variants.find((item) => item.colorCode === color.colorCode) ?? color;
                    const preview = orderedImages.find((image) => image.variantId === colorVariant.variantId);
                    const selected = selectedColor === color.colorCode;
                    return (
                      <button
                        type="button"
                        key={color.colorCode}
                        className={'detail-color-option' + (selected ? ' is-selected' : '')}
                        onClick={() => selectColor(color.colorCode)}
                        aria-label={color.displayColor ?? color.colorName}
                        aria-pressed={selected}
                      >
                        {preview ? <Image src={preview.url} alt="" width={64} height={64} unoptimized loading="lazy" /> : <span className="detail-color-swatch" style={color.colorHex ? { backgroundColor: color.colorHex } : undefined}>{!color.colorHex && (color.displayColor ?? color.colorName).slice(0, 1)}</span>}
                        <span className="detail-color-label">{color.displayColor ?? color.colorName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>}

              <div className="detail-option-section">
                <div className="detail-size-heading"><h2>Kích cỡ <span>{variant.size}</span></h2></div>
                <div className="detail-size-options" role="group" aria-label="Chọn kích cỡ">
                  {sizes.map((size) => {
                    const sizeVariant = product.variants.find((item) => (item.colorCode ?? '') === selectedColor && item.size === size);
                    const disabled = !sizeVariant || !available(sizeVariant);
                    return <button type="button" key={size} className={'detail-size-option' + (selectedSize === size ? ' is-selected' : '') + (disabled ? ' is-unavailable' : '')} disabled={disabled} onClick={() => selectSize(size)} aria-pressed={selectedSize === size}>{size}</button>;
                  })}
                </div>
              </div>

              <div className={'detail-stock' + (inStock ? '' : ' is-out-of-stock')} role="status">
                {inStock ? variant.stockQuantity + ' sản phẩm có sẵn' : 'Hết hàng'}
              </div>

              <div className="detail-quantity-row">
                <label htmlFor="product-quantity">Số lượng</label>
                <div className="detail-quantity-control">
                  <button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1 || busy} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                  <input id="product-quantity" type="number" inputMode="numeric" min={1} max={Math.max(1, variant.stockQuantity)} step={1} value={quantity} disabled={!inStock || busy} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) setQuantity(Math.min(Math.max(1, variant.stockQuantity), Math.max(1, Math.floor(next)))); }} />
                  <button type="button" aria-label="Tăng số lượng" disabled={!inStock || busy || quantity >= variant.stockQuantity} onClick={() => setQuantity((value) => Math.min(variant.stockQuantity, value + 1))}>+</button>
                </div>
                {inStock && <span className="detail-stock-hint">Tối đa {variant.stockQuantity}</span>}
              </div>

              <div className="detail-inline-actions">
                <button type="button" className="detail-add-button" disabled={!inStock || busy} onClick={() => void purchase()}>{busy ? 'Đang xử lý…' : 'Thêm vào giỏ'}</button>
                <button type="button" className="detail-buy-button" disabled={!inStock || busy} onClick={() => void purchase(true)}>{busy ? 'Đang xử lý…' : 'Mua ngay'}</button>
              </div>
              {notice && <p className="detail-purchase-notice" role="status">{notice}</p>}
              <div className="product-contact detail-contact">
                {contactPhone && <a href={'tel:' + contactPhone}>Gọi tư vấn: {contactPhone}</a>}
                {messengerUrl && <a href={messengerUrl} target="_blank" rel="noopener noreferrer">Nhắn Midora</a>}
              </div>
            </section>
          ) : <p className="empty-state" role="status">Sản phẩm chưa có biến thể để đặt mua.</p>}

          {product.description.trim() && (
            <section className="detail-information" aria-label="Thông tin sản phẩm">
              <details>
                <summary><span>Thông tin sản phẩm</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
                <p>{product.description}</p>
              </details>
            </section>
          )}
        </article>
      </div>

      {variant && (
        <div className="detail-sticky-purchase" aria-label="Thao tác mua sản phẩm">
          <div className="detail-sticky-price"><span>Giá bán</span><strong>{formatMoney(variant.salePriceVnd)}</strong></div>
          <button type="button" className="detail-add-button" disabled={!inStock || busy} onClick={() => void purchase()} aria-label="Thêm vào giỏ hàng">Thêm vào giỏ</button>
          <button type="button" className="detail-buy-button" disabled={!inStock || busy} onClick={() => void purchase(true)}>Mua ngay</button>
        </div>
      )}
    </>
  );
}
