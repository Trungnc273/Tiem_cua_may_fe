'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { commerceFetch } from '../../../lib/commerce';

type Settings = { contactPhone: string; messengerUrl: string; orderNotificationTo: string; orderNotificationsEnabled: boolean };
type Province = { code: string; label: string };
type ShippingEstimate = { id: string; provinceCode: string | null; displayName: string; estimateMinVnd: number; estimateMaxVnd: number; isFallback: boolean; isActive: boolean };

export default function AdminStoreSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [rules, setRules] = useState<ShippingEstimate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [settingsResponse, rulesResponse, provincesResponse] = await Promise.all([
      commerceFetch('/api/v1/admin/settings'), commerceFetch('/api/v1/admin/shipping-estimates'), commerceFetch('/api/v1/public/shipping/provinces'),
    ]);
    if ([settingsResponse, rulesResponse].some((response) => response.status === 401)) { router.replace('/admin/login'); return; }
    const [settingsBody, rulesBody, provincesBody] = await Promise.all([settingsResponse.json(), rulesResponse.json(), provincesResponse.json()]);
    if (settingsResponse.ok && rulesResponse.ok && provincesResponse.ok) {
      setSettings(settingsBody.data); setRules(rulesBody.data); setProvinces(provincesBody.data);
    } else setMessage('Không tải được cài đặt cửa hàng.');
  }

  useEffect(() => {
    let active = true;
    void Promise.all([commerceFetch('/api/v1/admin/settings'), commerceFetch('/api/v1/admin/shipping-estimates'), commerceFetch('/api/v1/public/shipping/provinces')]).then(async ([settingsResponse, rulesResponse, provincesResponse]) => {
      if (settingsResponse.status === 401 || rulesResponse.status === 401) { router.replace('/admin/login'); return; }
      const [settingsBody, rulesBody, provincesBody] = await Promise.all([settingsResponse.json(), rulesResponse.json(), provincesResponse.json()]);
      if (!active) return;
      if (settingsResponse.ok && rulesResponse.ok && provincesResponse.ok) { setSettings(settingsBody.data); setRules(rulesBody.data); setProvinces(provincesBody.data); }
      else setMessage('Không tải được cài đặt cửa hàng.');
    }).catch(() => { if (active) setMessage('Không thể kết nối máy chủ.'); });
    return () => { active = false; };
  }, [router]);

  async function saveBasic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try {
      const response = await commerceFetch('/api/v1/admin/settings', { method: 'PATCH', body: JSON.stringify({ contactPhone: form.get('phone'), messengerUrl: form.get('messenger') }) });
      const body = await response.json();
      if (!response.ok) setMessage(body.error?.message ?? 'Không lưu được thông tin cửa hàng.');
      else { setSettings((old) => old ? { ...old, ...body.data } : old); setMessage('Đã lưu thông tin cửa hàng.'); }
    } catch { setMessage('Không thể kết nối máy chủ.'); } finally { setBusy(false); }
  }

  async function saveNotifications(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try {
      const response = await commerceFetch('/api/v1/admin/settings/logistics', { method: 'PATCH', body: JSON.stringify({ orderNotificationTo: form.get('recipient'), orderNotificationsEnabled: form.get('enabled') === 'on' }) });
      const body = await response.json();
      if (!response.ok) setMessage(body.error?.message ?? 'Không lưu được cài đặt email.');
      else { setSettings((old) => old ? { ...old, ...body.data } : old); setMessage('Đã lưu cài đặt email đơn hàng.'); }
    } catch { setMessage('Không thể kết nối máy chủ.'); } finally { setBusy(false); }
  }

  async function addEstimate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const target = String(form.get('provinceCode') ?? '');
    const isFallback = target === 'fallback'; const province = provinces.find((item) => item.code === target);
    const min = Number(form.get('estimateMinVnd')); const max = Number(form.get('estimateMaxVnd'));
    if (!isFallback && !province) { setMessage('Chọn tỉnh/thành phố hợp lệ.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await commerceFetch('/api/v1/admin/shipping-estimates', { method: 'POST', body: JSON.stringify({ provinceCode: isFallback ? null : target, displayName: isFallback ? 'Tỉnh/thành khác' : province!.label, estimateMinVnd: min, estimateMaxVnd: max, isFallback }) });
      const body = await response.json();
      if (!response.ok) setMessage(body.error?.message ?? 'Không thêm được khoảng phí.');
      else { formElement.reset(); await reload(); setMessage('Đã thêm khoảng phí vận chuyển dự kiến.'); }
    } catch { setMessage('Không thể kết nối máy chủ.'); } finally { setBusy(false); }
  }

  async function updateEstimate(rule: ShippingEstimate, patch: Partial<ShippingEstimate>) {
    setBusy(true); setMessage('');
    try {
      const response = await commerceFetch(`/api/v1/admin/shipping-estimates/${rule.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      const body = await response.json();
      if (!response.ok) setMessage(body.error?.message ?? 'Không cập nhật được khoảng phí.');
      else { await reload(); setEditingId(null); setMessage('Đã cập nhật khoảng phí.'); }
    } catch { setMessage('Không thể kết nối máy chủ.'); } finally { setBusy(false); }
  }

  async function saveEstimate(event: React.FormEvent<HTMLFormElement>, rule: ShippingEstimate) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await updateEstimate(rule, { displayName: rule.displayName, estimateMinVnd: Number(form.get('min')), estimateMaxVnd: Number(form.get('max')) });
  }

  return <section className="admin-content">
    <div className="admin-page-heading"><div><p className="eyebrow">QUẢN LÝ CỬA HÀNG</p><h1>Cài đặt cửa hàng</h1></div></div>
    {message && <p className="admin-message" role="status">{message}</p>}
    {settings && <>
      <article className="admin-card"><h2>Thông tin cửa hàng</h2><form className="admin-settings-form settings-single" onSubmit={saveBasic}>
        <label>Số điện thoại<input name="phone" type="tel" defaultValue={settings.contactPhone} maxLength={24} required /></label>
        <label>Liên kết Messenger<input name="messenger" type="url" defaultValue={settings.messengerUrl} maxLength={300} required /></label>
        <button className="commerce-primary" disabled={busy}>Lưu thông tin</button>
      </form></article>

      <article className="admin-card logistics-card"><h2>Email báo đơn mới</h2>
        <form className="admin-settings-form settings-single" onSubmit={saveNotifications}>
          <label>Email nhận thông báo đơn hàng<input name="recipient" type="email" defaultValue={settings.orderNotificationTo} maxLength={254} required /></label>
          <label className="settings-toggle"><input name="enabled" type="checkbox" defaultChecked={settings.orderNotificationsEnabled} /> Bật thông báo đơn mới từ <strong>midoradesign@gmail.com</strong></label>
          <p>Khóa Brevo chỉ được cấu hình trong môi trường máy chủ; trang này không hiển thị khóa.</p>
          <button className="commerce-primary" disabled={busy}>Lưu cài đặt email</button>
        </form>
      </article>

      <article className="admin-card logistics-card"><h2>Phí vận chuyển dự kiến</h2>
        <p>Nhập khoảng phí theo tỉnh/thành phố. Khách thấy mức thấp nhất–cao nhất; nhân viên sẽ xác nhận phí chính thức sau khi kiểm tra đơn. Nếu chưa có mức phù hợp, khách vẫn đặt hàng được.</p>
        {rules.length ? <div className="shipping-rule-list">{rules.map((rule) => <div className="shipping-rule-row" key={rule.id}>
          {editingId === rule.id ? <form className="shipping-estimate-edit" onSubmit={(event) => void saveEstimate(event, rule)}><strong>{rule.displayName}</strong><label>Từ (₫)<input name="min" type="number" min="0" max="2000000000" defaultValue={rule.estimateMinVnd} required /></label><label>Đến (₫)<input name="max" type="number" min="0" max="2000000000" defaultValue={rule.estimateMaxVnd} required /></label><div className="shipping-rule-actions"><button type="button" className="commerce-secondary" onClick={() => setEditingId(null)}>Hủy</button><button className="commerce-primary" disabled={busy}>Lưu</button></div></form> : <><span><strong>{rule.displayName}</strong><small>{new Intl.NumberFormat('vi-VN').format(rule.estimateMinVnd)}–{new Intl.NumberFormat('vi-VN').format(rule.estimateMaxVnd)} ₫ · {rule.isActive ? 'Đang bật' : 'Đã tắt'}</small></span><div className="shipping-rule-actions"><button type="button" className="commerce-secondary" disabled={busy} onClick={() => setEditingId(rule.id)}>Sửa</button><button type="button" className="commerce-secondary" disabled={busy} onClick={() => void updateEstimate(rule, { isActive: !rule.isActive })}>{rule.isActive ? 'Tạm tắt' : 'Bật lại'}</button></div></>}
        </div>)}</div> : <p>Chưa có khoảng phí. Khách vẫn có thể đặt hàng và Tiệm sẽ xác nhận phí sau.</p>}
        <form className="admin-settings-form shipping-estimate-form" onSubmit={addEstimate}>
          <label>Tỉnh/thành phố<select name="provinceCode" defaultValue="" required><option value="" disabled>Chọn tỉnh/thành phố</option>{provinces.map((province) => <option key={province.code} value={province.code}>{province.label}</option>)}<option value="fallback">Tỉnh/thành khác (dự phòng)</option></select></label>
          <label>Phí thấp nhất (₫)<input name="estimateMinVnd" type="number" min="0" max="2000000000" step="1000" required /></label>
          <label>Phí cao nhất (₫)<input name="estimateMaxVnd" type="number" min="0" max="2000000000" step="1000" required /></label>
          <button className="commerce-primary" disabled={busy}>Thêm khoảng phí</button>
        </form>
      </article>
    </>}
  </section>;
}
