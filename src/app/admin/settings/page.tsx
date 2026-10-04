import AdminNav from '../AdminNav';
import BrandLink from '../../components/BrandLink';
import AdminStoreSettings from './AdminStoreSettings';
export const dynamic = 'force-dynamic';
export default function AdminSettingsPage(){return <main className="site-shell commerce-shell admin-shell"><header className="commerce-header"><BrandLink/><AdminNav/></header><AdminStoreSettings/></main>;}
