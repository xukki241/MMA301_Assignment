FROM node:18-alpine

WORKDIR /app

COPY admin-web/package*.json ./admin-web/

# Install dependencies (including devDependencies for build)
RUN cd admin-web && npm install

COPY admin-web/ ./admin-web/

# Compile the React application
RUN cd admin-web && npm run build

WORKDIR /app/admin-web

EXPOSE 3000

CMD ["npm", "start"]
