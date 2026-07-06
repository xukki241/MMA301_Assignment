FROM node:18-alpine

WORKDIR /app

COPY core-api/package*.json ./core-api/
RUN cd core-api && npm install

COPY core-api/ ./core-api/
COPY proto/ ./proto/

WORKDIR /app/core-api

RUN npm run build

EXPOSE 3002

CMD ["node", "dist/index.js"]
