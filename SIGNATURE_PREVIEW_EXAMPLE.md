# 📝 Signature Preview Example

## How the Signature Appears in Report Preview

### Before Signing
```
┌─────────────────────────────────────────────────────┐
│ Report Preview                          [DRAFT]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Patient Information                                 │
│ Patient Name: John Doe                             │
│ Patient ID: P12345                                 │
│ Modality: CT                                       │
│                                                     │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ Clinical History                                    │
│ Chest pain, rule out pulmonary embolism           │
│                                                     │
│ Technique                                          │
│ CT chest with IV contrast                          │
│                                                     │
│ Findings                                           │
│ No acute pulmonary embolism. Clear lungs.         │
│                                                     │
│ Impression                                         │
│ No acute findings.                                 │
│                                                     │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ Report Status: DRAFT                               │
│ Last Saved: 2024-01-15 10:30:00                   │
└─────────────────────────────────────────────────────┘
```

### After Signing (NEW!)
```
┌─────────────────────────────────────────────────────┐
│ Report Preview                          [FINAL]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Patient Information                                 │
│ Patient Name: John Doe                             │
│ Patient ID: P12345                                 │
│ Modality: CT                                       │
│                                                     │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ Clinical History                                    │
│ Chest pain, rule out pulmonary embolism           │
│                                                     │
│ Technique                                          │
│ CT chest with IV contrast                          │
│                                                     │
│ Findings                                           │
│ No acute pulmonary embolism. Clear lungs.         │
│                                                     │
│ Impression                                         │
│ No acute findings.                                 │
│                                                     │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Digital Signature                           │   │
│ ├─────────────────────────────────────────────┤   │
│ │                                             │   │
│ │ Electronically Signed By:                   │   │
│ │                                             │   │
│ │ ┌─────────────────────────────────┐         │   │
│ │ │                                 │         │   │
│ │ │   [Signature Image]             │         │   │
│ │ │   Dr. John Smith                │    ✓    │   │
│ │ │                                 │ VERIFIED │   │
│ │ └─────────────────────────────────┘         │   │
│ │                                             │   │
│ │ Dr. John Smith                              │   │
│ │ Signed on: 2024-01-15 10:45:23             │   │
│ │                                             │   │
│ │ [FDA 21 CFR Part 11 Compliant]             │   │
│ │ [Legally Binding]                          │   │
│ │                                             │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ Report Status: FINAL                               │
│ Last Saved: 2024-01-15 10:45:23                   │
└─────────────────────────────────────────────────────┘
```

## Visual Components

### 1. Signature Image
- Displayed in a bordered box
- White background with padding
- Max width: 300px
- Maintains aspect ratio
- Falls back gracefully if image fails to load

### 2. Text Signature
- Displayed in cursive/italic font
- Primary color (blue)
- Larger font size (h6)
- Shows typed name

### 3. Verification Section
- Green checkmark icon (60px)
- "VERIFIED" label
- Positioned on the right side
- Success color theme

### 4. Metadata
- Signer's full name (bold)
- Signed date and time
- Compliance badges (green chips)

### 5. Container Styling
- Green border (2px)
- Light green background
- Elevated paper component
- Padding for spacing

## Color Scheme

```css
Border: success.main (green)
Background: success.50 (light green)
Checkmark: success.main (green)
Badges: success color
Text: primary.main (blue) for signature
```

## Responsive Behavior

- Signature image scales to container width
- Layout adjusts for mobile devices
- Print-friendly styling
- Maintains readability at all sizes

## Security Indicators

✅ FDA 21 CFR Part 11 Compliant badge
✅ Legally Binding badge
✅ Verification checkmark
✅ Timestamp with full date/time
✅ Signer identification

## File Locations

**Signature Image:**
- Server: `/server/uploads/signatures/signature-{timestamp}-{random}.png`
- URL: `/uploads/signatures/signature-{timestamp}-{random}.png`
- Browser: Loaded via `<img src="/uploads/signatures/..."/>`

**Database:**
```javascript
{
  radiologistSignatureUrl: "/uploads/signatures/signature-1234567890-abc123.png",
  radiologistSignature: "Dr. John Smith",
  radiologistName: "Dr. John Smith",
  signedAt: "2024-01-15T10:45:23.000Z",
  reportStatus: "final"
}
```
