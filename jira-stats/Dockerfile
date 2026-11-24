# Build stage for frontend
FROM --platform=linux/amd64 node:20-alpine as frontend-build

WORKDIR /app/frontend

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY src/ ./src/
COPY index.html ./
COPY vite.config.js ./

# Build frontend
RUN npm run build

# Production stage for backend
FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm install cors

# Copy backend source code
COPY server.js ./

# Copy built frontend from build stage
COPY --from=frontend-build /app/frontend/dist ./dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 