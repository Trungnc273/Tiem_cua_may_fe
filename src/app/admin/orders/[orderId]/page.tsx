import AdminOrderDetail from './AdminOrderDetail';
import AdminNav from '../../AdminNav';
import BrandLink from '../../../components/BrandLink';
export const dynamic = 'force-dynamic';
export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) { const { orderId } = await params; return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><BrandLink/><AdminNav/></header><AdminOrderDetail orderId={orderId}/></main>; }
