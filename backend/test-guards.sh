#!/bin/bash

echo "==================================================="
echo "Test 1: Endpoint protégé SANS token"
echo "Expected: 401 Unauthorized"
echo "==================================================="
curl -s http://localhost:3000/api/auth/me
echo -e "\n"

echo "==================================================="
echo "Test 2: Endpoint public"
echo "Expected: Success"
echo "==================================================="
curl -s http://localhost:3000/api/sensors/sync/status | jq
echo ""

echo "==================================================="
echo "Test 3: Endpoint protégé AVEC token valide"
echo "Expected: User profile"
echo "==================================================="
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @test-login.json | jq -r '.access_token')

curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "==================================================="
echo "✅ Tous les tests de guards terminés!"
echo "==================================================="
