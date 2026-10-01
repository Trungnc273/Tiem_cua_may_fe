'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { commerceFetch } from '../../lib/commerce';
export default function AdminNav() { const router = useRouter(); async function logout() { await commerceFetch('/api/v1/admin/auth/logout', { method: 'POST' }); router.replace('/admin/login'); } return <nav className="admin-nav"><Link href="/admin/orders">Đơn hàng</Link><Link href="/admin/products">Sản phẩm & cài đặt</Link><button onClick={() => void logout()}>Đăng xuất</button></nav>; }
