import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CartHeader from '../../../components/CartHeader';
import BrandLink from '../../components/BrandLink';
import { getProduct, getStoreSettings } from '../../catalog';
import ProductDetailClient from './ProductDetailClient';

const metadataBase = new URL('https://midora.pro.vn');

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Không tìm thấy sản phẩm', metadataBase };

  const description = product.description.trim().slice(0, 180) || `Khám phá ${product.name} tại Midora.`;
  const image = product.images.find((item) => item.isPrimary)?.url ?? product.images[0]?.url;
  return {
    title: product.name,
    description,
    metadataBase,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      siteName: 'Midora',
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
  };
}

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getStoreSettings()]);
  if (!product) notFound();

  return (
    <main className="site-shell catalog-shell detail-shell">
      <header className="catalog-header detail-header">
        <Link href="/products" className="catalog-back" aria-label="Quay lại danh sách sản phẩm">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7M8 12h12" /></svg>
          <span>Sản phẩm</span>
        </Link>
        <BrandLink />
        <CartHeader />
      </header>
      <ProductDetailClient product={product} contactPhone={settings.contactPhone} messengerUrl={settings.messengerUrl} />
      <nav className="catalog-bottom detail-footer" aria-label="Điều hướng cuối trang">
        <Link href="/">Trang chủ</Link><Link href="/products">Danh mục</Link>
      </nav>
    </main>
  );
}
