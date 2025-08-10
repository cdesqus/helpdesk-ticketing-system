#!/bin/bash

# IDESOLUSI Helpdesk System Setup Script for Self-Hosting

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

echo "🚀 Setting up IDESOLUSI Helpdesk System for Self-Hosting..."
echo "============================================================"

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

# Check available disk space (minimum 5GB recommended)
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
REQUIRED_SPACE=5242880  # 5GB in KB
if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
    log_warn "⚠️  Available disk space is less than 5GB. Consider freeing up space."
fi

# Check available memory (minimum 2GB recommended)
AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$AVAILABLE_MEM" -lt 2048 ]; then
    log_warn "⚠️  Available memory is less than 2GB. Performance may be affected."
fi

log_info "✅ Docker and Docker Compose are available"

# Create necessary directories
log_step "Creating project directories..."
mkdir -p docker/nginx/ssl
mkdir -p docker/prometheus
mkdir -p docker/grafana/provisioning/dashboards
mkdir -p docker/grafana/provisioning/datasources
mkdir -p docker/loki
mkdir -p docker/promtail
mkdir -p uploads
mkdir -p logs
mkdir -p backups

log_info "✅ Directories created"

# Generate SSL certificates for development (self-signed)
log_step "Generating SSL certificates..."
if [ ! -f docker/nginx/ssl/cert.pem ]; then
    # Prompt for domain name
    read -p "Enter your domain name (or press Enter for localhost): " DOMAIN_NAME
    DOMAIN_NAME=${DOMAIN_NAME:-localhost}
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/nginx/ssl/key.pem \
        -out docker/nginx/ssl/cert.pem \
        -subj "/C=ID/ST=Jakarta/L=Jakarta/O=IDESOLUSI/CN=${DOMAIN_NAME}" \
        2>/dev/null
    log_info "✅ SSL certificates generated for ${DOMAIN_NAME}"
else
    log_info "✅ SSL certificates already exist"
fi

# Generate secure passwords and secrets
log_step "Generating secure passwords and secrets..."
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD="helpdesk_pg_$(openssl rand -hex 12)"
REDIS_PASSWORD="helpdesk_redis_$(openssl rand -hex 12)"
GRAFANA_PASSWORD="admin_$(openssl rand -hex 8)"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    log_step "Creating environment file..."
    cat > .env << EOF
# IDESOLUSI Helpdesk System Environment Configuration
# Generated on $(date) for $(hostname)

# ==============================================
# DATABASE CONFIGURATION
# ==============================================
DATABASE_URL=postgres://helpdesk_user:${POSTGRES_PASSWORD}@postgres:5432/helpdesk
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# ==============================================
# REDIS CONFIGURATION
# ==============================================
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# ==============================================
# SECURITY CONFIGURATION
# ==============================================
JWT_SECRET=${JWT_SECRET}

# ==============================================
# SMTP EMAIL CONFIGURATION (Optional)
# ==============================================
# Configure these for email notifications
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
# DOMAIN & SSL CONFIGURATION
# ==============================================
DOMAIN_NAME=${DOMAIN_NAME:-localhost}

# ==============================================
# BACKUP CONFIGURATION
# ==============================================
BACKUP_RETENTION_DAYS=30

# ==============================================
# MONITORING CONFIGURATION
# ==============================================
GRAFANA_PASSWORD=${GRAFANA_PASSWORD}
LOG_LEVEL=info
ENABLE_METRICS=true

# ==============================================
# OPTIONAL CLOUD STORAGE
# ==============================================
# Uncomment and configure for cloud backups
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_S3_BUCKET=your-backup-bucket
# AWS_REGION=us-east-1

# ==============================================
# NOTIFICATION SETTINGS
# ==============================================
# Uncomment and configure for notifications
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
# ADMIN_EMAIL=admin@your-domain.com
EOF
    log_info "✅ Environment file created with secure passwords"
else
    log_warn "⚠️  Environment file already exists, skipping creation"
fi

# Create Grafana datasource configuration
log_step "Creating monitoring configuration..."
if [ ! -f docker/grafana/provisioning/datasources/datasource.yml ]; then
    cat > docker/grafana/provisioning/datasources/datasource.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
EOF
    log_info "✅ Grafana datasource configuration created"
fi

if [ ! -f docker/grafana/provisioning/dashboards/dashboard.yml ]; then
    cat > docker/grafana/provisioning/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF
    log_info "✅ Grafana dashboard configuration created"
fi

# Set proper permissions
log_step "Setting file permissions..."
chmod +x scripts/*.sh
chmod 600 docker/nginx/ssl/key.pem 2>/dev/null || true
chmod 644 docker/nginx/ssl/cert.pem 2>/dev/null || true
chmod 755 uploads logs backups
chmod 644 .env

log_info "✅ Permissions set"

# Create backup cron script
log_step "Setting up backup automation..."
if [ ! -f scripts/backup-cron.sh ]; then
    cat > scripts/backup-cron.sh << 'EOF'
#!/bin/sh
set -e
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

echo "$(date): Starting automated backup..."
mkdir -p $BACKUP_DIR

# Backup database
echo "$(date): Backing up database..."
pg_dump -h postgres -U helpdesk_user -d helpdesk > "${BACKUP_DIR}/helpdesk_backup_${TIMESTAMP}.sql"

# Compress backup
echo "$(date): Compressing backup..."
gzip "${BACKUP_DIR}/helpdesk_backup_${TIMESTAMP}.sql"

# Clean up old backups
echo "$(date): Cleaning up old backups..."
find $BACKUP_DIR -name "helpdesk_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "$(date): Backup completed: helpdesk_backup_${TIMESTAMP}.sql.gz"

# Optional: Upload to cloud storage
if [ ! -z "$AWS_S3_BUCKET" ]; then
    echo "$(date): Uploading to S3..."
    aws s3 cp "${BACKUP_DIR}/helpdesk_backup_${TIMESTAMP}.sql.gz" "s3://${AWS_S3_BUCKET}/backups/" || echo "$(date): S3 upload failed"
fi
EOF
    chmod +x scripts/backup-cron.sh
    log_info "✅ Backup automation script created"
fi

# Create systemd service for auto-start (optional)
log_step "Creating systemd service (optional)..."
if command -v systemctl &> /dev/null; then
    cat > /tmp/helpdesk.service << EOF
[Unit]
Description=IDESOLUSI Helpdesk System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    if sudo cp /tmp/helpdesk.service /etc/systemd/system/ 2>/dev/null; then
        sudo systemctl daemon-reload
        log_info "✅ Systemd service created. Enable with: sudo systemctl enable helpdesk"
    else
        log_warn "⚠️  Could not create systemd service (requires sudo)"
    fi
fi

# Create firewall rules (optional)
log_step "Checking firewall configuration..."
if command -v ufw &> /dev/null; then
    log_info "UFW detected. Consider running these commands to configure firewall:"
    echo "  sudo ufw allow 80/tcp    # HTTP"
    echo "  sudo ufw allow 443/tcp   # HTTPS"
    echo "  sudo ufw allow 22/tcp    # SSH (if needed)"
elif command -v firewall-cmd &> /dev/null; then
    log_info "Firewalld detected. Consider running these commands to configure firewall:"
    echo "  sudo firewall-cmd --permanent --add-service=http"
    echo "  sudo firewall-cmd --permanent --add-service=https"
    echo "  sudo firewall-cmd --reload"
else
    log_warn "⚠️  No firewall detected. Consider configuring iptables or cloud security groups"
fi

# Check for reverse proxy setup
log_step "Checking reverse proxy setup..."
if [ "$DOMAIN_NAME" != "localhost" ]; then
    log_info "For production deployment with domain ${DOMAIN_NAME}:"
    echo "  1. Point your domain DNS to this server's IP address"
    echo "  2. Consider using Let's Encrypt for SSL certificates:"
    echo "     - Install certbot: sudo apt install certbot"
    echo "     - Get certificate: sudo certbot certonly --standalone -d ${DOMAIN_NAME}"
    echo "     - Copy certificates to docker/nginx/ssl/"
    echo "  3. Update nginx configuration for your domain"
fi

# Display setup completion
echo ""
echo "============================================================"
log_info "🎉 Setup completed successfully!"
echo "============================================================"
echo ""
echo "🎯 Next steps:"
echo "1. Review and update .env file with your SMTP settings (optional)"
echo "2. Run './scripts/deploy.sh' to deploy the application"
echo "3. Access the application at http://localhost"
if [ "$DOMAIN_NAME" != "localhost" ]; then
    echo "4. For production: https://${DOMAIN_NAME} (after DNS setup)"
fi
echo ""
echo "🔐 Generated credentials (saved in .env):"
echo "   - Database password: ${POSTGRES_PASSWORD}"
echo "   - Redis password: ${REDIS_PASSWORD}"
echo "   - Grafana admin password: ${GRAFANA_PASSWORD}"
echo ""
echo "🔑 Default application credentials:"
echo "   - Username: admin / Password: admin123"
echo "   - Username: haryanto / Password: P@ssw0rd"
echo ""
echo "📊 Monitoring tools (after deployment):"
echo "   - Grafana: http://localhost:3001 (admin / ${GRAFANA_PASSWORD})"
echo "   - Prometheus: http://localhost:9090"
echo ""
echo "🔧 Management commands:"
echo "   - Deploy: ./scripts/deploy.sh"
echo "   - Backup: ./scripts/backup.sh"
echo "   - Restore: ./scripts/restore.sh <timestamp>"
echo "   - Logs: docker-compose logs -f"
echo "   - Stop: docker-compose down"
echo ""
echo "📁 Important files and directories:"
echo "   - Configuration: .env"
echo "   - SSL certificates: docker/nginx/ssl/"
echo "   - Backups: backups/"
echo "   - Logs: logs/"
echo "   - Uploads: uploads/"
echo ""
echo "🔒 Security checklist for production:"
echo "   ✅ Secure passwords generated"
echo "   ✅ SSL certificates created (self-signed)"
echo "   ⚠️  Update SMTP settings for email notifications"
echo "   ⚠️  Replace self-signed SSL with valid certificates"
echo "   ⚠️  Configure firewall rules"
echo "   ⚠️  Set up regular backups"
echo "   ⚠️  Review and update security headers"
echo ""
echo "🌐 System information:"
echo "   - Hostname: $(hostname)"
echo "   - IP Address: $(hostname -I | awk '{print $1}')"
echo "   - Docker version: $(docker --version)"
echo "   - Docker Compose version: $(docker-compose --version)"
echo "   - Available disk space: $(df -h . | tail -1 | awk '{print $4}')"
echo "   - Available memory: $(free -h | awk 'NR==2{print $7}')"
echo ""
log_info "🚀 Ready to deploy! Run './scripts/deploy.sh' to start the application."
