# CelebrateMate — Backend

A Node.js/Express backend for **CelebrateMate**, a real-time event reminder app with SMS, Email, and AI-generated wishes.

## Features
- 📱 **SMS Notifications** via TextBee Gateway
- 📧 **Email Notifications** via Gmail/Nodemailer
- 🤖 **AI-Powered Wishes** via Google Gemini 2.5 Flash
- 🗓️ **Automated Scheduler** — cron-based event matching every minute
- 📦 **CSV Bulk Import** of contacts
- 📜 **Delivery History** with retry support
- 🎨 **Greeting Card Generator** using server-side Canvas

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- node-cron, Nodemailer, Axios, @google/generative-ai, canvas, multer

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
# Fill in your values in .env
```

### 3. Start MongoDB (locally)
```bash
mongod --dbpath ./mongodb_data --port 27017
```

### 4. Run the server
```bash
npm start          # production
npm run dev        # development (nodemon hot-reload)
```

Server runs on `https://watsapp-backend-td8c.onrender.com`

## API Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/contacts | List all contacts |
| POST   | /api/contacts | Create a contact |
| PUT    | /api/contacts/:id | Update a contact |
| DELETE | /api/contacts/:id | Delete a contact |
| POST   | /api/contacts/:id/test-sms | Send a test SMS |
| POST   | /api/email/send-custom-email | Send a custom email |
| POST   | /api/ai/generate-wish | Generate an AI wish |
| GET    | /api/card/generate | Generate a greeting card PNG |
| POST   | /api/import/csv | Bulk import contacts from CSV |
| GET    | /api/import/sample | Download CSV template |
| GET    | /api/logs | Delivery history |
| POST   | /api/logs/:id/retry | Retry a failed delivery |
| GET    | /api/health | Health check |
