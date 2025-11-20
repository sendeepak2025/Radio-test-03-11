import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Grid,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface Measurement {
  id: string;
  label: string;
  value: string;
  unit: string;
  notes?: string;
}

interface MeasurementModuleProps {
  config?: {
    defaultUnit?: string;
    allowedUnits?: string[];
    predefinedLabels?: string[];
    maxMeasurements?: number;
  };
  value?: Measurement[];
  onChange?: (measurements: Measurement[]) => void;
  required?: boolean;
}

export const MeasurementModule: React.FC<MeasurementModuleProps> = ({
  config = {},
  value = [],
  onChange,
  required = false
}) => {
  const {
    defaultUnit = 'mm',
    allowedUnits = ['mm', 'cm', 'ml', 'cc'],
    predefinedLabels = ['Length', 'Width', 'Height', 'Volume', 'Diameter', 'Thickness'],
    maxMeasurements = 10
  } = config;

  const [measurements, setMeasurements] = useState<Measurement[]>(value);

  useEffect(() => {
    setMeasurements(value);
  }, [value]);

  const handleAddMeasurement = () => {
    if (measurements.length >= maxMeasurements) return;

    const newMeasurement: Measurement = {
      id: `meas-${Date.now()}`,
      label: '',
      value: '',
      unit: defaultUnit,
      notes: ''
    };

    const updated = [...measurements, newMeasurement];
    setMeasurements(updated);
    onChange?.(updated);
  };

  const handleUpdateMeasurement = (id: string, field: keyof Measurement, fieldValue: string) => {
    const updated = measurements.map(m =>
      m.id === id ? { ...m, [field]: fieldValue } : m
    );
    setMeasurements(updated);
    onChange?.(updated);
  };

  const handleDeleteMeasurement = (id: string) => {
    const updated = measurements.filter(m => m.id !== id);
    setMeasurements(updated);
    onChange?.(updated);
  };

  const handleQuickLabel = (id: string, label: string) => {
    handleUpdateMeasurement(id, 'label', label);
  };

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          Measurements {required && <span style={{ color: 'red' }}>*</span>}
        </Typography>
        <IconButton
          onClick={handleAddMeasurement}
          disabled={measurements.length >= maxMeasurements}
          size="small"
          color="primary"
        >
          <AddIcon />
        </IconButton>
      </Box>

      {measurements.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No measurements added. Click + to add measurements.
        </Typography>
      )}

      <Stack spacing={2}>
        {measurements.map((measurement, index) => (
          <Paper key={measurement.id} elevation={1} sx={{ p: 2, bgcolor: '#f9f9f9' }}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Quick labels:
                  </Typography>
                  {predefinedLabels.map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      onClick={() => handleQuickLabel(measurement.id, label)}
                      variant={measurement.label === label ? 'filled' : 'outlined'}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Label"
                  value={measurement.label}
                  onChange={(e) => handleUpdateMeasurement(measurement.id, 'label', e.target.value)}
                  placeholder="e.g., Lesion diameter"
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Value"
                  type="number"
                  value={measurement.value}
                  onChange={(e) => handleUpdateMeasurement(measurement.id, 'value', e.target.value)}
                  placeholder="0.0"
                />
              </Grid>

              <Grid item xs={6} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={measurement.unit}
                    onChange={(e) => handleUpdateMeasurement(measurement.id, 'unit', e.target.value)}
                    label="Unit"
                  >
                    {allowedUnits.map((unit) => (
                      <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={10} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes"
                  value={measurement.notes}
                  onChange={(e) => handleUpdateMeasurement(measurement.id, 'notes', e.target.value)}
                  placeholder="Optional"
                />
              </Grid>

              <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  onClick={() => handleDeleteMeasurement(measurement.id)}
                  size="small"
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Stack>

      {measurements.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {measurements.length} / {maxMeasurements} measurements
        </Typography>
      )}
    </Paper>
  );
};

export default MeasurementModule;
