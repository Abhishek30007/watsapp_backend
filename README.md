# CelebrateMate — Backend

A Node.js/Express backend for **CelebrateMate**, a real-time event reminder platform with WhatsApp messaging and AI-generated wishes.

## Features
- 💬 **WhatsApp Notifications** via Twilio & Wappfly
- 🤖 **AI-Powered Wishes** via Google Gemini 2.5 Flash
- 🗓️ **Automated Scheduler** — cron-based event matching and BullMQ delayed job processing
- 📦 **Bulk CSV Import** — upload contacts with automated WhatsApp wish scheduling
- 📜 **Delivery History** with retry support
- 🎨 **Greeting Card Generator** using server-side Canvas

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- BullMQ + Redis (Distributed Asynchronous Job Queue & Delayed Scheduler)
- Twilio & Wappfly (WhatsApp Dispatcher)
- Axios, @google/generative-ai, canvas, multer, node-cron

## Distributed Architecture

CelebrateMate operates on a decoupled **Producer–Consumer** distributed model:
1. **Server 1 — Main API (Producer)**: Receives HTTP requests, handles CRUD operations, AI wish generation, and enqueues delayed jobs into BullMQ.
2. **Server 2 — Worker Service (Consumer)**: Listens to the Redis-backed BullMQ queue, executes jobs at scheduled delivery times, handles automatic retries with exponential backoff, and dispatches messages to WhatsApp via Twilio.

## Setup

### 1. Clone and install
```bash
git clone https://github.com/Abhishek30007/watsapp_backend.git
cd watsapp_backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your values in .env (MongoDB, Redis, Twilio, Gemini)
```

### 3. Start Infrastructure Services
- **MongoDB**:
  ```bash
  mongod --dbpath ./mongodb_data --port 27017
  ```
- **Redis** (Local or Docker):
  ```bash
  redis-server
  # or via docker:
  # docker run -d -p 6379:6379 redis:latest
  ```

### 4. Run the Servers

- **Run Server 1 (Main API Server / Producer)**:
  ```bash
  npm run start:api
  ```
  Runs on `http://localhost:5000`

- **Run Server 2 (Worker API / Consumer)**:
  ```bash
  npm run start:worker
  ```
  Consumes delayed jobs from BullMQ and sends WhatsApp messages via Twilio.

Server runs on `https://watsapp-backend-td8c.onrender.com`

## API Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/wishes | List all scheduled wishes |
| POST   | /api/wishes | Create a scheduled wish |
| PUT    | /api/wishes/:id | Update a scheduled wish |
| DELETE | /api/wishes/:id | Delete a scheduled wish |
| POST   | /api/wishes/:id/test-whatsapp | Send a test WhatsApp message |
| POST   | /api/ai/generate-wish | Generate an AI wish |
| GET    | /api/card/generate | Generate a greeting card PNG |
| POST   | /api/import/csv | Bulk import contacts from CSV & auto-schedule wishes |
| GET    | /api/import/sample | Download sample CSV template |
| GET    | /api/logs | Delivery history |
| POST   | /api/logs/:id/retry | Retry a failed delivery |
| GET    | /api/health | Health check |
