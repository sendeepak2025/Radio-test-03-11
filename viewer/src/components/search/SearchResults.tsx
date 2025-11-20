import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Pagination
} from '@mui/material';
import {
  Visibility,
  GetApp
} from '@mui/icons-material';

interface SearchResult {
  _id: string;
  _score?: number;
  patientName: string;
  mrn: string;
  modality: string;
  bodyPart?: string;
  status: string;
  priority?: string;
  findings?: string;
  impression?: string;
  createdAt: string;
  highlights?: any;
}

interface SearchResultsProps {
  results: SearchResult[];
  total: number;
  loading?: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewReport: (reportId: string) => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'signed': return 'success';
    case 'final': return 'info';
    case 'in-progress': return 'warning';
    case 'draft': return 'default';
    default: return 'default';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'error';
    case 'high': return 'warning';
    case 'normal': return 'default';
    case 'low': return 'default';
    default: return 'default';
  }
}

export default function SearchResults({
  results,
  total,
  loading = false,
  page,
  pageSize,
  onPageChange,
  onViewReport
}: SearchResultsProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Alert severity="info">
        No results found. Try adjusting your search query or filters.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Results Count */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Found {total.toLocaleString()} result{total !== 1 ? 's' : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Page {page} of {totalPages}
        </Typography>
      </Box>

      {/* Results Grid */}
      <Grid container spacing={2}>
        {results.map((result) => (
          <Grid item xs={12} key={result._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {result.patientName}
                      {result._score && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          (Score: {result._score.toFixed(2)})
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      MRN: {result.mrn}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={result.modality} size="small" color="primary" />
                    <Chip label={result.status} size="small" color={getStatusColor(result.status)} />
                    {result.priority && (
                      <Chip label={result.priority} size="small" color={getPriorityColor(result.priority)} />
                    )}
                  </Box>
                </Box>

                {result.bodyPart && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Body Part: {result.bodyPart}
                  </Typography>
                )}

                {result.highlights && (
                  <Box sx={{ mt: 2 }}>
                    {result.highlights.findings && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" fontWeight="bold">Findings:</Typography>
                        <Typography
                          variant="body2"
                          dangerouslySetInnerHTML={{
                            __html: result.highlights.findings.join('... ')
                          }}
                          sx={{
                            '& mark': {
                              bgcolor: 'warning.light',
                              fontWeight: 'bold'
                            }
                          }}
                        />
                      </Box>
                    )}
                    
                    {result.highlights.impression && (
                      <Box>
                        <Typography variant="caption" fontWeight="bold">Impression:</Typography>
                        <Typography
                          variant="body2"
                          dangerouslySetInnerHTML={{
                            __html: result.highlights.impression.join('... ')
                          }}
                          sx={{
                            '& mark': {
                              bgcolor: 'warning.light',
                              fontWeight: 'bold'
                            }
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {!result.highlights && (
                  <>
                    {result.findings && (
                      <Typography variant="body2" paragraph>
                        <strong>Findings:</strong> {result.findings.substring(0, 200)}
                        {result.findings.length > 200 && '...'}
                      </Typography>
                    )}
                    {result.impression && (
                      <Typography variant="body2">
                        <strong>Impression:</strong> {result.impression.substring(0, 200)}
                        {result.impression.length > 200 && '...'}
                      </Typography>
                    )}
                  </>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Created: {new Date(result.createdAt).toLocaleString()}
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => onViewReport(result._id)}
                >
                  View Report
                </Button>
                <Button size="small" startIcon={<GetApp />}>
                  Export PDF
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
            onChange={(e, value) => onPageChange(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}
