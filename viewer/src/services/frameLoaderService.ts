/**
 * Enhanced Frame Loader Service
 * Provides series-aware frame loading with intelligent caching and preloading
 * 
 * Requirements covered:
 * - 3.1: Series-specific API endpoint usage
 * - 3.2: Series-aware caching organized by study and series identifiers
 * - 3.3: Intelligent preloading for adjacent frames within series
 * - 3.4: Separate frame counts for each series
 * - 7.1: Prioritize loading first frame immediately
 * - 7.2: Preload adjacent frames in background
 * - 7.3: Cache memory management with eviction policies
 * - 7.4: Memory usage limits
 */

export interface CacheStats {
  totalFrames: number
  memoryUsageMB: number
  hitRate: number
  seriesCount: number
  oldestFrameAge: number
}

export interface SeriesFrameMetadata {
  seriesInstanceUID: string
  seriesNumber: number
  seriesDescription: string
  modality: string
  numberOfInstances: number
}

export interface FrameCacheEntry {
  bitmap: ImageBitmap
  lastAccessed: number
  accessCount: number
  sizeBytes: number
  studyUID: string
  seriesUID: string
  frameIndex: number
}

export interface PreloadRequest {
  studyUID: string
  seriesUID: string
  frameIndex: number
  priority: number
}

export interface FrameLoaderConfig {
  maxCacheSize: number // Maximum number of frames to cache
  maxMemoryMB: number // Maximum memory usage in MB
  preloadCount: number // Number of adjacent frames to preload
  evictionBatchSize: number // Number of frames to evict at once
  requestTimeout: number // Request timeout in milliseconds
  retryAttempts: number // Number of retry attempts
  retryDelay: number // Base delay for exponential backoff
}

class FrameLoaderService {
  private static readonly DEFAULT_CONFIG: FrameLoaderConfig = {
    maxCacheSize: 100,
    maxMemoryMB: 512,
    preloadCount: 3,
    evictionBatchSize: 10,
    requestTimeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  }

  private cache = new Map<string, FrameCacheEntry>()
  private seriesMetadata = new Map<string, SeriesFrameMetadata>()
  private preloadQueue: PreloadRequest[] = []
  private isPreloading = false
  private config: FrameLoaderConfig
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  }

  constructor(config: Partial<FrameLoaderConfig> = {}) {
    this.config = { ...FrameLoaderService.DEFAULT_CONFIG, ...config }
    console.log('✅ FrameLoaderService initialized with config:', this.config)
  }

  /**
   * Initialize series metadata for frame loading
   */
  initializeSeries(studyUID: string, seriesData: SeriesFrameMetadata[]): void {
    // Clear existing metadata for the study
    for (const [key, metadata] of this.seriesMetadata.entries()) {
      if (key.startsWith(`${studyUID}-`)) {
        this.seriesMetadata.delete(key)
      }
    }

    // Add new series metadata
    seriesData.forEach(series => {
      const key = `${studyUID}-${series.seriesInstanceUID}`
      this.seriesMetadata.set(key, series)
    })

    console.log(`✅ Initialized ${seriesData.length} series for study ${studyUID}`)
  }

  /**
   * Load a specific frame with series-aware caching
   * Requirement 3.1: Uses series-specific API endpoints
   * Requirement 3.2: Series-aware caching
   */
  async loadFrame(
    studyUID: string, 
    seriesUID: string, 
    frameIndex: number,
    dicomWebBaseUrl: string = '/api/dicom'
  ): Promise<ImageBitmap | null> {
    this.stats.totalRequests++
    
    // Generate cache key with series information
    const cacheKey = this.generateCacheKey(studyUID, seriesUID, frameIndex)
    
    // Check cache first
    const cachedEntry = this.cache.get(cacheKey)
    if (cachedEntry) {
      // Update access statistics
      cachedEntry.lastAccessed = Date.now()
      cachedEntry.accessCount++
      this.stats.cacheHits++
      
      console.log(`✅ Cache hit for ${cacheKey}`)
      return cachedEntry.bitmap
    }

    this.stats.cacheMisses++
    
    try {
      // Load frame using series-specific endpoint
      const bitmap = await this.fetchFrameWithRetry(
        studyUID, 
        seriesUID, 
        frameIndex, 
        dicomWebBaseUrl
      )
      
      if (bitmap) {
        // Cache the loaded frame
        await this.cacheFrame(studyUID, seriesUID, frameIndex, bitmap)
        
        // Trigger intelligent preloading for adjacent frames
        this.schedulePreloading(studyUID, seriesUID, frameIndex)
        
        console.log(`✅ Loaded and cached frame ${frameIndex} for series ${seriesUID}`)
        return bitmap
      }
    } catch (error) {
      console.error(`❌ Failed to load frame ${frameIndex} for series ${seriesUID}:`, error)
    }
    
    return null
  }

  /**
   * Preload multiple frames for a series
   * Requirement 3.3: Intelligent preloading
   * Requirement 7.1: Prioritize first frame
   * Requirement 7.2: Background preloading
   */
  async preloadFrames(
    studyUID: string, 
    seriesUID: string, 
    startIndex: number, 
    count: number,
    dicomWebBaseUrl: string = '/api/dicom'
  ): Promise<void> {
    const seriesKey = `${studyUID}-${seriesUID}`
    const seriesInfo = this.seriesMetadata.get(seriesKey)
    
    if (!seriesInfo) {
      console.warn(`Series metadata not found for ${seriesKey}`)
      return
    }

    const maxFrames = seriesInfo.numberOfInstances
    const endIndex = Math.min(startIndex + count, maxFrames)
    
    // Create preload requests with priority (lower index = higher priority)
    for (let i = startIndex; i < endIndex; i++) {
      const cacheKey = this.generateCacheKey(studyUID, seriesUID, i)
      
      // Skip if already cached
      if (this.cache.has(cacheKey)) {
        continue
      }
      
      // Calculate priority (closer to start index = higher priority)
      const priority = Math.abs(i - startIndex)
      
      this.preloadQueue.push({
        studyUID,
        seriesUID,
        frameIndex: i,
        priority
      })
    }
    
    // Sort by priority (lower number = higher priority)
    this.preloadQueue.sort((a, b) => a.priority - b.priority)
    
    // Start preloading if not already running
    if (!this.isPreloading) {
      this.processPreloadQueue(dicomWebBaseUrl)
    }
    
    console.log(`✅ Queued ${endIndex - startIndex} frames for preloading in series ${seriesUID}`)
  }

  /**
   * Clear cache for a specific series
   */
  clearSeriesCache(seriesUID: string): void {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.seriesUID === seriesUID) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => {
      const entry = this.cache.get(key)
      if (entry) {
        // Clean up ImageBitmap to free memory
        entry.bitmap.close()
        this.cache.delete(key)
      }
    })
    
    console.log(`✅ Cleared cache for series ${seriesUID} (${keysToDelete.length} frames)`)
  }

  /**
   * Clear cache for a specific study
   */
  clearStudyCache(studyUID: string): void {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.studyUID === studyUID) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => {
      const entry = this.cache.get(key)
      if (entry) {
        entry.bitmap.close()
        this.cache.delete(key)
      }
    })
    
    console.log(`✅ Cleared cache for study ${studyUID} (${keysToDelete.length} frames)`)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const totalFrames = this.cache.size
    let totalMemoryBytes = 0
    let oldestTimestamp = Date.now()
    const seriesSet = new Set<string>()
    
    for (const entry of this.cache.values()) {
      totalMemoryBytes += entry.sizeBytes
      oldestTimestamp = Math.min(oldestTimestamp, entry.lastAccessed)
      seriesSet.add(entry.seriesUID)
    }
    
    const hitRate = this.stats.totalRequests > 0 
      ? this.stats.cacheHits / this.stats.totalRequests 
      : 0
    
    return {
      totalFrames,
      memoryUsageMB: totalMemoryBytes / (1024 * 1024),
      hitRate,
      seriesCount: seriesSet.size,
      oldestFrameAge: Date.now() - oldestTimestamp
    }
  }

  /**
   * Force cache cleanup to free memory
   * Requirement 7.3: Cache eviction policies
   * Requirement 7.4: Memory limits
   */
  forceCleanup(): void {
    const stats = this.getCacheStats()
    
    if (stats.memoryUsageMB > this.config.maxMemoryMB || stats.totalFrames > this.config.maxCacheSize) {
      this.evictOldFrames(this.config.evictionBatchSize)
      console.log(`✅ Forced cache cleanup completed`)
    }
  }

  /**
   * Generate cache key for frame identification
   */
  private generateCacheKey(studyUID: string, seriesUID: string, frameIndex: number): string {
    return `${studyUID}-${seriesUID}-${frameIndex}`
  }

  /**
   * Fetch frame with retry logic and exponential backoff
   */
  private async fetchFrameWithRetry(
    studyUID: string,
    seriesUID: string,
    frameIndex: number,
    dicomWebBaseUrl: string
  ): Promise<ImageBitmap | null> {
    const frameUrl = `${dicomWebBaseUrl}/studies/${studyUID}/series/${seriesUID}/frames/${frameIndex}`
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(frameUrl, { 
          signal: AbortSignal.timeout(this.config.requestTimeout) 
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const blob = await response.blob()
        const bitmap = await createImageBitmap(blob)
        
        return bitmap
      } catch (error) {
        const isLastAttempt = attempt === this.config.retryAttempts - 1
        
        if (isLastAttempt) {
          throw error
        }
        
        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        console.warn(`Retry attempt ${attempt + 1} for frame ${frameIndex} after ${delay}ms delay`)
      }
    }
    
    return null
  }

  /**
   * Cache a loaded frame with memory management
   */
  private async cacheFrame(
    studyUID: string,
    seriesUID: string,
    frameIndex: number,
    bitmap: ImageBitmap
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(studyUID, seriesUID, frameIndex)
    
    // Estimate frame size (width * height * 4 bytes per pixel for RGBA)
    const estimatedSize = bitmap.width * bitmap.height * 4
    
    const entry: FrameCacheEntry = {
      bitmap,
      lastAccessed: Date.now(),
      accessCount: 1,
      sizeBytes: estimatedSize,
      studyUID,
      seriesUID,
      frameIndex
    }
    
    // Check if we need to evict frames before adding new one
    const currentStats = this.getCacheStats()
    const projectedMemoryMB = (currentStats.memoryUsageMB * 1024 * 1024 + estimatedSize) / (1024 * 1024)
    
    if (currentStats.totalFrames >= this.config.maxCacheSize || 
        projectedMemoryMB > this.config.maxMemoryMB) {
      this.evictOldFrames(this.config.evictionBatchSize)
    }
    
    this.cache.set(cacheKey, entry)
  }

  /**
   * Evict old frames using LRU policy
   */
  private evictOldFrames(count: number): void {
    // Sort entries by last accessed time (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
    
    const toEvict = entries.slice(0, Math.min(count, entries.length))
    
    toEvict.forEach(([key, entry]) => {
      entry.bitmap.close() // Free ImageBitmap memory
      this.cache.delete(key)
    })
    
    console.log(`✅ Evicted ${toEvict.length} old frames from cache`)
  }

  /**
   * Schedule intelligent preloading for adjacent frames
   */
  private schedulePreloading(studyUID: string, seriesUID: string, currentFrame: number): void {
    const seriesKey = `${studyUID}-${seriesUID}`
    const seriesInfo = this.seriesMetadata.get(seriesKey)
    
    if (!seriesInfo) {
      return
    }
    
    const maxFrames = seriesInfo.numberOfInstances
    const preloadCount = this.config.preloadCount
    
    // Calculate range of frames to preload (centered around current frame)
    const startFrame = Math.max(0, currentFrame - Math.floor(preloadCount / 2))
    const endFrame = Math.min(maxFrames, currentFrame + Math.ceil(preloadCount / 2) + 1)
    
    // Add frames to preload queue
    for (let i = startFrame; i < endFrame; i++) {
      if (i === currentFrame) continue // Skip current frame
      
      const cacheKey = this.generateCacheKey(studyUID, seriesUID, i)
      if (this.cache.has(cacheKey)) continue // Skip already cached frames
      
      const priority = Math.abs(i - currentFrame) // Closer frames have higher priority
      
      // Check if already in queue
      const existingIndex = this.preloadQueue.findIndex(
        req => req.studyUID === studyUID && 
               req.seriesUID === seriesUID && 
               req.frameIndex === i
      )
      
      if (existingIndex === -1) {
        this.preloadQueue.push({
          studyUID,
          seriesUID,
          frameIndex: i,
          priority
        })
      }
    }
    
    // Sort queue by priority
    this.preloadQueue.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Process the preload queue in background
   */
  private async processPreloadQueue(dicomWebBaseUrl: string): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return
    }
    
    this.isPreloading = true
    
    try {
      while (this.preloadQueue.length > 0) {
        const request = this.preloadQueue.shift()
        if (!request) break
        
        const cacheKey = this.generateCacheKey(
          request.studyUID, 
          request.seriesUID, 
          request.frameIndex
        )
        
        // Skip if already cached (might have been loaded by user request)
        if (this.cache.has(cacheKey)) {
          continue
        }
        
        try {
          const bitmap = await this.fetchFrameWithRetry(
            request.studyUID,
            request.seriesUID,
            request.frameIndex,
            dicomWebBaseUrl
          )
          
          if (bitmap) {
            await this.cacheFrame(
              request.studyUID,
              request.seriesUID,
              request.frameIndex,
              bitmap
            )
          }
          
          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 50))
          
        } catch (error) {
          console.warn(`Preload failed for frame ${request.frameIndex}:`, error)
        }
      }
    } finally {
      this.isPreloading = false
    }
    
    console.log('✅ Preload queue processing completed')
  }

  /**
   * Get debug information about the service state
   */
  getDebugInfo(): any {
    const stats = this.getCacheStats()
    
    return {
      config: this.config,
      stats: {
        ...this.stats,
        ...stats
      },
      cache: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys()).slice(0, 10) // First 10 keys for debugging
      },
      preloadQueue: {
        size: this.preloadQueue.length,
        isProcessing: this.isPreloading,
        nextItems: this.preloadQueue.slice(0, 5) // First 5 items for debugging
      },
      seriesMetadata: {
        count: this.seriesMetadata.size,
        series: Array.from(this.seriesMetadata.keys())
      }
    }
  }
}

// Export singleton instance
export const frameLoaderService = new FrameLoaderService()
export default frameLoaderService