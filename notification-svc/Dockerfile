FROM node:18-alpine

WORKDIR /app

COPY notification-svc/package*.json ./notification-svc/
RUN cd notification-svc && npm install

COPY notification-svc/ ./notification-svc/
COPY proto/ ./proto/

WORKDIR /app/notification-svc

RUN npm run build

EXPOSE 50052

CMD ["node", "dist/index.js"]
