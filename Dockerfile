# Multi-stage hardened Dockerfile for WichtlAG
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
RUN npm ci

# Copy source code and build client bundle
COPY . .
RUN npm run build

# Production runtime stage (Hardened & Rootless)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend dist and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public

# Prepare data directory and set ownership to unprivileged 'node' user
RUN mkdir -p /app/data && chown -R node:node /app

# Run as non-root user for security
USER node

# Persistent storage volume for SQLite database and uploaded images
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server/index.js"]
