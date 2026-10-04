import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, getStoreSettings } from '../../catalog';
import ProductDetailClient from './ProductDetailClient';
import CartHeader from '../../../components/CartHeader';
import BrandLink from '../../components/BrandLink';
export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const [product, settings] = await Promise.all([getProduct(slug), getStoreSettings()]); if (!product) notFound();
  return <main className="site-shell catalog-shell detail-shell"><header className="catalog-header"><Link href="/products" className="catalog-back">← Sản phẩm</Link><BrandLink/><CartHeader/></header><ProductDetailClient product={product} contactPhone={settings.contactPhone} messengerUrl={settings.messengerUrl}/><p className="catalog-count">{product.isNew ? 'Mẫu mới' : ''}{product.isFeatured ? ' · Nổi bật' : ''}</p><nav className="catalog-bottom"><Link href="/">Trang chủ</Link><Link href="/products">Danh mục</Link></nav></main>;
}
