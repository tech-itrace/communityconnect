#!/bin/bash

# WhatsApp Bot Local Testing - Quick Setup Script
# This script helps verify your environment is ready

echo "🚀 WhatsApp Bot - Environment Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Check Node.js
echo "1️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not found. Install from: https://nodejs.org"
    exit 1
fi
echo ""

# 2. Check npm
echo "2️⃣  Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: v$NPM_VERSION"
else
    check_fail "npm not found"
    exit 1
fi
echo ""

# 3. Check project directory
echo "3️⃣  Checking project structure..."
if [ -f "package.json" ]; then
    check_pass "Found package.json"
else
    check_fail "package.json not found. Are you in /Server directory?"
    echo "   Run: cd /Users/udhay/Documents/Candorbees/communityConnect/Server"
    exit 1
fi

if [ -f "src/server.ts" ]; then
    check_pass "Found src/server.ts"
else
    check_fail "src/server.ts not found"
    exit 1
fi

if [ -f "src/routes/whatsapp.ts" ]; then
    check_pass "Found WhatsApp route"
else
    check_fail "WhatsApp route not found"
    exit 1
fi
echo ""

# 4. Check dependencies
echo "4️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "node_modules exists"
else
    check_warn "node_modules not found. Run: npm install"
fi
echo ""

# 5. Check environment variables
echo "5️⃣  Checking environment variables..."
if [ -f ".env" ]; then
    check_pass "Found .env file"
    
    if grep -q "DATABASE_URL" .env; then
        check_pass "DATABASE_URL configured"
    else
        check_warn "DATABASE_URL not found in .env"
    fi
    
    # Check LLM provider configuration
    if grep -q "LLM_PROVIDER_PRIMARY" .env; then
        PRIMARY_PROVIDER=$(grep "LLM_PROVIDER_PRIMARY" .env | cut -d'=' -f2)
        check_pass "LLM_PROVIDER_PRIMARY configured: $PRIMARY_PROVIDER"
    else
        check_warn "LLM_PROVIDER_PRIMARY not found (defaults to deepinfra)"
    fi
    
    if grep -q "DEEPINFRA_API_KEY" .env; then
        check_pass "DEEPINFRA_API_KEY configured"
    else
        check_warn "DEEPINFRA_API_KEY not found in .env"
    fi
    
    if grep -q "GOOGLE_API_KEY" .env; then
        check_pass "GOOGLE_API_KEY configured (fallback provider)"
    else
        check_warn "GOOGLE_API_KEY not found (optional fallback)"
    fi
else
    check_fail ".env file not found"
    echo "   Create .env file with DATABASE_URL and API keys"
fi
echo ""

# 6. Check ngrok
echo "6️⃣  Checking ngrok..."
if command -v ngrok &> /dev/null; then
    NGROK_VERSION=$(ngrok --version | head -n 1)
    check_pass "ngrok installed: $NGROK_VERSION"
    
    # Check if ngrok is configured
    if [ -f "$HOME/.ngrok2/ngrok.yml" ]; then
        check_pass "ngrok configured (authtoken set)"
    else
        check_warn "ngrok not configured. Run: ngrok config add-authtoken YOUR_TOKEN"
    fi
else
    check_warn "ngrok not installed. Install: brew install ngrok/ngrok/ngrok"
    echo "   Or visit: https://ngrok.com/download"
fi
echo ""

# 7. Check if server is running
echo "7️⃣  Checking if server is running..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    check_pass "Server is running on port 3000"
    HEALTH=$(curl -s http://localhost:3000/health)
    echo "   Response: $HEALTH"
else
    check_warn "Server not running. Start with: npm run dev"
fi
echo ""

# 8. Check if ngrok is running
echo "8️⃣  Checking if ngrok is running..."
if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    check_pass "ngrok is running"
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -n 1 | cut -d'"' -f4)
    if [ ! -z "$NGROK_URL" ]; then
        echo "   🌐 Public URL: $NGROK_URL"
        echo "   📋 Webhook: $NGROK_URL/api/whatsapp/webhook"
    fi
else
    check_warn "ngrok not running. Start with: ngrok http 3000"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v ngrok &> /dev/null && [ -f ".env" ] && [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Environment looks good!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo ""
    
    if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "1. Start server:"
        echo "   $ npm run dev"
        echo ""
    fi
    
    if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        echo "2. Start ngrok (in new terminal):"
        echo "   $ ngrok http 3000"
        echo ""
    fi
    
    echo "3. Follow setup guide:"
    echo "   $ open docs/WALKTHROUGH-COMPLETE.md"
    echo ""
    echo "   Or visit: docs/README-TESTING.md"
    echo ""
else
    echo -e "${YELLOW}⚠️  Some issues found. Please fix them first.${NC}"
    echo ""
    
    if ! command -v ngrok &> /dev/null; then
        echo "→ Install ngrok: brew install ngrok/ngrok/ngrok"
    fi
    
    if [ ! -f ".env" ]; then
        echo "→ Create .env file with DATABASE_URL and DEEPINFRA_API_KEY"
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "→ Install dependencies: npm install"
    fi
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentation:"
echo "   Start here: docs/TESTING-SUMMARY.md"
echo "   Step-by-step: docs/WALKTHROUGH-COMPLETE.md"
echo "   Quick ref: docs/QUICK-REFERENCE.md"
echo ""
echo "🆘 Need help? Check: docs/TWILIO-TROUBLESHOOTING.md"
echo ""
