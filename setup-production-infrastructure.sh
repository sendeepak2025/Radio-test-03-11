#!/bin/bash

echo "🏗️ Setting up Production Infrastructure..."
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Backend server is not running!"
    echo "Please start the server first: cd server && npm start"
    exit 1
fi

echo "✅ Backend server is running"
echo ""

# Get auth token
echo "📝 Please enter your login credentials:"
read -p "Username: " username
read -sp "Password: " password
echo ""

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$username\",\"password\":\"$password\"}" \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed! Please check your credentials."
    exit 1
fi

echo "✅ Login successful"
echo ""

# Sync worklist from studies
echo "🔄 Syncing worklist from studies database..."
SYNC_RESULT=$(curl -s -X POST http://localhost:3000/api/worklist/sync \
  -H "Authorization: Bearer $TOKEN")

echo "$SYNC_RESULT" | grep -q '"success":true'
if [ $? -eq 0 ]; then
    CREATED=$(echo "$SYNC_RESULT" | grep -o '"created":[0-9]*' | cut -d':' -f2)
    SKIPPED=$(echo "$SYNC_RESULT" | grep -o '"skipped":[0-9]*' | cut -d':' -f2)
    TOTAL=$(echo "$SYNC_RESULT" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    
    echo "✅ Worklist synced successfully!"
    echo "   - Created: $CREATED new worklist items"
    echo "   - Skipped: $SKIPPED existing items"
    echo "   - Total studies: $TOTAL"
else
    echo "⚠️ Worklist sync failed or no studies found"
fi

echo ""

# Get worklist statistics
echo "📊 Fetching worklist statistics..."
STATS=$(curl -s http://localhost:3000/api/worklist/stats \
  -H "Authorization: Bearer $TOKEN")

echo "$STATS" | grep -q '"success":true'
if [ $? -eq 0 ]; then
    echo "✅ Worklist Statistics:"
    echo "$STATS" | python3 -m json.tool 2>/dev/null || echo "$STATS"
else
    echo "⚠️ Could not fetch statistics"
fi

echo ""
echo "🎉 Production Infrastructure Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Open your browser to: http://localhost:5173/worklist"
echo "2. View the worklist with all your studies"
echo "3. Click 'Start Reading' to begin workflow"
echo "4. Create reports and they'll be saved to database"
echo ""
echo "📚 Documentation: PRODUCTION_INFRASTRUCTURE_COMPLETE.md"
echo ""
