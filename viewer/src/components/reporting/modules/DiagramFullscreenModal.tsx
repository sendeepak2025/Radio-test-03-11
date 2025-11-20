/**
 * Diagram Fullscreen Modal
 * Large 800x600 canvas for detailed diagram annotation
 * Bidirectional sync with inline module
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  RadioButtonUnchecked as PointIcon,
  Lens as CircleIcon,
  ArrowForward as ArrowIcon,
  Edit as FreehandIcon,
  Straighten as RulerIcon,
  ShowChart as AngleIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  Undo as UndoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as ResetZoomIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

interface DiagramMarking {
  id: string;
  type: 'point' | 'circle' | 'arrow' | 'freehand' | 'ruler' | 'angle';
  points: { x: number; y: number }[];
  color: string;
  label?: string;
  timestamp: number;
  linkedFindingId?: string;
}

interface Finding {
  id: string;
  location?: string;
  description: string;
  severity?: string;
}

interface DiagramFullscreenModalProps {
  open: boolean;
  onClose: () => void;
  config: {
    bodyPart?: string;
    view?: string;
    allowedTools?: Array<'point' | 'circle' | 'arrow' | 'freehand' | 'ruler' | 'angle'>;
    title?: string;
  };
  initialMarkings: DiagramMarking[];
  onSave: (markings: DiagramMarking[]) => void;
  findings?: Finding[];
}

const DEFAULT_TOOLS: Array<'point' | 'circle' | 'arrow' | 'freehand' | 'ruler' | 'angle'> = 
  ['point', 'circle', 'arrow', 'freehand', 'ruler', 'angle'];

const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

export const DiagramFullscreenModal: React.FC<DiagramFullscreenModalProps> = ({
  open,
  onClose,
  config,
  initialMarkings,
  onSave,
  findings = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [markings, setMarkings] = useState<DiagramMarking[]>(initialMarkings);
  const [selectedTool, setSelectedTool] = useState<string>('point');
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [diagramImage, setDiagramImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedMarkingId, setSelectedMarkingId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  const width = 800;
  const height = 600;
  const allowedTools = config.allowedTools || DEFAULT_TOOLS;
  const title = config.title || 'Anatomical Diagram';
  const bodyPart = config.bodyPart || 'chest';
  const view = config.view || 'frontal';

  useEffect(() => {
    if (open) {
      setMarkings(initialMarkings);
      loadDiagramImage();
    }
  }, [open, initialMarkings]);

  useEffect(() => {
    redrawCanvas();
  }, [markings, diagramImage, zoom, pan, selectedMarkingId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tool shortcuts (only if not typing in input)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p':
          if (allowedTools.includes('point')) setSelectedTool('point');
          break;
        case 'c':
          if (allowedTools.includes('circle')) setSelectedTool('circle');
          break;
        case 'a':
          if (allowedTools.includes('arrow')) setSelectedTool('arrow');
          break;
        case 'f':
          if (allowedTools.includes('freehand')) setSelectedTool('freehand');
          break;
        case 'r':
          if (allowedTools.includes('ruler')) setSelectedTool('ruler');
          break;
        case 'l':
          if (allowedTools.includes('angle')) setSelectedTool('angle');
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleUndo();
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedMarkingId) {
            e.preventDefault();
            handleDeleteMarking(selectedMarkingId);
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleResetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, allowedTools, selectedMarkingId]);

  const loadDiagramImage = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const diagramPath = `/diagrams/${bodyPart}_${view}.png`;
    
    img.onload = () => {
      setDiagramImage(img);
    };
    
    img.onerror = () => {
      console.warn(`Diagram not found: ${diagramPath}, using placeholder`);
      setDiagramImage(null);
    };
    
    img.src = diagramPath;
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply zoom and pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background
    if (diagramImage) {
      ctx.drawImage(diagramImage, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#ddd';
      ctx.strokeRect(0, 0, width, height);
      
      ctx.fillStyle = '#999';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${bodyPart} (${view})`, width / 2, height / 2);
    }

    // Draw markings
    markings.forEach(marking => {
      const isSelected = marking.id === selectedMarkingId;
      drawMarking(ctx, marking, isSelected);
    });

    ctx.restore();
  };

  const drawMarking = (ctx: CanvasRenderingContext2D, marking: DiagramMarking, isSelected: boolean = false) => {
    ctx.strokeStyle = marking.color;
    ctx.fillStyle = marking.color;
    ctx.lineWidth = isSelected ? 4 : 2;

    const points = marking.points;

    // Highlight selected marking
    if (isSelected) {
      ctx.shadowColor = marking.color;
      ctx.shadowBlur = 10;
    }

    switch (marking.type) {
      case 'point':
        if (points.length > 0) {
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, isSelected ? 6 : 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw linked finding indicator
          if (marking.linkedFindingId) {
            ctx.strokeStyle = '#FFD700'; // Gold border
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(points[0].x, points[0].y, 10, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
        break;

      case 'circle':
        if (points.length === 2) {
          const radius = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) + 
            Math.pow(points[1].y - points[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, radius, 0, 2 * Math.PI);
          ctx.stroke();
          
          if (marking.linkedFindingId) {
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        break;

      case 'arrow':
        if (points.length === 2) {
          const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
          const headLength = 20;
          
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(points[1].x, points[1].y);
          ctx.lineTo(
            points[1].x - headLength * Math.cos(angle - Math.PI / 6),
            points[1].y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(points[1].x, points[1].y);
          ctx.lineTo(
            points[1].x - headLength * Math.cos(angle + Math.PI / 6),
            points[1].y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;

      case 'freehand':
        if (points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'ruler':
        if (points.length === 2) {
          const distance = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) + 
            Math.pow(points[1].y - points[0].y, 2)
          );
          
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();
          
          const midX = (points[0].x + points[1].x) / 2;
          const midY = (points[0].y + points[1].y) / 2;
          
          ctx.fillStyle = '#000';
          ctx.font = '14px Arial';
          ctx.fillText(`${distance.toFixed(1)}px`, midX, midY - 5);
        }
        break;

      case 'angle':
        if (points.length === 3) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.lineTo(points[2].x, points[2].y);
          ctx.stroke();
          
          const angle1 = Math.atan2(points[0].y - points[1].y, points[0].x - points[1].x);
          const angle2 = Math.atan2(points[2].y - points[1].y, points[2].x - points[1].x);
          let angleDiff = (angle2 - angle1) * (180 / Math.PI);
          if (angleDiff < 0) angleDiff += 360;
          
          ctx.fillStyle = '#000';
          ctx.font = '14px Arial';
          ctx.fillText(`${angleDiff.toFixed(1)}°`, points[1].x + 10, points[1].y - 10);
        }
        break;
    }

    ctx.shadowBlur = 0;
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle mouse button or spacebar held = pan mode
    if (e.button === 1 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setPanStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentPoints([coords]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle panning
    if (isPanning && panStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const deltaX = (e.clientX - rect.left) - panStart.x;
        const deltaY = (e.clientY - rect.top) - panStart.y;
        setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        setPanStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      return;
    }

    if (!isDrawing) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    if (selectedTool === 'freehand') {
      setCurrentPoints(prev => [...prev, coords]);
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        redrawCanvas();
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        redrawCanvas();
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        
        const tempMarking: DiagramMarking = {
          id: 'temp',
          type: selectedTool as any,
          points: [...currentPoints, coords],
          color: selectedColor,
          timestamp: Date.now()
        };
        
        drawMarking(ctx, tempMarking);
        ctx.restore();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (!isDrawing) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const finalPoints = [...currentPoints, coords];

    const requiredPoints = {
      point: 1,
      circle: 2,
      arrow: 2,
      freehand: 2,
      ruler: 2,
      angle: 3
    };

    if (selectedTool === 'angle' && finalPoints.length < 3) {
      setCurrentPoints(finalPoints);
      return;
    }

    if (finalPoints.length >= requiredPoints[selectedTool as keyof typeof requiredPoints]) {
      const newMarking: DiagramMarking = {
        id: `marking_${Date.now()}`,
        type: selectedTool as any,
        points: finalPoints.slice(0, requiredPoints[selectedTool as keyof typeof requiredPoints]),
        color: selectedColor,
        timestamp: Date.now()
      };

      setMarkings(prev => [...prev, newMarking]);
      setIsDrawing(false);
      setCurrentPoints([]);
    }
  };

  const handleUndo = () => {
    setMarkings(prev => prev.slice(0, -1));
    setSelectedMarkingId(null);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all markings? This cannot be undone.')) {
      setMarkings([]);
      setSelectedMarkingId(null);
    }
  };

  const handleDeleteMarking = (id: string) => {
    setMarkings(prev => prev.filter(m => m.id !== id));
    if (selectedMarkingId === id) {
      setSelectedMarkingId(null);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleLinkFinding = (markingId: string, findingId: string) => {
    setMarkings(prev => prev.map(m => 
      m.id === markingId ? { ...m, linkedFindingId: findingId || undefined } : m
    ));
  };

  const handleSave = () => {
    onSave(markings);
    onClose();
  };

  const handleCancel = () => {
    if (JSON.stringify(markings) !== JSON.stringify(initialMarkings)) {
      if (window.confirm('Discard changes?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Create a temporary canvas to render without zoom/pan
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Draw background
      if (diagramImage) {
        tempCtx.drawImage(diagramImage, 0, 0, width, height);
      } else {
        tempCtx.fillStyle = '#f5f5f5';
        tempCtx.fillRect(0, 0, width, height);
        tempCtx.strokeStyle = '#ddd';
        tempCtx.strokeRect(0, 0, width, height);
        tempCtx.fillStyle = '#999';
        tempCtx.font = '18px Arial';
        tempCtx.textAlign = 'center';
        tempCtx.fillText(`${bodyPart} (${view})`, width / 2, height / 2);
      }

      // Draw all markings
      markings.forEach(marking => {
        drawMarking(tempCtx, marking, false);
      });

      // Convert to PNG and download
      tempCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `diagram-${bodyPart}-${view}-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to export diagram:', error);
      alert('Failed to export diagram. Please try again.');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth={false}
      fullWidth
      PaperProps={{ sx: { width: '95vw', height: '90vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Shift+Drag to pan • P/C/A/F/R/L for tools • Ctrl+Z to undo • +/- to zoom
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Chip label={`Zoom: ${(zoom * 100).toFixed(0)}%`} size="small" />
          <Chip label={`Markings: ${markings.length}`} size="small" color="primary" />
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2, display: 'flex', gap: 2 }}>
        {/* Left Panel - Tools */}
        <Box sx={{ width: 80, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Tools
          </Typography>
          <ToggleButtonGroup
            value={selectedTool}
            exclusive
            onChange={(e, value) => value && setSelectedTool(value)}
            orientation="vertical"
            size="small"
            fullWidth
          >
            {allowedTools.includes('point') && (
              <ToggleButton value="point">
                <Tooltip title="Point" placement="right">
                  <PointIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            )}
            {allowedTools.includes('circle') && (
              <ToggleButton value="circle">
                <Tooltip title="Circle" placement="right">
                  <CircleIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            )}
            {allowedTools.includes('arrow') && (
              <ToggleButton value="arrow">
                <Tooltip title="Arrow" placement="right">
                  <ArrowIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            )}
            {allowedTools.includes('freehand') && (
              <ToggleButton value="freehand">
                <Tooltip title="Freehand" placement="right">
                  <FreehandIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            )}
            {allowedTools.includes('ruler') && (
              <ToggleButton value="ruler">
                <Tooltip title="Ruler" placement="right">
                  <RulerIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            )}
            {allowedTools.includes('angle') && (
              <ToggleButton value="angle">
                <Tooltip title="Angle" placement="right">
                  <AngleIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            )}
          </ToggleButtonGroup>

          <Divider />

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Color
          </Typography>
          <ToggleButtonGroup
            value={selectedColor}
            exclusive
            onChange={(e, value) => value && setSelectedColor(value)}
            orientation="vertical"
            size="small"
            fullWidth
          >
            {COLORS.map(color => (
              <ToggleButton key={color} value={color}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: color,
                    border: '2px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Divider />

          <Box display="flex" flexDirection="column" gap={0.5}>
            <Tooltip title="Zoom In">
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset">
              <IconButton size="small" onClick={handleResetZoom}>
                <ResetZoomIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Center - Canvas */}
        <Box flex={1} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              border: '2px solid #ddd',
              borderRadius: '8px',
              cursor: isPanning ? 'grab' : 'crosshair',
              backgroundColor: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />
        </Box>

        {/* Right Panel - Markings List */}
        <Box sx={{ width: 280, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Markings ({markings.length})
            </Typography>
            <Box>
              <Tooltip title="Undo">
                <span>
                  <IconButton size="small" onClick={handleUndo} disabled={markings.length === 0}>
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Clear All">
                <span>
                  <IconButton size="small" onClick={handleClearAll} disabled={markings.length === 0}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          <List 
            dense 
            sx={{ 
              flex: 1, 
              overflow: 'auto', 
              bgcolor: '#f9f9f9', 
              borderRadius: 1,
              border: '1px solid #e0e0e0'
            }}
          >
            {markings.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="No markings yet"
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItem>
            ) : (
              markings.map((marking, idx) => (
                <React.Fragment key={marking.id}>
                  <ListItem
                    selected={selectedMarkingId === marking.id}
                    onClick={() => setSelectedMarkingId(marking.id)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f0f0f0' }
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        bgcolor: marking.color,
                        borderRadius: '50%',
                        mr: 1,
                        flexShrink: 0
                      }}
                    />
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <span>{`${marking.type} #${idx + 1}`}</span>
                          {marking.linkedFindingId && (
                            <Chip label="Linked" size="small" color="warning" sx={{ height: 16, fontSize: 10 }} />
                          )}
                        </Box>
                      }
                      secondary={
                        findings.length > 0 && (
                          <FormControl fullWidth size="small" sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={marking.linkedFindingId || ''}
                              onChange={(e) => handleLinkFinding(marking.id, e.target.value)}
                              displayEmpty
                              sx={{ fontSize: 11 }}
                            >
                              <MenuItem value="">
                                <em>No link</em>
                              </MenuItem>
                              {findings.map(finding => (
                                <MenuItem key={finding.id} value={finding.id} sx={{ fontSize: 11 }}>
                                  {finding.description?.substring(0, 30)}...
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )
                      }
                      primaryTypographyProps={{ variant: 'caption', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMarking(marking.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {idx < markings.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>

          {findings.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
              Add findings to enable linking
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button 
          onClick={handleExportPNG} 
          variant="outlined" 
          startIcon={<DownloadIcon />}
          sx={{ mr: 'auto' }}
        >
          Export PNG
        </Button>
        <Button onClick={handleCancel} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
