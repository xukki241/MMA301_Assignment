FROM node:18-alpine

WORKDIR /app

COPY worker/package*.json ./worker/
RUN cd worker && npm install

COPY worker/ ./worker/
COPY proto/ ./proto/

WORKDIR /app/worker

RUN npm run build

CMD ["node", "dist/index.js"]
