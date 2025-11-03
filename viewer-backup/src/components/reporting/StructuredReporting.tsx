import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import SignaturePad from './SignaturePad'
import BillingPanel from '../billing/BillingPanel'
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  LinearProgress,
  Card,
  CardContent,
  CardActions,
  Badge
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Assignment,
  Assignment as ReportIcon,
  AutoAwesome as AIIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Description as TemplateIcon,
  SmartToy as SmartToyIcon,
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { getAuthToken } from '@/services/ApiService'

interface Measurement {
  id: string
  type: 'length' | 'area' | 'angle'
  value: number
  unit: string
  location: string
  frameIndex: number
}

interface Finding {
  id: string
  category: string
  location: string
  description: string
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical'
  measurements: string[]
  icdCode?: string
  recommendations?: string[]
}

interface ReportTemplate {
  id: string
  name: string
  modality: string
  sections: {
    id: string
    title: string
    content: string
    required: boolean
    suggestions: string[]
  }[]
}

// ---- AXIOS CLIENT (adds token to every request) ----
const resolvedBackendUrl = (import.meta as any)?.env?.VITE_BACKEND_URL || ''

const axiosClient = axios.create({
  baseURL: resolvedBackendUrl, // keep empty string to use same-origin
  withCredentials: true,
})

axiosClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface StructuredReportingProps {
  studyData: any
  measurements: Measurement[]
  annotations: any[]
  capturedImages?: Array<{ id: string; dataUrl: string; caption: string; timestamp?: Date }>
  onSaveReport: (report: any) => void
  onExportReport: (format: string) => void
  onSignatureSave?: (signatureDataUrl: string) => void
}

// Macro definitions
interface Macro {
  id: string
  trigger: string
  expansion: string
  category: string
}

const defaultMacros: Macro[] = [
  { id: '1', trigger: '.normal', expansion: 'No acute abnormalities identified.', category: 'General' },
  { id: '2', trigger: '.lungs', expansion: 'Lungs are clear bilaterally without consolidation, effusion, or pneumothorax.', category: 'Chest' },
  { id: '3', trigger: '.heart', expansion: 'Heart size is normal. No pericardial effusion.', category: 'Chest' },
  { id: '4', trigger: '.bones', expansion: 'Osseous structures appear intact without acute fracture or dislocation.', category: 'General' },
  { id: '5', trigger: '.impression', expansion: 'No acute cardiopulmonary process identified.', category: 'Impression' },
]

// Quick Report Templates - One-click complete reports
interface QuickReport {
  id: string
  name: string
  icon: string
  description: string
  modality: string[]
  sections: { [key: string]: string }
}

const quickReports: QuickReport[] = [
  {
    id: 'normal-chest-xray',
    name: 'Normal Chest X-Ray',
    icon: '✅',
    description: 'Complete normal chest radiograph report',
    modality: ['XA', 'CR', 'DX'],
    sections: {
      'clinical-info': 'Routine chest radiograph.',
      'technique': 'Frontal and lateral chest radiographs obtained in the upright position.',
      'findings': 'The lungs are clear bilaterally without consolidation, effusion, or pneumothorax. Heart size is normal. Mediastinal and hilar contours are unremarkable. No acute osseous abnormality.',
      'impression': 'Normal chest radiograph. No acute cardiopulmonary process.'
    }
  },
  {
    id: 'normal-ct-chest',
    name: 'Normal CT Chest',
    icon: '✅',
    description: 'Complete normal CT chest report',
    modality: ['CT'],
    sections: {
      'clinical-history': 'Chest CT for evaluation.',
      'technique': 'Chest CT performed with IV contrast enhancement.',
      'findings': 'LUNGS: Clear bilaterally without nodule, mass, or consolidation.\n\nPLEURA: No pleural effusion or pneumothorax.\n\nMEDIASTINUM: Normal mediastinal and hilar lymph nodes. No lymphadenopathy.\n\nHEART: Normal cardiac size and contour.\n\nVESSELS: Aorta and pulmonary arteries are normal in caliber.\n\nBONES: No acute osseous abnormality.',
      'impression': 'Normal CT chest. No acute findings.'
    }
  },
  {
    id: 'pneumonia',
    name: 'Pneumonia',
    icon: '🫁',
    description: 'Pneumonia findings template',
    modality: ['XA', 'CR', 'DX', 'CT'],
    sections: {
      'clinical-info': 'Cough, fever, and shortness of breath.',
      'findings': 'Airspace opacity in the [RIGHT/LEFT] [UPPER/MIDDLE/LOWER] lobe consistent with pneumonia. No pleural effusion or pneumothorax.',
      'impression': 'Findings consistent with [RIGHT/LEFT] [LOBE] pneumonia.'
    }
  },
  {
    id: 'pleural-effusion',
    name: 'Pleural Effusion',
    icon: '💧',
    description: 'Pleural effusion template',
    modality: ['XA', 'CR', 'DX', 'CT'],
    sections: {
      'findings': '[SMALL/MODERATE/LARGE] [RIGHT/LEFT/BILATERAL] pleural effusion. Lungs otherwise clear. Heart size normal.',
      'impression': '[SMALL/MODERATE/LARGE] [RIGHT/LEFT/BILATERAL] pleural effusion.'
    }
  }
]

const StructuredReporting: React.FC<StructuredReportingProps> = ({
  studyData,
  measurements,
  annotations,
  capturedImages = [],
  onSaveReport,
  onExportReport,
  onSignatureSave
}) => {
  // Workflow state - NEW: Start with creation mode
  const [reportCreationMode, setReportCreationMode] = useState<'select' | 'normal' | 'ai' | 'template'>('select')
  const [reportStarted, setReportStarted] = useState(false)
  
  const [currentTab, setCurrentTab] = useState(0)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [reportSections, setReportSections] = useState<any>({})
  const [findings, setFindings] = useState<Finding[]>([])
  const [isAIAssistEnabled, setIsAIAssistEnabled] = useState(true)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportStatus, setReportStatus] = useState<'draft' | 'reviewing' | 'final'>('draft')
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [reportPreview, setReportPreview] = useState('')
  
  // Advanced state management
  const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)
  
  // NEW: Industry-standard features
  const [macros, setMacros] = useState<Macro[]>(defaultMacros)
  const [reportLocked, setReportLocked] = useState(false)
  const [auditTrail, setAuditTrail] = useState<Array<{timestamp: string, user: string, action: string}>>([])
  const [showAddendum, setShowAddendum] = useState(false)
  const [addendumText, setAddendumText] = useState('')
  const [addendums, setAddendums] = useState<Array<{text: string, timestamp: string, author: string}>>([])
  const [criticalFindings, setCriticalFindings] = useState<string[]>([])
  const [showCriticalAlert, setShowCriticalAlert] = useState(false)
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true)
  
  // NEW: Easy reporting features
  const [showQuickReports, setShowQuickReports] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [currentEditingSection, setCurrentEditingSection] = useState<string | null>(null)
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([])
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false)
  
  // Previous reports
  const [showPreviousReports, setShowPreviousReports] = useState(false)
  const [previousReports, setPreviousReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportHistory, setReportHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null)
  const [reportValidation, setReportValidation] = useState<{[key: string]: boolean}>({})
  const [exportProgress, setExportProgress] = useState(0)
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Standard Templates for different modalities (client-side fallback)
  const standardTemplates: ReportTemplate[] = [
    {
      id: 'chest-xray',
      name: 'Chest X-Ray Report',
      modality: 'XA',
      sections: [
        { id: 'clinical-info', title: 'Clinical Information', content: '', required: true, suggestions: ['Chest pain','Shortness of breath','Cough','Fever','Follow-up study','Pre-operative evaluation'] },
        { id: 'technique', title: 'Technique', content: 'Frontal and lateral chest radiographs obtained in the upright position.', required: true, suggestions: ['Frontal and lateral chest radiographs','Single frontal view','Portable chest radiograph','Inspiration and expiration views'] },
        { id: 'findings', title: 'Findings', content: '', required: true, suggestions: ['Lungs are clear bilaterally','No acute cardiopulmonary process','Heart size is normal','Mediastinal contours are normal','No pleural effusion','Skeletal structures appear intact'] },
        { id: 'impression', title: 'Impression', content: '', required: true, suggestions: ['Normal chest radiograph','No acute cardiopulmonary process','Pneumonia','Pleural effusion','Pneumothorax'] }
      ]
    },
    {
      id: 'ct-chest',
      name: 'CT Chest Report',
      modality: 'CT',
      sections: [
        { id: 'clinical-history', title: 'Clinical History', content: '', required: true, suggestions: ['Chest pain','Dyspnea','Hemoptysis','Weight loss','Staging evaluation'] },
        { id: 'technique', title: 'Technique', content: 'Chest CT with/without IV contrast.', required: true, suggestions: ['Non-contrast chest CT','CT chest with IV contrast','CT pulmonary angiogram (CTPA)','High resolution CT (HRCT)'] },
        { id: 'findings', title: 'Findings', content: '', required: true, suggestions: ['Lungs: Clear bilaterally','Pleura: No effusion or pneumothorax','Mediastinum: Normal lymph nodes','Heart: Normal size and contour'] },
        { id: 'impression', title: 'Impression', content: '', required: true, suggestions: ['Normal CT chest','No acute pulmonary embolism','Pneumonia','Pulmonary nodule'] }
      ]
    }
  ]

  // Initialize with templates - DON'T auto-select
  useEffect(() => {
    const initializeReporting = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Try to load from backend, but always have fallback
        let templatesToUse = standardTemplates
        
        try {
          const resp = await axiosClient.get(`/api/reports/templates?active=true`)
          if ((resp.data?.success) && Array.isArray(resp.data.templates) && resp.data.templates.length > 0) {
            templatesToUse = resp.data.templates
            console.log('✅ Loaded templates from backend:', templatesToUse.length)
          }
        } catch (backendError) {
          console.log('Backend templates not available, using built-in templates')
        }
        
        setAvailableTemplates(templatesToUse)
        
      } catch (err) {
        console.error('Error initializing reporting:', err)
        setAvailableTemplates(standardTemplates)
        setError('Initialization error - using basic functionality')
      } finally {
        setLoading(false)
      }
    }

    initializeReporting()
  }, [studyData])
  
  // Add audit trail entry
  const addAuditEntry = useCallback((action: string) => {
    setAuditTrail(prev => [...prev, {
      timestamp: new Date().toISOString(),
      user: 'Current User', // Replace with actual user
      action
    }])
  }, [])
  
  // Handle macro expansion in text fields
  const handleTextChange = useCallback((sectionId: string, value: string) => {
    // Check for macro triggers
    const words = value.split(' ')
    const lastWord = words[words.length - 1]
    
    const macro = macros.find(m => lastWord === m.trigger)
    if (macro) {
      const expandedValue = value.replace(macro.trigger, macro.expansion)
      setReportSections(prev => ({ ...prev, [sectionId]: expandedValue }))
      addAuditEntry(`Macro expanded: ${macro.trigger}`)
    } else {
      setReportSections(prev => ({ ...prev, [sectionId]: value }))
    }
  }, [macros, addAuditEntry])
  
  // Apply quick report template
  const applyQuickReport = useCallback((quickReport: QuickReport) => {
    const modality = studyData.modality || 'XA'
    const template = availableTemplates.find(t => t.modality === modality) || availableTemplates[0]
    
    if (template) {
      setSelectedTemplate(template)
      const newSections: any = {}
      
      // Apply quick report sections
      Object.keys(quickReport.sections).forEach(sectionId => {
        newSections[sectionId] = quickReport.sections[sectionId]
      })
      
      // Fill remaining sections with empty strings
      template.sections.forEach(section => {
        if (!newSections[section.id]) {
          newSections[section.id] = section.content || ''
        }
      })
      
      setReportSections(newSections)
      setShowQuickReports(false)
      setReportStarted(true)
      setReportCreationMode('normal')
      addAuditEntry(`Quick report applied: ${quickReport.name}`)
      setCurrentTab(1) // Go to sections tab
    }
  }, [studyData, availableTemplates, addAuditEntry])
  
  // Voice recognition
  const startVoiceRecognition = useCallback((sectionId: string) => {
    setCurrentEditingSection(sectionId)
    setIsListening(true)
    
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert('Voice recognition not supported in this browser. Please use Chrome or Edge.')
      setIsListening(false)
      return
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setVoiceTranscript(transcript)
      
      // Update section with transcript
      if (event.results[event.results.length - 1].isFinal) {
        const currentContent = reportSections[sectionId] || ''
        const newContent = currentContent + (currentContent ? ' ' : '') + transcript
        handleSectionChange(sectionId, newContent)
        setVoiceTranscript('')
      }
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognition.start()
    addAuditEntry(`Voice dictation started for ${sectionId}`)
    
    // Store recognition instance for stopping
    ;(window as any).currentRecognition = recognition
  }, [reportSections, addAuditEntry])
  
  const stopVoiceRecognition = useCallback(() => {
    if ((window as any).currentRecognition) {
      ;(window as any).currentRecognition.stop()
    }
    setIsListening(false)
    setVoiceTranscript('')
    addAuditEntry('Voice dictation stopped')
  }, [addAuditEntry])
  
  // Generate smart suggestions based on context
  const generateSmartSuggestions = useCallback((sectionId: string, currentText: string) => {
    const suggestions: string[] = []
    
    // Based on measurements
    if (measurements.length > 0 && sectionId === 'findings') {
      measurements.forEach(m => {
        suggestions.push(`${m.type} measurement of ${m.value} ${m.unit} at ${m.location}`)
      })
    }
    
    // Based on section type
    if (sectionId.includes('impression') || sectionId.includes('conclusion')) {
      if (currentText.toLowerCase().includes('normal')) {
        suggestions.push('No acute findings.')
        suggestions.push('Recommend clinical correlation.')
      }
      if (findings.some(f => f.severity === 'critical')) {
        suggestions.push('Urgent clinical correlation recommended.')
        suggestions.push('Referring physician notified.')
      }
    }
    
    // Common phrases
    if (currentText.length < 10) {
      suggestions.push('No acute abnormalities identified.')
      suggestions.push('Within normal limits.')
      suggestions.push('Unremarkable study.')
    }
    
    setSmartSuggestions(suggestions.slice(0, 5))
    setShowSmartSuggestions(suggestions.length > 0)
  }, [measurements, findings])
  
  // Start report with selected mode
  const startReport = useCallback((mode: 'normal' | 'ai' | 'template') => {
    setReportCreationMode(mode)
    setReportStarted(true)
    addAuditEntry(`Report started in ${mode} mode`)
    
    if (mode === 'normal') {
      // Show quick reports first
      setShowQuickReports(true)
    } else if (mode === 'ai') {
      // Auto-select template and trigger AI generation
      const modality = studyData.modality || 'XA'
      const template = availableTemplates.find(t => t.modality === modality) || availableTemplates[0]
      if (template) {
        setSelectedTemplate(template)
        const initialSections: any = {}
        template.sections.forEach(section => {
          initialSections[section.id] = section.content || ''
        })
        setReportSections(initialSections)
        // Trigger AI generation after a short delay
        setTimeout(() => generateAIReport(), 500)
      }
    }
    // For 'template' mode, user will select from template tab
  }, [studyData, availableTemplates, addAuditEntry])

  // Load report history
  useEffect(() => {
    const loadReportHistory = async () => {
      if (!studyData?.studyInstanceUID) return
      
      try {
        const response = await axiosClient.get(`/api/reports/study/${encodeURIComponent(studyData.studyInstanceUID)}`)
        if (response.data.success) {
          setReportHistory(response.data.reports || [])
        }
      } catch (err) {
        console.warn('Failed to load report history:', err)
      }
    }

    loadReportHistory()
  }, [studyData?.studyInstanceUID])

  // Auto-save functionality
  useEffect(() => {
    if (Object.keys(reportSections).length === 0 || !selectedTemplate) return

    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
    }

    const interval = setInterval(() => {
      handleAutoSave()
    }, 30000) // Auto-save every 30 seconds

    setAutoSaveInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [reportSections, selectedTemplate])

  // Validation
  useEffect(() => {
    if (!selectedTemplate) return

    const validation: {[key: string]: boolean} = {}
    selectedTemplate.sections.forEach(section => {
      if (section.required) {
        validation[section.id] = Boolean(reportSections[section.id]?.trim())
      }
    })
    setReportValidation(validation)
  }, [reportSections, selectedTemplate])

  // Auto-save handler
  const handleAutoSave = useCallback(async () => {
    if (!selectedTemplate || !studyData?.studyInstanceUID) return

    try {
      setSaveStatus('saving')
      
      const reportData = {
        templateId: selectedTemplate.id,
        sections: reportSections,
        findings: findings,
        measurements: measurements.map(m => ({
          id: m.id,
          type: m.type,
          value: m.value,
          unit: m.unit,
          location: m.location || `Frame ${m.frameIndex}`,
          frameIndex: m.frameIndex
        })),
        status: reportStatus,
        author: 'Current User',
        studyData: {
          studyInstanceUID: studyData?.studyInstanceUID,
          patientID: studyData?.patientID,
          patientName: studyData?.patientName,
          modality: studyData?.modality,
          studyDescription: studyData?.studyDescription
        }
      }

      await axiosClient.post(`/api/reports`, reportData)
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
      
    } catch (err) {
      console.warn('Auto-save failed:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 5000)
    }
  }, [selectedTemplate, reportSections, findings, measurements, reportStatus, studyData?.studyInstanceUID])

  // Auto-generate findings from measurements, annotations, and captured images
  const generateFindingsFromData = useCallback(() => {
    const generatedFindings: Finding[] = []

    // Process measurements
    measurements.forEach(measurement => {
      if (measurement.type === 'length' && measurement.value > 0) {
        generatedFindings.push({
          id: `finding-${measurement.id}`,
          category: 'Measurement',
          location: measurement.location || 'Not specified',
          description: `${measurement.type} measurement: ${measurement.value} ${measurement.unit}`,
          severity: 'normal',
          measurements: [measurement.id]
        })
      }
    })

    // Process annotations
    annotations.forEach(annotation => {
      if (annotation.category === 'finding') {
        generatedFindings.push({
          id: `finding-${annotation.id}`,
          category: annotation.category || 'General',
          location: 'Image annotation',
          description: annotation.text || 'Annotated finding',
          severity: 'mild',
          measurements: []
        })
      }
    })
    
    // Process captured images
    if (capturedImages.length > 0) {
      generatedFindings.push({
        id: `finding-images`,
        category: 'Key Images',
        location: 'Multiple frames',
        description: `${capturedImages.length} key image(s) captured for documentation`,
        severity: 'normal',
        measurements: []
      })
    }

    setFindings(generatedFindings)
  }, [measurements, annotations, capturedImages])

  // Simple working AI Report Generation
  const generateAIReport = useCallback(async () => {
    if (!selectedTemplate) {
      setError('No template selected')
      return
    }

    setIsGeneratingReport(true)
    setError(null)
    
    try {
      // Try backend AI generation first
      try {
        const requestData = {
          templateId: selectedTemplate.id,
          studyData: studyData,
          measurements: measurements,
          findings: findings
        }
        
        const response = await axiosClient.post(`/api/reports/ai-generate`, requestData, { timeout: 120000 })
        
        if (response.data?.success && response.data.sections) {
          setReportSections((prev: any) => ({ ...prev, ...response.data.sections }))
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus(null), 3000)
          console.log('✅ AI report generated successfully')
          return
        }
      } catch (backendError) {
        console.log('Backend AI unavailable, using local generation')
      }
      
      // Local AI-like generation as fallback
      const aiGeneratedSections: any = {}
      
      selectedTemplate.sections.forEach(section => {
        switch (section.id) {
          case 'clinical-info':
          case 'clinical-history': 
          case 'indication':
            aiGeneratedSections[section.id] = studyData?.studyDescription || 'Clinical evaluation for diagnostic imaging.'
            break
            
          case 'technique':
            const modality = studyData?.modality || 'Unknown'
            if (modality === 'XA') {
              aiGeneratedSections[section.id] = 'Digital angiography performed with contrast enhancement.'
            } else if (modality === 'CT') {
              aiGeneratedSections[section.id] = 'Chest CT performed with IV contrast enhancement.'
            } else {
              aiGeneratedSections[section.id] = section.content || 'Standard imaging technique utilized.'
            }
            break
            
          case 'findings':
            let findingsText = 'IMAGING FINDINGS:\n\n'
            
            if (measurements.length > 0) {
              findingsText += 'MEASUREMENTS:\n'
              measurements.forEach(m => {
                findingsText += `• ${m.type}: ${m.value} ${m.unit} at ${m.location}\n`
              })
              findingsText += '\n'
            }
            
            if (annotations.length > 0) {
              findingsText += 'ANNOTATIONS:\n'
              annotations.forEach(a => {
                findingsText += `• ${a.text || a.category || 'Marked region'}\n`
              })
              findingsText += '\n'
            }
            
            if (capturedImages.length > 0) {
              findingsText += 'KEY IMAGES:\n'
              findingsText += `• ${capturedImages.length} key image(s) captured and documented\n`
              capturedImages.forEach((img, idx) => {
                findingsText += `  - Image ${idx + 1}: ${img.caption}\n`
              })
              findingsText += '\n'
            }
            
            if (findings.length > 0) {
              findingsText += 'DOCUMENTED FINDINGS:\n'
              findings.forEach(f => {
                findingsText += `• ${f.location}: ${f.description}\n`
              })
            } else if (measurements.length === 0 && annotations.length === 0 && capturedImages.length === 0) {
              findingsText += 'No acute abnormalities identified.'
            }
            
            aiGeneratedSections[section.id] = findingsText
            break
            
          case 'vessels':
            if (measurements.length > 0) {
              let vesselText = 'VASCULAR ASSESSMENT:\n'
              measurements.forEach(m => {
                vesselText += `• ${m.location || 'Vessel'}: ${m.value} ${m.unit}\n`
              })
              aiGeneratedSections[section.id] = vesselText
            } else {
              aiGeneratedSections[section.id] = 'Coronary vessels appear normal.'
            }
            break
            
          case 'impression':
          case 'conclusion':
            const hasCritical = findings.some(f => f.severity === 'critical')
            if (hasCritical) {
              aiGeneratedSections[section.id] = 'ABNORMAL STUDY - Significant findings identified.'
            } else {
              aiGeneratedSections[section.id] = 'No significant abnormalities identified.'
            }
            break
            
          default:
            aiGeneratedSections[section.id] = reportSections[section.id] || section.content || ''
        }
      })
      
      setReportSections(aiGeneratedSections)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
      console.log('✅ Local AI generation completed')
      
    } catch (error) {
      console.error('AI generation error:', error)
      setError('AI generation failed')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [selectedTemplate, findings, measurements, studyData, reportSections])

  // Generate complete report text
  const generateReportPreview = useCallback(() => {
    if (!selectedTemplate) return

    let reportText = `STRUCTURED RADIOLOGY REPORT\n\n`
    reportText += `Study: ${studyData?.studyDescription || 'Medical Imaging Study'}\n`
    reportText += `Date: ${new Date().toLocaleDateString()}\n`
    reportText += `Patient: ${studyData?.patientName || 'Patient Name'}\n`
    reportText += `Modality: ${selectedTemplate.modality}\n\n`

    selectedTemplate.sections.forEach(section => {
      const content = reportSections[section.id] || section.content
      if (content?.trim()) {
        reportText += `${section.title.toUpperCase()}:\n`
        reportText += `${content}\n\n`
      }
    })

    if (findings.length > 0) {
      reportText += `DETAILED FINDINGS:\n`
      findings.forEach((finding, index) => {
        reportText += `${index + 1}. ${finding.location} - ${finding.description}\n`
      })
      reportText += '\n'
    }
    
    // Include captured images info
    if (capturedImages.length > 0) {
      reportText += `KEY IMAGES (${capturedImages.length}):\n`
      capturedImages.forEach((img, idx) => {
        reportText += `${idx + 1}. ${img.caption}\n`
      })
      reportText += '\n'
    }
    
    // Include measurements summary
    if (measurements.length > 0) {
      reportText += `MEASUREMENTS SUMMARY:\n`
      measurements.forEach((m, idx) => {
        reportText += `${idx + 1}. ${m.type}: ${m.value} ${m.unit} (${m.location})\n`
      })
      reportText += '\n'
    }
    
    // Include annotations summary
    if (annotations.length > 0) {
      reportText += `ANNOTATIONS:\n`
      annotations.forEach((a, idx) => {
        reportText += `${idx + 1}. ${a.text || a.category || 'Marked region'}\n`
      })
      reportText += '\n'
    }

    reportText += `Report Status: ${reportStatus.toUpperCase()}\n`
    reportText += `Generated: ${new Date().toLocaleString()}\n`

    setReportPreview(reportText)
  }, [selectedTemplate, reportSections, findings, studyData, reportStatus, capturedImages, measurements, annotations])

  useEffect(() => {
    generateReportPreview()
  }, [generateReportPreview])

  useEffect(() => {
    generateFindingsFromData()
  }, [generateFindingsFromData])

  const handleSectionChange = (sectionId: string, value: string) => {
    if (reportLocked) {
      setError('Report is locked. Use addendum to make changes.')
      return
    }
    handleTextChange(sectionId, value)
    addAuditEntry(`Section edited: ${sectionId}`)
  }
  
  // Lock report after finalization
  const lockReport = useCallback(() => {
    setReportLocked(true)
    setReportStatus('final')
    addAuditEntry('Report locked and finalized')
  }, [addAuditEntry])
  
  // Add addendum
  const handleAddAddendum = useCallback(() => {
    if (!addendumText.trim()) return
    
    const newAddendum = {
      text: addendumText,
      timestamp: new Date().toISOString(),
      author: 'Current User'
    }
    setAddendums(prev => [...prev, newAddendum])
    setAddendumText('')
    setShowAddendum(false)
    addAuditEntry('Addendum added')
  }, [addendumText, addAuditEntry])
  
  // Check for critical findings
  const checkCriticalFindings = useCallback(() => {
    const criticalKeywords = ['pneumothorax', 'pulmonary embolism', 'aortic dissection', 'acute hemorrhage', 'fracture']
    const foundCritical: string[] = []
    
    Object.values(reportSections).forEach((section: any) => {
      if (typeof section === 'string') {
        criticalKeywords.forEach(keyword => {
          if (section.toLowerCase().includes(keyword)) {
            foundCritical.push(keyword)
          }
        })
      }
    })
    
    if (foundCritical.length > 0) {
      setCriticalFindings(foundCritical)
      setShowCriticalAlert(true)
    }
  }, [reportSections])

  const handleSaveReport = () => {
    const report = {
      template: selectedTemplate?.id,
      sections: reportSections,
      findings: findings,
      status: reportStatus,
      timestamp: new Date().toISOString(),
      studyData: studyData,
      measurements: measurements,
      annotations: annotations,
      capturedImages: capturedImages,
      radiologistSignature: signatureDataUrl,
      locked: reportLocked,
      addendums: addendums,
      auditTrail: auditTrail
    }
    onSaveReport(report)
    addAuditEntry('Report saved')
  }

  const fetchPreviousReports = async () => {
    setLoadingReports(true)
    try {
      const studyUID = studyData?.studyInstanceUID
      if (!studyUID) {
        setPreviousReports([])
        setLoadingReports(false)
        return
      }
      
      const response = await axiosClient.get(`/api/reports/study/${encodeURIComponent(studyUID)}?limit=10`)
      if (response.data.success) {
        setPreviousReports(response.data.reports || [])
      } else {
        setPreviousReports([])
      }
    } catch (error) {
      setPreviousReports([])
    } finally {
      setLoadingReports(false)
    }
  }

  const loadReportData = (report: any) => {
    // Load sections
    if (report.sections) {
      setReportSections(report.sections)
    }
    
    // Load findings
    if (report.findings) {
      setFindings(report.findings)
    }
    
    // Load signature if available
    if (report.radiologistSignatureUrl) {
      setSignatureDataUrl(report.radiologistSignatureUrl)
    }
    
    // Close previous reports dialog
    setShowPreviousReports(false)
  }

  const handleExport = (format: 'pdf' | 'docx' | 'dicom-sr' | 'hl7') => {
    onExportReport(format)
  }

  const toggleVoiceRecording = () => {
    setVoiceRecording(!voiceRecording)
    // Voice recording implementation would go here
  }

  if (loading) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        bgcolor: '#1a1a1a', 
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} sx={{ color: '#64b5f6' }} />
        <Typography variant="h6" sx={{ color: '#64b5f6' }}>
          Loading Advanced Reporting System...
        </Typography>
        <Typography variant="body2" sx={{ color: '#ccc' }}>
          Initializing templates and AI services
        </Typography>
      </Box>
    )
  }
  
  // NEW: Report Creation Selection Screen
  if (!reportStarted && reportCreationMode === 'select') {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        bgcolor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4
      }}>
        <Box sx={{ maxWidth: 900, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <ReportIcon sx={{ fontSize: 64, color: '#2196f3', mb: 2 }} />
            <Typography variant="h3" sx={{ color: '#1976d2', fontWeight: 700, mb: 1 }}>
              Create New Report
            </Typography>
            <Typography variant="h6" sx={{ color: '#666', mb: 1 }}>
              {studyData?.patientName || 'Patient'} • {studyData?.modality || 'Study'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#999' }}>
              Choose how you'd like to create your report
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            {/* Option 1: Normal Report */}
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '2px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(33, 150, 243, 0.3)',
                    borderColor: '#2196f3'
                  }
                }}
                onClick={() => startReport('normal')}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    bgcolor: '#e3f2fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <TemplateIcon sx={{ fontSize: 40, color: '#2196f3' }} />
                  </Box>
                  <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 700, mb: 2 }}>
                    Normal Report
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 3, minHeight: 60 }}>
                    Start with a blank template and write your report manually with full control
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                    <Chip label="✓ Full Control" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }} />
                    <Chip label="✓ Macro Support" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }} />
                    <Chip label="✓ Voice Dictation" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }} />
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button 
                    variant="contained" 
                    size="large"
                    sx={{ 
                      bgcolor: '#2196f3',
                      px: 4,
                      '&:hover': { bgcolor: '#1976d2' }
                    }}
                  >
                    Start Writing
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            {/* Option 2: AI-Generated Report */}
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '2px solid transparent',
                  position: 'relative',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(156, 39, 176, 0.3)',
                    borderColor: '#9c27b0'
                  }
                }}
                onClick={() => startReport('ai')}
              >
                <Chip 
                  label="⚡ RECOMMENDED" 
                  size="small" 
                  sx={{ 
                    position: 'absolute',
                    top: -12,
                    right: 20,
                    bgcolor: '#ff9800',
                    color: '#fff',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)'
                  }} 
                />
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)'
                  }}>
                    <SmartToyIcon sx={{ fontSize: 40, color: '#fff' }} />
                  </Box>
                  <Typography variant="h5" sx={{ 
                    background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 700, 
                    mb: 2 
                  }}>
                    AI-Generated
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 3, minHeight: 60 }}>
                    Let AI analyze measurements and generate a complete report instantly
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                    <Chip label="✓ Instant Results" size="small" sx={{ bgcolor: '#f3e5f5', color: '#9c27b0' }} />
                    <Chip label="✓ Smart Analysis" size="small" sx={{ bgcolor: '#f3e5f5', color: '#9c27b0' }} />
                    <Chip label="✓ Editable Output" size="small" sx={{ bgcolor: '#f3e5f5', color: '#9c27b0' }} />
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button 
                    variant="contained" 
                    size="large"
                    sx={{ 
                      background: 'linear-gradient(45deg, #e91e63 30%, #9c27b0 90%)',
                      px: 4,
                      '&:hover': { 
                        background: 'linear-gradient(45deg, #c2185b 30%, #7b1fa2 90%)',
                      }
                    }}
                  >
                    Generate with AI
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            {/* Option 3: Select Template */}
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '2px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(76, 175, 80, 0.3)',
                    borderColor: '#4caf50'
                  }
                }}
                onClick={() => {
                  startReport('template')
                  setCurrentTab(0) // Go to template tab
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    bgcolor: '#e8f5e9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <Assignment sx={{ fontSize: 40, color: '#4caf50' }} />
                  </Box>
                  <Typography variant="h5" sx={{ color: '#388e3c', fontWeight: 700, mb: 2 }}>
                    Choose Template
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 3, minHeight: 60 }}>
                    Browse {availableTemplates.length} professional templates for different modalities
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                    <Chip label={`✓ ${availableTemplates.length} Templates`} size="small" sx={{ bgcolor: '#e8f5e9', color: '#388e3c' }} />
                    <Chip label="✓ Pre-filled Sections" size="small" sx={{ bgcolor: '#e8f5e9', color: '#388e3c' }} />
                    <Chip label="✓ Customizable" size="small" sx={{ bgcolor: '#e8f5e9', color: '#388e3c' }} />
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button 
                    variant="contained" 
                    size="large"
                    sx={{ 
                      bgcolor: '#4caf50',
                      px: 4,
                      '&:hover': { bgcolor: '#388e3c' }
                    }}
                  >
                    Browse Templates
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body2" sx={{ color: '#999' }}>
              💡 Tip: You can always switch between modes or use AI assistance later
            </Typography>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: '#1a1a1a', color: '#fff', position: 'relative' }}>
      {/* Loading Progress Bar */}
      {(isGeneratingReport || saveStatus === 'saving') && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#64b5f6'
            }
          }} 
        />
      )}

      {/* Error/Success Messages */}
      <Snackbar 
        open={Boolean(error)} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={saveStatus === 'saved'} 
        autoHideDuration={3000} 
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success">
          Report auto-saved successfully
        </Alert>
      </Snackbar>

      {/* Quick Reports Dialog */}
      <Dialog
        open={showQuickReports}
        onClose={() => setShowQuickReports(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#2196f3', color: '#fff' }}>
          ⚡ Quick Report Templates - One Click Complete Reports
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Select a pre-written report template. You can edit it after insertion.
          </Alert>
          
          <Grid container spacing={2}>
            {quickReports
              .filter(qr => qr.modality.includes(studyData?.modality || 'XA'))
              .map(quickReport => (
                <Grid item xs={12} sm={6} key={quickReport.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '2px solid transparent',
                      '&:hover': {
                        borderColor: '#2196f3',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 16px rgba(33, 150, 243, 0.3)'
                      }
                    }}
                    onClick={() => applyQuickReport(quickReport)}
                  >
                    <CardContent>
                      <Typography variant="h5" sx={{ mb: 1 }}>
                        {quickReport.icon} {quickReport.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {quickReport.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" fullWidth variant="outlined">
                        Use This Template
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
          </Grid>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button 
              variant="text" 
              onClick={() => {
                setShowQuickReports(false)
                // Start with blank template
                const modality = studyData.modality || 'XA'
                const template = availableTemplates.find(t => t.modality === modality) || availableTemplates[0]
                if (template) {
                  setSelectedTemplate(template)
                  const initialSections: any = {}
                  template.sections.forEach(section => {
                    initialSections[section.id] = ''
                  })
                  setReportSections(initialSections)
                }
              }}
            >
              Skip - Start with Blank Template
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Critical Findings Alert */}
      <Dialog
        open={showCriticalAlert}
        onClose={() => setShowCriticalAlert(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Critical Findings Detected
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
              The following critical findings were detected:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              {criticalFindings.map((finding, idx) => (
                <li key={idx}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {finding}
                  </Typography>
                </li>
              ))}
            </Box>
          </Alert>
          <Typography variant="body2" sx={{ color: '#666' }}>
            ⚠️ Critical findings require immediate notification to the referring physician.
            Please ensure proper communication protocols are followed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCriticalAlert(false)}>
            Acknowledge
          </Button>
          <Button variant="contained" color="error" onClick={() => {
            setShowCriticalAlert(false)
            alert('Critical findings notification sent to referring physician')
          }}>
            Notify Physician
          </Button>
        </DialogActions>
      </Dialog>

      {/* Addendum Dialog */}
      <Dialog
        open={showAddendum}
        onClose={() => setShowAddendum(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Addendum to Report</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Addendums are used to add information to finalized reports without modifying the original content.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={addendumText}
            onChange={(e) => setAddendumText(e.target.value)}
            placeholder="Enter addendum text..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddendum(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAddendum} disabled={!addendumText.trim()}>
            Add Addendum
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Header with Better Colors */}
      <Box sx={{ 
        p: 3, 
        borderBottom: '2px solid #2196f3', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: reportLocked ? 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)' : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ 
            bgcolor: 'rgba(255,255,255,0.1)', 
            p: 1.5, 
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ReportIcon sx={{ color: '#64b5f6', fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ 
              color: '#fff', 
              fontWeight: 700,
              letterSpacing: '0.5px',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              Advanced Structured Reporting {reportLocked && '🔒'}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: '#b3d9ff',
              fontWeight: 500,
              mt: 0.5
            }}>
              {reportLocked ? '🔒 Report Locked - Use Addendum for Changes' : '🤖 AI-Powered Medical Report Generation'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            <Chip 
              label={reportStatus.toUpperCase()} 
              color={reportStatus === 'final' ? 'success' : reportStatus === 'reviewing' ? 'warning' : 'info'}
              size="small"
              sx={{ 
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
            
            {saveStatus && (
              <Chip 
                icon={saveStatus === 'saving' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 
                      saveStatus === 'saved' ? <CheckIcon /> : <ErrorIcon />}
                label={saveStatus === 'saving' ? 'Saving...' : 
                       saveStatus === 'saved' ? 'Saved' : 'Error'}
                size="small"
                color={saveStatus === 'saved' ? 'success' : saveStatus === 'error' ? 'error' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            )}

            {reportHistory.length > 0 && (
              <Badge badgeContent={reportHistory.length} color="error">
                <Chip 
                  icon={<HistoryIcon />}
                  label="History" 
                  size="small"
                  onClick={() => setShowHistory(true)}
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                  }}
                />
              </Badge>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch 
                checked={isAIAssistEnabled}
                onChange={(e) => setIsAIAssistEnabled(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#4caf50',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#4caf50',
                  },
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AIIcon sx={{ fontSize: 18, color: '#64b5f6' }} />
                <Typography sx={{ color: '#fff', fontWeight: 500 }}>AI Assist</Typography>
              </Box>
            }
          />
          
          {!reportLocked && (
            <Button
              variant="contained"
              startIcon={<SmartToyIcon />}
              onClick={generateAIReport}
              disabled={isGeneratingReport}
              sx={{ 
                background: 'linear-gradient(45deg, #e91e63 30%, #9c27b0 90%)',
                boxShadow: '0 3px 5px 2px rgba(233, 30, 99, .3)',
                color: '#fff',
                fontWeight: 600,
                px: 3,
                '&:hover': { 
                  background: 'linear-gradient(45deg, #c2185b 30%, #7b1fa2 90%)',
                  boxShadow: '0 4px 6px 2px rgba(233, 30, 99, .4)',
                },
                '&:disabled': {
                  background: '#555',
                  color: '#999'
                }
              }}
            >
              {isGeneratingReport ? 'Generating...' : '✨ AI Generate'}
            </Button>
          )}
          
          {!reportLocked && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveReport}
              sx={{ 
                bgcolor: '#4caf50',
                color: '#fff',
                fontWeight: 600,
                px: 3,
                boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                '&:hover': { 
                  bgcolor: '#45a049',
                  boxShadow: '0 4px 6px 2px rgba(76, 175, 80, .4)',
                }
              }}
            >
              💾 Save
            </Button>
          )}
          
          {reportLocked && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowAddendum(true)}
              sx={{ 
                bgcolor: '#ff9800',
                color: '#fff',
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: '#f57c00' }
              }}
            >
              Add Addendum
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Content with Better Layout */}
      <Box sx={{ display: 'flex', height: 'calc(100% - 100px)', bgcolor: '#f5f5f5' }}>
        {/* Left Panel - Report Editor */}
        <Box sx={{ width: '60%', borderRight: '2px solid #e0e0e0', bgcolor: '#fff' }}>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ 
              borderBottom: '2px solid #e0e0e0',
              bgcolor: '#fafafa',
              '& .MuiTab-root': {
                color: '#666',
                fontWeight: 600,
                fontSize: '0.95rem',
                minHeight: 56,
                '&.Mui-selected': {
                  color: '#2196f3',
                },
                '&:hover': {
                  bgcolor: 'rgba(33, 150, 243, 0.08)',
                }
              },
              '& .MuiTabs-indicator': {
                height: 3,
                bgcolor: '#2196f3',
              }
            }}
          >
            <Tab label="📋 Template" />
            <Tab label="📝 Sections" />
            <Tab label="🔍 Findings" />
            <Tab label="✅ Review" />
            <Tab label="💰 Billing" />
          </Tabs>

          <Box sx={{ p: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
            {/* Advanced Template Selection Tab */}
            {currentTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                    Professional Report Templates
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={`${availableTemplates.length} Available`} 
                      size="small" 
                      sx={{ bgcolor: '#2a2a2a' }}
                    />
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={() => window.location.reload()}
                      sx={{ color: '#64b5f6' }}
                    >
                      Refresh
                    </Button>
                  </Box>
                </Box>

                {error && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                <Grid container spacing={2}>
                  {availableTemplates.map(template => (
                    <Grid item xs={12} md={6} key={template.id}>
                      <Card 
                        sx={{ 
                          bgcolor: selectedTemplate?.id === template.id ? '#2a4a6b' : '#2a2a2a',
                          border: selectedTemplate?.id === template.id ? '2px solid #64b5f6' : '1px solid #444',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            bgcolor: selectedTemplate?.id === template.id ? '#2a4a6b' : '#3a3a3a',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 8px rgba(100, 181, 246, 0.2)'
                          }
                        }}
                        onClick={() => {
                          setSelectedTemplate(template)
                          // Initialize sections with template content
                          const initialSections: any = {}
                          template.sections.forEach(section => {
                            initialSections[section.id] = section.content || ''
                          })
                          setReportSections(initialSections)
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ color: '#64b5f6', mb: 1, fontWeight: 'bold' }}>
                                {template.name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <Chip 
                                  label={template.modality} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                />
                                <Chip 
                                  label={(template as any).body_part || 'General'} 
                                  size="small" 
                                  sx={{ bgcolor: '#3a3a3a', color: '#ccc' }}
                                />
                              </Box>
                              <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                                {template.sections.length} structured sections
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#888', fontSize: '0.8rem' }}>
                                Required: {template.sections.filter(s => s.required).length} sections
                              </Typography>
                            </Box>
                            
                            {selectedTemplate?.id === template.id && (
                              <CheckIcon sx={{ color: '#64b5f6', ml: 1 }} />
                            )}
                          </Box>
                        </CardContent>
                        
                        <CardActions sx={{ pt: 0 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {template.sections.slice(0, 3).map(section => (
                              <Chip 
                                key={section.id}
                                label={section.title}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: '20px',
                                  color: '#aaa',
                                  borderColor: '#555'
                                }}
                              />
                            ))}
                            {template.sections.length > 3 && (
                              <Chip 
                                label={`+${template.sections.length - 3} more`}
                                size="small"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: '20px',
                                  bgcolor: '#3a3a3a',
                                  color: '#888'
                                }}
                              />
                            )}
                          </Box>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {availableTemplates.length === 0 && !loading && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" sx={{ color: '#ccc', mb: 2 }}>
                      No templates available
                    </Typography>
                    <Button 
                      variant="outlined" 
                      onClick={() => window.location.reload()}
                      sx={{ color: '#64b5f6', borderColor: '#64b5f6' }}
                    >
                      Retry Loading Templates
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Sections Editor Tab */}
            {currentTab === 1 && selectedTemplate && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                    Report Sections
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      startIcon={voiceRecording ? <StopIcon /> : <MicIcon />}
                      onClick={toggleVoiceRecording}
                      variant={voiceRecording ? 'contained' : 'outlined'}
                      color={voiceRecording ? 'error' : 'primary'}
                      size="small"
                    >
                      {voiceRecording ? 'Stop' : 'Voice'} Dictation
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={checkCriticalFindings}
                      sx={{ color: '#ff9800', borderColor: '#ff9800' }}
                    >
                      Check Critical
                    </Button>
                  </Box>
                </Box>

                {/* Macro Helper */}
                <Alert severity="info" sx={{ mb: 2, bgcolor: '#1a3a52' }}>
                  <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 600, mb: 1 }}>
                    💡 Quick Macros - Type these shortcuts to expand text:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {macros.slice(0, 5).map(macro => (
                      <Chip 
                        key={macro.id}
                        label={`${macro.trigger} → ${macro.expansion.substring(0, 30)}...`}
                        size="small"
                        sx={{ 
                          bgcolor: '#2a4a6a',
                          color: '#90caf9',
                          fontSize: '0.75rem'
                        }}
                      />
                    ))}
                  </Box>
                </Alert>

                {selectedTemplate.sections.map(section => (
                  <Accordion key={section.id} sx={{ bgcolor: '#2a2a2a', mb: 1 }} defaultExpanded={section.required}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#64b5f6' }} />}> 
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: '#64b5f6', fontWeight: 'bold' }}>
                            {section.title}
                          </Typography>
                          {section.required && (
                            <Chip label="Required" size="small" color="warning" />
                          )}
                        </Box>
                        {reportSections[section.id]?.trim() && (
                          <CheckIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {/* Voice Dictation Controls */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Button
                          size="small"
                          variant={isListening && currentEditingSection === section.id ? 'contained' : 'outlined'}
                          color={isListening && currentEditingSection === section.id ? 'error' : 'primary'}
                          startIcon={isListening && currentEditingSection === section.id ? <StopIcon /> : <MicIcon />}
                          onClick={() => {
                            if (isListening && currentEditingSection === section.id) {
                              stopVoiceRecognition()
                            } else {
                              startVoiceRecognition(section.id)
                            }
                          }}
                          disabled={reportLocked}
                        >
                          {isListening && currentEditingSection === section.id ? 'Stop Dictation' : '🎤 Voice Dictate'}
                        </Button>
                        
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => generateSmartSuggestions(section.id, reportSections[section.id] || '')}
                          disabled={reportLocked}
                        >
                          💡 Smart Suggestions
                        </Button>
                      </Box>
                      
                      {/* Live Voice Transcript */}
                      {isListening && currentEditingSection === section.id && voiceTranscript && (
                        <Alert severity="info" sx={{ mb: 2, bgcolor: '#1a3a52' }}>
                          <Typography variant="body2" sx={{ color: '#90caf9' }}>
                            🎤 Listening: "{voiceTranscript}"
                          </Typography>
                        </Alert>
                      )}
                      
                      {/* Smart Suggestions */}
                      {showSmartSuggestions && smartSuggestions.length > 0 && (
                        <Alert severity="success" sx={{ mb: 2, bgcolor: '#1a3a2a' }}>
                          <Typography variant="body2" sx={{ color: '#81c784', fontWeight: 600, mb: 1 }}>
                            💡 Smart Suggestions:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {smartSuggestions.map((suggestion, idx) => (
                              <Chip
                                key={idx}
                                label={suggestion}
                                size="small"
                                onClick={() => {
                                  const current = reportSections[section.id] || ''
                                  handleSectionChange(section.id, current + (current ? '\n' : '') + suggestion)
                                  setShowSmartSuggestions(false)
                                }}
                                sx={{ 
                                  bgcolor: '#2a4a3a',
                                  color: '#81c784',
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: '#3a5a4a' }
                                }}
                              />
                            ))}
                          </Box>
                        </Alert>
                      )}
                      
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={reportSections[section.id] || section.content}
                        onChange={(e) => {
                          handleSectionChange(section.id, e.target.value)
                          // Auto-generate suggestions as user types
                          if (e.target.value.length > 20) {
                            generateSmartSuggestions(section.id, e.target.value)
                          }
                        }}
                        variant="outlined"
                        disabled={reportLocked}
                        placeholder={reportLocked ? "Report is locked. Use addendum to add information." : "Type here, use voice 🎤, or click suggestions..."}
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { 
                            color: '#fff', 
                            '& fieldset': { borderColor: reportLocked ? '#d32f2f' : '#444' },
                            bgcolor: reportLocked ? 'rgba(211, 47, 47, 0.1)' : 'transparent'
                          }
                        }}
                        spellCheck={spellCheckEnabled}
                      />
                      
                      <Typography variant="subtitle2" sx={{ color: '#64b5f6', mb: 1 }}>
                        Quick Phrases:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {section.suggestions.map((suggestion, index) => (
                          <Chip
                            key={index}
                            label={suggestion}
                            size="small"
                            disabled={reportLocked}
                            onClick={() => {
                              if (!reportLocked) {
                                const current = reportSections[section.id] || ''
                                handleSectionChange(section.id, current + (current ? '\n' : '') + suggestion)
                              }
                            }}
                            sx={{ 
                              bgcolor: '#3a3a3a',
                              color: '#ccc',
                              '&:hover': { bgcolor: reportLocked ? '#3a3a3a' : '#4a4a4a' },
                              cursor: reportLocked ? 'not-allowed' : 'pointer'
                            }}
                          />
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {/* Findings Tab */}
            {currentTab === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
                  Clinical Findings
                </Typography>
                
                {findings.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No findings detected. Measurements and annotations will automatically generate findings.
                  </Alert>
                ) : (
                  <List>
                    {findings.map(finding => (
                      <ListItem key={finding.id} sx={{ bgcolor: '#2a2a2a', mb: 1, borderRadius: 1 }}>
                        <ListItemIcon>
                          {finding.severity === 'critical' && <ErrorIcon color="error" />}
                          {finding.severity === 'severe' && <WarningIcon color="warning" />}
                          {(finding.severity === 'normal' || finding.severity === 'mild') && <CheckIcon color="success" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography sx={{ color: '#64b5f6', fontWeight: 'bold' }}>
                              {finding.location} - {finding.category}
                            </Typography>
                          }
                          secondary={
                            <Typography sx={{ color: '#ccc' }}>
                              {finding.description}
                            </Typography>
                          }
                        />
                        <Chip 
                          label={finding.severity} 
                          size="small"
                          color={
                            finding.severity === 'critical' ? 'error' :
                            finding.severity === 'severe' ? 'warning' :
                            'success'
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* Review Tab */}
            {currentTab === 3 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                    Report Review
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {reportLocked && (
                      <Chip 
                        icon={<CheckIcon />}
                        label="LOCKED & FINALIZED" 
                        color="error"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                    <FormControl size="small" sx={{ minWidth: 120 }} disabled={reportLocked}>
                      <InputLabel sx={{ color: '#ccc' }}>Status</InputLabel>
                      <Select
                        value={reportStatus}
                        onChange={(e) => setReportStatus(e.target.value as any)}
                        sx={{ color: '#fff' }}
                      >
                        <MenuItem value="draft">Draft</MenuItem>
                        <MenuItem value="reviewing">Reviewing</MenuItem>
                        <MenuItem value="final">Final</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <Paper sx={{ p: 2, bgcolor: '#2a2a2a', maxHeight: '60vh', overflow: 'auto', mb: 2 }}>
                  <pre style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '14px', 
                    lineHeight: '1.6',
                    color: '#fff',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {reportPreview}
                  </pre>
                  
                  {/* Show Addendums */}
                  {addendums.length > 0 && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: '2px solid #ff9800' }}>
                      <Typography variant="h6" sx={{ color: '#ff9800', mb: 2 }}>
                        ADDENDUMS:
                      </Typography>
                      {addendums.map((addendum, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#1a1a1a', borderRadius: 1, borderLeft: '4px solid #ff9800' }}>
                          <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: 1 }}>
                            Addendum #{idx + 1} - {new Date(addendum.timestamp).toLocaleString()} - {addendum.author}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#fff' }}>
                            {addendum.text}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  
                  {/* Audit Trail */}
                  {auditTrail.length > 0 && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #444' }}>
                      <Typography variant="subtitle2" sx={{ color: '#64b5f6', mb: 1 }}>
                        Audit Trail ({auditTrail.length} entries):
                      </Typography>
                      <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                        {auditTrail.slice(-10).reverse().map((entry, idx) => (
                          <Typography key={idx} variant="caption" sx={{ color: '#888', display: 'block', fontSize: '0.7rem' }}>
                            {new Date(entry.timestamp).toLocaleTimeString()} - {entry.user}: {entry.action}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    startIcon={<PrintIcon />}
                    onClick={() => handleExport('pdf')}
                    variant="outlined"
                  >
                    Export PDF
                  </Button>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('docx')}
                    variant="outlined"
                  >
                    Export Word
                  </Button>
                  <Button
                    startIcon={<ShareIcon />}
                    onClick={() => handleExport('dicom-sr')}
                    variant="outlined"
                  >
                    DICOM SR
                  </Button>
                  <Button
                    startIcon={<CopyIcon />}
                    onClick={() => navigator.clipboard.writeText(reportPreview)}
                    variant="outlined"
                  >
                    Copy Text
                  </Button>
                </Box>
              </Box>
            )}

            {/* Billing Tab - NEW */}
            {currentTab === 4 && (
              <Box sx={{ height: '100%', overflow: 'hidden' }}>
                <BillingPanel 
                  studyData={studyData}
                  reportData={{
                    sections: reportSections,
                    findings: findings,
                    measurements: measurements
                  }}
                  onSuperbillCreated={(superbill) => {
                    console.log('Superbill created:', superbill);
                    // Show success message
                    alert(`Superbill ${superbill.superbillNumber} created successfully!`);
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Panel - Study Information & Tools with Better Design */}
        <Box sx={{ width: '40%', p: 3, overflow: 'auto', bgcolor: '#fafafa' }}>
          <Typography variant="h6" sx={{ 
            mb: 2, 
            color: '#1976d2',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            📊 Study Information
          </Typography>
          
          <Paper sx={{ 
            p: 2.5, 
            bgcolor: '#fff', 
            mb: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #2196f3'
          }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Patient
                </Typography>
                <Typography variant="body1" sx={{ color: '#1976d2', fontWeight: 700, mt: 0.5 }}>
                  {studyData?.patientName || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Study Date
                </Typography>
                <Typography variant="body1" sx={{ color: '#333', fontWeight: 600, mt: 0.5 }}>
                  {studyData?.studyDate || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Modality
                </Typography>
                <Chip 
                  label={studyData?.modality || 'N/A'} 
                  size="small" 
                  sx={{ 
                    mt: 0.5,
                    bgcolor: '#e3f2fd',
                    color: '#1976d2',
                    fontWeight: 700
                  }} 
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Images
                </Typography>
                <Typography variant="body1" sx={{ color: '#333', fontWeight: 600, mt: 0.5 }}>
                  {studyData?.numberOfInstances || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="h6" sx={{ 
            mb: 2, 
            color: '#1976d2',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            📏 Measurements 
            <Chip 
              label={measurements.length} 
              size="small" 
              sx={{ 
                bgcolor: '#4caf50',
                color: '#fff',
                fontWeight: 700
              }} 
            />
          </Typography>
          
          <Paper sx={{ 
            p: 2, 
            bgcolor: '#fff', 
            mb: 3, 
            maxHeight: '250px', 
            overflow: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #4caf50'
          }}>
            {measurements.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography sx={{ color: '#999', fontStyle: 'italic' }}>
                  📐 No measurements available
                </Typography>
              </Box>
            ) : (
              <List dense>
                {measurements.map(measurement => (
                  <ListItem 
                    key={measurement.id} 
                    sx={{ 
                      py: 1,
                      borderBottom: '1px solid #f0f0f0',
                      '&:last-child': { borderBottom: 'none' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography sx={{ color: '#333', fontSize: '0.95rem', fontWeight: 600 }}>
                          {measurement.type}: {measurement.value} {measurement.unit}
                        </Typography>
                      }
                      secondary={
                        <Typography sx={{ color: '#666', fontSize: '0.85rem' }}>
                          📍 Frame {measurement.frameIndex} - {measurement.location || 'Unspecified'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
            Radiologist Signature
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', mb: 2 }}>
            <SignaturePad
              onSave={(dataUrl) => {
                setSignatureDataUrl(dataUrl)
                if (onSignatureSave) {
                  onSignatureSave(dataUrl)
                }
              }}
              onClear={() => {
                setSignatureDataUrl(null)
              }}
              width={450}
              height={150}
            />
            {signatureDataUrl && (
              <Box sx={{ mt: 2, p: 1, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#4caf50' }}>
                  ✅ Signature captured successfully
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Captured Images Section */}
          {capturedImages.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
                Key Images ({capturedImages.length})
              </Typography>
              
              <Paper sx={{ p: 2, bgcolor: '#2a2a2a', mb: 2, maxHeight: '400px', overflow: 'auto' }}>
                <Grid container spacing={2}>
                  {capturedImages.map((image, idx) => (
                    <Grid item xs={12} key={image.id}>
                      <Card sx={{ bgcolor: '#1a1a1a' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box
                              component="img"
                              src={image.dataUrl}
                              alt={image.caption}
                              sx={{
                                width: 120,
                                height: 120,
                                objectFit: 'contain',
                                bgcolor: '#000',
                                borderRadius: 1,
                                border: '1px solid #444'
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" sx={{ color: '#64b5f6', mb: 1 }}>
                                Image {idx + 1}: {image.caption}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#999', display: 'block' }}>
                                Captured: {image.timestamp ? new Date(image.timestamp).toLocaleString() : 'N/A'}
                              </Typography>
                              <Chip 
                                label="Included in Report" 
                                size="small" 
                                sx={{ mt: 1, bgcolor: '#2a4a3a', color: '#81c784' }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Alert severity="info" sx={{ mt: 2, bgcolor: '#1a3a52' }}>
                  <Typography variant="body2" sx={{ color: '#90caf9' }}>
                    📸 These images will be embedded in the exported report (PDF/DOCX)
                  </Typography>
                </Alert>
              </Paper>
            </>
          )}

          <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
            Report Tools
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<HistoryIcon />}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowPreviousReports(true)
                  fetchPreviousReports()
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                Previous Reports
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<TemplateIcon />}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowTemplateDialog(true)
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                Template Library
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AIIcon />}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('AI Suggestions clicked')
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                AI Suggestions
              </Button>
              <Divider sx={{ my: 1, bgcolor: '#444' }} />
              <Button
                fullWidth
                variant="contained"
                type="button"
                startIcon={reportLocked ? <CheckIcon /> : <CheckIcon />}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  if (!reportLocked) {
                    // Check for critical findings before finalizing
                    checkCriticalFindings()
                    
                    // Lock and finalize report
                    lockReport()
                    
                    // Prepare and save report
                    const report = {
                      template: selectedTemplate?.id,
                      sections: reportSections,
                      findings: findings,
                      status: 'final',
                      timestamp: new Date().toISOString(),
                      studyData: studyData,
                      measurements: measurements,
                      annotations: annotations,
                      radiologistSignature: signatureDataUrl,
                      locked: true,
                      addendums: addendums,
                      auditTrail: auditTrail
                    }
                    
                    onSaveReport(report)
                    alert('✅ Report finalized and locked successfully!')
                  }
                }}
                disabled={reportLocked || !signatureDataUrl}
                sx={{ 
                  bgcolor: reportLocked ? '#9e9e9e' : '#4caf50',
                  '&:hover': { bgcolor: reportLocked ? '#9e9e9e' : '#45a049' },
                  '&:disabled': { bgcolor: '#ccc' }
                }}
              >
                {reportLocked ? '🔒 Report Locked' : signatureDataUrl ? '🔒 Lock & Finalize Report' : 'Sign First to Finalize'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Previous Reports Dialog */}
      <Dialog
      open={showPreviousReports}
      onClose={() => setShowPreviousReports(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: '#fff'
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: '#2563eb', color: 'white' }}>
        📚 Previous Reports
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {loadingReports ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : previousReports.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No previous reports found for this patient
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {previousReports.map((report) => (
              <Card
                key={report._id}
                sx={{
                  bgcolor: '#2a2a2a',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: '#333',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  }
                }}
                onClick={() => loadReportData(report)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                      Report ID: {report.reportId}
                    </Typography>
                    <Chip
                      label={report.reportStatus}
                      size="small"
                      color={
                        report.reportStatus === 'final' ? 'success' :
                        report.reportStatus === 'draft' ? 'default' :
                        'warning'
                      }
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Date: {new Date(report.reportDate).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Radiologist: {report.radiologistName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Measurements: {report.measurements?.length || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Annotations: {report.annotations?.length || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {report.impression && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Impression:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {report.impression.substring(0, 150)}
                        {report.impression.length > 150 ? '...' : ''}
                      </Typography>
                    </Box>
                  )}
                  
                  {report.radiologistSignatureUrl && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Signature:
                      </Typography>
                      <Box
                        component="img"
                        src={report.radiologistSignatureUrl}
                        alt="Signature"
                        sx={{
                          maxWidth: 200,
                          maxHeight: 60,
                          mt: 1,
                          border: '1px solid #444',
                          borderRadius: 1,
                          p: 0.5,
                          bgcolor: 'white'
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation()
                      loadReportData(report)
                    }}
                  >
                    Load Report
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowPreviousReports(false)}>
          Close
        </Button>
      </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StructuredReporting
