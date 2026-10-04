import AdminNav from '../AdminNav';
import BrandLink from '../../components/BrandLink';
import AdminCatalog from './AdminCatalog';
export const dynamic = 'force-dynamic';
export default function AdminProductsPage() { return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><BrandLink/><AdminNav/></header><AdminCatalog/></main>; }
