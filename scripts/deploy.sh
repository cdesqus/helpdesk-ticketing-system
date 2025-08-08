#!/bin/bash

# Production deployment script

set -e

echo "🚀 Deploying Helpdesk System to production..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it first."
    exit 1
fi

# Pull latest images
echo "📦 Pulling latest images..."
docker-compose pull

# Build the application
echo "🔨 Building application..."
docker-compose build --no-cache

# Stop existing containers
echo "⏹️  Stopping existing containers..."
docker-compose down

# Start the application
echo "🚀 Starting application..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are healthy
echo "🔍 Checking service health..."
if docker-compose ps | grep -q "unhealthy"; then
    echo "❌ Some services are unhealthy. Check logs:"
    docker-compose logs
    exit 1
fi

echo "✅ Deployment completed successfully!"
echo "🌐 Application is available at:"
echo "   - HTTP: http://localhost"
echo "   - HTTPS: https://localhost (if SSL configured)"
echo ""
echo "📊 Admin tools:"
echo "   - Database: http://localhost:8080"
echo "   - Redis: http://localhost:8081"
</leafFile>
