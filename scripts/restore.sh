#!/bin/bash

# Restore script for Helpdesk System

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_timestamp>"
    echo "Example: $0 20241201_143000"
    exit 1
fi

BACKUP_TIMESTAMP=$1
BACKUP_DIR="backups"
BACKUP_FILE="helpdesk_backup_${BACKUP_TIMESTAMP}"

echo "🔄 Restoring backup from ${BACKUP_TIMESTAMP}..."

# Check if backup files exist
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}.sql" ]; then
    echo "❌ Database backup file not found: ${BACKUP_DIR}/${BACKUP_FILE}.sql"
    exit 1
fi

# Stop the application
echo "⏹️  Stopping application..."
docker-compose down

# Restore database
echo "📊 Restoring database..."
docker-compose up -d postgres
sleep 10
docker-compose exec -T postgres psql -U helpdesk_user -d helpdesk -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker-compose exec -T postgres psql -U helpdesk_user helpdesk < "${BACKUP_DIR}/${BACKUP_FILE}.sql"

# Restore uploads
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}_uploads.tar.gz" ]; then
    echo "📁 Restoring uploads..."
    rm -rf uploads/
    tar -xzf "${BACKUP_DIR}/${BACKUP_FILE}_uploads.tar.gz"
fi

# Restore configuration
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}_config.tar.gz" ]; then
    echo "⚙️  Restoring configuration..."
    tar -xzf "${BACKUP_DIR}/${BACKUP_FILE}_config.tar.gz"
fi

# Start the application
echo "🚀 Starting application..."
docker-compose up -d

echo "✅ Restore completed!"
echo "🌐 Application should be available at http://localhost"
