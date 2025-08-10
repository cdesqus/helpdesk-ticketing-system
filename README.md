# IDESOLUSI Helpdesk System

A comprehensive helpdesk management system built with **Encore.ts** backend and **React** frontend, featuring role-based access control, ticket management, real-time communication, and secure email notifications. Designed for easy self-hosting with Docker.

## 🌟 Features

### 🎫 Ticket Management
- **Create, update, and track** support tickets with intuitive interface
- **Priority and status management** (Open, In Progress, Resolved, Closed)
- **Assignment to engineers** with role-based access control
- **Custom fields and dates** for flexible ticket organization
- **Bulk import from Excel** files with automatic status detection
- **Export capabilities** (Excel/PDF) with filtering options
- **Advanced search and filtering** by status, priority, engineer, date range
- **Sorting and pagination** for large ticket volumes

### 👥 User Management
- **Role-based access control** (Admin, Engineer, Reporter)
- **Secure authentication** with JWT tokens and session management
- **Password reset functionality** with secure token-based reset
- **User profile management** with full CRUD operations
- **Account status management** (Active/Inactive users)

### 💬 Communication & Collaboration
- **Comment system** with internal/external visibility controls
- **Real-time updates** and notifications
- **Secure email notifications** with SSL/TLS encryption
- **Conversation threading** for organized communication
- **Role-based comment permissions** (internal comments for staff only)

### 📊 Analytics & Reporting
- **Interactive dashboard** with ticket statistics and trends
- **Real-time metrics** with auto-refresh capabilities
- **Trend analysis** with 7-day activity charts
- **Engineer performance metrics** and workload distribution
- **Export and print capabilities** for reports
- **Success rate tracking** for email delivery

### 🎨 Customization & Branding
- **Custom logo and branding** support
- **System name configuration** for white-labeling
- **Color scheme customization** with live preview
- **Responsive design** for all screen sizes
- **Consistent spacing and alignment** patterns

### 🔧 Technical Features
- **RESTful API** built with Encore.ts framework
- **PostgreSQL database** with automated migrations
- **Redis caching** for session management
- **Docker containerization** for easy deployment
- **Nginx reverse proxy** with SSL/TLS support
- **Automated backups** with configurable retention
- **Health monitoring** and logging capabilities
- **Production-ready** with security best practices

### 🔒 Security Features
- **JWT-based authentication** with secure session management
- **Role-based access control** with granular permissions
- **Password hashing** with bcrypt encryption
- **Rate limiting** on API endpoints
- **HTTPS support** with SSL/TLS certificates
- **SQL injection prevention** with parameterized queries
- **XSS protection headers** and CSRF protection
- **Secure email delivery** with encryption monitoring

## 🚀 Quick Start for Self-Hosting

### Prerequisites
- **Docker** (v20.10 or higher)
- **Docker Compose** (v2.0 or higher)
- **Git** for cloning the repository
- **2GB RAM** minimum (4GB recommended)
- **5GB disk space** minimum (20GB recommended)

### 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd helpdesk-system
   ```

2. **Run the automated setup script**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```
   
   The setup script will:
   - Check system requirements and dependencies
   - Generate secure passwords and JWT secrets
   - Create SSL certificates for HTTPS
   - Set up monitoring and backup automation
   - Configure proper file permissions
   - Create systemd service (optional)

3. **Deploy the application**
   ```bash
   ./scripts/deploy.sh
   ```

4. **Access the application**
   - **Main application**: http://localhost
   - **HTTPS**: https://localhost (self-signed certificate)
   - **Monitoring (Grafana)**: http://localhost:3001
   - **Metrics (Prometheus)**: http://localhost:9090

### 🔑 Default Credentials
- **Admin 1**: `admin` / `admin123`
- **Admin 2**: `haryanto` / `P@ssw0rd`
- **Grafana**: `admin` / `[generated password in .env]`

## 🏗️ Self-Hosting Configuration

### Environment Configuration

The system uses a comprehensive `.env` file for configuration. Key variables include:

```env
# Database Configuration
POSTGRES_PASSWORD=secure_generated_password
DATABASE_URL=postgres://helpdesk_user:password@postgres:5432/helpdesk

# Redis Configuration  
REDIS_PASSWORD=secure_generated_password
REDIS_URL=redis://:password@redis:6379

# Security
JWT_SECRET=secure_generated_jwt_secret

# Domain Configuration
DOMAIN_NAME=helpdesk.your-domain.com

# SMTP Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
GRAFANA_PASSWORD=secure_generated_password
```

### SSL/TLS Configuration

#### Development (Self-Signed Certificates)
The setup script automatically generates self-signed certificates for development:
```bash
# Certificates are created in docker/nginx/ssl/
docker/nginx/ssl/cert.pem
docker/nginx/ssl/key.pem
```

#### Production (Let's Encrypt)
For production with a real domain:

1. **Install Certbot**
   ```bash
   sudo apt update
   sudo apt install certbot
   ```

2. **Get SSL Certificate**
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

3. **Copy Certificates**
   ```bash
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/key.pem
   sudo chown $USER:$USER docker/nginx/ssl/*.pem
   ```

4. **Set up Auto-Renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook "cd /path/to/helpdesk && docker-compose restart nginx"
   ```

### Firewall Configuration

#### Ubuntu/Debian (UFW)
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

#### CentOS/RHEL (Firewalld)
```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Cloud Providers
Configure security groups to allow:
- Port 22 (SSH) from your IP
- Port 80 (HTTP) from anywhere
- Port 443 (HTTPS) from anywhere

### Domain Setup

1. **Point DNS to your server**
   ```
   A record: your-domain.com → your-server-ip
   CNAME: www.your-domain.com → your-domain.com
   ```

2. **Update environment file**
   ```bash
   # Edit .env file
   DOMAIN_NAME=your-domain.com
   ```

3. **Redeploy**
   ```bash
   ./scripts/deploy.sh
   ```

## 📊 Monitoring and Maintenance

### Built-in Monitoring

The system includes comprehensive monitoring:

- **Grafana Dashboard**: http://localhost:3001
  - Application metrics and performance
  - System resource usage
  - Database and Redis metrics
  - Custom dashboards

- **Prometheus Metrics**: http://localhost:9090
  - Time-series metrics collection
  - Alerting capabilities
  - Service discovery

- **Log Aggregation**: Available with Loki (optional)
  - Centralized log collection
  - Log search and filtering
  - Integration with Grafana

### Health Monitoring

```bash
# Check service health
docker-compose ps

# View application logs
docker-compose logs -f helpdesk-app

# Monitor resource usage
docker stats

# Check disk usage
df -h
```

### Automated Backups

Backups run automatically daily at 2 AM:

```bash
# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh 20241201_143000

# List available backups
ls -la backups/
```

### System Updates

```bash
# Update application
./scripts/deploy.sh

# Update Docker images
docker-compose pull
./scripts/deploy.sh

# Enable automatic updates (optional)
docker-compose --profile watchtower up -d
```

## 🔧 Advanced Configuration

### Scaling and Performance

#### Horizontal Scaling
```bash
# Scale application instances
docker-compose up -d --scale helpdesk-app=3
```

#### Resource Limits
Edit `docker-compose.prod.yml` to adjust resource limits:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '1.0'
      memory: 1G
```

#### Database Optimization
```bash
# Connect to database
docker-compose exec postgres psql -U helpdesk_user helpdesk

# Check performance
SELECT * FROM pg_stat_activity;
SELECT * FROM pg_stat_database;
```

### Cloud Storage Integration

#### AWS S3 Backup
```env
# Add to .env file
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-backup-bucket
AWS_REGION=us-east-1
```

#### Google Cloud Storage
```env
# Add to .env file
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_BUCKET=your-backup-bucket
```

### Reverse Proxy Setup

#### Nginx (External)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Cloudflare
1. Add your domain to Cloudflare
2. Set DNS A record to your server IP
3. Enable SSL/TLS encryption
4. Configure firewall rules

### Email Configuration

#### Gmail with App Password
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

#### Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
```

#### Custom SMTP
```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_USER=helpdesk@your-domain.com
SMTP_PASS=your-password
```

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :80
sudo lsof -i :80

# Stop conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx
```

#### Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Reset database
docker-compose down
docker volume rm helpdesk_postgres_data
docker-compose up -d
```

#### SSL Certificate Issues
```bash
# Regenerate certificates
rm docker/nginx/ssl/*
./scripts/setup.sh

# Check certificate validity
openssl x509 -in docker/nginx/ssl/cert.pem -text -noout
```

#### Memory Issues
```bash
# Check memory usage
free -h
docker stats

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Log Analysis

```bash
# Application logs
docker-compose logs -f helpdesk-app

# Database logs
docker-compose logs -f postgres

# Nginx logs
docker-compose logs -f nginx

# System logs
journalctl -u docker
```

### Performance Optimization

```bash
# Clean up Docker resources
docker system prune -a

# Optimize database
docker-compose exec postgres psql -U helpdesk_user helpdesk -c "VACUUM ANALYZE;"

# Monitor performance
docker stats --no-stream
```

## 🔒 Security Best Practices

### Production Security Checklist

- [ ] **Change all default passwords**
- [ ] **Use strong, unique passwords for all services**
- [ ] **Enable firewall and configure security groups**
- [ ] **Use valid SSL certificates (not self-signed)**
- [ ] **Keep system and Docker images updated**
- [ ] **Configure automated backups**
- [ ] **Set up monitoring and alerting**
- [ ] **Review and audit user access regularly**
- [ ] **Enable fail2ban for SSH protection**
- [ ] **Configure log rotation and retention**

### Security Monitoring

```bash
# Check for failed login attempts
docker-compose logs helpdesk-app | grep "authentication failed"

# Monitor unusual activity
docker-compose logs nginx | grep "404\|403\|500"

# Check system security
sudo lynis audit system
```

## 📋 Maintenance Schedule

### Daily
- [ ] Check application health
- [ ] Review error logs
- [ ] Monitor disk space

### Weekly
- [ ] Review backup integrity
- [ ] Check security updates
- [ ] Monitor performance metrics

### Monthly
- [ ] Update Docker images
- [ ] Review user access
- [ ] Clean up old logs and backups
- [ ] Security audit

## 🆘 Support and Documentation

### Getting Help

1. **Check the logs** for error messages
2. **Review this documentation** for configuration options
3. **Search existing issues** in the repository
4. **Create a detailed issue** with:
   - System information (OS, Docker version)
   - Steps to reproduce the problem
   - Error messages and logs
   - Configuration details (without sensitive data)

### Useful Commands

```bash
# Quick health check
curl -f http://localhost/health

# Full system status
./scripts/deploy.sh --check

# Emergency stop
docker-compose down

# Emergency backup
./scripts/backup.sh

# View all containers
docker-compose ps

# Resource usage
docker stats --no-stream
```

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by IDESOLUSI**

*Professional helpdesk management for modern support teams*

---

## 📋 Quick Reference

### Essential Commands
```bash
# Initial setup
./scripts/setup.sh

# Deploy application
./scripts/deploy.sh

# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Backup data
./scripts/backup.sh

# Restore data
./scripts/restore.sh <timestamp>
```

### Default Access URLs
- **Application**: http://localhost
- **HTTPS**: https://localhost
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090

### Default Credentials
- **Admin**: admin / admin123
- **Admin**: haryanto / P@ssw0rd
- **Grafana**: admin / [check .env file]

### Important Files
- **Configuration**: `.env`
- **SSL Certificates**: `docker/nginx/ssl/`
- **Backups**: `backups/`
- **Logs**: `logs/`
- **Uploads**: `uploads/`

### Support
- **Documentation**: This README file
- **Issues**: Repository issue tracker
- **Security**: Contact maintainers directly
