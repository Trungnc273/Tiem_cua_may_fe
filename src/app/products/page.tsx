import Image from 'next/image';
import Link from 'next/link';
import { getCategories, getProducts, formatVnd } from '../catalog';

type Search = { q?: string; category?: string; sort?: string; page?: string };
export default async function ProductListing({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const sort = ['newest', 'price_asc', 'price_desc', 'name'].includes(params.sort ?? '') ? params.sort! : 'newest';
  const [{ products, pagination, available }, { categories }] = await Promise.all([
    getProducts({ q: params.q?.slice(0, 80), category: params.category, sort, page: Math.max(1, Number(params.page) || 1), limit: 20 }), getCategories(),
  ]);
  return <main className="site-shell catalog-shell">
    <header className="catalog-header"><Link href="/" className="catalog-back">← Tiệm Của Mây</Link><span>Danh mục sản phẩm</span></header>
    <section className="catalog-intro"><p className="eyebrow">KHÁM PHÁ CATALOG</p><h1>Sản phẩm</h1><p>Sản phẩm đang có trong danh mục hiện tại.</p></section>
    <form className="catalog-toolbar" action="/products" method="get">
      <label>Tìm kiếm<input name="q" maxLength={80} defaultValue={params.q} placeholder="Tên sản phẩm hoặc mã SKU"/></label>
      <label>Danh mục<select name="category" defaultValue={params.category ?? ''}><option value="">Tất cả danh mục</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
      <label>Sắp xếp<select name="sort" defaultValue={sort}><option value="newest">Mới nhất</option><option value="price_asc">Giá thấp đến cao</option><option value="price_desc">Giá cao đến thấp</option><option value="name">Tên A–Z</option></select></label>
      <button className="catalog-submit">Lọc sản phẩm</button>
    </form>
    <p className="catalog-count">{available ? `${pagination.total} sản phẩm` : 'Catalog đang tạm thời không kết nối được'}</p>
    {available && products.length > 0 ? <div className="product-grid catalog-grid">{products.map((product) => <article className="product-card" key={product.slug}>
      <Link href={`/products/${product.slug}`} className="product-photo">{product.image && <Image src={product.image} alt={product.name} fill sizes="(max-width: 699px) 50vw, 25vw" unoptimized/>}{product.isNew && <span className="badge">MỚI</span>}</Link>
      <span className="favorite" aria-label="Yêu thích chưa hỗ trợ">♡</span><div className="product-details"><Link href={`/products/${product.slug}`} className="product-name">{product.name}</Link><div className="price-row"><strong>{formatVnd(product.priceVnd)}</strong></div></div>
    </article>)}</div> : <p className="empty-state">{available ? 'Không tìm thấy sản phẩm phù hợp.' : 'Vui lòng thử lại sau.'}</p>}
    {pagination.pages > 1 && <nav className="pagination" aria-label="Phân trang">{pagination.page > 1 && <Link href={listingHref(params, pagination.page - 1)}>Trước</Link>}<span>Trang {pagination.page} / {pagination.pages}</span>{pagination.page < pagination.pages && <Link href={listingHref(params, pagination.page + 1)}>Sau</Link>}</nav>}
    <nav className="catalog-bottom"><Link href="/">Trang chủ</Link><Link href="/products">Danh mục</Link></nav>
  </main>;
}
function listingHref(params: Search, page: number) { const query = new URLSearchParams(); for (const key of ['q', 'category', 'sort'] as const) if (params[key]) query.set(key, params[key]!); query.set('page', String(page)); return `/products?${query}`; }
