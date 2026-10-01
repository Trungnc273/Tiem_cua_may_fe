'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { commerceFetch, responseMessage } from '../../../lib/commerce';
export default function AdminLoginClient() {
  const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget); try { const response = await commerceFetch('/api/v1/admin/auth/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }); if (!response.ok) setError(await responseMessage(response)); else router.replace('/admin/orders'); } catch { setError('Không thể kết nối máy chủ.'); } finally { setBusy(false); } }
  return <section className="admin-login"><p className="eyebrow">KHU VỰC QUẢN TRỊ</p><h1>Đăng nhập</h1><form className="admin-form" onSubmit={submit}><label>Email<input type="email" name="email" autoComplete="username" maxLength={254} required/></label><label>Mật khẩu<input type="password" name="password" autoComplete="current-password" maxLength={256} required/></label>{error && <p className="commerce-error" role="alert">{error}</p>}<button className="commerce-primary" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button></form></section>;
}
