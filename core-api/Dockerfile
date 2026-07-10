FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY core-api/package.json ./core-api/
RUN pnpm install --filter core-api --frozen-lockfile

COPY core-api/ ./core-api/
COPY proto/ ./proto/

RUN pnpm turbo build --filter=core-api

WORKDIR /app/core-api

EXPOSE 3002

CMD ["node", "dist/index.js"]
