#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "==================================================="
echo "Test Users CRUD - CleanAirSafe Backend"
echo "==================================================="
echo ""

# Step 1: Login as GODMODE user
echo "==================================================="
echo "Step 1: Login as GODMODE user"
echo "==================================================="
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@cleanairsafe.com","password":"Admin123!"}' | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Step 2: Get current tenant ID
echo "==================================================="
echo "Step 2: Get tenant ID for tests"
echo "==================================================="
TENANT_RESPONSE=$(curl -s -X GET $BASE_URL/tenants -H "Authorization: Bearer $TOKEN")
TENANT_ID=$(echo "$TENANT_RESPONSE" | jq -r '.data[0].id')
echo "Using Tenant ID: $TENANT_ID"
echo ""

# Step 3: Create a COMPANY_ADMIN user
echo "==================================================="
echo "Step 3: Create COMPANY_ADMIN user"
echo "==================================================="
ADMIN_RESPONSE=$(curl -s -X POST $BASE_URL/users \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"company.admin@testcompany.com\",
    \"password\": \"CompanyAdmin123!\",
    \"first_name\": \"Company\",
    \"last_name\": \"Admin\",
    \"phone\": \"+32 2 123 45 67\",
    \"role\": \"company_admin\",
    \"tenant_id\": \"$TENANT_ID\"
  }")

echo "$ADMIN_RESPONSE" | jq
ADMIN_USER_ID=$(echo "$ADMIN_RESPONSE" | jq -r '.data.id')
echo "Created Admin User ID: $ADMIN_USER_ID"
echo ""

# Step 4: Create a MANAGER user
echo "==================================================="
echo "Step 4: Create MANAGER user"
echo "==================================================="
MANAGER_RESPONSE=$(curl -s -X POST $BASE_URL/users \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"manager@testcompany.com\",
    \"password\": \"Manager123!\",
    \"first_name\": \"Test\",
    \"last_name\": \"Manager\",
    \"role\": \"manager\",
    \"tenant_id\": \"$TENANT_ID\",
    \"parent_user_id\": \"$ADMIN_USER_ID\"
  }")

echo "$MANAGER_RESPONSE" | jq
MANAGER_USER_ID=$(echo "$MANAGER_RESPONSE" | jq -r '.data.id')
echo "Created Manager User ID: $MANAGER_USER_ID"
echo ""

# Step 5: Create a regular USER
echo "==================================================="
echo "Step 5: Create regular user"
echo "==================================================="
USER_RESPONSE=$(curl -s -X POST $BASE_URL/users \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"user@testcompany.com\",
    \"password\": \"User123!\",
    \"first_name\": \"Test\",
    \"last_name\": \"User\",
    \"role\": \"user\",
    \"tenant_id\": \"$TENANT_ID\",
    \"parent_user_id\": \"$MANAGER_USER_ID\"
  }")

echo "$USER_RESPONSE" | jq
REGULAR_USER_ID=$(echo "$USER_RESPONSE" | jq -r '.data.id')
echo "Created Regular User ID: $REGULAR_USER_ID"
echo ""

# Step 6: Get all users
echo "==================================================="
echo "Step 6: Get all users (GODMODE view)"
echo "==================================================="
curl -s -X GET $BASE_URL/users \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length' | xargs echo "Total users:"
echo ""

# Step 7: Get current user profile
echo "==================================================="
echo "Step 7: Get current user profile (/me)"
echo "==================================================="
curl -s -X GET $BASE_URL/users/me \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 8: Get single user by ID
echo "==================================================="
echo "Step 8: Get user by ID (with relations)"
echo "==================================================="
curl -s -X GET $BASE_URL/users/$MANAGER_USER_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 9: Get user's subordinates
echo "==================================================="
echo "Step 9: Get manager's subordinates"
echo "==================================================="
curl -s -X GET $BASE_URL/users/$MANAGER_USER_ID/subordinates \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 10: Get user's hierarchy chain
echo "==================================================="
echo "Step 10: Get user's hierarchy chain"
echo "==================================================="
curl -s -X GET $BASE_URL/users/$REGULAR_USER_ID/hierarchy \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 11: Get users by tenant
echo "==================================================="
echo "Step 11: Get users by tenant"
echo "==================================================="
curl -s -X GET $BASE_URL/users/tenant/$TENANT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.count' | xargs echo "Users in tenant:"
echo ""

# Step 12: Update user
echo "==================================================="
echo "Step 12: Update user"
echo "==================================================="
curl -s -X PUT $BASE_URL/users/$REGULAR_USER_ID \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "first_name": "Updated",
    "last_name": "User",
    "phone": "+32 2 999 99 99"
  }' | jq
echo ""

# Step 13: Suspend user
echo "==================================================="
echo "Step 13: Suspend user"
echo "==================================================="
curl -s -X POST $BASE_URL/users/$REGULAR_USER_ID/suspend \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 14: Activate user
echo "==================================================="
echo "Step 14: Activate user"
echo "==================================================="
curl -s -X POST $BASE_URL/users/$REGULAR_USER_ID/activate \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 15: Test password change
echo "==================================================="
echo "Step 15: Change user password (GODMODE forcing change)"
echo "Expected: Success (GODMODE can change without current password)"
echo "==================================================="
curl -s -X POST $BASE_URL/users/$REGULAR_USER_ID/change-password \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "current_password": "ignored_for_godmode",
    "new_password": "NewUser123!"
  }' | jq
echo ""

# Step 16: Test unauthorized access
echo "==================================================="
echo "Step 16: Test unauthorized access (no token)"
echo "Expected: 401 Unauthorized"
echo "==================================================="
curl -s -X GET $BASE_URL/users
echo -e "\n"

# Step 17: Delete users (reverse order - leaves first)
echo "==================================================="
echo "Step 17: Delete users (reverse hierarchy)"
echo "==================================================="

echo "Deleting regular user..."
curl -s -X DELETE $BASE_URL/users/$REGULAR_USER_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "Deleting manager..."
curl -s -X DELETE $BASE_URL/users/$MANAGER_USER_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "Deleting company admin..."
curl -s -X DELETE $BASE_URL/users/$ADMIN_USER_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 18: Verify deletion
echo "==================================================="
echo "Step 18: Verify user is deleted"
echo "Expected: 404 Not Found"
echo "==================================================="
curl -s -X GET $BASE_URL/users/$REGULAR_USER_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "==================================================="
echo "✅ All users CRUD tests completed!"
echo "==================================================="
