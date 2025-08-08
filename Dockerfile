# Multi-stage build for the helpdesk system

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Build the backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Install Encore CLI
RUN npm install -g @encore.dev/cli

# Copy backend source code
COPY backend/ ./backend/

# Copy frontend build to backend static directory
COPY --from=frontend-builder /app/frontend/dist ./backend/static/

# Stage 3: Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install Encore CLI
RUN npm install -g @encore.dev/cli

# Copy backend code and built frontend
COPY --from=backend-builder /app/backend ./backend/

# Create non-root user
RUN addgroup -g 1001 -S encore && \
    adduser -S encore -u 1001

# Change ownership of the app directory
RUN chown -R encore:encore /app

# Switch to non-root user
USER encore

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start the application
CMD ["encore", "run", "--port", "4000"]
