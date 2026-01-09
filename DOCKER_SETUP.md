# Docker Deployment Setup

## Files Created

### Docker Configuration Files

1. **`docker-compose.yml`** - Main orchestration file for all services
2. **`backend/Dockerfile`** - Backend Node.js service
3. **`my_social/Dockerfile`** - Frontend React application
4. **`admin/Dockerfile`** - Admin panel React application
5. **`.dockerignore`** files - Exclude unnecessary files from Docker builds
6. **`nginx.conf`** files - Nginx configuration for frontend and admin

### Environment Configuration

- **`.env.example`** - Template for environment variables

## Quick Start

1. **Navigate to the project directory:**
   ```bash
   cd social_app
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your values (especially database passwords and JWT secret).

3. **Start all services:**
   ```bash
   docker-compose up -d --build
   ```

4. **Access the applications:**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3001
   - Backend API: http://localhost:5000

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend    │────▶│    MySQL    │
│  (Nginx)    │     │  (Express)   │     │  (Database) │
│  Port 3000  │     │  Port 5000   │     │  Port 3306  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │
┌─────────────┐            │
│    Admin    │────────────┘
│  (Nginx)    │
│  Port 3001  │
└─────────────┘
```

## Service Details

### MySQL Database
- **Image:** mysql:8.0
- **Port:** 3307 on host → 3306 in container
- **Data Persistence:** Docker volume `mysql_data`
- **Initialization:** SQL scripts in `backend/` are automatically executed

### Backend API
- **Base Image:** node:20-alpine
- **Port:** 5000
- **Features:**
  - Express.js server
  - Socket.IO for real-time communication
  - MySQL connection pooling
  - File uploads (stored in `uploads/` directory)

### Frontend (Main App)
- **Build:** Multi-stage build (Node.js → Nginx)
- **Port:** 3000
- **Features:**
  - React + Vite application
  - Nginx reverse proxy for API calls
  - Static file serving

### Admin Panel
- **Build:** Multi-stage build (Node.js → Nginx)
- **Port:** 3001
- **Features:**
  - React + Vite application
  - Nginx reverse proxy for API calls
  - Static file serving

## Environment Variables

Required environment variables (set in `.env` file):

```env
# Database
DB_HOST=mysql
DB_PORT=3307
DB_USER=appuser
DB_PASSWORD=apppassword
DB_NAME=social_app
DB_ROOT_PASSWORD=rootpassword

# Security
JWT_SECRET=your-secret-key-change-in-production

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## Important Notes

1. **API URLs:** The frontend and admin apps currently use hardcoded `http://localhost:5000` URLs. The nginx configurations proxy `/api` requests to the backend, so these will work when accessed through the browser.

2. **CORS:** The backend CORS configuration has been updated to allow requests from Docker container origins.

3. **Database Connection:** The backend connects to MySQL using the service name `mysql` (not `localhost`) as defined in docker-compose.yml.

4. **File Uploads:** Uploaded files are stored in `backend/uploads/` and are persisted via Docker volumes.

5. **Socket.IO:** WebSocket connections are configured to work with the Docker network.

## Troubleshooting

### Services won't start
- Check if ports 3000, 3001, 5000, and 3307 are available
- Verify `.env` file exists and has correct values
- Check logs: `docker-compose logs`

### Database connection errors
- Ensure MySQL container is healthy: `docker-compose ps mysql`
- Check MySQL logs: `docker-compose logs mysql`
- Verify database credentials in `.env`

### Frontend/Admin can't reach backend
- Check backend is running: `docker-compose ps backend`
- Verify nginx proxy configuration
- Check browser console for CORS errors

### Build failures
- Clear Docker cache: `docker-compose build --no-cache`
- Check Dockerfile syntax
- Verify all required files exist

## Production Considerations

Before deploying to production:

1. **Change all default passwords** in `.env`
2. **Set a strong JWT_SECRET**
3. **Configure proper CORS origins** (restrict to your domain)
4. **Set up SSL/TLS** certificates
5. **Configure resource limits** in docker-compose.yml
6. **Set up database backups**
7. **Use environment-specific configurations**
8. **Enable logging and monitoring**
9. **Configure firewall rules**
10. **Review security settings**

## Maintenance Commands

```bash
# View all logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (deletes database)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# Access MySQL CLI
docker-compose exec mysql mysql -u appuser -p social_app

# Backup database
docker-compose exec mysql mysqldump -u appuser -p social_app > backup.sql
```

