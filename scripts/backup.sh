#!/bin/bash

# Enhanced backup script for self-hosted Helpdesk System

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="helpdesk_backup_${TIMESTAMP}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Change to project directory
cd "$PROJECT_DIR"

echo "🗄️  Creating comprehensive backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Check if services are running
if ! docker-compose ps | grep -q "helpdesk-postgres.*Up"; then
    log_error "PostgreSQL container is not running"
    exit 1
fi

# Backup database
log_info "📊 Backing up database..."
if docker-compose exec -T postgres pg_dump -U helpdesk_user helpdesk > "${BACKUP_DIR}/${BACKUP_FILE}.sql"; then
    log_info "✅ Database backup completed"
else
    log_error "❌ Database backup failed"
    exit 1
fi

# Backup uploads
log_info "📁 Backing up uploads..."
if docker volume inspect helpdesk_app_uploads >/dev/null 2>&1; then
    docker run --rm -v helpdesk_app_uploads:/source -v "$(pwd)/${BACKUP_DIR}:/backup" alpine \
        tar -czf "/backup/${BACKUP_FILE}_uploads.tar.gz" -C /source .
    log_info "✅ Uploads backup completed"
else
    log_warn "⚠️  Uploads volume not found, skipping"
fi

# Backup configuration
log_info "⚙️  Backing up configuration..."
tar -czf "${BACKUP_DIR}/${BACKUP_FILE}_config.tar.gz" \
    .env \
    docker/ \
    --exclude=docker/nginx/ssl/key.pem \
    --exclude=docker/*/data \
    2>/dev/null || log_warn "⚠️  Some configuration files may be missing"

# Backup SSL certificates (if custom)
if [ -f docker/nginx/ssl/cert.pem ] && [ -f docker/nginx/ssl/key.pem ]; then
    log_info "🔒 Backing up SSL certificates..."
    tar -czf "${BACKUP_DIR}/${BACKUP_FILE}_ssl.tar.gz" docker/nginx/ssl/
    log_info "✅ SSL certificates backup completed"
fi

# Create backup manifest
log_info "📋 Creating backup manifest..."
cat > "${BACKUP_DIR}/${BACKUP_FILE}_manifest.txt" << EOF
IDESOLUSI Helpdesk System Backup
================================
Backup Date: $(date)
Backup ID: ${BACKUP_FILE}
Server: $(hostname)
Docker Version: $(docker --version)
Docker Compose Version: $(docker-compose --version)

Files Included:
- ${BACKUP_FILE}.sql (Database dump)
- ${BACKUP_FILE}_uploads.tar.gz (Uploaded files)
- ${BACKUP_FILE}_config.tar.gz (Configuration files)
- ${BACKUP_FILE}_ssl.tar.gz (SSL certificates)
- ${BACKUP_FILE}_manifest.txt (This file)

Database Info:
$(docker-compose exec -T postgres psql -U helpdesk_user helpdesk -c "\l" 2>/dev/null || echo "Database info unavailable")

Container Status:
$(docker-compose ps)

System Info:
- OS: $(uname -a)
- Disk Usage: $(df -h .)
- Memory: $(free -h | head -2)
EOF

# Calculate backup sizes
log_info "📏 Calculating backup sizes..."
DB_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.sql" 2>/dev/null | cut -f1 || echo "N/A")
UPLOADS_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}_uploads.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")
CONFIG_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}_config.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")
SSL_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}_ssl.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")

# Compress database backup
log_info "🗜️  Compressing database backup..."
gzip "${BACKUP_DIR}/${BACKUP_FILE}.sql"
COMPRESSED_DB_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" | cut -f1)

# Verify backup integrity
log_info "🔍 Verifying backup integrity..."
if gunzip -t "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz"; then
    log_info "✅ Database backup integrity verified"
else
    log_error "❌ Database backup integrity check failed"
    exit 1
fi

# Optional: Upload to cloud storage
if [ ! -z "$AWS_S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
    log_info "☁️  Uploading to AWS S3..."
    aws s3 sync "${BACKUP_DIR}/" "s3://${AWS_S3_BUCKET}/backups/" --exclude "*" --include "${BACKUP_FILE}*"
    log_info "✅ S3 upload completed"
fi

# Clean up old backups
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
log_info "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "helpdesk_backup_*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Display results
echo ""
echo "✅ Backup completed successfully!"
echo "=================================="
echo "📦 Backup ID: ${BACKUP_FILE}"
echo "📁 Location: ${BACKUP_DIR}/"
echo ""
echo "📊 File sizes:"
echo "   - Database: ${COMPRESSED_DB_SIZE} (compressed)"
echo "   - Uploads: ${UPLOADS_SIZE}"
echo "   - Configuration: ${CONFIG_SIZE}"
echo "   - SSL Certificates: ${SSL_SIZE}"
echo ""
echo "📋 Files created:"
echo "   - ${BACKUP_FILE}.sql.gz (database)"
echo "   - ${BACKUP_FILE}_uploads.tar.gz (uploaded files)"
echo "   - ${BACKUP_FILE}_config.tar.gz (configuration)"
echo "   - ${BACKUP_FILE}_ssl.tar.gz (SSL certificates)"
echo "   - ${BACKUP_FILE}_manifest.txt (backup info)"
echo ""
echo "🔄 To restore this backup:"
echo "   ./scripts/restore.sh ${TIMESTAMP}"
echo ""

# Send notification if configured
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Helpdesk backup completed: ${BACKUP_FILE} (DB: ${COMPRESSED_DB_SIZE})\"}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || log_warn "⚠️  Slack notification failed"
fi

log_info "🎯 Backup process completed!"
