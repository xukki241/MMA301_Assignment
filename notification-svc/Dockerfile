FROM node:18-alpine

WORKDIR /app

# Copy proto directory
COPY proto/ ./proto/

# Copy notification-svc files
COPY notification-svc/package*.json ./notification-svc/
RUN cd notification-svc && npm install --production

COPY notification-svc/ ./notification-svc/

WORKDIR /app/notification-svc

EXPOSE 50051

CMD ["npm", "start"]
