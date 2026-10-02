FROM node:22.19-alpine AS deps
WORKDIR /app
RUN npm install --global pnpm@12.4.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG NEXT_PUBLIC_CATALOG_API_URL=
ARG API_INTERNAL_URL=http://api:4000
ENV NEXT_PUBLIC_CATALOG_API_URL=${NEXT_PUBLIC_CATALOG_API_URL} API_INTERNAL_URL=${API_INTERNAL_URL}
COPY . .
RUN pnpm build

FROM node:22.19-alpine AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
