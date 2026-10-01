'use client';
import Image from 'next/image';
import { useState } from 'react';
import VariantChooser from './VariantChooser';
type Variant = { variantId: string; size: string; colorCode: string; colorName: string; displayColor: string | null; colorHex: string | null; originalPriceVnd: number; salePriceVnd: number; discountPercent: number; hasDiscount: boolean; stockQuantity: number; priceVnd: number; availability: 'IN_STOCK' | 'OUT_OF_STOCK' };
type Product = { name: string; description: string; categoryName: string; images: { url: string; altText: string; sortOrder: number; isPrimary: boolean; variantId?: string | null }[]; variants: Variant[] };
export default function ProductDetailClient({ product, contactPhone, messengerUrl }: { product: Product; contactPhone: string; messengerUrl: string }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.variantId ?? '');
  const linked = product.images.filter((image) => image.variantId === variantId);
  const general = product.images.filter((image) => !image.variantId);
  const images = linked.length ? [...linked, ...general] : general.length ? general : product.images;
  return <div className="detail-layout"><div className="detail-gallery">{images.map((image) => <figure key={`${image.url}-${image.sortOrder}`}><Image src={image.url} alt={image.altText} width={700} height={700} priority={image.isPrimary} unoptimized/></figure>)}</div><article className="detail-copy"><p className="eyebrow">{product.categoryName}</p><h1>{product.name}</h1><p className="detail-description">{product.description}</p><VariantChooser variants={product.variants} contactPhone={contactPhone} messengerUrl={messengerUrl} onVariantChange={setVariantId}/></article></div>;
}
