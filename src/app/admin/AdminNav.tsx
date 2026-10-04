'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { commerceFetch, responseMessage } from '../../lib/commerce';
export default function AdminNav() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await commerceFetch('/api/v1/admin/auth/logout', { method: 'POST' });
      if (!response.ok && response.status !== 401) { setError(await responseMessage(response)); return; }
      router.replace('/admin/login');
    } catch { setError('Không thể kết nối để đăng xuất. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <><nav className="admin-nav"><Link href="/admin/orders">Đơn hàng</Link><Link href="/admin/products">Sản phẩm</Link><Link href="/admin/settings">Cài đặt</Link><button type="button" disabled={busy} onClick={() => void logout()}>{busy?'Đang đăng xuất…':'Đăng xuất'}</button></nav>{error&&<p className="commerce-error" role="alert">{error}</p>}</>;
}
