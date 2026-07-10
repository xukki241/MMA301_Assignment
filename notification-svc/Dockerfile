FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY notification-svc/package.json ./notification-svc/
RUN pnpm install --filter notification-svc --frozen-lockfile

COPY notification-svc/ ./notification-svc/
COPY proto/ ./proto/

RUN pnpm turbo build --filter=notification-svc

WORKDIR /app/notification-svc

EXPOSE 50052

CMD ["node", "dist/index.js"]
