export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  const environment = process.env.TCM_ENVIRONMENT;
  const catalogMode = process.env.CATALOG_MODE;
  const apiOrigin = process.env.CATALOG_API_URL;
  const publicOrigin = process.env.PUBLIC_APP_URL;
  if (!['production', 'staging'].includes(environment ?? '') || !apiOrigin || !publicOrigin) throw new Error('Production storefront requires TCM_ENVIRONMENT, CATALOG_API_URL, and PUBLIC_APP_URL.');
  const api = new URL(apiOrigin); const site = new URL(publicOrigin);
  if (!['http:', 'https:'].includes(api.protocol) || api.pathname !== '/' || !site.protocol.startsWith('https') || site.origin !== publicOrigin) throw new Error('Production storefront URLs must be valid origins; PUBLIC_APP_URL must be HTTPS.');
  if (environment === 'production' && catalogMode !== 'production') throw new Error('Production storefront must use production catalog provenance.');
  if (environment === 'staging' && catalogMode !== 'test') throw new Error('Public staging must use TEST catalog provenance.');
  if (process.env.NEXT_PUBLIC_CATALOG_API_URL !== '') throw new Error('Production storefront API requests must use the same-origin reverse proxy.');
}
