# 🚀 Deployment Guide - AI Cloud Cost & Security Advisor

This document provides step-by-step instructions for deploying the **AI Cloud Cost & Security Advisor** platform to production.

---

## 🏗️ Architecture Overview

* **Frontend**: Next.js 16 (React 19, Turbopack, Tailwind CSS v4, Zustand) -> **Hosted on Vercel**
* **Backend API & Queue Workers**: Express.js + Node.js + BullMQ Workers -> **Hosted on Render / Railway / Fly.io**
* **Database**: PostgreSQL (Prisma ORM) -> **Hosted on Neon.tech / Supabase**
* **Cache & Queues**: Redis -> **Hosted on Upstash / Render Redis**

---

## 1. 🌐 Deploying Frontend on Vercel

### Step 1: Connect to Vercel
1. Push your repository to **GitHub / GitLab / Bitbucket**.
2. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." > "Project"**.
3. Import your project repository.

### Step 2: Configure Project Settings in Vercel
* **Framework Preset**: Next.js
* **Root Directory**: `frontend`
* **Build Command**: `npm run build`
* **Output Directory**: `.next`

### Step 3: Environment Variables
Add the following variable in the Vercel project settings:

| Key | Value Example | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-api.onrender.com/api` | URL of your deployed Express backend API |

Click **Deploy**. Vercel will build and launch your production frontend site.

---

## 2. 🗄️ Database & Redis Setup

### PostgreSQL Database (Neon.tech or Supabase)
1. Create a free PostgreSQL instance at [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Copy your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<dbname>?sslmode=require"
   ```

### Redis Instance (Upstash or Render Redis)
1. Create a free Redis instance at [Upstash.com](https://upstash.com) or [Render.com](https://render.com).
2. Copy your Redis connection URL:
   ```env
   REDIS_URL="rediss://default:<password>@<host>:6379"
   ```

---

## 3. ⚙️ Deploying Backend (Render / Railway)

### Step 1: Deploy Web Service (API)
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **"New +" > "Web Service"** and select your GitHub repository.
3. Set the following details:
   * **Root Directory**: `backend`
   * **Environment**: `Node`
   * **Build Command**: `npm install && npm run build && npx prisma migrate deploy`
   * **Start Command**: `npm run start`

### Step 2: Backend Environment Variables
Set the following environment variables in Render/Railway:

```env
PORT=5001
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
REDIS_URL="rediss://default:password@host:6379"
JWT_SECRET="your-secure-jwt-secret-min-32-chars"
JWT_REFRESH_SECRET="your-secure-jwt-refresh-secret-min-32-chars"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
FRONTEND_URL="https://your-app.vercel.app"
OPENAI_API_KEY="sk-proj-your-openai-api-key"
```

---

## 4. 🔄 Running Production Database Migrations & Seeds

Run database migrations against your remote production database from your machine or CI/CD pipeline:

```bash
cd backend
# Run migrations on remote DB
npx prisma migrate deploy

# (Optional) Open Prisma Studio to inspect production data
npx prisma studio
```

---

## 🧪 Verification After Deployment

1. **Frontend Ping**: Visit `https://your-app.vercel.app/login`
2. **Backend Health Check**: Open `https://your-backend-api.onrender.com/api/health`
   - Expected Output:
     ```json
     {"success": true, "status": "healthy", "timestamp": "..."}
     ```
3. **Authentication**: Test registering a new user or logging in with valid credentials.
