import { z } from 'zod';

const publicProductSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140), name: z.string().min(1).max(180), description: z.string(), basePriceVnd: z.number().int().nonnegative(),
  priceVnd: z.number().int().nonnegative(), originalPriceVnd: z.number().int().nonnegative().optional(), salePriceVnd: z.number().int().nonnegative().optional(), discountPercent: z.number().int().min(0).max(100).optional(), hasDiscount: z.boolean().optional(), isFeatured: z.boolean(), isNew: z.boolean(), categorySlug: z.string(), categoryName: z.string(),
  image: z.string().refine((value) => value === '' || value.startsWith('/') || /^https?:\/\//.test(value)), colors: z.array(z.string()).nullable().optional(),
});
const categorySchema = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(96), name: z.string().min(1).max(120), description: z.string().nullable().optional(), iconKey: z.string().nullable().optional(), imageUrl: z.string().nullable().optional() });
const listResponseSchema = z.object({ data: z.array(publicProductSchema), pagination: z.object({ page: z.number().int().min(1).max(10000), limit: z.number().int().min(1).max(50), total: z.number().int().nonnegative(), pages: z.number().int().nonnegative() }) });
const categoriesResponseSchema = z.object({ data: z.array(categorySchema) });
export type CatalogProduct = z.infer<typeof publicProductSchema>;
export type CatalogCategory = z.infer<typeof categorySchema>;
export function validateProductsResponse(value: unknown) { return listResponseSchema.safeParse(value); }
export function validateCategoriesResponse(value: unknown) { return categoriesResponseSchema.safeParse(value); }
const apiBase = (process.env.CATALOG_API_URL ?? process.env.NEXT_PUBLIC_CATALOG_API_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
const publicApiBase = (process.env.NEXT_PUBLIC_CATALOG_API_URL ?? apiBase).replace(/\/$/, '');
const imageUrl = (value: string) => value.startsWith('/api/v1/public/media/products/') ? `${publicApiBase}${value}` : value;

async function readJson(path: string): Promise<unknown> {
  try {
    const response = await fetch(`${apiBase}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}
export async function getProducts(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value));
  const payload = await readJson(`/api/v1/public/products${query.size ? `?${query}` : ''}`);
  const parsed = validateProductsResponse(payload);
  return { products: parsed.success ? parsed.data.data.map((item) => ({ ...item, image: imageUrl(item.image) })) : [], pagination: parsed.success ? parsed.data.pagination : { page: 1, limit: 20, total: 0, pages: 0 }, available: parsed.success };
}
export async function getCategories() {
  const payload = await readJson('/api/v1/public/categories');
  const parsed = validateCategoriesResponse(payload);
  return { categories: parsed.success ? parsed.data.data : [], available: parsed.success };
}
export async function getProduct(slug: string) {
  const payload = await readJson(`/api/v1/public/products/${encodeURIComponent(slug)}`);
  const parsed = z.object({ data: z.object({ slug: z.string(), name: z.string(), description: z.string(), basePriceVnd: z.number().int().nonnegative(), discountPercent: z.number().int().min(0).max(100), isFeatured: z.boolean(), isNew: z.boolean(), categorySlug: z.string(), categoryName: z.string(), variants: z.array(z.object({ variantId: z.string().uuid(), size: z.string(), colorCode: z.string(), colorName: z.string(), displayColor: z.string().nullable(), colorHex: z.string().nullable(), originalPriceVnd: z.number().int().nonnegative(), salePriceVnd: z.number().int().nonnegative(), discountPercent: z.number().int(), hasDiscount: z.boolean(), stockQuantity: z.number().int(), priceVnd: z.number().int().nonnegative(), availability: z.enum(['IN_STOCK', 'OUT_OF_STOCK']) })), images: z.array(z.object({ url: z.string(), altText: z.string(), sortOrder: z.number(), isPrimary: z.boolean(), variantId: z.string().uuid().nullable().optional() })) }) }).safeParse(payload);
  return parsed.success ? { ...parsed.data.data, images: parsed.data.data.images.map((image) => ({ ...image, url: imageUrl(image.url) })) } : null;
}
export async function getStoreSettings() {
  const payload = await readJson('/api/v1/public/store-settings');
  const parsed = z.object({ data: z.object({ contactPhone: z.string(), messengerUrl: z.string().url() }) }).safeParse(payload);
  return parsed.success ? parsed.data.data : { contactPhone: '', messengerUrl: '' };
}
export function formatVnd(amount: number) { return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`; }
