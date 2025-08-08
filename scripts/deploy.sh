#!/bin/bash

# Production deployment script

set -e

echo "🚀 Deploying Helpdesk System to production..."

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
BACKUP_DIR="backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    log_error ".env file not found. Please create it first."
    log_info "You can copy from .env.example: cp .env.example .env"
    exit 1
fi

# Check if required environment variables are set
source $ENV_FILE
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
    log_error "JWT_SECRET is not properly configured in .env file"
    log_info "Generate a secure JWT secret with: openssl rand -base64 32"
    exit 1
fi

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Create backup before deployment
log_info "Creating pre-deployment backup..."
mkdir -p $BACKUP_DIR
if docker-compose ps | grep -q "helpdesk-postgres.*Up"; then
    BACKUP_FILE="pre_deploy_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T postgres pg_dump -U helpdesk_user helpdesk > "$BACKUP_DIR/$BACKUP_FILE"
    log_info "Backup created: $BACKUP_DIR/$BACKUP_FILE"
else
    log_warn "Database not running, skipping backup"
fi

# Pull latest images
log_info "Pulling latest images..."
docker-compose pull

# Build the application
log_info "Building application..."
if [ -f "$PROD_COMPOSE_FILE" ]; then
    docker-compose -f $COMPOSE_FILE -f $PROD_COMPOSE_FILE build --no-cache
else
    docker-compose build --no-cache
fi

# Stop existing containers gracefully
log_info "Stopping existing containers..."
if [ -f "$PROD_COMPOSE_FILE" ]; then
    docker-compose -f $COMPOSE_FILE -f $PROD_COMPOSE_FILE down --timeout 30
else
    docker-compose down --timeout 30
fi

# Start the application
log_info "Starting application..."
if [ -f "$PROD_COMPOSE_FILE" ]; then
    docker-compose -f $COMPOSE_FILE -f $PROD_COMPOSE_FILE up -d
else
    docker-compose up -d
fi

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 30

# Health checks
log_info "Performing health checks..."
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=5
ELAPSED=0

while [ $ELAPSED -lt $HEALTH_CHECK_TIMEOUT ]; do
    if docker-compose ps | grep -q "unhealthy"; then
        log_warn "Some services are still starting up... (${ELAPSED}s elapsed)"
        sleep $HEALTH_CHECK_INTERVAL
        ELAPSED=$((ELAPSED + HEALTH_CHECK_INTERVAL))
    else
        break
    fi
done

# Final health check
if docker-compose ps | grep -q "unhealthy"; then
    log_error "Some services are unhealthy after ${HEALTH_CHECK_TIMEOUT}s. Check logs:"
    docker-compose logs --tail=50
    exit 1
fi

# Test application endpoints
log_info "Testing application endpoints..."
if command -v curl &> /dev/null; then
    if curl -f -s http://localhost/health > /dev/null; then
        log_info "Health check endpoint is responding"
    else
        log_warn "Health check endpoint is not responding"
    fi
else
    log_warn "curl not available, skipping endpoint tests"
fi

# Display deployment information
log_info "Deployment completed successfully!"
echo ""
echo "🌐 Application URLs:"
echo "   - Main application: http://localhost"
echo "   - HTTPS (if configured): https://localhost"
echo ""
echo "📊 Admin tools:"
echo "   - Database (PgAdmin): http://localhost:8080"
echo "   - Redis (Commander): http://localhost:8081"
if [ -f "$PROD_COMPOSE_FILE" ]; then
    echo "   - Monitoring (Grafana): http://localhost:3001"
    echo "   - Metrics (Prometheus): http://localhost:9090"
fi
echo ""
echo "🔧 Management commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop application: docker-compose down"
echo "   - Restart application: docker-compose restart"
echo ""
echo "📋 Default credentials:"
echo "   - Admin: admin / admin123"
echo "   - Admin: haryanto / P@ssw0rd"

# Optional: Send deployment notification
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚀 Helpdesk System deployed successfully!"}' \
        $SLACK_WEBHOOK_URL
fi

log_info "Deployment script completed!"
