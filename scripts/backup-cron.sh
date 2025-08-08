#!/bin/sh

# Automated backup script for cron

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="helpdesk_backup_${TIMESTAMP}"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

echo "$(date): Starting automated backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "$(date): Backing up database..."
pg_dump -h postgres -U helpdesk_user -d helpdesk > "${BACKUP_DIR}/${BACKUP_FILE}.sql"

# Compress the backup
echo "$(date): Compressing backup..."
gzip "${BACKUP_DIR}/${BACKUP_FILE}.sql"

# Clean up old backups
echo "$(date): Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find $BACKUP_DIR -name "helpdesk_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "$(date): Backup completed: ${BACKUP_FILE}.sql.gz"

# Log backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" | cut -f1)
echo "$(date): Backup size: ${BACKUP_SIZE}"

# Optional: Upload to cloud storage
# if [ ! -z "$AWS_S3_BUCKET" ]; then
#     echo "$(date): Uploading to S3..."
#     aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" "s3://${AWS_S3_BUCKET}/backups/"
# fi
