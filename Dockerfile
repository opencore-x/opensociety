# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @opensociety/api... --filter @opensociety/web... install --frozen-lockfile
RUN pnpm --filter @opensociety/shared build && pnpm --filter @opensociety/db build

FROM build AS api-build
RUN pnpm --filter @opensociety/api build && pnpm --filter @opensociety/api build:node

FROM node:22-bookworm-slim AS api
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
WORKDIR /app
COPY --from=api-build --chown=node:node /repo/apps/api/dist/node.mjs ./node.mjs
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node.mjs"]

FROM build AS web-build
ARG DEPLOY_ENV=production
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV DEPLOY_ENV=$DEPLOY_ENV VITE_API_URL=$VITE_API_URL VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
# pnpm 10.0's portable deploy requires injection in both config and lockfile.
# Change only that setting in the container; keep every resolved version pinned.
RUN pnpm --filter @opensociety/web build \
    && sed -i '/^settings:/a\  injectWorkspacePackages: true' pnpm-lock.yaml \
    && pnpm --config.inject-workspace-packages=true --filter @opensociety/web deploy --prod /web

FROM node:22-bookworm-slim AS web
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=web-build --chown=node:node /web/node_modules ./node_modules
COPY --from=web-build --chown=node:node /repo/apps/web/package.json /repo/apps/web/server.mjs ./
COPY --from=web-build --chown=node:node /repo/apps/web/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
