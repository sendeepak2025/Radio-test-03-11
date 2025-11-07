#!/bin/bash

# Test Sign Report API
# Usage: ./test-sign-report.sh

REPORT_ID="SR-1762513062006-qgffecxsl"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGYyMzFlNzMwMWVkMzk3OWMxNGM1ZDQiLCJ1c2VybmFtZSI6Imhvc3BpdGFsIiwicm9sZXMiOlsiYWRtaW4iLCJyYWRpb2xvZ2lzdCJdLCJwZXJtaXNzaW9ucyI6WyJzdHVkaWVzOnJlYWQiLCJzdHVkaWVzOndyaXRlIiwicGF0aWVudHM6cmVhZCIsInBhdGllbnRzOndyaXRlIiwidXNlcnM6cmVhZCJdLCJob3NwaXRhbElkIjoiNjhmMjMxZTczMDFlZDM5NzljMTRjNWQ0IiwiaWF0IjoxNzYyNTEzMDE5LCJleHAiOjE3NjI1MTQ4MTl9.MKwU0uhvhliblmrDpLbTp_t2GwAVkZDlu6qyONbeTLg"

curl -X POST "http://localhost:3010/api/reports/${REPORT_ID}/sign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "signatureData": {
      "signatureText": "Dr. Hospital Admin",
      "signatureMeaning": "authored",
      "password": "123456",
      "signatureImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "timestamp": "2025-11-07T11:00:27.439Z"
    },
    "reportContent": {
      "clinicalHistory": "test",
      "technique": "test",
      "findingsText": "test test test test",
      "impression": "test impression",
      "recommendations": "test"
    }
  }' \
  | jq '.'

echo ""
echo "✅ Sign request sent!"
echo "Check server logs for response"
