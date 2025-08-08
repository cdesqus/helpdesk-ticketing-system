#!/bin/bash

# Backup script for Helpdesk System

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="helpdesk_backup_${TIMESTAMP}"

echo "🗄️  Creating backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "📊 Backing up database..."
docker-compose exec -T postgres pg_dump -U helpdesk_user helpdesk > "${BACKUP_DIR}/${BACKUP_FILE}.sql"

# Backup uploads
echo "📁 Backing up uploads..."
if [ -d "uploads" ]; then
    tar -czf "${BACKUP_DIR}/${BACKUP_FILE}_uploads.tar.gz" uploads/
fi

# Backup configuration
echo "⚙️  Backing up configuration..."
tar -czf "${BACKUP_DIR}/${BACKUP_FILE}_config.tar.gz" .env docker/ --exclude=docker/nginx/ssl/

echo "✅ Backup completed: ${BACKUP_DIR}/${BACKUP_FILE}*"
echo "📦 Files created:"
echo "   - ${BACKUP_FILE}.sql (database)"
echo "   - ${BACKUP_FILE}_uploads.tar.gz (uploaded files)"
echo "   - ${BACKUP_FILE}_config.tar.gz (configuration)"
