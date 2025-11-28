# Mini-Uber Dockerized

## Quick Start

```bash
# Build and run everything
make build

# Or using docker-compose directly
docker-compose up --build
```

## Services

- **Client**: http://localhost:5173 (React frontend)
- **Server**: http://localhost:8000 (FastAPI backend)
- **Database**: localhost:5436 (PostgreSQL)

## Commands

```bash
make build    # Build and start all services
make start    # Start existing containers
make stop     # Stop all services
make clean    # Remove containers and volumes
make logs     # View logs
```

## Architecture

The application creates dynamic Docker containers for each ride on ports 7000+.