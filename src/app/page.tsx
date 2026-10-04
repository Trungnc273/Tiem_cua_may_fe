import Image from 'next/image';
import Link from 'next/link';
import { getCategories, getProducts, getStoreSettings, formatVnd } from './catalog';
import CartHeader from '../components/CartHeader';
import BrandLink from './components/BrandLink';

type IconName = 'menu' | 'search' | 'bag' | 'shirt' | 'dress' | 'pants' | 'skirt' | 'home' | 'grid' | 'truck' | 'box' | 'shield' | 'arrow';
function Icon({ name, size = 24, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths: Record<IconName, React.ReactNode> = {
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>, search: <><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.2 4.2"/></>,
    bag: <><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    shirt: <path d="m8 4-5 3 2 4 3-1v10h12V10l3 1 2-4-5-3-3 2h-6L8 4Z" transform="translate(-2)"/>,
    dress: <path d="M9 4h6l-1 4 6 12H4l6-12-1-4ZM9 8h6M7 15h10"/>, pants: <path d="M6 3h12l-1 18h-5l-1-9-1 9H5L6 3Z"/>, skirt: <path d="M8 4h8l4 16H4L8 4Z"/>,
    home: <path d="m3 10 9-7 9 7v10h-6v-6H9v6H3V10Z"/>, grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="1.5"/><circle cx="18" cy="19" r="1.5"/></>,
    box: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>, shield: <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/>, arrow: <path d="M4 12h15M13 6l6 6-6 6"/>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}
const iconByKey: Record<string, IconName> = { dress: 'dress', shirt: 'shirt', pants: 'pants', skirt: 'skirt', accessory: 'bag' };

export default async function HomePage() {
  const [{ categories, available: categoriesAvailable }, { products, available: productsAvailable }, store] = await Promise.all([getCategories(), getProducts({ newOnly: 'true', limit: 4 }), getStoreSettings()]);
  return <main className="site-shell">
    <header className="site-header">
      <details className="menu-button"><summary className="icon-button" aria-label="Mở điều hướng"><Icon name="menu" size={26}/></summary><nav className="mobile-menu-panel" aria-label="Điều hướng"><Link href="/">Trang chủ</Link><Link href="/products">Danh mục sản phẩm</Link><Link href="/gio-hang">Giỏ hàng</Link></nav></details>
      <BrandLink className="brand" />
      <div className="header-actions"><a href="#search" className="icon-button" aria-label="Tìm kiếm"><Icon name="search" size={25}/></a><CartHeader/></div>
    </header>

    <section className="hero" id="home" aria-label="Chào mừng đến Midora">
      <Image src="/demo/hero-model.png" alt="Ảnh minh họa người mẫu trong sắc xanh dịu" fill priority sizes="(max-width: 699px) 60vw, 55vw" className="hero-image"/>
      <div className="hero-copy"><span className="eyebrow">XIN CHÀO</span><h1>Chào bạn đến<br/>với Midora</h1><p>Những bộ đồ xinh xắn<br/>cho ngày yêu đời hơn</p><a href="#new-arrivals" className="primary-button">Khám phá ngay <Icon name="arrow" size={20}/></a></div>
      <div className="hero-sparkle sparkle-one">✧</div><div className="hero-sparkle sparkle-two">☁</div>
    </section>

    <form className="searchbar" id="search" action="/products" method="get" role="search">
      <Icon name="search" size={23}/><input name="q" aria-label="Tìm sản phẩm" placeholder="Tìm kiếm sản phẩm, váy, áo, quần..."/>
    </form>

    <nav className="category-list" aria-label="Danh mục sản phẩm">
      <Link className="category" href="/products"><span className="category-icon"><Icon name="shirt" size={27}/></span><span>Tất cả</span></Link>
      {categories.slice(0, 5).map((category) => <Link className="category" href={`/products?category=${encodeURIComponent(category.slug)}`} key={category.slug}><span className="category-icon"><Icon name={iconByKey[category.iconKey ?? ''] ?? 'shirt'} size={27}/></span><span>{category.name}</span></Link>)}
    </nav>

    <section className="products-section" id="new-arrivals">
      <div className="section-heading"><h2>Mới về</h2><Link href="/products">Xem tất cả <Icon name="arrow" size={18}/></Link></div>
      {!categoriesAvailable && <p className="demo-note">Danh mục sẽ hiện khi kết nối được catalog.</p>}
      {!productsAvailable && <p className="demo-note">Sản phẩm sẽ hiện khi kết nối được catalog.</p>}
      {productsAvailable && <p className="demo-note">{process.env.NEXT_PUBLIC_CATALOG_DEMO_MODE === 'true' ? 'Dữ liệu catalog thử nghiệm' : 'Sản phẩm từ catalog hiện tại'}</p>}
      <div className="product-grid">{products.map((product, index) => <article className="product-card" key={product.slug}>
        <Link href={`/products/${product.slug}`} className={`product-photo product-photo-${(index % 4) + 1}`} aria-label={`Xem ${product.name}`}>
          {product.image && <Image src={product.image} alt={product.name} fill sizes="(max-width: 699px) 50vw, 25vw" unoptimized/>}<span className="badge">MỚI</span>
        </Link>
        <div className="product-details"><Link href={`/products/${product.slug}`} className="product-name">{product.name}</Link><div className="price-row"><strong>{product.hasDiscount ? <><del>{formatVnd(product.originalPriceVnd ?? product.priceVnd)}</del> <span className="sale-price">{formatVnd(product.salePriceVnd ?? product.priceVnd)}</span></> : formatVnd(product.priceVnd)}</strong>{product.hasDiscount && <span className="discount-pill">-{product.discountPercent}%</span>}<div className="swatches" aria-label="Màu sắc">{(product.colors ?? []).filter((tone) => /^#[0-9a-f]{6}$/i.test(tone)).slice(0, 4).map((tone) => <i key={tone} style={{ backgroundColor: tone }}/>)}</div></div></div>
      </article>)}</div>
      {productsAvailable && products.length === 0 && <p className="empty-state">Chưa có sản phẩm mới trong catalog.</p>}
      {!productsAvailable && <p className="empty-state">Chưa tải được catalog. Vui lòng thử lại sau.</p>}
    </section>

    <section className="freeship-banner"><div className="truck-emblem"><Icon name="truck" size={45}/></div><div className="offer-copy"><span>THÔNG TIN GIAO HÀNG</span><strong>MIDORA</strong><p>Phí chính thức được xác nhận khi Midora liên hệ</p></div><div className="banner-note">Mặc xinh<br/>mỗi ngày<br/>cùng Midora</div><span className="banner-cloud cloud-left"/><span className="banner-cloud cloud-right"/></section>

    <section className="benefits" aria-label="Thông tin mua sắm"><article><span><Icon name="truck" size={27}/></span><p><b>Giao hàng</b><br/>Midora xác nhận phí chính thức</p></article><article><span><Icon name="box" size={27}/></span><p><b>Đặt hàng</b><br/>Nhân viên liên hệ xác nhận đơn</p></article><article><span><Icon name="shield" size={27}/></span><p><b>Hỗ trợ mua hàng</b><br/>{store.contactPhone&&<a href={`tel:${store.contactPhone}`}>Gọi Midora</a>}{store.contactPhone&&store.messengerUrl?' · ':''}{store.messengerUrl&&<a href={store.messengerUrl} target="_blank" rel="noopener noreferrer">Nhắn Midora</a>}</p></article></section>
    <footer className="site-footer"><BrandLink className="footer-brand"/><p>Mặc xinh như mây, vui cả ngày.</p><nav aria-label="Liên hệ">{store.contactPhone&&<a href={`tel:${store.contactPhone}`}>Gọi Midora</a>}{store.messengerUrl&&<a href={store.messengerUrl} target="_blank" rel="noopener noreferrer">Nhắn Midora</a>}</nav></footer>
    <nav className="bottom-nav" aria-label="Điều hướng chính"><Link className="active" href="/"><Icon name="home" size={23} filled/><span>Trang chủ</span></Link><Link href="/products"><Icon name="grid" size={23}/><span>Danh mục</span></Link></nav>
  </main>;
}
