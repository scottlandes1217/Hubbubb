# Hubbubb

A Rails application for managing shelter operations.

## Prerequisites

- Docker and Docker Compose installed
- Docker Desktop running (or Docker daemon)

## Getting Started

### Running the Application Locally with Docker

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd Hubbubb
   ```

2. **Start all services**:
   ```bash
   docker-compose up
   ```
   
   Or if you're using newer Docker versions:
   ```bash
   docker compose up
   ```

   This will:
   - Build the Docker images
   - Start PostgreSQL database
   - Start Redis
   - Run database migrations
   - Start the Rails web server
   - Start the Sidekiq worker

3. **Access the application**:
   - Web application: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6380

4. **To run in the background**:
   ```bash
   docker-compose up -d
   ```

5. **To stop the application**:
   ```bash
   docker-compose down
   ```

6. **To view logs**:
   ```bash
   docker-compose logs -f
   ```

7. **To run Rails commands** (e.g., console, migrations):
   ```bash
   docker-compose exec web bundle exec rails console
   docker-compose exec web bundle exec rails db:migrate
   ```

## Services

The application consists of:
- **web**: Rails application server (port 3000)
- **worker**: Sidekiq background job processor
- **db**: PostgreSQL 15 database (port 5432)
- **redis**: Redis 7 cache/queue (port 6380)

## Database

The database is automatically created and migrated when you first run `docker-compose up`. The database configuration uses:
- Database: `hubbubb_development`
- Username: `postgres`
- Password: `password`
- Host: `db` (within Docker network)

## Development

The codebase is mounted as a volume, so you can make changes to files and they will be reflected immediately (though you may need to restart the server for some changes).
