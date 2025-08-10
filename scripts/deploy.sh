#!/bin/bash

# Production deployment script for self-hosted environments

set -e

echo "🚀 Deploying IDESOLUSI Helpdesk System..."

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
BACKUP_DIR="backups"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Change to project directory
cd "$PROJECT_DIR"

# Pre-deployment checks
log_step "Running pre-deployment checks..."

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

# Check for production passwords
if [ -z "$POSTGRES_PASSWORD" ] || [[ "$POSTGRES_PASSWORD" == *"change_this_in_production"* ]]; then
    log_warn "POSTGRES_PASSWORD should be changed for production"
fi

if [ -z "$REDIS_PASSWORD" ] || [[ "$REDIS_PASSWORD" == *"change_this_in_production"* ]]; then
    log_warn "REDIS_PASSWORD should be changed for production"
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

# Check Docker daemon
if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Please start Docker first."
    exit 1
fi

log_info "✅ Pre-deployment checks passed"

# Create necessary directories
log_step "Creating necessary directories..."
mkdir -p $BACKUP_DIR
mkdir -p docker/nginx/ssl
mkdir -p docker/prometheus
mkdir -p docker/grafana/provisioning
mkdir -p docker/loki
mkdir -p docker/promtail
mkdir -p uploads
mkdir -p logs

# Generate SSL certificates if they don't exist
log_step "Checking SSL certificates..."
if [ ! -f docker/nginx/ssl/cert.pem ] || [ ! -f docker/nginx/ssl/key.pem ]; then
    log_info "Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/nginx/ssl/key.pem \
        -out docker/nginx/ssl/cert.pem \
        -subj "/C=ID/ST=Jakarta/L=Jakarta/O=IDESOLUSI/CN=${DOMAIN_NAME:-localhost}" \
        2>/dev/null
    log_info "✅ SSL certificates generated"
else
    log_info "✅ SSL certificates already exist"
fi

# Create backup before deployment
log_step "Creating pre-deployment backup..."
if docker-compose ps | grep -q "helpdesk-postgres.*Up"; then
    BACKUP_FILE="pre_deploy_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T postgres pg_dump -U helpdesk_user helpdesk > "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null || true
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        log_info "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE"
    else
        log_warn "⚠️  Backup creation failed or database not accessible"
    fi
else
    log_warn "⚠️  Database not running, skipping backup"
fi

# Pull latest images
log_step "Pulling latest images..."
docker-compose pull

# Build the application
log_step "Building application..."
if [ -f "$PROD_COMPOSE_FILE" ]; then
    docker-compose -f $COMPOSE_FILE -f $PROD_COMPOSE_FILE build --no-cache
else
    docker-compose build --no-cache
fi

# Stop existing containers gracefully
log_step "Stopping existing containers..."
if [ -f "$PROD_COMPOSE_FILE" ]; then
    docker-compose -f $COMPOSE_FILE -f $PROD_COMPOSE_FILE down --timeout 30
else
    docker-compose down --timeout 30
fi

# Clean up unused Docker resources
log_step "Cleaning up Docker resources..."
docker system prune -f --volumes

# Start the application
log_step "Starting application..."
if [ -f "$PROD_COMPOSE_FILE" ]; then
    docker-compose -f $COMPOSE_FILE -f $PROD_COMPOSE_FILE up -d
else
    docker-compose up -d
fi

# Wait for services to be ready
log_step "Waiting for services to be ready..."
sleep 30

# Health checks
log_step "Performing health checks..."
HEALTH_CHECK_TIMEOUT=180
HEALTH_CHECK_INTERVAL=10
ELAPSED=0

while [ $ELAPSED -lt $HEALTH_CHECK_TIMEOUT ]; do
    if docker-compose ps | grep -q "unhealthy\|starting"; then
        log_info "Services are still starting up... (${ELAPSED}s elapsed)"
        sleep $HEALTH_CHECK_INTERVAL
        ELAPSED=$((ELAPSED + HEALTH_CHECK_INTERVAL))
    else
        break
    fi
done

# Final health check
UNHEALTHY_SERVICES=$(docker-compose ps --filter "health=unhealthy" --format "table {{.Service}}")
if [ ! -z "$UNHEALTHY_SERVICES" ] && [ "$UNHEALTHY_SERVICES" != "SERVICE" ]; then
    log_error "Some services are unhealthy after ${HEALTH_CHECK_TIMEOUT}s:"
    echo "$UNHEALTHY_SERVICES"
    log_info "Checking logs for unhealthy services..."
    docker-compose logs --tail=50
    log_warn "Deployment completed but some services may not be fully ready"
else
    log_info "✅ All services are healthy"
fi

# Test application endpoints
log_step "Testing application endpoints..."
if command -v curl &> /dev/null; then
    # Test health endpoint
    if curl -f -s http://localhost/health > /dev/null 2>&1; then
        log_info "✅ Health check endpoint is responding"
    else
        log_warn "⚠️  Health check endpoint is not responding"
    fi
    
    # Test main application
    if curl -f -s http://localhost > /dev/null 2>&1; then
        log_info "✅ Main application is responding"
    else
        log_warn "⚠️  Main application is not responding"
    fi
else
    log_warn "⚠️  curl not available, skipping endpoint tests"
fi

# Set up log rotation
log_step "Setting up log rotation..."
cat > /tmp/helpdesk-logrotate << 'EOF'
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        docker kill --signal="USR1" $(docker ps -q) 2>/dev/null || true
    endscript
}
EOF

if [ -d /etc/logrotate.d ]; then
    sudo cp /tmp/helpdesk-logrotate /etc/logrotate.d/helpdesk 2>/dev/null || log_warn "⚠️  Could not set up log rotation (requires sudo)"
fi

# Display deployment information
echo ""
echo "=================================================="
log_info "🎉 Deployment completed successfully!"
echo "=================================================="
echo ""
echo "🌐 Application URLs:"
echo "   - Main application: http://localhost"
if [ -f docker/nginx/ssl/cert.pem ]; then
    echo "   - HTTPS: https://localhost (self-signed certificate)"
fi
if [ ! -z "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" != "localhost" ]; then
    echo "   - Production URL: https://${DOMAIN_NAME}"
fi
echo ""
echo "📊 Admin tools:"
echo "   - Database (direct): localhost:5432"
echo "   - Redis (direct): localhost:6379"
if [ -f "$PROD_COMPOSE_FILE" ]; then
    echo "   - Monitoring (Grafana): http://localhost:3001"
    echo "   - Metrics (Prometheus): http://localhost:9090"
fi
echo ""
echo "🔧 Management commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop application: docker-compose down"
echo "   - Restart application: docker-compose restart"
echo "   - Update application: ./scripts/deploy.sh"
echo "   - Backup database: ./scripts/backup.sh"
echo ""
echo "📋 Default credentials:"
echo "   - Admin: admin / admin123"
echo "   - Admin: haryanto / P@ssw0rd"
echo ""
echo "🔒 Security recommendations:"
echo "   - Change default passwords in production"
echo "   - Update SMTP settings for email notifications"
echo "   - Replace self-signed SSL certificates with valid ones"
echo "   - Review firewall settings"
echo "   - Set up regular backups"
echo ""
echo "📈 Monitoring (if enabled):"
if [ -f "$PROD_COMPOSE_FILE" ]; then
    echo "   - Grafana admin: admin / ${GRAFANA_PASSWORD:-admin123}"
    echo "   - Prometheus: http://localhost:9090"
    echo "   - System metrics: http://localhost:9100"
fi
echo ""
echo "💾 Storage locations:"
echo "   - Database: Docker volume 'postgres_data'"
echo "   - Uploads: Docker volume 'app_uploads'"
echo "   - Logs: Docker volume 'app_logs'"
echo "   - Backups: ./backups/"
echo ""

# Display resource usage
log_step "Current resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -10

# Optional: Send deployment notification
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 IDESOLUSI Helpdesk System deployed successfully on $(hostname)!\"}" \
        $SLACK_WEBHOOK_URL 2>/dev/null || log_warn "⚠️  Failed to send Slack notification"
fi

# Optional: Send email notification
if [ ! -z "$ADMIN_EMAIL" ] && command -v mail &> /dev/null; then
    echo "IDESOLUSI Helpdesk System has been deployed successfully on $(hostname) at $(date)" | \
        mail -s "Helpdesk Deployment Successful" $ADMIN_EMAIL 2>/dev/null || log_warn "⚠️  Failed to send email notification"
fi

log_info "🎯 Deployment script completed!"
echo "🔗 Access your helpdesk at: http://localhost"
