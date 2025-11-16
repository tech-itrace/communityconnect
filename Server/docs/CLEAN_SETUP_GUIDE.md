# Clean Setup Guide: Community Connect v2.0

## Overview

This guide provides step-by-step instructions for setting up Community Connect v2.0 with the new multi-community schema from scratch. Use this for:
- New deployments
- Development environments
- Staging environments
- Testing environments

**Estimated Time**: 30-45 minutes  
**Prerequisites**: PostgreSQL 16+, Node.js 18+, Redis 6+

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Database Setup](#2-database-setup)
3. [Schema Installation](#3-schema-installation)
4. [Application Setup](#4-application-setup)
5. [Sample Data (Optional)](#5-sample-data-optional)
6. [Verification](#6-verification)
7. [Production Deployment](#7-production-deployment)

---

## 1. System Requirements

### Minimum Requirements
- **OS**: Ubuntu 22.04 LTS / macOS 12+ / Windows 11 (WSL2)
- **RAM**: 4 GB (8 GB recommended for production)
- **Disk**: 20 GB free space
- **CPU**: 2 cores (4+ for production)

### Software Dependencies

#### PostgreSQL 16+
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-16 postgresql-contrib-16

# macOS (via Homebrew)
brew install postgresql@16

# Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql@16  # macOS
```

#### pgvector Extension
```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# macOS (via Homebrew)
brew install pgvector

# Verify installation
psql -c "CREATE EXTENSION IF NOT EXISTS vector;" -d postgres
```

#### Node.js 18+
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
nvm install 18
nvm use 18

# Verify
node --version  # Should be v18.x.x or higher
npm --version   # Should be 9.x.x or higher
```

#### Redis 6+
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Start Redis
sudo systemctl start redis  # Linux
brew services start redis   # macOS

# Verify
redis-cli ping  # Should return "PONG"
```

---

## 2. Database Setup

### 2.1 Create Database User

```bash
# Switch to postgres user (Linux)
sudo -u postgres psql

# Or directly (macOS)
psql postgres
```

```sql
-- Create application user with strong password
CREATE USER community_app WITH PASSWORD 'your_secure_password_here';

-- Grant necessary permissions
ALTER USER community_app WITH CREATEDB;

-- Create database
CREATE DATABASE communityconnect 
    WITH OWNER = community_app
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE communityconnect TO community_app;

-- Exit psql
\q
```

### 2.2 Configure PostgreSQL for pgvector

**Edit `postgresql.conf`:**

```bash
# Find config file location
psql -U postgres -c "SHOW config_file;"

# Edit config (replace path with yours)
sudo nano /etc/postgresql/16/main/postgresql.conf
```

**Add/modify these settings:**

```conf
# Memory settings for embeddings
shared_buffers = 256MB           # 25% of RAM for production
effective_cache_size = 1GB       # 50-75% of RAM
work_mem = 16MB                  # For sorting/aggregations
maintenance_work_mem = 128MB     # For index creation

# Vector search optimization
max_parallel_workers_per_gather = 2
random_page_cost = 1.1           # For SSD storage
effective_io_concurrency = 200   # For SSD storage

# Connection limits
max_connections = 100
```

**Restart PostgreSQL:**

```bash
# Linux
sudo systemctl restart postgresql

# macOS
brew services restart postgresql@16
```

### 2.3 Test Database Connection

```bash
# Test connection
psql -U community_app -d communityconnect -c "SELECT version();"

# Should show PostgreSQL 16.x version
```

---

## 3. Schema Installation

### 3.1 Download Schema File

```bash
# Navigate to project directory
cd /path/to/communityConnect/Server

# Ensure schema file exists
ls -lh docs/communityconnect_schema_final.sql
```

### 3.2 Install Schema

```bash
# Run schema installation
psql -U community_app -d communityconnect -f docs/communityconnect_schema_final.sql

# You should see output like:
# CREATE EXTENSION
# CREATE TABLE
# CREATE INDEX
# ...
# NOTICE: Community Connect Schema v2.0 installed successfully!
```

### 3.3 Verify Schema Installation

```bash
psql -U community_app -d communityconnect << 'EOF'
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check extensions
SELECT extname, extversion FROM pg_extension;

-- Check vector indexes
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE indexdef LIKE '%hnsw%';
EOF
```

**Expected Output:**
```
table_name
------------------------
alumni_profiles
communities
community_admins
community_memberships
embedding_generation_jobs
entrepreneur_profiles
member_embeddings
member_search_index
members
query_embedding_cache
resident_profiles
search_cache
search_queries
users
(14 rows)

extname | extversion
---------+-----------
uuid-ossp | 1.1
vector    | 0.5.0
(2 rows)
```

---

## 4. Application Setup

### 4.1 Clone Repository (if not already done)

```bash
git clone https://github.com/tech-itrace/communityconnect.git
cd communityconnect/Server
```

### 4.2 Install Dependencies

```bash
# Install backend dependencies
cd Server
npm install

# Install frontend dependencies
cd ../dashboard
npm install
```

### 4.3 Configure Environment Variables

**Backend (`Server/.env`):**

```bash
# Copy example environment file
cd Server
cp .env.example .env

# Edit with your values
nano .env
```

```env
# Database
DATABASE_URL=postgresql://community_app:your_secure_password_here@localhost:5432/communityconnect

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development

# Schema Version
SCHEMA_VERSION=2.0
DEFAULT_COMMUNITY_ID=  # Will be populated after creating first community

# DeepInfra API (for embeddings)
DEEPINFRA_API_KEY=your_deepinfra_api_key_here
EMBEDDING_MODEL=BAAI/bge-base-en-v1.5

# Twilio WhatsApp (optional for now)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# JWT Secret (generate a strong random string)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000  # 1 hour
RATE_LIMIT_MAX_MESSAGES=50
RATE_LIMIT_MAX_SEARCHES=30

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

**Frontend (`dashboard/.env`):**

```bash
cd ../dashboard
cp .env.example .env
nano .env
```

```env
# API Configuration
VITE_API_URL=http://localhost:3000

# Test phone (for development authentication)
VITE_TEST_PHONE_NUMBER=+919876543210

# Environment
VITE_ENV=development
```

### 4.4 Create Required Directories

```bash
# Backend
cd Server
mkdir -p logs uploads temp

# Set permissions
chmod 755 logs uploads temp
```

### 4.5 Build Application

```bash
# Backend (if using TypeScript)
cd Server
npm run build

# Frontend
cd ../dashboard
npm run build
```

---

## 5. Sample Data (Optional)

### 5.1 Create Sample Community

```bash
psql -U community_app -d communityconnect << 'EOF'
-- Create a sample community
INSERT INTO communities (
    name, 
    slug, 
    type, 
    description,
    subscription_plan,
    member_limit,
    is_bot_enabled,
    is_active
) VALUES (
    'Tech Innovators Hub',
    'tech-innovators',
    'mixed',
    'A community for tech professionals, entrepreneurs, and innovators',
    'pro',
    1000,
    true,
    true
) RETURNING id, name, slug;
EOF
```

**Save the returned `id` - you'll need it for `DEFAULT_COMMUNITY_ID` in `.env`**

### 5.2 Create Sample Members

**Script: `Server/src/scripts/createSampleData.ts`:**

```typescript
import { query } from '../config/db';

const COMMUNITY_ID = process.env.DEFAULT_COMMUNITY_ID;

async function createSampleData() {
    console.log('[Sample Data] Creating sample members...');
    
    // Sample member 1: Alumni
    const member1 = await query(`
        INSERT INTO members (phone, email, name) 
        VALUES ($1, $2, $3) 
        RETURNING id
    `, ['+919876543210', 'john.doe@example.com', 'John Doe']);
    
    const membership1 = await query(`
        INSERT INTO community_memberships (community_id, member_id, member_type, role)
        VALUES ($1, $2, 'alumni', 'member')
        RETURNING id
    `, [COMMUNITY_ID, member1.rows[0].id]);
    
    await query(`
        INSERT INTO alumni_profiles (
            membership_id, college, graduation_year, degree, department,
            current_organization, designation, city, skills, domains
        ) VALUES (
            $1, 'IIT Delhi', 2015, 'B.Tech', 'Computer Science',
            'Google India', 'Senior Software Engineer', 'Bangalore',
            ARRAY['Python', 'Machine Learning', 'TensorFlow'],
            ARRAY['Healthcare', 'Fintech']
        )
    `, [membership1.rows[0].id]);
    
    // Sample member 2: Entrepreneur
    const member2 = await query(`
        INSERT INTO members (phone, email, name) 
        VALUES ($1, $2, $3) 
        RETURNING id
    `, ['+919876543211', 'priya.sharma@example.com', 'Priya Sharma']);
    
    const membership2 = await query(`
        INSERT INTO community_memberships (community_id, member_id, member_type, role)
        VALUES ($1, $2, 'entrepreneur', 'member')
        RETURNING id
    `, [COMMUNITY_ID, member2.rows[0].id]);
    
    await query(`
        INSERT INTO entrepreneur_profiles (
            membership_id, company, industry, company_stage,
            services_offered, expertise, city, looking_for
        ) VALUES (
            $1, 'EcoTech Solutions', 'CleanTech', 'Series A',
            ARRAY['Solar panel installation', 'Energy audits'],
            ARRAY['Renewable energy', 'IoT', 'B2B sales'],
            'Pune',
            ARRAY['Investors', 'Technical co-founders']
        )
    `, [membership2.rows[0].id]);
    
    // Create admin user
    const adminMember = await query(`
        INSERT INTO members (phone, email, name) 
        VALUES ($1, $2, $3) 
        RETURNING id
    `, ['+919876543212', 'admin@example.com', 'Admin User']);
    
    const adminMembership = await query(`
        INSERT INTO community_memberships (community_id, member_id, member_type, role)
        VALUES ($1, $2, 'generic', 'super_admin')
        RETURNING id
    `, [COMMUNITY_ID, adminMember.rows[0].id]);
    
    await query(`
        INSERT INTO community_admins (community_id, member_id, role)
        VALUES ($1, $2, 'super_admin')
    `, [COMMUNITY_ID, adminMember.rows[0].id]);
    
    console.log('[Sample Data] ✓ Created 3 sample members');
    console.log('[Sample Data] ✓ Members:');
    console.log('  - John Doe (Alumni): +919876543210');
    console.log('  - Priya Sharma (Entrepreneur): +919876543211');
    console.log('  - Admin User (Super Admin): +919876543212');
}

createSampleData()
    .then(() => {
        console.log('[Sample Data] Complete!');
        process.exit(0);
    })
    .catch(err => {
        console.error('[Sample Data] Error:', err);
        process.exit(1);
    });
```

**Run:**

```bash
cd Server
npm run create:sample-data
# or
ts-node src/scripts/createSampleData.ts
```

### 5.3 Generate Sample Embeddings

```bash
# Run embedding generation for sample members
npm run generate:embeddings -- --community-id=$DEFAULT_COMMUNITY_ID
```

---

## 6. Verification

### 6.1 Database Verification

```bash
psql -U community_app -d communityconnect << 'EOF'
-- Comprehensive health check
SELECT 
    'Communities' as entity,
    COUNT(*) as count
FROM communities
UNION ALL
SELECT 'Members', COUNT(*) FROM members
UNION ALL
SELECT 'Active Memberships', COUNT(*) FROM community_memberships WHERE is_active
UNION ALL
SELECT 'Alumni Profiles', COUNT(*) FROM alumni_profiles
UNION ALL
SELECT 'Entrepreneur Profiles', COUNT(*) FROM entrepreneur_profiles
UNION ALL
SELECT 'Embeddings', COUNT(*) FROM member_embeddings
UNION ALL
SELECT 'Search Index Entries', COUNT(*) FROM member_search_index
UNION ALL
SELECT 'Community Admins', COUNT(*) FROM community_admins;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
WHERE schemaname = 'public'
  AND indexdef LIKE '%hnsw%';
EOF
```

### 6.2 Application Startup

**Terminal 1 - Backend:**
```bash
cd Server
npm run dev

# Should see:
# [Server] Starting Community Connect v2.0...
# [Database] Connected to PostgreSQL
# [Redis] Connected successfully
# [Server] Listening on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd dashboard
npm run dev

# Should see:
# VITE v5.x.x  ready in XXX ms
# ➜  Local:   http://localhost:5173/
```

### 6.3 API Health Check

```bash
# Health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "2.0.0",
#   "database": "connected",
#   "redis": "connected",
#   "timestamp": "2025-11-16T10:30:00.000Z"
# }

# Test search API
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find Python developers",
    "communityId": "'$DEFAULT_COMMUNITY_ID'"
  }'
```

### 6.4 Frontend Verification

Open browser: `http://localhost:5173`

**Test:**
1. ✅ Login with test phone: +919876543212
2. ✅ View members list
3. ✅ Search for members
4. ✅ View member profile
5. ✅ Check analytics dashboard

---

## 7. Production Deployment

### 7.1 Production Database Setup

```bash
# Use managed PostgreSQL (recommended)
# - AWS RDS for PostgreSQL
# - Google Cloud SQL for PostgreSQL
# - Azure Database for PostgreSQL
# - DigitalOcean Managed PostgreSQL

# Or self-hosted with replication:
# Primary database: For read/write
# Replica database: For read-only queries (search)
```

**Enable SSL:**

```sql
-- Update DATABASE_URL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### 7.2 Environment Configuration

**Production `.env`:**

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/communityconnect?sslmode=require
REDIS_URL=redis://prod-redis:6379
PORT=3000

# Use strong secrets (generate new ones!)
JWT_SECRET=<long-random-string>
SESSION_SECRET=<long-random-string>

# Production rate limits (more restrictive)
RATE_LIMIT_MAX_MESSAGES=30
RATE_LIMIT_MAX_SEARCHES=20

# Logging
LOG_LEVEL=warn
```

### 7.3 Database Optimization

```sql
-- Create indexes for production scale
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_community_active 
ON community_memberships(community_id, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_community_time 
ON search_queries(community_id, created_at DESC);

-- Autovacuum settings
ALTER TABLE member_embeddings SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

-- Enable query logging for slow queries
ALTER DATABASE communityconnect 
SET log_min_duration_statement = 1000;  -- Log queries > 1s
```

### 7.4 Application Deployment (using PM2)

```bash
# Install PM2
npm install -g pm2

# Start backend
cd Server
pm2 start npm --name "communityconnect-api" -- run start

# Start background jobs
pm2 start src/scripts/embeddingWorker.js --name "embedding-worker"

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit
```

### 7.5 Nginx Configuration

```nginx
# /etc/nginx/sites-available/communityconnect

upstream backend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.communityconnect.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.communityconnect.com;
    
    ssl_certificate /etc/letsencrypt/live/communityconnect.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/communityconnect.com/privkey.pem;
    
    # API endpoints
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=20 nodelay;
}

# Frontend
server {
    listen 443 ssl http2;
    server_name communityconnect.com;
    
    ssl_certificate /etc/letsencrypt/live/communityconnect.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/communityconnect.com/privkey.pem;
    
    root /var/www/communityconnect/dashboard/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable and restart:**

```bash
sudo ln -s /etc/nginx/sites-available/communityconnect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7.6 SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d communityconnect.com -d api.communityconnect.com
```

### 7.7 Monitoring Setup

**Database Monitoring:**

```sql
-- Create monitoring view
CREATE VIEW v_system_health AS
SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size('communityconnect')) as value
UNION ALL
SELECT 
    'Active Connections',
    COUNT(*)::text
FROM pg_stat_activity
WHERE datname = 'communityconnect'
UNION ALL
SELECT
    'Embeddings Count',
    COUNT(*)::text
FROM member_embeddings
UNION ALL
SELECT
    'Cache Hit Rate',
    ROUND(
        100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0),
        2
    )::text || '%'
FROM pg_stat_database
WHERE datname = 'communityconnect';

-- Query for slow queries
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Application Monitoring (Optional - Add Prometheus/Grafana):**

```bash
# Install node exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-*.tar.gz
sudo cp node_exporter-*/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

---

## 8. Backup & Disaster Recovery

### 8.1 Automated Backups

**Create backup script: `/usr/local/bin/backup-communityconnect.sh`:**

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/communityconnect"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="communityconnect"
DB_USER="community_app"
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U $DB_USER -d $DB_NAME \
    --format=custom \
    --file=$BACKUP_DIR/db_backup_$DATE.dump

# Compress
gzip $BACKUP_DIR/db_backup_$DATE.dump

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.dump.gz s3://your-bucket/backups/

# Delete old backups
find $BACKUP_DIR -name "db_backup_*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

**Setup cron job:**

```bash
sudo chmod +x /usr/local/bin/backup-communityconnect.sh
sudo crontab -e

# Add daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-communityconnect.sh >> /var/log/communityconnect-backup.log 2>&1
```

### 8.2 Restore Procedure

```bash
# Stop application
pm2 stop all

# Restore database
pg_restore -U community_app -d communityconnect \
    --clean \
    --if-exists \
    /var/backups/communityconnect/db_backup_YYYYMMDD_HHMMSS.dump.gz

# Restart application
pm2 restart all

# Verify
curl http://localhost:3000/health
```

---

## 9. Post-Setup Checklist

### Development Environment
- [ ] PostgreSQL 16+ installed with pgvector
- [ ] Redis installed and running
- [ ] Node.js 18+ installed
- [ ] Schema installed successfully
- [ ] Sample data created
- [ ] Application starts without errors
- [ ] Health endpoint responds
- [ ] Frontend loads successfully

### Production Environment
- [ ] Managed PostgreSQL configured
- [ ] SSL/TLS enabled for database
- [ ] Redis configured (consider managed Redis)
- [ ] Environment variables set correctly
- [ ] Strong JWT/session secrets generated
- [ ] Nginx configured with SSL
- [ ] PM2 process manager configured
- [ ] Automated backups configured
- [ ] Monitoring setup (optional)
- [ ] Domain/subdomain DNS configured
- [ ] Firewall rules configured

---

## 10. Troubleshooting

### Issue: pgvector extension not found

```bash
# Install pgvector
sudo apt install postgresql-16-pgvector

# Verify
psql -U postgres -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```

### Issue: Cannot connect to database

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check pg_hba.conf for connection rules
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add line:
# host    communityconnect    community_app    127.0.0.1/32    md5
```

### Issue: Embeddings not generating

```bash
# Check DeepInfra API key
echo $DEEPINFRA_API_KEY

# Test API manually
curl -X POST https://api.deepinfra.com/v1/inference/BAAI/bge-base-en-v1.5 \
  -H "Authorization: Bearer $DEEPINFRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "test embedding"}'
```

### Issue: Slow queries

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM member_embeddings
WHERE membership_id = 'some-uuid';

-- Rebuild indexes if needed
REINDEX INDEX CONCURRENTLY idx_embeddings_profile;

-- Vacuum and analyze
VACUUM ANALYZE member_embeddings;
```

---

## Next Steps

1. **Read Documentation**: `docs/EMBEDDING_STRATEGY.md`
2. **Configure Communities**: Create your first community via API or SQL
3. **Import Members**: Use bulk import CSV feature
4. **Generate Embeddings**: Run embedding generation job
5. **Test Search**: Try semantic search queries
6. **Setup WhatsApp**: Configure Twilio integration
7. **Deploy Dashboard**: Build and deploy frontend

---

## Support

**Documentation**: `/docs` directory  
**GitHub Issues**: https://github.com/tech-itrace/communityconnect/issues  
**Email Support**: support@communityconnect.com

---

**Congratulations! Your Community Connect v2.0 setup is complete! 🎉**
