import AdminNav from '../AdminNav';
import AdminProductsSettings from './AdminProductsSettings';
export const dynamic = 'force-dynamic';
export default function AdminProductsPage() { return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><strong>Tiệm Của Mây · Quản trị</strong><AdminNav/></header><AdminProductsSettings/></main>; }
