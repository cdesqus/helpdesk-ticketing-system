#!/bin/bash

# Enhanced restore script for self-hosted Helpdesk System

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_timestamp>"
    echo "Example: $0 20241201_143000"
    echo ""
    echo "Available backups:"
    ls -la backups/helpdesk_backup_*.sql.gz 2>/dev/null | awk '{print $9}' | sed 's/.*helpdesk_backup_\(.*\)\.sql\.gz/  \1/' || echo "  No backups found"
    exit 1
fi

BACKUP_TIMESTAMP=$1
BACKUP_DIR="backups"
BACKUP_FILE="helpdesk_backup_${BACKUP_TIMESTAMP}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Change to project directory
cd "$PROJECT_DIR"

echo "🔄 Restoring backup from ${BACKUP_TIMESTAMP}..."

# Check if backup files exist
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" ]; then
    log_error "Database backup file not found: ${BACKUP_DIR}/${BACKUP_FILE}.sql.gz"
    echo ""
    echo "Available backups:"
    ls -la backups/helpdesk_backup_*.sql.gz 2>/dev/null | awk '{print $9}' | sed 's/.*helpdesk_backup_\(.*\)\.sql\.gz/  \1/' || echo "  No backups found"
    exit 1
fi

# Show backup information if manifest exists
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}_manifest.txt" ]; then
    log_info "📋 Backup information:"
    cat "${BACKUP_DIR}/${BACKUP_FILE}_manifest.txt" | head -10
    echo ""
fi

# Confirmation prompt
read -p "⚠️  This will replace all current data. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Restore cancelled"
    exit 0
fi

# Create pre-restore backup
log_step "Creating pre-restore backup..."
if docker-compose ps | grep -q "helpdesk-postgres.*Up"; then
    PRE_RESTORE_BACKUP="pre_restore_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T postgres pg_dump -U helpdesk_user helpdesk > "${BACKUP_DIR}/${PRE_RESTORE_BACKUP}" 2>/dev/null || log_warn "⚠️  Pre-restore backup failed"
    if [ -f "${BACKUP_DIR}/${PRE_RESTORE_BACKUP}" ]; then
        gzip "${BACKUP_DIR}/${PRE_RESTORE_BACKUP}"
        log_info "✅ Pre-restore backup created: ${PRE_RESTORE_BACKUP}.gz"
    fi
fi

# Stop the application
log_step "⏹️  Stopping application..."
docker-compose down

# Verify backup integrity
log_step "🔍 Verifying backup integrity..."
if gunzip -t "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz"; then
    log_info "✅ Backup integrity verified"
else
    log_error "❌ Backup integrity check failed"
    exit 1
fi

# Start database service
log_step "🗄️  Starting database service..."
docker-compose up -d postgres redis
sleep 15

# Wait for database to be ready
log_info "⏳ Waiting for database to be ready..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose exec postgres pg_isready -U helpdesk_user -d helpdesk >/dev/null 2>&1; then
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    log_error "❌ Database failed to start within 60 seconds"
    exit 1
fi

log_info "✅ Database is ready"

# Restore database
log_step "📊 Restoring database..."
log_info "Dropping existing database schema..."
docker-compose exec -T postgres psql -U helpdesk_user -d helpdesk -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null

log_info "Restoring database from backup..."
gunzip -c "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" | docker-compose exec -T postgres psql -U helpdesk_user helpdesk >/dev/null

if [ $? -eq 0 ]; then
    log_info "✅ Database restore completed"
else
    log_error "❌ Database restore failed"
    exit 1
fi

# Restore uploads
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}_uploads.tar.gz" ]; then
    log_step "📁 Restoring uploads..."
    
    # Remove existing uploads volume
    docker volume rm helpdesk_app_uploads 2>/dev/null || true
    
    # Create new volume and restore data
    docker volume create helpdesk_app_uploads
    docker run --rm -v helpdesk_app_uploads:/target -v "$(pwd)/${BACKUP_DIR}:/backup" alpine \
        tar -xzf "/backup/${BACKUP_FILE}_uploads.tar.gz" -C /target
    
    log_info "✅ Uploads restore completed"
else
    log_warn "⚠️  Uploads backup not found, skipping"
fi

# Restore configuration
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}_config.tar.gz" ]; then
    log_step "⚙️  Restoring configuration..."
    
    # Backup current .env
    if [ -f .env ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        log_info "Current .env backed up"
    fi
    
    # Extract configuration
    tar -xzf "${BACKUP_DIR}/${BACKUP_FILE}_config.tar.gz"
    log_info "✅ Configuration restore completed"
    
    log_warn "⚠️  Please review .env file for any needed updates"
else
    log_warn "⚠️  Configuration backup not found, skipping"
fi

# Restore SSL certificates
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}_ssl.tar.gz" ]; then
    log_step "🔒 Restoring SSL certificates..."
    tar -xzf "${BACKUP_DIR}/${BACKUP_FILE}_ssl.tar.gz"
    log_info "✅ SSL certificates restore completed"
else
    log_warn "⚠️  SSL certificates backup not found, skipping"
fi

# Start the application
log_step "🚀 Starting application..."
docker-compose up -d

# Wait for application to be ready
log_info "⏳ Waiting for application to be ready..."
timeout=120
while [ $timeout -gt 0 ]; do
    if curl -f -s http://localhost/health >/dev/null 2>&1; then
        break
    fi
    sleep 5
    timeout=$((timeout - 5))
done

if [ $timeout -le 0 ]; then
    log_warn "⚠️  Application health check timeout, but services are running"
else
    log_info "✅ Application is ready"
fi

# Verify restore
log_step "🔍 Verifying restore..."
if docker-compose exec -T postgres psql -U helpdesk_user helpdesk -c "SELECT COUNT(*) FROM users;" >/dev/null 2>&1; then
    USER_COUNT=$(docker-compose exec -T postgres psql -U helpdesk_user helpdesk -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    TICKET_COUNT=$(docker-compose exec -T postgres psql -U helpdesk_user helpdesk -t -c "SELECT COUNT(*) FROM tickets;" 2>/dev/null | tr -d ' ' || echo "0")
    log_info "✅ Database verification passed"
    log_info "📊 Restored data: ${USER_COUNT} users, ${TICKET_COUNT} tickets"
else
    log_error "❌ Database verification failed"
    exit 1
fi

# Display results
echo ""
echo "✅ Restore completed successfully!"
echo "=================================="
echo "📦 Restored from: ${BACKUP_FILE}"
echo "🕐 Backup date: $(date -d @$(echo ${BACKUP_TIMESTAMP} | sed 's/\([0-9]\{8\}\)_\([0-9]\{6\}\)/\1 \2/' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/') 2>/dev/null || echo "Unknown")"
echo "🌐 Application URL: http://localhost"
echo ""
echo "📋 Restored components:"
echo "   ✅ Database (${USER_COUNT} users, ${TICKET_COUNT} tickets)"
[ -f "${BACKUP_DIR}/${BACKUP_FILE}_uploads.tar.gz" ] && echo "   ✅ Uploaded files"
[ -f "${BACKUP_DIR}/${BACKUP_FILE}_config.tar.gz" ] && echo "   ✅ Configuration files"
[ -f "${BACKUP_DIR}/${BACKUP_FILE}_ssl.tar.gz" ] && echo "   ✅ SSL certificates"
echo ""
echo "🔧 Next steps:"
echo "   1. Verify application functionality"
echo "   2. Check user access and permissions"
echo "   3. Test email notifications (if configured)"
echo "   4. Review system logs: docker-compose logs -f"
echo ""

# Send notification if configured
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Helpdesk restore completed: ${BACKUP_FILE} (${USER_COUNT} users, ${TICKET_COUNT} tickets)\"}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || log_warn "⚠️  Slack notification failed"
fi

log_info "🎯 Restore process completed!"
echo "🔗 Access your restored helpdesk at: http://localhost"
