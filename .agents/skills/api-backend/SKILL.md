---
name: api-backend
description: Develop backend endpoints using Bun and Hono. Use this skill when asked to create new APIs, models, webhooks, or integrate services in the backend folder.
license: Complete terms in LICENSE.txt
---

# API Backend Development (Bun + Hono)

This skill guides the creation of the robust API required for the platform.

## 1. Framework & Environment

- Use **Hono** as the web framework running on **Bun**.
- Keep all code in strict TypeScript.
- Group routes by domain (e.g., `/api/products`, `/api/rentals`, `/api/webhooks`).

## 2. Architecture Pattern

Follow a clean, modular structure:
- **Routes**: Define the HTTP endpoints and middleware (auth, validation).
- **Controllers**: Handle request/response logic.
- **Services**: Contain the core business logic (e.g., checking availability, calculating prices).
- **Models**: Mongoose schemas defining the MongoDB collections.

## 3. Database Interactions

- Use Mongoose for MongoDB interactions.
- Always include timestamps (`timestamps: true` in schema).
- When querying for availability, write efficient queries using the mandatory indexes defined in the PRD (e.g., index on `start_date` and `end_date`).

## 4. Error Handling & Validation

- Use a validation library (like Zod) to validate incoming request bodies, especially for reservations and terms acceptance.
- Return consistent JSON error responses with appropriate HTTP status codes.

## 5. Security

- All routes related to user data or reservations must be protected by Clerk authentication middleware.
- Admin routes must verify the user's role before processing the request.
