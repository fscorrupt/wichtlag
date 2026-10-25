# Multi-stage hardened Dockerfile for WichtlAG
FROM node:22-alpine AS builder

WORKDIR /app

# Install native build tools for compiling better-sqlite3 on Alpine
RUN apk add --no-cache python3 make g++

# Copy dependency definitions and install all modules
COPY package*.json ./
RUN npm ci

# Copy source files and build client bundle
COPY . .
RUN npm run build

# Prune devDependencies to keep only production modules with compiled binaries
RUN npm prune --omit=dev

# Production runtime stage (Hardened & Rootless)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Ensure runtime C++ library is present for compiled native modules
RUN apk add --no-cache libstdc++

# Copy production node_modules from builder (no build tools needed in runner)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
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
