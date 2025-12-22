/**
 * Series State Management Service
 * Handles series selection, frame positions, and session persistence for series-wise image loading
 */

export interface SeriesInfo {
  seriesInstanceUID: string
  seriesNumber: number
  seriesDescription: string
  modality: string
  numberOfInstances: number
  instances?: InstanceInfo[]
}

export interface InstanceInfo {
  sopInstanceUID: string
  instanceNumber: number
  frameIndex: number
}

export interface SeriesNavigationState {
  currentSeriesUID: string | null
  seriesFramePositions: Map<string, number>
  seriesMetadata: Map<string, SeriesInfo>
  totalSeriesCount: number
  studyInstanceUID: string | null
}

export interface SeriesSessionData {
  studyInstanceUID: string
  currentSeriesUID: string | null
  seriesFramePositions: Record<string, number>
  seriesMetadata: Record<string, SeriesInfo>
  totalSeriesCount: number
  lastUpdated: number
}

class SeriesStateManager {
  private static readonly SESSION_STORAGE_KEY = 'series_state_manager'
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours
  
  private navigationState: SeriesNavigationState = {
    currentSeriesUID: null,
    seriesFramePositions: new Map(),
    seriesMetadata: new Map(),
    totalSeriesCount: 0,
    studyInstanceUID: null
  }

  /**
   * Initialize the series state manager with study data
   */
  initializeStudy(studyInstanceUID: string, seriesData: SeriesInfo[]): void {
    // Clear previous study data
    this.resetSeriesState()
    
    // Set up new study state
    this.navigationState.studyInstanceUID = studyInstanceUID
    this.navigationState.totalSeriesCount = seriesData.length
    
    // Initialize series metadata
    seriesData.forEach(series => {
      this.navigationState.seriesMetadata.set(series.seriesInstanceUID, series)
      // Initialize frame position to 0 for each series
      this.navigationState.seriesFramePositions.set(series.seriesInstanceUID, 0)
    })
    
    // Set default series (first series)
    if (seriesData.length > 0) {
      this.navigationState.currentSeriesUID = seriesData[0].seriesInstanceUID
    }
    
    // Try to restore from session storage
    this.restoreFromSessionStorage()
    
    // Persist initial state
    this.persistToSessionStorage()
    
    console.log(`✅ Series state initialized for study ${studyInstanceUID} with ${seriesData.length} series`)
  }

  /**
   * Get the currently selected series UID
   */
  getCurrentSeries(): string | null {
    return this.navigationState.currentSeriesUID
  }

  /**
   * Set the current series and persist to session storage
   */
  setCurrentSeries(seriesUID: string): void {
    if (!this.navigationState.seriesMetadata.has(seriesUID)) {
      console.warn(`Series ${seriesUID} not found in metadata`)
      return
    }
    
    this.navigationState.currentSeriesUID = seriesUID
    this.persistToSessionStorage()
    
    console.log(`✅ Current series set to ${seriesUID}`)
  }

  /**
   * Get the current frame position for a specific series
   */
  getCurrentFrame(seriesUID: string): number {
    return this.navigationState.seriesFramePositions.get(seriesUID) || 0
  }

  /**
   * Set the current frame position for a specific series
   */
  setCurrentFrame(seriesUID: string, frameIndex: number): void {
    const seriesInfo = this.navigationState.seriesMetadata.get(seriesUID)
    if (!seriesInfo) {
      console.warn(`Series ${seriesUID} not found in metadata`)
      return
    }
    
    // Validate frame index bounds
    const maxFrames = seriesInfo.numberOfInstances
    const validatedFrameIndex = Math.max(0, Math.min(frameIndex, maxFrames - 1))
    
    this.navigationState.seriesFramePositions.set(seriesUID, validatedFrameIndex)
    this.persistToSessionStorage()
    
    console.log(`✅ Frame position for series ${seriesUID} set to ${validatedFrameIndex}`)
  }

  /**
   * Get the total number of frames for a specific series
   */
  getSeriesFrameCount(seriesUID: string): number {
    const seriesInfo = this.navigationState.seriesMetadata.get(seriesUID)
    return seriesInfo?.numberOfInstances || 0
  }

  /**
   * Get series metadata for a specific series
   */
  getSeriesMetadata(seriesUID: string): SeriesInfo | null {
    return this.navigationState.seriesMetadata.get(seriesUID) || null
  }

  /**
   * Get all series metadata for the current study
   */
  getAllSeriesMetadata(): SeriesInfo[] {
    return Array.from(this.navigationState.seriesMetadata.values())
  }

  /**
   * Get the complete navigation state
   */
  getNavigationState(): SeriesNavigationState {
    return {
      ...this.navigationState,
      seriesFramePositions: new Map(this.navigationState.seriesFramePositions),
      seriesMetadata: new Map(this.navigationState.seriesMetadata)
    }
  }

  /**
   * Check if a series exists in the current study
   */
  hasSeriesData(seriesUID: string): boolean {
    return this.navigationState.seriesMetadata.has(seriesUID)
  }

  /**
   * Get the current study instance UID
   */
  getCurrentStudy(): string | null {
    return this.navigationState.studyInstanceUID
  }

  /**
   * Reset all series state (used when starting a new study)
   */
  resetSeriesState(): void {
    this.navigationState = {
      currentSeriesUID: null,
      seriesFramePositions: new Map(),
      seriesMetadata: new Map(),
      totalSeriesCount: 0,
      studyInstanceUID: null
    }
    
    // Clear session storage for the current study
    this.clearSessionStorage()
    
    console.log('✅ Series state reset')
  }

  /**
   * Persist current state to session storage
   */
  private persistToSessionStorage(): void {
    if (!this.navigationState.studyInstanceUID) {
      return
    }
    
    try {
      const sessionData: SeriesSessionData = {
        studyInstanceUID: this.navigationState.studyInstanceUID,
        currentSeriesUID: this.navigationState.currentSeriesUID,
        seriesFramePositions: Object.fromEntries(this.navigationState.seriesFramePositions),
        seriesMetadata: Object.fromEntries(this.navigationState.seriesMetadata),
        totalSeriesCount: this.navigationState.totalSeriesCount,
        lastUpdated: Date.now()
      }
      
      sessionStorage.setItem(SeriesStateManager.SESSION_STORAGE_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.error('Failed to persist series state to session storage:', error)
    }
  }

  /**
   * Restore state from session storage
   */
  private restoreFromSessionStorage(): void {
    if (!this.navigationState.studyInstanceUID) {
      return
    }
    
    try {
      const storedData = sessionStorage.getItem(SeriesStateManager.SESSION_STORAGE_KEY)
      if (!storedData) {
        return
      }
      
      const sessionData: SeriesSessionData = JSON.parse(storedData)
      
      // Check if the stored data is for the current study and not expired
      if (sessionData.studyInstanceUID !== this.navigationState.studyInstanceUID) {
        return
      }
      
      const isExpired = Date.now() - sessionData.lastUpdated > SeriesStateManager.SESSION_TIMEOUT
      if (isExpired) {
        this.clearSessionStorage()
        return
      }
      
      // Restore state
      if (sessionData.currentSeriesUID && this.navigationState.seriesMetadata.has(sessionData.currentSeriesUID)) {
        this.navigationState.currentSeriesUID = sessionData.currentSeriesUID
      }
      
      // Restore frame positions for existing series
      Object.entries(sessionData.seriesFramePositions).forEach(([seriesUID, frameIndex]) => {
        if (this.navigationState.seriesMetadata.has(seriesUID)) {
          this.navigationState.seriesFramePositions.set(seriesUID, frameIndex)
        }
      })
      
      console.log(`✅ Series state restored from session storage for study ${sessionData.studyInstanceUID}`)
    } catch (error) {
      console.error('Failed to restore series state from session storage:', error)
      this.clearSessionStorage()
    }
  }

  /**
   * Clear session storage
   */
  private clearSessionStorage(): void {
    try {
      sessionStorage.removeItem(SeriesStateManager.SESSION_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear series state from session storage:', error)
    }
  }

  /**
   * Get frame navigation boundaries for the current series
   */
  getCurrentSeriesNavigationBounds(): { minFrame: number; maxFrame: number; currentFrame: number } | null {
    const currentSeries = this.getCurrentSeries()
    if (!currentSeries) {
      return null
    }
    
    const frameCount = this.getSeriesFrameCount(currentSeries)
    const currentFrame = this.getCurrentFrame(currentSeries)
    
    return {
      minFrame: 0,
      maxFrame: frameCount - 1,
      currentFrame
    }
  }

  /**
   * Navigate to the next frame in the current series
   */
  navigateToNextFrame(): boolean {
    const currentSeries = this.getCurrentSeries()
    if (!currentSeries) {
      return false
    }
    
    const bounds = this.getCurrentSeriesNavigationBounds()
    if (!bounds || bounds.currentFrame >= bounds.maxFrame) {
      return false
    }
    
    this.setCurrentFrame(currentSeries, bounds.currentFrame + 1)
    return true
  }

  /**
   * Navigate to the previous frame in the current series
   */
  navigateToPreviousFrame(): boolean {
    const currentSeries = this.getCurrentSeries()
    if (!currentSeries) {
      return false
    }
    
    const bounds = this.getCurrentSeriesNavigationBounds()
    if (!bounds || bounds.currentFrame <= bounds.minFrame) {
      return false
    }
    
    this.setCurrentFrame(currentSeries, bounds.currentFrame - 1)
    return true
  }

  /**
   * Navigate to a specific frame in the current series
   */
  navigateToFrame(frameIndex: number): boolean {
    const currentSeries = this.getCurrentSeries()
    if (!currentSeries) {
      return false
    }
    
    const bounds = this.getCurrentSeriesNavigationBounds()
    if (!bounds || frameIndex < bounds.minFrame || frameIndex > bounds.maxFrame) {
      return false
    }
    
    this.setCurrentFrame(currentSeries, frameIndex)
    return true
  }

  /**
   * Get debug information about the current state
   */
  getDebugInfo(): any {
    return {
      studyInstanceUID: this.navigationState.studyInstanceUID,
      currentSeriesUID: this.navigationState.currentSeriesUID,
      totalSeriesCount: this.navigationState.totalSeriesCount,
      seriesCount: this.navigationState.seriesMetadata.size,
      framePositions: Object.fromEntries(this.navigationState.seriesFramePositions),
      seriesMetadata: Object.fromEntries(
        Array.from(this.navigationState.seriesMetadata.entries()).map(([uid, info]) => [
          uid,
          {
            seriesNumber: info.seriesNumber,
            description: info.seriesDescription,
            modality: info.modality,
            frameCount: info.numberOfInstances
          }
        ])
      )
    }
  }
}

// Export singleton instance
export const seriesStateManager = new SeriesStateManager()
export default seriesStateManager