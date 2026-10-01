import Image from 'next/image';
import Link from 'next/link';
import { getCategories, getProducts, formatVnd } from './catalog';
import CartHeader from '../components/CartHeader';

type IconName = 'menu' | 'search' | 'bag' | 'shirt' | 'dress' | 'pants' | 'skirt' | 'heart' | 'home' | 'grid' | 'user' | 'truck' | 'box' | 'shield' | 'arrow' | 'scan';
function Icon({ name, size = 24, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths: Record<IconName, React.ReactNode> = {
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>, search: <><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.2 4.2"/></>,
    bag: <><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    shirt: <path d="m8 4-5 3 2 4 3-1v10h12V10l3 1 2-4-5-3-3 2h-6L8 4Z" transform="translate(-2)"/>,
    dress: <path d="M9 4h6l-1 4 6 12H4l6-12-1-4ZM9 8h6M7 15h10"/>, pants: <path d="M6 3h12l-1 18h-5l-1-9-1 9H5L6 3Z"/>, skirt: <path d="M8 4h8l4 16H4L8 4Z"/>,
    heart: <path d="M20.8 8.9c0 5.1-8.8 10-8.8 10s-8.8-4.9-8.8-10a4.6 4.6 0 0 1 8.8-1.7 4.6 4.6 0 0 1 8.8 1.7Z"/>,
    home: <path d="m3 10 9-7 9 7v10h-6v-6H9v6H3V10Z"/>, grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>, truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="1.5"/><circle cx="18" cy="19" r="1.5"/></>,
    box: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>, shield: <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/>, arrow: <path d="M4 12h15M13 6l6 6-6 6"/>, scan: <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}
const iconByKey: Record<string, IconName> = { dress: 'dress', shirt: 'shirt', pants: 'pants', skirt: 'skirt', bag: 'bag' };

export default async function HomePage() {
  const [{ categories, available: categoriesAvailable }, { products, available: productsAvailable }] = await Promise.all([getCategories(), getProducts({ newOnly: 'true', limit: 4 })]);
  return <main className="site-shell">
    <header className="site-header">
      <span className="icon-button menu-button" aria-hidden="true"><Icon name="menu" size={26}/></span>
      <Link href="/" className="brand" aria-label="Tiệm Của Mây - trang chủ"><Image src="/brand/logo.jpg" alt="Tiệm Của Mây" width={160} height={110} priority/></Link>
      <div className="header-actions"><a href="#search" className="icon-button" aria-label="Tìm kiếm"><Icon name="search" size={25}/></a><CartHeader/></div>
    </header>

    <section className="hero" id="home" aria-label="Chào mừng đến Tiệm Của Mây">
      <Image src="/demo/hero-model.png" alt="Ảnh minh họa người mẫu trong sắc xanh dịu" fill priority sizes="(max-width: 699px) 60vw, 55vw" className="hero-image"/>
      <div className="hero-copy"><span className="eyebrow">XIN CHÀO ♡</span><h1>Chào bạn đến<br/>với Tiệm Của Mây</h1><p>Những bộ đồ xinh xắn<br/>cho ngày yêu đời hơn</p><a href="#new-arrivals" className="primary-button">Khám phá ngay <Icon name="arrow" size={20}/></a></div>
      <div className="hero-sparkle sparkle-one">✧</div><div className="hero-sparkle sparkle-two">♡</div><div className="carousel-dots" aria-label="Trang 1 trên 3"><i className="active"/><i/><i/></div>
    </section>

    <form className="searchbar" id="search" action="/products" method="get" role="search">
      <Icon name="search" size={23}/><input name="q" aria-label="Tìm sản phẩm" placeholder="Tìm kiếm sản phẩm, váy, áo, quần..."/><button aria-label="Tìm bằng hình ảnh (sắp ra mắt)" type="button" disabled><Icon name="scan" size={22}/></button>
    </form>

    <nav className="category-list" aria-label="Danh mục sản phẩm">
      <Link className="category" href="/products"><span className="category-icon"><Icon name="shirt" size={27}/></span><span>Tất cả</span></Link>
      {categories.slice(0, 5).map((category) => <Link className="category" href={`/products?category=${encodeURIComponent(category.slug)}`} key={category.slug}><span className="category-icon"><Icon name={iconByKey[category.iconKey ?? ''] ?? 'shirt'} size={27}/></span><span>{category.name}</span></Link>)}
    </nav>

    <section className="products-section" id="new-arrivals">
      <div className="section-heading"><h2>Mới về <span>♡</span></h2><Link href="/products">Xem tất cả <Icon name="arrow" size={18}/></Link></div>
      {!categoriesAvailable && <p className="demo-note">Danh mục sẽ hiện khi kết nối được catalog.</p>}
      {!productsAvailable && <p className="demo-note">Sản phẩm sẽ hiện khi kết nối được catalog.</p>}
      {productsAvailable && <p className="demo-note">{process.env.NEXT_PUBLIC_CATALOG_DEMO_MODE === 'true' ? 'Dữ liệu catalog thử nghiệm' : 'Sản phẩm từ catalog hiện tại'}</p>}
      <div className="product-grid">{products.map((product, index) => <article className="product-card" key={product.slug}>
        <Link href={`/products/${product.slug}`} className={`product-photo product-photo-${(index % 4) + 1}`} aria-label={`Xem ${product.name}`}>
          {product.image && <Image src={product.image} alt={product.name} fill sizes="(max-width: 699px) 50vw, 25vw" unoptimized/>}<span className="badge">MỚI</span>
        </Link>
        <span className="favorite" aria-label="Yêu thích chưa hỗ trợ"><Icon name="heart" size={19}/></span>
        <div className="product-details"><Link href={`/products/${product.slug}`} className="product-name">{product.name}</Link><div className="price-row"><strong>{product.hasDiscount ? <><del>{formatVnd(product.originalPriceVnd ?? product.priceVnd)}</del> <span className="sale-price">{formatVnd(product.salePriceVnd ?? product.priceVnd)}</span></> : formatVnd(product.priceVnd)}</strong>{product.hasDiscount && <span className="discount-pill">-{product.discountPercent}%</span>}<div className="swatches" aria-label="Màu sắc">{(product.colors ?? []).filter((tone) => /^#[0-9a-f]{6}$/i.test(tone)).slice(0, 4).map((tone) => <i key={tone} style={{ backgroundColor: tone }}/>)}</div></div></div>
      </article>)}</div>
      {productsAvailable && products.length === 0 && <p className="empty-state">Chưa có sản phẩm mới trong catalog.</p>}
      {!productsAvailable && <p className="empty-state">Chưa tải được catalog. Vui lòng thử lại sau.</p>}
    </section>

    <section className="freeship-banner"><div className="truck-emblem"><Icon name="truck" size={45}/></div><div className="offer-copy"><span>THÔNG TIN THAM KHẢO</span><strong>TIỆM CỦA MÂY</strong><p>Chính sách cập nhật sau</p></div><div className="banner-note">Mặc xinh<br/>mỗi ngày<br/>cùng Tiệm Của Mây ♡</div><span className="banner-cloud cloud-left"/><span className="banner-cloud cloud-right"/></section>

    <section className="benefits" aria-label="Thông tin mua sắm"><article><span><Icon name="truck" size={27}/></span><p><b>Giao hàng</b><br/>Thông tin cập nhật sau</p></article><article><span><Icon name="box" size={27}/></span><p><b>Thông tin cửa hàng</b><br/>Chính sách cập nhật sau</p></article><article><span><Icon name="shield" size={27}/></span><p><b>Hỗ trợ mua hàng</b><br/>Thông tin cập nhật sau</p></article></section>
    <footer className="site-footer"><Link href="/" className="footer-brand"><Image src="/brand/logo.jpg" alt="Tiệm Của Mây" width={160} height={110}/></Link><p>Mặc xinh như mây, vui cả ngày.</p><nav><span>Về Tiệm</span><span>Liên hệ</span><span>Chính sách</span></nav></footer>
    <nav className="bottom-nav" aria-label="Điều hướng chính"><Link className="active" href="/"><Icon name="home" size={23} filled/><span>Trang chủ</span></Link><Link href="/products"><Icon name="grid" size={23}/><span>Danh mục</span></Link><span aria-disabled="true" title="Yêu thích chưa hỗ trợ"><Icon name="heart" size={24}/><span>Yêu thích</span></span><span aria-disabled="true" title="Tài khoản chưa hỗ trợ"><Icon name="user" size={23}/><span>Tài khoản</span></span></nav>
  </main>;
}
