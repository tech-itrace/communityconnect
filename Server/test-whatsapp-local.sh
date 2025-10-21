#!/bin/bash

# Test WhatsApp webhook locally
# Usage: ./test-whatsapp-local.sh "find AI experts" "9876543210"

QUERY="${1:-find AI experts}"
PHONE="${2:-919943549835}"

echo "🧪 Testing WhatsApp Webhook Locally"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Phone: $PHONE"
echo "💬 Query: $QUERY"
echo ""

curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+91${PHONE}" \
  --data-urlencode "Body=${QUERY}" \
  --data-urlencode "ProfileName=Test User"

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
