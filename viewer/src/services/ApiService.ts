/**
 * API Service for handling backend communication
 * Uses environment variables for proper URL configuration
 */

// Get backend URL from environment variables
const getBackendUrl = (): string => {
  // In development, use relative URLs to leverage Vite proxy
  if (import.meta.env && import.meta.env.DEV) {
    return '' // Use relative URLs for proxy
  }

  // In production, use environment variables
  const backendUrl = (import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
    (import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) ||
    'http://localhost:8001'

  return backendUrl
}

const BACKEND_URL = getBackendUrl()

const extractFilenameFromDisposition = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) return null
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return asciiMatch?.[1] || null
}

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json()
    const baseMessage = payload?.message || payload?.error || `Request failed (${response.status})`
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfterPayload = payload?.retryAfter
    const retryAfter = Number(retryAfterPayload ?? retryAfterHeader)

    if (response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
      return `${baseMessage}. Try again in ${Math.ceil(retryAfter)}s.`
    }

    return baseMessage
  } catch {
    return `Request failed (${response.status})`
  }
}

const triggerDownloadFromResponse = async (
  response: Response,
  fallbackFilename: string
) => {
  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = extractFilenameFromDisposition(response.headers.get('content-disposition')) || fallbackFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

const downloadWithProgress = async (
  url: string,
  token: string | null,
  fallbackFilename: string,
  onProgress?: (percent: number) => void,
  useNativeDownload: boolean = false // New parameter for browser native download
) => {
  // Use browser's native download dialog
  if (useNativeDownload) {
    return new Promise<void>((resolve, reject) => {
      try {
        // Create a temporary link element
        const link = document.createElement('a')
        
        // Add token to URL if available
        const downloadUrl = token 
          ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
          : url
        
        link.href = downloadUrl
        link.download = fallbackFilename
        link.style.display = 'none'
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Simulate progress for UI feedback
        if (onProgress) {
          onProgress(100)
        }
        
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  // Original XHR implementation for progress tracking
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'blob'
    xhr.withCredentials = true
    let pseudoProgress = 0
    let realProgress = 0
    let pseudoTimer: number | null = null
    let receivedDownloadBytes = false
    let sawComputableProgress = false
    let lastLoadedBytes = 0
    let lastProgressEventAt = Date.now()

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    if (onProgress) {
      onProgress(0)
      // Keep UI responsive during long server-side preparation.
      pseudoTimer = window.setInterval(() => {
        const now = Date.now()
        const stalledMs = now - lastProgressEventAt

        if (!receivedDownloadBytes) {
          if (pseudoProgress < 35) pseudoProgress += 1
          else if (pseudoProgress < 70) pseudoProgress += 0.75
          else if (pseudoProgress < 85) pseudoProgress += 0.4
          else if (pseudoProgress < 95) pseudoProgress += 0.15
          else if (pseudoProgress < 98) pseudoProgress += 0.08
        } else if (sawComputableProgress) {
          // If computable download stalls (common with slow server/socket buffering),
          // keep slight forward movement instead of freezing.
          if (stalledMs > 1500 && pseudoProgress < 99) {
            pseudoProgress += 0.2
          }
        } else if (pseudoProgress < 99) {
          // Bytes started but total size not computable.
          pseudoProgress += 0.3
        }

        // Keep fractional internal progress so small increments can accumulate.
        pseudoProgress = Math.min(99, pseudoProgress)
        onProgress(Math.max(Math.round(pseudoProgress), realProgress))
      }, 700)
    }

    xhr.onprogress = (event) => {
      if (!onProgress) return
      receivedDownloadBytes = receivedDownloadBytes || event.loaded > 0
      if (event.loaded > lastLoadedBytes) {
        lastLoadedBytes = event.loaded
        lastProgressEventAt = Date.now()
      }

      if (event.lengthComputable && event.total > 0) {
        sawComputableProgress = true
        realProgress = Math.min(99, Math.round((event.loaded / event.total) * 100))
        onProgress(Math.max(pseudoProgress, realProgress))
        return
      }

      // Non-computable stream: keep pseudo movement alive.
      if (event.loaded > 0) {
        onProgress(Math.max(pseudoProgress, realProgress))
      }
    }

    xhr.onload = async () => {
      if (pseudoTimer !== null) {
        window.clearInterval(pseudoTimer)
        pseudoTimer = null
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Request failed (${xhr.status})`
        try {
          const payload = JSON.parse(xhr.responseText)
          message = payload?.message || payload?.error || message
        } catch {
          // Keep fallback message
        }
        reject(new Error(message))
        return
      }

      const blob = xhr.response
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download =
        extractFilenameFromDisposition(xhr.getResponseHeader('content-disposition')) ||
        fallbackFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      if (onProgress) {
        onProgress(100)
      }
      resolve()
    }

    xhr.onerror = () => {
      if (pseudoTimer !== null) {
        window.clearInterval(pseudoTimer)
      }
      reject(new Error('Network error during export download'))
    }
    xhr.onabort = () => {
      if (pseudoTimer !== null) {
        window.clearInterval(pseudoTimer)
      }
      reject(new Error('Export download aborted'))
    }
    xhr.send()
  })
}

/**
 * Get auth token from storage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
}

/**
 * Get CSRF token from cookie
 */
export const getCSRFToken = (): string | null => {
  const name = 'XSRF-TOKEN';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    const token = parts.pop()?.split(';').shift();
    // Extract just the token value (before the signature)
    return token?.split('.')[0] || null;
  }
  
  return null;
}

/**
 * Make an API call to the backend
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${BACKEND_URL}${endpoint}`

  console.log(`API Call: ${options.method || 'GET'} ${url}`)

  // Get auth token
  const token = getAuthToken()

  // Get CSRF token for state-changing operations
  const csrfToken = getCSRFToken()

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Send cookies
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET') && { 'X-XSRF-TOKEN': csrfToken }),
      ...options.headers,
    },
  })

  return response
}

/**
 * Upload files to backend
 */
export const uploadFile = async (
  endpoint: string,
  file: File
): Promise<Response> => {
  const url = `${BACKEND_URL}${endpoint}`

  console.log(`File Upload: POST ${url}`)

  const formData = new FormData()
  formData.append('file', file)

  // Get auth token
  const token = getAuthToken()
  
  // Get CSRF token for POST request
  const csrfToken = getCSRFToken()

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include', // Send cookies
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(csrfToken && { 'X-XSRF-TOKEN': csrfToken }),
    },
  })

  return response
}

/**
 * Get available studies
 */
export const getStudies = async () => {
  const response = await apiCall('/api/dicom/studies')
  return response.json()
}

/**
 * Get study metadata with series details
 */
export const getStudyMetadata = async (studyUID: string) => {
  const response = await apiCall(`/api/dicom/studies/${studyUID}/metadata`)
  return response.json()
}

/**
 * Get study detailed metadata
 */
export const getStudyDetailedMetadata = async (studyUID: string) => {
  const response = await apiCall(`/api/dicom/studies/${studyUID}/metadata`)
  return response.json()
}

/**
 * Upload DICOM file
 */
export const uploadDicomFile = async (file: File) => {
  const response = await uploadFile('/api/dicom/upload', file)
  return response.json()
}

/**
 * Upload ZIP file containing DICOM study
 * All DICOM files in ZIP are grouped under single StudyInstanceUID for 3D reconstruction
 */
export const uploadZipStudy = async (
  file: File,
  options?: {
    forceUnifiedStudy?: boolean
    patientID?: string
    patientName?: string
    onProgress?: (progress: number) => void
  }
) => {
  const url = `${BACKEND_URL}/api/dicom/upload/zip`
  const formData = new FormData()
  formData.append('file', file)

  if (options?.forceUnifiedStudy) {
    formData.append('forceUnifiedStudy', 'true')
  }
  if (options?.patientID) {
    formData.append('patientID', options.patientID)
  }
  if (options?.patientName) {
    formData.append('patientName', options.patientName)
  }

  console.log(`ZIP Upload: POST ${url}`)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    if (options?.onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          options.onProgress?.(progress)
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (error) {
          reject(new Error('Failed to parse response'))
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject(new Error(error.message || 'Upload failed'))
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })

    xhr.open('POST', url)
    xhr.send(formData)
  })
}

/**
 * Get ZIP upload capabilities and info
 */
export const getZipUploadInfo = async () => {
  const response = await apiCall('/api/dicom/upload/zip/info')
  return response.json()
}

/**
 * Get frame image URL
 */
export const getFrameImageUrl = (studyUID: string, frameIndex: number, seriesUID?: string): string => {
  if (seriesUID) {
    return `${BACKEND_URL}/api/dicom/studies/${studyUID}/series/${seriesUID}/frames/${frameIndex}`
  }
  return `${BACKEND_URL}/api/dicom/studies/${studyUID}/frames/${frameIndex}`
}

/**
 * Get patients list
 */
export const getPatients = async () => {
  const response = await apiCall('/api/patients')
  return response.json()
}

/**
 * Get studies for a patient
 */
export const getPatientStudies = async (patientID: string) => {
  const response = await apiCall(`/api/patients/${patientID}/studies`)
  return response.json()
}

export const createPatient = async (patient: { patientID?: string; patientName?: string; birthDate?: string; sex?: string }) => {
  const response = await apiCall('/api/patients', {
    method: 'POST',
    body: JSON.stringify(patient),
  })
  return response.json()
}

/**
 * Upload DICOM file for a specific patient (includes patient fields)
 */
export const uploadDicomFileForPatient = async (file: File, patientID: string, patientName?: string) => {
  const url = `${BACKEND_URL}/api/dicom/upload`
  const formData = new FormData()

  // Append file with explicit filename to preserve extension
  formData.append('file', file, file.name)
  formData.append('patientID', patientID)
  if (patientName) formData.append('patientName', patientName)

  const token = getAuthToken()

  console.log('📤 Uploading DICOM file:', {
    name: file.name,
    size: file.size,
    type: file.type
  })

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      // Don't set Content-Type - let browser set it with boundary
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  const result = await response.json()
  console.log('📥 Upload response:', result)
  return result
}

/**
 * Upload DICOM study files to PACS server
 * Supports multiple files for batch upload
 */
export const uploadPacsStudy = async (files: File[]) => {
  const url = `${BACKEND_URL}/api/pacs/upload`
  const formData = new FormData()

  // Append all files with 'dicom' field name (required by backend)
  files.forEach((file) => {
    formData.append('dicom', file)
  })

  const token = getAuthToken()

  console.log('📤 Uploading PACS study:', {
    fileCount: files.length,
    files: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
    totalSize: files.reduce((sum, f) => sum + f.size, 0)
  })

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      // Don't set Content-Type - let browser set it with boundary
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ PACS upload failed:', errorText)
    try {
      const errorJson = JSON.parse(errorText)
      throw new Error(errorJson.message || 'Upload failed')
    } catch {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }
  }

  const result = await response.json()
  console.log('📥 PACS upload response:', result)
  return result
}

/**
 * Orthanc Viewer API - Direct access to Orthanc data
 */

/**
 * Get all studies from Orthanc
 */
export const getOrthancStudies = async () => {
  const response = await apiCall('/api/viewer/studies')
  return response.json()
}

/**
 * Search studies in Orthanc
 */
export const searchOrthancStudies = async (query: string) => {
  const response = await apiCall(`/api/viewer/studies/search?q=${encodeURIComponent(query)}`)
  return response.json()
}

/**
 * Get study details from Orthanc
 */
export const getOrthancStudy = async (studyId: string) => {
  const response = await apiCall(`/api/viewer/studies/${studyId}`)
  return response.json()
}

/**
 * Get series details from Orthanc
 */
export const getOrthancSeries = async (seriesId: string) => {
  const response = await apiCall(`/api/viewer/series/${seriesId}`)
  return response.json()
}

/**
 * Get Orthanc statistics
 */
export const getOrthancStats = async () => {
  const response = await apiCall('/api/viewer/stats')
  return response.json()
}

/**
 * Get Orthanc instance preview URL
 */
export const getOrthancInstancePreviewUrl = (instanceId: string): string => {
  return `http://69.62.70.102:8042/instances/${instanceId}/preview`
}

/**
 * Get Orthanc instance image URL
 */
export const getOrthancInstanceImageUrl = (instanceId: string): string => {
  return `http://69.62.70.102:8042/instances/${instanceId}/image-uint8`
}

/**
 * Get Orthanc series preview URL
 */
export const getOrthancSeriesPreviewUrl = (seriesId: string): string => {
  return `http://69.62.70.102:8042/series/${seriesId}/preview`
}

/**
 * Medical AI API Methods (UNIFIED - All AI calls route through backend)
 */

/**
 * Analyze study with AI via backend (proxied to AI services)
 * This is the ONLY way to call AI services - no direct calls allowed
 */
export const analyzeStudyWithAI = async (
  studyInstanceUID: string,
  frameIndex: number = 0,
  patientContext?: any,
  imageData?: string
) => {
  const response = await apiCall('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({
      studyInstanceUID,
      frameIndex,
      patientContext,
      imageData
    })
  })
  return response.json()
}

/**
 * Classify image with MedSigLIP
 */
export const classifyImageWithAI = async (
  studyInstanceUID: string,
  frameIndex: number = 0
) => {
  const response = await apiCall('/api/medical-ai/classify-image', {
    method: 'POST',
    body: JSON.stringify({
      studyInstanceUID,
      frameIndex
    })
  })
  return response.json()
}

/**
 * Generate radiology report with MedGemma
 */
export const generateAIReport = async (
  studyInstanceUID: string,
  frameIndex: number = 0,
  patientContext?: any
) => {
  const response = await apiCall('/api/medical-ai/generate-report', {
    method: 'POST',
    body: JSON.stringify({
      studyInstanceUID,
      frameIndex,
      patientContext
    })
  })
  return response.json()
}

/**
 * Find similar images using MedSigLIP
 */
export const findSimilarImages = async (
  studyInstanceUID: string,
  frameIndex: number = 0,
  topK: number = 5
) => {
  const response = await apiCall('/api/medical-ai/find-similar', {
    method: 'POST',
    body: JSON.stringify({
      studyInstanceUID,
      frameIndex,
      topK
    })
  })
  return response.json()
}

/**
 * Summarize medical text with MedGemma
 */
export const summarizeMedicalText = async (
  text: string,
  summaryType: 'brief' | 'detailed' | 'bullet_points' = 'brief'
) => {
  const response = await apiCall('/api/medical-ai/summarize-text', {
    method: 'POST',
    body: JSON.stringify({
      text,
      summaryType
    })
  })
  return response.json()
}

/**
 * Get saved AI analysis for a study
 */
export const getStudyAIAnalysis = async (studyInstanceUID: string) => {
  const response = await apiCall(`/api/medical-ai/study/${studyInstanceUID}/analysis`)
  return response.json()
}

/**
 * Check AI services health
 */
export const checkAIHealth = async () => {
  const response = await apiCall('/api/medical-ai/health')
  return response.json()
}

/**
 * Export API Methods
 */

/**
 * Export patient data with all studies and DICOM files
 */
export const exportPatientData = async (
  patientID: string,
  includeImages: boolean = true,
  format: 'zip' | 'json' = 'zip',
  onProgress?: (percent: number) => void,
  useNativeDownload: boolean = true // Default to browser native download
) => {
  const url = `${BACKEND_URL}/api/export/patient/${patientID}?includeImages=${includeImages}&format=${format}`
  const token = getAuthToken()

  // Use XHR for progress support, especially for large ZIP exports.
  if (format === 'zip') {
    await downloadWithProgress(url, token, `patient_${patientID}_export.${format}`, onProgress, useNativeDownload)
    return { success: true }
  }

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  await triggerDownloadFromResponse(response, `patient_${patientID}_export.${format}`)

  return { success: true }
}

/**
 * Export study data with DICOM files
 */
export const exportStudyData = async (
  studyUID: string,
  includeImages: boolean = true,
  format: 'zip' | 'json' = 'zip',
  onProgress?: (percent: number) => void,
  useNativeDownload: boolean = true // Default to browser native download
) => {
  const url = `${BACKEND_URL}/api/export/study/${studyUID}?includeImages=${includeImages}&format=${format}`
  const token = getAuthToken()

  if (format === 'zip') {
    await downloadWithProgress(url, token, `study_${studyUID}_export.${format}`, onProgress, useNativeDownload)
    return { success: true }
  }

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  await triggerDownloadFromResponse(response, `study_${studyUID}_export.${format}`)

  return { success: true }
}

/**
 * Export all data (bulk export)
 */
export const exportAllData = async (includeImages: boolean = false) => {
  const url = `${BACKEND_URL}/api/export/all?includeImages=${includeImages}`
  const token = getAuthToken()

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  await triggerDownloadFromResponse(response, 'complete_export.zip')

  return { success: true }
}

export const exportAndBurnToCD = async ({
  targetType,
  targetId,
  includeImages = true,
  driveLetter,
  signal,
}: {
  targetType: 'patient' | 'study'
  targetId: string
  includeImages?: boolean
  driveLetter?: string
  signal?: AbortSignal
}) => {
  const token = getAuthToken()
  const response = await fetch(`${BACKEND_URL}/api/export/burn`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      targetType,
      targetId,
      includeImages,
      burnToCd: true,
      driveLetter,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export const directBurnToCD = async ({
  targetType,
  targetId,
  includeImages = true,
  includeViewer = true,
  driveLetter,
  signal,
}: {
  targetType: 'patient' | 'study'
  targetId: string
  includeImages?: boolean
  includeViewer?: boolean
  driveLetter?: string
  signal?: AbortSignal
}) => {
  const token = getAuthToken()
  const response = await fetch(`${BACKEND_URL}/api/export/direct-burn`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      targetType,
      targetId,
      includeImages,
      includeViewer,
      driveLetter,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export const clearActiveBurns = async () => {
  const token = getAuthToken()
  const response = await fetch(`${BACKEND_URL}/api/export/clear-burns`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export const createDicomIsoDownload = async ({
  targetType,
  targetId,
  orthancStudyId,
  includeImages = true,
  includeViewer = true,
  onProgress,
  useNativeDownload = true,
  signal,
}: {
  targetType: 'patient' | 'study' | 'orthanc-study'
  targetId: string
  orthancStudyId?: string
  includeImages?: boolean
  includeViewer?: boolean
  onProgress?: (percent: number) => void
  useNativeDownload?: boolean
  signal?: AbortSignal
}) => {
  const token = getAuthToken()
  const exportTargetId = orthancStudyId || targetId
  const safeFileType = targetType === 'orthanc-study' ? 'study' : targetType

  // Browser-native download avoids buffering the entire ISO in JS memory.
  // Keep POST + fetch fallback when caller needs AbortSignal control.
  if (!signal && useNativeDownload) {
    const params = new URLSearchParams({
      targetType,
      targetId: exportTargetId,
      includeImages: String(includeImages),
      includeViewer: String(includeViewer),
    })
    if (orthancStudyId) {
      params.set('orthancStudyId', orthancStudyId)
    }
    const validationParams = new URLSearchParams(params)
    validationParams.set('validateOnly', 'true')
    const validationUrl = `${BACKEND_URL}/api/export/create-iso?${validationParams.toString()}`
    const validationResponse = await fetch(validationUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (validationResponse.ok) {
      const downloadUrl = `${BACKEND_URL}/api/export/create-iso?${params.toString()}`
      await downloadWithProgress(
        downloadUrl,
        token,
        `${safeFileType}_${exportTargetId}_dicom_media.iso`,
        onProgress,
        true
      )
      return { success: true }
    }

    // Backward compatibility: live backend might not yet expose GET /create-iso.
    if (validationResponse.status !== 404 && validationResponse.status !== 405) {
      throw new Error(await parseErrorMessage(validationResponse))
    }
  }

  const response = await fetch(`${BACKEND_URL}/api/export/create-iso`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      targetType,
      targetId: exportTargetId,
      orthancStudyId: orthancStudyId || undefined,
      includeImages,
      includeViewer,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  await triggerDownloadFromResponse(response, `${safeFileType}_${exportTargetId}_dicom_media.iso`)
  return { success: true }
}

export const getActiveBurnStatus = async () => {
  const token = getAuthToken()
  const response = await fetch(`${BACKEND_URL}/api/export/burn-status`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export const getActiveIsoStatus = async () => {
  const token = getAuthToken()
  const response = await fetch(`${BACKEND_URL}/api/export/iso-status`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export const getDirectBurnViewerStatus = async () => {
  const token = getAuthToken()
  const response = await fetch(`${BACKEND_URL}/api/export/viewer-status`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export const installDirectBurnViewer = async (forceReinstall: boolean = false) => {
  const token = getAuthToken()
  const response = await fetch(`${BACKEND_URL}/api/export/viewer-install`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ forceReinstall }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export const runDirectBurnViewer = async () => {
  const token = getAuthToken()
  const response = await fetch(`${BACKEND_URL}/api/export/viewer-run`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export default {
  apiCall,
  uploadFile,
  getStudies,
  getStudyMetadata,
  getStudyDetailedMetadata,
  uploadDicomFile,
  uploadZipStudy,
  getZipUploadInfo,
  getFrameImageUrl,
  getPatients,
  getPatientStudies,
  createPatient,
  uploadDicomFileForPatient,
  uploadPacsStudy,
  // Orthanc Viewer API
  getOrthancStudies,
  searchOrthancStudies,
  getOrthancStudy,
  getOrthancSeries,
  getOrthancStats,
  getOrthancInstancePreviewUrl,
  getOrthancInstanceImageUrl,
  getOrthancSeriesPreviewUrl,
  // Medical AI API
  analyzeStudyWithAI,
  classifyImageWithAI,
  generateAIReport,
  findSimilarImages,
  summarizeMedicalText,
  getStudyAIAnalysis,
  checkAIHealth,
  // Export API
  exportPatientData,
  exportStudyData,
  exportAndBurnToCD,
  createDicomIsoDownload,
  exportAllData,
  getActiveBurnStatus,
  getActiveIsoStatus,
  getDirectBurnViewerStatus,
  installDirectBurnViewer,
  runDirectBurnViewer,
  // Follow-up API
  getFollowUps: async (filters = {}) => {
    const response = await apiCall('/api/follow-ups', {
      method: 'GET',
    })
    return response.json()
  },
  getFollowUp: async (id: string) => {
    const response = await apiCall(`/api/follow-ups/${id}`)
    return response.json()
  },
  createFollowUp: async (data: any) => {
    const response = await apiCall('/api/follow-ups', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.json()
  },
  updateFollowUp: async (id: string, data: any) => {
    const response = await apiCall(`/api/follow-ups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  },
  deleteFollowUp: async (id: string) => {
    const response = await apiCall(`/api/follow-ups/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },
  scheduleFollowUp: async (id: string, scheduledDate: string) => {
    const response = await apiCall(`/api/follow-ups/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledDate }),
    })
    return response.json()
  },
  completeFollowUp: async (id: string) => {
    const response = await apiCall(`/api/follow-ups/${id}/complete`, {
      method: 'POST',
    })
    return response.json()
  },
  addFollowUpNote: async (id: string, text: string) => {
    const response = await apiCall(`/api/follow-ups/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
    return response.json()
  },
  getOverdueFollowUps: async () => {
    const response = await apiCall('/api/follow-ups/overdue')
    return response.json()
  },
  getUpcomingFollowUps: async (days = 7) => {
    const response = await apiCall(`/api/follow-ups/upcoming?days=${days}`)
    return response.json()
  },
  getFollowUpStatistics: async () => {
    const response = await apiCall('/api/follow-ups/statistics')
    return response.json()
  },
  generateFollowUpFromReport: async (reportId: string) => {
    const response = await apiCall(`/api/follow-ups/generate/${reportId}`, {
      method: 'POST',
    })
    return response.json()
  },
  getFollowUpRecommendations: async (reportId: string) => {
    const response = await apiCall(`/api/follow-ups/recommendations/${reportId}`)
    return response.json()
  },
  // User Management API
  getUsers: async () => {
    const response = await apiCall('/api/users')
    return response.json()
  },
  getUser: async (id: string) => {
    const response = await apiCall(`/api/users/${id}`)
    return response.json()
  },
  createUser: async (userData: any) => {
    const response = await apiCall('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    return response.json()
  },
  updateUser: async (id: string, userData: any) => {
    const response = await apiCall(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
    return response.json()
  },
  deleteUser: async (id: string) => {
    const response = await apiCall(`/api/users/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },
  toggleUserStatus: async (id: string) => {
    const response = await apiCall(`/api/users/${id}/toggle-status`, {
      method: 'POST',
    })
    return response.json()
  },
  resetUserPassword: async (id: string, newPassword: string) => {
    const response = await apiCall(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    })
    return response.json()
  },
  // Prior Authorization API
  getPriorAuths: async (filters?: any) => {
    const queryParams = new URLSearchParams(filters).toString()
    const response = await apiCall(`/api/prior-auth${queryParams ? `?${queryParams}` : ''}`)
    return response.json()
  },
  getPriorAuth: async (id: string) => {
    const response = await apiCall(`/api/prior-auth/${id}`)
    return response.json()
  },
  createPriorAuth: async (data: any) => {
    const response = await apiCall('/api/prior-auth', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.json()
  },
  updatePriorAuth: async (id: string, data: any) => {
    const response = await apiCall(`/api/prior-auth/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  },
  approvePriorAuth: async (id: string, notes?: string) => {
    const response = await apiCall(`/api/prior-auth/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewNotes: notes }),
    })
    return response.json()
  },
  denyPriorAuth: async (id: string, reason: string, notes?: string) => {
    const response = await apiCall(`/api/prior-auth/${id}/deny`, {
      method: 'POST',
      body: JSON.stringify({ denialReason: reason, reviewNotes: notes }),
    })
    return response.json()
  },
  requestMoreInfo: async (id: string, requestedInfo: string) => {
    const response = await apiCall(`/api/prior-auth/${id}/request-info`, {
      method: 'POST',
      body: JSON.stringify({ requestedInfo }),
    })
    return response.json()
  },
  addPriorAuthNote: async (id: string, note: string) => {
    const response = await apiCall(`/api/prior-auth/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    })
    return response.json()
  },
  getPriorAuthStats: async () => {
    const response = await apiCall('/api/prior-auth/stats/dashboard')
    return response.json()
  },
  uploadPriorAuthDocument: async (id: string, file: File) => {
    const response = await uploadFile(`/api/prior-auth/${id}/documents`, file)
    return response.json()
  },
  // AI Assistant API
  checkAIAssistantHealth: async () => {
    const response = await apiCall('/api/reports/ai/health')
    return response.json()
  },
  analyzeReportWithAI: async (reportId: string, analysisType: 'full' | 'impression' | 'critical' = 'full') => {
    const response = await apiCall(`/api/reports/${reportId}/ai-analyze`, {
      method: 'POST',
      body: JSON.stringify({ analysisType }),
    })
    return response.json()
  },
  generateImpressionWithAI: async (reportId: string) => {
    const response = await apiCall(`/api/reports/${reportId}/ai-impression`, {
      method: 'POST',
    })
    return response.json()
  },
  suggestTemplateFieldsWithAI: async (templateId: string, studyMetadata: any) => {
    const response = await apiCall(`/api/reports/templates/${templateId}/ai-suggest`, {
      method: 'POST',
      body: JSON.stringify({ studyMetadata }),
    })
    return response.json()
  },
  // Telemetry API
  logTelemetryEvent: async (eventData: any) => {
    const response = await apiCall('/api/telemetry/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    })
    return response.json()
  },
  logTelemetryEventsBatch: async (events: any[]) => {
    const response = await apiCall('/api/telemetry/events/batch', {
      method: 'POST',
      body: JSON.stringify({ events }),
    })
    return response.json()
  },
  // Analytics API
  getReportAnalytics: async (startDate?: string, endDate?: string, filters?: any) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (filters?.modality) params.append('modality', filters.modality)
    if (filters?.hospitalId) params.append('hospitalId', filters.hospitalId)
    
    const response = await apiCall(`/api/analytics/reports?${params.toString()}`)
    return response.json()
  },
  getUserAnalytics: async (userId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (userId) params.append('userId', userId)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await apiCall(`/api/analytics/users?${params.toString()}`)
    return response.json()
  },
  getTemplateAnalytics: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await apiCall(`/api/analytics/templates?${params.toString()}`)
    return response.json()
  },
  getPerformanceAnalytics: async (modality?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (modality) params.append('modality', modality)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await apiCall(`/api/analytics/performance?${params.toString()}`)
    return response.json()
  },
  getAIAnalytics: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await apiCall(`/api/analytics/ai?${params.toString()}`)
    return response.json()
  },
  getSystemAnalytics: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await apiCall(`/api/analytics/system?${params.toString()}`)
    return response.json()
  },
  getDashboardAnalytics: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await apiCall(`/api/analytics/dashboard?${params.toString()}`)
    return response.json()
  },
}
