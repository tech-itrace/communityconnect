#!/bin/bash
# Fresh Database Setup - Community Connect Lean Schema
set -e

echo "🔄 Fresh Database Setup - Lean Schema"
echo ""

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_NAME="${DATABASE_NAME:-communityconnect}"

# Backup if exists
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "📦 Backing up existing database..."
    mkdir -p backups
    pg_dump $DB_NAME > "backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "✓ Backup saved"
fi

# Drop and recreate
echo ""
echo "🗑️  Dropping database..."
dropdb --if-exists $DB_NAME

echo "✨ Creating fresh database..."
createdb $DB_NAME

# Install extensions and schema
echo "📊 Installing lean schema..."
psql -d $DB_NAME << 'EOF'
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Insert lean schema from file
\i ../docs/CommunityConnect_LEAN_SCHEMA.sql
EOF

# Create default community
echo "🏘️  Creating default community..."
psql -d $DB_NAME << 'EOF'
INSERT INTO communities (name, slug, type, settings)
VALUES ('Main Community', 'main-community', 'mixed', '{}')
ON CONFLICT (slug) DO NOTHING;
EOF

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. npm run import:members:lean"
echo "  2. npm run generate:embeddings:lean"
echo "  3. npm run dev"
