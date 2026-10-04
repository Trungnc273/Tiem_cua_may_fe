import AdminOrders from './AdminOrders';
import AdminNav from '../AdminNav';
import BrandLink from '../../components/BrandLink';
export const dynamic = 'force-dynamic';
export default function AdminOrdersPage() { return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><BrandLink/><AdminNav/></header><AdminOrders/></main>; }
