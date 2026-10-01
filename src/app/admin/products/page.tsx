import AdminNav from '../AdminNav';
import AdminCatalog from './AdminCatalog';
export const dynamic = 'force-dynamic';
export default function AdminProductsPage() { return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><strong>Tiệm Của Mây · Quản trị</strong><AdminNav/></header><AdminCatalog/></main>; }
