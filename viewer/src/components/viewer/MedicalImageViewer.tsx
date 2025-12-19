"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Move,
  ZoomIn,
  Sun,
  Layers,
  Eye,
  Ruler,
  ArrowRight,
  Minus,
  Compass,
  Square,
  CircleIcon,
  TypeIcon,
  Gauge,
  GridIcon,
  Trash2,
  RotateCcw,
  Camera,
} from "lucide-react"
import { screenshotService } from "../../services/screenshotService"
import CapturedImagesGallery from "./CapturedImagesGallery"

// ======================== TYPES ========================
type Tool =
  | "pan"
  | "zoom"
  | "wl"
  | "length"
  | "angle"
  | "rect"
  | "circle"
  | "text"
  | "line"
  | "arrow"
  | "polygon"
  | "calibration"
type AnnotationType = "length" | "angle" | "rect" | "circle" | "text" | "line" | "arrow" | "polygon" | "calibration"
type Point = { x: number; y: number }

interface Annotation {
  id: string
  type: AnnotationType
  points: Point[]
  color?: string
  label?: string
  thickness?: number
  fontSize?: number
  fontBold?: boolean
  measurement?: number // For length measurements in mm
  labelPosition?: Point // For draggable labels
}

interface CombinedDicomViewerProps {
  studyInstanceUID: string
  seriesInstanceUID?: string
  sopInstanceUIDs?: string[]
  dicomWebBaseUrl?: string
}

// ======================== HELPER FUNCTIONS ========================
function getAnnotationBoundingBox(ann: Annotation | null | undefined) {
  if (!ann || !ann.points || ann.points.length === 0) return null
  const xs = ann.points.map((p) => p.x)
  const ys = ann.points.map((p) => p.y)
  return {
    min: { x: Math.min(...xs), y: Math.min(...ys) },
    max: { x: Math.max(...xs), y: Math.max(...ys) },
  }
}

function cleanAnnotations(annotations: (Annotation | null | undefined)[]): Annotation[] {
  return annotations.filter((ann): ann is Annotation => 
    ann != null && ann.id != null && ann.points != null && ann.points.length > 0
  )
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  drawW: number,
  drawH: number,
  mmPerPixel: number | null,
  scale: number,
  vw: number,
  vh: number,
) {
  if (!mmPerPixel || mmPerPixel <= 0) return
  const gridSpacing = (10 / mmPerPixel) * scale
  if (gridSpacing < 5) return

  ctx.strokeStyle = "rgba(100, 150, 200, 0.2)"
  ctx.lineWidth = 0.5

  for (let x = dx; x < dx + drawW; x += gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(x, dy)
    ctx.lineTo(x, dy + drawH)
    ctx.stroke()
  }

  for (let y = dy; y < dy + drawH; y += gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(dx, y)
    ctx.lineTo(dx + drawW, y)
    ctx.stroke()
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, info: any) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
  ctx.font = "11px monospace"
  const lines = [
    `Frame: ${info.frame}/${info.totalFrames}`,
    `Zoom: ${(info.zoom * 100).toFixed(0)}%`,
    `Study: ${info.studyInstanceUID?.slice(-8) || "N/A"}`,
  ]

  let y = 15
  for (const line of lines) {
    ctx.fillText(line, 10, y)
    y += 12
  }
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  toView: (p: Point) => Point,
  isSelected: boolean,
  mmPerPixel: number | null,
) {
  const color = isSelected ? "#ffff00" : ann.color || "#00e5ff"
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = ann.thickness || 2

  const points = ann.points.map(toView)
  
  // Helper function to draw measurement label with background
  const drawMeasurementLabel = (text: string, x: number, y: number) => {
    const fontSize = ann.fontSize || 14
    const fontWeight = ann.fontBold ? 'bold' : 'normal'
    ctx.font = `${fontWeight} ${fontSize}px Arial`
    
    // Measure text
    const metrics = ctx.measureText(text)
    const textWidth = metrics.width
    const textHeight = fontSize
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(x - 4, y - textHeight - 2, textWidth + 8, textHeight + 6)
    
    // Draw text
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  }
  
  // Draw annotation type label
  const drawTypeLabel = (x: number, y: number) => {
    const typeNames: Record<AnnotationType, string> = {
      length: 'Length',
      line: 'Line',
      arrow: 'Arrow',
      rect: 'Rectangle',
      circle: 'Circle',
      angle: 'Angle',
      polygon: 'Polygon',
      text: 'Text',
      calibration: 'Calibration'
    }
    const typeName = typeNames[ann.type] || ann.type
    ctx.font = 'bold 10px Arial'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(x - 2, y - 12, ctx.measureText(typeName).width + 4, 14)
    ctx.fillStyle = color
    ctx.fillText(typeName, x, y)
  }

  switch (ann.type) {
    case "length":
    case "line":
      if (points.length >= 2) {
        // Draw line
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        ctx.lineTo(points[1].x, points[1].y)
        ctx.stroke()
        
        // Draw handles
        ctx.fillRect(points[0].x - 4, points[0].y - 4, 8, 8)
        ctx.fillRect(points[1].x - 4, points[1].y - 4, 8, 8)

        // Calculate and display measurement
        if (ann.type === "length") {
          const dx = points[1].x - points[0].x
          const dy = points[1].y - points[0].y
          const distPixels = Math.sqrt(dx * dx + dy * dy)
          
          let measurementText = `${distPixels.toFixed(1)}px`
          
          if (mmPerPixel && mmPerPixel > 0) {
            const mm = distPixels * mmPerPixel
            const cm = mm / 10
            measurementText = cm >= 1 
              ? `${cm.toFixed(2)} cm` 
              : `${mm.toFixed(1)} mm`
          }
          
          // Label position (draggable if set, otherwise center)
          const labelPos = ann.labelPosition 
            ? toView(ann.labelPosition)
            : { 
                x: (points[0].x + points[1].x) / 2 + 10, 
                y: (points[0].y + points[1].y) / 2 - 10 
              }
          
          drawMeasurementLabel(measurementText, labelPos.x, labelPos.y)
          
          // Draw type label at start point
          drawTypeLabel(points[0].x + 5, points[0].y - 5)
        }
      }
      break

    case "arrow":
      if (points.length >= 2) {
        // Draw line
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        ctx.lineTo(points[1].x, points[1].y)
        ctx.stroke()
        
        // Draw arrowhead
        const headlen = 15
        const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x)
        ctx.beginPath()
        ctx.moveTo(
          points[1].x - headlen * Math.cos(angle - Math.PI / 6),
          points[1].y - headlen * Math.sin(angle - Math.PI / 6),
        )
        ctx.lineTo(points[1].x, points[1].y)
        ctx.lineTo(
          points[1].x - headlen * Math.cos(angle + Math.PI / 6),
          points[1].y - headlen * Math.sin(angle + Math.PI / 6),
        )
        ctx.stroke()
        
        // Draw handles
        ctx.fillRect(points[0].x - 4, points[0].y - 4, 8, 8)
        
        // Draw type label
        drawTypeLabel(points[0].x + 5, points[0].y - 5)
      }
      break

    case "rect":
      if (points.length >= 2) {
        const width = points[1].x - points[0].x
        const height = points[1].y - points[0].y
        ctx.strokeRect(points[0].x, points[0].y, width, height)
        
        // Draw handles
        ctx.fillRect(points[0].x - 4, points[0].y - 4, 8, 8)
        ctx.fillRect(points[1].x - 4, points[1].y - 4, 8, 8)
        
        // Draw type label
        drawTypeLabel(points[0].x + 5, points[0].y - 5)
      }
      break

    case "circle":
      if (points.length >= 2) {
        const dx = points[1].x - points[0].x
        const dy = points[1].y - points[0].y
        const radius = Math.sqrt(dx * dx + dy * dy)
        ctx.beginPath()
        ctx.arc(points[0].x, points[0].y, radius, 0, 2 * Math.PI)
        ctx.stroke()
        
        // Draw center handle
        ctx.fillRect(points[0].x - 4, points[0].y - 4, 8, 8)
        
        // Draw type label
        drawTypeLabel(points[0].x + 5, points[0].y - radius - 15)
      }
      break

    case "angle":
      if (points.length >= 3) {
        // Draw lines
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        ctx.lineTo(points[1].x, points[1].y)
        ctx.lineTo(points[2].x, points[2].y)
        ctx.stroke()
        
        // Draw handles
        ctx.fillRect(points[0].x - 4, points[0].y - 4, 8, 8)
        ctx.fillRect(points[1].x - 4, points[1].y - 4, 8, 8)
        ctx.fillRect(points[2].x - 4, points[2].y - 4, 8, 8)

        // Calculate angle
        const v1 = { x: points[0].x - points[1].x, y: points[0].y - points[1].y }
        const v2 = { x: points[2].x - points[1].x, y: points[2].y - points[1].y }
        const angle = Math.acos(
          (v1.x * v2.x + v1.y * v2.y) / (Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y)),
        )
        
        const labelPos = ann.labelPosition 
          ? toView(ann.labelPosition)
          : { x: points[1].x + 15, y: points[1].y - 10 }
        
        drawMeasurementLabel(`${(angle * (180 / Math.PI)).toFixed(1)}°`, labelPos.x, labelPos.y)
        drawTypeLabel(points[1].x + 5, points[1].y + 20)
      }
      break

    case "polygon":
      if (points.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.stroke()
        
        // Draw handles at each point
        for (const p of points) {
          ctx.fillRect(p.x - 4, p.y - 4, 8, 8)
        }
        
        // Draw type label
        if (points.length > 0) {
          drawTypeLabel(points[0].x + 5, points[0].y - 5)
        }
      }
      break

    case "text":
      if (points.length >= 1 && ann.label) {
        const fontSize = ann.fontSize || 16
        const fontWeight = ann.fontBold ? 'bold' : 'normal'
        ctx.font = `${fontWeight} ${fontSize}px Arial`
        
        // Draw text with background
        const metrics = ctx.measureText(ann.label)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(points[0].x - 2, points[0].y - fontSize, metrics.width + 4, fontSize + 4)
        
        ctx.fillStyle = color
        ctx.fillText(ann.label, points[0].x, points[0].y)
        
        // Draw type label
        drawTypeLabel(points[0].x, points[0].y + 15)
      }
      break
  }
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  type: AnnotationType,
  toView: (p: Point) => Point,
  mmPerPixel: number | null = null,
) {
  if (points.length < 1) return

  const viewPoints = points.map(toView)
  
  // Bright, animated preview
  ctx.strokeStyle = "rgba(0, 255, 255, 0.9)"
  ctx.fillStyle = "rgba(0, 255, 255, 0.3)"
  ctx.lineWidth = 3
  ctx.setLineDash([8, 4]) // Animated dashed line
  
  // Helper to draw live measurement
  const drawLiveMeasurement = (text: string, x: number, y: number) => {
    ctx.setLineDash([])
    ctx.font = 'bold 16px Arial'
    const metrics = ctx.measureText(text)
    
    // Glowing background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(x - 4, y - 18, metrics.width + 8, 24)
    
    // Bright text
    ctx.fillStyle = 'rgba(0, 255, 255, 1)'
    ctx.fillText(text, x, y)
    
    ctx.setLineDash([8, 4])
  }
  
  // Draw crosshair at first point
  if (viewPoints.length > 0) {
    const p = viewPoints[0]
    ctx.setLineDash([])
    ctx.strokeStyle = "rgba(255, 255, 0, 0.9)"
    ctx.lineWidth = 2
    
    // Animated crosshair
    ctx.beginPath()
    ctx.moveTo(p.x - 15, p.y)
    ctx.lineTo(p.x + 15, p.y)
    ctx.moveTo(p.x, p.y - 15)
    ctx.lineTo(p.x, p.y + 15)
    ctx.stroke()
    
    // Center dot
    ctx.fillStyle = "rgba(255, 255, 0, 0.9)"
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    ctx.fill()
    
    // Reset
    ctx.strokeStyle = "rgba(0, 255, 255, 0.9)"
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
  }

  if (type === "line" || type === "length") {
    if (viewPoints.length >= 2) {
      // Draw line
      ctx.beginPath()
      ctx.moveTo(viewPoints[0].x, viewPoints[0].y)
      ctx.lineTo(viewPoints[1].x, viewPoints[1].y)
      ctx.stroke()
      
      // Draw handles
      ctx.setLineDash([])
      ctx.fillStyle = "rgba(255, 255, 0, 0.9)"
      viewPoints.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"
        ctx.lineWidth = 1
        ctx.stroke()
      })
      
      // REAL-TIME MEASUREMENT with units
      if (type === "length") {
        const dx = viewPoints[1].x - viewPoints[0].x
        const dy = viewPoints[1].y - viewPoints[0].y
        const distPixels = Math.sqrt(dx * dx + dy * dy)
        
        let measurementText = `${distPixels.toFixed(1)}px`
        
        if (mmPerPixel && mmPerPixel > 0) {
          const mm = distPixels * mmPerPixel
          const cm = mm / 10
          measurementText = cm >= 1 
            ? `${cm.toFixed(2)} cm` 
            : `${mm.toFixed(1)} mm`
        }
        
        const midX = (viewPoints[0].x + viewPoints[1].x) / 2
        const midY = (viewPoints[0].y + viewPoints[1].y) / 2
        
        drawLiveMeasurement(measurementText, midX + 10, midY - 10)
      }
      ctx.setLineDash([8, 4])
    }
  } else if (type === "arrow") {
    if (viewPoints.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(viewPoints[0].x, viewPoints[0].y)
      ctx.lineTo(viewPoints[1].x, viewPoints[1].y)
      ctx.stroke()
      // Draw arrowhead
      const headlen = 15
      const angle = Math.atan2(viewPoints[1].y - viewPoints[0].y, viewPoints[1].x - viewPoints[0].x)
      ctx.beginPath()
      ctx.moveTo(
        viewPoints[1].x - headlen * Math.cos(angle - Math.PI / 6),
        viewPoints[1].y - headlen * Math.sin(angle - Math.PI / 6),
      )
      ctx.lineTo(viewPoints[1].x, viewPoints[1].y)
      ctx.lineTo(
        viewPoints[1].x - headlen * Math.cos(angle + Math.PI / 6),
        viewPoints[1].y - headlen * Math.sin(angle + Math.PI / 6),
      )
      ctx.stroke()
    }
  } else if (type === "text") {
    if (viewPoints.length >= 1) {
      ctx.fillStyle = "rgba(100, 200, 255, 0.8)"
      ctx.font = "bold 12px Arial"
      ctx.fillText("Text", viewPoints[0].x, viewPoints[0].y)
    }
  } else if (type === "rect") {
    if (viewPoints.length >= 2) {
      const width = viewPoints[1].x - viewPoints[0].x
      const height = viewPoints[1].y - viewPoints[0].y
      ctx.strokeRect(viewPoints[0].x, viewPoints[0].y, width, height)
      
      // Draw handles
      ctx.setLineDash([])
      ctx.fillStyle = "rgba(255, 255, 0, 0.9)"
      ctx.beginPath()
      ctx.arc(viewPoints[0].x, viewPoints[0].y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(viewPoints[1].x, viewPoints[1].y, 5, 0, Math.PI * 2)
      ctx.fill()
      
      // Show dimensions
      const sizeText = `${Math.abs(width).toFixed(0)} × ${Math.abs(height).toFixed(0)}px`
      drawLiveMeasurement(sizeText, viewPoints[0].x + width/2, viewPoints[0].y - 10)
    }
  } else if (type === "circle") {
    if (viewPoints.length >= 2) {
      const dx = viewPoints[1].x - viewPoints[0].x
      const dy = viewPoints[1].y - viewPoints[0].y
      const radius = Math.sqrt(dx * dx + dy * dy)
      ctx.beginPath()
      ctx.arc(viewPoints[0].x, viewPoints[0].y, radius, 0, 2 * Math.PI)
      ctx.stroke()
      
      // Draw center handle
      ctx.setLineDash([])
      ctx.fillStyle = "rgba(255, 255, 0, 0.9)"
      ctx.beginPath()
      ctx.arc(viewPoints[0].x, viewPoints[0].y, 5, 0, Math.PI * 2)
      ctx.fill()
      
      // Show radius
      const radiusText = `R: ${radius.toFixed(1)}px`
      drawLiveMeasurement(radiusText, viewPoints[0].x, viewPoints[0].y - radius - 15)
    }
  } else if (type === "angle") {
    if (viewPoints.length >= 2) {
      // Draw first line
      ctx.beginPath()
      ctx.moveTo(viewPoints[0].x, viewPoints[0].y)
      ctx.lineTo(viewPoints[1].x, viewPoints[1].y)
      ctx.stroke()
      
      if (viewPoints.length >= 3) {
        // Draw second line
        ctx.beginPath()
        ctx.moveTo(viewPoints[1].x, viewPoints[1].y)
        ctx.lineTo(viewPoints[2].x, viewPoints[2].y)
        ctx.stroke()
        
        // Calculate and show angle
        const v1 = { x: viewPoints[0].x - viewPoints[1].x, y: viewPoints[0].y - viewPoints[1].y }
        const v2 = { x: viewPoints[2].x - viewPoints[1].x, y: viewPoints[2].y - viewPoints[1].y }
        const angle = Math.acos(
          (v1.x * v2.x + v1.y * v2.y) / 
          (Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y))
        )
        const angleDeg = (angle * (180 / Math.PI)).toFixed(1)
        
        drawLiveMeasurement(`${angleDeg}°`, viewPoints[1].x + 15, viewPoints[1].y - 10)
      }
      
      // Draw handles
      ctx.setLineDash([])
      ctx.fillStyle = "rgba(255, 255, 0, 0.9)"
      viewPoints.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }
}

// ======================== MAIN COMPONENT ========================
export const MedicalImageViewer: React.FC<CombinedDicomViewerProps> = (props) => {
  const [viewMode, setViewMode] = useState<"2d" | "mpr">("2d")

  return (
    <div className="w-full h-screen flex flex-col bg-slate-900">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-3 bg-slate-800 border-b border-slate-700">
        <button
          onClick={() => setViewMode("2d")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            viewMode === "2d" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          2D Viewer
        </button>
        <button
          onClick={() => setViewMode("mpr")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            viewMode === "mpr" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          MPR Viewer (Optimized)
        </button>
      </div>

      {/* Viewer Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
         {viewMode === "2d" ? <TwoDViewer {...props} /> : <MPRViewerOptimized {...props} />}
      </div>
    </div>
  )
}

// ======================== 2D VIEWER ========================
const TwoDViewer: React.FC<CombinedDicomViewerProps> = ({
  studyInstanceUID,
  seriesInstanceUID,
  sopInstanceUIDs = [],
  dicomWebBaseUrl = "/api/dicom",
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameCacheRef = useRef<Map<number, ImageBitmap>>(new Map())
  const drawingStateRef = useRef({ 
    isDrawing: false, 
    isDragging: false, 
    isMouseDown: false,
    isResizing: false,
    draggedAnnotationId: null as string | null,
    draggedPointIndex: null as number | null,
  })
  const tempAnnotationRef = useRef<Annotation | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dpr = window.devicePixelRatio || 1

  // State
  const [currentFrame, setCurrentFrame] = useState(0)
  const [tool, setTool] = useState<Tool>("pan")
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [showOverlay, setShowOverlay] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [mmPerPixel, setMmPerPixel] = useState<number | null>(null)
  const [showCapturedImages, setShowCapturedImages] = useState(false)

  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')

  const totalFrames = sopInstanceUIDs.length || 1

  // Load frame with caching
  const loadFrame = useCallback(
    async (frameIndex: number) => {
      if (frameCacheRef.current.has(frameIndex)) {
        return frameCacheRef.current.get(frameIndex)
      }

      const frameUrl = seriesInstanceUID
        ? `${dicomWebBaseUrl}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/frames/${frameIndex}`
        : `${dicomWebBaseUrl}/studies/${studyInstanceUID}/frames/${frameIndex}`

      try {
        const response = await fetch(frameUrl, { signal: AbortSignal.timeout(10000) })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const blob = await response.blob()
        const bitmap = await createImageBitmap(blob)
        frameCacheRef.current.set(frameIndex, bitmap)
        return bitmap
      } catch (err) {
        console.error("[v0] Frame load error:", err)
        return null
      }
    },
    [dicomWebBaseUrl, studyInstanceUID, seriesInstanceUID],
  )

  // Draw function - stored in ref to avoid dependency issues
  const drawRef = useRef<(() => Promise<void>) | null>(null)
  
  // Store image bounds for coordinate conversion
  const imageBoundsRef = useRef({
    dx: 0,
    dy: 0,
    scale: 1,
    imgW: 0,
    imgH: 0,
  })
  
  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const bitmap = await loadFrame(currentFrame)
    if (!bitmap) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const rect = containerRef.current?.getBoundingClientRect()
    const vw = rect?.width || 0
    const vh = rect?.height || 0

    // Only resize if dimensions changed
    const needsResize = canvas.width !== Math.floor(vw * dpr) || canvas.height !== Math.floor(vh * dpr)
    if (needsResize) {
      canvas.width = Math.floor(vw * dpr)
      canvas.height = Math.floor(vh * dpr)
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, vw, vh)

    // Image scaling and positioning
    const imgW = bitmap.width
    const imgH = bitmap.height
    const scale = zoom
    const drawW = imgW * scale
    const drawH = imgH * scale
    const dx = vw / 2 - drawW / 2 + pan.x
    const dy = vh / 2 - drawH / 2 + pan.y

    // Store bounds for coordinate conversion in mouse handlers
    imageBoundsRef.current = { dx, dy, scale, imgW, imgH }

    ctx.imageSmoothingEnabled = true
    ctx.filter = `brightness(${brightness}) contrast(${contrast})`
    ctx.drawImage(bitmap, dx, dy, drawW, drawH)
    ctx.filter = "none"

    // Grid overlay
    if (showGrid) {
      drawGrid(ctx, dx, dy, drawW, drawH, mmPerPixel, scale, vw, vh)
    }

    // Overlay info
    if (showOverlay) {
      drawOverlay(ctx, {
        studyInstanceUID,
        seriesInstanceUID,
        frame: currentFrame + 1,
        totalFrames,
        zoom: scale,
        mmPerPixel: mmPerPixel,
        vw,
        vh,
      })
    }

    // Annotations
    const toView = (p: Point) => ({
      x: dx + p.x * scale,
      y: dy + p.y * scale,
    })

    const validAnnotations = cleanAnnotations(annotations)
    for (const ann of validAnnotations) {
      drawAnnotation(ctx, ann, toView, selectedAnnotationId === ann.id, mmPerPixel)
    }

    // Preview points for current annotation tool with real-time measurements
    if (tempAnnotationRef.current) {
      drawPreview(ctx, tempAnnotationRef.current.points, tempAnnotationRef.current.type, toView, mmPerPixel)
    }
  }, [
    currentFrame,
    studyInstanceUID,
    seriesInstanceUID,
    totalFrames,
    zoom,
    pan,
    brightness,
    contrast,
    showOverlay,
    showGrid,
    mmPerPixel,
    annotations,
    selectedAnnotationId,
    loadFrame,
    dpr,
  ])
  
  // Update drawRef whenever draw changes
  useEffect(() => {
    drawRef.current = draw
  }, [draw])

  // Mouse wheel for frame navigation and zoom/brightness
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return

      if (e.shiftKey) {
        e.preventDefault()
        const newZoom = Math.max(0.1, Math.min(5, zoom - (e.deltaY > 0 ? 0.1 : -0.1)))
        setZoom(newZoom)
      } else if (e.ctrlKey) {
        e.preventDefault()
        const newBrightness = Math.max(0.5, Math.min(2, brightness - (e.deltaY > 0 ? 0.1 : -0.1)))
        setBrightness(newBrightness)
      } else {
        // Frame navigation
        setCurrentFrame((prev) => {
          const next = prev + (e.deltaY > 0 ? 1 : -1)
          return Math.max(0, Math.min(totalFrames - 1, next))
        })
      }
    },
    [zoom, brightness, totalFrames],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Ensure keyboard events (Enter/Escape) are captured for angle/polygon tools
      if (typeof (canvas as any).focus === "function") {
        ;(canvas as any).focus()
      }

      drawingStateRef.current.isMouseDown = true

      const rect = canvas.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top

      // Convert canvas coordinates to image coordinates using stored bounds
      const bounds = imageBoundsRef.current
      const imageX = (canvasX - bounds.dx) / bounds.scale
      const imageY = (canvasY - bounds.dy) / bounds.scale

      // Check if clicking on annotation handle (for resizing)
      const handleRadius = 8 / zoom // Handle size in image coordinates
      let clickedHandle = false
      
      for (const ann of annotations.filter(ann => ann && ann.id && ann.points)) {
        for (let i = 0; i < ann.points.length; i++) {
          const point = ann.points[i]
          const dx = imageX - point.x
          const dy = imageY - point.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < handleRadius) {
            // Clicked on a handle - enable resize mode
            setSelectedAnnotationId(ann.id)
            drawingStateRef.current.isResizing = true
            drawingStateRef.current.draggedAnnotationId = ann.id
            drawingStateRef.current.draggedPointIndex = i
            clickedHandle = true
            break
          }
        }
        if (clickedHandle) break
      }
      
      if (clickedHandle) return
      
      // Check if clicking on existing annotation body (for moving)
      const clickedAnn = annotations.filter(ann => ann && ann.id && ann.points).find((ann) => {
        const bb = getAnnotationBoundingBox(ann)
        if (!bb) return false
        return imageX >= bb.min.x - 5 && imageX <= bb.max.x + 5 && imageY >= bb.min.y - 5 && imageY <= bb.max.y + 5
      })

      if (clickedAnn && tool === "pan") {
        setSelectedAnnotationId(clickedAnn.id)
        drawingStateRef.current.isDragging = true
        drawingStateRef.current.draggedAnnotationId = clickedAnn.id
        dragOffsetRef.current = {
          x: imageX - clickedAnn.points[0].x,
          y: imageY - clickedAnn.points[0].y,
        }
        return
      }

      if (tool === "pan" || tool === "zoom" || tool === "wl") {
        // Pan tool: prepare for dragging
        if (tool === "pan") {
          dragOffsetRef.current = { x: canvasX, y: canvasY }
        }
      } else {
        // Annotation tools: start drawing
        tempAnnotationRef.current = {
          id: Math.random().toString(36).slice(2),
          type: tool as AnnotationType,
          points: [{ x: imageX, y: imageY }],
          color: "#00e5ff",
          thickness: 2,
          fontSize: 14,
          fontBold: false,
        }
        drawingStateRef.current.isDrawing = true
      }
    },
    [annotations, tool, zoom, pan, dpr],
  )

  const mouseMoveRafRef = useRef<number | null>(null)
  
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return

      // Get coordinates immediately (before RAF)
      const rect = canvasRef.current.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top
      
      // Convert canvas coordinates to image coordinates using stored bounds
      const bounds = imageBoundsRef.current
      const imageX = (canvasX - bounds.dx) / bounds.scale
      const imageY = (canvasY - bounds.dy) / bounds.scale

      // Update cursor based on hover state
      if (!drawingStateRef.current.isDrawing && !drawingStateRef.current.isDragging && !drawingStateRef.current.isResizing) {
        const handleRadius = 8 / zoom
        let overHandle = false
        
        for (const ann of annotations.filter(ann => ann && ann.id && ann.points)) {
          for (const point of ann.points) {
            const dx = imageX - point.x
            const dy = imageY - point.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            if (dist < handleRadius) {
              setCursorStyle('pointer')
              overHandle = true
              break
            }
          }
          if (overHandle) break
        }
        
        if (!overHandle) {
          if (tool === 'pan') setCursorStyle('move')
          else if (tool === 'zoom') setCursorStyle('zoom-in')
          else setCursorStyle('crosshair')
        }
      }

      // For drawing/resizing/dragging, update immediately for real-time feedback
      // For other operations, throttle with RAF
      const needsImmediateUpdate = drawingStateRef.current.isDrawing || 
                                    drawingStateRef.current.isResizing || 
                                    drawingStateRef.current.isDragging
      
      if (!needsImmediateUpdate && mouseMoveRafRef.current) return
      
      const updateOperations = () => {
        if (!needsImmediateUpdate) {
          mouseMoveRafRef.current = null
        }

      // Handle resizing (moving individual points)
      if (drawingStateRef.current.isResizing && drawingStateRef.current.draggedAnnotationId !== null) {
        const annId = drawingStateRef.current.draggedAnnotationId
        const pointIdx = drawingStateRef.current.draggedPointIndex
        
        if (pointIdx !== null) {
          const idx = annotations.findIndex((a) => a && a.id === annId)
          if (idx >= 0) {
            const updatedAnnotations = [...annotations]
            const updatedPoints = [...updatedAnnotations[idx].points]
            updatedPoints[pointIdx] = { x: imageX, y: imageY }
            updatedAnnotations[idx] = {
              ...updatedAnnotations[idx],
              points: updatedPoints,
            }
            setAnnotations(updatedAnnotations)
            // Force redraw for real-time resize
            drawRef.current?.()
          }
        }
      }
      // Handle dragging (moving entire annotation)
      else if (drawingStateRef.current.isDragging && drawingStateRef.current.draggedAnnotationId) {
        const annId = drawingStateRef.current.draggedAnnotationId
        const idx = annotations.findIndex((a) => a && a.id === annId)
        if (idx >= 0) {
          const offset = dragOffsetRef.current
          const updatedAnnotations = [...annotations]
          const deltaX = imageX - offset.x
          const deltaY = imageY - offset.y
          
          updatedAnnotations[idx] = {
            ...updatedAnnotations[idx],
            points: updatedAnnotations[idx].points.map((p) => ({
              x: p.x + deltaX,
              y: p.y + deltaY,
            })),
          }
          setAnnotations(updatedAnnotations)
          
          // Update offset for next move
          dragOffsetRef.current = { x: imageX, y: imageY }
          
          // Force redraw for real-time drag
          drawRef.current?.()
        }
      } else if (drawingStateRef.current.isDrawing && tempAnnotationRef.current) {
        // Update preview for current annotation tool
        const updatedTemp = { ...tempAnnotationRef.current }
        const toolType = updatedTemp.type
        
        // Special handling for angle tool (needs 3 points)
        if (toolType === "angle") {
          if (updatedTemp.points.length === 1) {
            // First point set, preview second point
            updatedTemp.points.push({ x: imageX, y: imageY })
          } else if (updatedTemp.points.length === 2) {
            // Second point set, preview third point
            updatedTemp.points[1] = { x: imageX, y: imageY }
          } else if (updatedTemp.points.length === 3) {
            // Third point preview (after second click)
            updatedTemp.points[2] = { x: imageX, y: imageY }
          }
        }
        // Special handling for polygon (multiple points)
        else if (toolType === "polygon") {
          if (updatedTemp.points.length === 1) {
            updatedTemp.points.push({ x: imageX, y: imageY })
          } else {
            updatedTemp.points[updatedTemp.points.length - 1] = { x: imageX, y: imageY }
          }
        }
        // Default handling for other tools (2 points)
        else {
          if (updatedTemp.points.length === 1) {
            updatedTemp.points.push({ x: imageX, y: imageY })
          } else {
            updatedTemp.points[updatedTemp.points.length - 1] = { x: imageX, y: imageY }
          }
        }
        
        tempAnnotationRef.current = updatedTemp
        // Force redraw for real-time preview
        drawRef.current?.()
      } else if (tool === "pan" && drawingStateRef.current.isMouseDown) {
        const dx = canvasX - dragOffsetRef.current.x
        const dy = canvasY - dragOffsetRef.current.y
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
        dragOffsetRef.current = { x: canvasX, y: canvasY }
      }
      }
      
      // Execute immediately for drawing/resizing/dragging, or schedule with RAF
      if (needsImmediateUpdate) {
        updateOperations()
      } else {
        mouseMoveRafRef.current = requestAnimationFrame(updateOperations)
      }
    },
    [annotations, tool, zoom, pan, dpr, selectedAnnotationId],
  )

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      drawingStateRef.current.isMouseDown = false

      // Clean up resize state
      if (drawingStateRef.current.isResizing) {
        drawingStateRef.current.isResizing = false
        drawingStateRef.current.draggedAnnotationId = null
        drawingStateRef.current.draggedPointIndex = null
        return
      }

      // Clean up drag state
      if (drawingStateRef.current.isDragging) {
        drawingStateRef.current.isDragging = false
        drawingStateRef.current.draggedAnnotationId = null
        return
      }

      if (drawingStateRef.current.isDrawing && tempAnnotationRef.current) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const canvasX = e.clientX - rect.left
        const canvasY = e.clientY - rect.top

        // Convert canvas coordinates to image coordinates using stored bounds
        const bounds = imageBoundsRef.current
        const imageX = (canvasX - bounds.dx) / bounds.scale
        const imageY = (canvasY - bounds.dy) / bounds.scale

        let isComplete = false
        const t = tempAnnotationRef.current.type

        if (t === "polygon") {
          // Commit the current preview point and start a new preview point
          if (tempAnnotationRef.current.points.length === 1) {
            tempAnnotationRef.current.points.push({ x: imageX, y: imageY })
          } else {
            tempAnnotationRef.current.points[tempAnnotationRef.current.points.length - 1] = { x: imageX, y: imageY }
            tempAnnotationRef.current.points.push({ x: imageX, y: imageY })
          }
          isComplete = false
        } else if (t === "angle") {
          // Angle needs exactly 3 clicks
          if (tempAnnotationRef.current.points.length === 1) {
            // First click done, add second point
            tempAnnotationRef.current.points.push({ x: imageX, y: imageY })
            isComplete = false
          } else if (tempAnnotationRef.current.points.length === 2) {
            // Second click done, update it and add third point for preview
            tempAnnotationRef.current.points[1] = { x: imageX, y: imageY }
            tempAnnotationRef.current.points.push({ x: imageX, y: imageY })
            isComplete = false
          } else if (tempAnnotationRef.current.points.length === 3) {
            // Third click done, finalize
            tempAnnotationRef.current.points[2] = { x: imageX, y: imageY }
            isComplete = true
          } else {
            isComplete = true
          }
        } else if (t === "text") {
          const label = window.prompt("Enter label text")
          if (label && label.trim()) {
            tempAnnotationRef.current.label = label.trim()
            isComplete = true
          } else {
            // Cancel text annotation if no label
            tempAnnotationRef.current = null
            drawingStateRef.current.isDrawing = false
            return
          }
        } else {
          // line/length/arrow/rect/circle/calibration: commit second point and finish
          if (tempAnnotationRef.current.points.length === 1) {
            tempAnnotationRef.current.points.push({ x: imageX, y: imageY })
          } else {
            tempAnnotationRef.current.points[tempAnnotationRef.current.points.length - 1] = { x: imageX, y: imageY }
          }
          isComplete = true
        }

        if (isComplete && tempAnnotationRef.current) {
          setAnnotations((prev) => [...prev, tempAnnotationRef.current])
          tempAnnotationRef.current = null
          drawingStateRef.current.isDrawing = false
        }
      }
    },
    [dpr, zoom, pan, selectedAnnotationId],
  )

  const handleCanvasKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!drawingStateRef.current.isDrawing || !tempAnnotationRef.current) return
      const t = tempAnnotationRef.current.type
      if (t !== "polygon" && t !== "angle") return

      if (e.key === "Enter") {
        // Finalize polygon/angle
        if (t === "polygon") {
          // Remove trailing preview point if present
          if (tempAnnotationRef.current.points.length >= 3) {
            tempAnnotationRef.current.points.pop()
          }
        }
        setAnnotations((prev) => [...prev, tempAnnotationRef.current])
        tempAnnotationRef.current = null
        drawingStateRef.current.isDrawing = false
        e.preventDefault()
      } else if (e.key === "Escape") {
        // Cancel drawing
        tempAnnotationRef.current = null
        drawingStateRef.current.isDrawing = false
        e.preventDefault()
      }
    },
    [],
  )

  // Single useEffect for all drawing - with RAF throttling
  useEffect(() => {
    let rafId: number | null = null
    
    const scheduleDraw = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        drawRef.current?.()
        rafId = null
      })
    }
    
    // Initial draw
    scheduleDraw()
    
    // Handle window resize
    const handleResize = () => {
      scheduleDraw()
    }
    
    window.addEventListener("resize", handleResize)
    
    return () => {
      window.removeEventListener("resize", handleResize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [
    currentFrame,
    zoom,
    pan,
    brightness,
    contrast,
    showOverlay,
    showGrid,
    annotations,
    selectedAnnotationId,
  ])

  // Capture current canvas as PNG and save via screenshotService
  const handleCapture = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = screenshotService.captureCanvas(canvas, {
      includeAIOverlay: true,
    })
    const safe = (s?: string) => (s ? s.replace(/[^a-zA-Z0-9_-]/g, "") : "series")
    const fileName = `capture_${safe(studyInstanceUID)}_${safe(seriesInstanceUID)}_${currentFrame + 1}.png`
    await screenshotService.saveCapturedImage(dataUrl, `Key image ${currentFrame + 1}`, {
      studyUID: studyInstanceUID,
      seriesUID: seriesInstanceUID,
      instanceUID: seriesInstanceUID,
      frameIndex: currentFrame + 1,
      windowLevel: { width: 256, center: 128 },
      zoom,
      hasAIOverlay: false,
      hasAnnotations: annotations.length > 0,
    })
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = fileName
    a.click()
  }, [studyInstanceUID, seriesInstanceUID, currentFrame, zoom, brightness, contrast])

  return (
    <div ref={containerRef} className="w-full h-full flex bg-slate-900 relative">
      {showCapturedImages && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <CapturedImagesGallery open={true} onClose={() => setShowCapturedImages(false)} />
        </div>
      )}
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ cursor: cursorStyle }}
        className="flex-1"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onKeyDown={handleCanvasKeyDown}
        tabIndex={0}
      />

      <div className="absolute top-14 right-0 w-72 bg-slate-800 border-l border-slate-700 flex flex-col max-h-[calc(100vh-3.5rem)] overflow-hidden shadow-lg">
        {/* Toolbar - Fixed Section */}
        <div className="border-b border-slate-700 p-3 space-y-2 flex-shrink-0 overflow-y-auto max-h-96">
          {/* Navigation */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Frame</label>
            <input
              type="range"
              min="0"
              max={totalFrames - 1}
              value={currentFrame}
              onChange={(e) => setCurrentFrame(Number.parseInt(e.target.value))}
              className="w-full h-1 bg-slate-600 rounded cursor-pointer"
            />
            <div className="text-xs text-slate-400 text-center">
              {currentFrame + 1} / {totalFrames}
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">View Tools</label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: "pan", icon: Move, label: "Pan" },
                { id: "zoom", icon: ZoomIn, label: "Zoom" },
                { id: "wl", icon: Sun, label: "W/L" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTool(id as Tool)}
                  title={label}
                  className={`p-2 rounded transition ${
                    tool === id ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-slate-400">Zoom: {(zoom * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-600 rounded"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Brightness</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={brightness}
                onChange={(e) => setBrightness(Number.parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-600 rounded"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Contrast</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={contrast}
                onChange={(e) => setContrast(Number.parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-600 rounded"
              />
            </div>
          </div>

          {/* Calibration */}
          <div>
            <label className="text-xs font-semibold text-slate-400">Scale (mm/px)</label>
            <input
              type="number"
              value={mmPerPixel?.toFixed(3) || ""}
              onChange={(e) => setMmPerPixel(Number.parseFloat(e.target.value) || null)}
              placeholder="0.0"
              className="w-full px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500"
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              title="Toggle overlay"
              className={`p-2 rounded flex-1 transition ${
                showOverlay ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              <Eye size={16} className="mx-auto" />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle grid"
              className={`p-2 rounded flex-1 transition ${
                showGrid ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              <GridIcon size={16} className="mx-auto" />
            </button>
            <button
              className="p-2 rounded flex-1 transition bg-white/5 text-white/80 hover:bg-white/10"
              onClick={handleCapture}
              title="Capture for Report"
            >
              <Camera className="w-4 h-4 mx-auto text-fuchsia-300" />
            </button>
            <button
              className="p-2 rounded flex-1 transition bg-white/5 text-white/80 hover:bg-white/10"
              onClick={() => setShowCapturedImages(true)}
              title="Open Captured Images"
            >
              <Layers className="w-4 h-4 mx-auto text-fuchsia-300" />
            </button>
          </div>

          {/* Annotation Tools */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Annotations</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "length", icon: Ruler },
                { id: "angle", icon: Compass },
                { id: "line", icon: Minus },
                { id: "arrow", icon: ArrowRight },
                { id: "rect", icon: Square },
                { id: "circle", icon: CircleIcon },
                { id: "polygon", icon: Layers },
                { id: "text", icon: TypeIcon },
                { id: "calibration", icon: Gauge },
              ].map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setTool(id as Tool)
                    tempAnnotationRef.current = null
                    setSelectedAnnotationId(null)
                  }}
                  className={`p-2 rounded transition ${
                    tool === id ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <Icon size={16} className="mx-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Annotations List - Scrollable */}
        <div className="flex-1 overflow-y-auto border-t border-slate-700 p-3 space-y-2">
          <label className="text-xs font-semibold text-slate-400">Annotations ({annotations.length})</label>
          {annotations.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4">No annotations</div>
          ) : (
            annotations.filter(ann => ann && ann.id).map((ann) => (
              <div
                key={ann.id}
                onClick={() => setSelectedAnnotationId(ann.id)}
                className={`p-2 rounded cursor-pointer transition text-xs ${
                  selectedAnnotationId === ann.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                <div className="font-semibold capitalize">{ann.type}</div>
                {ann.label && <div className="text-xs opacity-75">{ann.label}</div>}
                <div className="flex gap-1 mt-1">
                  <input
                    type="color"
                    value={ann.color || "#00e5ff"}
                    onChange={(e) => {
                      const updated = annotations.map((a) => (a.id === ann.id ? { ...a, color: e.target.value } : a))
                      setAnnotations(updated)
                    }}
                    className="w-6 h-6 rounded cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setAnnotations((prev) => prev.filter((a) => a && a.id && a.id !== ann.id))
                      setSelectedAnnotationId(null)
                    }}
                    className="ml-auto p-1 hover:bg-slate-600 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}





const MPRViewerOptimized: React.FC<CombinedDicomViewerProps> = ({
  studyInstanceUID,
  seriesInstanceUID,
  sopInstanceUIDs = [],
  dicomWebBaseUrl = "/api/dicom",
}) => {
  const mprCanvasesRef = useRef<{
    axial: HTMLCanvasElement | null
    sagittal: HTMLCanvasElement | null
    coronal: HTMLCanvasElement | null
  }>({
    axial: null,
    sagittal: null,
    coronal: null,
  })

  const frameCacheRef = useRef<Map<number, ImageBitmap>>(new Map())
  const [frames, setFrames] = useState({ axial: 0, sagittal: 0, coronal: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [tool, setTool] = useState<Tool>("pan") // Added tool state
  const totalFrames = sopInstanceUIDs.length || 1

  // State for drawing annotations on MPR
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const drawingStateRef = useRef({ 
    isDrawing: false, 
    isDragging: false,
    startX: 0, 
    startY: 0,
    dragStartX: 0,
    dragStartY: 0,
    dragAnnotationId: null as string | null,
  })
  const tempAnnotationRef = useRef<Annotation | null>(null)

  // Load frame with caching
  const loadFrame = useCallback(
    async (frameIndex: number) => {
      if (frameCacheRef.current.has(frameIndex)) {
        return frameCacheRef.current.get(frameIndex)
      }

      // Use a more robust URL construction, falling back if seriesInstanceUID is not provided
      const frameUrl = seriesInstanceUID
        ? `${dicomWebBaseUrl}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/frames/${frameIndex}`
        : `${dicomWebBaseUrl}/studies/${studyInstanceUID}/frames/${frameIndex}`

      try {
        // Add a timeout to the fetch request
        const response = await fetch(frameUrl, { signal: AbortSignal.timeout(10000) })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const blob = await response.blob()
        const bitmap = await createImageBitmap(blob)
        frameCacheRef.current.set(frameIndex, bitmap)
        return bitmap
      } catch (err) {
        console.error("[v0] Frame load error:", err)
        return null
      }
    },
    [dicomWebBaseUrl, studyInstanceUID, seriesInstanceUID],
  )

  // Draw MPR view
  const drawMPRView = useCallback(
    async (canvas: HTMLCanvasElement | null, frameIndex: number, applyTransform: boolean) => {
      if (!canvas) return

      const bitmap = await loadFrame(frameIndex)
      if (!bitmap) return

      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(bitmap.width * dpr)
      canvas.height = Math.floor(bitmap.height * dpr)
      ctx.scale(dpr, dpr)

      // Apply brightness and contrast
      ctx.filter = `brightness(${brightness}) contrast(${contrast})`
      ctx.imageSmoothingEnabled = true

      // Apply transform if needed (rotation and zoom)
      const canvasWidth = bitmap.width
      const canvasHeight = bitmap.height
      const viewWidth = canvas.width / dpr
      const viewHeight = canvas.height / dpr

      ctx.save()
      ctx.translate(viewWidth / 2, viewHeight / 2) // Move origin to center

      if (applyTransform) {
        ctx.rotate((Math.PI / 180) * 90) // Rotate 90 degrees
      }

      const scaledWidth = canvasWidth * zoom
      const scaledHeight = canvasHeight * zoom
      ctx.drawImage(bitmap, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)

      ctx.restore()
      ctx.filter = "none"

      // Draw crosshairs (centered on the transformed canvas)
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(viewWidth / 2, viewHeight / 2 - 10)
      ctx.lineTo(viewWidth / 2, viewHeight / 2 + 10)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(viewWidth / 2 - 10, viewHeight / 2)
      ctx.lineTo(viewWidth / 2 + 10, viewHeight / 2)
      ctx.stroke()

      // Draw frame number
      ctx.fillStyle = "#fff"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(`Frame: ${frameIndex + 1}/${totalFrames}`, viewWidth / 2, 20)

      // Draw annotations
      const toView = (p: Point) => {
        let transformedX = p.x
        let transformedY = p.y

        ctx.save()
        ctx.translate(viewWidth / 2, viewHeight / 2)
        if (applyTransform) {
          ctx.rotate((Math.PI / 180) * 90)
        }
        const scaledW = canvasWidth * zoom
        const scaledH = canvasHeight * zoom
        transformedX = (transformedX - canvasWidth / 2) * (scaledW / canvasWidth)
        transformedY = (transformedY - canvasHeight / 2) * (scaledH / canvasHeight)
        ctx.restore()

        return {
          x: viewWidth / 2 + transformedX,
          y: viewHeight / 2 + transformedY,
        }
      }

      const validAnnotations = cleanAnnotations(annotations)
      for (const ann of validAnnotations) {
        drawAnnotation(ctx, ann, toView, selectedAnnotationId === ann.id, null) // mmPerPixel is not used in MPR here
      }

      // Preview points for current annotation tool
      if (tempAnnotationRef.current) {
        drawPreview(ctx, tempAnnotationRef.current.points, tempAnnotationRef.current.type, toView)
      }
    },
    [brightness, contrast, loadFrame, zoom, totalFrames, annotations, selectedAnnotationId],
  )

  // Update all views
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1
    const drawAll = async () => {
      const axialCanvas = mprCanvasesRef.current.axial
      const sagittalCanvas = mprCanvasesRef.current.sagittal
      const coronalCanvas = mprCanvasesRef.current.coronal

      // Resize canvases to fit their containers
      const resizeCanvas = (canvas: HTMLCanvasElement | null) => {
        if (canvas) {
          const rect = canvas.parentElement?.getBoundingClientRect()
          if (rect) {
            canvas.width = Math.floor(rect.width * dpr)
            canvas.height = Math.floor(rect.height * dpr)
          }
        }
      }
      resizeCanvas(axialCanvas)
      resizeCanvas(sagittalCanvas)
      resizeCanvas(coronalCanvas)

      await drawMPRView(axialCanvas, frames.axial, false)
      await drawMPRView(sagittalCanvas, frames.sagittal, true) // Apply transform for sagittal
      await drawMPRView(coronalCanvas, frames.coronal, true) // Apply transform for coronal
    }
    drawAll()
  }, [frames, drawMPRView, zoom, brightness, contrast, annotations, selectedAnnotationId]) // Added dependencies

  // Helper to get image coordinates from canvas coordinates, considering zoom and transform
  const getImageCoords = useCallback(
    (canvas: HTMLCanvasElement, e: React.MouseEvent, applyTransform: boolean, currentPan: Point, currentZoom: number) => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      // Get mouse position in canvas pixels
      const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr
      const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr

      // Get canvas center
      const centerX = canvas.width / dpr / 2
      const centerY = canvas.height / dpr / 2

      // Transform to image coordinates accounting for pan and zoom
      const imageX = (canvasX - centerX - currentPan.x) / currentZoom + centerX
      const imageY = (canvasY - centerY - currentPan.y) / currentZoom + centerY



      return { x: imageX, y: imageY }
    },
    [],
  )

  // Helper to check if point is near annotation
  const findAnnotationAtPoint = useCallback(
    (x: number, y: number, threshold: number = 10) => {
      const validAnnotations = cleanAnnotations(annotations)
      for (const ann of validAnnotations) {
        for (const point of ann.points) {
          const dx = point.x - x
          const dy = point.y - y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < threshold / zoom) {
            return ann
          }
        }
      }
      return null
    },
    [annotations, zoom],
  )

  const handleCanvasMouseDown = useCallback(
    (canvas: HTMLCanvasElement | null, e: React.MouseEvent<HTMLCanvasElement>, applyTransform: boolean) => {
      if (!canvas) return

      const { x, y } = getImageCoords(canvas, e, applyTransform, pan, zoom)

      // Check if clicking on existing annotation (for selection/dragging)
      const clickedAnnotation = findAnnotationAtPoint(x, y)
      if (clickedAnnotation) {
        setSelectedAnnotationId(clickedAnnotation.id)
        drawingStateRef.current.isDragging = true
        drawingStateRef.current.dragStartX = x
        drawingStateRef.current.dragStartY = y
        drawingStateRef.current.dragAnnotationId = clickedAnnotation.id
        return
      }

      // Tool state is now available in this scope
      if (!["length", "angle", "rect", "circle", "text", "line", "arrow", "polygon", "calibration"].includes(tool))
        return

      if (!drawingStateRef.current.isDrawing) {
        drawingStateRef.current.isDrawing = true
        drawingStateRef.current.startX = x
        drawingStateRef.current.startY = y
        tempAnnotationRef.current = {
          id: Math.random().toString(36).slice(2),
          type: tool as AnnotationType,
          points: [{ x, y }],
          color: "#00e5ff", // Default color
          thickness: 1.5,
          fontSize: 12,
        }
      } else if (tool === "polygon") {
        tempAnnotationRef.current?.points.push({ x, y })
      } else if (tool === "angle" && tempAnnotationRef.current && tempAnnotationRef.current.points.length < 3) {
        tempAnnotationRef.current.points.push({ x, y })
      }
    },
    [tool, getImageCoords, drawingStateRef, tempAnnotationRef, findAnnotationAtPoint, setSelectedAnnotationId, pan, zoom],
  )

  const handleCanvasMouseMove = useCallback(
    (canvas: HTMLCanvasElement | null, e: React.MouseEvent<HTMLCanvasElement>, applyTransform: boolean) => {
      if (!canvas) return

      const { x, y } = getImageCoords(canvas, e, applyTransform, pan, zoom)

      // Handle dragging existing annotation
      if (drawingStateRef.current.isDragging && drawingStateRef.current.dragAnnotationId) {
        const dx = x - (drawingStateRef.current.dragStartX || 0)
        const dy = y - (drawingStateRef.current.dragStartY || 0)

        setAnnotations((prev) =>
          prev.map((ann) => {
            if (ann.id === drawingStateRef.current.dragAnnotationId) {
              return {
                ...ann,
                points: ann.points.map((p) => ({
                  x: p.x + dx,
                  y: p.y + dy,
                })),
              }
            }
            return ann
          }),
        )

        drawingStateRef.current.dragStartX = x
        drawingStateRef.current.dragStartY = y
        return
      }

      // Handle drawing new annotation
      if (!drawingStateRef.current.isDrawing || !tempAnnotationRef.current) return

      if (tool !== "polygon" && tool !== "angle") {
        // For tools that only need two points or one for text
        if (tempAnnotationRef.current.points.length === 1) {
          tempAnnotationRef.current.points.push({ x, y })
        } else if (tempAnnotationRef.current.points.length > 1) {
          tempAnnotationRef.current.points[tempAnnotationRef.current.points.length - 1] = { x, y }
        }
      } else if (tool === "angle" && tempAnnotationRef.current.points.length >= 2) {
        // For angle, update the last point which is the vertex
        tempAnnotationRef.current.points[tempAnnotationRef.current.points.length - 1] = { x, y }
      } else if (tool === "polygon") {
        // Polygon drawing is handled by adding points on mousedown
        // We might want to show a preview line from the last point to the cursor
      }
    },
    [tool, getImageCoords, drawingStateRef, tempAnnotationRef, setAnnotations, pan, zoom],
  )

  const handleCanvasMouseUp = useCallback(
    (canvas: HTMLCanvasElement | null, e: React.MouseEvent<HTMLCanvasElement>, applyTransform: boolean) => {
      if (!canvas) return

      // Stop dragging
      if (drawingStateRef.current.isDragging) {
        drawingStateRef.current.isDragging = false
        drawingStateRef.current.dragAnnotationId = null
        return
      }

      if (!drawingStateRef.current.isDrawing || !tempAnnotationRef.current) return

      const { x, y } = getImageCoords(canvas, e, applyTransform, pan, zoom)

      // For line, arrow, rect, circle, length, calibration, angle, text: finalize the annotation
      let isComplete = false
      switch (tempAnnotationRef.current.type) {
        case "length":
        case "line":
        case "arrow":
        case "calibration":
          isComplete = tempAnnotationRef.current.points.length >= 2
          break
        case "rect":
        case "circle":
          isComplete = tempAnnotationRef.current.points.length >= 2
          break
        case "angle":
          isComplete = tempAnnotationRef.current.points.length >= 3
          break
        case "polygon":
          // Polygon completes on Enter key or right-click (not implemented here)
          // If mouse up is not on a point, it might be to finalize the polygon.
          // For simplicity, we assume polygon is finalized by Enter.
          break
        case "text":
          isComplete = tempAnnotationRef.current.points.length >= 1
          break
      }

      if (isComplete) {
        setAnnotations((prev) => [...prev, tempAnnotationRef.current!])
        tempAnnotationRef.current = null
        drawingStateRef.current.isDrawing = false
      } else if (tempAnnotationRef.current.type === "angle" && tempAnnotationRef.current.points.length === 2) {
        // If we have 2 points for angle, we are expecting the third point
        // The mousemove already updated the last point.
      } else if (tempAnnotationRef.current.type === "polygon" && tempAnnotationRef.current.points.length >= 1) {
        // Polygon can have points added, but is finalized by Enter.
        // Here, we might want to check if the mouseup is close to the start point to close the polygon.
      } else if (tool === "text" && tempAnnotationRef.current.points.length === 1) {
        // Text annotation already handled in mousedown with prompt
        // Just finalize it here
        if (tempAnnotationRef.current.label) {
          setAnnotations((prev) => [...prev, tempAnnotationRef.current!])
        }
        tempAnnotationRef.current = null
        drawingStateRef.current.isDrawing = false
      }
    },
    [tool, getImageCoords, drawingStateRef, tempAnnotationRef, setAnnotations, selectedAnnotationId, pan, zoom],
  )

  const handleCanvasKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.key === "Enter") {
        if (tool === "polygon" && drawingStateRef.current.isDrawing && tempAnnotationRef.current) {
          setAnnotations((prev) => [...prev, tempAnnotationRef.current!])
          tempAnnotationRef.current = null
          drawingStateRef.current.isDrawing = false
        } else if (
          tool === "angle" &&
          drawingStateRef.current.isDrawing &&
          tempAnnotationRef.current &&
          tempAnnotationRef.current.points.length === 3
        ) {
          setAnnotations((prev) => [...prev, tempAnnotationRef.current!])
          tempAnnotationRef.current = null
          drawingStateRef.current.isDrawing = false
        }
      } else if (e.key === "Escape") {
        // Cancel drawing
        drawingStateRef.current.isDrawing = false
        tempAnnotationRef.current = null
        // Consider resetting tool to pan or zoom if drawing was cancelled
      }
    },
    [tool, drawingStateRef, tempAnnotationRef, setAnnotations],
  )

  return (
    <div className="w-full h-full flex flex-col gap-4 bg-slate-900 p-4">
      {/* MPR Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Axial View */}
        <div className="flex flex-col gap-2">
          <div className="h-full bg-black rounded border-2 border-blue-500 flex items-center justify-center overflow-hidden">
            <canvas
              ref={(el) => {
                if (el) mprCanvasesRef.current.axial = el
              }}
              style={{ maxWidth: "100%", maxHeight: "100%", cursor: "crosshair" }}
              onWheel={(e) => {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -1 : 1
                setFrames((prev) => ({
                  ...prev,
                  axial: Math.max(0, Math.min(totalFrames - 1, prev.axial + delta)),
                }))
              }}
              onMouseDown={(e) => handleCanvasMouseDown(mprCanvasesRef.current.axial, e, false)}
              onMouseMove={(e) => handleCanvasMouseMove(mprCanvasesRef.current.axial, e, false)}
              onMouseUp={(e) => handleCanvasMouseUp(mprCanvasesRef.current.axial, e, false)}
              onKeyDown={(e) => handleCanvasKeyDown(e)}
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded">
            <span className="text-xs text-slate-300">Axial:</span>
            <input
              type="range"
              min="0"
              max={totalFrames - 1}
              value={frames.axial}
              onChange={(e) => setFrames((prev) => ({ ...prev, axial: Number.parseInt(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-xs text-slate-300">{frames.axial + 1}</span>
          </div>
        </div>

        {/* Sagittal View */}
        <div className="flex flex-col gap-2">
          <div className="h-full bg-black rounded border-2 border-green-500 flex items-center justify-center overflow-hidden">
            <canvas
              ref={(el) => {
                if (el) mprCanvasesRef.current.sagittal = el
              }}
              style={{ maxWidth: "100%", maxHeight: "100%", cursor: "crosshair" }}
              onWheel={(e) => {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -1 : 1
                setFrames((prev) => ({
                  ...prev,
                  sagittal: Math.max(0, Math.min(totalFrames - 1, prev.sagittal + delta)),
                }))
              }}
              onMouseDown={(e) => handleCanvasMouseDown(mprCanvasesRef.current.sagittal, e, true)}
              onMouseMove={(e) => handleCanvasMouseMove(mprCanvasesRef.current.sagittal, e, true)}
              onMouseUp={(e) => handleCanvasMouseUp(mprCanvasesRef.current.sagittal, e, true)}
              onKeyDown={(e) => handleCanvasKeyDown(e)}
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded">
            <span className="text-xs text-slate-300">Sagittal:</span>
            <input
              type="range"
              min="0"
              max={totalFrames - 1}
              value={frames.sagittal}
              onChange={(e) => setFrames((prev) => ({ ...prev, sagittal: Number.parseInt(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-xs text-slate-300">{frames.sagittal + 1}</span>
          </div>
        </div>

        {/* Coronal View */}
        <div className="flex flex-col gap-2">
          <div className="h-full bg-black rounded border-2 border-yellow-500 flex items-center justify-center overflow-hidden">
            <canvas
              ref={(el) => {
                if (el) mprCanvasesRef.current.coronal = el
              }}
              style={{ maxWidth: "100%", maxHeight: "100%", cursor: "crosshair" }}
              onWheel={(e) => {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -1 : 1
                setFrames((prev) => ({
                  ...prev,
                  coronal: Math.max(0, Math.min(totalFrames - 1, prev.coronal + delta)),
                }))
              }}
              onMouseDown={(e) => handleCanvasMouseDown(mprCanvasesRef.current.coronal, e, true)}
              onMouseMove={(e) => handleCanvasMouseMove(mprCanvasesRef.current.coronal, e, true)}
              onMouseUp={(e) => handleCanvasMouseUp(mprCanvasesRef.current.coronal, e, true)}
              onKeyDown={(e) => handleCanvasKeyDown(e)}
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded">
            <span className="text-xs text-slate-300">Coronal:</span>
            <input
              type="range"
              min="0"
              max={totalFrames - 1}
              value={frames.coronal}
              onChange={(e) => setFrames((prev) => ({ ...prev, coronal: Number.parseInt(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-xs text-slate-300">{frames.coronal + 1}</span>
          </div>
        </div>

        {/* 3D View Placeholder */}
        <div className="bg-black rounded border-2 border-purple-500 flex items-center justify-center">
          <div className="text-center">
            <Layers size={32} className="mx-auto mb-2 text-slate-500" />
            <p className="text-slate-400 text-sm">3D Volume Rendering</p>
            <p className="text-slate-500 text-xs mt-1">Coming soon with advanced optimization</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 bg-slate-800 p-3 rounded border border-slate-700 overflow-x-auto">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>Brightness:</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={brightness}
            onChange={(e) => setBrightness(Number.parseFloat(e.target.value))}
            className="w-24"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>Contrast:</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={contrast}
            onChange={(e) => setContrast(Number.parseFloat(e.target.value))}
            className="w-24"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>Zoom:</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
            className="w-24"
          />
        </label>
        <button
          onClick={() => {
            setFrames({ axial: 0, sagittal: 0, coronal: 0 })
            setBrightness(1)
            setContrast(1)
            setZoom(1)
          }}
          className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2"
        >
          <RotateCcw size={16} /> Reset
        </button>
      </div>
    </div>
  )
}
export default MedicalImageViewer
