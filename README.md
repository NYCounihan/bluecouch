# BlueCouch API

A minimal Python FastAPI application with PostgreSQL database, designed for containerized deployment on AWS EC2.

## Project Overview

This project provides a simple CRUD API for managing items, with automated CI/CD pipeline that builds Docker images and deploys to EC2 via GitHub Container Registry (GHCR).

## File Structure

```
bluecouch/
├── .env                     # Environment variables (local development)
├── .env.example            # Environment template (committed to repo)
├── docker-compose.yml      # Multi-container orchestration
├── README.md               # This file
├── api/                    # FastAPI application
│   ├── Dockerfile         # Python API container definition
│   ├── main.py            # FastAPI application code
│   └── requirements.txt   # Python dependencies
└── .github/
    └── workflows/
        └── build-api.yml  # CI/CD pipeline configuration
```

## Technology Stack

- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions → GitHub Container Registry
- **Deployment**: AWS EC2

## API Endpoints

- `GET /healthz` - Health check endpoint
- `POST /items` - Create a new item
- `GET /items/{item_id}` - Get specific item by ID
- `GET /items` - List all items (with pagination)

## Local Development

### Prerequisites

- Docker and Docker Compose installed
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/NYCounihan/bluecouch.git
   cd bluecouch
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start the application**
   ```bash
   docker compose up -d
   ```

4. **Verify deployment**
   ```bash
   curl http://localhost:8000/healthz
   ```

The API will be available at `http://localhost:8000` and PostgreSQL at `localhost:5432`.

## Deployment Workflow

### CI/CD Pipeline

The project uses GitHub Actions for automated building and deployment:

1. **Trigger**: Push to `api/` directory, `docker-compose.yml`, or workflow files
2. **Build**: Creates Docker image from `api/Dockerfile`
3. **Push**: Uploads image to GitHub Container Registry (`ghcr.io/NYCounihan/bluecouch/api:prod`)
4. **Deploy**: EC2 pulls and runs the updated image

### EC2 Deployment

#### Initial Setup

1. **Install Docker and Compose**
   ```bash
   sudo apt-get update
   sudo apt-get -y install docker.io docker-compose-plugin
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Clone and configure**
   ```bash
   git clone https://github.com/NYCounihan/bluecouch.git
   cd bluecouch
   cp .env.example .env
   # Edit .env with production credentials
   ```

3. **Login to GHCR**
   ```bash
   export GHCR_USER=NYCounihan
   export GHCR_PAT=<your_PAT_with_read_packages>
   echo $GHCR_PAT | docker login ghcr.io -u $GHCR_USER --password-stdin
   ```

4. **Deploy**
   ```bash
   docker compose pull
   docker compose up -d
   curl -s localhost:8000/healthz
   ```

#### Updates

After any code changes pushed to GitHub:

```bash
cd ~/bluecouch
git pull                    # Only if compose or env changed
docker compose pull api     # Pull latest image
docker compose up -d api    # Restart API container
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `myuser` |
| `POSTGRES_PASSWORD` | Database password | `mypassword` |
| `POSTGRES_DB` | Database name | `mydb` |
| `DATABASE_URL` | SQLAlchemy connection string | `postgresql+psycopg://myuser:mypassword@db:5432/mydb` |

## Security Considerations

- **Production**: Close port 5432 from internet access
- **Security Groups**: Expose port 8000 only to necessary IPs
- **Credentials**: Use strong passwords in production `.env`
- **Backups**: Implement regular database backups for data retention

## Container Details

### API Container
- **Base Image**: `python:3.11-slim`
- **Port**: 8000
- **Health Check**: Built into FastAPI application
- **Restart Policy**: `unless-stopped`

### Database Container
- **Base Image**: `postgres:16`
- **Port**: 5432 (exposed for local development)
- **Volume**: Persistent storage for data
- **Health Check**: `pg_isready` command
- **Restart Policy**: `unless-stopped`

## Development Notes

- The application automatically creates the `items` table on startup
- Database connection includes retry logic (10 attempts with 1-second intervals)
- API uses raw SQL queries for simplicity
- All database operations are wrapped in proper transaction handling

## Troubleshooting

### Common Issues

1. **Database connection failed**: Check if PostgreSQL container is healthy
2. **Port conflicts**: Ensure ports 8000 and 5432 are available
3. **Permission denied**: Run `newgrp docker` after adding user to docker group
4. **Image pull failed**: Verify GHCR authentication and image availability

### Logs

```bash
# View all container logs
docker compose logs

# View specific service logs
docker compose logs api
docker compose logs db
```
