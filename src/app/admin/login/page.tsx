import Link from 'next/link';
import AdminLoginClient from './AdminLoginClient';
export const dynamic = 'force-dynamic';
export default function AdminLoginPage() { return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><Link href="/">Tiệm Của Mây</Link><span>Quản trị</span></header><AdminLoginClient/></main>; }
