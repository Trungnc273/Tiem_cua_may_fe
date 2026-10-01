import AdminNav from '../AdminNav';
import AdminStoreSettings from './AdminStoreSettings';
export const dynamic = 'force-dynamic';
export default function AdminSettingsPage(){return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><strong>Tiệm Của Mây · Quản trị</strong><AdminNav/></header><AdminStoreSettings/></main>;}
