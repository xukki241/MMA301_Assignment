FROM node:18-alpine

WORKDIR /app

# Copy proto directory
COPY proto/ ./proto/

# Copy worker files
COPY worker/package*.json ./worker/
RUN cd worker && npm install --production

COPY worker/ ./worker/

WORKDIR /app/worker

CMD ["npm", "start"]
