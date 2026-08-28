# ==========================================
# 1. Builder Stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build Vite frontend and bundled Express server (into /app/dist)
RUN npm run build

# ==========================================
# 2. Production Runner Stage
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install wget for healthcheck (included in alpine)
RUN apk add --no-cache wget

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built distribution artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Set file ownership to non-root node user
RUN chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose application port
EXPOSE 3000

# Health check to ensure Express API and UI are responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

# Start production server
CMD ["node", "dist/server.cjs"]
