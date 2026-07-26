FROM node:24.4.1-alpine@sha256:820e86612c21d0636580206d802a726f2595366e1b867e564cbc652024151e8a AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:24.4.1-alpine@sha256:820e86612c21d0636580206d802a726f2595366e1b867e564cbc652024151e8a AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
RUN addgroup -S careerpath && adduser -S -G careerpath careerpath
COPY --from=build --chown=careerpath:careerpath /workspace/artifacts/api-server/dist ./dist
USER careerpath
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/api/live || exit 1
CMD ["node","--enable-source-maps","./dist/index.mjs"]
