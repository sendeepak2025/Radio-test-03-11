import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  InputAdornment,
  Pagination,
  Alert,
  CircularProgress,
  Rating
} from '@mui/material';
import {
  Store,
  Search,
  ContentCopy,
  Star,
  TrendingUp,
  Schedule,
  FilterList
} from '@mui/icons-material';

interface TemplateMarketplaceDialogProps {
  open: boolean;
  onClose: () => void;
  onClone?: (template: any) => void;
}

const modalities = ['All', 'CT', 'MRI', 'X-Ray', 'Ultrasound', 'Mammography'];
const sortOptions = [
  { value: 'popular', label: 'Most Popular', icon: <TrendingUp /> },
  { value: 'recent', label: 'Recently Added', icon: <Schedule /> },
  { value: 'rating', label: 'Highest Rated', icon: <Star /> }
];

export default function TemplateMarketplaceDialog({
  open,
  onClose,
  onClone
}: TemplateMarketplaceDialogProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('All');
  const [bodyPart, setBodyPart] = useState('');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, search, modality, bodyPart, sort, page]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (modality && modality !== 'All') params.append('modality', modality);
      if (bodyPart) params.append('bodyPart', bodyPart);
      if (search) params.append('search', search);
      params.append('sort', sort);
      params.append('page', page.toString());
      params.append('limit', '12');

      const response = await fetch(
        `/api/template-marketplace/marketplace?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.templates || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (template: any) => {
    setCloning(template._id);
    
    try {
      const response = await fetch(
        `/api/template-marketplace/templates/${template._id}/clone`,
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Failed to clone template');

      const data = await response.json();
      
      if (onClone) {
        onClone(data.template);
      }
      
      // Refresh to update usage count
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCloning(null);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (key: string, value: any) => {
    switch (key) {
      case 'modality':
        setModality(value);
        break;
      case 'bodyPart':
        setBodyPart(value);
        break;
      case 'sort':
        setSort(value);
        break;
    }
    setPage(1);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Store />
          Template Marketplace
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Filters */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Modality</InputLabel>
                <Select
                  value={modality}
                  label="Modality"
                  onChange={(e) => handleFilterChange('modality', e.target.value)}
                >
                  {modalities.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Body Part"
                value={bodyPart}
                onChange={(e) => handleFilterChange('bodyPart', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sort}
                  label="Sort By"
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                >
                  {sortOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {opt.icon}
                        {opt.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Templates Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : templates.length === 0 ? (
          <Alert severity="info">
            No templates found matching your criteria
          </Alert>
        ) : (
          <>
            <Grid container spacing={2}>
              {templates.map((template) => (
                <Grid item xs={12} sm={6} md={4} key={template._id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontSize: '1rem' }}>
                          {template.name}
                        </Typography>
                        
                        {template.ratings?.average && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Typography variant="caption">
                              {template.ratings.average.toFixed(1)}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                        <Chip label={template.modality} size="small" color="primary" />
                        {template.bodyPart && (
                          <Chip label={template.bodyPart} size="small" variant="outlined" />
                        )}
                      </Box>

                      {template.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {template.description.substring(0, 100)}
                          {template.description.length > 100 && '...'}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {template.usageCount || 0} uses
                        </Typography>
                        
                        <Typography variant="caption" color="text.secondary">
                          {template.structure?.sections?.length || 0} sections
                        </Typography>
                      </Box>

                      {template.metadata?.hasAIAssist && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label="AI-Enhanced"
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>
                      )}
                    </CardContent>

                    <CardActions>
                      <Button
                        size="small"
                        startIcon={cloning === template._id ? <CircularProgress size={16} /> : <ContentCopy />}
                        onClick={() => handleClone(template)}
                        disabled={cloning === template._id}
                      >
                        {cloning === template._id ? 'Cloning...' : 'Clone'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
