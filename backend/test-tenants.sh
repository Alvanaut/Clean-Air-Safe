#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "==================================================="
echo "Test Tenants CRUD - CleanAirSafe Backend"
echo "==================================================="
echo ""

# Step 1: Login as GODMODE user to get token
echo "==================================================="
echo "Step 1: Login as GODMODE user"
echo "==================================================="
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@cleanairsafe.com","password":"Admin123!"}' | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed. Make sure the GODMODE user exists."
  echo "Run: npm run test:auth first to create the user"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Create a new tenant
echo "==================================================="
echo "Step 2: Create a new tenant"
echo "==================================================="
TENANT_RESPONSE=$(curl -s -X POST $BASE_URL/tenants \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Company Inc",
    "company_name": "Test Company Incorporated",
    "contact_email": "contact@testcompany.com",
    "contact_phone": "+32 2 123 45 67",
    "default_co2_threshold": 800,
    "sync_enabled": true,
    "status": "active"
  }')

echo "$TENANT_RESPONSE" | jq
TENANT_ID=$(echo "$TENANT_RESPONSE" | jq -r '.data.id')
echo ""
echo "Created Tenant ID: $TENANT_ID"
echo ""

# Step 3: Get all tenants
echo "==================================================="
echo "Step 3: Get all tenants"
echo "==================================================="
curl -s -X GET $BASE_URL/tenants \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 4: Get single tenant by ID
echo "==================================================="
echo "Step 4: Get tenant by ID"
echo "==================================================="
curl -s -X GET $BASE_URL/tenants/$TENANT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 5: Get tenant stats
echo "==================================================="
echo "Step 5: Get tenant statistics"
echo "==================================================="
curl -s -X GET $BASE_URL/tenants/$TENANT_ID/stats \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 6: Update tenant
echo "==================================================="
echo "Step 6: Update tenant"
echo "==================================================="
curl -s -X PUT $BASE_URL/tenants/$TENANT_ID \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "default_co2_threshold": 900,
    "contact_email": "updated@testcompany.com"
  }' | jq
echo ""

# Step 7: Suspend tenant
echo "==================================================="
echo "Step 7: Suspend tenant"
echo "==================================================="
curl -s -X POST $BASE_URL/tenants/$TENANT_ID/suspend \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 8: Activate tenant
echo "==================================================="
echo "Step 8: Activate tenant"
echo "==================================================="
curl -s -X POST $BASE_URL/tenants/$TENANT_ID/activate \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 9: Test unauthorized access (without token)
echo "==================================================="
echo "Step 9: Test unauthorized access (no token)"
echo "Expected: 401 Unauthorized"
echo "==================================================="
curl -s -X GET $BASE_URL/tenants
echo -e "\n"

# Step 10: Delete tenant
echo "==================================================="
echo "Step 10: Delete tenant"
echo "==================================================="
curl -s -X DELETE $BASE_URL/tenants/$TENANT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 11: Verify tenant is deleted
echo "==================================================="
echo "Step 11: Verify tenant is deleted"
echo "Expected: 404 Not Found"
echo "==================================================="
curl -s -X GET $BASE_URL/tenants/$TENANT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "==================================================="
echo "✅ All tenant CRUD tests completed!"
echo "==================================================="
