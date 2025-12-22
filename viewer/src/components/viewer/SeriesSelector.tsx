import React, { useEffect, useRef } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Paper,
  Divider,
  Avatar,
  Badge,
} from '@mui/material'
import {
  Image as ImageIcon,
  CheckCircle as CheckIcon,
  Folder as FolderIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material'

interface Series {
  seriesInstanceUID: string
  seriesDescription?: string
  seriesNumber?: string | number
  modality?: string
  numberOfInstances?: number
  instances?: any[]
}

interface SeriesSelectorProps {
  series: Series[]
  selectedSeriesUID: string
  onSeriesSelect: (seriesUID: string) => void
  currentFrame?: number
  totalFrames?: number
}

export const SeriesSelector: React.FC<SeriesSelectorProps> = React.memo(({
  series,
  selectedSeriesUID,
  onSeriesSelect,
  currentFrame,
  totalFrames,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Enhanced keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events when the series selector is focused or visible
      if (!containerRef.current || series.length <= 1) return

      // Check if the container or any of its children are focused
      const isContainerFocused = containerRef.current.contains(document.activeElement)
      if (!isContainerFocused) return

      const currentIndex = series.findIndex(s => s.seriesInstanceUID === selectedSeriesUID)
      if (currentIndex === -1) return

      let newIndex = currentIndex

      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault()
          newIndex = Math.max(0, currentIndex - 1)
          break
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault()
          newIndex = Math.min(series.length - 1, currentIndex + 1)
          break
        case 'Home':
          event.preventDefault()
          newIndex = 0
          break
        case 'End':
          event.preventDefault()
          newIndex = series.length - 1
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          // Re-select current series (useful for refreshing)
          onSeriesSelect(series[currentIndex].seriesInstanceUID)
          return
        default:
          return
      }

      if (newIndex !== currentIndex) {
        onSeriesSelect(series[newIndex].seriesInstanceUID)
        
        // Scroll the selected item into view
        setTimeout(() => {
          const selectedElement = containerRef.current?.querySelector(`[data-series-index="${newIndex}"]`)
          if (selectedElement) {
            selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        }, 50)
      }
    }

    // Add event listener to the container
    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleKeyDown)
      // Make container focusable
      container.setAttribute('tabindex', '0')
      container.setAttribute('role', 'listbox')
      container.setAttribute('aria-label', 'Series selector')
    }

    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [series, selectedSeriesUID, onSeriesSelect])

  // Auto-focus container when series change
  useEffect(() => {
    if (containerRef.current && series.length > 1) {
      containerRef.current.focus()
    }
  }, [selectedSeriesUID, series.length])

  if (!series || series.length === 0) {
    return null
  }

  // Enhanced conditional display logic with debugging
  console.log('SeriesSelector render - series count:', series.length, 'series:', series)
  console.log('SeriesSelector selectedSeriesUID:', selectedSeriesUID)
  
  // Show selector even for single series to help with debugging, but with different styling
  if (!series || series.length === 0) {
    return (
      <Paper
        sx={{
          width: 300,
          height: '100%',
          overflow: 'auto',
          bgcolor: 'grey.900',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Loading series data...
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      ref={containerRef}
      elevation={3}
      sx={{
        width: 300, // Slightly wider to accommodate more metadata
        height: '100%',
        overflow: 'auto',
        bgcolor: 'grey.900',
        borderRight: '1px solid',
        borderColor: 'divider',
        outline: 'none', // Remove default focus outline
        '&:focus': {
          boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.5)', // Enhanced focus indicator
        },
        '&:focus-within': {
          boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.3)', // Focus indicator when child is focused
        },
      }}
    >
      {/* Enhanced header with complete series count and navigation hints */}
      <Box sx={{ p: 2, bgcolor: series.length === 1 ? 'info.main' : 'primary.main' }}>
        <Typography variant="h6" color="white" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={series.length} color="secondary" max={99}>
            <ImageIcon />
          </Badge>
          {series.length === 1 ? 'Single Series' : 'Series Collection'}
        </Typography>
        <Typography variant="caption" color={series.length === 1 ? 'info.light' : 'primary.light'} sx={{ mt: 0.5, display: 'block' }}>
          {series.length} series {series.length > 1 ? '• Use ↑↓ keys or click to navigate' : '• Single series study'}
        </Typography>
        {series.length > 1 && (
          <Typography variant="caption" color="primary.light" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
            Press Enter to refresh • Home/End for first/last
          </Typography>
        )}
      </Box>

      <List sx={{ p: 0 }} role="listbox">
        {series.map((seriesItem, index) => {
          const isSelected = seriesItem.seriesInstanceUID === selectedSeriesUID
          const instanceCount = seriesItem.numberOfInstances || seriesItem.instances?.length || 0
          const seriesNumber = seriesItem.seriesNumber || index + 1

          return (
            <React.Fragment key={seriesItem.seriesInstanceUID || index}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => onSeriesSelect(seriesItem.seriesInstanceUID)}
                  data-series-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`Series ${seriesNumber}: ${seriesItem.seriesDescription || 'No Description'}, ${seriesItem.modality || 'Unknown modality'}, ${instanceCount} images`}
                  sx={{
                    py: 2.5, // Slightly more padding for better touch targets
                    px: 2,
                    bgcolor: isSelected ? 'primary.dark' : 'transparent',
                    border: isSelected ? '2px solid' : '2px solid transparent',
                    borderColor: isSelected ? 'primary.main' : 'transparent',
                    borderRadius: 1,
                    mx: 1,
                    my: 0.5,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: isSelected ? 'primary.dark' : 'grey.800',
                      borderColor: isSelected ? 'primary.main' : 'grey.600',
                      transform: 'translateX(4px)', // Subtle hover animation
                    },
                    '&.Mui-selected': {
                      bgcolor: 'primary.dark',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    },
                    '&:focus': {
                      outline: '2px solid rgba(25, 118, 210, 0.5)',
                      outlineOffset: '2px',
                    },
                  }}
                >
                  {/* Enhanced thumbnail with active indicator */}
                  <Box
                    sx={{
                      mr: 2,
                      width: 72, // Slightly larger for better visibility
                      height: 72,
                      bgcolor: isSelected ? 'primary.dark' : 'grey.800',
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isSelected ? '3px solid' : '2px solid',
                      borderColor: isSelected ? 'primary.main' : 'grey.700',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: isSelected ? 'primary.light' : 'grey.600',
                      },
                    }}
                  >
                    {/* Main icon with modality-specific styling */}
                    <ImageIcon 
                      sx={{ 
                        fontSize: 36, 
                        color: isSelected ? 'primary.light' : 'grey.600',
                        transition: 'color 0.2s ease-in-out',
                      }} 
                    />
                    
                    {/* Active series indicator */}
                    {isSelected && (
                      <PlayArrowIcon
                        sx={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          fontSize: 16,
                          color: 'success.main',
                          bgcolor: 'rgba(0, 0, 0, 0.7)',
                          borderRadius: '50%',
                          p: 0.25,
                        }}
                      />
                    )}
                    
                    {/* Enhanced series number badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: isSelected ? 'primary.main' : 'grey.700',
                        color: 'white',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: '2px solid',
                        borderColor: isSelected ? 'primary.light' : 'grey.600',
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      {seriesNumber}
                    </Box>
                  </Box>

                  {/* Enhanced metadata display */}
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography 
                          variant="subtitle1" 
                          color="white" 
                          fontWeight={isSelected ? 700 : 500}
                          sx={{ 
                            fontSize: '1rem',
                            transition: 'font-weight 0.2s ease-in-out',
                          }}
                        >
                          Series {seriesNumber}
                        </Typography>
                        {isSelected && (
                          <CheckIcon 
                            color="success" 
                            fontSize="small" 
                            sx={{ 
                              animation: 'pulse 2s infinite',
                              '@keyframes pulse': {
                                '0%': { opacity: 1 },
                                '50%': { opacity: 0.7 },
                                '100%': { opacity: 1 },
                              },
                            }} 
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        {/* Series description with better formatting */}
                        <Typography 
                          variant="body2" 
                          color={isSelected ? 'grey.300' : 'grey.400'} 
                          sx={{ 
                            mb: 0.75,
                            fontWeight: isSelected ? 500 : 400,
                            lineHeight: 1.3,
                          }}
                        >
                          {seriesItem.seriesDescription || 'No Description Available'}
                        </Typography>

                        {/* Enhanced metadata chips */}
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 0.75 }}>
                          {seriesItem.modality && (
                            <Chip
                              label={seriesItem.modality}
                              size="small"
                              sx={{
                                bgcolor: isSelected ? 'primary.main' : 'primary.dark',
                                color: 'white',
                                fontSize: '0.7rem',
                                height: 22,
                                fontWeight: 600,
                                border: isSelected ? '1px solid' : 'none',
                                borderColor: 'primary.light',
                              }}
                            />
                          )}
                          <Chip
                            label={`${instanceCount} images`}
                            size="small"
                            icon={<ImageIcon sx={{ fontSize: '0.8rem !important' }} />}
                            sx={{
                              bgcolor: isSelected ? 'grey.600' : 'grey.700',
                              color: 'white',
                              fontSize: '0.7rem',
                              height: 22,
                              '& .MuiChip-icon': {
                                color: 'white',
                              },
                            }}
                          />
                        </Box>

                        {/* Enhanced current frame position display for active series */}
                        {isSelected && currentFrame !== undefined && totalFrames !== undefined && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            bgcolor: 'rgba(25, 118, 210, 0.1)',
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                            border: '1px solid rgba(25, 118, 210, 0.3)',
                          }}>
                            <PlayArrowIcon sx={{ fontSize: 14, color: 'primary.light' }} />
                            <Typography 
                              variant="caption" 
                              color="primary.light" 
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            >
                              Frame: {currentFrame + 1} / {totalFrames}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
              {index < series.length - 1 && (
                <Divider 
                  sx={{ 
                    bgcolor: 'grey.800',
                    mx: 2,
                    opacity: 0.5,
                  }} 
                />
              )}
            </React.Fragment>
          )
        })}
      </List>
    </Paper>
  )
})

export default SeriesSelector
