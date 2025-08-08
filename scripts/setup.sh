#!/bin/bash

# Helpdesk System Setup Script

set -e

echo "🚀 Setting up IDESOLUSI Helpdesk System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p docker/nginx/ssl
mkdir -p uploads
mkdir -p logs

# Generate SSL certificates for development (self-signed)
echo "🔐 Generating SSL certificates for development..."
if [ ! -f docker/nginx/ssl/cert.pem ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/nginx/ssl/key.pem \
        -out docker/nginx/ssl/cert.pem \
        -subj "/C=ID/ST=Jakarta/L=Jakarta/O=IDESOLUSI/CN=localhost"
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgres://helpdesk_user:helpdesk_password@postgres:5432/helpdesk

# Redis Configuration
REDIS_URL=redis://redis:6379

# JWT Secret (change this in production!)
JWT_SECRET=$(openssl rand -base64 32)

# SMTP Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application Settings
NODE_ENV=production
PORT=4000
EOF
    echo "✅ Environment file created. Please update SMTP settings if needed."
fi

# Set proper permissions
echo "🔧 Setting permissions..."
chmod +x scripts/*.sh
chmod 600 docker/nginx/ssl/key.pem
chmod 644 docker/nginx/ssl/cert.pem

echo "✅ Setup completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env file with your SMTP settings (optional)"
echo "2. Run 'docker-compose up -d' to start the application"
echo "3. Access the application at http://localhost"
echo "4. Default admin credentials: admin / admin123"
echo ""
echo "📊 Development tools:"
echo "- PgAdmin: http://localhost:8080 (admin@helpdesk.local / admin123)"
echo "- Redis Commander: http://localhost:8081"
echo ""
echo "🔧 Useful commands:"
echo "- Start: docker-compose up -d"
echo "- Stop: docker-compose down"
echo "- Logs: docker-compose logs -f"
echo "- Development mode: docker-compose -f docker-compose.dev.yml up -d"
