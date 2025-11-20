import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Search,
  FilterList,
  ExpandMore,
  Close,
  Save,
  Refresh
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface AdvancedSearchProps {
  onSearch: (query: string, filters: any) => void;
  onSaveSearch?: () => void;
}

const modalities = ['CT', 'MRI', 'X-Ray', 'Ultrasound', 'Mammography', 'PET', 'Nuclear Medicine'];
const statuses = ['draft', 'pending', 'in-progress', 'final', 'signed', 'amended'];
const priorities = ['urgent', 'high', 'normal', 'low'];

export default function AdvancedSearch({ onSearch, onSaveSearch }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filters
  const [modality, setModality] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [priority, setPriority] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [radiologistId, setRadiologistId] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  // Aggregations
  const [aggregations, setAggregations] = useState<any>(null);

  const activeFiltersCount = [
    modality,
    selectedStatuses.length > 0,
    priority,
    bodyPart,
    radiologistId,
    dateFrom,
    dateTo
  ].filter(Boolean).length;

  useEffect(() => {
    fetchAggregations();
  }, [query]);

  const fetchAggregations = async () => {
    try {
      const response = await fetch(`/api/search/aggregations?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setAggregations(data.aggregations);
    } catch (error) {
      console.error('Error fetching aggregations:', error);
    }
  };

  const handleSearch = () => {
    const filters: any = {};
    
    if (modality) filters.modality = modality;
    if (selectedStatuses.length > 0) filters.status = selectedStatuses;
    if (priority) filters.priority = priority;
    if (bodyPart) filters.bodyPart = bodyPart;
    if (radiologistId) filters.radiologistId = radiologistId;
    if (dateFrom) filters.dateFrom = dateFrom.toISOString();
    if (dateTo) filters.dateTo = dateTo.toISOString();

    onSearch(query, filters);
  };

  const handleClearFilters = () => {
    setModality('');
    setSelectedStatuses([]);
    setPriority('');
    setBodyPart('');
    setRadiologistId('');
    setDateFrom(null);
    setDateTo(null);
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search reports, patients, findings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          
          <Button
            variant="contained"
            onClick={handleSearch}
            startIcon={<Search />}
          >
            Search
          </Button>

          <Button
            variant="outlined"
            onClick={() => setFiltersOpen(true)}
            startIcon={<FilterList />}
            endIcon={activeFiltersCount > 0 ? (
              <Chip label={activeFiltersCount} size="small" color="primary" />
            ) : null}
          >
            Filters
          </Button>

          {onSaveSearch && (
            <IconButton onClick={onSaveSearch} title="Save Search">
              <Save />
            </IconButton>
          )}
        </Box>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {modality && (
              <Chip
                label={`Modality: ${modality}`}
                onDelete={() => setModality('')}
                size="small"
              />
            )}
            {selectedStatuses.map(status => (
              <Chip
                key={status}
                label={`Status: ${status}`}
                onDelete={() => handleStatusToggle(status)}
                size="small"
              />
            ))}
            {priority && (
              <Chip
                label={`Priority: ${priority}`}
                onDelete={() => setPriority('')}
                size="small"
              />
            )}
            {bodyPart && (
              <Chip
                label={`Body Part: ${bodyPart}`}
                onDelete={() => setBodyPart('')}
                size="small"
              />
            )}
            {dateFrom && (
              <Chip
                label={`From: ${dateFrom.toLocaleDateString()}`}
                onDelete={() => setDateFrom(null)}
                size="small"
              />
            )}
            {dateTo && (
              <Chip
                label={`To: ${dateTo.toLocaleDateString()}`}
                onDelete={() => setDateTo(null)}
                size="small"
              />
            )}
            
            <Button
              size="small"
              onClick={handleClearFilters}
              startIcon={<Close />}
            >
              Clear All
            </Button>
          </Box>
        )}

        {/* Filters Drawer */}
        <Drawer
          anchor="right"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <Box sx={{ width: 350, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Filters</Typography>
              <IconButton onClick={() => setFiltersOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Modality Filter */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Modality</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small">
                  <Select
                    value={modality}
                    onChange={(e) => setModality(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">All Modalities</MenuItem>
                    {modalities.map(m => (
                      <MenuItem key={m} value={m}>
                        {m}
                        {aggregations?.modalities?.find((agg: any) => agg.key === m) && (
                          <Chip
                            label={aggregations.modalities.find((agg: any) => agg.key === m).doc_count}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </AccordionDetails>
            </Accordion>

            {/* Status Filter */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Status</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormGroup>
                  {statuses.map(status => (
                    <FormControlLabel
                      key={status}
                      control={
                        <Checkbox
                          checked={selectedStatuses.includes(status)}
                          onChange={() => handleStatusToggle(status)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <span>{status}</span>
                          {aggregations?.statuses?.find((agg: any) => agg.key === status) && (
                            <Chip
                              label={aggregations.statuses.find((agg: any) => agg.key === status).doc_count}
                              size="small"
                            />
                          )}
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>
              </AccordionDetails>
            </Accordion>

            {/* Priority Filter */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Priority</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small">
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    {priorities.map(p => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </AccordionDetails>
            </Accordion>

            {/* Body Part Filter */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Body Part</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter body part..."
                  value={bodyPart}
                  onChange={(e) => setBodyPart(e.target.value)}
                />
              </AccordionDetails>
            </Accordion>

            {/* Date Range Filter */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Date Range</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <DatePicker
                    label="From"
                    value={dateFrom}
                    onChange={(date) => setDateFrom(date)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                  <DatePicker
                    label="To"
                    value={dateTo}
                    onChange={(date) => setDateTo(date)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  handleSearch();
                  setFiltersOpen(false);
                }}
              >
                Apply Filters
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<Refresh />}
              >
                Reset
              </Button>
            </Box>
          </Box>
        </Drawer>
      </Box>
    </LocalizationProvider>
  );
}
