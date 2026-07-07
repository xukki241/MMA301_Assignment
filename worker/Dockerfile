FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY worker/package.json ./worker/
RUN pnpm install --filter worker --frozen-lockfile

COPY worker/ ./worker/
COPY proto/ ./proto/

RUN pnpm turbo build --filter=worker

WORKDIR /app/worker

CMD ["node", "dist/index.js"]
