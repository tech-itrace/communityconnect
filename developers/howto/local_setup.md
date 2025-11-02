# Local Development Setup

## Prerequisites

Before starting, ensure you have:
- **Node.js** v20 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 16 (Community Edition) - *Recommended for pgvector compatibility*
- **Redis** (for sessions and rate limiting)
- **ngrok** (for WhatsApp/Twilio testing)

### Platform-Specific Prerequisites

**macOS:**
- Homebrew package manager ([Install](https://brew.sh/))
- Xcode Command Line Tools: `xcode-select --install`

**Linux (Ubuntu/Debian):**
- apt package manager (pre-installed)
- sudo access for system installations

**Windows:**
- **Option 1 (Recommended):** WSL2 (Windows Subsystem for Linux)
  - Allows running Linux commands and tools on Windows
  - Install: `wsl --install` in PowerShell (Administrator)
  - Then follow Linux installation steps inside WSL2
- **Option 2:** Native Windows installation
  - PostgreSQL Windows installer from EnterpriseDB
  - Memurai (Redis for Windows) or Docker
  - Git for Windows ([Download](https://git-scm.com/download/win))
  - Visual Studio Build Tools (for building native modules)

**Note for Windows Users:** While native Windows installation is possible, using WSL2 is recommended for a smoother development experience and better compatibility with shell scripts in this project.

---

## 1. PostgreSQL Local Setup

### macOS Installation (Tested & Verified ✅)

**Step 1: Install PostgreSQL 16**

```bash
# Install PostgreSQL 16 using Homebrew
brew install postgresql@16

# Link PostgreSQL 16 binaries to make them available in PATH
brew link postgresql@16 --force

# Add PostgreSQL 16 to your PATH permanently
echo 'export PATH="/usr/local/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc

# Reload your shell configuration
source ~/.zshrc

# Start PostgreSQL service
brew services start postgresql@16

# Verify installation (should show PostgreSQL 16.x)
psql --version
```

**Step 2: Install pgvector Extension**

The Homebrew pgvector formula only supports PostgreSQL 17/18, so we need to build from source:

```bash
# Clone pgvector repository
cd /tmp
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector

# Build for PostgreSQL 16
PG_CONFIG=/usr/local/opt/postgresql@16/bin/pg_config make

# Install (will prompt for your password)
sudo PG_CONFIG=/usr/local/opt/postgresql@16/bin/pg_config make install

# Cleanup temporary files
cd ~
rm -rf /tmp/pgvector
```

**Step 3: Create Database and User**

```bash
# Connect to PostgreSQL as superuser
psql postgres

# Inside psql prompt, create database and user:
CREATE DATABASE community_connect;
CREATE USER community_user WITH PASSWORD 'dev_password_123';
GRANT ALL PRIVILEGES ON DATABASE community_connect TO community_user;

# Switch to the new database
\c community_connect

# Grant schema privileges (required for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO community_user;

# Exit psql
\q
```

**Step 4: Enable pgvector Extension**

```bash
# Connect to community_connect database
psql -d community_connect

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify installation (should show vector 0.8.0)
\dx vector

# Test vector functionality
SELECT '[1,2,3]'::vector;

# Exit
\q
```

**Verification:**

```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Check database exists
psql -l | grep community_connect

# Check pgvector is installed
psql -d community_connect -c "\dx vector"
```

---

### Linux (Ubuntu/Debian) Installation

**Step 1: Install PostgreSQL 16**

```bash
# Add PostgreSQL APT repository
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh

# Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-client-16

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version  # Should show PostgreSQL 16.x
```

**Step 2: Install pgvector Extension**

```bash
# Install pgvector for PostgreSQL 16 (available from PostgreSQL APT repo)
sudo apt install -y postgresql-16-pgvector
```

**Step 3: Create Database and User**

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside psql prompt, create database and user:
CREATE DATABASE community_connect;
CREATE USER community_user WITH PASSWORD 'dev_password_123';
GRANT ALL PRIVILEGES ON DATABASE community_connect TO community_user;

# Switch to the new database
\c community_connect

# Grant schema privileges
GRANT ALL ON SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO community_user;

# Exit psql
\q
```

**Step 4: Enable pgvector Extension**

```bash
# Connect to community_connect database as postgres user
sudo -u postgres psql -d community_connect

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify installation
\dx vector

# Exit
\q
```

**Verification:**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep community_connect

# Check pgvector is installed
sudo -u postgres psql -d community_connect -c "\dx vector"
```

---

### Windows Installation

**Step 1: Install PostgreSQL 16**

1. Download PostgreSQL 16 installer from [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
   - Select Windows x86-64 version 16.x
   - Download the installer (approximately 200 MB)

2. Run the installer:
   - Accept default installation directory: `C:\Program Files\PostgreSQL\16`
   - Set a password for the `postgres` superuser (remember this!)
   - Keep default port: `5432`
   - Keep default locale
   - Uncheck "Stack Builder" at the end (not needed)

3. Add PostgreSQL to PATH:
   - Open "Environment Variables" (Search in Start menu)
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\Program Files\PostgreSQL\16\bin`
   - Click "OK" to save

4. Verify installation:
   ```cmd
   # Open Command Prompt or PowerShell
   psql --version
   # Should show: psql (PostgreSQL) 16.x
   ```

**Step 2: Install pgvector Extension**

1. Download pre-built pgvector binary:
   - Visit [pgvector releases](https://github.com/pgvector/pgvector/releases)
   - Download `pgvector-v0.8.0-pg16-windows-x64.zip`

2. Extract and install:
   ```powershell
   # Open PowerShell as Administrator
   
   # Extract the downloaded zip file to a temporary location
   # Then copy files to PostgreSQL directory
   
   # Copy vector.dll to lib directory
   Copy-Item "path\to\extracted\vector.dll" "C:\Program Files\PostgreSQL\16\lib\"
   
   # Copy vector.control and vector--*.sql files to extension directory
   Copy-Item "path\to\extracted\vector.control" "C:\Program Files\PostgreSQL\16\share\extension\"
   Copy-Item "path\to\extracted\vector--*.sql" "C:\Program Files\PostgreSQL\16\share\extension\"
   ```

**Alternative - Build from Source (Advanced):**

If pre-built binaries are not available:

```powershell
# Install Visual Studio 2022 Community (C++ development tools)
# Install Git for Windows

# Clone pgvector repository
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector

# Open "x64 Native Tools Command Prompt for VS 2022"
# Set PostgreSQL path
set PGROOT=C:\Program Files\PostgreSQL\16

# Build and install
nmake /F Makefile.win
nmake /F Makefile.win install
```

**Step 3: Create Database and User**

```cmd
# Open Command Prompt or PowerShell

# Connect to PostgreSQL as postgres user
psql -U postgres

# Inside psql prompt, enter the password you set during installation
# Then create database and user:

CREATE DATABASE community_connect;
CREATE USER community_user WITH PASSWORD 'dev_password_123';
GRANT ALL PRIVILEGES ON DATABASE community_connect TO community_user;

# Switch to the new database
\c community_connect

# Grant schema privileges
GRANT ALL ON SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO community_user;

# Exit psql
\q
```

**Step 4: Enable pgvector Extension**

```cmd
# Connect to community_connect database
psql -U postgres -d community_connect

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify installation (should show vector 0.8.0)
\dx vector

# Test vector functionality
SELECT '[1,2,3]'::vector;

# Exit
\q
```

**Verification:**

```cmd
# Check PostgreSQL service is running
# Open Services (services.msc) and look for "postgresql-x64-16"
# Or use PowerShell:
Get-Service postgresql*

# Check database exists
psql -U postgres -l | findstr community_connect

# Check pgvector is installed
psql -U postgres -d community_connect -c "\dx vector"
```

**Troubleshooting Windows Installation:**

If psql command is not found:
```cmd
# Verify PostgreSQL is in PATH
where psql

# If not found, add manually:
# 1. Copy this path: C:\Program Files\PostgreSQL\16\bin
# 2. Search for "Environment Variables" in Start menu
# 3. Edit PATH variable and add the path above
# 4. Restart your terminal
```

If PostgreSQL service won't start:
```cmd
# Check Windows Event Viewer for errors
# Or restart service manually:
net stop postgresql-x64-16
net start postgresql-x64-16
```

---

## 2. Redis Setup

### macOS Installation

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Test connection
redis-cli ping
# Should return: PONG
```

### Linux Installation

```bash
# Install Redis
sudo apt install -y redis-server

# Start Redis service
sudo systemctl start redis
sudo systemctl enable redis

# Test connection
redis-cli ping
```

### Windows Installation

**Option 1: Using WSL2 (Recommended)**

```powershell
# Install WSL2 if not already installed
wsl --install

# Inside WSL2 Ubuntu terminal:
sudo apt update
sudo apt install -y redis-server

# Start Redis
sudo service redis-server start

# Test connection
redis-cli ping
# Should return: PONG
```

**Option 2: Using Memurai (Redis for Windows)**

Memurai is a Redis-compatible server for Windows:

1. Download Memurai from [https://www.memurai.com/](https://www.memurai.com/)
   - Choose "Memurai Developer" (free version)
   - Download the Windows installer

2. Run the installer:
   - Accept the license agreement
   - Keep default installation path: `C:\Program Files\Memurai`
   - Choose "Install as Windows Service" (recommended)
   - Click "Install"

3. Verify installation:
   ```cmd
   # Open Command Prompt or PowerShell
   memurai-cli ping
   # Should return: PONG
   ```

4. Add to PATH (optional):
   ```cmd
   # Add to System Environment Variables:
   # C:\Program Files\Memurai
   ```

**Option 3: Redis Stack (Docker)**

If you have Docker Desktop for Windows:

```powershell
# Pull and run Redis Stack
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

# Test connection
docker exec -it redis-stack redis-cli ping
```

**Configuration for Windows:**

Update `Server/.env` to use appropriate Redis connection:

```bash
# For WSL2 or Memurai
REDIS_URL=redis://localhost:6379

# For Docker
REDIS_URL=redis://localhost:6379

REDIS_PASSWORD=
REDIS_TLS=false
```

**Troubleshooting Windows Redis:**

If Memurai service won't start:
```cmd
# Open Services (services.msc)
# Find "Memurai" service
# Right-click → Start

# Or via command line:
net start Memurai
```

If WSL2 Redis connection fails:
```bash
# Check Redis is running in WSL2
sudo service redis-server status

# If stopped, start it
sudo service redis-server start

# Check port is listening
sudo netstat -tlnp | grep 6379
```

---

## 3. Server Setup

### Install Dependencies

```bash
cd Server
npm install
```

### Configure Environment Variables

**macOS/Linux:**
```bash
# Copy example environment file
cp .env.example .env
```

**Windows (Command Prompt):**
```cmd
REM Copy example environment file
copy .env.example .env
```

**Windows (PowerShell):**
```powershell
# Copy example environment file
Copy-Item .env.example .env
```

Edit `.env` with your local configuration:

**macOS/Linux:**
```bash
# Use your preferred editor
nano .env
# or
vim .env
# or
code .env  # if using VS Code
```

**Windows:**
```cmd
REM Use Notepad
notepad .env

REM Or use VS Code
code .env
```

**Environment Variables (.env file):**

```bash
NODE_ENV=development
PORT=3000

# AI/LLM API Keys
DEEPINFRA_API_KEY=your_deepinfra_key_here

# Database Connection
# For local PostgreSQL (macOS/Linux)
DATABASE_URL=postgresql://community_user:dev_password_123@localhost:5432/community_connect

# For local PostgreSQL (Windows)
DATABASE_URL=postgresql://community_user:dev_password_123@localhost:5432/community_connect

# Local Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TLS=false

# Twilio WhatsApp (for testing - optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Rate Limiting
RATE_LIMIT_MESSAGES_PER_HOUR=50
RATE_LIMIT_SEARCHES_PER_HOUR=30
```

**Important Notes:**
- On Windows, if you installed PostgreSQL with a different username, update the `DATABASE_URL` accordingly
- The default PostgreSQL superuser on Windows is `postgres` (not `community_user`)
- Make sure `DATABASE_URL` matches the username and password you created in the PostgreSQL setup steps

### Initialize Database

```bash
# Verify environment setup
npm run check:env

# Create database schema (tables, indexes, pgvector setup)
npm run db:setup

# Import initial members from CSV
npm run import:members

# Generate vector embeddings for semantic search
npm run generate:embeddings

# Add role column to members table (required for authentication)
npm run db:add-roles
```

### Setup Admin User (Important! 🔑)

After importing members, you need to set at least one user as admin to access the dashboard:

```bash
# Connect to the database
psql -d community_connect

# View available members and their phone numbers
SELECT phone, name FROM community_members LIMIT 10;

# Set a member as admin (replace with actual phone number from your data)
UPDATE community_members SET role = 'admin' WHERE phone = '919840930854';

# Verify the update
SELECT phone, name, role FROM community_members WHERE role = 'admin';

# Exit psql
\q
```

**Role Types:**
- `member` - Can search and view profiles (default)
- `admin` - Can add/edit members, view analytics
- `super_admin` - Can delete members, manage other admins

### Start Development Server

```bash
# Start server with auto-reload
npm run dev
```

Server will be available at `http://localhost:3000`

---

## 4. Dashboard Setup

### Install Dependencies

```bash
cd dashboard
npm install
```

### Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_TEST_PHONE_NUMBER=919840930854
EOF
```

**Important:** Use a valid phone number from your database! 

To find available phone numbers:
```bash
psql -d community_connect -c "SELECT phone, name, role FROM community_members WHERE role = 'admin';"
```

### Start Development Server

```bash
npm run dev
```

Dashboard will be available at `http://localhost:5173`

### Dashboard Features

Once the dashboard is running, you'll have access to:

1. **Dashboard** (`/`) - Overview and analytics
2. **Members** (`/members`) - View, search, add, edit, and delete members
3. **Chat** (`/chat`) - Interactive chat interface to query members using natural language
4. **Settings** (`/settings`) - Application settings

**Chat Feature:**
The Chat page provides a conversational interface to interact with the community search bot:
- Ask questions in natural language: "Who works in tech?", "Find members in Chennai"
- Get instant responses powered by the LLM
- View suggestions for better queries
- Uses the same backend API (`/api/messages`) as WhatsApp integration

---

## 5. WhatsApp Testing with ngrok

### Install ngrok

**macOS:**
```bash
brew install ngrok

# Or download from https://ngrok.com/download
```

**Linux:**
```bash
# Download and install
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update
sudo apt install ngrok
```

**Windows:**

1. Download ngrok from [https://ngrok.com/download](https://ngrok.com/download)
   - Choose "Windows (64-bit)" or "Windows (32-bit)"
   - Extract the zip file to a location (e.g., `C:\ngrok`)

2. Add ngrok to PATH (optional):
   ```powershell
   # Open PowerShell as Administrator
   
   # Add to user PATH
   $env:Path += ";C:\ngrok"
   [Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::User)
   ```

3. Verify installation:
   ```cmd
   # Open new Command Prompt or PowerShell
   ngrok version
   ```

4. Sign up and authenticate:
   - Create free account at [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
   - Copy your authtoken from dashboard
   - Run in terminal:
   ```cmd
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```

### Setup Tunnel

**macOS/Linux:**
```bash
# In a separate terminal, start ngrok
ngrok http 3000
```

**Windows:**
```cmd
# In a separate Command Prompt or PowerShell, start ngrok
ngrok http 3000

# Or if not in PATH, navigate to ngrok directory:
cd C:\ngrok
ngrok.exe http 3000
```

You'll see output like:
```
Forwarding  https://abcd-1234-5678.ngrok-free.app -> http://localhost:3000
```

### Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to: Messaging → Try it out → Send a WhatsApp message
3. Select your WhatsApp Sandbox
4. Update "WHEN A MESSAGE COMES IN" webhook URL to:
   ```
   https://your-ngrok-url.ngrok-free.app/api/whatsapp/webhook
   ```
5. Method: `POST`

### Test WhatsApp

Send a message to your Twilio WhatsApp number:
```
Who works in tech?
```

---

## 6. Verification & Testing

### Test Database Connection

```bash
cd Server
npm run test:db
```

### Test Redis Connection

```bash
npm run test:redis
```

### Test WhatsApp Endpoint (Local)

```bash
npm run test:whatsapp
```

### Test Complete Auth Flow

```bash
npm run test:smart-auth
```

### Access Dashboard

1. Open `http://localhost:5173` in browser
2. Open browser console (F12 or Cmd+Option+I on Mac)
3. Set a valid phone number from your database:
   ```javascript
   // Use a phone number that exists in your database
   localStorage.setItem('userPhone', '919840930854')
   ```
4. Refresh the page
5. Navigate to Members section

**Troubleshooting "Unauthorized" errors:**
- Make sure the phone number exists in your database
- Check the phone number has a role assigned: `SELECT phone, name, role FROM community_members WHERE phone = '919840930854';`
- The phone number format should match exactly (including country code)

---

## 7. Common Issues & Solutions

### Frontend/API Issues

#### CORS Error When Accessing from Dashboard

**Symptom:** `Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:5173' has been blocked by CORS policy`

**Solution:**

The CORS middleware is configured in `Server/src/app.ts`. For local development, it should allow `localhost:5173`.

```bash
# Make sure cors package is installed
cd Server
npm install cors
npm install --save-dev @types/cors

# Restart your server
npm run dev
```

**Verify CORS is configured** in `Server/src/app.ts`:
```typescript
import cors from 'cors';

const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL?.split(',') || []
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

If you're deploying to production, add to `.env`:
```bash
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com
```

#### API Response Type Mismatch / "filter is not a function"

**Symptom:** `TypeError: members?.filter is not a function` or data not rendering in dashboard

**Cause:** The API returns data wrapped in a response object, not a plain array.

**Solution:**

The API returns:
```json
{
  "success": true,
  "members": [...],
  "pagination": {...}
}
```

Update your React Query to extract the array:
```typescript
// In Members.tsx or similar components
const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
        const response = await memberAPI.getAll();
        return response.data.members || []; // Extract members array
    },
});
```

Make sure API types in `dashboard/src/lib/api.ts` match the response:
```typescript
export interface MembersResponse {
    success: boolean;
    members: Member[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const memberAPI = {
    getAll: () => api.get<MembersResponse>('/api/members'),
    // ...
};
```

### PostgreSQL Issues

#### pgvector Extension Not Found

**Symptom:** `ERROR: extension "vector" is not available`

**Solution for macOS:**
```bash
# The Homebrew pgvector only works with PostgreSQL 17/18
# You need to build from source for PostgreSQL 16

cd /tmp
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
PG_CONFIG=/usr/local/opt/postgresql@16/bin/pg_config make
sudo PG_CONFIG=/usr/local/opt/postgresql@16/bin/pg_config make install
cd ~ && rm -rf /tmp/pgvector

# Then enable it in your database
psql -d community_connect -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Solution for Linux:**
```bash
# Install the PostgreSQL 16 specific package
sudo apt install -y postgresql-16-pgvector

# Then enable it
psql -d community_connect -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### Database Connection Refused

**Symptom:** `ECONNREFUSED` or `connection refused`

**Solution:**
```bash
# Check if PostgreSQL is running (macOS)
brew services list | grep postgresql

# If not running, start it
brew services start postgresql@16

# Check if PostgreSQL is running (Linux)
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql
```

#### Wrong PostgreSQL Version in PATH

**Symptom:** `psql --version` shows wrong version (e.g., 15.x instead of 16.x)

**Solution:**
```bash
# Update PATH in current session
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"

# Add to your shell profile permanently
echo 'export PATH="/usr/local/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
psql --version  # Should show 16.x
which psql      # Should show /usr/local/opt/postgresql@16/bin/psql
```

#### Permission Denied on Schema/Tables

**Symptom:** `ERROR: permission denied for schema public`

**Solution:**
```bash
# Connect as superuser and grant permissions
psql -d community_connect

# Run these commands:
GRANT ALL ON SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO community_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO community_user;
\q
```

### Redis Issues

#### Redis Connection Error

**Symptom:** `Redis connection error` or `ECONNREFUSED`

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start it (macOS)
brew services start redis

# If not running, start it (Linux)
sudo systemctl start redis

# Verify it's listening on port 6379
redis-cli -h localhost -p 6379 ping
```

### Server Issues

#### Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`

This happens when another process is using port 3000, often a previous server instance that didn't shut down properly.

**Quick Solution (macOS/Linux):**
```bash
# Kill all processes using port 3000
kill -9 $(lsof -ti:3000) 2>/dev/null || echo "Port 3000 is already free"

# Then restart your server
npm run dev
```

**Quick Solution (Windows - PowerShell):**
```powershell
# Find and kill process using port 3000
$port = 3000
$processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
if ($processId) {
    Stop-Process -Id $processId -Force
    Write-Host "Killed process using port $port"
} else {
    Write-Host "Port $port is already free"
}

# Then restart your server
npm run dev
```

**Quick Solution (Windows - Command Prompt):**
```cmd
REM Find process using port 3000
netstat -ano | findstr :3000

REM Kill the process (replace PID with the actual process ID from above)
taskkill /PID <PID> /F

REM Then restart your server
npm run dev
```

**Alternative Solution - Use a Different Port:**
```bash
# Edit Server/.env and change the port
PORT=3001

# Or run with custom port temporarily
PORT=3001 npm run dev
```

**Check What's Using the Port:**

**macOS/Linux:**
```bash
# See detailed information about processes on port 3000
lsof -i:3000

# This will show the PID, process name, and user
```

**Windows (PowerShell):**
```powershell
# See what's using port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess, @{Name="ProcessName";Expression={(Get-Process -Id $_.OwningProcess).ProcessName}}
```

**Windows (Command Prompt):**
```cmd
# See what's using port 3000
netstat -ano | findstr :3000
```

#### Environment Variables Not Loaded

**Symptom:** `Missing required environment variable: DATABASE_URL`

**Solution:**
```bash
# Make sure .env file exists
ls -la Server/.env

# If not, copy from example
cd Server
cp .env.example .env

# Edit the file and add your configuration
nano .env  # or use your preferred editor

# Verify environment is loaded
npm run check:env
```

### Database Setup Issues

#### Tables Already Exist

**Symptom:** `ERROR: relation "community_members" already exists`

**Solution:**
```bash
# The setup script uses CREATE TABLE IF NOT EXISTS, so this shouldn't be an error
# If you want to start fresh:

# Drop and recreate schema (⚠️ DESTRUCTIVE)
psql -d community_connect -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql -d community_connect -c "GRANT ALL ON SCHEMA public TO community_user;"

# Then re-run setup
cd Server
npm run db:setup
```

#### Import Members Fails

**Symptom:** `Error reading CSV file` or `ENOENT: no such file or directory`

**Solution:**
```bash
# Make sure the CSV file exists
ls -la Server/data/CommunityMemberDetails.csv

# Check the file path in the script
cat Server/src/scripts/importMembers.ts | grep "CommunityMemberDetails"

# Run import again
npm run import:members
```

### pgvector Build Issues (macOS)

#### Missing pg_config

**Symptom:** `pg_config: command not found`

**Solution:**
```bash
# Make sure PostgreSQL 16 is installed and linked
brew install postgresql@16
brew link postgresql@16 --force

# Verify pg_config is available
/usr/local/opt/postgresql@16/bin/pg_config --version
```

#### Missing Xcode Command Line Tools

**Symptom:** Build fails with compiler errors

**Solution:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Verify installation
xcode-select -p  # Should show path to developer tools
```

#### Permission Denied During Install

**Symptom:** `Permission denied` when running `sudo make install`

**Solution:**
```bash
# You need to enter your macOS password when prompted
# Make sure you're running the command correctly:

cd /tmp/pgvector
sudo PG_CONFIG=/usr/local/opt/postgresql@16/bin/pg_config make install
# Enter your password when prompted
```

---

## 8. Database Management Commands

### View All Tables

```bash
psql -d community_connect -c "\dt"
```

### Check Member Count

```bash
psql -d community_connect -c "SELECT COUNT(*) FROM community_members;"
```

### View Embeddings Status

```bash
psql -d community_connect -c "SELECT COUNT(*) FROM member_embeddings;"
```

### Reset Database (⚠️ Destructive)

```bash
# Drop all tables
psql -d community_connect -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run setup
cd Server
npm run db:setup
npm run import:members
npm run generate:embeddings
```

---

## 9. Development Workflow

### Typical Daily Workflow

**macOS/Linux:**
```bash
# Terminal 1 - Backend
cd Server
npm run dev

# Terminal 2 - Frontend  
cd dashboard
npm run dev

# Terminal 3 - ngrok (if testing WhatsApp)
ngrok http 3000
```

**Windows (Command Prompt/PowerShell):**
```cmd
REM Terminal 1 - Backend
cd Server
npm run dev

REM Terminal 2 - Frontend
cd dashboard
npm run dev

REM Terminal 3 - ngrok (if testing WhatsApp)
ngrok http 3000
```

**Windows (WSL2):**
```bash
# Terminal 1 - Backend
cd Server
npm run dev

# Terminal 2 - Frontend
cd dashboard
npm run dev

# Terminal 3 - ngrok (if testing WhatsApp)
ngrok http 3000
```

**Pro Tip for Windows Users:**
- Use **Windows Terminal** for better multi-tab experience
- Or use VS Code's integrated terminal with split panes
- Each terminal tab/pane should run one of the services above

### Making Database Changes

1. Modify schema in `Server/src/scripts/setupDatabase.ts`
2. Create migration script in `Server/src/scripts/`
3. Run migration: `npm run <script-name>`
4. Update TypeScript types in `Server/src/utils/types.ts`

### Adding New Members

```bash
# Via CSV import
npm run import:members

# Then generate embeddings
npm run generate:embeddings
```

---

## 10. PostgreSQL Connection String Format

```bash
# Local PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# With SSL (if required)
DATABASE_URL=postgresql://username:password@localhost:5432/database_name?sslmode=require

# Example
DATABASE_URL=postgresql://community_user:mypass123@localhost:5432/community_connect
```

---

## Quick Reference

### Service Ports

| Service | Default Port | Check Status |
|---------|--------------|--------------|
| PostgreSQL 16 | 5432 | `psql -l` or `brew services list \| grep postgresql` |
| Redis | 6379 | `redis-cli ping` |
| Backend Server | 3000 | `curl http://localhost:3000/health` |
| Frontend Dashboard | 5173 | Open `http://localhost:5173` |
| ngrok | Dynamic | Check terminal output for HTTPS URL |

### Common Commands

**PostgreSQL:**

*macOS:*
```bash
# Start/stop service
brew services start postgresql@16
brew services stop postgresql@16
brew services restart postgresql@16

# Connect to database
psql -d community_connect

# List databases
psql -l

# Check pgvector version
psql -d community_connect -c "\dx vector"
```

*Linux:*
```bash
# Start/stop service
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql

# Connect to database
sudo -u postgres psql -d community_connect

# List databases
sudo -u postgres psql -l

# Check pgvector version
sudo -u postgres psql -d community_connect -c "\dx vector"
```

*Windows:*
```cmd
REM Start/stop service via Services panel (services.msc)
REM Or use command line:
net start postgresql-x64-16
net stop postgresql-x64-16

REM Connect to database
psql -U postgres -d community_connect

REM List databases
psql -U postgres -l

REM Check pgvector version
psql -U postgres -d community_connect -c "\dx vector"
```

**Redis:**

*macOS:*
```bash
# Start/stop service
brew services start redis
brew services stop redis

# Test connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Clear all data (⚠️ use with caution)
redis-cli FLUSHALL
```

*Linux:*
```bash
# Start/stop service
sudo systemctl start redis
sudo systemctl stop redis

# Test connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Clear all data (⚠️ use with caution)
redis-cli FLUSHALL
```

*Windows (Memurai):*
```cmd
REM Start/stop service
net start Memurai
net stop Memurai

REM Test connection
memurai-cli ping

REM Monitor commands
memurai-cli monitor

REM Clear all data (⚠️ use with caution)
memurai-cli FLUSHALL
```

*Windows (WSL2):*
```bash
# Start/stop service
sudo service redis-server start
sudo service redis-server stop

# Test connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Clear all data (⚠️ use with caution)
redis-cli FLUSHALL
```

**Server:**
```bash
# Development mode with auto-reload
npm run dev

# Run database setup
npm run db:setup

# Import members from CSV
npm run import:members

# Generate embeddings
npm run generate:embeddings

# Check environment variables
npm run check:env
```

### Quick Start (After Initial Setup)

```bash
# Terminal 1: Start backend
cd Server && npm run dev

# Terminal 2: Start frontend
cd dashboard && npm run dev

# Terminal 3: Start ngrok (optional, for WhatsApp testing)
ngrok http 3000
```

### Database Connection Details

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `community_connect` |
| User | `community_user` |
| Password | `dev_password_123` (change in production!) |
| Connection String | `postgresql://community_user:dev_password_123@localhost:5432/community_connect` |

### Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 16.10 | Primary database |
| pgvector | 0.8.0 | Vector similarity search |
| Redis | Latest | Session management & rate limiting |
| Node.js | 20+ | Backend runtime |
| Express | Latest | Web framework |
| React | 18 | Frontend framework |
| Vite | Latest | Frontend build tool |

### Next Steps

- 📖 **WhatsApp Testing:** See `../../docs/START-HERE.md` for complete WhatsApp/Twilio setup walkthrough
- 🔐 **Authentication:** See `../../docs/SMART-AUTH-COMPLETE.md` for phone-based auth details
- 🗄️ **Database:** See `../../Server/SETUP.md` for advanced PostgreSQL configuration
- 📊 **Bulk Import:** See `../../docs/BULK-IMPORT-QUICKSTART.md` for importing member data
- 🎨 **Dashboard:** See `../../docs/DASHBOARD-QUICK-START.md` for frontend development guide

### Support & Documentation

- **Project Documentation:** `/docs` folder
- **API Reference:** `/Server/openapi.yaml`
- **Architecture Diagrams:** `/docs/ARCHITECTURE-DIAGRAM.md`
- **Troubleshooting:** Section 7 of this document

---

**Setup Complete! 🎉**

You now have a fully functional local development environment with:
- ✅ PostgreSQL 16 with pgvector extension
- ✅ Redis for sessions and caching
- ✅ Backend server ready to run
- ✅ Frontend dashboard ready to develop

Run `npm run dev` in both `Server` and `dashboard` directories to start developing!
