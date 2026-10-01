import AdminOrders from './AdminOrders';
import AdminNav from '../AdminNav';
export const dynamic = 'force-dynamic';
export default function AdminOrdersPage() { return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><strong>Tiệm Của Mây · Quản trị</strong><AdminNav/></header><AdminOrders/></main>; }
