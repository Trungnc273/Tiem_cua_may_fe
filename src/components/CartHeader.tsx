'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { commerceFetch } from '../lib/commerce';

export default function CartHeader() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try { const response = await commerceFetch('/api/v1/public/cart/count'); const payload = await response.json(); if (mounted && response.ok) setCount(Number(payload.data.count) || 0); } catch { /* keep the cart affordance available offline */ }
    };
    void load(); window.addEventListener('tcm:cart-changed', load);
    return () => { mounted = false; window.removeEventListener('tcm:cart-changed', load); };
  }, []);
  return <Link className="icon-button cart-button" href="/gio-hang" aria-label={`Giỏ hàng${count ? `, ${count} sản phẩm` : ''}`}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>{count > 0 && <span className="cart-count">{count > 99 ? '99+' : count}</span>}</Link>;
}
