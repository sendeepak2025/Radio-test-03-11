# Calculator Module Error Fix

## Error
```
Cannot read properties of undefined (reading 'find')
TypeError: Cannot read properties of undefined (reading 'find')
    at CalculatorModule.tsx:92:42
```

## Root Cause

The `calculateResult` function was trying to access `criterion.options.find()` without checking if `options` exists first.

This happened when:
1. A template defines a calculator module
2. The module config doesn't have `criteria` defined
3. The code falls back to `bIRADSCriteria`
4. But some criterion might not have `options` array

## Fix Applied

Added a safety check in `calculateResult`:

```typescript
const calculateResult = (currentSelections: Record<string, string>) => {
  let totalScore = 0;
  const findings: string[] = [];

  criteria.forEach((criterion) => {
    const selectedValue = currentSelections[criterion.id];
    
    // ✅ Skip if no options defined
    if (!criterion.options || criterion.options.length === 0) {
      return;
    }
    
    // Continue with normal logic...
    const selectedOption = criterion.options.find(opt => opt.value === selectedValue);
    // ...
  });
};
```

## File Modified

- `viewer/src/components/reporting/modules/CalculatorModule.tsx`

## Testing

1. Open report with BI-RADS calculator
2. Select options in calculator
3. Verify no error occurs
4. Verify results are calculated correctly

## Status

✅ Fixed - Calculator module now handles missing options gracefully
