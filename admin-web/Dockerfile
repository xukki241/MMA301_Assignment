FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY admin-web/package.json ./admin-web/

RUN pnpm install --filter admin-web --frozen-lockfile

COPY admin-web/ ./admin-web/

# Compile the React application
RUN pnpm turbo build --filter=admin-web

WORKDIR /app/admin-web

EXPOSE 3000

CMD ["pnpm", "start"]
