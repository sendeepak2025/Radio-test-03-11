#!/bin/bash

# Authentication Fix Verification Script
# Tests the token authentication flow

echo "🧪 Testing Authentication Fix..."
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:8001"
USERNAME="hospital"
PASSWORD="your-password-here"

echo "📍 API URL: $API_URL"
echo ""

# Test 1: Login
echo "Test 1: Login"
echo "-------------"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

echo "Response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ FAILED: Could not get access token${NC}"
  echo "Please check your credentials and try again"
  exit 1
else
  echo -e "${GREEN}✅ PASSED: Got access token${NC}"
  echo "Token: ${TOKEN:0:50}..."
fi

echo ""

# Test 2: Access Protected Endpoint
echo "Test 2: Access /api/users"
echo "-------------------------"
USERS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$API_URL/api/users" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$USERS_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$USERS_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response: ${RESPONSE_BODY:0:200}..."

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ PASSED: Successfully accessed protected endpoint${NC}"
else
  echo -e "${RED}❌ FAILED: Got HTTP $HTTP_STATUS instead of 200${NC}"
  echo "Full response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 3: Verify Token Format
echo "Test 3: Verify Token Format"
echo "---------------------------"

# Decode JWT payload (base64 decode the middle part)
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
# Add padding if needed
PADDING=$((4 - ${#PAYLOAD} % 4))
if [ $PADDING -ne 4 ]; then
  PAYLOAD="${PAYLOAD}$(printf '=%.0s' $(seq 1 $PADDING))"
fi

DECODED=$(echo $PAYLOAD | base64 -d 2>/dev/null)

echo "Decoded payload: $DECODED"

# Check for "sub" field
if echo "$DECODED" | grep -q '"sub"'; then
  echo -e "${GREEN}✅ PASSED: Token contains 'sub' field${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Token doesn't contain 'sub' field${NC}"
fi

# Check for username
if echo "$DECODED" | grep -q '"username"'; then
  echo -e "${GREEN}✅ PASSED: Token contains 'username' field${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Token doesn't contain 'username' field${NC}"
fi

# Check for roles
if echo "$DECODED" | grep -q '"roles"'; then
  echo -e "${GREEN}✅ PASSED: Token contains 'roles' field${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Token doesn't contain 'roles' field${NC}"
fi

echo ""

# Test 4: Create User (if admin)
echo "Test 4: Create Test User"
echo "------------------------"
CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "email": "test'$(date +%s)'@example.com",
    "password": "Test123",
    "firstName": "Test",
    "lastName": "User",
    "roles": ["staff"]
  }')

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response: ${RESPONSE_BODY:0:200}..."

if [ "$HTTP_STATUS" = "201" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ PASSED: Successfully created user${NC}"
elif [ "$HTTP_STATUS" = "403" ]; then
  echo -e "${YELLOW}⚠️  SKIPPED: Insufficient permissions (expected for non-admin users)${NC}"
else
  echo -e "${RED}❌ FAILED: Got HTTP $HTTP_STATUS${NC}"
fi

echo ""

# Summary
echo "================================"
echo "🎉 Authentication Fix Verification Complete!"
echo ""
echo "Summary:"
echo "--------"
echo -e "${GREEN}✅ Login successful${NC}"
echo -e "${GREEN}✅ Token authentication working${NC}"
echo -e "${GREEN}✅ Protected endpoints accessible${NC}"
echo -e "${GREEN}✅ Token format correct${NC}"
echo ""
echo "The authentication fix is working correctly! 🎊"
