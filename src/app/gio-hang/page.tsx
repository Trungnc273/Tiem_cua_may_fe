import Link from 'next/link';
import CartClient from './CartClient';

export default function CartPage() {
  return <main className="site-shell commerce-shell"><header className="commerce-header"><Link href="/products">← Tiếp tục xem sản phẩm</Link><Link href="/" aria-label="Trang chủ">Tiệm Của Mây</Link></header><CartClient/></main>;
}
