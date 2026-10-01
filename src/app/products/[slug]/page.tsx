import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, getStoreSettings } from '../../catalog';
import VariantChooser from './VariantChooser';
import CartHeader from '../../../components/CartHeader';

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getStoreSettings()]);
  if (!product) notFound();
  return <main className="site-shell catalog-shell detail-shell">
    <header className="catalog-header"><Link href="/products" className="catalog-back">← Sản phẩm</Link><Link href="/" aria-label="Trang chủ">Tiệm Của Mây</Link><CartHeader/></header>
    <div className="detail-layout">
      <div className="detail-gallery">{product.images.map((image) => <figure key={`${image.url}-${image.sortOrder}`}><Image src={image.url} alt={image.altText} width={700} height={700} priority={image.isPrimary} unoptimized/></figure>)}</div>
      <article className="detail-copy"><p className="eyebrow">{product.categoryName}</p><h1>{product.name}</h1><p className="detail-description">{product.description}</p><VariantChooser variants={product.variants} contactPhone={settings.contactPhone} messengerUrl={settings.messengerUrl}/></article>
    </div>
    <p className="catalog-count">{product.isNew ? 'Mẫu mới' : ''}{product.isFeatured ? ' · Nổi bật' : ''}</p>
    <nav className="catalog-bottom"><Link href="/">Trang chủ</Link><Link href="/products">Danh mục</Link></nav>
  </main>;
}
