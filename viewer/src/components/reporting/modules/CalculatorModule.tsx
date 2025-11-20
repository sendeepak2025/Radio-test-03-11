import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Alert,
  Divider,
  Stack,
  TextField
} from '@mui/material';

interface CalculatorModuleProps {
  config?: {
    type?: 'birads' | 'tirads' | 'pirads' | 'custom';
    title?: string;
    criteria?: Array<{
      id: string;
      label: string;
      type?: 'select' | 'number';
      options?: Array<{ value: string; label: string; score?: number }>;
      min?: number;
      max?: number;
      unit?: string;
    }>;
  };
  value?: any;
  onChange?: (result: any) => void;
  required?: boolean;
}

export const CalculatorModule: React.FC<CalculatorModuleProps> = ({
  config = {},
  value = {},
  onChange,
  required = false
}) => {
  const { type = 'birads', title = 'BI-RADS Calculator' } = config;

  const bIRADSCriteria = [
    {
      id: 'mass',
      label: 'Mass Characteristics',
      options: [
        { value: 'none', label: 'No mass', score: 0 },
        { value: 'round', label: 'Round/Oval, circumscribed', score: 1 },
        { value: 'irregular', label: 'Irregular shape', score: 2 },
        { value: 'spiculated', label: 'Spiculated margins', score: 3 }
      ]
    },
    {
      id: 'calcifications',
      label: 'Calcifications',
      options: [
        { value: 'none', label: 'No calcifications', score: 0 },
        { value: 'benign', label: 'Benign (coarse, popcorn)', score: 1 },
        { value: 'suspicious', label: 'Suspicious (fine, pleomorphic)', score: 3 }
      ]
    },
    {
      id: 'asymmetry',
      label: 'Architectural Distortion/Asymmetry',
      options: [
        { value: 'none', label: 'None', score: 0 },
        { value: 'asymmetry', label: 'Asymmetry', score: 1 },
        { value: 'distortion', label: 'Architectural distortion', score: 2 }
      ]
    }
  ];

  const criteria = config.criteria || bIRADSCriteria;

  const [selections, setSelections] = useState<Record<string, string>>(value.selections || {});

  useEffect(() => {
    if (value.selections) {
      setSelections(value.selections);
    }
  }, [value]);

  const handleSelectionChange = (criteriaId: string, optionValue: string) => {
    const updated = { ...selections, [criteriaId]: optionValue };
    setSelections(updated);
    
    const result = calculateResult(updated);
    onChange?.({ selections: updated, ...result });
  };

  const calculateResult = (currentSelections: Record<string, string>) => {
    let totalScore = 0;
    const findings: string[] = [];

    criteria.forEach((criterion) => {
      const selectedValue = currentSelections[criterion.id];
      if (selectedValue) {
        const option = criterion.options.find(opt => opt.value === selectedValue);
        if (option) {
          totalScore += option.score || 0;
          if (option.score && option.score > 0) {
            findings.push(`${criterion.label}: ${option.label}`);
          }
        }
      }
    });

    const category = getBIRADSCategory(totalScore, currentSelections);
    const recommendation = getBIRADSRecommendation(category);

    return {
      score: totalScore,
      category,
      recommendation,
      findings
    };
  };

  const getBIRADSCategory = (score: number, currentSelections: Record<string, string>): number => {
    const hasSpiculated = currentSelections.mass === 'spiculated';
    const hasSuspiciousCalc = currentSelections.calcifications === 'suspicious';
    const hasDistortion = currentSelections.asymmetry === 'distortion';

    if (score === 0) return 1;
    if (hasSpiculated || hasSuspiciousCalc) return 5;
    if (hasDistortion || score >= 4) return 4;
    if (score >= 2) return 3;
    return 2;
  };

  const getBIRADSRecommendation = (category: number): string => {
    const recommendations: Record<number, string> = {
      1: 'Negative - Routine screening',
      2: 'Benign - Routine screening',
      3: 'Probably benign - Short-term follow-up suggested (6 months)',
      4: 'Suspicious - Biopsy should be considered',
      5: 'Highly suggestive of malignancy - Appropriate action should be taken',
      6: 'Known biopsy-proven malignancy - Treatment planning'
    };
    return recommendations[category] || 'Assessment needed';
  };

  const getCategoryColor = (category: number): 'success' | 'info' | 'warning' | 'error' => {
    if (category <= 2) return 'success';
    if (category === 3) return 'info';
    if (category === 4) return 'warning';
    return 'error';
  };

  const result = calculateResult(selections);
  const isComplete = criteria.every(c => selections[c.id]);

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0' }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>
        {title} {required && <span style={{ color: 'red' }}>*</span>}
      </Typography>

      <Grid container spacing={3}>
        {criteria.map((criterion) => (
          <Grid item xs={12} key={criterion.id}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ fontWeight: 500, color: 'text.primary', mb: 1 }}>
                {criterion.label}
              </FormLabel>
              
              {/* Handle different field types */}
              {criterion.type === 'number' ? (
                // Number input field
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={selections[criterion.id] || ''}
                  onChange={(e) => handleSelectionChange(criterion.id, e.target.value)}
                  inputProps={{
                    min: criterion.min,
                    max: criterion.max
                  }}
                  placeholder={criterion.unit ? `Enter value (${criterion.unit})` : 'Enter value'}
                  sx={{ maxWidth: 300 }}
                />
              ) : criterion.options && criterion.options.length > 0 ? (
                // Radio group for select type
                <RadioGroup
                  value={selections[criterion.id] || ''}
                  onChange={(e) => handleSelectionChange(criterion.id, e.target.value)}
                >
                  <Stack spacing={0.5}>
                    {criterion.options.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio size="small" />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{option.label}</span>
                            {option.score !== undefined && option.score > 0 && (
                              <Chip
                                label={`Score: ${option.score}`}
                                size="small"
                                sx={{ height: 18, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        }
                      />
                    ))}
                  </Stack>
                </RadioGroup>
              ) : (
                // Fallback text field if no options provided
                <TextField
                  size="small"
                  fullWidth
                  value={selections[criterion.id] || ''}
                  onChange={(e) => handleSelectionChange(criterion.id, e.target.value)}
                  placeholder="Enter value"
                  sx={{ maxWidth: 300 }}
                />
              )}
            </FormControl>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ bgcolor: '#f9f9f9', p: 2, borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Assessment Result
        </Typography>
        
        {isComplete ? (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={`BI-RADS ${result.category}`}
                color={getCategoryColor(result.category)}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`Total Score: ${result.score}`}
                variant="outlined"
              />
            </Stack>

            <Alert severity={getCategoryColor(result.category)} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {result.recommendation}
              </Typography>
            </Alert>

            {result.findings.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Key Findings:
                </Typography>
                {result.findings.map((finding, idx) => (
                  <Typography key={idx} variant="body2" sx={{ fontSize: '0.875rem', ml: 1 }}>
                    • {finding}
                  </Typography>
                ))}
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Complete all criteria to see assessment result
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CalculatorModule;
