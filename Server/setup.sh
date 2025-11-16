#!/bin/bash

# ============================================
# Community Connect - Clean Setup Automation
# ============================================
# This script automates the setup of Community Connect v2.0
# Run as: sudo ./setup.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="communityconnect"
DB_USER="community_app"
DB_PASSWORD=""  # Will be generated
REDIS_PORT=6379
PG_VERSION=16

# Logging
LOG_FILE="setup.log"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# ============================================
# 1. System Requirements Check
# ============================================
check_requirements() {
    log "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        log "✓ Detected Linux OS"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log "✓ Detected macOS"
    else
        error "Unsupported OS: $OSTYPE"
    fi
    
    # Check if running as root (for Linux)
    if [[ "$OS" == "linux" ]] && [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
    
    # Check disk space (need at least 5GB)
    FREE_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$FREE_SPACE" -lt 5 ]; then
        error "Insufficient disk space. Need at least 5GB, have ${FREE_SPACE}GB"
    fi
    log "✓ Sufficient disk space: ${FREE_SPACE}GB"
    
    # Check memory (need at least 2GB)
    if [[ "$OS" == "linux" ]]; then
        TOTAL_MEM=$(free -g | awk 'NR==2 {print $2}')
    else
        TOTAL_MEM=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
    fi
    
    if [ "$TOTAL_MEM" -lt 2 ]; then
        warn "Low memory: ${TOTAL_MEM}GB (2GB+ recommended)"
    else
        log "✓ Memory: ${TOTAL_MEM}GB"
    fi
}

# ============================================
# 2. Install PostgreSQL
# ============================================
install_postgresql() {
    log "Installing PostgreSQL $PG_VERSION..."
    
    if [[ "$OS" == "linux" ]]; then
        # Add PostgreSQL repository
        if ! command -v pg_config &> /dev/null; then
            log "Adding PostgreSQL APT repository..."
            apt-get install -y wget ca-certificates
            wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
            echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
            
            apt-get update
            apt-get install -y postgresql-$PG_VERSION postgresql-contrib-$PG_VERSION
            
            log "✓ PostgreSQL installed"
        else
            log "✓ PostgreSQL already installed"
        fi
        
        # Start PostgreSQL
        systemctl start postgresql
        systemctl enable postgresql
        
    elif [[ "$OS" == "macos" ]]; then
        if ! command -v psql &> /dev/null; then
            log "Installing PostgreSQL via Homebrew..."
            brew install postgresql@$PG_VERSION
            brew services start postgresql@$PG_VERSION
            log "✓ PostgreSQL installed"
        else
            log "✓ PostgreSQL already installed"
        fi
    fi
    
    # Wait for PostgreSQL to start
    sleep 3
}

# ============================================
# 3. Install pgvector
# ============================================
install_pgvector() {
    log "Installing pgvector extension..."
    
    if [[ "$OS" == "linux" ]]; then
        if ! dpkg -l | grep -q postgresql-$PG_VERSION-pgvector; then
            apt-get install -y postgresql-$PG_VERSION-pgvector
            log "✓ pgvector installed"
        else
            log "✓ pgvector already installed"
        fi
    elif [[ "$OS" == "macos" ]]; then
        if ! brew list pgvector &> /dev/null; then
            brew install pgvector
            log "✓ pgvector installed"
        else
            log "✓ pgvector already installed"
        fi
    fi
}

# ============================================
# 4. Install Node.js
# ============================================
install_nodejs() {
    log "Installing Node.js 18..."
    
    if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | sed 's/v//')" -lt 18 ]; then
        if [[ "$OS" == "linux" ]]; then
            # Install via NodeSource
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
        elif [[ "$OS" == "macos" ]]; then
            brew install node@18
        fi
        log "✓ Node.js installed: $(node -v)"
    else
        log "✓ Node.js already installed: $(node -v)"
    fi
    
    # Install pnpm (optional, faster alternative to npm)
    if ! command -v pnpm &> /dev/null; then
        npm install -g pnpm
        log "✓ pnpm installed"
    fi
}

# ============================================
# 5. Install Redis
# ============================================
install_redis() {
    log "Installing Redis..."
    
    if [[ "$OS" == "linux" ]]; then
        if ! command -v redis-cli &> /dev/null; then
            apt-get install -y redis-server
            systemctl start redis-server
            systemctl enable redis-server
            log "✓ Redis installed and started"
        else
            log "✓ Redis already installed"
        fi
    elif [[ "$OS" == "macos" ]]; then
        if ! command -v redis-cli &> /dev/null; then
            brew install redis
            brew services start redis
            log "✓ Redis installed and started"
        else
            log "✓ Redis already installed"
        fi
    fi
    
    # Test Redis connection
    if redis-cli ping | grep -q "PONG"; then
        log "✓ Redis is running"
    else
        error "Redis is not responding"
    fi
}

# ============================================
# 6. Setup Database
# ============================================
setup_database() {
    log "Setting up database..."
    
    # Generate strong password
    DB_PASSWORD=$(openssl rand -base64 24)
    
    # Create user and database
    if [[ "$OS" == "linux" ]]; then
        sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Enable pgvector
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
EOF
    elif [[ "$OS" == "macos" ]]; then
        psql postgres << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
EOF
    fi
    
    log "✓ Database created: $DB_NAME"
    log "✓ User created: $DB_USER"
}

# ============================================
# 7. Install Schema
# ============================================
install_schema() {
    log "Installing database schema..."
    
    SCHEMA_FILE="docs/communityconnect_schema_final.sql"
    
    if [ ! -f "$SCHEMA_FILE" ]; then
        error "Schema file not found: $SCHEMA_FILE"
    fi
    
    # Install schema
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -f $SCHEMA_FILE >> $LOG_FILE 2>&1
    
    if [ $? -eq 0 ]; then
        log "✓ Schema installed successfully"
    else
        error "Failed to install schema. Check $LOG_FILE for details"
    fi
    
    # Verify installation
    TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    log "✓ Tables created: $TABLE_COUNT"
}

# ============================================
# 8. Create Sample Community
# ============================================
create_sample_community() {
    log "Creating sample community..."
    
    COMMUNITY_ID=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "
        INSERT INTO communities (name, slug, type, description, subscription_plan, member_limit, is_bot_enabled)
        VALUES ('Tech Innovators Hub', 'tech-innovators', 'mixed', 'Sample community for testing', 'pro', 1000, true)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id;
    " | tr -d ' ')
    
    if [ -z "$COMMUNITY_ID" ]; then
        # Community already exists, fetch it
        COMMUNITY_ID=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "
            SELECT id FROM communities WHERE slug = 'tech-innovators';
        " | tr -d ' ')
    fi
    
    log "✓ Community created: $COMMUNITY_ID"
    echo "$COMMUNITY_ID" > .community_id
}

# ============================================
# 9. Setup Application
# ============================================
setup_application() {
    log "Setting up application..."
    
    # Generate secrets
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    
    COMMUNITY_ID=$(cat .community_id)
    
    # Create .env file for backend
    cat > Server/.env << EOF
# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Redis
REDIS_URL=redis://localhost:$REDIS_PORT

# Server
PORT=3000
NODE_ENV=development

# Schema
SCHEMA_VERSION=2.0
DEFAULT_COMMUNITY_ID=$COMMUNITY_ID

# Secrets (KEEP SECURE!)
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# DeepInfra (add your key)
DEEPINFRA_API_KEY=your_api_key_here
EMBEDDING_MODEL=BAAI/bge-base-en-v1.5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_MESSAGES=50
RATE_LIMIT_MAX_SEARCHES=30

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
EOF
    
    log "✓ Backend .env created"
    
    # Create .env for frontend
    cat > dashboard/.env << EOF
VITE_API_URL=http://localhost:3000
VITE_TEST_PHONE_NUMBER=+919876543210
VITE_ENV=development
EOF
    
    log "✓ Frontend .env created"
    
    # Install dependencies
    log "Installing backend dependencies..."
    cd Server && npm install >> ../$LOG_FILE 2>&1
    
    log "Installing frontend dependencies..."
    cd ../dashboard && npm install >> ../$LOG_FILE 2>&1
    cd ..
    
    # Create directories
    mkdir -p Server/logs Server/uploads Server/temp
    
    log "✓ Application setup complete"
}

# ============================================
# 10. Create Sample Data
# ============================================
create_sample_data() {
    log "Creating sample data..."
    
    COMMUNITY_ID=$(cat .community_id)
    
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME << EOF
-- Sample member 1: Alumni
WITH new_member AS (
    INSERT INTO members (phone, email, name) 
    VALUES ('+919876543210', 'john.doe@example.com', 'John Doe') 
    ON CONFLICT (phone) DO NOTHING
    RETURNING id
),
new_membership AS (
    INSERT INTO community_memberships (community_id, member_id, member_type, role)
    SELECT '$COMMUNITY_ID', id, 'alumni', 'member' FROM new_member
    ON CONFLICT DO NOTHING
    RETURNING id
)
INSERT INTO alumni_profiles (
    membership_id, college, graduation_year, degree, department,
    current_organization, designation, city, skills, domains
)
SELECT id, 'IIT Delhi', 2015, 'B.Tech', 'Computer Science',
    'Google India', 'Senior Software Engineer', 'Bangalore',
    ARRAY['Python', 'Machine Learning', 'TensorFlow'],
    ARRAY['Healthcare', 'Fintech']
FROM new_membership
ON CONFLICT DO NOTHING;

-- Sample member 2: Entrepreneur
WITH new_member AS (
    INSERT INTO members (phone, email, name) 
    VALUES ('+919876543211', 'priya.sharma@example.com', 'Priya Sharma') 
    ON CONFLICT (phone) DO NOTHING
    RETURNING id
),
new_membership AS (
    INSERT INTO community_memberships (community_id, member_id, member_type, role)
    SELECT '$COMMUNITY_ID', id, 'entrepreneur', 'member' FROM new_member
    ON CONFLICT DO NOTHING
    RETURNING id
)
INSERT INTO entrepreneur_profiles (
    membership_id, company, industry, company_stage,
    services_offered, expertise, city, looking_for
)
SELECT id, 'EcoTech Solutions', 'CleanTech', 'Series A',
    ARRAY['Solar panel installation', 'Energy audits'],
    ARRAY['Renewable energy', 'IoT', 'B2B sales'],
    'Pune',
    ARRAY['Investors', 'Technical co-founders']
FROM new_membership
ON CONFLICT DO NOTHING;

-- Admin user
WITH new_member AS (
    INSERT INTO members (phone, email, name) 
    VALUES ('+919876543212', 'admin@example.com', 'Admin User') 
    ON CONFLICT (phone) DO NOTHING
    RETURNING id
),
new_membership AS (
    INSERT INTO community_memberships (community_id, member_id, member_type, role)
    SELECT '$COMMUNITY_ID', id, 'generic', 'super_admin' FROM new_member
    ON CONFLICT DO NOTHING
    RETURNING id, member_id
)
INSERT INTO community_admins (community_id, member_id, role)
SELECT '$COMMUNITY_ID', member_id, 'super_admin' FROM new_membership
ON CONFLICT DO NOTHING;
EOF
    
    log "✓ Sample data created"
    log "  - John Doe (Alumni): +919876543210"
    log "  - Priya Sharma (Entrepreneur): +919876543211"
    log "  - Admin User: +919876543212"
}

# ============================================
# 11. Print Summary
# ============================================
print_summary() {
    COMMUNITY_ID=$(cat .community_id)
    
    echo ""
    echo "=========================================="
    echo "Setup Complete! 🎉"
    echo "=========================================="
    echo ""
    echo "Database:"
    echo "  Name: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Password: $DB_PASSWORD"
    echo ""
    echo "Community:"
    echo "  ID: $COMMUNITY_ID"
    echo "  Name: Tech Innovators Hub"
    echo ""
    echo "Sample Users:"
    echo "  Admin: +919876543212"
    echo "  Alumni: +919876543210"
    echo "  Entrepreneur: +919876543211"
    echo ""
    echo "Next Steps:"
    echo "  1. Update DEEPINFRA_API_KEY in Server/.env"
    echo "  2. Start backend: cd Server && npm run dev"
    echo "  3. Start frontend: cd dashboard && npm run dev"
    echo "  4. Open: http://localhost:5173"
    echo ""
    echo "Configuration saved to:"
    echo "  - Server/.env"
    echo "  - dashboard/.env"
    echo "  - .community_id"
    echo ""
    echo "⚠️  SECURITY: Save database password securely!"
    echo "=========================================="
    echo ""
    
    # Save credentials
    cat > .credentials << EOF
# Community Connect Setup Credentials
# Generated: $(date)

Database Name: $DB_NAME
Database User: $DB_USER
Database Password: $DB_PASSWORD
Database URL: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

Community ID: $COMMUNITY_ID

Admin User: +919876543212
Admin Email: admin@example.com

JWT Secret: $JWT_SECRET
Session Secret: $SESSION_SECRET

Redis: redis://localhost:$REDIS_PORT
EOF
    
    chmod 600 .credentials
    log "✓ Credentials saved to .credentials (secure mode)"
}

# ============================================
# Main Execution
# ============================================
main() {
    echo "=========================================="
    echo "Community Connect v2.0 - Setup Script"
    echo "=========================================="
    echo ""
    
    log "Starting setup process..."
    
    check_requirements
    install_postgresql
    install_pgvector
    install_nodejs
    install_redis
    setup_database
    install_schema
    create_sample_community
    setup_application
    create_sample_data
    print_summary
    
    log "Setup completed successfully!"
}

# Run main function
main "$@"
