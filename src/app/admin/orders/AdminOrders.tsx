'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { commerceFetch, formatMoney } from '../../../lib/commerce';
type Order = { id: string; orderCode: string; customerName: string; phoneLast4: string; status: string; totalVnd: number | null; createdAt: string };
export default function AdminOrders() {
  const router = useRouter();
  const [rows, setRows] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let live = true;
    const query = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) query.set('status', status);
    void commerceFetch(`/api/v1/admin/orders?${query}`).then(async (response) => {
      if (response.status === 401) { router.replace('/admin/login'); return; }
      const payload = await response.json().catch(() => null);
      if (live && response.ok && Array.isArray(payload?.data)) setRows(payload.data);
      else if (live) setError(payload?.error?.message ?? 'Không tải được danh sách đơn hàng.');
    }).catch(() => { if (live) setError('Không thể kết nối máy chủ. Vui lòng thử lại.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, status, router]);
  return <section className="admin-content">
    <div className="admin-page-heading"><div><p className="eyebrow">VẬN HÀNH CỬA HÀNG</p><h1>Đơn hàng</h1></div><label>Lọc trạng thái<select value={status} onChange={(event) => { setLoading(true); setError(''); setStatus(event.target.value); setPage(1); }}><option value="">Tất cả</option>{['NEW','CONFIRMED','SHIPPING','COMPLETED','CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select></label></div>
    {error && <p className="commerce-error" role="alert">{error}</p>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Điện thoại</th><th>Trạng thái</th><th>Tổng đơn chính thức</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><Link href={`/admin/orders/${row.id}`}>{row.orderCode}</Link></td><td>{row.customerName}</td><td>•••• {row.phoneLast4}</td><td><span className="order-status">{row.status}</span></td><td>{row.totalVnd === null ? 'Chưa xác nhận' : formatMoney(Number(row.totalVnd))}</td><td><Link href={`/admin/orders/${row.id}`}>Chi tiết</Link></td></tr>)}</tbody></table>{loading ? <p className="empty-state" role="status">Đang tải đơn hàng…</p> : !rows.length && !error && <p className="empty-state">Chưa có đơn hàng.</p>}</div>
    <div className="admin-pagination"><button disabled={loading || page<=1} onClick={()=>{setLoading(true);setError('');setPage(page-1)}}>Trước</button><span>Trang {page}</span><button disabled={loading || rows.length<20} onClick={()=>{setLoading(true);setError('');setPage(page+1)}}>Sau</button></div>
  </section>;
}
