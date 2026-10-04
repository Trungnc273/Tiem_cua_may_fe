import AdminLoginClient from './AdminLoginClient';
import BrandLink from '../../components/BrandLink';
export const dynamic = 'force-dynamic';
export default function AdminLoginPage() { return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><BrandLink/><span>Quản trị</span></header><AdminLoginClient/></main>; }
