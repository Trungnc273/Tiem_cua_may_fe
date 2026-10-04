import Link from 'next/link';
import CartClient from './CartClient';
import BrandLink from '../components/BrandLink';

export default function CartPage() {
  return <main className="site-shell commerce-shell"><header className="commerce-header"><Link href="/products">← Tiếp tục xem sản phẩm</Link><BrandLink/></header><CartClient/></main>;
}
