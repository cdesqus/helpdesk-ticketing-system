# IDESOLUSI Helpdesk System

A comprehensive helpdesk management system built with Encore.ts backend and React frontend, featuring role-based access control, ticket management, and real-time communication.

## Features

### 🎫 Ticket Management
- Create, update, and track support tickets
- Priority and status management
- Assignment to engineers
- Custom fields and dates
- Export capabilities (Excel/PDF)

### 👥 User Management
- Role-based access control (Admin, Engineer, Reporter)
- User authentication with JWT
- Password reset functionality
- User profile management

### 💬 Communication
- Comment system with internal/external visibility
- Real-time updates
- Email notifications
- Conversation threading

### 📊 Analytics & Reporting
- Dashboard with ticket statistics
- Trend analysis
- Engineer performance metrics
- Export and print capabilities

### 🎨 Customization
- Custom logo and branding
- System name configuration
- Color scheme customization
- Responsive design

### 🔧 Technical Features
- RESTful API with Encore.ts
- PostgreSQL database
- Redis caching
- Docker containerization
- Nginx reverse proxy
- SSL/TLS support

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd helpdesk-system
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Main application: http://localhost
   - PgAdmin: http://localhost:8080
   - Redis Commander: http://localhost:8081

### Default Credentials
- **Admin**: `admin` / `admin123`

## Development

### Development Environment

1. **Start development services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

3. **Run in development mode**
   ```bash
   # Backend (Encore.ts)
   cd backend && encore run
   
   # Frontend (Vite)
   cd frontend && npm run dev
   ```

### Project Structure

```
helpdesk-system/
├── backend/                 # Encore.ts backend
│   ├── auth/               # Authentication service
│   ├── ticket/             # Ticket management service
│   └── ...
├── frontend/               # React frontend
│   ├── components/         # Reusable components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   └── ...
├── docker/                # Docker configuration
├── scripts/               # Utility scripts
└── docker-compose.yml     # Production compose file
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgres://helpdesk_user:helpdesk_password@postgres:5432/helpdesk

# Redis
REDIS_URL=redis://redis:6379

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# SMTP (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application
NODE_ENV=production
PORT=4000
```

### System Configuration

Access the Settings page as an admin to configure:

- **System Branding**: Logo, name, colors
- **SMTP Settings**: Email notifications
- **User Management**: Create and manage users

## User Roles

### Admin
- Full system access
- User management
- System configuration
- All ticket operations
- Analytics and reporting

### Engineer
- View assigned tickets
- Update ticket status
- Add comments
- Limited ticket access

### Reporter
- Create new tickets
- View own tickets (read-only)
- Add comments to own tickets

## API Documentation

The system provides a RESTful API with the following main endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Reset password with token

### Tickets
- `GET /tickets` - List tickets (role-based filtering)
- `POST /tickets` - Create ticket
- `GET /tickets/:id` - Get ticket details
- `PUT /tickets/:id` - Update ticket
- `DELETE /tickets/:id` - Delete ticket (admin only)

### Comments
- `GET /tickets/:id/comments` - List ticket comments
- `POST /tickets/:id/comments` - Add comment
- `PUT /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment

### System
- `GET /system/config` - Get system configuration
- `PUT /system/config` - Update system configuration (admin only)

## Backup and Restore

### Create Backup
```bash
./scripts/backup.sh
```

### Restore Backup
```bash
./scripts/restore.sh <backup_timestamp>
```

Backups include:
- Database dump
- Uploaded files
- Configuration files

## Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Rate limiting on API endpoints
- HTTPS support
- SQL injection prevention
- XSS protection headers

## Monitoring and Logging

- Application health checks
- Nginx access logs
- Database connection monitoring
- Redis health monitoring
- Docker container health checks

## Deployment

### Production Deployment

1. **Update environment variables**
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

3. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Scaling

The application can be scaled horizontally:

```bash
docker-compose up -d --scale helpdesk-app=3
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check PostgreSQL container status
   - Verify DATABASE_URL in .env

2. **Email notifications not working**
   - Configure SMTP settings in Settings page
   - Check SMTP credentials

3. **File upload issues**
   - Check uploads directory permissions
   - Verify nginx configuration

### Logs

View application logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f helpdesk-app
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting section

---

Built with ❤️ using Encore.ts and React
