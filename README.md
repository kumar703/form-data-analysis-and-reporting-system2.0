# Multi-Step Form App - Backend

## How to Run

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (if running locally without Docker)

### Quick Start (Docker Compose)

**From repo root:**

1. **Build & start DB + Redis + API dev container:**
   ```bash
   docker compose up --build -d
   ```

2. **Enter the backend container (optional) OR run commands on host if using local node:**
   ```bash
   # If using container and the service is named "api":
   docker compose exec api sh
   ```

3. **Inside backend (or on host) install deps & generate Prisma client:**
   ```bash
   cd backend
   npm ci
   npx prisma generate
   ```

4. **Run migrations and seed:**
   ```bash
   npx prisma migrate dev --name init
   npx ts-node --transpile-only prisma/seed.ts
   ```

5. **Start dev server (if not started by docker):**
   ```bash
   npm run dev
   ```

   **Or if docker already runs the api service and it runs npm run dev automatically, wait for logs:**
   ```bash
   docker compose logs -f api
   ```

### Option 2: Local Development (without Docker)

1. **Copy environment file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Update `.env` with your local database URL:**
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/formapp?schema=public
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   PORT=4000
   REDIS_URL=redis://localhost:6379
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

5. **Run migrations:**
   ```bash
   npm run prisma:migrate
   ```

6. **Seed the database:**
   ```bash
   npm run prisma:seed
   ```

7. **Start the development server:**
   ```bash
   npm run dev
   ```

### Test the API

**Signup:**
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","companyName":"TestCo"}'
```

**Login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@democo.io","password":"Password123!"}'
```

**Get Questions (requires JWT token from login):**
```bash
curl -X GET http://localhost:4000/api/questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Default Credentials (from seed)
- Email: `admin@democo.io`
- Password: `Password123!`
- Company: `DemoCo`

### Stop Services
```bash
docker-compose down
```

To remove volumes (clears database):
```bash
docker-compose down -v
```

