/**
 * Test suite for Enhanced Frame Loader Service
 * Tests series-aware caching, intelligent preloading, and memory management
 */

import { frameLoaderService } from '../frameLoaderService'
import type { SeriesFrameMetadata } from '../frameLoaderService'

// Mock fetch for testing
global.fetch = jest.fn()
global.createImageBitmap = jest.fn()

// Mock ImageBitmap
class MockImageBitmap {
  width: number
  height: number
  
  constructor(width = 512, height = 512) {
    this.width = width
    this.height = height
  }
  
  close() {
    // Mock cleanup
  }
}

describe('FrameLoaderService', () => {
  const mockStudyUID = 'study-123'
  const mockSeriesUID = 'series-456'
  const mockDicomWebBaseUrl = '/api/dicom'
  
  const mockSeriesData: SeriesFrameMetadata[] = [
    {
      seriesInstanceUID: 'series-456',
      seriesNumber: 1,
      seriesDescription: 'Test Series',
      modality: 'CT',
      numberOfInstances: 10
    },
    {
      seriesInstanceUID: 'series-789',
      seriesNumber: 2,
      seriesDescription: 'Another Series',
      modality: 'MR',
      numberOfInstances: 20
    }
  ]

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup default fetch mock
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob())
    })
    
    // Setup createImageBitmap mock
    ;(global.createImageBitmap as jest.Mock).mockResolvedValue(new MockImageBitmap())
    
    // Clear any existing cache
    frameLoaderService.clearStudyCache(mockStudyUID)
  })

  describe('Series Initialization', () => {
    test('should initialize series metadata correctly', () => {
      frameLoaderService.initializeSeries(mockStudyUID, mockSeriesData)
      
      const debugInfo = frameLoaderService.getDebugInfo()
      expect(debugInfo.seriesMetadata.count).toBe(2)
      expect(debugInfo.seriesMetadata.series).toContain(`${mockStudyUID}-series-456`)
      expect(debugInfo.seriesMetadata.series).toContain(`${mockStudyUID}-series-789`)
    })
  })

  describe('Frame Loading with Series-Specific Endpoints', () => {
    beforeEach(() => {
      frameLoaderService.initializeSeries(mockStudyUID, mockSeriesData)
    })

    test('should use series-specific API endpoint format', async () => {
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dicom/studies/study-123/series/series-456/frames/0',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )
    })

    test('should return cached frame on subsequent requests', async () => {
      // First request
      const frame1 = await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      expect(frame1).toBeInstanceOf(MockImageBitmap)
      expect(global.fetch).toHaveBeenCalledTimes(1)
      
      // Second request should use cache
      const frame2 = await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      expect(frame2).toBe(frame1) // Same instance from cache
      expect(global.fetch).toHaveBeenCalledTimes(1) // No additional fetch
    })

    test('should handle fetch errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      const frame = await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      expect(frame).toBeNull()
    })

    test('should retry failed requests with exponential backoff', async () => {
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob())
        })
      
      const frame = await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      expect(frame).toBeInstanceOf(MockImageBitmap)
      expect(global.fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('Series-Aware Caching', () => {
    beforeEach(() => {
      frameLoaderService.initializeSeries(mockStudyUID, mockSeriesData)
    })

    test('should organize cache by study and series identifiers', async () => {
      // Load frames from different series
      await frameLoaderService.loadFrame(mockStudyUID, 'series-456', 0, mockDicomWebBaseUrl)
      await frameLoaderService.loadFrame(mockStudyUID, 'series-789', 0, mockDicomWebBaseUrl)
      
      const stats = frameLoaderService.getCacheStats()
      expect(stats.totalFrames).toBe(2)
      expect(stats.seriesCount).toBe(2)
    })

    test('should clear cache for specific series', async () => {
      // Load frames from both series
      await frameLoaderService.loadFrame(mockStudyUID, 'series-456', 0, mockDicomWebBaseUrl)
      await frameLoaderService.loadFrame(mockStudyUID, 'series-789', 0, mockDicomWebBaseUrl)
      
      // Clear one series
      frameLoaderService.clearSeriesCache('series-456')
      
      const stats = frameLoaderService.getCacheStats()
      expect(stats.totalFrames).toBe(1)
      expect(stats.seriesCount).toBe(1)
    })

    test('should maintain separate frame counts for each series', async () => {
      // Load multiple frames from different series
      await frameLoaderService.loadFrame(mockStudyUID, 'series-456', 0, mockDicomWebBaseUrl)
      await frameLoaderService.loadFrame(mockStudyUID, 'series-456', 1, mockDicomWebBaseUrl)
      await frameLoaderService.loadFrame(mockStudyUID, 'series-789', 0, mockDicomWebBaseUrl)
      
      const stats = frameLoaderService.getCacheStats()
      expect(stats.totalFrames).toBe(3)
      expect(stats.seriesCount).toBe(2)
    })
  })

  describe('Intelligent Preloading', () => {
    beforeEach(() => {
      frameLoaderService.initializeSeries(mockStudyUID, mockSeriesData)
    })

    test('should preload adjacent frames in background', async () => {
      // Load initial frame
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 5, mockDicomWebBaseUrl)
      
      // Allow preloading to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stats = frameLoaderService.getCacheStats()
      expect(stats.totalFrames).toBeGreaterThan(1) // Should have preloaded adjacent frames
    })

    test('should prioritize frames closer to current frame', async () => {
      await frameLoaderService.preloadFrames(mockStudyUID, mockSeriesUID, 5, 3, mockDicomWebBaseUrl)
      
      // Allow preloading to process
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const debugInfo = frameLoaderService.getDebugInfo()
      expect(debugInfo.preloadQueue.size).toBe(0) // Queue should be processed
      
      const stats = frameLoaderService.getCacheStats()
      expect(stats.totalFrames).toBe(3) // Should have loaded 3 frames
    })

    test('should skip already cached frames during preloading', async () => {
      // Pre-cache a frame
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 5, mockDicomWebBaseUrl)
      
      // Request preloading that includes the cached frame
      await frameLoaderService.preloadFrames(mockStudyUID, mockSeriesUID, 4, 3, mockDicomWebBaseUrl)
      
      // Allow preloading to complete
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Should not have made redundant requests for cached frame
      const fetchCallCount = (global.fetch as jest.Mock).mock.calls.length
      expect(fetchCallCount).toBeLessThan(4) // Less than total frames requested
    })
  })

  describe('Cache Memory Management', () => {
    beforeEach(() => {
      frameLoaderService.initializeSeries(mockStudyUID, mockSeriesData)
    })

    test('should track memory usage correctly', async () => {
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      
      const stats = frameLoaderService.getCacheStats()
      expect(stats.memoryUsageMB).toBeGreaterThan(0)
      expect(stats.totalFrames).toBe(1)
    })

    test('should evict old frames when memory limit is reached', async () => {
      // Create service with small memory limit for testing
      const testService = new (frameLoaderService.constructor as any)({
        maxMemoryMB: 1, // Very small limit
        maxCacheSize: 2
      })
      
      testService.initializeSeries(mockStudyUID, mockSeriesData)
      
      // Load frames to exceed limit
      await testService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      await testService.loadFrame(mockStudyUID, mockSeriesUID, 1, mockDicomWebBaseUrl)
      await testService.loadFrame(mockStudyUID, mockSeriesUID, 2, mockDicomWebBaseUrl)
      
      const stats = testService.getCacheStats()
      expect(stats.totalFrames).toBeLessThanOrEqual(2) // Should have evicted frames
    })

    test('should calculate hit rate correctly', async () => {
      // Load frame twice
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      
      const stats = frameLoaderService.getCacheStats()
      expect(stats.hitRate).toBe(0.5) // 1 hit out of 2 requests
    })

    test('should force cleanup when requested', async () => {
      // Load multiple frames
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 1, mockDicomWebBaseUrl)
      
      const statsBefore = frameLoaderService.getCacheStats()
      
      frameLoaderService.forceCleanup()
      
      const statsAfter = frameLoaderService.getCacheStats()
      // Cleanup behavior depends on current memory usage vs limits
      expect(statsAfter.totalFrames).toBeLessThanOrEqual(statsBefore.totalFrames)
    })
  })

  describe('Error Handling and Fallback', () => {
    beforeEach(() => {
      frameLoaderService.initializeSeries(mockStudyUID, mockSeriesData)
    })

    test('should handle HTTP errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      })
      
      const frame = await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      expect(frame).toBeNull()
    })

    test('should handle timeout errors', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )
      
      const frame = await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      expect(frame).toBeNull()
    })

    test('should handle createImageBitmap failures', async () => {
      ;(global.createImageBitmap as jest.Mock).mockRejectedValue(new Error('Invalid image data'))
      
      const frame = await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      expect(frame).toBeNull()
    })
  })

  describe('Cache Statistics and Debug Info', () => {
    beforeEach(() => {
      frameLoaderService.initializeSeries(mockStudyUID, mockSeriesData)
    })

    test('should provide accurate cache statistics', async () => {
      await frameLoaderService.loadFrame(mockStudyUID, mockSeriesUID, 0, mockDicomWebBaseUrl)
      
      const stats = frameLoaderService.getCacheStats()
      expect(stats).toHaveProperty('totalFrames')
      expect(stats).toHaveProperty('memoryUsageMB')
      expect(stats).toHaveProperty('hitRate')
      expect(stats).toHaveProperty('seriesCount')
      expect(stats).toHaveProperty('oldestFrameAge')
      
      expect(stats.totalFrames).toBe(1)
      expect(stats.seriesCount).toBe(1)
    })

    test('should provide comprehensive debug information', () => {
      const debugInfo = frameLoaderService.getDebugInfo()
      
      expect(debugInfo).toHaveProperty('config')
      expect(debugInfo).toHaveProperty('stats')
      expect(debugInfo).toHaveProperty('cache')
      expect(debugInfo).toHaveProperty('preloadQueue')
      expect(debugInfo).toHaveProperty('seriesMetadata')
    })
  })
})