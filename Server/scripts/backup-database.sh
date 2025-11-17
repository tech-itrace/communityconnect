#!/bin/bash

# Community Connect Database Backup Script
# This script backs up all Community Connect database tables
# Usage: ./scripts/backup-database.sh [backup_type]
#   backup_type: full (default), schema-only, data-only, tables-only

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BACKUP_TYPE="${1:-full}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_NAME="communityconnect_${BACKUP_TYPE}_${TIMESTAMP}"

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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Community Connect Tables
CORE_TABLES=(
    "communities"
    "members"
    "community_memberships"
)

PROFILE_TABLES=(
    "alumni_profiles"
    "entrepreneur_profiles"
    "resident_profiles"
)

EMBEDDING_TABLES=(
    "member_embeddings"
    "member_search_index"
)

CACHE_TABLES=(
    "search_queries"
    "search_cache"
)

AUDIT_TABLES=(
    "audit_logs"
)

ALL_TABLES=(
    "${CORE_TABLES[@]}"
    "${PROFILE_TABLES[@]}"
    "${EMBEDDING_TABLES[@]}"
    "${CACHE_TABLES[@]}"
    "${AUDIT_TABLES[@]}"
)

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Community Connect Database Backup${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "Backup Type: ${YELLOW}$BACKUP_TYPE${NC}"
echo -e "Timestamp: ${YELLOW}$TIMESTAMP${NC}"
echo -e "Backup Directory: ${YELLOW}$BACKUP_DIR${NC}"
echo ""

# Function to perform backup
perform_backup() {
    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.sql"
    local options=""
    
    case $BACKUP_TYPE in
        "full")
            echo -e "${GREEN}Creating full database backup (schema + data)...${NC}"
            options="--verbose"
            ;;
        "schema-only")
            echo -e "${GREEN}Creating schema-only backup...${NC}"
            options="--schema-only --verbose"
            ;;
        "data-only")
            echo -e "${GREEN}Creating data-only backup...${NC}"
            options="--data-only --verbose"
            ;;
        "tables-only")
            echo -e "${GREEN}Creating core tables backup (members + embeddings)...${NC}"
            options="--verbose"
            for table in "${CORE_TABLES[@]}" "${PROFILE_TABLES[@]}" "${EMBEDDING_TABLES[@]}"; do
                options="$options -t $table"
            done
            ;;
        "core-only")
            echo -e "${GREEN}Creating core tables backup (no cache/audit)...${NC}"
            options="--verbose"
            for table in "${CORE_TABLES[@]}" "${PROFILE_TABLES[@]}" "${EMBEDDING_TABLES[@]}"; do
                options="$options -t $table"
            done
            ;;
        *)
            echo -e "${RED}Invalid backup type: $BACKUP_TYPE${NC}"
            echo "Valid types: full, schema-only, data-only, tables-only, core-only"
            exit 1
            ;;
    esac
    
    # Perform backup
    if pg_dump "$DATABASE_URL" $options > "$backup_file"; then
        echo -e "${GREEN}✓ Backup completed successfully${NC}"
        echo -e "Backup file: ${YELLOW}$backup_file${NC}"
        
        # Get file size
        file_size=$(du -h "$backup_file" | cut -f1)
        echo -e "File size: ${YELLOW}$file_size${NC}"
        
        # Compress backup
        echo -e "${BLUE}Compressing backup...${NC}"
        gzip "$backup_file"
        compressed_size=$(du -h "${backup_file}.gz" | cut -f1)
        echo -e "${GREEN}✓ Compressed: ${YELLOW}${backup_file}.gz${NC} (${compressed_size})"
        
        return 0
    else
        echo -e "${RED}✗ Backup failed${NC}"
        return 1
    fi
}

# Function to create custom format backup (compressed, restorable)
create_custom_backup() {
    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.dump"
    
    echo ""
    echo -e "${BLUE}Creating custom format backup (for selective restore)...${NC}"
    
    if pg_dump "$DATABASE_URL" -Fc --verbose -f "$backup_file"; then
        file_size=$(du -h "$backup_file" | cut -f1)
        echo -e "${GREEN}✓ Custom backup created: ${YELLOW}$backup_file${NC} (${file_size})"
    else
        echo -e "${YELLOW}⚠ Custom backup failed (optional)${NC}"
    fi
}

# Main execution
perform_backup

# Create custom format backup for full backups
if [ "$BACKUP_TYPE" = "full" ]; then
    create_custom_backup
fi

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Backup Summary${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "Location: ${YELLOW}$BACKUP_DIR${NC}"
echo ""
echo "To restore this backup:"
echo -e "${YELLOW}  # SQL format:${NC}"
echo "  gunzip ${BACKUP_NAME}.sql.gz"
echo "  psql \"\$DATABASE_URL\" < ${BACKUP_DIR}/${BACKUP_NAME}.sql"
echo ""
echo -e "${YELLOW}  # Custom format (if available):${NC}"
echo "  pg_restore -d \"\$DATABASE_URL\" ${BACKUP_DIR}/${BACKUP_NAME}.dump"
echo ""
echo -e "${BLUE}Tables backed up:${NC}"
for table in "${ALL_TABLES[@]}"; do
    echo "  - $table"
done
echo ""
echo -e "${GREEN}✓ Backup process completed${NC}"
