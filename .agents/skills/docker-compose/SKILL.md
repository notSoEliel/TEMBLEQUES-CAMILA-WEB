---
name: docker-compose
description: Setup and manage the Docker infrastructure for the project. Use this skill when the user asks to configure containers, docker-compose files, or setup the local development/testing environment.
license: Complete terms in LICENSE.txt
---

# Docker Infrastructure Configuration

This skill guides the creation of the Docker environment as specified in the PRD.

## 1. Required Services

Your `docker-compose.yml` must include at least:
- **frontend**: React/Vite application.
- **backend**: Bun/Hono API.
- **mongodb**: The primary database.

## 2. Network & Volumes

- All services must be on a shared internal Docker network (e.g., `tembleques_network`).
- MongoDB MUST have a named volume (e.g., `mongodb_data:/data/db`) to ensure data persists across container restarts.

## 3. Health Checks

Implement health checks to ensure dependencies are ready:
- The backend should wait for MongoDB to be healthy before starting.
- Example for MongoDB:
  ```yaml
  healthcheck:
    test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
    interval: 10s
    timeout: 10s
    retries: 5
  ```

## 4. Environment Variables

- Configure services using an `.env` file.
- Pass necessary variables like `MONGO_URI`, `STRIPE_SECRET_KEY`, and `CLERK_SECRET_KEY` to the backend container.
- Use `env_file: .env` in the compose configurations.

## 5. Execution

The goal is that a developer can run `docker compose up --build` and have the entire system working without manual configuration.
