import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_URL ?? process.env.CATALOG_API_URL ?? "http://127.0.0.1:4000";
const parsedApiOrigin = new URL(apiOrigin);
if (!['http:', 'https:'].includes(parsedApiOrigin.protocol) || parsedApiOrigin.pathname !== '/' || parsedApiOrigin.search || parsedApiOrigin.hash) {
  throw new Error('API_INTERNAL_URL must be an HTTP(S) origin without a path.');
}
const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/api/v1/public/media/products/**', search: '' },
  { protocol: 'http', hostname: '127.0.0.1', port: '4000', pathname: '/api/v1/public/media/products/**', search: '' },
];
const mediaBaseUrl = process.env.R2_PUBLIC_BASE_URL;
if (mediaBaseUrl) {
  const mediaOrigin = new URL(mediaBaseUrl);
  if (mediaOrigin.protocol !== 'https:' || mediaOrigin.pathname !== '/' || mediaOrigin.search || mediaOrigin.hash || mediaOrigin.hostname.endsWith('.r2.dev') || mediaOrigin.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error('R2_PUBLIC_BASE_URL must be an HTTPS custom media origin without a path.');
  }
  remotePatterns.push({ protocol: 'https', hostname: mediaOrigin.hostname, port: '', pathname: '/products/**', search: '' });
}

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  images: { remotePatterns },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
export default nextConfig;
