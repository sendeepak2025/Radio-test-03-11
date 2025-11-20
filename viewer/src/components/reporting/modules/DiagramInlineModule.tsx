/**
 * Diagram Inline Module
 * Compact anatomical diagram for marking findings
 * Reads configuration from template.uiModules
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  Chip
} from '@mui/material';
import {
  RadioButtonUnchecked as PointIcon,
  Lens as CircleIcon,
  ArrowForward as ArrowIcon,
  Edit as FreehandIcon,
  Straighten as RulerIcon,
  ShowChart as AngleIcon,
  Delete as DeleteIcon,
  Fullscreen as FullscreenIcon,
  Clear as ClearIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import { DiagramFullscreenModal } from './DiagramFullscreenModal';

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

interface DiagramInlineModuleProps {
  config?: {
    bodyPart?: string;
    view?: string;
    allowedTools?: Array<'point' | 'circle' | 'arrow' | 'freehand' | 'ruler' | 'angle'>;
    width?: number;
    height?: number;
    title?: string;
  };
  value?: DiagramMarking[];
  onChange?: (markings: DiagramMarking[]) => void;
  required?: boolean;
  findings?: Finding[];
}

const DEFAULT_TOOLS: Array<'point' | 'circle' | 'arrow' | 'freehand' | 'ruler' | 'angle'> = 
  ['point', 'circle', 'arrow', 'freehand', 'ruler', 'angle'];

const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

export const DiagramInlineModule: React.FC<DiagramInlineModuleProps> = ({
  config = {},
  value = [],
  onChange,
  required = false,
  findings = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [markings, setMarkings] = useState<DiagramMarking[]>(value);
  const [selectedTool, setSelectedTool] = useState<string>('point');
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [diagramImage, setDiagramImage] = useState<HTMLImageElement | null>(null);

  const width = config.width || 400;
  const height = config.height || 300;
  const allowedTools = config.allowedTools || DEFAULT_TOOLS;
  const title = config.title || 'Anatomical Diagram';
  const bodyPart = config.bodyPart || 'chest';
  const view = config.view || 'frontal';

  // Debug logging
  useEffect(() => {
    console.log('📊 DiagramInlineModule initialized:', {
      bodyPart,
      view,
      title,
      configReceived: config,
      width,
      height,
      allowedTools
    });
  }, []);

  useEffect(() => {
    loadDiagramImage();
  }, [bodyPart, view]);

  useEffect(() => {
    redrawCanvas();
  }, [markings, diagramImage]);

  useEffect(() => {
    if (onChange) {
      onChange(markings);
    }
  }, [markings]);

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

    if (diagramImage) {
      ctx.drawImage(diagramImage, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#ddd';
      ctx.strokeRect(0, 0, width, height);
      
      ctx.fillStyle = '#999';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${bodyPart} (${view})`, width / 2, height / 2);
    }

    markings.forEach(marking => {
      drawMarking(ctx, marking);
    });
  };

  const drawMarking = (ctx: CanvasRenderingContext2D, marking: DiagramMarking) => {
    ctx.strokeStyle = marking.color;
    ctx.fillStyle = marking.color;
    ctx.lineWidth = 2;

    const points = marking.points;

    switch (marking.type) {
      case 'point':
        if (points.length > 0) {
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, 4, 0, 2 * Math.PI);
          ctx.fill();
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
        }
        break;

      case 'arrow':
        if (points.length === 2) {
          const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
          const headLength = 15;
          
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
          ctx.font = '12px Arial';
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
          ctx.font = '12px Arial';
          ctx.fillText(`${angleDiff.toFixed(1)}°`, points[1].x + 10, points[1].y - 10);
        }
        break;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === 'freehand') {
      setCurrentPoints(prev => [...prev, { x, y }]);
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        redrawCanvas();
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        redrawCanvas();
        
        const tempMarking: DiagramMarking = {
          id: 'temp',
          type: selectedTool as any,
          points: [...currentPoints, { x, y }],
          color: selectedColor,
          timestamp: Date.now()
        };
        
        drawMarking(ctx, tempMarking);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const finalPoints = [...currentPoints, { x, y }];

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

  const handleClearAll = () => {
    setMarkings([]);
  };

  const handleUndo = () => {
    setMarkings(prev => prev.slice(0, -1));
  };

  const handleDeleteMarking = (id: string) => {
    setMarkings(prev => prev.filter(m => m.id !== id));
  };

  const linkedCount = markings.filter(m => m.linkedFindingId).length;

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
            {required && <span style={{ color: 'red' }}> *</span>}
          </Typography>
          {markings.length > 0 && (
            <Chip 
              label={`${markings.length} marking${markings.length > 1 ? 's' : ''}`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          )}
          {linkedCount > 0 && (
            <Chip 
              label={`${linkedCount} linked`} 
              size="small" 
              color="warning" 
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        
        <Box display="flex" gap={1}>
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
          <Tooltip title="Fullscreen">
            <IconButton size="small" onClick={() => setFullscreenOpen(true)}>
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box display="flex" gap={2}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Drawing Tools
          </Typography>
          <ToggleButtonGroup
            value={selectedTool}
            exclusive
            onChange={(e, value) => value && setSelectedTool(value)}
            orientation="vertical"
            size="small"
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

          <Box mt={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Color
            </Typography>
            <ToggleButtonGroup
              value={selectedColor}
              exclusive
              onChange={(e, value) => value && setSelectedColor(value)}
              orientation="vertical"
              size="small"
            >
              {COLORS.map(color => (
                <ToggleButton key={color} value={color}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      bgcolor: color,
                      border: '1px solid #ddd',
                      borderRadius: '2px'
                    }}
                  />
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Box flex={1}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'crosshair',
              display: 'block'
            }}
          />
        </Box>

        {markings.length > 0 && (
          <Box sx={{ width: 200 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Markings ({markings.length})
            </Typography>
            <List dense sx={{ maxHeight: height, overflow: 'auto', bgcolor: '#f9f9f9', borderRadius: 1 }}>
              {markings.map((marking, idx) => (
                <React.Fragment key={marking.id}>
                  <ListItem>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        bgcolor: marking.color,
                        borderRadius: '50%',
                        mr: 1
                      }}
                    />
                    <ListItemText
                      primary={`${marking.type} #${idx + 1}`}
                      primaryTypographyProps={{ variant: 'caption' }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDeleteMarking(marking.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {idx < markings.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
      </Box>

      {markings.length === 0 && (
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          Select a tool and click on the diagram to mark findings
        </Typography>
      )}

      {/* Fullscreen Modal */}
      <DiagramFullscreenModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        config={config}
        initialMarkings={markings}
        onSave={(updatedMarkings) => {
          setMarkings(updatedMarkings);
          if (onChange) {
            onChange(updatedMarkings);
          }
        }}
        findings={findings}
      />
    </Paper>
  );
};
