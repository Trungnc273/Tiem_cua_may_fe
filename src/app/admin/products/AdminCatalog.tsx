'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { commerceFetch, commerceImageUrl, commerceUpload, responseMessage } from '../../../lib/commerce';

type Category = { id: string; slug: string; name: string; description: string; iconKey: string; sortOrder: number; isActive: boolean; updatedAt: string; productCount: number };
type Variant = { id: string; sku: string; size: string; colorCode: string; colorName: string; displayColor: string | null; colorHex: string | null; priceOverrideVnd: number | null; stockQuantity: number; isActive: boolean; updatedAt: string };
type Product = { id: string; slug: string; name: string; description: string; categoryId: string; categoryName?: string; status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'; basePriceVnd: number; salePriceVnd?: number; discountPercent: number; isFeatured: boolean; isNew: boolean; updatedAt: string; image?: string | null; totalStock?: number; variantCount?: number };
type ProductDetail = Product & { variants: Variant[]; images: { id: string; url: string; altText: string; sortOrder: number; isPrimary: boolean; variantId: string | null }[] };
const api = '/api/v1/admin/catalog';
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 140);
const vnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
const emptyVariant = { sku: '', size: '', colorCode: '', colorName: '', displayColor: '', colorHex: '', priceOverrideVnd: '', stockQuantity: '0' };

export default function AdminCatalog() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]); const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<ProductDetail | null>(null); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [categoryId,setCategoryId]=useState(''); const [page,setPage]=useState(1); const [pages,setPages]=useState(1);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [uploadProgress, setUploadProgress] = useState(''); const [categoryMode, setCategoryMode] = useState(false); const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null); const [newVariant, setNewVariant] = useState(emptyVariant); const [imageVariantId,setImageVariantId]=useState('');
  const load = useCallback(async (): Promise<boolean> => {
    const query = new URLSearchParams({page:String(page),limit:'20'}); if (search.trim()) query.set('q', search.trim()); if (status) query.set('status', status); if(categoryId)query.set('categoryId',categoryId);
    const [p, c] = await Promise.all([commerceFetch(`${api}/products?${query}`), commerceFetch(`${api}/categories`)]);
    if (p.status === 401 || c.status === 401) { router.replace('/admin/login'); return false; }
    if (p.ok && c.ok) { const [pd, cd] = await Promise.all([p.json(), c.json()]); setProducts(pd.data); setPages(pd.pagination.pages); setCategories(cd.data); return true; }
    else { setMessage('Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c danh m\u1ee5c qu\u1ea3n tr\u1ecb.'); return false; }
  }, [router, search, status, categoryId, page]);
  useEffect(() => { const timer=window.setTimeout(()=>{ void load().catch(() => setMessage('Không thể kết nối máy chủ.')); },0); return ()=>window.clearTimeout(timer); }, [load]);
  async function openProduct(id: string): Promise<boolean> { setMessage(''); try { const r = await commerceFetch(`${api}/products/${id}`); if (r.status === 401) { router.replace('/admin/login'); return false; } if (!r.ok) { setMessage(await responseMessage(r)); return false; } setSelected((await r.json()).data); return true; } catch { setMessage('Không thể tải sản phẩm.'); return false; } }
  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try { const name = String(form.get('name')); const chosenSlug = String(form.get('slug') || slugify(name)); const r = await commerceFetch(`${api}/products`, { method: 'POST', body: JSON.stringify({ name, slug: chosenSlug, description: form.get('description'), categoryId: form.get('categoryId'), basePriceVnd: Number(form.get('price')), discountPercent: Number(form.get('discount')), isFeatured: form.get('featured') === 'on', isNew: form.get('new') === 'on' }) });
      if (!r.ok) setMessage(await responseMessage(r)); else { const item = (await r.json()).data as ProductDetail; setSelected({ ...item, variants: [], images: [] }); setMessage('Đã tạo bản nháp sản phẩm. Bổ sung biến thể và ảnh trước khi đăng.'); await load(); }
    } catch { setMessage('Không thể tạo sản phẩm.'); } finally { setBusy(false); }
  }
  async function saveProduct(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected) return; const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try { const r = await commerceFetch(`${api}/products/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ slug: form.get('slug'), name: form.get('name'), description: form.get('description'), categoryId: form.get('categoryId'), basePriceVnd: Number(form.get('price')), discountPercent: Number(form.get('discount')), isFeatured: form.get('featured') === 'on', isNew: form.get('new') === 'on', updatedAt: selected.updatedAt }) }); if (!r.ok) setMessage(await responseMessage(r)); else { const changed = (await r.json()).data as Product; setSelected({ ...selected, ...changed }); setMessage('Đã lưu thông tin sản phẩm.'); await load(); } }
    catch { setMessage('Không thể lưu sản phẩm.'); } finally { setBusy(false); }
  }
  async function changeStatus(next: Product['status']) { if (!selected) return; setBusy(true); setMessage(''); try { const r = await commerceFetch(`${api}/products/${selected.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next, updatedAt: selected.updatedAt }) }); if (!r.ok) setMessage(await responseMessage(r)); else { const data=(await r.json()).data; setSelected({ ...selected, status: next, updatedAt: data.updatedAt }); setMessage(next === 'ACTIVE' ? 'Sản phẩm đã được đăng.' : 'Đã cập nhật trạng thái.'); await load(); } } catch { setMessage('Không thể cập nhật trạng thái.'); } finally { setBusy(false); } }
  async function addVariant(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected) return; const f = new FormData(event.currentTarget); setBusy(true); setMessage(''); try { const r = await commerceFetch(`${api}/products/${selected.id}/variants`, { method: 'POST', body: JSON.stringify({ sku: f.get('sku'), size: f.get('size'), colorCode: f.get('colorCode'), colorName: f.get('colorName'), displayColor: f.get('displayColor') || null, colorHex: f.get('colorHex') || null, priceOverrideVnd: f.get('override') === '' ? null : Number(f.get('override')), stockQuantity: Number(f.get('stock')) }) }); if (!r.ok) setMessage(await responseMessage(r)); else { const item = (await r.json()).data as Variant; setSelected({ ...selected, variants: [...selected.variants, item] }); setNewVariant(emptyVariant); setMessage('Đã thêm biến thể và ghi nhận tồn kho.'); } } catch { setMessage('Không thể thêm biến thể.'); } finally { setBusy(false); } }
  async function saveVariant(event: React.FormEvent<HTMLFormElement>, variant: Variant) { event.preventDefault(); if (!selected) return; const f = new FormData(event.currentTarget); setBusy(true); setMessage(''); try { const r = await commerceFetch(`${api}/products/${selected.id}/variants/${variant.id}`, { method: 'PATCH', body: JSON.stringify({ sku: f.get('sku'), size: f.get('size'), colorCode: f.get('colorCode'), colorName: f.get('colorName'), displayColor: f.get('displayColor') || null, colorHex: f.get('colorHex') || null, priceOverrideVnd: f.get('override') === '' ? null : Number(f.get('override')), stockQuantity: Number(f.get('stock')), isActive: f.get('active') === 'on', updatedAt: variant.updatedAt }) }); if (!r.ok) setMessage(await responseMessage(r)); else if (await openProduct(selected.id)) { setMessage('Đã lưu biến thể.'); await load(); } } catch { setMessage('Không thể lưu biến thể.'); } finally { setBusy(false); } }
  async function uploadImages(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selected) return;
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;
    const product = selected;
    setBusy(true); setMessage('');
    try {
      for (const [index, file] of files.entries()) {
        setUploadProgress(`Đang tải ảnh ${index + 1}/${files.length}: ${file.name} (0%)`);
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name}: ảnh vượt quá 8 MB.`);
        const dataBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error(`Không đọc được ảnh ${file.name}.`));
          reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
          reader.readAsDataURL(file);
        });
        const response = await commerceUpload(`${api}/products/${product.id}/images`, {
            dataBase64,
            altText: file.name.replace(/\.[^.]+$/, '').slice(0, 180) || product.name,
            variantId: imageVariantId || null,
            isPrimary: product.images.length === 0 && index === 0,
          }, (loaded, total) => {
            const percent = Math.round((loaded / total) * 100);
            setUploadProgress(percent === 100 ? `Đang tải ảnh ${index + 1}/${files.length}: ${file.name} (100%) · đang chờ máy chủ lưu…` : `Đang tải ảnh ${index + 1}/${files.length}: ${file.name} (${percent}%)`);
          });
        if (!response.ok) throw new Error(await responseMessage(response));
        const uploaded = (await response.json()).data as ProductDetail['images'][number];
        setSelected((current) => current?.id === product.id
          ? { ...current, images: [...current.images, uploaded] }
          : current);
        setUploadProgress(`Đã tải ảnh ${index + 1}/${files.length}: ${file.name}`);
      }
      const refreshed = await load();
      setMessage(refreshed ? `Đã tải xong ${files.length} ảnh sản phẩm.` : `Đã tải xong ${files.length} ảnh; danh sách chưa làm mới được.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải ảnh.');
    } finally {
      setBusy(false); setUploadProgress(''); event.target.value = '';
    }
  }
  async function imageAction(imageId: string, action: 'primary' | 'delete' | 'up' | 'down') {
    if (!selected) return;
    setBusy(true); setMessage('Đang cập nhật ảnh…');
    try {
      let response: Response;
      if (action === 'up' || action === 'down') {
        const ids = selected.images.map((image) => image.id);
        const index = ids.indexOf(imageId); const next = index + (action === 'up' ? -1 : 1);
        if (index < 0 || next < 0 || next >= ids.length) return;
        [ids[index], ids[next]] = [ids[next]!, ids[index]!];
        response = await commerceFetch(`${api}/products/${selected.id}/images/order`, { method: 'PATCH', body: JSON.stringify({ imageIds: ids }) });
      } else {
        response = await commerceFetch(`${api}/products/${selected.id}/images/${imageId}${action === 'primary' ? '/primary' : ''}`, { method: action === 'primary' ? 'PATCH' : 'DELETE', ...(action === 'primary' ? { body: '{}' } : {}) });
      }
      if (!response.ok) setMessage(await responseMessage(response));
      else if (await openProduct(selected.id)) { setMessage(action === 'delete' ? 'Đã gỡ ảnh.' : 'Đã cập nhật ảnh.'); await load(); }
    } catch { setMessage('Không thể cập nhật ảnh. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const f = new FormData(form); const name = String(f.get('name'));
    setBusy(true); setMessage('');
    try {
      const response = await commerceFetch(`${api}/categories`, { method: 'POST', body: JSON.stringify({ name, slug: f.get('slug') || slugify(name), iconKey: f.get('iconKey'), sortOrder: Number(f.get('sortOrder')) }) });
      if (!response.ok) setMessage(await responseMessage(response));
      else { form.reset(); setMessage('Đã tạo danh mục.'); await load(); }
    } catch { setMessage('Không thể tạo danh mục. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function toggleCategory(category: Category) {
    setBusy(true); setMessage('');
    try {
      const response = await commerceFetch(`${api}/categories/${category.id}`, { method: 'PATCH', body: JSON.stringify({ slug: category.slug, name: category.name, description: category.description ?? '', iconKey: ['dress','shirt','pants','skirt','accessory','generic'].includes(category.iconKey) ? category.iconKey : 'generic', sortOrder: category.sortOrder, isActive: !category.isActive, updatedAt: category.updatedAt }) });
      if (!response.ok) setMessage(await responseMessage(response));
      else { setMessage(category.isActive ? 'Đã ẩn danh mục khỏi cửa hàng.' : 'Đã bật danh mục.'); await load(); }
    } catch { setMessage('Không thể cập nhật danh mục. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  function editCategory(category: Category) { setEditingCategoryId(category.id); setMessage(''); }
  async function saveCategory(event: React.FormEvent<HTMLFormElement>, category: Category) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try {
      const response = await commerceFetch(`${api}/categories/${category.id}`, { method: 'PATCH', body: JSON.stringify({ slug: slugify(String(form.get('slug'))), name: String(form.get('name')).trim(), description: form.get('description'), iconKey: form.get('iconKey'), sortOrder: Number(form.get('sortOrder')), isActive: category.isActive, updatedAt: category.updatedAt }) });
      if (!response.ok) setMessage(await responseMessage(response));
      else { setEditingCategoryId(null); setMessage('Đã cập nhật danh mục.'); await load(); }
    } catch { setMessage('Không thể lưu danh mục. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }

  return <section className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">QUẢN LÝ CATALOG</p><h1>Sản phẩm</h1><p>Quản lý giá, biến thể, ảnh và tồn kho.</p></div><div className="admin-toolbar"><button className={categoryMode ? 'admin-secondary selected' : 'admin-secondary'} onClick={() => { setCategoryMode(!categoryMode); setSelected(null); }}>Danh mục</button><button className="commerce-primary" onClick={() => { setSelected(null); setCategoryMode(false); document.getElementById('new-product')?.scrollIntoView({ behavior: 'smooth' }); }}>+ Sản phẩm</button></div></div>
    {message && <p className="admin-message" role="status" aria-live="polite">{message}</p>}
    {categoryMode ? <div className="admin-catalog-grid"><div><article className="admin-card"><h2>Thêm danh mục</h2><form className="admin-form" onSubmit={(e) => void createCategory(e)}><label>Tên danh mục<input name="name" required maxLength={120}/></label><label>Slug hiển thị<input name="slug" placeholder="tự tạo từ tên" maxLength={96}/></label><label>Biểu tượng<select name="iconKey"><option value="generic">Chung</option><option value="dress">Váy</option><option value="shirt">Áo</option><option value="pants">Quần</option><option value="skirt">Chân váy</option><option value="accessory">Phụ kiện</option></select></label><label>Thứ tự<input name="sortOrder" type="number" min="0" defaultValue="0"/></label><button className="commerce-primary" disabled={busy}>{busy?'Đang lưu…':'Tạo danh mục'}</button></form></article></div><div className="admin-card"><h2>Danh mục đang có</h2>{categories.map(c=><div className="category-admin-row" key={c.id}>{editingCategoryId===c.id ? <form className="category-edit-form" onSubmit={e=>void saveCategory(e,c)}><label>Tên danh mục<input name="name" defaultValue={c.name} required maxLength={120}/></label><label>Slug<input name="slug" defaultValue={c.slug} required maxLength={96}/></label><label>Biểu tượng<select name="iconKey" defaultValue={c.iconKey}><option value="generic">Chung</option><option value="dress">Váy</option><option value="shirt">Áo</option><option value="pants">Quần</option><option value="skirt">Chân váy</option><option value="accessory">Phụ kiện</option></select></label><label>Thứ tự<input name="sortOrder" type="number" min="0" defaultValue={c.sortOrder} required/></label><label>Mô tả<textarea name="description" defaultValue={c.description??''} maxLength={5000} rows={2}/></label><div className="admin-actions"><button type="button" className="admin-secondary" disabled={busy} onClick={()=>setEditingCategoryId(null)}>Hủy</button><button className="commerce-primary" disabled={busy}>{busy?'Đang lưu…':'Lưu danh mục'}</button></div></form> : <><div><strong>{c.name}</strong><small>/{c.slug} · {c.productCount} sản phẩm · {c.isActive?'Đang bật':'Đang ẩn'} · Thứ tự {c.sortOrder}</small></div><div className="admin-actions"><button className="admin-secondary" disabled={busy} onClick={()=>editCategory(c)}>Sửa</button><button className="admin-secondary" disabled={busy} onClick={()=>void toggleCategory(c)}>{c.isActive?'Ẩn':'Bật'}</button></div></>}</div>)}</div></div> : <>
      {!selected && <><div className="admin-catalog-tools"><input aria-label="Tìm theo tên hoặc SKU" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Tìm tên sản phẩm hoặc SKU"/><select aria-label="Lọc danh mục" value={categoryId} onChange={e=>{setCategoryId(e.target.value);setPage(1)}}><option value="">Mọi danh mục</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Lọc trạng thái" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">Mọi trạng thái</option><option value="DRAFT">Bản nháp</option><option value="ACTIVE">Đang bán</option><option value="INACTIVE">Đã ẩn</option><option value="DISCONTINUED">Ngừng kinh doanh</option></select></div><div className="admin-table-wrap"><table className="admin-table product-admin-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá / giảm</th><th>Tồn kho</th><th>Trạng thái</th><th></th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><div className="admin-product-cell">{p.image ? <Image src={commerceImageUrl(p.image)} alt="" width={46} height={56} unoptimized/> : <span className="admin-image-placeholder">Ảnh</span>}<span><strong>{p.name}</strong><small>/{p.slug}</small></span></div></td><td>{p.categoryName}</td><td><strong>{vnd(p.salePriceVnd ?? p.basePriceVnd)}</strong>{p.discountPercent>0&&<><small className="cell-sub"><del>{vnd(p.basePriceVnd)}</del></small><small className="cell-sub">-{p.discountPercent}%</small></>}</td><td>{p.totalStock ?? 0} <small>({p.variantCount ?? 0} mẫu)</small></td><td><span className="order-status">{p.status === 'ACTIVE' ? 'Đang bán' : p.status === 'DRAFT' ? 'Bản nháp' : p.status === 'INACTIVE' ? 'Đã ẩn' : 'Ngừng bán'}</span></td><td><button className="text-action" onClick={()=>void openProduct(p.id)}>Mở</button></td></tr>)}</tbody></table></div><div className="admin-pagination"><button disabled={page<=1} onClick={()=>setPage(page-1)}>Trước</button><span>Trang {page} / {Math.max(1,pages)}</span><button disabled={page>=pages} onClick={()=>setPage(page+1)}>Tiếp</button></div><div className="admin-section-heading" id="new-product"><h2>Tạo sản phẩm</h2><p>Sản phẩm mới ở trạng thái bản nháp cho đến khi đủ ảnh và biến thể.</p></div><article className="admin-card"><form className="admin-product-editor" onSubmit={e=>void createProduct(e)}><label>Tên sản phẩm<input name="name" maxLength={180} required/></label><label>Slug sản phẩm<input name="slug" maxLength={140} placeholder="tự tạo từ tên; có thể sửa khi là bản nháp"/></label><label>Danh mục<select name="categoryId" required defaultValue=""><option value="" disabled>Chọn danh mục</option>{categories.filter(c=>c.isActive).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Giá gốc (₫)<input name="price" type="number" min="0" step="1" required/></label><label>Giảm giá (%)<input name="discount" type="number" min="0" max="100" step="1" defaultValue="0" required/></label><label className="admin-inline-check"><input name="new" type="checkbox"/> Mẫu mới</label><label className="admin-inline-check"><input name="featured" type="checkbox"/> Nổi bật</label><label className="span-all">Mô tả<textarea name="description" maxLength={5000} rows={3}/></label><button className="commerce-primary" disabled={busy}>Tạo bản nháp</button></form></article></>}
      {selected && <><div className="admin-editor-top"><button className="admin-secondary" disabled={busy} onClick={()=>setSelected(null)}>← Danh sách sản phẩm</button><div><span className="order-status">{selected.status}</span>{selected.status==='ACTIVE' ? <button className="admin-secondary" disabled={busy} onClick={()=>void changeStatus('INACTIVE')}>Ẩn khỏi cửa hàng</button> : <button className="commerce-primary" disabled={busy} onClick={()=>void changeStatus('ACTIVE')}>{busy?'Đang lưu…':'Đăng sản phẩm'}</button>}</div></div><form className="admin-product-editor admin-card" onSubmit={e=>void saveProduct(e)}><div className="span-all admin-section-label"><h2>Thông tin sản phẩm</h2><small>Slug đang bán sẽ được giữ ổn định.</small></div><label>Tên sản phẩm<input name="name" defaultValue={selected.name} required maxLength={180}/></label><label>Slug<input name="slug" defaultValue={selected.slug} required maxLength={140}/></label><label>Danh mục<select name="categoryId" defaultValue={selected.categoryId} required>{categories.map(c=><option key={c.id} value={c.id}>{c.name}{c.isActive?'':' (ẩn)'}</option>)}</select></label><label>Giá gốc (₫)<input name="price" type="number" min="0" defaultValue={selected.basePriceVnd} required/></label><label>Giảm giá (%)<input name="discount" type="number" min="0" max="100" defaultValue={selected.discountPercent} required/></label><label className="admin-inline-check"><input name="new" type="checkbox" defaultChecked={selected.isNew}/> Mẫu mới</label><label className="admin-inline-check"><input name="featured" type="checkbox" defaultChecked={selected.isFeatured}/> Nổi bật</label><label className="span-all">Mô tả<textarea name="description" defaultValue={selected.description} rows={4}/></label><div className="span-all admin-actions"><button className="commerce-primary" disabled={busy}>{busy?'Đang lưu…':'Lưu thông tin'}</button>{selected.status==='ACTIVE'?<a className="admin-secondary" href={`/products/${selected.slug}`} target="_blank" rel="noreferrer">Xem trang công khai</a>:<span className="checkout-note">Trang công khai sẽ hiện sau khi đăng.</span>}</div></form>
        <article className="admin-card"><div className="admin-section-label"><div><h2>Biến thể và tồn kho</h2><p>SKU duy nhất; tồn kho là số nguyên theo từng biến thể.</p></div></div>{selected.variants.map(v=><form className="variant-admin-row" key={v.id} onSubmit={e=>void saveVariant(e,v)}><label>SKU<input name="sku" defaultValue={v.sku} required maxLength={80}/></label><label>Màu<input name="colorName" defaultValue={v.colorName} required maxLength={80}/></label><label>Mã màu<input name="colorHex" type="text" defaultValue={v.colorHex ?? ''} placeholder="#AABBCC" maxLength={7}/></label><label>Cỡ<input name="size" defaultValue={v.size} required maxLength={40}/></label><label>Giá riêng<input name="override" type="number" min="0" defaultValue={v.priceOverrideVnd ?? ''} placeholder="Giá gốc"/></label><label>Tồn kho<input name="stock" type="number" min="0" defaultValue={v.stockQuantity} required/></label><label className="admin-inline-check"><input name="active" type="checkbox" defaultChecked={v.isActive}/> Hoạt động</label><button className="admin-secondary" disabled={busy}>{busy?'Đang lưu…':'Lưu'}</button></form>)}<form className="variant-admin-row variant-add-row" onSubmit={e=>void addVariant(e)}><label>SKU<input name="sku" value={newVariant.sku} onChange={e=>setNewVariant({...newVariant,sku:e.target.value})} required placeholder="VD: VAY-MAY-RED-S"/></label><label>Màu<input name="colorName" value={newVariant.colorName} onChange={e=>setNewVariant({...newVariant,colorName:e.target.value})} required/></label><label>Mã màu<input name="colorHex" value={newVariant.colorHex} onChange={e=>setNewVariant({...newVariant,colorHex:e.target.value})} placeholder="#AABBCC"/></label><label>Mã màu nội bộ<input name="colorCode" value={newVariant.colorCode} onChange={e=>setNewVariant({...newVariant,colorCode:e.target.value})} required/></label><label>Cỡ<input name="size" value={newVariant.size} onChange={e=>setNewVariant({...newVariant,size:e.target.value})} required/></label><label>Giá riêng<input name="override" type="number" min="0" value={newVariant.priceOverrideVnd} onChange={e=>setNewVariant({...newVariant,priceOverrideVnd:e.target.value})} placeholder="Giá gốc"/></label><label>Tồn kho<input name="stock" type="number" min="0" value={newVariant.stockQuantity} onChange={e=>setNewVariant({...newVariant,stockQuantity:e.target.value})}/></label><button className="commerce-primary" disabled={busy}>{busy?'Đang thêm…':'Thêm mẫu'}</button></form></article>
        <article className="admin-card"><div className="admin-section-label"><div><h2>Ảnh sản phẩm</h2><p>JPEG, PNG hoặc WebP · tối đa 8 MB, cạnh tối đa 6000 px.</p><select aria-label="Gắn ảnh với biến thể" value={imageVariantId} onChange={e=>setImageVariantId(e.target.value)} disabled={busy}><option value="">Ảnh chung cho sản phẩm</option>{selected.variants.map(v=><option key={v.id} value={v.id}>{v.colorName} · {v.size} · {v.sku}</option>)}</select></div><label className="commerce-primary upload-label">{busy&&uploadProgress?'Đang tải…':'+ Tải ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>void uploadImages(e)} disabled={busy}/></label></div>{uploadProgress&&<p role="status" aria-live="polite" className="checkout-note">{uploadProgress}</p>}<div className="admin-image-grid">{selected.images.map((image,index)=><div className="admin-image-card" key={image.id}><Image src={commerceImageUrl(image.url)} alt={image.altText} width={220} height={240} unoptimized/><span>{image.variantId ? selected.variants.find(v=>v.id===image.variantId)?.sku ?? 'Biến thể' : 'Ảnh chung'} · {image.isPrimary?'Ảnh chính':'Ảnh phụ'}</span><div><button className="text-action" disabled={busy||index===0} onClick={()=>void imageAction(image.id,'up')}>Lên</button><button className="text-action" disabled={busy||index===selected.images.length-1} onClick={()=>void imageAction(image.id,'down')}>Xuống</button><button className="text-action" disabled={busy} onClick={()=>void imageAction(image.id,'primary')}>Đặt ảnh chính</button><button className="text-action danger-text" disabled={busy} onClick={()=>void imageAction(image.id,'delete')}>Gỡ ảnh</button></div></div>)}</div>{selected.images.length===0&&<p className="checkout-note">Chưa có ảnh. Cần ít nhất một ảnh trước khi đăng.</p>}</article>
      </>}
    </>}
  </section>;
}
