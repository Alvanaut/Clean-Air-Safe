#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "==================================================="
echo "Test Sensors CRUD - CleanAirSafe Backend"
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

# Step 2: Get tenant ID
echo "==================================================="
echo "Step 2: Get tenant ID for tests"
echo "==================================================="
TENANT_RESPONSE=$(curl -s -X GET $BASE_URL/tenants -H "Authorization: Bearer $TOKEN")
TENANT_ID=$(echo "$TENANT_RESPONSE" | jq -r '.data[0].id')
echo "Using Tenant ID: $TENANT_ID"
echo ""

# Step 3: Create a test sensor
echo "==================================================="
echo "Step 3: Create test sensor"
echo "==================================================="
SENSOR_RESPONSE=$(curl -s -X POST $BASE_URL/sensors \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Test Sensor - Office 1\",
    \"description\": \"Test CO2 sensor for office area\",
    \"ksp_device_id\": \"test-device-$(date +%s)\",
    \"ksp_serial_number\": \"SN-TEST-001\",
    \"tenant_id\": \"$TENANT_ID\",
    \"status\": \"active\"
  }")

echo "$SENSOR_RESPONSE" | jq
SENSOR_ID=$(echo "$SENSOR_RESPONSE" | jq -r '.data.id')
QR_CODE=$(echo "$SENSOR_RESPONSE" | jq -r '.data.qr_code')
echo "Created Sensor ID: $SENSOR_ID"
echo "QR Code: $QR_CODE"
echo ""

# Step 4: Create another sensor
echo "==================================================="
echo "Step 4: Create another sensor"
echo "==================================================="
SENSOR2_RESPONSE=$(curl -s -X POST $BASE_URL/sensors \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Test Sensor - Meeting Room\",
    \"description\": \"Test sensor for meeting room\",
    \"ksp_device_id\": \"test-device-$(date +%s)-2\",
    \"tenant_id\": \"$TENANT_ID\"
  }")

SENSOR2_ID=$(echo "$SENSOR2_RESPONSE" | jq -r '.data.id')
echo "Created Sensor 2 ID: $SENSOR2_ID"
echo ""

# Step 5: Get all sensors
echo "==================================================="
echo "Step 5: Get all sensors"
echo "==================================================="
curl -s -X GET $BASE_URL/sensors \
  -H "Authorization: Bearer $TOKEN" | jq '.count' | xargs echo "Total sensors:"
echo ""

# Step 6: Get single sensor by ID
echo "==================================================="
echo "Step 6: Get sensor by ID (with relations)"
echo "==================================================="
curl -s -X GET $BASE_URL/sensors/$SENSOR_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 7: Get sensor by QR code
echo "==================================================="
echo "Step 7: Get sensor by QR code"
echo "==================================================="
curl -s -X GET $BASE_URL/sensors/qr/$QR_CODE \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 8: Get sensors by tenant
echo "==================================================="
echo "Step 8: Get sensors by tenant"
echo "==================================================="
curl -s -X GET $BASE_URL/sensors/tenant/$TENANT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.count' | xargs echo "Sensors in tenant:"
echo ""

# Step 9: Get sensor statistics
echo "==================================================="
echo "Step 9: Get sensor statistics"
echo "==================================================="
curl -s -X GET $BASE_URL/sensors/$SENSOR_ID/stats \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 10: Update sensor
echo "==================================================="
echo "Step 10: Update sensor"
echo "==================================================="
curl -s -X PUT $BASE_URL/sensors/$SENSOR_ID \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Updated Sensor - Office 1",
    "description": "Updated description for office sensor"
  }' | jq
echo ""

# Step 11: Set sensor to maintenance
echo "==================================================="
echo "Step 11: Set sensor to maintenance mode"
echo "==================================================="
curl -s -X POST $BASE_URL/sensors/$SENSOR_ID/maintenance \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 12: Activate sensor
echo "==================================================="
echo "Step 12: Activate sensor"
echo "==================================================="
curl -s -X POST $BASE_URL/sensors/$SENSOR_ID/activate \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 13: Deactivate sensor
echo "==================================================="
echo "Step 13: Deactivate sensor"
echo "==================================================="
curl -s -X POST $BASE_URL/sensors/$SENSOR_ID/deactivate \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 14: Reactivate sensor
echo "==================================================="
echo "Step 14: Reactivate sensor"
echo "==================================================="
curl -s -X POST $BASE_URL/sensors/$SENSOR_ID/activate \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 15: Test unauthorized access
echo "==================================================="
echo "Step 15: Test unauthorized access (no token)"
echo "Expected: 401 Unauthorized"
echo "==================================================="
curl -s -X GET $BASE_URL/sensors
echo -e "\n"

# Step 16: Delete sensors
echo "==================================================="
echo "Step 16: Delete sensors"
echo "==================================================="

echo "Deleting sensor 1..."
curl -s -X DELETE $BASE_URL/sensors/$SENSOR_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "Deleting sensor 2..."
curl -s -X DELETE $BASE_URL/sensors/$SENSOR2_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 17: Verify deletion
echo "==================================================="
echo "Step 17: Verify sensor is deleted"
echo "Expected: 404 Not Found"
echo "==================================================="
curl -s -X GET $BASE_URL/sensors/$SENSOR_ID \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "==================================================="
echo "✅ All sensors CRUD tests completed!"
echo "==================================================="
