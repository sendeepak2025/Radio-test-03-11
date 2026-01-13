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
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  Keyboard,
} from "lucide-react"
import { screenshotService } from "../../services/screenshotService"
import CapturedImagesGallery from "./CapturedImagesGallery"

// Debug mode - set to false for production
const DEBUG_MODE = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => DEBUG_MODE && console.log(...args)
const debugWarn = (...args: any[]) => DEBUG_MODE && console.warn(...args)

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

// Window/Level presets for different modalities
interface WLPreset {
  name: string
  windowWidth: number
  windowCenter: number
}

const CT_PRESETS: WLPreset[] = [
  { name: "Soft Tissue", windowWidth: 400, windowCenter: 40 },
  { name: "Lung", windowWidth: 1500, windowCenter: -600 },
  { name: "Bone", windowWidth: 2000, windowCenter: 300 },
  { name: "Brain", windowWidth: 80, windowCenter: 40 },
  { name: "Liver", windowWidth: 150, windowCenter: 30 },
  { name: "Abdomen", windowWidth: 350, windowCenter: 50 },
]

const MR_PRESETS: WLPreset[] = [
  { name: "Default", windowWidth: 400, windowCenter: 200 },
  { name: "T1", windowWidth: 500, windowCenter: 250 },
  { name: "T2", windowWidth: 300, windowCenter: 150 },
]

const XR_PRESETS: WLPreset[] = [
  { name: "Default", windowWidth: 2048, windowCenter: 1024 },
  { name: "Chest", windowWidth: 4096, windowCenter: 2048 },
  { name: "Bone", windowWidth: 2500, windowCenter: 1250 },
]

// Non-image DICOM modalities that cannot be displayed as images
const NON_IMAGE_MODALITIES = [
  'SR',   // Structured Report
  'KO',   // Key Object Selection
  'PR',   // Presentation State
  'DOC',  // Document
  'PLAN', // RT Plan
  'REG',  // Registration
  'FID',  // Fiducials
  'SEG',  // Segmentation (sometimes has images, but often not)
  'RWV',  // Real World Value Mapping
  'AU',   // Audio
  'ECG',  // Electrocardiography
  'HD',   // Hemodynamic
  'SMR',  // Stereometric Relationship
]

// Keyboard shortcuts configuration
const KEYBOARD_SHORTCUTS = {
  'r': 'Rotate 90°',
  'h': 'Flip Horizontal',
  'v': 'Flip Vertical',
  'i': 'Invert Colors',
  'g': 'Toggle Grid',
  'o': 'Toggle Overlay',
  '0': 'Reset View',
  '+': 'Zoom In',
  '-': 'Zoom Out',
  'ArrowLeft': 'Previous Frame',
  'ArrowRight': 'Next Frame',
  'Space': 'Play/Pause',
  'l': 'Toggle Loop Mode',
  'b': 'Reverse Direction',
  'z': 'Undo',
  'y': 'Redo',
  'Escape': 'Cancel Drawing',
}

// DICOM Metadata interface for proper medical imaging display
interface DicomMetadata {
  // Patient Information
  patientName?: string
  patientID?: string
  patientBirthDate?: string
  patientSex?: string
  patientAge?: string
  
  // Study Information
  studyDate?: string
  studyTime?: string
  studyDescription?: string
  accessionNumber?: string
  referringPhysicianName?: string
  institutionName?: string
  
  // Series Information
  seriesDate?: string
  seriesTime?: string
  seriesDescription?: string
  modality?: string
  bodyPartExamined?: string
  
  // Image Information
  instanceNumber?: number
  acquisitionDate?: string
  acquisitionTime?: string
  
  // Window/Level (critical for proper display)
  windowCenter?: number | number[]
  windowWidth?: number | number[]
  
  // Pixel Spacing for measurements
  pixelSpacing?: [number, number] // [row spacing, column spacing] in mm
  imagerPixelSpacing?: [number, number] // For projection radiography
  
  // Image dimensions
  rows?: number
  columns?: number
  bitsAllocated?: number
  bitsStored?: number
  
  // Acquisition parameters (CT/XR)
  kvp?: number // kVp for X-ray
  exposureTime?: number // ms
  xRayTubeCurrent?: number // mA
  exposure?: number // mAs
  sliceThickness?: number // mm
  
  // MR specific
  magneticFieldStrength?: number
  repetitionTime?: number // TR
  echoTime?: number // TE
  flipAngle?: number
}

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

interface SeriesInfo {
  seriesInstanceUID: string
  seriesNumber: number
  seriesDescription: string
  modality: string
  numberOfInstances: number
  totalFrames?: number
  numberOfImages?: number
  instances: InstanceInfo[]
}

interface InstanceInfo {
  sopInstanceUID: string
  instanceNumber: number
  orthancInstanceId?: string
}

interface CombinedDicomViewerProps {
  studyInstanceUID: string
  seriesInstanceUID?: string
  sopInstanceUIDs?: string[]
  dicomWebBaseUrl?: string
  // New series-aware props
  selectedSeriesUID?: string
  seriesData?: SeriesInfo[]
  onSeriesChange?: (seriesUID: string) => void
  // Auto-hide callback for parent components
  onCanvasActiveChange?: (isActive: boolean) => void
  isLoading?: boolean
  error?: string
  // DICOM metadata for proper display
  dicomMetadata?: DicomMetadata
  // External control callbacks
  onZoomIn?: () => void
  onZoomOut?: () => void
  onRotate?: () => void
  onResetView?: () => void
  onBrightnessChange?: (value: number) => void
  onContrastChange?: (value: number) => void
}

// Export viewer control interface for external use
export interface ViewerControlRef {
  zoomIn: () => void
  zoomOut: () => void
  rotate: () => void
  resetView: () => void
  setBrightness: (value: number) => void
  setContrast: (value: number) => void
  getState: () => { zoom: number; brightness: number; contrast: number; rotation: number }
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
  // Calculate grid spacing - use calibration if available, otherwise use fixed pixel spacing
  let gridSpacing: number
  if (mmPerPixel && mmPerPixel > 0) {
    // 10mm grid spacing when calibrated
    gridSpacing = (10 / mmPerPixel) * scale
  } else {
    // Default 50 pixel grid spacing when not calibrated
    gridSpacing = 50 * scale
  }
  
  // Don't draw if grid would be too dense
  if (gridSpacing < 10) return

  ctx.strokeStyle = "rgba(100, 150, 200, 0.3)"
  ctx.lineWidth = 0.5

  // Draw vertical lines
  for (let x = dx; x < dx + drawW; x += gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(x, dy)
    ctx.lineTo(x, dy + drawH)
    ctx.stroke()
  }

  // Draw horizontal lines
  for (let y = dy; y < dy + drawH; y += gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(dx, y)
    ctx.lineTo(dx + drawW, y)
    ctx.stroke()
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, info: any) {
  const vw = info.vw || 800
  const vh = info.vh || 600
  
  // ===== TOP-LEFT: Image/Frame Info =====
  const topLeftLines = [
    `Frame: ${info.frame}/${info.totalFrames}`,
    `Zoom: ${(info.zoom * 100).toFixed(0)}%`,
  ]
  
  if (info.seriesDescription) {
    topLeftLines.push(`Series: ${info.seriesDescription}`)
  }
  if (info.modality) {
    topLeftLines.push(`Modality: ${info.modality}`)
  }
  if (info.windowCenter !== null && info.windowWidth !== null) {
    topLeftLines.push(`W/L: ${info.windowWidth?.toFixed(0) || '-'} / ${info.windowCenter?.toFixed(0) || '-'}`)
  }
  if (info.mmPerPixel) {
    topLeftLines.push(`Scale: ${info.mmPerPixel.toFixed(3)} mm/px`)
  }

  // ===== TOP-RIGHT: Patient Info (if available) =====
  const topRightLines: string[] = []
  if (info.dicomMetadata) {
    const meta = info.dicomMetadata
    if (meta.patientName) topRightLines.push(meta.patientName)
    if (meta.patientID) topRightLines.push(`ID: ${meta.patientID}`)
    if (meta.patientSex || meta.patientAge) {
      topRightLines.push(`${meta.patientSex || ''} ${meta.patientAge || ''}`.trim())
    }
    if (meta.studyDate) {
      // Format date if in DICOM format (YYYYMMDD)
      const dateStr = meta.studyDate.length === 8 
        ? `${meta.studyDate.slice(0,4)}-${meta.studyDate.slice(4,6)}-${meta.studyDate.slice(6,8)}`
        : meta.studyDate
      topRightLines.push(`Study: ${dateStr}`)
    }
    if (meta.institutionName) topRightLines.push(meta.institutionName)
  }

  // ===== BOTTOM-LEFT: Acquisition Info (if available) =====
  const bottomLeftLines: string[] = []
  if (info.dicomMetadata) {
    const meta = info.dicomMetadata
    // CT/XR specific
    if (meta.kvp) bottomLeftLines.push(`${meta.kvp} kVp`)
    if (meta.exposure) bottomLeftLines.push(`${meta.exposure} mAs`)
    if (meta.sliceThickness) bottomLeftLines.push(`Slice: ${meta.sliceThickness} mm`)
    // MR specific
    if (meta.magneticFieldStrength) bottomLeftLines.push(`${meta.magneticFieldStrength}T`)
    if (meta.repetitionTime) bottomLeftLines.push(`TR: ${meta.repetitionTime} ms`)
    if (meta.echoTime) bottomLeftLines.push(`TE: ${meta.echoTime} ms`)
  }

  // Draw settings
  ctx.font = "11px monospace"
  const lineHeight = 14
  const padding = 8

  // Helper to draw text block
  const drawTextBlock = (lines: string[], x: number, y: number, alignRight = false) => {
    if (lines.length === 0) return
    
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
    const bgWidth = maxWidth + padding * 2
    const bgHeight = lines.length * lineHeight + padding * 2
    
    const drawX = alignRight ? x - bgWidth : x
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
    ctx.beginPath()
    ctx.roundRect(drawX, y, bgWidth, bgHeight, 4)
    ctx.fill()
    
    // Text
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
    let textY = y + padding + 10
    for (const line of lines) {
      const textX = alignRight ? drawX + padding : drawX + padding
      ctx.fillText(line, textX, textY)
      textY += lineHeight
    }
  }

  // Draw all overlays
  drawTextBlock(topLeftLines, 5, 5)
  if (topRightLines.length > 0) {
    drawTextBlock(topRightLines, vw - 5, 5, true)
  }
  if (bottomLeftLines.length > 0) {
    const blockHeight = bottomLeftLines.length * lineHeight + padding * 2
    drawTextBlock(bottomLeftLines, 5, vh - blockHeight - 5)
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

    case "calibration":
      if (points.length >= 2) {
        // Draw calibration line with special styling
        ctx.strokeStyle = "#ff9800" // Orange for calibration
        ctx.lineWidth = 3
        ctx.setLineDash([5, 5])
        
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        ctx.lineTo(points[1].x, points[1].y)
        ctx.stroke()
        
        ctx.setLineDash([])
        
        // Draw end markers (perpendicular lines)
        const dx = points[1].x - points[0].x
        const dy = points[1].y - points[0].y
        const len = Math.sqrt(dx * dx + dy * dy)
        const perpX = (-dy / len) * 10
        const perpY = (dx / len) * 10
        
        ctx.beginPath()
        ctx.moveTo(points[0].x + perpX, points[0].y + perpY)
        ctx.lineTo(points[0].x - perpX, points[0].y - perpY)
        ctx.moveTo(points[1].x + perpX, points[1].y + perpY)
        ctx.lineTo(points[1].x - perpX, points[1].y - perpY)
        ctx.stroke()
        
        // Draw handles
        ctx.fillStyle = "#ff9800"
        ctx.fillRect(points[0].x - 4, points[0].y - 4, 8, 8)
        ctx.fillRect(points[1].x - 4, points[1].y - 4, 8, 8)
        
        // Draw calibration label
        if (ann.label) {
          const midX = (points[0].x + points[1].x) / 2
          const midY = (points[0].y + points[1].y) / 2
          ctx.font = 'bold 14px Arial'
          const metrics = ctx.measureText(ann.label)
          ctx.fillStyle = 'rgba(255, 152, 0, 0.8)'
          ctx.fillRect(midX - metrics.width/2 - 4, midY - 20, metrics.width + 8, 24)
          ctx.fillStyle = '#000'
          ctx.fillText(ann.label, midX - metrics.width/2, midY - 2)
        }
        
        // Draw type label
        ctx.fillStyle = "#ff9800"
        drawTypeLabel(points[0].x + 5, points[0].y - 5)
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
    if (viewPoints.length >= 1) {
      // Draw first line (from point 0 to point 1 or cursor)
      if (viewPoints.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(viewPoints[0].x, viewPoints[0].y)
        ctx.lineTo(viewPoints[1].x, viewPoints[1].y)
        ctx.stroke()
      }
      
      if (viewPoints.length >= 3) {
        // Draw second line (from point 1 to point 2)
        ctx.beginPath()
        ctx.moveTo(viewPoints[1].x, viewPoints[1].y)
        ctx.lineTo(viewPoints[2].x, viewPoints[2].y)
        ctx.stroke()
        
        // Calculate and show angle
        const v1 = { x: viewPoints[0].x - viewPoints[1].x, y: viewPoints[0].y - viewPoints[1].y }
        const v2 = { x: viewPoints[2].x - viewPoints[1].x, y: viewPoints[2].y - viewPoints[1].y }
        const dotProduct = v1.x * v2.x + v1.y * v2.y
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
        
        if (mag1 > 0 && mag2 > 0) {
          const cosAngle = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)))
          const angle = Math.acos(cosAngle)
          const angleDeg = (angle * (180 / Math.PI)).toFixed(1)
          
          drawLiveMeasurement(`${angleDeg}°`, viewPoints[1].x + 15, viewPoints[1].y - 10)
        }
      } else if (viewPoints.length === 2) {
        // Show instruction for next click
        ctx.setLineDash([])
        ctx.font = 'bold 12px Arial'
        ctx.fillStyle = 'rgba(0, 255, 255, 0.9)'
        ctx.fillText('Click for vertex point', viewPoints[1].x + 10, viewPoints[1].y - 10)
      }
      
      // Draw handles
      ctx.setLineDash([])
      ctx.fillStyle = "rgba(255, 255, 0, 0.9)"
      viewPoints.forEach((p, i) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fill()
        
        // Label the points
        ctx.font = 'bold 10px Arial'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillText(`${i + 1}`, p.x + 8, p.y - 8)
      })
    }
  } else if (type === "calibration") {
    if (viewPoints.length >= 2) {
      // Draw calibration line with orange color
      ctx.strokeStyle = "rgba(255, 152, 0, 0.9)"
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      
      ctx.beginPath()
      ctx.moveTo(viewPoints[0].x, viewPoints[0].y)
      ctx.lineTo(viewPoints[1].x, viewPoints[1].y)
      ctx.stroke()
      
      // Draw end markers
      ctx.setLineDash([])
      const dx = viewPoints[1].x - viewPoints[0].x
      const dy = viewPoints[1].y - viewPoints[0].y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        const perpX = (-dy / len) * 10
        const perpY = (dx / len) * 10
        
        ctx.beginPath()
        ctx.moveTo(viewPoints[0].x + perpX, viewPoints[0].y + perpY)
        ctx.lineTo(viewPoints[0].x - perpX, viewPoints[0].y - perpY)
        ctx.moveTo(viewPoints[1].x + perpX, viewPoints[1].y + perpY)
        ctx.lineTo(viewPoints[1].x - perpX, viewPoints[1].y - perpY)
        ctx.stroke()
      }
      
      // Draw handles
      ctx.fillStyle = "rgba(255, 152, 0, 0.9)"
      viewPoints.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fill()
      })
      
      // Show pixel distance
      const distPixels = len
      const midX = (viewPoints[0].x + viewPoints[1].x) / 2
      const midY = (viewPoints[0].y + viewPoints[1].y) / 2
      drawLiveMeasurement(`${distPixels.toFixed(1)}px (calibration)`, midX + 10, midY - 10)
    }
  }
}

// ======================== MAIN COMPONENT ========================
export const MedicalImageViewer: React.FC<CombinedDicomViewerProps> = (props) => {
  // Directly render 2D viewer without extra wrapper - cleaner and fills space properly
  return <TwoDViewer {...props} />
}

// ======================== 2D VIEWER ========================
const TwoDViewer: React.FC<CombinedDicomViewerProps> = ({
  studyInstanceUID,
  seriesInstanceUID,
  sopInstanceUIDs = [],
  dicomWebBaseUrl = "/api/dicom",
  selectedSeriesUID,
  seriesData = [],
  onSeriesChange,
  onCanvasActiveChange,
  isLoading = false,
  error,
  dicomMetadata,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameCacheRef = useRef<Map<string, ImageBitmap>>(new Map())
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
  const [rotation, setRotation] = useState(0) // Rotation in degrees (0, 90, 180, 270)
  const [flipH, setFlipH] = useState(false) // Horizontal flip
  const [flipV, setFlipV] = useState(false) // Vertical flip
  const [invert, setInvert] = useState(false) // Invert colors (negative)
  const [showOverlay, setShowOverlay] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [mmPerPixel, setMmPerPixel] = useState<number | null>(null)
  const [showCapturedImages, setShowCapturedImages] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false) // Keyboard shortcuts modal
  
  // Window/Level state (for proper DICOM display)
  const [windowCenter, setWindowCenter] = useState<number | null>(null)
  const [windowWidth, setWindowWidth] = useState<number | null>(null)
  const [activeWLPreset, setActiveWLPreset] = useState<string | null>(null)
  
  // Structured Report viewer state
  const [showSRViewer, setShowSRViewer] = useState(false)
  const [srContent, setSRContent] = useState<string | null>(null)
  const [srLoading, setSRLoading] = useState(false)

  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')
  const [showMobileTools, setShowMobileTools] = useState(false)
  const [toolsPanelCollapsed, setToolsPanelCollapsed] = useState(true) // Hidden by default
  
  // Undo/Redo history for annotations
  const [annotationHistory, setAnnotationHistory] = useState<Annotation[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  
  // Auto-hide panels when working on canvas
  const [panelsAutoHidden, setPanelsAutoHidden] = useState(false)
  const [isCanvasActive, setIsCanvasActive] = useState(false)
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Capture modal state
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null)
  const [captureNote, setCaptureNote] = useState("")
  
  // Playback state for frame navigation
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(5) // frames per second
  const [loopMode, setLoopMode] = useState<'loop' | 'once' | 'bounce'>('loop') // Cine loop mode
  const [playDirection, setPlayDirection] = useState<1 | -1>(1) // 1 = forward, -1 = reverse
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Loading state for frame fetching
  const [isFrameLoading, setIsFrameLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 })
  
  // Initial preloading state - wait for first frame before showing viewer
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 })

  // Series-aware state management
  const currentSeriesUID = selectedSeriesUID || seriesInstanceUID
  const currentSeriesData = seriesData.find(s => s.seriesInstanceUID === currentSeriesUID) || 
    (seriesData.length > 0 ? seriesData[0] : null)
  
  // Calculate total frames based on current series
  // Use totalFrames for multi-frame DICOM, fallback to numberOfInstances
  const totalFrames = currentSeriesData?.totalFrames || currentSeriesData?.numberOfImages || currentSeriesData?.numberOfInstances || sopInstanceUIDs.length || 1

  // Get W/L presets based on modality
  const currentModality = dicomMetadata?.modality || currentSeriesData?.modality || 'CT'
  const wlPresets = useMemo(() => {
    switch (currentModality?.toUpperCase()) {
      case 'CT': return CT_PRESETS
      case 'MR': return MR_PRESETS
      case 'CR':
      case 'DX':
      case 'XR': return XR_PRESETS
      default: return CT_PRESETS
    }
  }, [currentModality])

  // Annotation persistence key based on study/series
  const annotationStorageKey = useMemo(() => 
    `dicom-annotations-${studyInstanceUID}-${currentSeriesUID || 'default'}`,
    [studyInstanceUID, currentSeriesUID]
  )
  
  // Load annotations from localStorage on mount or series change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(annotationStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setAnnotations(parsed)
          setAnnotationHistory([parsed])
          setHistoryIndex(0)
          debugLog(`[Annotations] Loaded ${parsed.length} annotations from storage`)
        }
      }
    } catch (err) {
      debugWarn('[Annotations] Failed to load from localStorage:', err)
    }
  }, [annotationStorageKey])
  
  // Save annotations to localStorage when they change
  useEffect(() => {
    try {
      if (annotations.length > 0) {
        localStorage.setItem(annotationStorageKey, JSON.stringify(annotations))
        debugLog(`[Annotations] Saved ${annotations.length} annotations to storage`)
      } else {
        // Remove key if no annotations
        localStorage.removeItem(annotationStorageKey)
      }
    } catch (err) {
      debugWarn('[Annotations] Failed to save to localStorage:', err)
    }
  }, [annotations, annotationStorageKey])

  // Initialize from DICOM metadata when available
  useEffect(() => {
    if (dicomMetadata) {
      // Auto-set pixel spacing from DICOM
      if (dicomMetadata.pixelSpacing && dicomMetadata.pixelSpacing.length >= 2) {
        // Use average of row and column spacing
        const avgSpacing = (dicomMetadata.pixelSpacing[0] + dicomMetadata.pixelSpacing[1]) / 2
        setMmPerPixel(avgSpacing)
        debugLog(`[DICOM] Auto-calibrated from PixelSpacing: ${avgSpacing.toFixed(4)} mm/px`)
      } else if (dicomMetadata.imagerPixelSpacing && dicomMetadata.imagerPixelSpacing.length >= 2) {
        const avgSpacing = (dicomMetadata.imagerPixelSpacing[0] + dicomMetadata.imagerPixelSpacing[1]) / 2
        setMmPerPixel(avgSpacing)
        debugLog(`[DICOM] Auto-calibrated from ImagerPixelSpacing: ${avgSpacing.toFixed(4)} mm/px`)
      }
      
      // Auto-set Window/Level from DICOM
      if (dicomMetadata.windowCenter !== undefined && dicomMetadata.windowWidth !== undefined) {
        const wc = Array.isArray(dicomMetadata.windowCenter) ? dicomMetadata.windowCenter[0] : dicomMetadata.windowCenter
        const ww = Array.isArray(dicomMetadata.windowWidth) ? dicomMetadata.windowWidth[0] : dicomMetadata.windowWidth
        setWindowCenter(wc)
        setWindowWidth(ww)
        debugLog(`[DICOM] Auto-set W/L from metadata: WC=${wc}, WW=${ww}`)
      }
    }
  }, [dicomMetadata])
  // ============ OPTIMIZED FRAME LOADING SYSTEM ============
  // Dynamic cache size based on available memory and study size
  const MAX_CACHE_SIZE = useMemo(() => {
    // Estimate: each frame ~2MB in memory (512x512 RGBA)
    // Default to 100 frames (~200MB), adjust based on study size
    const baseSize = 100
    if (totalFrames <= 50) return Math.min(totalFrames, 50) // Small study: cache all
    if (totalFrames <= 200) return 80 // Medium study
    return baseSize // Large study: use LRU
  }, [totalFrames])
  
  const cacheOrderRef = useRef<string[]>([]) // Track access order for LRU
  
  // Request deduplication - prevent duplicate fetches for same frame
  const pendingRequestsRef = useRef<Map<string, Promise<ImageBitmap | null>>>(new Map())
  
  // Prefetch controller to cancel on series change
  const prefetchControllerRef = useRef<AbortController | null>(null)
  
  // Concurrent request limiter - prevent overwhelming the server
  const MAX_CONCURRENT_REQUESTS = 4
  const activeRequestsRef = useRef<number>(0)
  const requestQueueRef = useRef<Array<() => void>>([])
  
  // Process queued requests when a slot opens
  const processQueue = useCallback(() => {
    while (requestQueueRef.current.length > 0 && activeRequestsRef.current < MAX_CONCURRENT_REQUESTS) {
      const nextRequest = requestQueueRef.current.shift()
      if (nextRequest) nextRequest()
    }
  }, [])

  // LRU cache management
  const addToCache = useCallback((key: string, bitmap: ImageBitmap) => {
    const cache = frameCacheRef.current
    const order = cacheOrderRef.current
    
    // Remove from current position if exists
    const existingIndex = order.indexOf(key)
    if (existingIndex > -1) {
      order.splice(existingIndex, 1)
    }
    
    // Add to end (most recently used)
    order.push(key)
    cache.set(key, bitmap)
    
    // Evict oldest if over limit
    while (order.length > MAX_CACHE_SIZE) {
      const oldestKey = order.shift()
      if (oldestKey) {
        const oldBitmap = cache.get(oldestKey)
        if (oldBitmap) oldBitmap.close() // Free memory
        cache.delete(oldestKey)
      }
    }
  }, [MAX_CACHE_SIZE])

  // Core frame fetcher with deduplication, retry, and concurrency control
  const fetchFrame = useCallback(
    async (frameIndex: number, signal?: AbortSignal, retryCount = 0, priority: 'high' | 'low' = 'high'): Promise<ImageBitmap | null> => {
      const cacheKey = `${currentSeriesUID}-${frameIndex}`
      const MAX_RETRIES = 2
      
      // Check cache first (instant return)
      if (frameCacheRef.current.has(cacheKey)) {
        // Update LRU order
        const order = cacheOrderRef.current
        const idx = order.indexOf(cacheKey)
        if (idx > -1) {
          order.splice(idx, 1)
          order.push(cacheKey)
        }
        return frameCacheRef.current.get(cacheKey)!
      }
      
      // Check if request already in flight (deduplication)
      if (pendingRequestsRef.current.has(cacheKey)) {
        return pendingRequestsRef.current.get(cacheKey)!
      }
      
      // Create new request with concurrency control
      const frameUrl = currentSeriesUID
        ? `${dicomWebBaseUrl}/studies/${studyInstanceUID}/series/${currentSeriesUID}/frames/${frameIndex}`
        : `${dicomWebBaseUrl}/studies/${studyInstanceUID}/frames/${frameIndex}`
      
      // Wait for available slot if at max concurrent requests
      const waitForSlot = (): Promise<void> => {
        return new Promise((resolve) => {
          if (activeRequestsRef.current < MAX_CONCURRENT_REQUESTS) {
            activeRequestsRef.current++
            resolve()
          } else {
            // Queue the request - high priority goes to front
            if (priority === 'high') {
              requestQueueRef.current.unshift(() => {
                activeRequestsRef.current++
                resolve()
              })
            } else {
              requestQueueRef.current.push(() => {
                activeRequestsRef.current++
                resolve()
              })
            }
          }
        })
      }
      
      const requestPromise = (async () => {
        await waitForSlot()
        
        try {
          const response = await fetch(frameUrl, { 
            signal: signal || AbortSignal.timeout(60000) // 60 second timeout (reduced from 90)
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          
          const blob = await response.blob()
          
          // Validate blob has content
          if (blob.size < 100) {
            debugWarn(`[Frame ${frameIndex}] Received empty or too small blob (${blob.size} bytes)`)
            throw new Error('Empty frame data')
          }
          
          const bitmap = await createImageBitmap(blob)
          
          // Validate bitmap dimensions
          if (bitmap.width < 10 || bitmap.height < 10) {
            debugWarn(`[Frame ${frameIndex}] Invalid bitmap dimensions: ${bitmap.width}x${bitmap.height}`)
            bitmap.close()
            throw new Error('Invalid frame dimensions')
          }
          
          // Add to LRU cache
          addToCache(cacheKey, bitmap)
          return bitmap
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return null
          }
          
          console.error(`[Frame ${frameIndex}] Load error (attempt ${retryCount + 1}):`, err.message)
          
          // Retry on failure (with reduced retries for faster failure)
          if (retryCount < MAX_RETRIES) {
            debugLog(`[Frame ${frameIndex}] Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
            pendingRequestsRef.current.delete(cacheKey)
            await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1))) // Faster retry
            return fetchFrame(frameIndex, signal, retryCount + 1, priority)
          }
          
          return null
        } finally {
          pendingRequestsRef.current.delete(cacheKey)
          activeRequestsRef.current--
          processQueue() // Process next queued request
        }
      })()
      
      pendingRequestsRef.current.set(cacheKey, requestPromise)
      return requestPromise
    },
    [dicomWebBaseUrl, studyInstanceUID, currentSeriesUID, addToCache, processQueue],
  )

  // Smart prefetching - load nearby frames in background with adaptive strategy
  const prefetchNearbyFrames = useCallback(
    (centerFrame: number, direction: 'forward' | 'backward' | 'both' = 'both') => {
      // Cancel previous prefetch
      if (prefetchControllerRef.current) {
        prefetchControllerRef.current.abort()
      }
      prefetchControllerRef.current = new AbortController()
      const signal = prefetchControllerRef.current.signal
      
      // Adaptive prefetch count based on study size and playback state
      const basePrefetch = isPlaying ? 15 : 8 // More prefetch during playback
      const prefetchCount = Math.min(basePrefetch, Math.max(5, Math.floor(totalFrames / 5)))
      
      // Build prefetch order based on direction
      const prefetchOrder: number[] = []
      if (direction === 'forward' || direction === 'both') {
        for (let i = 1; i <= prefetchCount; i++) prefetchOrder.push(i)
      }
      if (direction === 'backward' || direction === 'both') {
        for (let i = 1; i <= Math.floor(prefetchCount / 2); i++) prefetchOrder.push(-i)
      }
      
      // Sort by priority (forward frames first for playback)
      if (direction === 'both') {
        prefetchOrder.sort((a, b) => {
          if (a > 0 && b < 0) return -1 // Forward first
          if (a < 0 && b > 0) return 1
          return Math.abs(a) - Math.abs(b) // Then by distance
        })
      }
      
      let prefetched = 0
      for (const offset of prefetchOrder) {
        if (prefetched >= prefetchCount) break
        
        const targetFrame = centerFrame + offset
        if (targetFrame >= 0 && targetFrame < totalFrames) {
          const cacheKey = `${currentSeriesUID}-${targetFrame}`
          if (!frameCacheRef.current.has(cacheKey) && !pendingRequestsRef.current.has(cacheKey)) {
            // Low priority background fetch
            fetchFrame(targetFrame, signal, 0, 'low')
            prefetched++
          }
        }
      }
    },
    [currentSeriesUID, totalFrames, fetchFrame, isPlaying],
  )

  // Main frame loader - used by draw function
  const loadFrame = useCallback(
    async (frameIndex: number) => {
      const cacheKey = `${currentSeriesUID}-${frameIndex}`
      
      // Fast path: already cached
      if (frameCacheRef.current.has(cacheKey)) {
        // Trigger prefetch in background
        setTimeout(() => prefetchNearbyFrames(frameIndex), 0)
        return frameCacheRef.current.get(cacheKey)
      }

      // Show loading indicator for uncached frames
      setIsFrameLoading(true)
      
      try {
        const bitmap = await fetchFrame(frameIndex, undefined, 0, 'high') // High priority for current frame
        setIsFrameLoading(false)
        
        // Trigger prefetch after loading
        if (bitmap) {
          setTimeout(() => prefetchNearbyFrames(frameIndex), 100)
        }
        
        return bitmap
      } catch (err) {
        setIsFrameLoading(false)
        return null
      }
    },
    [currentSeriesUID, fetchFrame, prefetchNearbyFrames],
  )

  // Clear cache when series changes
  useEffect(() => {
    // Cancel pending prefetches
    if (prefetchControllerRef.current) {
      prefetchControllerRef.current.abort()
    }
    
    // Clear cache for old series (keep memory clean)
    const cache = frameCacheRef.current
    const order = cacheOrderRef.current
    
    // Close all bitmaps to free memory
    cache.forEach((bitmap) => bitmap.close())
    cache.clear()
    order.length = 0
    
    // Clear pending requests and reset queue
    pendingRequestsRef.current.clear()
    requestQueueRef.current = []
    activeRequestsRef.current = 0
    
    debugLog(`[Cache] Cleared for series change to: ${currentSeriesUID?.slice(-8)}`)
    
    // Check if this is a non-image modality
    const seriesModality = currentSeriesData?.modality?.toUpperCase() || ''
    const isNonImageModality = NON_IMAGE_MODALITIES.includes(seriesModality)
    
    // Reset frame and start preloading for new series
    if (currentSeriesUID) {
      setCurrentFrame(0) // Reset to first frame of new series
      
      // Skip preloading for non-image modalities
      if (isNonImageModality) {
        debugLog(`[Series] Non-image modality detected: ${seriesModality}, skipping preload`)
        setIsInitialLoading(false)
        setIsFrameLoading(false)
        return
      }
      
      setIsInitialLoading(true) // Show initial loading screen
      setIsFrameLoading(true) // Show loading indicator
      
      // Adaptive preload count based on study size
      const initialPreloadCount = Math.min(
        totalFrames <= 20 ? totalFrames : 20, // Small studies: load all, large: first 20
        totalFrames
      )
      setPreloadProgress({ loaded: 0, total: initialPreloadCount })
      
      // Preload first frame with high priority, then batch load others
      const preloadFrames = async () => {
        try {
          // Load first frame immediately (high priority)
          const firstBitmap = await fetchFrame(0, undefined, 0, 'high')
          if (firstBitmap) {
            setPreloadProgress({ loaded: 1, total: initialPreloadCount })
            setIsInitialLoading(false) // First frame loaded, show viewer
            setIsFrameLoading(false)
            
            // Continue preloading remaining frames in background with controlled concurrency
            // Use Promise.all with chunks to avoid overwhelming the server
            const chunkSize = MAX_CONCURRENT_REQUESTS
            for (let start = 1; start < initialPreloadCount; start += chunkSize) {
              const end = Math.min(start + chunkSize, initialPreloadCount)
              const promises = []
              
              for (let i = start; i < end; i++) {
                promises.push(
                  fetchFrame(i, undefined, 0, 'low').then(() => {
                    setPreloadProgress(prev => ({ 
                      ...prev, 
                      loaded: Math.min(prev.loaded + 1, initialPreloadCount) 
                    }))
                  })
                )
              }
              
              // Wait for this chunk to complete before starting next
              await Promise.all(promises)
            }
            
            debugLog(`[Preload] Completed initial preload of ${initialPreloadCount} frames`)
          } else {
            // Failed to load first frame, still show viewer with error state
            setIsInitialLoading(false)
            setIsFrameLoading(false)
          }
        } catch (err) {
          console.error('Failed to preload first frame:', err)
          setIsInitialLoading(false)
          setIsFrameLoading(false)
        }
      }
      
      preloadFrames()
    }
  }, [currentSeriesUID, totalFrames, fetchFrame, currentSeriesData?.modality])
  
  // ============ MEMORY CLEANUP ON UNMOUNT ============
  useEffect(() => {
    // Cleanup function runs on unmount
    return () => {
      debugLog('[Cleanup] Component unmounting, cleaning up resources...')
      
      // Cancel any pending prefetches
      if (prefetchControllerRef.current) {
        prefetchControllerRef.current.abort()
        prefetchControllerRef.current = null
      }
      
      // Close all cached ImageBitmaps to free GPU/memory
      const cache = frameCacheRef.current
      cache.forEach((bitmap, key) => {
        try {
          bitmap.close()
        } catch (e) {
          debugWarn(`[Cleanup] Failed to close bitmap ${key}:`, e)
        }
      })
      cache.clear()
      cacheOrderRef.current.length = 0
      
      // Clear pending requests map
      pendingRequestsRef.current.clear()
      
      // Clear any pending timeouts
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
        autoHideTimeoutRef.current = null
      }
      
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
      
      debugLog('[Cleanup] All resources cleaned up')
    }
  }, []) // Empty deps - only run on unmount
  // ============ END OPTIMIZED FRAME LOADING ============

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
  
  // Track failed frames for retry functionality
  const [failedFrame, setFailedFrame] = useState<number | null>(null)
  
  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Use canvas's bounding rect for accurate dimensions (not container which includes tools panel)
    const rect = canvas.getBoundingClientRect()
    const vw = rect.width
    const vh = rect.height

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

    // Check if current series is a non-image modality
    const seriesModality = currentSeriesData?.modality?.toUpperCase() || dicomMetadata?.modality?.toUpperCase() || ''
    const isNonImageModality = NON_IMAGE_MODALITIES.includes(seriesModality)
    
    if (isNonImageModality) {
      // Just draw background - the overlay with buttons is rendered as HTML
      ctx.fillStyle = "#1e293b"
      ctx.fillRect(0, 0, vw, vh)
      return
    }

    const bitmap = await loadFrame(currentFrame)
    
    // Handle failed frame - show error state instead of black screen
    if (!bitmap) {
      setFailedFrame(currentFrame)
      
      // Draw error state
      ctx.fillStyle = "#1e293b"
      ctx.fillRect(0, 0, vw, vh)
      
      // Error icon (X in circle)
      const centerX = vw / 2
      const centerY = vh / 2 - 30
      const iconSize = 40
      
      ctx.strokeStyle = "#ef4444"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX, centerY, iconSize, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(centerX - 20, centerY - 20)
      ctx.lineTo(centerX + 20, centerY + 20)
      ctx.moveTo(centerX + 20, centerY - 20)
      ctx.lineTo(centerX - 20, centerY + 20)
      ctx.stroke()
      
      // Error text
      ctx.fillStyle = "#f87171"
      ctx.font = "bold 16px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Failed to load frame", centerX, centerY + 60)
      
      ctx.fillStyle = "#94a3b8"
      ctx.font = "14px Arial"
      ctx.fillText(`Frame ${currentFrame + 1} of ${totalFrames}`, centerX, centerY + 85)
      
      // Retry hint
      ctx.fillStyle = "#60a5fa"
      ctx.font = "13px Arial"
      ctx.fillText("Click to retry or use arrow keys to navigate", centerX, centerY + 115)
      
      ctx.textAlign = "left"
      return
    }
    
    // Clear failed frame state on successful load
    if (failedFrame === currentFrame) {
      setFailedFrame(null)
    }

    // Image scaling and positioning - FIT TO SCREEN by default
    const imgW = bitmap.width
    const imgH = bitmap.height
    
    // Calculate base scale to fit image within viewport (with small padding)
    const padding = 20 // pixels padding on each side
    const availableW = vw - padding * 2
    const availableH = vh - padding * 2
    const fitScaleX = availableW / imgW
    const fitScaleY = availableH / imgH
    const baseScale = Math.min(fitScaleX, fitScaleY, 1) // Don't upscale small images beyond 100%
    
    // Apply user zoom on top of fit-to-screen base scale
    const scale = baseScale * zoom
    const drawW = imgW * scale
    const drawH = imgH * scale
    const dx = vw / 2 - drawW / 2 + pan.x
    const dy = vh / 2 - drawH / 2 + pan.y

    // Store bounds for coordinate conversion in mouse handlers
    imageBoundsRef.current = { dx, dy, scale, imgW, imgH }

    ctx.imageSmoothingEnabled = true
    
    // Build filter string with brightness, contrast, and optional invert
    let filterStr = `brightness(${brightness}) contrast(${contrast})`
    if (invert) {
      filterStr += ' invert(1)'
    }
    ctx.filter = filterStr
    
    // Apply transformations (rotation and flip)
    const needsTransform = rotation !== 0 || flipH || flipV
    if (needsTransform) {
      ctx.save()
      ctx.translate(vw / 2, vh / 2)
      
      // Apply rotation
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180)
      }
      
      // Apply flip
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
      
      ctx.translate(-vw / 2, -vh / 2)
    }
    
    ctx.drawImage(bitmap, dx, dy, drawW, drawH)
    
    if (needsTransform) {
      ctx.restore()
    }
    
    ctx.filter = "none"

    // Grid overlay
    if (showGrid) {
      drawGrid(ctx, dx, dy, drawW, drawH, mmPerPixel, scale, vw, vh)
    }

    // Series-aware overlay info
    if (showOverlay) {
      drawOverlay(ctx, {
        studyInstanceUID,
        seriesInstanceUID: currentSeriesUID,
        frame: currentFrame + 1,
        totalFrames,
        zoom: scale,
        mmPerPixel: mmPerPixel,
        windowCenter,
        windowWidth,
        vw,
        vh,
        // Series-specific information
        seriesDescription: currentSeriesData?.seriesDescription,
        seriesNumber: currentSeriesData?.seriesNumber,
        modality: currentSeriesData?.modality || dicomMetadata?.modality,
        // DICOM metadata for patient/acquisition info
        dicomMetadata,
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
    rotation,
    flipH,
    flipV,
    invert,
    showOverlay,
    showGrid,
    mmPerPixel,
    windowCenter,
    windowWidth,
    dicomMetadata,
    currentSeriesData,
    currentSeriesUID,
    annotations,
    selectedAnnotationId,
    loadFrame,
    dpr,
  ])
  
  // Undo/Redo functions for annotations
  const saveAnnotationHistory = useCallback((newAnnotations: Annotation[]) => {
    setAnnotationHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push([...newAnnotations])
      // Keep max 50 history states
      if (newHistory.length > 50) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])
  
  // Track annotation changes and save to history (debounced)
  const lastAnnotationsRef = useRef<string>('')
  useEffect(() => {
    const currentJson = JSON.stringify(annotations)
    // Only save if annotations actually changed (not from undo/redo)
    if (currentJson !== lastAnnotationsRef.current && annotations.length > 0) {
      // Debounce to avoid saving during rapid changes
      const timeoutId = setTimeout(() => {
        if (currentJson !== JSON.stringify(annotationHistory[historyIndex] || [])) {
          saveAnnotationHistory(annotations)
        }
      }, 500)
      lastAnnotationsRef.current = currentJson
      return () => clearTimeout(timeoutId)
    }
    lastAnnotationsRef.current = currentJson
  }, [annotations, annotationHistory, historyIndex, saveAnnotationHistory])
  
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const prevAnnotations = annotationHistory[newIndex] || []
      lastAnnotationsRef.current = JSON.stringify(prevAnnotations) // Prevent re-saving
      setAnnotations(prevAnnotations)
    }
  }, [historyIndex, annotationHistory])
  
  const redo = useCallback(() => {
    if (historyIndex < annotationHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      const nextAnnotations = annotationHistory[newIndex] || []
      lastAnnotationsRef.current = JSON.stringify(nextAnnotations) // Prevent re-saving
      setAnnotations(nextAnnotations)
    }
  }, [historyIndex, annotationHistory])
  
  // Update drawRef whenever draw changes
  useEffect(() => {
    drawRef.current = draw
  }, [draw])

  // Series-aware mouse wheel navigation - smooth and prevents page scroll
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Always prevent default to stop page scrolling when over canvas
      e.preventDefault()
      e.stopPropagation()
      
      if (!containerRef.current?.contains(e.target as Node)) return

      // Smooth delta calculation
      const delta = Math.sign(e.deltaY)

      if (e.shiftKey) {
        // Zoom with shift+scroll - smoother increments
        const zoomStep = 0.05
        setZoom(prev => Math.max(0.1, Math.min(5, prev - delta * zoomStep)))
      } else if (e.ctrlKey) {
        // Brightness with ctrl+scroll
        const brightnessStep = 0.05
        setBrightness(prev => Math.max(0.5, Math.min(2, prev - delta * brightnessStep)))
      } else {
        // Frame navigation - single frame per scroll
        setCurrentFrame(prev => {
          const next = prev + delta
          return Math.max(0, Math.min(totalFrames - 1, next))
        })
      }
    },
    [totalFrames],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Use passive: false to allow preventDefault
    canvas.addEventListener("wheel", handleWheel, { passive: false })
    
    // Also prevent scroll on the container
    const container = containerRef.current
    if (container) {
      const preventScroll = (e: WheelEvent) => {
        e.preventDefault()
      }
      container.addEventListener("wheel", preventScroll, { passive: false })
      return () => {
        canvas.removeEventListener("wheel", handleWheel)
        container.removeEventListener("wheel", preventScroll)
      }
    }
    
    return () => canvas.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  // Add keyboard navigation and shortcuts support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      // Check if canvas or container is focused
      const isViewerFocused = containerRef.current?.contains(document.activeElement) || 
                              document.activeElement === document.body

      switch (e.key.toLowerCase()) {
        // Frame navigation
        case 'arrowleft':
        case 'arrowup':
          if (isViewerFocused) {
            e.preventDefault()
            setCurrentFrame(prev => Math.max(0, prev - 1))
          }
          break
        case 'arrowright':
        case 'arrowdown':
          if (isViewerFocused) {
            e.preventDefault()
            setCurrentFrame(prev => Math.min(totalFrames - 1, prev + 1))
          }
          break
        case 'home':
          if (isViewerFocused) {
            e.preventDefault()
            setCurrentFrame(0)
          }
          break
        case 'end':
          if (isViewerFocused) {
            e.preventDefault()
            setCurrentFrame(totalFrames - 1)
          }
          break
          
        // Playback
        case ' ': // Space
          if (isViewerFocused) {
            e.preventDefault()
            setIsPlaying(prev => !prev)
          }
          break
          
        // View controls
        case 'r': // Rotate
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setRotation(prev => (prev + 90) % 360)
          }
          break
        case 'h': // Flip Horizontal
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setFlipH(prev => !prev)
          }
          break
        case 'v': // Flip Vertical
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setFlipV(prev => !prev)
          }
          break
        case 'i': // Invert
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setInvert(prev => !prev)
          }
          break
        case 'g': // Grid
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setShowGrid(prev => !prev)
          }
          break
        case 'o': // Overlay
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setShowOverlay(prev => !prev)
          }
          break
          
        // Zoom
        case '+':
        case '=':
          if (isViewerFocused) {
            e.preventDefault()
            setZoom(prev => Math.min(5, prev + 0.25))
          }
          break
        case '-':
          if (isViewerFocused) {
            e.preventDefault()
            setZoom(prev => Math.max(0.25, prev - 0.25))
          }
          break
          
        // Reset
        case '0':
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setZoom(1)
            setBrightness(1)
            setContrast(1)
            setRotation(0)
            setFlipH(false)
            setFlipV(false)
            setInvert(false)
            setPan({ x: 0, y: 0 })
            setWindowCenter(null)
            setWindowWidth(null)
            setActiveWLPreset(null)
          }
          break
          
        // Undo/Redo
        case 'z':
          if (isViewerFocused && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
          }
          break
        case 'y':
          if (isViewerFocused && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            redo()
          }
          break
          
        // Cancel drawing
        case 'escape':
          if (drawingStateRef.current.isDrawing) {
            e.preventDefault()
            tempAnnotationRef.current = null
            drawingStateRef.current.isDrawing = false
            drawRef.current?.()
          }
          break
          
        // Loop mode toggle
        case 'l':
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setLoopMode(prev => {
              if (prev === 'loop') return 'once'
              if (prev === 'once') return 'bounce'
              return 'loop'
            })
          }
          break
          
        // Reverse playback direction
        case 'b':
          if (isViewerFocused && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setPlayDirection(prev => prev === 1 ? -1 : 1)
          }
          break
          
        // Show shortcuts help
        case '?':
          if (isViewerFocused) {
            e.preventDefault()
            setShowShortcutsHelp(prev => !prev)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [totalFrames, undo, redo])

  // Playback control effect with loop mode and direction support
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (loopMode === 'loop') {
            // Continuous loop - wrap around
            const next = prev + playDirection
            if (next >= totalFrames) return 0
            if (next < 0) return totalFrames - 1
            return next
          } else if (loopMode === 'once') {
            // Play once - stop at end
            const next = prev + playDirection
            if (next >= totalFrames || next < 0) {
              setIsPlaying(false)
              return prev
            }
            return next
          } else {
            // Bounce mode - reverse direction at ends
            const next = prev + playDirection
            if (next >= totalFrames) {
              setPlayDirection(-1)
              return totalFrames - 2
            }
            if (next < 0) {
              setPlayDirection(1)
              return 1
            }
            return next
          }
        })
      }, 1000 / playSpeed)
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, playSpeed, totalFrames, loopMode, playDirection])

  // Auto-hide panels when canvas is active - DISABLED for manual control
  const handleCanvasEnter = useCallback(() => {
    setIsCanvasActive(true)
    onCanvasActiveChange?.(true)
    // Auto-hide disabled - user controls panel manually
  }, [onCanvasActiveChange])

  const handleCanvasLeave = useCallback(() => {
    setIsCanvasActive(false)
    onCanvasActiveChange?.(false)
    // Auto-hide disabled - user controls panel manually
  }, [onCanvasActiveChange])

  // Show panels when mouse is near edges - DISABLED for manual control
  const handleMouseMoveForPanels = useCallback((e: React.MouseEvent) => {
    // Disabled - user controls panel manually via button
  }, [])

  // Cleanup auto-hide timeout on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
      }
    }
  }, [])

  // Helper function to convert mouse event to image coordinates
  const getImageCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return { canvasX: 0, canvasY: 0, imageX: 0, imageY: 0 }
    
    // Use canvas rect for mouse position (matches the actual element being clicked)
    const rect = canvas.getBoundingClientRect()
    // Mouse coordinates relative to canvas element (CSS pixels)
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top
    
    // Get current image bounds (these are in CSS pixel coordinates after ctx.scale(dpr))
    const bounds = imageBoundsRef.current
    
    // Ensure we have valid bounds (draw must have been called at least once)
    if (bounds.scale === 0) {
      return { canvasX, canvasY, imageX: 0, imageY: 0 }
    }
    
    // Convert canvas coordinates to image coordinates
    // Formula: imageCoord = (canvasCoord - imageOffset) / zoomScale
    const imageX = (canvasX - bounds.dx) / bounds.scale
    const imageY = (canvasY - bounds.dy) / bounds.scale
    
    return { canvasX, canvasY, imageX, imageY }
  }, [])

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Ensure keyboard events (Enter/Escape) are captured for angle/polygon tools
      canvas.focus()

      const { canvasX, canvasY, imageX, imageY } = getImageCoordinates(e)
      const bounds = imageBoundsRef.current

      // Store initial position for all tools (in canvas coordinates for view tools)
      dragOffsetRef.current = { x: canvasX, y: canvasY }
      drawingStateRef.current.isMouseDown = true

      // For View Tools (Pan, Zoom, W/L) - just set mouse down, movement handled in mouseMove
      if (tool === "pan" || tool === "zoom" || tool === "wl") {
        // Update cursor for active dragging
        if (tool === "pan") setCursorStyle('grabbing')
        else if (tool === "zoom") setCursorStyle('ns-resize')
        else if (tool === "wl") setCursorStyle('move')
        return // Don't check for annotations when using view tools
      }

      // TEXT TOOL: Single click to place text - handle immediately
      if (tool === "text") {
        const label = window.prompt("Enter label text")
        if (label && label.trim()) {
          const newAnnotation: Annotation = {
            id: Math.random().toString(36).slice(2),
            type: "text",
            points: [{ x: imageX, y: imageY }],
            label: label.trim(),
            color: "#00e5ff",
            thickness: 2,
            fontSize: 16,
            fontBold: false,
          }
          setAnnotations((prev) => [...prev, newAnnotation])
        }
        drawingStateRef.current.isMouseDown = false
        drawRef.current?.()
        return
      }

      // CALIBRATION TOOL: Draw a line, then prompt for known distance
      // Handled like length tool but with calibration prompt on completion

      // Check if clicking on annotation handle (for resizing) - only for annotation tools
      // Handle radius in image coordinates - larger for easier clicking
      const handleRadius = Math.max(12, 15 / bounds.scale)
      let clickedHandle = false
      
      for (const ann of annotations.filter(ann => ann && ann.id && ann.points)) {
        for (let i = 0; i < ann.points.length; i++) {
          const point = ann.points[i]
          const dx = imageX - point.x
          const dy = imageY - point.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < handleRadius) {
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

      // ANGLE TOOL: Check if we're continuing an existing angle annotation
      if (tool === "angle" && tempAnnotationRef.current && tempAnnotationRef.current.type === "angle") {
        // Continue adding points to existing angle - click-based
        const points = tempAnnotationRef.current.points
        const numPoints = points.length
        
        // After first click + mouseMove, we have 2 points (1 confirmed + 1 preview)
        // Second click confirms the second point (vertex) and adds preview for third
        if (numPoints === 2) {
          // Confirm the second point at current position, add preview for third
          tempAnnotationRef.current.points = [points[0], { x: imageX, y: imageY }, { x: imageX, y: imageY }]
          drawRef.current?.()
        }
        // After second click + mouseMove, we have 3 points (2 confirmed + 1 preview)
        // Third click confirms the third point and completes the angle
        else if (numPoints >= 3) {
          // Confirm the third point and complete
          tempAnnotationRef.current.points = [points[0], points[1], { x: imageX, y: imageY }]
          setAnnotations((prev) => [...prev, { ...tempAnnotationRef.current! }])
          tempAnnotationRef.current = null
          drawingStateRef.current.isDrawing = false
          drawRef.current?.()
        }
        drawingStateRef.current.isMouseDown = false
        return
      }

      // Start new annotation
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
      
      // Force immediate redraw to show the first point
      drawRef.current?.()
    },
    [annotations, tool, getImageCoordinates],
  )

  const mouseMoveRafRef = useRef<number | null>(null)
  
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return

      const { canvasX, canvasY, imageX, imageY } = getImageCoordinates(e)

      // ===== VIEW TOOLS - Handle immediately when mouse is down =====
      if (drawingStateRef.current.isMouseDown && (tool === "pan" || tool === "zoom" || tool === "wl")) {
        const dx = canvasX - dragOffsetRef.current.x
        const dy = canvasY - dragOffsetRef.current.y
        
        if (tool === "pan") {
          // Pan moves the image - update pan state
          setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
        } else if (tool === "zoom") {
          // Vertical drag: up = zoom in, down = zoom out
          const zoomDelta = -dy * 0.005
          setZoom((prev) => Math.max(0.1, Math.min(5, prev + zoomDelta)))
        } else if (tool === "wl") {
          // Horizontal = contrast, Vertical = brightness
          setContrast((prev) => Math.max(0.5, Math.min(2, prev + dx * 0.005)))
          setBrightness((prev) => Math.max(0.5, Math.min(2, prev - dy * 0.005)))
        }
        
        dragOffsetRef.current = { x: canvasX, y: canvasY }
        return
      }

      // ===== Update cursor when not dragging =====
      if (!drawingStateRef.current.isMouseDown) {
        if (tool === 'pan') setCursorStyle('grab')
        else if (tool === 'zoom') setCursorStyle('zoom-in')
        else if (tool === 'wl') setCursorStyle('ns-resize')
        else setCursorStyle('crosshair')
      }

      // ===== ANNOTATION TOOLS - Handle resizing =====
      if (drawingStateRef.current.isResizing && drawingStateRef.current.draggedAnnotationId !== null) {
        const annId = drawingStateRef.current.draggedAnnotationId
        const pointIdx = drawingStateRef.current.draggedPointIndex
        
        if (pointIdx !== null) {
          setAnnotations(prev => {
            const idx = prev.findIndex((a) => a && a.id === annId)
            if (idx >= 0) {
              const updated = [...prev]
              const updatedPoints = [...updated[idx].points]
              updatedPoints[pointIdx] = { x: imageX, y: imageY }
              updated[idx] = { ...updated[idx], points: updatedPoints }
              return updated
            }
            return prev
          })
        }
        return
      }

      // ===== ANNOTATION TOOLS - Handle drawing preview =====
      if (drawingStateRef.current.isDrawing && tempAnnotationRef.current) {
        const toolType = tempAnnotationRef.current.type
        
        // Create updated points array
        const currentPoints = [...tempAnnotationRef.current.points]
        
        if (toolType === "angle") {
          // Angle: update the preview point position
          // The preview point is always the last point in the array
          // We only update it, never add new points in mouseMove
          const numPoints = currentPoints.length
          
          if (numPoints >= 2) {
            // Update the last point as preview
            currentPoints[numPoints - 1] = { x: imageX, y: imageY }
          }
          // If only 1 point, we need to add a preview point
          else if (numPoints === 1) {
            currentPoints.push({ x: imageX, y: imageY })
          }
        } else if (toolType === "polygon") {
          // Polygon: update last point as preview
          if (currentPoints.length === 1) {
            currentPoints.push({ x: imageX, y: imageY })
          } else {
            currentPoints[currentPoints.length - 1] = { x: imageX, y: imageY }
          }
        } else if (toolType === "text") {
          // Text doesn't need preview - it's single click
          return
        } else {
          // All other tools: 2 points (start and end)
          if (currentPoints.length === 1) {
            currentPoints.push({ x: imageX, y: imageY })
          } else {
            currentPoints[1] = { x: imageX, y: imageY }
          }
        }
        
        tempAnnotationRef.current = {
          ...tempAnnotationRef.current,
          points: currentPoints,
        }
        
        // Force redraw to show preview
        drawRef.current?.()
      }
    },
    [tool, getImageCoordinates],
  )

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      
      // Reset mouse down state
      drawingStateRef.current.isMouseDown = false

      // Reset cursor for view tools
      if (tool === 'pan') setCursorStyle('grab')
      else if (tool === 'zoom') setCursorStyle('zoom-in')
      else if (tool === 'wl') setCursorStyle('ns-resize')
      else setCursorStyle('crosshair')

      // For view tools, just reset - no further action needed
      if (tool === "pan" || tool === "zoom" || tool === "wl") {
        return
      }

      // Clean up resize state
      if (drawingStateRef.current.isResizing) {
        drawingStateRef.current.isResizing = false
        drawingStateRef.current.draggedAnnotationId = null
        drawingStateRef.current.draggedPointIndex = null
        return
      }

      // Handle annotation completion
      if (drawingStateRef.current.isDrawing && tempAnnotationRef.current && canvas) {
        const { imageX, imageY } = getImageCoordinates(e)

        const t = tempAnnotationRef.current.type
        let isComplete = false

        if (t === "polygon") {
          // Polygon: add point on each click, complete with Enter key
          const points = [...tempAnnotationRef.current.points]
          if (points.length === 1) {
            points.push({ x: imageX, y: imageY })
          } else {
            // Update last point and add new preview point
            points[points.length - 1] = { x: imageX, y: imageY }
            points.push({ x: imageX, y: imageY })
          }
          tempAnnotationRef.current.points = points
          isComplete = false // Polygon needs Enter to complete
        } else if (t === "angle") {
          // Angle: handled entirely in mouseDown with clicks
          // mouseUp just resets mouse state, doesn't complete annotation
          // Don't set isComplete - angle completion is handled in mouseDown
          return
        } else if (t === "text") {
          // Text is handled in mouseDown, should not reach here
          tempAnnotationRef.current = null
          drawingStateRef.current.isDrawing = false
          return
        } else if (t === "calibration") {
          // Calibration: draw a line, then prompt for known distance
          const points = [...tempAnnotationRef.current.points]
          if (points.length === 1) {
            points.push({ x: imageX, y: imageY })
          } else {
            points[1] = { x: imageX, y: imageY }
          }
          tempAnnotationRef.current.points = points
          
          // Calculate pixel distance
          const dx = points[1].x - points[0].x
          const dy = points[1].y - points[0].y
          const pixelDistance = Math.sqrt(dx * dx + dy * dy)
          
          // Prompt for known distance in mm
          const knownDistanceStr = window.prompt(
            `Enter the known distance in millimeters (mm) for this line:\n\nPixel length: ${pixelDistance.toFixed(1)} pixels`,
            "10"
          )
          
          if (knownDistanceStr && !isNaN(parseFloat(knownDistanceStr))) {
            const knownDistance = parseFloat(knownDistanceStr)
            if (knownDistance > 0) {
              // Calculate mm per pixel
              const newMmPerPixel = knownDistance / pixelDistance
              setMmPerPixel(newMmPerPixel)
              
              // Store the calibration as an annotation for reference
              tempAnnotationRef.current.measurement = knownDistance
              tempAnnotationRef.current.label = `Calibration: ${knownDistance.toFixed(1)}mm`
              isComplete = true
            } else {
              tempAnnotationRef.current = null
              drawingStateRef.current.isDrawing = false
              return
            }
          } else {
            tempAnnotationRef.current = null
            drawingStateRef.current.isDrawing = false
            return
          }
        } else {
          // All other tools (length, line, arrow, rect, circle): 2 points
          const points = [...tempAnnotationRef.current.points]
          if (points.length === 1) {
            points.push({ x: imageX, y: imageY })
          } else {
            points[1] = { x: imageX, y: imageY }
          }
          tempAnnotationRef.current.points = points
          isComplete = true
        }

        if (isComplete && tempAnnotationRef.current) {
          // Add completed annotation to list
          setAnnotations((prev) => [...prev, { ...tempAnnotationRef.current! }])
          tempAnnotationRef.current = null
          drawingStateRef.current.isDrawing = false
        }
        
        // Force redraw
        drawRef.current?.()
      }
    },
    [tool, getImageCoordinates],
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
        setAnnotations((prev) => [...prev, tempAnnotationRef.current!])
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

  // Handle canvas click - retry failed frames
  const handleCanvasClick = useCallback(() => {
    if (failedFrame !== null && failedFrame === currentFrame) {
      // Clear cache for this frame and retry
      const cacheKey = `${currentSeriesUID}-${currentFrame}`
      frameCacheRef.current.delete(cacheKey)
      pendingRequestsRef.current.delete(cacheKey)
      setFailedFrame(null)
      setIsFrameLoading(true)
      // Force redraw which will trigger a new fetch
      setTimeout(() => drawRef.current?.(), 100)
    }
  }, [failedFrame, currentFrame, currentSeriesUID])

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
    mmPerPixel,
    annotations,
    selectedAnnotationId,
    draw, // Add draw to dependencies to ensure it's called when draw function changes
  ])

  // ============ STRUCTURED REPORT FUNCTIONS ============
  
  // View SR content
  const handleViewSR = useCallback(async () => {
    if (!currentSeriesUID || !studyInstanceUID) return
    
    setSRLoading(true)
    setShowSRViewer(true)
    
    try {
      // Try to fetch SR content from the server
      const response = await fetch(
        `${dicomWebBaseUrl}/studies/${studyInstanceUID}/series/${currentSeriesUID}/sr`,
        { signal: AbortSignal.timeout(30000) }
      )
      
      if (response.ok) {
        const data = await response.json()
        setSRContent(data.content || JSON.stringify(data, null, 2))
      } else {
        // Fallback: show basic info
        setSRContent(`Structured Report\n\nSeries: ${currentSeriesData?.seriesDescription || 'Unknown'}\nModality: ${currentSeriesData?.modality || 'SR'}\n\nNote: Full SR content parsing is not available.\nUse the Download button to get the original DICOM file.`)
      }
    } catch (err) {
      console.error('Failed to load SR content:', err)
      setSRContent(`Structured Report\n\nSeries: ${currentSeriesData?.seriesDescription || 'Unknown'}\nModality: ${currentSeriesData?.modality || 'SR'}\n\nNote: Could not load SR content.\nUse the Download button to get the original DICOM file.`)
    } finally {
      setSRLoading(false)
    }
  }, [currentSeriesUID, studyInstanceUID, dicomWebBaseUrl, currentSeriesData])
  
  // Download DICOM file
  const handleDownloadDICOM = useCallback(async () => {
    if (!currentSeriesUID || !studyInstanceUID) return
    
    try {
      // Get the first instance of the series
      const instanceId = currentSeriesData?.instances?.[0]?.orthancInstanceId || 
                         currentSeriesData?.instances?.[0]?.sopInstanceUID
      
      if (!instanceId) {
        alert('No instance found for download')
        return
      }
      
      // Create download URL
      const downloadUrl = `${dicomWebBaseUrl}/studies/${studyInstanceUID}/series/${currentSeriesUID}/download`
      
      // Try to download
      const response = await fetch(downloadUrl)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${currentSeriesData?.seriesDescription || 'series'}_${currentSeriesData?.modality || 'DICOM'}.dcm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        // Fallback: open in new tab
        window.open(downloadUrl, '_blank')
      }
    } catch (err) {
      console.error('Download failed:', err)
      alert('Download failed. Please try again.')
    }
  }, [currentSeriesUID, studyInstanceUID, dicomWebBaseUrl, currentSeriesData])

  // Capture current canvas as PNG - shows modal with options
  const handleCapture = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const dataUrl = screenshotService.captureCanvas(canvas, {
      includeAIOverlay: true,
    })
    
    setCaptureDataUrl(dataUrl)
    setCaptureNote("")
    setShowCaptureModal(true)
  }, [])

  // Save capture to system (download)
  const handleSaveToSystem = useCallback(() => {
    if (!captureDataUrl) return
    
    const safe = (s?: string) => (s ? s.replace(/[^a-zA-Z0-9_-]/g, "") : "series")
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `capture_${safe(studyInstanceUID)}_frame${currentFrame + 1}_${timestamp}.png`
    
    const a = document.createElement("a")
    a.href = captureDataUrl
    a.download = fileName
    a.click()
    
    setShowCaptureModal(false)
    setCaptureDataUrl(null)
  }, [captureDataUrl, studyInstanceUID, currentFrame])

  // Save capture to gallery and optionally create report
  const handleSaveToGallery = useCallback(async (createReport: boolean = false) => {
    if (!captureDataUrl) return
    
    await screenshotService.saveCapturedImage(captureDataUrl, captureNote || `Key image ${currentFrame + 1}`, {
      studyUID: studyInstanceUID,
      seriesUID: seriesInstanceUID,
      instanceUID: seriesInstanceUID,
      frameIndex: currentFrame + 1,
      windowLevel: { width: 256, center: 128 },
      zoom,
      hasAIOverlay: false,
      hasAnnotations: annotations.length > 0,
    })
    
    setShowCaptureModal(false)
    setCaptureDataUrl(null)
    
    if (createReport) {
      // Navigate to report page with captured image
      const params = new URLSearchParams({
        studyUID: studyInstanceUID,
        seriesUID: seriesInstanceUID || '',
        frameIndex: String(currentFrame + 1),
        capturedImage: 'true',
        note: captureNote || '',
      })
      window.open(`/app/reporting?${params.toString()}`, '_blank')
    } else {
      // Show gallery
      setShowCapturedImages(true)
    }
  }, [captureDataUrl, captureNote, studyInstanceUID, seriesInstanceUID, currentFrame, zoom, annotations.length])

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading series...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading series</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex bg-slate-900 relative overflow-hidden" 
      style={{ touchAction: 'none' }}
      onMouseMove={handleMouseMoveForPanels}
    >
      {/* Capture Modal - Enhanced with Anatomical Description */}
      {showCaptureModal && captureDataUrl && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-fuchsia-600 rounded-lg">
                  <Camera size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Key Image Captured</h3>
                  <p className="text-xs text-slate-400">Frame {currentFrame + 1} • {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCaptureModal(false)
                  setCaptureDataUrl(null)
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Preview Image */}
            <div className="p-4 bg-slate-900">
              <img 
                src={captureDataUrl} 
                alt="Captured frame" 
                className="w-full h-auto max-h-56 object-contain rounded-lg border border-slate-700"
              />
            </div>
            
            {/* Anatomical Description Input - Required for Key Images */}
            <div className="p-4 border-t border-slate-700 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <span className="text-red-400">*</span> Anatomical Description / Figure Caption
                </label>
                <textarea
                  value={captureNote}
                  onChange={(e) => setCaptureNote(e.target.value)}
                  placeholder="e.g., Axial CT showing infrarenal AAA measuring 4.8 cm with mural thrombus..."
                  className="w-full px-3 py-2 text-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{
                    backgroundColor: '#334155',
                    border: '1px solid #475569',
                  }}
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Describe the anatomical structure, findings, or measurement shown in this image
                </p>
              </div>
              
              {/* Quick Description Templates */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Quick Templates:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Axial CT at level of",
                    "Coronal reformat showing",
                    "Sagittal view demonstrating",
                    "3D VR reconstruction of",
                    "MIP image showing",
                    "MPR showing measurement of"
                  ].map((template) => (
                    <button
                      key={template}
                      onClick={() => setCaptureNote(prev => prev ? `${prev} ${template}` : template)}
                      className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="p-4 border-t border-slate-700 space-y-3">
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSaveToGallery(true)}
                  disabled={!captureNote.trim()}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition font-medium ${
                    captureNote.trim() 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800' 
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Report
                </button>
                <button
                  onClick={handleSaveToSystem}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Save to Computer
                </button>
              </div>
              
              {/* Secondary Action */}
              <button
                onClick={() => handleSaveToGallery(false)}
                disabled={!captureNote.trim()}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition ${
                  captureNote.trim()
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Layers size={18} />
                Save to Gallery Only
              </button>
              
              {!captureNote.trim() && (
                <p className="text-xs text-amber-400 text-center">
                  ⚠️ Please add an anatomical description before saving to gallery/report
                </p>
              )}
            </div>
            
            {/* Info Footer */}
            <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                {annotations.length > 0 && (
                  <span className="text-amber-400">✓ {annotations.length} annotation(s) included • </span>
                )}
                Study: {studyInstanceUID?.slice(-8) || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {showCapturedImages && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <CapturedImagesGallery open={true} onClose={() => setShowCapturedImages(false)} />
        </div>
      )}
      
      {/* Mobile Tools Toggle Button - Only visible on small screens */}
      <button
        onClick={() => setShowMobileTools(!showMobileTools)}
        className={`md:hidden fixed top-20 right-4 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all ${panelsAutoHidden ? 'opacity-30 hover:opacity-100' : ''}`}
        title={showMobileTools ? "Hide Tools" : "Show Tools"}
      >
        {showMobileTools ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        )}
      </button>
      
      {/* Canvas Container - Fixed size, no scroll */}
      <div 
        className="flex-1 h-full relative overflow-hidden" 
        style={{ minWidth: 0 }}
        onMouseEnter={handleCanvasEnter}
        onMouseLeave={handleCanvasLeave}
      >
        <canvas
          ref={canvasRef}
          style={{ 
            cursor: failedFrame === currentFrame ? 'pointer' : cursorStyle,
            display: 'block',
            width: '100%',
            height: '100%',
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onKeyDown={handleCanvasKeyDown}
          tabIndex={0}
        />
        
        {/* Non-Image Modality Overlay - Shows for SR, KO, PR, etc. */}
        {NON_IMAGE_MODALITIES.includes((currentSeriesData?.modality?.toUpperCase() || dicomMetadata?.modality?.toUpperCase() || '')) && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-40">
            <div className="text-center max-w-md px-8">
              {/* Document Icon */}
              <div className="relative w-24 h-28 mx-auto mb-6">
                <svg viewBox="0 0 80 100" className="w-full h-full">
                  {/* Document shape */}
                  <path 
                    d="M0 0 L60 0 L80 20 L80 100 L0 100 Z" 
                    fill="#334155" 
                    stroke="#64748b" 
                    strokeWidth="2"
                  />
                  {/* Folded corner */}
                  <path 
                    d="M60 0 L60 20 L80 20" 
                    fill="none" 
                    stroke="#64748b" 
                    strokeWidth="2"
                  />
                  {/* Lines on document */}
                  <line x1="10" y1="35" x2="60" y2="35" stroke="#475569" strokeWidth="2" />
                  <line x1="10" y1="50" x2="60" y2="50" stroke="#475569" strokeWidth="2" />
                  <line x1="10" y1="65" x2="60" y2="65" stroke="#475569" strokeWidth="2" />
                  <line x1="10" y1="80" x2="40" y2="80" stroke="#475569" strokeWidth="2" />
                </svg>
              </div>
              
              {/* Modality Badge */}
              <div className="inline-block px-4 py-1.5 bg-blue-600 rounded-md mb-4">
                <span className="text-white font-bold text-sm">
                  {currentSeriesData?.modality?.toUpperCase() || dicomMetadata?.modality?.toUpperCase() || 'SR'}
                </span>
              </div>
              
              {/* Title */}
              <h3 className="text-white text-xl font-semibold mb-2">Non-Image DICOM Object</h3>
              
              {/* Description */}
              <p className="text-slate-400 text-sm mb-6">
                {(() => {
                  const mod = currentSeriesData?.modality?.toUpperCase() || dicomMetadata?.modality?.toUpperCase() || ''
                  const descriptions: Record<string, string> = {
                    'SR': 'Structured Report - Contains text, measurements, and findings',
                    'KO': 'Key Object Selection - Reference to key images',
                    'PR': 'Presentation State - Display settings for images',
                    'DOC': 'Document - Encapsulated document (PDF, CDA, etc.)',
                    'PLAN': 'RT Plan - Radiation therapy treatment plan',
                    'REG': 'Registration - Spatial registration data',
                    'SEG': 'Segmentation - Region/structure definitions',
                    'AU': 'Audio - Audio waveform data',
                    'ECG': 'ECG - Electrocardiography waveform',
                  }
                  return descriptions[mod] || 'This modality does not contain viewable images'
                })()}
              </p>
              
              {/* Series Info */}
              {currentSeriesData?.seriesDescription && (
                <p className="text-slate-500 text-xs mb-6">
                  Series: {currentSeriesData.seriesDescription}
                </p>
              )}
              
              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleViewSR}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Eye size={18} />
                  View Report
                </button>
                <button
                  onClick={handleDownloadDICOM}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors font-medium"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download DICOM
                </button>
              </div>
              
              {/* Hint */}
              <p className="text-slate-600 text-xs mt-6">
                Select a different series from the left panel to view images
              </p>
            </div>
          </div>
        )}
        
        {/* SR Viewer Modal */}
        {showSRViewer && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-slate-700 flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Eye size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Structured Report</h3>
                    <p className="text-xs text-slate-400">
                      {currentSeriesData?.seriesDescription || 'Report Content'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSRViewer(false)
                    setSRContent(null)
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-auto p-4">
                {srLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-400">Loading report content...</p>
                    </div>
                  </div>
                ) : (
                  <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono bg-slate-900 p-4 rounded-lg">
                    {srContent || 'No content available'}
                  </pre>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700 flex-shrink-0">
                <button
                  onClick={handleDownloadDICOM}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download DICOM
                </button>
                <button
                  onClick={() => {
                    setShowSRViewer(false)
                    setSRContent(null)
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Initial Loading Overlay - Shows until first frame is fully loaded */}
        {isInitialLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
            <div className="text-center max-w-md px-8">
              {/* Animated medical icon */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-3 border-4 border-cyan-500/20 rounded-full"></div>
                <div className="absolute inset-3 border-4 border-transparent border-b-cyan-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Layers className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              
              <h3 className="text-white text-lg font-semibold mb-2">Loading Medical Images</h3>
              <p className="text-slate-400 text-sm mb-4">
                {currentSeriesData?.seriesDescription || 'Preparing series'} • {totalFrames} frames
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, (preloadProgress.loaded / Math.min(10, preloadProgress.total)) * 100)}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs">
                Loading frame {preloadProgress.loaded} of {Math.min(10, preloadProgress.total)}...
              </p>
            </div>
          </div>
        )}
        
        {/* Frame Loading Overlay - Shows when switching frames */}
        {!isInitialLoading && isFrameLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-white text-sm font-medium">Loading frame...</p>
              <p className="text-slate-400 text-xs mt-1">
                {currentSeriesData?.seriesDescription || 'Series'} • Frame {currentFrame + 1}/{totalFrames}
              </p>
            </div>
          </div>
        )}
        
        {/* Show panels hint when auto-hidden */}
        {panelsAutoHidden && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white/60 text-xs rounded-full backdrop-blur-sm pointer-events-none transition-opacity">
            Move mouse to edges to show panels
          </div>
        )}
        
        {/* Floating Quick Toolbar - Always visible at bottom center */}
        {!isInitialLoading && (
          <div 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 px-3 py-2 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Zoom Controls */}
            <button
              onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(5, prev + 0.25)); }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Zoom In (+)"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(0.25, prev - 0.25)); }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Zoom Out (-)"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            
            <div className="w-px h-5 bg-white/20 mx-0.5" />
            
            {/* Rotate & Flip */}
            <button
              onClick={(e) => { e.stopPropagation(); setRotation(prev => (prev + 90) % 360); }}
              className={`p-2 rounded-lg transition ${rotation !== 0 ? 'text-blue-400 bg-blue-500/20' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              title={`Rotate 90° (R) - Current: ${rotation}°`}
            >
              <RotateCcw size={18} style={{ transform: 'scaleX(-1)' }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setFlipH(prev => !prev); }}
              className={`p-2 rounded-lg transition ${flipH ? 'text-blue-400 bg-blue-500/20' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              title="Flip Horizontal (H)"
            >
              <FlipHorizontal size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setFlipV(prev => !prev); }}
              className={`p-2 rounded-lg transition ${flipV ? 'text-blue-400 bg-blue-500/20' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              title="Flip Vertical (V)"
            >
              <FlipVertical size={18} />
            </button>
            
            <div className="w-px h-5 bg-white/20 mx-0.5" />
            
            {/* Invert */}
            <button
              onClick={(e) => { e.stopPropagation(); setInvert(prev => !prev); }}
              className={`p-2 rounded-lg transition ${invert ? 'text-amber-400 bg-amber-500/20' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              title="Invert Colors (I)"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </button>
            
            {/* Brightness/Contrast */}
            <button
              onClick={(e) => { e.stopPropagation(); setBrightness(prev => prev >= 1.5 ? 0.5 : prev + 0.25); }}
              className={`p-2 rounded-lg transition ${brightness !== 1 ? 'text-yellow-400 bg-yellow-500/20' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              title={`Brightness: ${(brightness * 100).toFixed(0)}%`}
            >
              <Sun size={18} />
            </button>
            
            <div className="w-px h-5 bg-white/20 mx-0.5" />
            
            {/* Undo/Redo */}
            <button
              onClick={(e) => { e.stopPropagation(); undo(); }}
              disabled={historyIndex <= 0}
              className={`p-2 rounded-lg transition ${historyIndex > 0 ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-white/30 cursor-not-allowed'}`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); redo(); }}
              disabled={historyIndex >= annotationHistory.length - 1}
              className={`p-2 rounded-lg transition ${historyIndex < annotationHistory.length - 1 ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-white/30 cursor-not-allowed'}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </button>
            
            <div className="w-px h-5 bg-white/20 mx-0.5" />
            
            {/* Reset */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom(1)
                setBrightness(1)
                setContrast(1)
                setRotation(0)
                setFlipH(false)
                setFlipV(false)
                setInvert(false)
                setPan({ x: 0, y: 0 })
                setWindowCenter(null)
                setWindowWidth(null)
                setActiveWLPreset(null)
              }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Reset View (0)"
            >
              <RotateCcw size={18} />
            </button>
            
            {/* Keyboard Shortcuts Help */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowShortcutsHelp(prev => !prev); }}
              className={`p-2 rounded-lg transition ${showShortcutsHelp ? 'text-blue-400 bg-blue-500/20' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard size={18} />
            </button>
            
            {/* Settings - Toggle Tools Panel */}
            <button
              onClick={(e) => { e.stopPropagation(); setToolsPanelCollapsed(prev => !prev); }}
              className={`p-2 rounded-lg transition ${
                !toolsPanelCollapsed ? 'text-blue-400 bg-blue-500/20' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Tools Panel"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Keyboard Shortcuts Help Modal */}
        {showShortcutsHelp && (
          <div 
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[101] w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl p-4"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Keyboard Shortcuts</h3>
              <button 
                onClick={() => setShowShortcutsHelp(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Rotate</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">R</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Flip H</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">H</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Flip V</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">V</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Invert</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">I</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Grid</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">G</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Overlay</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">O</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Reset</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">0</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Play/Pause</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">Space</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Zoom In</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">+</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Zoom Out</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">-</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Prev Frame</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">←</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Next Frame</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">→</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Loop Mode</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">L</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Reverse</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">B</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Undo</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">Ctrl+Z</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Redo</span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white">Ctrl+Y</kbd></div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Tools Panel Toggle - Always visible when collapsed */}
      {toolsPanelCollapsed && (
        <button
          onClick={() => setToolsPanelCollapsed(false)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 px-2 py-3 bg-blue-600 text-white rounded-l-lg shadow-lg hover:bg-blue-700 hover:px-3 transition-all items-center gap-1 group"
          title="Open Tools Panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
          </svg>
          <span className="text-xs font-medium hidden group-hover:inline">Tools</span>
        </button>
      )}

      {/* Tools Panel - Hidden by default, opens on button click */}
      <div 
        className={`
          bg-slate-800 border-l border-slate-700 flex flex-col h-full shadow-lg flex-shrink-0
          transition-all duration-300 ease-in-out
          md:relative
          fixed top-0 right-0 z-30
          ${toolsPanelCollapsed ? 'md:w-0 md:overflow-hidden' : 'w-72'}
          ${showMobileTools ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          max-md:h-screen max-md:pt-16 max-md:w-72
        `}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Panel Header with Collapse Button */}
        <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700">
          <span className="text-sm font-semibold text-white">Tools</span>
          <button
            onClick={() => setToolsPanelCollapsed(true)}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Collapse Tools Panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Toolbar - Scrollable Section - scroll works here, not on canvas */}
        <div 
          className="flex-1 overflow-y-auto p-3 space-y-4 overscroll-contain"
          style={{ scrollBehavior: 'smooth' }}
          onWheel={(e) => {
            // Allow scroll in this panel, stop propagation to prevent canvas scroll
            e.stopPropagation()
          }}
        >
          
          {/* ===== FRAME NAVIGATION SECTION ===== */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={16} className="text-blue-400" />
              <span className="text-sm font-semibold text-white">Frame Navigation</span>
            </div>
            
            {/* Frame Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={totalFrames - 1}
                value={currentFrame}
                onChange={(e) => setCurrentFrame(Number.parseInt(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded cursor-pointer accent-blue-500"
              />
              <div className="text-center">
                <span className="text-lg font-bold text-white">{currentFrame + 1}</span>
                <span className="text-slate-400 text-sm"> / {totalFrames}</span>
              </div>
              {currentSeriesData && (
                <div className="text-xs text-slate-500 text-center">
                  Series {currentSeriesData.seriesNumber}: {currentSeriesData.modality}
                </div>
              )}
            </div>
            
            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-1 mt-3">
              <button
                onClick={() => setCurrentFrame(0)}
                className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition"
                title="First Frame"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              <button
                onClick={() => setCurrentFrame(prev => Math.max(0, prev - 1))}
                className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition"
                title="Previous Frame"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
                </svg>
              </button>
              <button
                onClick={() => setIsPlaying(prev => !prev)}
                className={`p-3 rounded-full transition ${
                  isPlaying 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <button
                onClick={() => setCurrentFrame(prev => Math.min(totalFrames - 1, prev + 1))}
                className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition"
                title="Next Frame"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </button>
              <button
                onClick={() => setCurrentFrame(totalFrames - 1)}
                className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition"
                title="Last Frame"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>
            
            {/* Speed Control */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-slate-400">Speed:</span>
              {[2, 5, 10, 15].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaySpeed(speed)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    playSpeed === speed 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {speed}fps
                </button>
              ))}
            </div>
            
            {/* Loop Mode Control */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-slate-400">Loop:</span>
              <button
                onClick={() => setLoopMode('loop')}
                className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
                  loopMode === 'loop' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
                title="Continuous loop"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                </svg>
                Loop
              </button>
              <button
                onClick={() => setLoopMode('once')}
                className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
                  loopMode === 'once' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
                title="Play once and stop"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
                Once
              </button>
              <button
                onClick={() => setLoopMode('bounce')}
                className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
                  loopMode === 'bounce' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
                title="Bounce back and forth"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
                </svg>
                Bounce
              </button>
            </div>
            
            {/* Direction Control */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-slate-400">Direction:</span>
              <button
                onClick={() => setPlayDirection(1)}
                className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
                  playDirection === 1 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
                title="Play forward"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Forward
              </button>
              <button
                onClick={() => setPlayDirection(-1)}
                className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
                  playDirection === -1 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
                title="Play in reverse"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" style={{ transform: 'scaleX(-1)' }}>
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Reverse
              </button>
            </div>
          </div>

          {/* ===== VIEW TOOLS SECTION ===== */}
       
          {/* ===== IMAGE ADJUSTMENTS SECTION ===== */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Sun size={16} className="text-yellow-400" />
              <span className="text-sm font-semibold text-white">Image Adjustments</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Zoom</span>
                  <span className="text-white font-medium">{(zoom * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-600 rounded accent-blue-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Brightness</span>
                  <span className="text-white font-medium">{(brightness * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={brightness}
                  onChange={(e) => setBrightness(Number.parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-600 rounded accent-yellow-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Contrast</span>
                  <span className="text-white font-medium">{(contrast * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={contrast}
                  onChange={(e) => setContrast(Number.parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-600 rounded accent-purple-500"
                />
              </div>
              
              {/* Reset Button */}
              <button
                onClick={() => {
                  setZoom(1)
                  setBrightness(1)
                  setContrast(1)
                  setRotation(0)
                  setFlipH(false)
                  setFlipV(false)
                  setInvert(false)
                  setPan({ x: 0, y: 0 })
                  setWindowCenter(null)
                  setWindowWidth(null)
                  setActiveWLPreset(null)
                }}
                className="w-full py-2 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                Reset View
              </button>
            </div>
          </div>

          {/* ===== WINDOW/LEVEL PRESETS ===== */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Gauge size={16} className="text-orange-400" />
              <span className="text-sm font-semibold text-white">W/L Presets ({currentModality})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {wlPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setWindowCenter(preset.windowCenter)
                    setWindowWidth(preset.windowWidth)
                    setActiveWLPreset(preset.name)
                    // Convert W/L to brightness/contrast approximation
                    // This is a simplified mapping - real DICOM viewers use LUT
                    const normalizedWC = preset.windowCenter / 1000
                    const normalizedWW = preset.windowWidth / 1000
                    setBrightness(1 - normalizedWC * 0.5)
                    setContrast(1 + (1 - normalizedWW) * 0.5)
                  }}
                  className={`px-2 py-2 text-xs rounded transition ${
                    activeWLPreset === preset.name
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title={`WC: ${preset.windowCenter}, WW: ${preset.windowWidth}`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            {/* Manual W/L input */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Window Center</label>
                <input
                  type="number"
                  value={windowCenter ?? ''}
                  onChange={(e) => {
                    setWindowCenter(e.target.value ? Number(e.target.value) : null)
                    setActiveWLPreset(null)
                  }}
                  placeholder="Auto"
                  className="w-full px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Window Width</label>
                <input
                  type="number"
                  value={windowWidth ?? ''}
                  onChange={(e) => {
                    setWindowWidth(e.target.value ? Number(e.target.value) : null)
                    setActiveWLPreset(null)
                  }}
                  placeholder="Auto"
                  className="w-full px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            {mmPerPixel && (
              <div className="mt-2 text-xs text-green-400">
                ✓ Calibrated: {mmPerPixel.toFixed(3)} mm/px
              </div>
            )}
          </div>

          {/* ===== DISPLAY OPTIONS ===== */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={16} className="text-cyan-400" />
              <span className="text-sm font-semibold text-white">Display Options</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowOverlay(prev => !prev)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition ${
                  showOverlay ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                <Eye size={18} />
                <span className="text-xs">Overlay</span>
              </button>
              <button
                onClick={() => setShowGrid(prev => !prev)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition ${
                  showGrid ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                <GridIcon size={18} />
                <span className="text-xs">Grid</span>
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                title={`Current rotation: ${rotation}°`}
              >
                <RotateCcw size={18} style={{ transform: `rotate(${-rotation}deg)` }} />
                <span className="text-xs">Rotate {rotation > 0 ? `${rotation}°` : ''}</span>
              </button>
              <button
                onClick={handleCapture}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-fuchsia-600 hover:text-white transition"
              >
                <Camera size={18} />
                <span className="text-xs">Capture</span>
              </button>
              <button
                onClick={() => setShowCapturedImages(true)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-fuchsia-600 hover:text-white transition"
              >
                <Layers size={18} />
                <span className="text-xs">Gallery</span>
              </button>
            </div>
            
            {/* Calibration */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs text-slate-400">Scale Calibration (mm/px)</label>
                <div className="group relative">
                  <svg className="w-4 h-4 text-slate-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-xs text-slate-300 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 z-50 border border-slate-700">
                    Enter the pixel-to-millimeter ratio for accurate measurements. Use the Calibrate tool to set this automatically.
                  </div>
                </div>
              </div>
              <input
                type="number"
                step="0.001"
                value={mmPerPixel?.toFixed(3) || ""}
                onChange={(e) => setMmPerPixel(Number.parseFloat(e.target.value) || null)}
                placeholder="e.g., 0.264"
                className="w-full px-3 py-2 text-sm rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  color: '#fff',
                }}
              />
              {mmPerPixel && (
                <p className="text-xs text-green-400 mt-1">✓ Calibrated: {mmPerPixel.toFixed(3)} mm/px</p>
              )}
            </div>
          </div>

          {/* ===== ANNOTATION TOOLS SECTION ===== */}
          <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-lg p-3 border border-amber-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Ruler size={16} className="text-amber-400" />
              <span className="text-sm font-semibold text-white">Annotation Tools</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "length", icon: Ruler, label: "Length" },
                { id: "angle", icon: Compass, label: "Angle" },
                { id: "line", icon: Minus, label: "Line" },
                { id: "arrow", icon: ArrowRight, label: "Arrow" },
                { id: "rect", icon: Square, label: "Rect" },
                { id: "circle", icon: CircleIcon, label: "Circle" },
                { id: "polygon", icon: Layers, label: "Polygon" },
                { id: "text", icon: TypeIcon, label: "Text" },
                { id: "calibration", icon: Gauge, label: "Calibrate" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setTool(id as Tool)
                    tempAnnotationRef.current = null
                    setSelectedAnnotationId(null)
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                    tool === id 
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30" 
                      : "bg-slate-700/80 text-slate-300 hover:bg-amber-700/50 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
            
            {/* Clear All Annotations */}
            {annotations.length > 0 && (
              <button
                onClick={() => {
                  setAnnotations([])
                  setSelectedAnnotationId(null)
                }}
                className="w-full mt-3 py-2 text-xs bg-red-900/50 text-red-300 rounded-lg hover:bg-red-800/50 transition flex items-center justify-center gap-2 border border-red-700/50"
              >
                <Trash2 size={14} />
                Clear All ({annotations.length})
              </button>
            )}
          </div>
        </div>

        {/* ===== ANNOTATIONS LIST - Fixed at Bottom ===== */}
        <div className="border-t border-slate-700 p-3 bg-slate-800 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Annotations ({annotations.length})</span>
          </div>
          {annotations.length === 0 ? (
            <div className="text-center py-6 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-700/50 flex items-center justify-center">
                <Ruler size={24} className="text-slate-500" />
              </div>
              <p className="text-sm text-slate-400 font-medium mb-1">No annotations yet</p>
              <p className="text-xs text-slate-500">Click annotation tools above to add measurements, shapes, or text</p>
            </div>
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
      
      {/* Mobile overlay backdrop */}
      {showMobileTools && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setShowMobileTools(false)}
        />
      )}
    </div>
  )
}





const MPRViewerOptimized: React.FC<CombinedDicomViewerProps> = ({
  studyInstanceUID,
  seriesInstanceUID,
  sopInstanceUIDs = [],
  dicomWebBaseUrl = "/api/dicom",
  selectedSeriesUID,
  seriesData = [],
  onSeriesChange,
  isLoading = false,
  error,
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

  const frameCacheRef = useRef<Map<string, ImageBitmap>>(new Map())
  const [frames, setFrames] = useState({ axial: 0, sagittal: 0, coronal: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [tool, setTool] = useState<Tool>("pan") // Added tool state
  
  // Series-aware state management for MPR
  const currentSeriesUID = selectedSeriesUID || seriesInstanceUID
  const currentSeriesData = seriesData.find(s => s.seriesInstanceUID === currentSeriesUID) || 
    (seriesData.length > 0 ? seriesData[0] : null)
  
  // Use totalFrames for multi-frame DICOM, fallback to numberOfInstances
  const totalFrames = currentSeriesData?.totalFrames || currentSeriesData?.numberOfImages || currentSeriesData?.numberOfInstances || sopInstanceUIDs.length || 1

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

  // Series-aware frame loading with caching for MPR
  const loadFrame = useCallback(
    async (frameIndex: number) => {
      const cacheKey = `${currentSeriesUID}-${frameIndex}`
      if (frameCacheRef.current.has(cacheKey)) {
        return frameCacheRef.current.get(cacheKey)
      }

      // Use series-specific endpoint when available
      const frameUrl = currentSeriesUID
        ? `${dicomWebBaseUrl}/studies/${studyInstanceUID}/series/${currentSeriesUID}/frames/${frameIndex}`
        : `${dicomWebBaseUrl}/studies/${studyInstanceUID}/frames/${frameIndex}`

      try {
        const response = await fetch(frameUrl, { signal: AbortSignal.timeout(10000) })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const blob = await response.blob()
        const bitmap = await createImageBitmap(blob)
        
        // Cache with series-specific key
        frameCacheRef.current.set(cacheKey, bitmap)
        return bitmap
      } catch (err) {
        console.error("[MPR Series-aware] Frame load error:", err)
        return null
      }
    },
    [dicomWebBaseUrl, studyInstanceUID, currentSeriesUID],
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
