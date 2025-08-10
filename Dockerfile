# Multi-stage build for the helpdesk system

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies
RUN apk add --no-cache git

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Build the backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Install Encore CLI
RUN npm install -g @encore.dev/cli@latest

# Copy backend source code
COPY backend/ ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --only=production

# Copy frontend build to backend static directory
COPY --from=frontend-builder /app/frontend/dist ./static/

# Stage 3: Production image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    postgresql-client \
    redis \
    tzdata \
    ca-certificates \
    dumb-init

# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Install Encore CLI
RUN npm install -g @encore.dev/cli@latest

# Copy backend code and built frontend
COPY --from=backend-builder /app/backend ./backend/

# Create directories
RUN mkdir -p /app/uploads /app/logs /app/backups

# Create non-root user
RUN addgroup -g 1001 -S encore && \
    adduser -S encore -u 1001 -G encore

# Change ownership of the app directory
RUN chown -R encore:encore /app

# Switch to non-root user
USER encore

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the application with dumb-init
WORKDIR /app/backend
ENTRYPOINT ["dumb-init", "--"]
CMD ["encore", "run", "--port", "4000", "--listen", "0.0.0.0:4000"]

# Stage 4: Development image
FROM node:18-alpine AS development

# Install system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    postgresql-client \
    redis \
    git \
    python3 \
    make \
    g++ \
    dumb-init

WORKDIR /app

# Install Encore CLI
RUN npm install -g @encore.dev/cli@latest

# Create directories
RUN mkdir -p /app/uploads /app/logs

# Create non-root user
RUN addgroup -g 1001 -S encore && \
    adduser -S encore -u 1001 -G encore

# Change ownership
RUN chown -R encore:encore /app

# Switch to non-root user
USER encore

# Expose ports
EXPOSE 4000 3000

# Development command with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "cd backend && encore run --port 4000 --listen 0.0.0.0:4000"]
