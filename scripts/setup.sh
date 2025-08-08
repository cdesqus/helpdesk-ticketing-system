#!/bin/bash

# IDESOLUSI Helpdesk System Setup Script

set -e

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

echo "🚀 Setting up IDESOLUSI Helpdesk System..."
echo "=================================================="

# Check system requirements
log_step "Checking system requirements..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check Docker daemon
if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Please start Docker first."
    exit 1
fi

log_info "✅ Docker and Docker Compose are available"

# Create necessary directories
log_step "Creating project directories..."
mkdir -p docker/nginx/ssl
mkdir -p docker/prometheus
mkdir -p docker/grafana/provisioning
mkdir -p uploads
mkdir -p logs
mkdir -p backups

log_info "✅ Directories created"

# Generate SSL certificates for development (self-signed)
log_step "Generating SSL certificates for development..."
if [ ! -f docker/nginx/ssl/cert.pem ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/nginx/ssl/key.pem \
        -out docker/nginx/ssl/cert.pem \
        -subj "/C=ID/ST=Jakarta/L=Jakarta/O=IDESOLUSI/CN=localhost" \
        2>/dev/null
    log_info "✅ SSL certificates generated"
else
    log_info "✅ SSL certificates already exist"
fi

# Generate secure JWT secret
log_step "Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    log_step "Creating environment file..."
    cat > .env << EOF
# IDESOLUSI Helpdesk System Environment Configuration
# Generated on $(date)

# ==============================================
# DATABASE CONFIGURATION
# ==============================================
DATABASE_URL=postgres://helpdesk_user:helpdesk_password@postgres:5432/helpdesk

# ==============================================
# REDIS CONFIGURATION
# ==============================================
REDIS_URL=redis://:helpdesk_redis_password@redis:6379

# ==============================================
# SECURITY CONFIGURATION
# ==============================================
JWT_SECRET=${JWT_SECRET}

# ==============================================
# SMTP EMAIL CONFIGURATION (Optional)
# ==============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ==============================================
# APPLICATION SETTINGS
# ==============================================
NODE_ENV=production
PORT=4000

# ==============================================
# BACKUP CONFIGURATION
# ==============================================
BACKUP_RETENTION_DAYS=30

# ==============================================
# PRODUCTION PASSWORDS (Change these!)
# ==============================================
POSTGRES_PASSWORD=helpdesk_password_$(openssl rand -hex 8)
REDIS_PASSWORD=helpdesk_redis_password_$(openssl rand -hex 8)
GRAFANA_PASSWORD=admin123_$(openssl rand -hex 4)
EOF
    log_info "✅ Environment file created"
else
    log_warn "⚠️  Environment file already exists, skipping creation"
fi

# Create Prometheus configuration
log_step "Creating monitoring configuration..."
if [ ! -f docker/prometheus/prometheus.yml ]; then
    cat > docker/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'helpdesk-app'
    static_configs:
      - targets: ['helpdesk-app:4000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:8080']
    metrics_path: '/nginx-status'
    scrape_interval: 30s
EOF
    log_info "✅ Prometheus configuration created"
fi

# Set proper permissions
log_step "Setting file permissions..."
chmod +x scripts/*.sh
chmod 600 docker/nginx/ssl/key.pem 2>/dev/null || true
chmod 644 docker/nginx/ssl/cert.pem 2>/dev/null || true
chmod 755 uploads logs backups

log_info "✅ Permissions set"

# Create backup cron script
log_step "Setting up backup automation..."
if [ ! -f scripts/backup-cron.sh ]; then
    log_warn "⚠️  Backup cron script not found, creating basic version..."
    cat > scripts/backup-cron.sh << 'EOF'
#!/bin/sh
set -e
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR
pg_dump -h postgres -U helpdesk_user -d helpdesk > "${BACKUP_DIR}/helpdesk_backup_${TIMESTAMP}.sql"
gzip "${BACKUP_DIR}/helpdesk_backup_${TIMESTAMP}.sql"
find $BACKUP_DIR -name "helpdesk_backup_*.sql.gz" -mtime +30 -delete
EOF
    chmod +x scripts/backup-cron.sh
fi

# Display setup completion
echo ""
echo "=================================================="
log_info "🎉 Setup completed successfully!"
echo "=================================================="
echo ""
echo "🎯 Next steps:"
echo "1. Review and update .env file with your SMTP settings (optional)"
echo "2. Run 'docker-compose up -d' to start the application"
echo "3. Access the application at http://localhost"
echo "4. For HTTPS: https://localhost (self-signed certificate)"
echo ""
echo "🔐 Default admin credentials:"
echo "   - Username: admin / Password: admin123"
echo "   - Username: haryanto / Password: P@ssw0rd"
echo ""
echo "📊 Development tools:"
echo "   - PgAdmin: http://localhost:8080"
echo "     (admin@helpdesk.local / admin123)"
echo "   - Redis Commander: http://localhost:8081"
echo ""
echo "🔧 Useful commands:"
echo "   - Start: docker-compose up -d"
echo "   - Stop: docker-compose down"
echo "   - Logs: docker-compose logs -f"
echo "   - Development mode: docker-compose -f docker-compose.dev.yml up -d"
echo "   - Production deploy: ./scripts/deploy.sh"
echo ""
echo "📁 Important files:"
echo "   - Configuration: .env"
echo "   - SSL certificates: docker/nginx/ssl/"
echo "   - Backups: backups/"
echo "   - Logs: logs/"
echo ""
echo "⚠️  Security reminders:"
echo "   - Change default passwords in production"
echo "   - Update SMTP settings for email notifications"
echo "   - Replace self-signed SSL certificates with valid ones"
echo "   - Review and update security headers in nginx.conf"
echo ""
log_info "Ready to deploy! Run 'docker-compose up -d' to start."
