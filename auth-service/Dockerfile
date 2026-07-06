FROM node:18-alpine

WORKDIR /app

COPY auth-service/package*.json ./auth-service/
RUN cd auth-service && npm install

COPY auth-service/ ./auth-service/
COPY proto/ ./proto/

WORKDIR /app/auth-service

RUN npm run build

EXPOSE 3001
EXPOSE 50051

CMD ["node", "dist/index.js"]
