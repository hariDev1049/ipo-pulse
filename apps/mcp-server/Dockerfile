FROM node:24-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/mcp-server/package.json apps/mcp-server/

RUN pnpm install --frozen-lockfile --filter mcp-server...

COPY packages/core packages/core
COPY apps/mcp-server apps/mcp-server

RUN pnpm --filter mcp-server build

WORKDIR /app/apps/mcp-server
ENV NODE_ENV=production
ENV MCP_HOST=0.0.0.0
EXPOSE 3001

CMD ["node", "dist/index.js"]
