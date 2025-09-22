# BlueCouch

A minimal Python FastAPI application with PostgreSQL database and Node.js admin interface, designed for containerized deployment on AWS EC2.

## Project Overview

This project provides a simple CRUD API for managing items with an admin interface for database management, featuring automated CI/CD pipeline that builds Docker images and deploys to EC2 via GitHub Container Registry (GHCR).

## File Structure

```
bluecouch/
├── .env                     # Environment variables (local development)
├── .env.example            # Environment template (committed to repo)
├── docker-compose.yml      # Multi-container orchestration (production)
├── docker-compose.local.yml # Local development orchestration
├── README.md               # This file
├── api/                    # FastAPI application
│   ├── Dockerfile         # Python API container definition
│   ├── main.py            # FastAPI application code
│   └── requirements.txt   # Python dependencies
├── web/                    # Node.js AdminJS interface
│   ├── Dockerfile         # Node.js container definition
│   ├── package.json       # Node.js dependencies
│   ├── server.ts          # AdminJS server code
│   └── tsconfig.json      # TypeScript configuration
└── .github/
    └── workflows/
        ├── build-api.yml  # CI/CD pipeline for API
        ├── build-web.yml  # CI/CD pipeline for Web
        ├── deploy-api.yml # Deploy API to EC2
        └── deploy-web.yml # Deploy Web to EC2
```

## Technology Stack

- **Backend**: FastAPI (Python 3.11)
- **Admin Interface**: Node.js + AdminJS (TypeScript)
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions → GitHub Container Registry
- **Deployment**: AWS EC2

## API Endpoints

### FastAPI (Python) - Port 8000
- `GET /healthz` - Health check endpoint
- `POST /items` - Create a new item
- `GET /items/{item_id}` - Get specific item by ID
- `GET /items` - List all items (with pagination)

### AdminJS (Node.js) - Port 3000
- `GET /admin` - Admin interface for database management
- `GET /healthz` - Health check endpoint

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
   curl http://localhost:3000/healthz
   ```

The API will be available at `http://localhost:8000`, AdminJS at `http://localhost:3000/admin`, and PostgreSQL at `localhost:5432`.

## Admin Interface

The Node.js service provides an AdminJS interface for database management:

- **URL**: `http://localhost:3000/admin` (local) or `http://<EC2_IP>:3000/admin` (production)
- **Login**: Use credentials from `.env` file (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- **Features**: 
  - View and edit database tables
  - Auto-discovery of PostgreSQL tables
  - Basic authentication protection
  - Clean, modern interface

### Local Development with Build Context

For local development, use the local compose file that builds from source:

```bash
docker compose -f docker-compose.local.yml up -d
```

## Deployment Workflow

### CI/CD Pipeline Overview

The project uses two GitHub Actions workflows that work together for automated building and deployment:

#### 1. Build Workflow (`.github/workflows/build-api.yml`)

**Purpose**: Builds and pushes Docker images to GitHub Container Registry

**Triggers**:
- Push to `api/` directory (any file changes)
- Changes to `docker-compose.yml`
- Changes to the workflow file itself

**Process**:
1. **Checkout**: Downloads the repository code
2. **Login**: Authenticates with GitHub Container Registry using `GITHUB_TOKEN`
3. **Build**: Creates Docker image from `api/Dockerfile`
4. **Tag**: Creates two tags:
   - `ghcr.io/nycounihan/bluecouch/api:{commit-sha}` (specific commit)
   - `ghcr.io/nycounihan/bluecouch/api:prod` (latest production)
5. **Push**: Uploads both tagged images to GHCR

**Key Features**:
- Automatically converts repository name to lowercase (required by GHCR)
- Uses commit SHA for unique versioning
- Maintains `:prod` tag for latest stable version

#### 2. Deploy Workflow (`.github/workflows/deploy-api.yml`)

**Purpose**: Deploys the built image to EC2 instance

**Triggers**:
- Push to `main` branch
- Changes to `api/` directory, `docker-compose.yml`, or workflow files

**Process**:
1. **SSH Connection**: Connects to EC2 using stored secrets
2. **Repository Sync**: Clones/updates the repository on EC2
3. **GHCR Login**: Authenticates with GitHub Container Registry
4. **Image Pull**: Downloads the latest `:prod` image
5. **Service Restart**: Restarts only the API container (database stays running)

**Required GitHub Secrets**:
- `EC2_HOST`: Public IP address of your EC2 instance
- `EC2_SSH_KEY`: Private SSH key for EC2 access
- `GHCR_PAT`: GitHub Personal Access Token with `read:packages` scope

**Key Features**:
- Zero-downtime deployment (only API container restarts)
- Automatic Docker Compose detection (plugin vs legacy)
- Safe error handling with `set -euo pipefail`
- Optional image cleanup after deployment

### Workflow Configuration Details

#### Build Workflow YAML Structure
```yaml
name: build-api
on:
  push:
    paths:
      - 'api/**'                    # Triggers on any API changes
      - 'docker-compose.yml'        # Triggers on compose changes
      - '.github/workflows/build-api.yml'  # Triggers on workflow changes

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read               # Read repository contents
      packages: write              # Write to GitHub Container Registry
    steps:
      - uses: actions/checkout@v4  # Checkout code
      - name: Login to GHCR        # Authenticate with registry
      - name: Build & push API image  # Build and push Docker image
```

#### Deploy Workflow YAML Structure
```yaml
name: deploy-api
on:
  push:
    branches: [ main ]             # Only deploy from main branch
    paths:
      - 'api/**'                   # API changes
      - 'docker-compose.yml'       # Compose changes
      - '.github/workflows/deploy-api.yml'  # Workflow changes

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Update service on EC2 (SSH)
        uses: appleboy/ssh-action@v1.2.0  # SSH into EC2
        with:
          host: ${{ secrets.EC2_HOST }}    # EC2 public IP
          username: ubuntu                  # EC2 username
          key: ${{ secrets.EC2_SSH_KEY }}  # SSH private key
          envs: GHCR_USER,GHCR_PAT         # Environment variables
          script: |                        # Deployment commands
            # Clone/update repository
            # Login to GHCR
            # Pull latest image
            # Restart API service
```

### Workflow Troubleshooting

#### Common Build Issues
- **"repository name must be lowercase"**: Fixed by converting `${{ github.repository }}` to lowercase
- **"permission denied"**: Ensure `packages: write` permission is set
- **"authentication failed"**: Check that `GITHUB_TOKEN` has proper permissions

#### Common Deploy Issues
- **"ssh: no key found"**: Verify `EC2_SSH_KEY` secret contains complete private key
- **"connection timeout"**: Check EC2 security group allows SSH (port 22)
- **"permission denied"**: Ensure SSH key has correct permissions on EC2
- **"image not found"**: Verify build workflow completed successfully

#### Debugging Workflows
1. **Check workflow logs** in GitHub Actions tab
2. **Verify secrets** are properly configured
3. **Test SSH connection** manually from local machine
4. **Check EC2 instance** is running and accessible

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
