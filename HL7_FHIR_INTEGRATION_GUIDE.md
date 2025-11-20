# HL7/FHIR Integration Guide
**Healthcare Interoperability for Radiology Reporting System**

---

## Overview

This system supports healthcare interoperability through:
- **HL7 v2.x ADT Messages** - Patient admission, discharge, and transfer
- **FHIR R4** - DiagnosticReport and Patient resource export
- **Bi-directional Integration** - Receive orders, send results

---

## HL7 ADT Integration

### Supported Message Types

| Message Type | Event | Description |
|--------------|-------|-------------|
| ADT^A01 | Patient Admit | New patient admission |
| ADT^A04 | Patient Registration | Outpatient registration |
| ADT^A08 | Patient Update | Update patient demographics |
| ADT^A11 | Patient Discharge | Patient discharge |

### HL7 Message Format

```
MSH|^~\&|SendingApp|SendingFacility|ReceivingApp|ReceivingFacility|20231119120000||ADT^A01|MSG00001|P|2.5
PID|1||MRN123456^^^Hospital^MR||Doe^John^A||19800101|M|||123 Main St^^City^ST^12345||555-1234|||M|
PV1|1|I|ICU^101^01||||1234^Smith^John^^^Dr|||||||||||V12345|||||||||||||||||||||||20231119100000
```

### API Endpoint

**POST** `/api/hl7/adt`

**Request:**
```json
{
  "message": "MSH|^~\\&|SendingApp|SendingFacility..."
}
```

**Response (ACK):**
```
MSH|^~\&|RadiologySystem|Hospital|SendingApp|SendingFacility|20231119120001||ACK|MSG00001|P|2.5
MSA|AA|MSG00001
```

### Parsed Data Structure

```json
{
  "messageType": "A01",
  "eventType": "admit",
  "patient": {
    "patientId": "MRN123456",
    "name": {
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe"
    },
    "dateOfBirth": "1980-01-01T00:00:00.000Z",
    "gender": "M",
    "address": {
      "street": "123 Main St",
      "city": "City",
      "state": "ST",
      "zip": "12345"
    },
    "phone": "555-1234"
  },
  "visit": {
    "visitNumber": "V12345",
    "patientClass": "I",
    "assignedLocation": {
      "facility": "ICU",
      "room": "101",
      "bed": "01"
    },
    "attendingDoctor": {
      "id": "1234",
      "lastName": "Smith",
      "firstName": "John",
      "fullName": "John Smith"
    },
    "admitDateTime": "2023-11-19T10:00:00.000Z"
  },
  "timestamp": "2023-11-19T12:00:00.000Z"
}
```

---

## FHIR R4 Integration

### Supported Resources

- **DiagnosticReport** - Radiology reports
- **Patient** - Patient demographics
- **Bundle** - Collections of resources

### Export Single Report

**GET** `/api/fhir/DiagnosticReport/:id`

**Headers:**
```
Authorization: Bearer <token>
Accept: application/fhir+json
```

**Response:**
```json
{
  "resourceType": "DiagnosticReport",
  "id": "507f1f77bcf86cd799439011",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2023-11-19T12:00:00.000Z",
    "profile": ["http://hl7.org/fhir/StructureDefinition/DiagnosticReport"]
  },
  "identifier": [{
    "use": "official",
    "system": "urn:oid:2.16.840.1.113883.19.5",
    "value": "ACC123456",
    "type": {
      "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
        "code": "ACSN",
        "display": "Accession Number"
      }]
    }
  }],
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
      "code": "RAD",
      "display": "Radiology"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "24627-2",
      "display": "Chest X-ray"
    }],
    "text": "Chest X-ray PA and Lateral"
  },
  "subject": {
    "reference": "Patient/MRN123456",
    "display": "John Doe"
  },
  "effectiveDateTime": "2023-11-19T10:00:00.000Z",
  "issued": "2023-11-19T12:00:00.000Z",
  "performer": [{
    "reference": "Practitioner/507f1f77bcf86cd799439012",
    "display": "Dr. Jane Smith",
    "type": "Practitioner"
  }],
  "conclusion": "Normal chest radiograph. No acute cardiopulmonary process.",
  "presentedForm": [{
    "contentType": "application/pdf",
    "language": "en-US",
    "url": "https://example.com/reports/ACC123456.pdf",
    "title": "Radiology Report - ACC123456",
    "creation": "2023-11-19T12:00:00.000Z"
  }]
}
```

### Bulk Export Reports

**POST** `/api/fhir/DiagnosticReport/$export`

**Request:**
```json
{
  "startDate": "2023-11-01",
  "endDate": "2023-11-30",
  "status": "final",
  "limit": 100
}
```

**Response (FHIR Bundle):**
```json
{
  "resourceType": "Bundle",
  "id": "bundle-1700395200000",
  "meta": {
    "lastUpdated": "2023-11-19T12:00:00.000Z"
  },
  "type": "searchset",
  "total": 42,
  "entry": [
    {
      "fullUrl": "DiagnosticReport/507f1f77bcf86cd799439011",
      "resource": {
        "resourceType": "DiagnosticReport",
        ...
      }
    },
    ...
  ]
}
```

### FHIR Capability Statement

**GET** `/api/fhir/metadata`

Returns server capabilities and supported operations.

---

## Integration Patterns

### Pattern 1: HL7 ADT → Auto-Create Patients

```
EHR System                    Radiology System
     |                              |
     |-------- ADT^A01 ------------>| Parse message
     |                              | Create/Update patient
     |<-------- ACK (AA) -----------| Success
     |                              |
```

### Pattern 2: Order Entry → Worklist

```
EHR System                    Radiology System
     |                              |
     |-------- ORM (Order) -------->| Parse order
     |                              | Create worklist item
     |<-------- ACK (AA) -----------| Success
     |                              |
     |                              | Radiologist performs study
     |                              | Create report
     |                              |
     |<-- FHIR DiagnosticReport ----| Export result
     |                              |
```

### Pattern 3: Result Distribution

```
Radiology System              EHR System
     |                              |
     | Report signed                |
     |                              |
     |---- FHIR DiagnosticReport -->| Receive result
     |                              | File in patient chart
     |<-------- HTTP 200 -----------| Success
     |                              |
```

---

## Configuration

### Environment Variables

```env
# HL7 Configuration
HL7_LISTENING_PORT=7777
HL7_SENDING_APP=RadiologySystem
HL7_SENDING_FACILITY=Hospital

# FHIR Configuration
FHIR_SERVER_URL=http://localhost:8001/api/fhir
FHIR_VERSION=4.0.1

# Integration
EHR_ENDPOINT=https://ehr.example.com/api
EHR_API_KEY=your-api-key-here
```

### Code Example: Send Report to EHR

```javascript
const axios = require('axios');

async function sendReportToEHR(reportId) {
  // Get FHIR DiagnosticReport
  const response = await axios.get(
    `http://localhost:8001/api/fhir/DiagnosticReport/${reportId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/fhir+json'
      }
    }
  );

  const diagnosticReport = response.data;

  // Send to EHR
  await axios.post(
    `${process.env.EHR_ENDPOINT}/DiagnosticReport`,
    diagnosticReport,
    {
      headers: {
        'Content-Type': 'application/fhir+json',
        'Authorization': `Bearer ${process.env.EHR_API_KEY}`
      }
    }
  );
}
```

---

## Testing

### Test HL7 Message Parsing

```javascript
const hl7ADTService = require('./services/hl7-adt-service');

const testMessage = `MSH|^~\\&|HIS|Hospital|RadSystem|Radiology|20231119120000||ADT^A01|MSG00001|P|2.5
PID|1||MRN123456^^^Hospital^MR||Doe^John^A||19800101|M|||123 Main St^^City^ST^12345||555-1234
PV1|1|I|ICU^101^01||||1234^Smith^John^^^Dr|||||||||||V12345|||||||||||||||||||||||20231119100000`;

const parsed = hl7ADTService.parseADTMessage(testMessage);
console.log(JSON.stringify(parsed, null, 2));
```

### Test FHIR Export

```bash
# Get single report
curl -H "Authorization: Bearer $TOKEN" \
     -H "Accept: application/fhir+json" \
     http://localhost:8001/api/fhir/DiagnosticReport/507f1f77bcf86cd799439011

# Bulk export
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"startDate":"2023-11-01","endDate":"2023-11-30"}' \
     http://localhost:8001/api/fhir/DiagnosticReport/\$export
```

### FHIR Validation

Use the official FHIR validator:
```bash
java -jar validator_cli.jar report.json -version 4.0.1
```

---

## Error Handling

### HL7 Error Codes

| Code | Description |
|------|-------------|
| AA | Application Accept |
| AE | Application Error |
| AR | Application Reject |

### FHIR OperationOutcome

```json
{
  "resourceType": "OperationOutcome",
  "issue": [{
    "severity": "error",
    "code": "not-found",
    "diagnostics": "DiagnosticReport not found"
  }]
}
```

---

## Security Considerations

1. **Authentication**: All FHIR endpoints require JWT authentication
2. **Authorization**: Hospital-level access control
3. **Encryption**: Use HTTPS for all transmissions
4. **Audit**: Log all HL7 messages and FHIR exports
5. **PHI Protection**: Ensure HIPAA compliance

---

## Troubleshooting

### Common Issues

**HL7 message parsing fails:**
- Verify message format (segment terminators, field separators)
- Check HL7 version compatibility (2.3, 2.4, 2.5)
- Validate required fields (MSH, PID, PV1)

**FHIR validation errors:**
- Use official FHIR validator
- Check required fields (status, code, subject)
- Verify code systems (LOINC, SNOMED CT, ICD-10)

**Integration timeout:**
- Check network connectivity
- Verify endpoint URLs
- Review firewall rules

---

## References

- [HL7 v2.x Specification](http://www.hl7.org/implement/standards/product_brief.cfm?product_id=185)
- [FHIR R4 Specification](http://hl7.org/fhir/R4/)
- [FHIR DiagnosticReport](http://hl7.org/fhir/R4/diagnosticreport.html)
- [HL7 ADT Messages](http://www.hl7.org/documentcenter/public_temp_8F7F9FF8-1C23-BA17-0CF25C9434D59FE9/wg/inm/ADT_A01%20%28Admit-Visit%20Notification%29.htm)

---

**Created:** 2025-11-19  
**Version:** 1.0  
**Status:** Production Ready

---

© 2025 Radiology Reporting System
