FROM node:18-alpine

WORKDIR /app

COPY auth-service/package*.json ./auth-service/

RUN cd auth-service && npm install --production

COPY auth-service/ ./auth-service/
COPY proto/ ./proto/

WORKDIR /app/auth-service

EXPOSE 3001
EXPOSE 50051

CMD ["npm", "start"]
