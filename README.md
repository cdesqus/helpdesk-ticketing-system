# IDESOLUSI Helpdesk System

A comprehensive helpdesk management system built with **Encore.ts** backend and **React** frontend, featuring role-based access control, ticket management, real-time communication, and secure email notifications.

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

## 🚀 Quick Start

### Prerequisites
- **Docker** (v20.10 or higher)
- **Docker Compose** (v2.0 or higher)
- **Git** for cloning the repository

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
   - Check system requirements
   - Generate SSL certificates for development
   - Create secure environment configuration
   - Set up monitoring and backup automation
   - Configure proper file permissions

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - **Main application**: http://localhost
   - **HTTPS (development)**: https://localhost (self-signed certificate)
   - **PgAdmin**: http://localhost:8080 (admin@helpdesk.local / admin123)
   - **Redis Commander**: http://localhost:8081

### 🔑 Default Credentials
- **Admin 1**: `admin` / `admin123`
- **Admin 2**: `haryanto` / `P@ssw0rd`

Both accounts have full administrative access to the system.

## 🏗️ Development

### Development Environment Setup

1. **Start development services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Install dependencies**
   ```bash
   # Backend (Encore.ts)
   cd backend && npm install
   
   # Frontend (React + Vite)
   cd frontend && npm install
   ```

3. **Run in development mode**
   ```bash
   # Backend (Encore.ts with hot reload)
   cd backend && encore run --watch
   
   # Frontend (Vite with hot reload)
   cd frontend && npm run dev
   ```

### 📁 Project Structure

```
helpdesk-system/
├── backend/                    # Encore.ts backend services
│   ├── auth/                  # Authentication service
│   │   ├── encore.service.ts  # Service definition
│   │   ├── login.ts          # Login/logout endpoints
│   │   ├── users.ts          # User management
│   │   ├── auth.ts           # Auth handler & middleware
│   │   └── migrations/       # Database migrations
│   ├── ticket/               # Ticket management service
│   │   ├── encore.service.ts # Service definition
│   │   ├── create.ts         # Create tickets
│   │   ├── list.ts           # List/filter tickets
│   │   ├── get.ts            # Get ticket details
│   │   ├── update.ts         # Update tickets
│   │   ├── delete.ts         # Delete tickets
│   │   ├── comments.ts       # Comment management
│   │   ├── bulk-import.ts    # Excel import functionality
│   │   ├── export.ts         # Export to Excel/PDF
│   │   ├── email.ts          # Email notifications
│   │   ├── smtp.ts           # SMTP configuration
│   │   ├── stats.ts          # Analytics & reporting
│   │   └── migrations/       # Database migrations
│   └── ...
├── frontend/                  # React frontend application
│   ├── components/           # Reusable UI components
│   │   ├── Layout.tsx        # Main layout wrapper
│   │   ├── ProtectedRoute.tsx # Route protection
│   │   ├── CommentSection.tsx # Ticket comments
│   │   └── SystemLogo.tsx    # Branding component
│   ├── pages/                # Page components
│   │   ├── Landing.tsx       # Landing page
│   │   ├── Login.tsx         # Authentication
│   │   ├── Dashboard.tsx     # Analytics dashboard
│   │   ├── TicketList.tsx    # Ticket management
│   │   ├── TicketDetail.tsx  # Ticket details
│   │   ├── CreateTicket.tsx  # Ticket creation
│   │   ├── BulkImport.tsx    # Excel import
│   │   ├── UserManagement.tsx # User administration
│   │   └── Settings.tsx      # System configuration
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.tsx       # Authentication logic
│   │   └── useSystemConfig.tsx # System configuration
│   └── App.tsx               # Main application component
├── docker/                   # Docker configuration
│   ├── nginx/               # Nginx reverse proxy
│   ├── postgres/            # Database initialization
│   ├── prometheus/          # Monitoring configuration
│   └── grafana/             # Dashboard configuration
├── scripts/                 # Utility scripts
│   ├── setup.sh            # Automated setup
│   ├── deploy.sh           # Production deployment
│   ├── backup.sh           # Manual backup
│   └── restore.sh          # Backup restoration
├── docker-compose.yml      # Production configuration
├── docker-compose.dev.yml  # Development configuration
├── docker-compose.prod.yml # Production overrides
└── README.md               # This documentation
```

## ⚙️ Configuration

### Environment Variables

The system uses a comprehensive `.env` file for configuration. Key variables include:

```env
# Database Configuration
DATABASE_URL=postgres://helpdesk_user:helpdesk_password@postgres:5432/helpdesk

# Redis Configuration  
REDIS_URL=redis://:helpdesk_redis_password@redis:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# SMTP Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application Settings
NODE_ENV=production
PORT=4000

# Backup Configuration
BACKUP_RETENTION_DAYS=30
```

### System Configuration

Access the **Settings** page as an admin to configure:

- **🎨 System Branding**: Logo, name, colors with live preview
- **📧 SMTP Settings**: Secure email notifications with SSL/TLS
- **👥 User Management**: Create and manage user accounts
- **📊 Email Monitoring**: Delivery statistics and logs

### SMTP Configuration

The system supports secure email delivery with multiple providers:

#### Gmail Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
```

#### Office 365 Configuration
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
```

#### Custom SMTP Configuration
```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=helpdesk@your-domain.com
SMTP_PASS=your-password
```

**Security Features:**
- **TLS/STARTTLS encryption** (Port 587) - Recommended
- **SSL encryption** (Port 465) - Legacy but secure
- **Connection verification** before sending
- **Delivery tracking** with success/failure logs
- **Automatic retry** on temporary failures

## 👥 User Roles & Permissions

### 🔴 Admin
- **Full system access** and configuration
- **User management** (create, edit, delete users)
- **System configuration** (branding, SMTP, settings)
- **All ticket operations** (create, edit, delete, assign)
- **Analytics and reporting** access
- **Bulk operations** (import, export, delete)

### 🔵 Engineer  
- **View assigned tickets** with full details
- **Update ticket status** and add resolutions
- **Add comments** (internal and external)
- **Limited ticket access** (only assigned tickets by default)
- **Dashboard access** for assigned ticket metrics

### 🟢 Reporter
- **Create new tickets** for issues and requests
- **View own tickets** (read-only access)
- **Add comments** to own tickets (external only)
- **Track ticket progress** and updates
- **Receive email notifications** for ticket updates

## 📡 API Documentation

The system provides a comprehensive RESTful API built with Encore.ts:

### Authentication Endpoints
```
POST /auth/login              # User authentication
POST /auth/logout             # Session termination
POST /auth/forgot-password    # Password reset request
POST /auth/reset-password     # Password reset with token
GET  /auth/me                 # Current user information
POST /auth/refresh            # Session refresh
```

### Ticket Management
```
GET    /tickets               # List tickets (role-based filtering)
POST   /tickets               # Create new ticket
GET    /tickets/:id           # Get ticket details
PUT    /tickets/:id           # Update ticket
DELETE /tickets/:id           # Delete ticket (admin only)
POST   /tickets/:id/close     # Close ticket with resolution
GET    /tickets/stats         # Analytics and statistics
GET    /tickets/export        # Export tickets (Excel/PDF)
POST   /tickets/bulk-import   # Import from Excel
DELETE /tickets/bulk          # Bulk delete tickets
```

### Comment System
```
GET    /tickets/:id/comments  # List ticket comments
POST   /tickets/:id/comments  # Add comment to ticket
PUT    /comments/:id          # Update comment
DELETE /comments/:id          # Delete comment
```

### User Management (Admin Only)
```
GET    /auth/users            # List all users
POST   /auth/users            # Create new user
PUT    /auth/users/:id        # Update user
DELETE /auth/users/:id        # Delete user
POST   /auth/users/:id/password # Change user password
```

### System Configuration
```
GET    /system/config         # Get system configuration
PUT    /system/config         # Update system configuration (admin only)
GET    /smtp/config           # Get SMTP configuration
POST   /smtp/configure        # Configure SMTP settings
POST   /smtp/test             # Test SMTP configuration
```

### Email Monitoring
```
GET    /email-logs            # List email delivery logs
GET    /email-stats           # Email delivery statistics
DELETE /email-logs/cleanup    # Clear old email logs
```

All endpoints support:
- **JWT authentication** with automatic token refresh
- **Role-based access control** with granular permissions
- **Input validation** and sanitization
- **Error handling** with descriptive messages
- **Rate limiting** for security

## 🗄️ Backup and Restore

### Automated Backups

The system includes automated backup functionality:

```bash
# Backups run automatically via cron (daily at 2 AM)
# Retention: 30 days (configurable)
# Includes: Database, uploaded files, configuration
```

### Manual Backup
```bash
./scripts/backup.sh
```

Creates timestamped backups including:
- **Database dump** (PostgreSQL)
- **Uploaded files** (if any)
- **Configuration files** (excluding secrets)

### Restore from Backup
```bash
./scripts/restore.sh <backup_timestamp>
# Example: ./scripts/restore.sh 20241201_143000
```

### Backup Storage Locations
- **Local**: `backups/` directory
- **Cloud**: Optional S3 integration (configurable)
- **Retention**: Configurable cleanup of old backups

## 🔒 Security Features

### Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control** with granular permissions
- **Session management** with automatic refresh
- **Password hashing** using bcrypt with salt
- **Account lockout** protection against brute force

### Network Security
- **HTTPS/TLS encryption** for all communications
- **Rate limiting** on API endpoints
- **CORS protection** with configurable origins
- **Security headers** (HSTS, CSP, X-Frame-Options)
- **SQL injection prevention** with parameterized queries

### Data Protection
- **XSS protection** with input sanitization
- **CSRF protection** with token validation
- **Secure cookie handling** with HttpOnly flags
- **Database encryption** at rest (configurable)
- **Audit logging** for security events

### Email Security
- **TLS/SSL encryption** for SMTP connections
- **Connection verification** before sending
- **Delivery tracking** with failure analysis
- **Secure credential storage** with environment variables

## 📊 Monitoring and Logging

### Application Monitoring
- **Health check endpoints** for service monitoring
- **Performance metrics** collection
- **Error tracking** and alerting
- **Resource usage** monitoring

### Logging System
- **Structured logging** with JSON format
- **Log rotation** and retention policies
- **Error aggregation** and analysis
- **Security event logging**

### Available Logs
```bash
# Application logs
docker-compose logs -f helpdesk-app

# Database logs  
docker-compose logs -f postgres

# Nginx access/error logs
docker-compose logs -f nginx

# All services
docker-compose logs -f
```

### Monitoring Tools (Production)
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboard and visualization
- **Health checks**: Automated service monitoring
- **Log aggregation**: Centralized log management

## 🚀 Deployment

### Development Deployment
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# With hot reload for development
cd backend && encore run --watch
cd frontend && npm run dev
```

### Production Deployment

1. **Prepare environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Configure SSL certificates**
   ```bash
   # Place your SSL certificates in docker/nginx/ssl/
   cp your-cert.pem docker/nginx/ssl/cert.pem
   cp your-key.pem docker/nginx/ssl/key.pem
   ```

3. **Deploy with automated script**
   ```bash
   ./scripts/deploy.sh
   ```

The deployment script handles:
- **Pre-deployment backup** creation
- **Health checks** and validation
- **Graceful service restart** with zero downtime
- **Post-deployment verification**
- **Rollback capability** if issues occur

### Scaling and High Availability

```bash
# Horizontal scaling
docker-compose up -d --scale helpdesk-app=3

# Load balancer configuration
# Nginx automatically distributes load across instances

# Database replication (advanced)
# Configure PostgreSQL master-slave replication
```

### Production Checklist

- [ ] **Update default passwords** in .env file
- [ ] **Configure SMTP settings** for email notifications  
- [ ] **Replace self-signed SSL** certificates with valid ones
- [ ] **Set up monitoring** and alerting
- [ ] **Configure backup** retention and storage
- [ ] **Review security headers** in nginx.conf
- [ ] **Set up log rotation** and monitoring
- [ ] **Configure firewall** rules and access controls

## 🛠️ Troubleshooting

### Common Issues

#### 🔴 Database Connection Errors
```bash
# Check PostgreSQL container status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Verify DATABASE_URL in .env file
grep DATABASE_URL .env

# Restart database service
docker-compose restart postgres
```

#### 📧 Email Notifications Not Working
```bash
# Check SMTP configuration in Settings page
# Verify SMTP credentials and settings

# Test SMTP connection
# Use the "Test Email" feature in Settings

# Check email logs for errors
# View Email Logs tab in Settings
```

#### 🔒 Authentication Issues
```bash
# Clear browser cache and cookies
# Check JWT_SECRET in .env file

# Restart application services
docker-compose restart helpdesk-app

# Check authentication logs
docker-compose logs helpdesk-app | grep auth
```

#### 📁 File Upload Issues
```bash
# Check uploads directory permissions
ls -la uploads/

# Verify nginx configuration
docker-compose logs nginx

# Check disk space
df -h
```

### Performance Optimization

#### Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Analyze table statistics
ANALYZE tickets;
ANALYZE ticket_comments;
```

#### Application Performance
```bash
# Monitor resource usage
docker stats

# Check memory usage
docker-compose exec helpdesk-app free -h

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost/health
```

### Log Analysis

#### Application Logs
```bash
# Filter error logs
docker-compose logs helpdesk-app | grep ERROR

# Monitor real-time logs
docker-compose logs -f --tail=100 helpdesk-app

# Export logs for analysis
docker-compose logs helpdesk-app > app-logs.txt
```

#### Email Delivery Logs
```bash
# Check email delivery status
# Access Settings > Email Logs in the web interface

# Monitor SMTP connection issues
docker-compose logs helpdesk-app | grep SMTP
```

### Health Checks

```bash
# Application health
curl http://localhost/health

# Database connectivity
docker-compose exec postgres pg_isready -U helpdesk_user

# Redis connectivity  
docker-compose exec redis redis-cli ping

# Nginx status
curl http://localhost:8080/nginx-status
```

## 🤝 Contributing

We welcome contributions to improve the IDESOLUSI Helpdesk System!

### Development Setup
1. **Fork the repository** on your preferred Git platform
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Set up development environment** using the instructions above
4. **Make your changes** with proper testing
5. **Add tests** if applicable (frontend and backend)
6. **Commit your changes** (`git commit -m 'Add amazing feature'`)
7. **Push to the branch** (`git push origin feature/amazing-feature`)
8. **Submit a pull request** with detailed description

### Code Standards
- **TypeScript** for both frontend and backend
- **ESLint** and **Prettier** for code formatting
- **Conventional commits** for commit messages
- **Component-based architecture** for React frontend
- **Service-oriented architecture** for Encore.ts backend

### Testing Guidelines
- **Unit tests** for business logic
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Security testing** for authentication and authorization

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, questions, or feature requests:

- **📧 Email**: Create an issue in the repository
- **📖 Documentation**: Check this README and inline code comments
- **🐛 Bug Reports**: Use the issue tracker with detailed reproduction steps
- **💡 Feature Requests**: Submit enhancement proposals via issues
- **🔧 Troubleshooting**: Review the troubleshooting section above

### Getting Help

1. **Check the documentation** in this README
2. **Search existing issues** for similar problems
3. **Review logs** using the troubleshooting guide
4. **Create a detailed issue** with:
   - System information (OS, Docker version)
   - Steps to reproduce the problem
   - Expected vs actual behavior
   - Relevant log excerpts
   - Screenshots if applicable

## 🙏 Acknowledgments

- **Encore.ts** - Modern TypeScript backend framework
- **React** - Frontend user interface library
- **PostgreSQL** - Reliable database system
- **Docker** - Containerization platform
- **Nginx** - High-performance web server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful UI component library

---

**Built with ❤️ by IDESOLUSI**

*Professional helpdesk management for modern support teams*

---

## 📋 Quick Reference

### Essential Commands
```bash
# Start application
docker-compose up -d

# Stop application  
docker-compose down

# View logs
docker-compose logs -f

# Backup data
./scripts/backup.sh

# Deploy to production
./scripts/deploy.sh

# Development mode
docker-compose -f docker-compose.dev.yml up -d
```

### Default Access URLs
- **Application**: http://localhost
- **HTTPS**: https://localhost  
- **PgAdmin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081
- **Grafana** (prod): http://localhost:3001
- **Prometheus** (prod): http://localhost:9090

### Default Credentials
- **Admin**: admin / admin123
- **Admin**: haryanto / P@ssw0rd
- **PgAdmin**: admin@helpdesk.local / admin123

### Support Contacts
- **Technical Issues**: Create repository issue
- **Security Concerns**: Contact maintainers directly
- **Feature Requests**: Submit enhancement proposal
