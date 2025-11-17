#!/bin/bash

# Community Connect Database Restore Script
# This script restores Community Connect database from backups
# Usage: ./scripts/restore-database.sh <backup_file> [options]
#   options: --confirm (skip confirmation prompt)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_FILE="$1"
SKIP_CONFIRM="$2"

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    echo "Usage: ./scripts/restore-database.sh <backup_file> [--confirm]"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/ 2>/dev/null || echo "  No backups found in ./backups/"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Community Connect Database Restore${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "Backup File: ${YELLOW}$BACKUP_FILE${NC}"
echo -e "Database: ${YELLOW}$DATABASE_URL${NC}"
echo ""

# Warning prompt
if [ "$SKIP_CONFIRM" != "--confirm" ]; then
    echo -e "${RED}⚠️  WARNING: This will OVERWRITE existing data!${NC}"
    echo -e "${RED}⚠️  Make sure you have a current backup before proceeding.${NC}"
    echo ""
    read -p "Are you sure you want to restore? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${YELLOW}Restore cancelled${NC}"
        exit 0
    fi
fi

# Detect file type and decompress if needed
TEMP_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${BLUE}Decompressing backup file...${NC}"
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
elif [[ "$BACKUP_FILE" == *.dump ]]; then
    RESTORE_FILE="$BACKUP_FILE"
    IS_CUSTOM_FORMAT=true
else
    RESTORE_FILE="$BACKUP_FILE"
fi

echo -e "${GREEN}Starting restore...${NC}"
echo ""

# Perform restore based on format
if [ "$IS_CUSTOM_FORMAT" = true ]; then
    echo -e "${BLUE}Restoring from custom format...${NC}"
    if pg_restore -d "$DATABASE_URL" --verbose --clean --if-exists "$RESTORE_FILE"; then
        echo -e "${GREEN}✓ Restore completed successfully${NC}"
    else
        echo -e "${RED}✗ Restore failed${NC}"
        EXIT_CODE=1
    fi
else
    echo -e "${BLUE}Restoring from SQL format...${NC}"
    if psql "$DATABASE_URL" < "$RESTORE_FILE"; then
        echo -e "${GREEN}✓ Restore completed successfully${NC}"
    else
        echo -e "${RED}✗ Restore failed${NC}"
        EXIT_CODE=1
    fi
fi

# Cleanup temporary file
if [ -n "$TEMP_FILE" ]; then
    rm -f "$TEMP_FILE"
fi

# Post-restore steps
if [ -z "$EXIT_CODE" ]; then
    echo ""
    echo -e "${BLUE}Running post-restore optimizations...${NC}"
    
    # Vacuum and analyze
    echo "Running VACUUM ANALYZE..."
    psql "$DATABASE_URL" -c "VACUUM ANALYZE;" 2>/dev/null || echo -e "${YELLOW}⚠ VACUUM skipped (may require superuser)${NC}"
    
    # Reindex embeddings
    echo "Reindexing member_embeddings..."
    psql "$DATABASE_URL" -c "REINDEX TABLE member_embeddings;" 2>/dev/null || echo -e "${YELLOW}⚠ REINDEX skipped${NC}"
    
    echo ""
    echo -e "${GREEN}==================================================${NC}"
    echo -e "${GREEN}  Restore Complete${NC}"
    echo -e "${GREEN}==================================================${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify data integrity"
    echo "2. Regenerate embeddings if needed:"
    echo -e "   ${YELLOW}npm run generate:embeddings${NC}"
    echo "3. Test WhatsApp search functionality"
    echo ""
else
    exit $EXIT_CODE
fi
