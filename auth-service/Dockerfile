FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY auth-service/package.json ./auth-service/
RUN pnpm install --filter auth-service --frozen-lockfile

COPY auth-service/ ./auth-service/
COPY proto/ ./proto/

RUN pnpm turbo build --filter=auth-service

WORKDIR /app/auth-service

EXPOSE 3001
EXPOSE 50051

CMD ["node", "dist/index.js"]
