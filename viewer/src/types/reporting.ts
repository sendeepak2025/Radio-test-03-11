/**
 * 🎯 UNIFIED REPORTING TYPES
 * Single source of truth for all reporting data structures
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export type ReportStatus = 'draft' | 'preliminary' | 'final' | 'amended' | 'cancelled';
export type FindingType = 'finding' | 'impression' | 'recommendation' | 'critical';
export type Severity = 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
export type CreationMode = 'manual' | 'ai-assisted' | 'quick';
export type WorkflowStep = 'selection' | 'template' | 'editor';
export type ExportFormat = 'pdf' | 'dicom-sr' | 'fhir' | 'json';

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface StructuredFinding {
  id: string;
  type: FindingType;
  category?: string;
  description: string;
  severity: Severity;
  clinicalCode?: string;
  location?: string;
  frameIndex?: number;
  aiDetected?: boolean;
  coordinates?: { x: number; y: number; width?: number; height?: number };
  measurements?: Array<{ type: string; value: number; unit: string }>;
  timestamp?: Date;
}

export interface Measurement {
  id: string;
  type: 'length' | 'angle' | 'area' | 'volume';
  value: number;
  unit: string;
  label?: string;
  points: Array<{ x: number; y: number }>;
  frameIndex: number;
  timestamp?: Date;
}

export interface Annotation {
  id: string;
  type: 'text' | 'arrow' | 'freehand' | 'rectangle' | 'circle' | 'polygon' | 'clinical' | 'leader';
  text?: string;
  color: string;
  points: Array<{ x: number; y: number }>;
  anchor?: { x: number; y: number };
  textPos?: { x: number; y: number };
  category?: string;
  clinicalCode?: string;
  isKeyImage?: boolean;
  frameIndex: number;
  timestamp?: Date;
}

export interface KeyImage {
  id: string;
  dataUrl: string;
  caption: string;
  timestamp?: Date;
  metadata?: {
    studyUID?: string;
    seriesUID?: string;
    instanceUID?: string;
    frameIndex?: number;
    windowLevel?: { width: number; center: number };
    zoom?: number;
    hasAIOverlay?: boolean;
    hasAnnotations?: boolean;
  };
}

export interface AIDetection {
  id: string;
  type: string;
  confidence: number;
  bbox?: { x: number; y: number; w: number; h: number };
  measurements?: Measurement[];
  severity?: Severity;
  description: string;
}

export interface RevisionHistoryEntry {
  revisedBy: string;
  revisedAt: Date;
  changes: string;
  previousStatus?: ReportStatus;
}

export interface StructuredReport {
  // IDs
  _id?: string;
  reportId?: string;
  
  // Study & Patient
  studyInstanceUID: string;
  patientID: string;
  patientName?: string;
  patientBirthDate?: string;
  patientSex?: string;
  patientAge?: string;
  
  // Study Info
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  modality?: string;
  
  // Template & Sections
  templateId?: string;
  templateName?: string;
  sections?: Record<string, string>;
  
  // Report Content
  clinicalHistory?: string;
  technique?: string;
  comparison?: string;
  findingsText?: string;
  impression?: string;
  recommendations?: string;
  
  // Structured Data
  findings: StructuredFinding[];
  measurements?: Measurement[];
  annotations?: Annotation[];
  keyImages?: KeyImage[];
  imageCount?: number;
  
  // AI Integration
  aiAnalysisId?: string;
  aiAssisted?: boolean;
  aiDetections?: AIDetection[];
  criticalFindings?: string[];
  creationMode?: CreationMode;
  
  // Status & Workflow
  reportStatus: ReportStatus;
  reportDate?: Date;
  version?: number;
  revisionHistory?: RevisionHistoryEntry[];
  previousVersionId?: string;
  
  // Radiologist & Signature
  radiologistId?: string;
  radiologistName?: string;
  radiologistSignature?: string;
  radiologistSignatureUrl?: string;
  radiologistSignaturePublicId?: string;
  signedAt?: Date;
  
  // Metadata
  tags?: string[];
  priority?: 'routine' | 'urgent' | 'stat';
  hospitalId?: string;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReportTemplate {
  // MongoDB fields
  _id?: string;
  templateId: string;
  id?: string; // For backward compatibility
  
  // Basic info
  name: string;
  description?: string;
  category: string;
  
  // Matching criteria
  matchingCriteria: {
    modalities: string[];
    bodyParts: string[];
    keywords: string[];
    procedureTypes: string[];
  };
  
  // Matching weights
  matchingWeights?: {
    modalityWeight: number;
    bodyPartWeight: number;
    keywordWeight: number;
    procedureTypeWeight: number;
  };
  
  // Template structure
  sections: Array<{
    id: string;
    title: string;
    order: number;
    required?: boolean;
    defaultContent?: string;
    placeholder?: string;
    // Legacy fields for backward compatibility
    label?: string;
    name?: string;
    type?: 'text' | 'textarea' | 'select' | 'multiselect';
    defaultValue?: string;
    options?: string[];
  }>;
  
  // UI Modules - Specialized widgets for different report types
  uiModules?: Array<{
    id: string;
    type: 'measurements' | 'checklist' | 'diagram' | 'calculator' | 'score' | 'findings_toggle';
    title?: string;
    config?: any;
    order?: number;
    required?: boolean;
  }>;
  
  // Template fields
  fields?: Record<string, any>;
  fieldOptions?: Record<string, string[]>;
  
  // AI integration
  aiIntegration?: {
    enabled: boolean;
    autoFillFields: string[];
    suggestedFindings: string[];
  };
  
  // Metadata
  priority?: number;
  active?: boolean;
  isDefault?: boolean;
  
  // Usage stats
  usageStats?: {
    timesUsed: number;
    lastUsed?: Date;
    averageCompletionTime?: number;
    userRatings?: Array<{
      userId: string;
      rating: number;
      comment?: string;
      date: Date;
    }>;
  };
  
  // Customization
  customizable?: boolean;
  hospitalSpecific?: {
    hospitalId: string;
    customizations: any;
  };
  
  // Version control
  version?: string;
  changelog?: Array<{
    version: string;
    changes: string;
    date: Date;
    author: string;
  }>;
  
  // Audit
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Backward compatibility - deprecated fields
  modality?: string; // Use matchingCriteria.modalities instead
}

export interface TemplateMatchResult {
  template: ReportTemplate;
  matchScore: number;
  matchDetails?: {
    modalityMatch: boolean;
    descriptionMatch: boolean;
    aiMatch: boolean;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  report?: T;
  reports?: T[];
  template?: ReportTemplate;
  templates?: ReportTemplate[];
  error?: string;
  message?: string;
  count?: number;
}

export interface VersionConflict {
  serverVersion: number;
  clientVersion: number;
  serverReport: StructuredReport;
  conflictFields: string[];
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const StructuredFindingSchema = z.object({
  id: z.string(),
  type: z.enum(['finding', 'impression', 'recommendation', 'critical']),
  category: z.string().optional(),
  description: z.string(),
  severity: z.enum(['normal', 'mild', 'moderate', 'severe', 'critical']),
  clinicalCode: z.string().optional(),
  location: z.string().optional(),
  frameIndex: z.number().optional(),
  aiDetected: z.boolean().optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional()
  }).optional(),
  measurements: z.array(z.object({
    type: z.string(),
    value: z.number(),
    unit: z.string()
  })).optional(),
  timestamp: z.date().optional()
});

export const StructuredReportSchema = z.object({
  reportId: z.string().optional(),
  studyInstanceUID: z.string(),
  patientID: z.string(),
  patientName: z.string().optional(),
  modality: z.string().optional(),
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  sections: z.record(z.string()).optional(),
  clinicalHistory: z.string().optional(),
  technique: z.string().optional(),
  comparison: z.string().optional(),
  findingsText: z.string().optional(),
  impression: z.string().optional(),
  recommendations: z.string().optional(),
  findings: z.array(StructuredFindingSchema),
  measurements: z.array(z.any()).optional(),
  annotations: z.array(z.any()).optional(),
  keyImages: z.array(z.any()).optional(),
  imageCount: z.number().optional(),
  aiAnalysisId: z.string().optional(),
  aiAssisted: z.boolean().optional(),
  aiDetections: z.array(z.any()).optional(),
  criticalFindings: z.array(z.string()).optional(),
  creationMode: z.enum(['manual', 'ai-assisted', 'quick']).optional(),
  reportStatus: z.enum(['draft', 'preliminary', 'final', 'amended', 'cancelled']),
  reportDate: z.date().optional(),
  version: z.number().optional(),
  radiologistSignature: z.string().optional(),
  radiologistSignatureUrl: z.string().optional(),
  signedAt: z.date().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).optional()
});

export type ValidatedReport = z.infer<typeof StructuredReportSchema>;
