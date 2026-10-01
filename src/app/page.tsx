"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type IconName = "menu" | "search" | "bag" | "shirt" | "dress" | "pants" | "skirt" | "heart" | "home" | "grid" | "user" | "truck" | "box" | "shield" | "arrow" | "scan";

function Icon({ name, size = 24, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: filled ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<IconName, React.ReactNode> = {
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>, search: <><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.2 4.2"/></>,
    bag: <><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    shirt: <><path d="m8 4-5 3 2 4 3-1v10h12V10l3 1 2-4-5-3-3 2h-6L8 4Z" transform="translate(-2)"/></>,
    dress: <><path d="M9 4h6l-1 4 6 12H4l6-12-1-4ZM9 8h6M7 15h10"/></>,
    pants: <><path d="M6 3h12l-1 18h-5l-1-9-1 9H5L6 3Z"/><path d="M6 7h12"/></>,
    skirt: <><path d="M8 4h8l4 16H4L8 4Z"/><path d="M7 8h10"/></>,
    heart: <><path d="M20.8 8.9c0 5.1-8.8 10-8.8 10s-8.8-4.9-8.8-10a4.6 4.6 0 0 1 8.8-1.7 4.6 4.6 0 0 1 8.8 1.7Z"/></>,
    home: <><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3V10Z"/></>, grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="1.5"/><circle cx="18" cy="19" r="1.5"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></>,
    arrow: <><path d="M4 12h15M13 6l6 6-6 6"/></>, scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/></>
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const categories: { name: string; icon: IconName }[] = [
  { name: "Tất cả", icon: "shirt" }, { name: "Váy đầm", icon: "dress" }, { name: "Áo", icon: "shirt" },
  { name: "Quần", icon: "pants" }, { name: "Chân váy", icon: "skirt" }, { name: "Phụ kiện", icon: "bag" },
];
const products = [
  { name: "Áo blouse nơ tay phồng", price: "259.000đ", badge: "DEMO", tones: ["#ffffff", "#a9d0eb", "#f3ced0", "#bbb"] },
  { name: "Chân váy tầng bồng bềnh", price: "239.000đ", badge: "DEMO", tones: ["#efe4d1", "#f2c9cc", "#343434"] },
  { name: "Áo khoác cardigan basic", price: "299.000đ", badge: "DEMO", tones: ["#a8cee9", "#f2e7d5", "#f1c9c9", "#bbb"] },
  { name: "Váy hoa nhí hai dây", price: "269.000đ", badge: "DEMO", tones: ["#a6c9e8", "#f0e2cf", "#f1c9cd"] },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const shownProducts = useMemo(() => products.filter((item) => item.name.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))), [query]);
  const toggleFavorite = (index: number) => setFavorites((current) => current.includes(index) ? current.filter((i) => i !== index) : [...current, index]);

  const photos = ["product-blouse.png", "product-skirt.png", "product-cardigan.png", "product-floral-dress.png"];

  return <main className="site-shell">
    <header className="site-header">
      <button className="icon-button menu-button" aria-label="Mở danh mục"><Icon name="menu" size={26}/></button>
      <a href="#home" className="brand" aria-label="Tiệm Của Mây - trang chủ"><Image src="/brand/logo.jpg" alt="Tiệm Của Mây" width={160} height={110} priority/></a>
      <div className="header-actions"><a href="#search" className="icon-button" aria-label="Tìm kiếm"><Icon name="search" size={25}/></a><a href="#cart" className="icon-button cart-button" aria-label="Giỏ hàng"><Icon name="bag" size={24}/></a></div>
    </header>

    <section className="hero" id="home" aria-label="Chào mừng đến Tiệm Của Mây">
      <Image src="/demo/hero-model.png" alt="Người mẫu diện áo len xanh nhạt trong khung cảnh mây xanh" fill priority sizes="(max-width: 699px) 60vw, 55vw" className="hero-image"/>
      <div className="hero-copy"><span className="eyebrow">XIN CHÀO ♡</span><h1>Chào bạn đến<br/>với Tiệm Của Mây</h1><p>Những bộ đồ xinh xắn<br/>cho ngày yêu đời hơn</p><a href="#new-arrivals" className="primary-button">Khám phá ngay <Icon name="arrow" size={20}/></a></div>
      <div className="hero-sparkle sparkle-one">✧</div><div className="hero-sparkle sparkle-two">♡</div>
      <div className="carousel-dots" aria-label="Trang 1 trên 3"><i className="active"/><i/><i/></div>
    </section>

    <form className="searchbar" id="search" onSubmit={(event) => event.preventDefault()} role="search">
      <Icon name="search" size={23}/><input aria-label="Tìm sản phẩm" placeholder="Tìm kiếm sản phẩm, váy, áo, quần..." value={query} onChange={(event) => setQuery(event.target.value)}/><button aria-label="Tìm bằng hình ảnh" type="button"><Icon name="scan" size={22}/></button>
    </form>

    <nav className="category-list" aria-label="Danh mục sản phẩm">{categories.map((category) => <button className={`category ${selectedCategory === category.name ? "selected" : ""}`} key={category.name} onClick={() => setSelectedCategory(category.name)}><span className="category-icon"><Icon name={category.icon} size={27}/></span><span>{category.name}</span></button>)}</nav>

    <section className="products-section" id="new-arrivals">
      <div className="section-heading"><h2>Mới về <span>♡</span></h2><a href="#catalog">Xem tất cả <Icon name="arrow" size={18}/></a></div>
      <p className="demo-note">Sản phẩm demo · hình ảnh minh họa</p>
      <div className="product-grid">{shownProducts.map((product) => { const index = products.indexOf(product); return <article className="product-card" key={product.name}>
        <a href="#product" className={`product-photo product-photo-${index + 1}`} aria-label={`Xem ${product.name}`}><Image src={`/demo/${photos[index]}`} alt={`Ảnh minh họa ${product.name}`} fill sizes="(max-width: 699px) 50vw, 25vw"/><span className={`badge ${index > 1 ? "badge-pink" : ""}`}>{product.badge}</span></a>
        <button className={`favorite ${favorites.includes(index) ? "is-favorite" : ""}`} aria-label={favorites.includes(index) ? "Bỏ yêu thích" : "Thêm vào yêu thích"} aria-pressed={favorites.includes(index)} onClick={() => toggleFavorite(index)}><Icon name="heart" size={19} filled={favorites.includes(index)}/></button>
        <div className="product-details"><a href="#product" className="product-name">{product.name}</a><div className="price-row"><strong>{product.price}</strong><div className="swatches" aria-label="Màu sắc">{product.tones.map((tone, i) => <i key={`${tone}-${i}`} style={{ backgroundColor: tone }} />)}</div></div></div>
      </article>})}</div>
      {shownProducts.length === 0 && <p className="empty-state">Chưa tìm thấy sản phẩm phù hợp. Mây thử từ khóa khác nhé!</p>}
    </section>

    <section className="freeship-banner"><div className="truck-emblem"><Icon name="truck" size={45}/></div><div className="offer-copy"><span>ƯU ĐÃI MINH HỌA</span><strong>FREESHIP</strong><p>Chính sách dự kiến được cập nhật</p></div><div className="banner-note">Mặc xinh<br/>mỗi ngày<br/>cùng Tiệm Của Mây ♡</div><span className="banner-cloud cloud-left"/><span className="banner-cloud cloud-right"/></section>

    <section className="benefits" aria-label="Thông tin mua sắm"><article><span><Icon name="truck" size={27}/></span><p><b>Giao hàng</b><br/>Thông tin cập nhật sau</p></article><article><span><Icon name="box" size={27}/></span><p><b>Đổi trả</b><br/>Chính sách cập nhật sau</p></article><article><span><Icon name="shield" size={27}/></span><p><b>Hỗ trợ mua hàng</b><br/>Thông tin cập nhật sau</p></article></section>

    <footer className="site-footer"><a href="#home" className="footer-brand"><Image src="/brand/logo.jpg" alt="Tiệm Của Mây" width={160} height={110}/></a><p>Mặc xinh như mây, vui cả ngày.</p><nav><a href="#about">Về Tiệm</a><a href="#contact">Liên hệ</a><a href="#policy">Chính sách</a></nav></footer>

    <nav className="bottom-nav" aria-label="Điều hướng chính"><a className="active" href="#home"><Icon name="home" size={23} filled/><span>Trang chủ</span></a><a href="#categories"><Icon name="grid" size={23}/><span>Danh mục</span></a><a href="#favorites"><Icon name="heart" size={24}/><span>Yêu thích</span></a><a href="#account"><Icon name="user" size={23}/><span>Tài khoản</span></a></nav>
  </main>;
}
