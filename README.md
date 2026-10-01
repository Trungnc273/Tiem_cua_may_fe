# Tiệm Của Mây storefront

Next.js App Router storefront that uses the public catalog API. The approved homepage styling is retained while its categories and products are loaded from the backend. Routes include `/`, `/products`, and `/products/:slug`.

## Run locally

```powershell
Copy-Item .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev -- --hostname 127.0.0.1 --port 3100
```

The frontend reads `CATALOG_API_URL` on the server. Empty or unavailable responses stay empty; no hardcoded product fallback is used. Only enable `NEXT_PUBLIC_CATALOG_DEMO_MODE=true` when connected to the isolated TEST catalog.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e:real` — real Playwright against running FE/BE with TEST data.
- `pnpm test:e2e:empty` — production-mode empty catalog path.

Playwright expects local Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` by default; set `CHROME_BIN` to override. QA captures are under `../qa/screenshots/batch2/`.
