# Docker Deployment Guide

This guide explains how to deploy the social app using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

1. **Clone the repository** (if not already done)
   ```bash
   git clone <your-repo-url>
   cd social_app
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file and update the values according to your environment.

3. **Build and start all services**
   ```bash
   docker-compose up -d --build
   ```

4. **Check service status**
   ```bash
   docker-compose ps
   ```

5. **View logs**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   docker-compose logs -f admin
   docker-compose logs -f mysql
   ```

## Services

The application consists of 4 services:

- **MySQL** (Port 3307 on host / 3306 in container): Database server
- **Backend** (Port 5000): Express.js API server
- **Frontend** (Port 3000): Main React application
- **Admin** (Port 3001): Admin panel React application

## Access URLs

- Frontend: http://localhost:3000
- Admin Panel: http://localhost:3001
- Backend API: http://localhost:5000
- MySQL: localhost:3307

## Environment Variables

Create a `.env` file in the `social_app` directory with the following variables:

```env
DB_HOST=mysql
DB_PORT=3307
DB_USER=appuser
DB_PASSWORD=apppassword
DB_NAME=social_app
DB_ROOT_PASSWORD=rootpassword
JWT_SECRET=your-secret-key-change-in-production
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (WARNING: This will delete database data)
```bash
docker-compose down -v
```

### Rebuild services
```bash
docker-compose up -d --build
```

### Restart a specific service
```bash
docker-compose restart backend
```

### Execute commands in a container
```bash
# Access MySQL
docker-compose exec mysql mysql -u appuser -p social_app

# Access backend container
docker-compose exec backend sh

# Access frontend container
docker-compose exec frontend sh
```

### View resource usage
```bash
docker-compose stats
```

## Database Initialization

SQL scripts in the `backend` directory will be automatically executed when MySQL container starts for the first time:
- `add_post_pin_column.sql`
- `add_role_column.sql`
- `create_post_images_table.sql`

## Troubleshooting

### Port already in use
If you get a port conflict error, you can change the ports in `docker-compose.yml`:
```yaml
ports:
  - "3000:80"  # Change 3000 to another port
```

### Database connection issues
1. Check if MySQL container is healthy:
   ```bash
   docker-compose ps mysql
   ```
2. Check MySQL logs:
   ```bash
   docker-compose logs mysql
   ```
3. Ensure environment variables are set correctly in `.env`

### Backend not connecting to database
- Verify `DB_HOST=mysql` in your `.env` file (should be `mysql`, not `localhost`)
- Check that MySQL service is healthy before backend starts

### Frontend/Admin can't reach backend
- Ensure backend service is running: `docker-compose ps backend`
- Check backend logs: `docker-compose logs backend`
- Verify CORS settings in `backend/server.js` allow requests from frontend/admin domains

## Production Deployment

For production deployment:

1. **Change default passwords** in `.env`
2. **Set a strong JWT_SECRET**
3. **Configure proper CORS origins** in `backend/server.js`
4. **Use environment-specific nginx configurations**
5. **Set up SSL/TLS certificates** (consider using a reverse proxy like Traefik or Nginx)
6. **Configure proper backup strategy** for MySQL volumes
7. **Set resource limits** in `docker-compose.yml`:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 512M
   ```

## Backup Database

```bash
# Create backup
docker-compose exec mysql mysqldump -u appuser -p social_app > backup.sql

# Restore backup
docker-compose exec -T mysql mysql -u appuser -p social_app < backup.sql
```

## Clean Up

To remove all containers, networks, and volumes:
```bash
docker-compose down -v --rmi all
```

