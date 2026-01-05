# AKROBUD - Production Deployment Checklist

**Data:** 2025-12-29
**Wersja:** 1.0.0 (Post Critical Fixes)
**Status:** 📋 READY FOR DEPLOYMENT

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Database & Schema
- [x] Migracje zastosowane: `npx prisma migrate deploy`
- [x] Prisma client wygenerowany: `npx prisma generate`
- [ ] Backup bazy danych utworzony
- [ ] Foreign key constraints zweryfikowane
- [ ] Unique constraints zweryfikowane

**Weryfikacja:**
```bash
cd apps/api
npx prisma migrate status
# Powinno pokazać: "Database is up to date"
```

### 2. Environment Variables

#### Backend (.env)
- [ ] `DATABASE_URL` - Production database connection
- [ ] `PORT` - API port (default: 3001)
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` - Frontend URL
- [ ] `CHROME_PATH` - Chrome executable (dla Schuco scraper)
- [ ] Secrets (jeśli używane):
  - [ ] `JWT_SECRET`
  - [ ] `SENTRY_DSN` (optional)

#### Frontend (.env.local)
- [ ] `NEXT_PUBLIC_API_URL` - Production API URL
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (optional)

**Template `.env.production`:**
```env
# Database
DATABASE_URL="file:./prod.db"

# Server
PORT=3001
NODE_ENV=production

# CORS
CORS_ORIGIN="https://your-frontend-domain.com"

# Chrome (for Schuco scraper)
CHROME_PATH="/usr/bin/chromium-browser"

# Optional: Error Tracking
SENTRY_DSN="https://..."
```

### 3. Dependencies
- [ ] Node.js version verified (v18+ recommended)
- [ ] Dependencies installed: `pnpm install --frozen-lockfile`
- [ ] Production dependencies only (no devDependencies in prod)

**Weryfikacja:**
```bash
node --version  # >= 18
pnpm --version  # >= 8
```

### 4. Build Process

#### Backend
```bash
cd apps/api
pnpm build  # TypeScript compilation
```
- [ ] Build successful (no TypeScript errors)
- [ ] Output in `dist/` directory

#### Frontend
```bash
cd apps/web
pnpm build  # Next.js production build
```
- [ ] Build successful
- [ ] Output in `.next/` directory
- [ ] No console errors in build

### 5. Security

- [ ] Wszystkie endpoints z Authorization header (FAZA 1 ✅)
- [ ] Foreign key constraints aktywne (FAZA 2 ✅)
- [ ] No hardcoded secrets w kodzie
- [ ] CORS configured properly
- [ ] Rate limiting configured (recommended)

### 6. Performance

- [ ] Database indexes verified
- [ ] Prisma client connection pooling configured
- [ ] Static assets compressed (Next.js automatic)
- [ ] API response times acceptable (<200ms for most endpoints)

### 7. Monitoring & Logging

- [ ] Logger configured (Winston/Pino)
- [ ] Error tracking setup (Sentry - optional)
- [ ] Health check endpoint working: `GET /health`
- [ ] Metrics endpoint (optional): `GET /metrics`

### 8. Testing

- [ ] Manual testing completed:
  - [ ] Login/Authentication
  - [ ] CRUD operations (Orders, Deliveries, Warehouse)
  - [ ] PDF generation
  - [ ] Excel export
  - [ ] Schuco scraper
  - [ ] Glass tracking
- [ ] Critical paths verified:
  - [ ] No crashes on error states (FAZA 1 ✅)
  - [ ] Foreign key constraints working (FAZA 2 ✅)
  - [ ] Optimistic locking working (FAZA 2 ✅)

---

## 🚀 DEPLOYMENT STEPS

### Option 1: Manual Deployment

#### 1. Prepare Server
```bash
# SSH into server
ssh user@your-server.com

# Create project directory
mkdir -p /var/www/akrobud
cd /var/www/akrobud
```

#### 2. Clone & Setup
```bash
# Clone repository
git clone <your-repo-url> .

# Install dependencies
pnpm install --frozen-lockfile

# Setup environment
cp .env.example .env
# Edit .env with production values
nano .env
```

#### 3. Database Setup
```bash
cd apps/api

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Optional: Seed data
node prisma/seed.ts
```

#### 4. Build Applications
```bash
# Build backend
cd apps/api
pnpm build

# Build frontend
cd ../web
pnpm build
```

#### 5. Start Services

**Using PM2 (recommended):**
```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd apps/api
pm2 start dist/index.js --name akrobud-api

# Start frontend
cd ../web
pm2 start npm --name akrobud-web -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

**Using systemd:**
Create `/etc/systemd/system/akrobud-api.service`:
```ini
[Unit]
Description=AKROBUD API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/akrobud/apps/api
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable akrobud-api
systemctl start akrobud-api
systemctl status akrobud-api
```

#### 6. Setup Nginx (reverse proxy)
Create `/etc/nginx/sites-available/akrobud`:
```nginx
# API
server {
    listen 80;
    server_name api.akrobud.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name akrobud.com www.akrobud.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/akrobud /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### 7. SSL/TLS (Certbot)
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d akrobud.com -d www.akrobud.com -d api.akrobud.com
```

### Option 2: Docker Deployment

**Dockerfile (Backend):**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api

# Build
WORKDIR /app/apps/api
RUN pnpm build

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./prod.db
    volumes:
      - ./apps/api/prisma:/app/apps/api/prisma
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001
    depends_on:
      - api
    restart: unless-stopped
```

```bash
docker-compose up -d
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Health Checks
```bash
# API health
curl https://api.akrobud.com/health
# Expected: { "status": "ok" }

# Frontend
curl https://akrobud.com
# Expected: 200 OK
```

### 2. Database
```bash
# Verify migrations
cd apps/api
npx prisma migrate status

# Check data
npx prisma studio
```

### 3. Functionality Tests

#### Critical Paths:
- [ ] Login works
- [ ] Orders CRUD works
- [ ] Deliveries CRUD works
- [ ] Warehouse operations work
- [ ] PDF generation works
- [ ] Excel export works
- [ ] Schuco scraper works (if used)
- [ ] Glass tracking works

#### Error Handling:
- [ ] API errors show graceful UI (FAZA 1 fix)
- [ ] Foreign key constraints block invalid deletes (FAZA 2 fix)
- [ ] Concurrent updates handled correctly (FAZA 2 fix)

### 4. Performance
```bash
# Response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.akrobud.com/api/orders

# Expected: < 200ms for most endpoints
```

### 5. Logs
```bash
# PM2 logs
pm2 logs akrobud-api
pm2 logs akrobud-web

# systemd logs
journalctl -u akrobud-api -f
```

---

## 🔄 ROLLBACK PLAN

Jeśli coś pójdzie nie tak:

### 1. Application Rollback
```bash
# Stop services
pm2 stop all

# Revert to previous version
git checkout <previous-commit>

# Rebuild
pnpm build

# Restart
pm2 restart all
```

### 2. Database Rollback
```bash
# Revert last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Regenerate client
npx prisma generate
```

### 3. Full Rollback
```bash
# Restore database backup
cp backups/dev.db.backup apps/api/prisma/dev.db

# Revert code
git reset --hard <previous-commit>

# Reinstall & rebuild
pnpm install
pnpm build
pm2 restart all
```

---

## 📊 MONITORING

### Metrics to Track:
- [ ] API response times
- [ ] Error rates
- [ ] Database query performance
- [ ] Memory usage
- [ ] CPU usage
- [ ] Disk space

### Tools (Recommended):
- **PM2 Monitor:** `pm2 monit`
- **Sentry:** Error tracking
- **Grafana + Prometheus:** Metrics
- **New Relic / DataDog:** APM (optional)

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues:

#### Issue: "Database is locked"
**Solution:** SQLite doesn't support high concurrency. Consider PostgreSQL for production.

#### Issue: "Prisma Client not found"
**Solution:** Run `npx prisma generate`

#### Issue: "Port already in use"
**Solution:** Kill process on port: `lsof -ti:3001 | xargs kill -9`

#### Issue: "CORS errors"
**Solution:** Update `CORS_ORIGIN` in .env

---

## ✅ DEPLOYMENT SIGN-OFF

- [ ] All pre-deployment checks completed
- [ ] Deployment successful
- [ ] Post-deployment verification passed
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Documentation updated

**Deployed by:** _______________
**Date:** _______________
**Version:** 1.0.0
**Status:** 🟢 LIVE

---

**System gotowy do użycia!** 🚀
