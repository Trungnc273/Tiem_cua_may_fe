import AdminOrderDetail from './AdminOrderDetail';
import AdminNav from '../../AdminNav';
export const dynamic = 'force-dynamic';
export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) { const { orderId } = await params; return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><strong>Tiệm Của Mây · Quản trị</strong><AdminNav/></header><AdminOrderDetail orderId={orderId}/></main>; }
