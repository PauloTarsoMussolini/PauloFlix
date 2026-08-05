#!/bin/bash

echo "Testing rate limiting with 6 login attempts (fresh API)..."
echo ""

for i in {1..6}; do
  echo "Request $i:"
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5128/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "wrong@example.com", "password": "wrongpassword"}')
  echo "Status Code: $status"
  echo ""
done
