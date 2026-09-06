FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies and pre-built distribution from the runner
COPY --chown=node:node node_modules ./node_modules
COPY --chown=node:node dist ./dist
COPY --chown=node:node package.json ./

# Prepare persistent data volume folder with proper non-root permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

# Switch to non-root user for security
USER node

# Expose application port
EXPOSE 3000

# Health check to ensure Express API and UI are responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

# Start production server
CMD ["node", "dist/server.cjs"]

