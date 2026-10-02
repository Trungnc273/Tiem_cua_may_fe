import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_URL ?? process.env.CATALOG_API_URL ?? "http://127.0.0.1:4000";
const parsedApiOrigin = new URL(apiOrigin);
if (!['http:', 'https:'].includes(parsedApiOrigin.protocol) || parsedApiOrigin.pathname !== '/' || parsedApiOrigin.search || parsedApiOrigin.hash) {
  throw new Error('API_INTERNAL_URL must be an HTTP(S) origin without a path.');
}

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
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
