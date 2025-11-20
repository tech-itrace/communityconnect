#!/bin/bash

# Backup Verification Script
# Verifies the integrity of a database backup file

set -e

BACKUP_FILE="${1:-backups/community_connect_backup_20251120_101706.sql.gz}"

echo "🔍 Verifying Database Backup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "✅ Backup file exists: $BACKUP_FILE"

# Check file size
FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "📦 File size: $FILE_SIZE"

# Check if gzipped
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "🗜️  File is compressed"

    # Test gunzip
    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        echo "✅ Compressed file is valid"
    else
        echo "❌ Compressed file is corrupted!"
        exit 1
    fi

    # Extract to temp for testing
    TEMP_SQL=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
    SQL_FILE="$TEMP_SQL"
else
    SQL_FILE="$BACKUP_FILE"
fi

echo ""
echo "📊 Backup Contents:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for required tables
REQUIRED_TABLES=("communities" "members" "community_memberships" "member_embeddings" "member_search_index")

for table in "${REQUIRED_TABLES[@]}"; do
    if grep -q "CREATE TABLE public.$table" "$SQL_FILE"; then
        # Count records
        COUNT=$(sed -n "/^COPY public\.$table/,/^\\\\.$/p" "$SQL_FILE" | grep -v "^COPY\|^\\\\\." | wc -l | tr -d ' ')
        printf "✅ %-30s %s records\n" "$table:" "$COUNT"
    else
        printf "❌ %-30s MISSING!\n" "$table:"
        exit 1
    fi
done

echo ""
echo "🔧 Verifying Components:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for indexes
INDEX_COUNT=$(grep -c "^CREATE.*INDEX" "$SQL_FILE" || echo 0)
echo "✅ Indexes: $INDEX_COUNT found"

# Check for HNSW vector indexes
HNSW_COUNT=$(grep -c "USING hnsw" "$SQL_FILE" || echo 0)
if [ "$HNSW_COUNT" -gt 0 ]; then
    echo "✅ HNSW vector indexes: $HNSW_COUNT found"
else
    echo "⚠️  Warning: No HNSW indexes found (may need to be recreated)"
fi

# Check for triggers
TRIGGER_COUNT=$(grep -c "CREATE TRIGGER" "$SQL_FILE" || echo 0)
echo "✅ Triggers: $TRIGGER_COUNT found"

# Check for foreign keys
FK_COUNT=$(grep -c "ALTER TABLE.*ADD CONSTRAINT.*FOREIGN KEY" "$SQL_FILE" || echo 0)
echo "✅ Foreign keys: $FK_COUNT found"

# Check for pgvector extension
if grep -q "CREATE EXTENSION.*vector" "$SQL_FILE"; then
    echo "✅ pgvector extension: included"
else
    echo "⚠️  Warning: pgvector extension not found in backup"
fi

echo ""
echo "📈 Data Statistics:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Total COPY statements (data inserts)
TOTAL_TABLES=$(grep -c "^COPY public\." "$SQL_FILE" || echo 0)
echo "Total tables with data: $TOTAL_TABLES"

# Calculate total records
TOTAL_RECORDS=0
while IFS= read -r line; do
    TABLE=$(echo "$line" | sed 's/COPY public\.\([^ ]*\).*/\1/')
    COUNT=$(sed -n "/^COPY public\.$TABLE/,/^\\\\.$/p" "$SQL_FILE" | grep -v "^COPY\|^\\\\\." | wc -l | tr -d ' ')
    TOTAL_RECORDS=$((TOTAL_RECORDS + COUNT))
done < <(grep "^COPY public\." "$SQL_FILE")

echo "Total records: $TOTAL_RECORDS"

# Check for embeddings
EMBEDDING_COUNT=$(sed -n "/^COPY public\.member_embeddings/,/^\\\\.$/p" "$SQL_FILE" | grep -v "^COPY\|^\\\\\." | wc -l | tr -d ' ')
if [ "$EMBEDDING_COUNT" -gt 0 ]; then
    echo "✅ Member embeddings: $EMBEDDING_COUNT found (768D vectors)"
else
    echo "⚠️  Warning: No member embeddings found"
fi

echo ""
echo "🎯 Backup Quality:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Calculate backup completeness score
SCORE=0
MAX_SCORE=10

# Schema checks (5 points)
[ "$INDEX_COUNT" -gt 0 ] && SCORE=$((SCORE + 1))
[ "$HNSW_COUNT" -gt 0 ] && SCORE=$((SCORE + 1))
[ "$TRIGGER_COUNT" -gt 0 ] && SCORE=$((SCORE + 1))
[ "$FK_COUNT" -gt 0 ] && SCORE=$((SCORE + 1))
grep -q "CREATE EXTENSION.*vector" "$SQL_FILE" && SCORE=$((SCORE + 1))

# Data checks (5 points)
[ "$TOTAL_RECORDS" -gt 0 ] && SCORE=$((SCORE + 1))
[ "$EMBEDDING_COUNT" -gt 0 ] && SCORE=$((SCORE + 1))
[ $(grep -c "^COPY public\.members" "$SQL_FILE" || echo 0) -gt 0 ] && SCORE=$((SCORE + 1))
[ $(grep -c "^COPY public\.communities" "$SQL_FILE" || echo 0) -gt 0 ] && SCORE=$((SCORE + 1))
[ $(grep -c "^COPY public\.community_memberships" "$SQL_FILE" || echo 0) -gt 0 ] && SCORE=$((SCORE + 1))

PERCENTAGE=$((SCORE * 100 / MAX_SCORE))

if [ "$PERCENTAGE" -eq 100 ]; then
    echo "✅ Backup Quality: EXCELLENT ($SCORE/$MAX_SCORE - $PERCENTAGE%)"
elif [ "$PERCENTAGE" -ge 80 ]; then
    echo "✅ Backup Quality: GOOD ($SCORE/$MAX_SCORE - $PERCENTAGE%)"
elif [ "$PERCENTAGE" -ge 60 ]; then
    echo "⚠️  Backup Quality: FAIR ($SCORE/$MAX_SCORE - $PERCENTAGE%)"
else
    echo "❌ Backup Quality: POOR ($SCORE/$MAX_SCORE - $PERCENTAGE%)"
fi

# Cleanup temp file if created
[ -n "$TEMP_SQL" ] && rm -f "$TEMP_SQL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backup verification complete!"
echo ""
echo "To restore this backup, run:"
echo "  gunzip -c $BACKUP_FILE | \\"
echo "    PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect"
echo ""
