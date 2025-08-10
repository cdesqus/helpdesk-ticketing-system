#!/bin/sh

# Automated backup script for cron - Enhanced for self-hosting

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="helpdesk_backup_${TIMESTAMP}"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
LOG_FILE="/var/log/helpdesk-backup.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

log "Starting automated backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Check if database is accessible
if ! pg_isready -h postgres -U helpdesk_user -d helpdesk >/dev/null 2>&1; then
    log "ERROR: Database is not accessible"
    exit 1
fi

# Backup database
log "Backing up database..."
if pg_dump -h postgres -U helpdesk_user -d helpdesk > "${BACKUP_DIR}/${BACKUP_FILE}.sql"; then
    log "Database backup completed successfully"
else
    log "ERROR: Database backup failed"
    exit 1
fi

# Compress the backup
log "Compressing backup..."
if gzip "${BACKUP_DIR}/${BACKUP_FILE}.sql"; then
    log "Backup compression completed"
else
    log "ERROR: Backup compression failed"
    exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" | cut -f1)
log "Backup size: ${BACKUP_SIZE}"

# Clean up old backups
log "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
DELETED_COUNT=$(find $BACKUP_DIR -name "helpdesk_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "Deleted ${DELETED_COUNT} old backup files"

# Verify backup integrity
log "Verifying backup integrity..."
if gunzip -t "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz"; then
    log "Backup integrity check passed"
else
    log "ERROR: Backup integrity check failed"
    exit 1
fi

# Optional: Upload to cloud storage
if [ ! -z "$AWS_S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
    log "Uploading to AWS S3..."
    if aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" "s3://${AWS_S3_BUCKET}/backups/"; then
        log "S3 upload completed successfully"
    else
        log "WARNING: S3 upload failed"
    fi
fi

if [ ! -z "$GOOGLE_CLOUD_BUCKET" ] && command -v gsutil >/dev/null 2>&1; then
    log "Uploading to Google Cloud Storage..."
    if gsutil cp "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" "gs://${GOOGLE_CLOUD_BUCKET}/backups/"; then
        log "Google Cloud Storage upload completed successfully"
    else
        log "WARNING: Google Cloud Storage upload failed"
    fi
fi

# Send notification if configured
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Helpdesk backup completed successfully: ${BACKUP_FILE}.sql.gz (${BACKUP_SIZE})\"}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || log "WARNING: Slack notification failed"
fi

if [ ! -z "$ADMIN_EMAIL" ] && command -v mail >/dev/null 2>&1; then
    echo "Helpdesk backup completed successfully at $(date). Backup file: ${BACKUP_FILE}.sql.gz (${BACKUP_SIZE})" | \
        mail -s "Helpdesk Backup Successful" "$ADMIN_EMAIL" >/dev/null 2>&1 || log "WARNING: Email notification failed"
fi

# Log backup statistics
TOTAL_BACKUPS=$(find $BACKUP_DIR -name "helpdesk_backup_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log "Backup statistics: ${TOTAL_BACKUPS} total backups, ${TOTAL_SIZE} total size"

log "Backup completed successfully: ${BACKUP_FILE}.sql.gz"

# Optional: Health check endpoint
if [ ! -z "$HEALTHCHECK_URL" ]; then
    curl -fsS --retry 3 "$HEALTHCHECK_URL" >/dev/null 2>&1 || log "WARNING: Health check ping failed"
fi
