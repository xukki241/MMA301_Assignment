FROM node:18-alpine

WORKDIR /app

# Copy proto directory
COPY proto/ ./proto/

# Copy core-api files
COPY core-api/package*.json ./core-api/
RUN cd core-api && npm install --production

COPY core-api/ ./core-api/

WORKDIR /app/core-api

EXPOSE 3002

CMD ["npm", "start"]
