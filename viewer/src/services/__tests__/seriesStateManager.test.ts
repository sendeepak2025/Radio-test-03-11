/**
 * Unit tests for SeriesStateManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { seriesStateManager, SeriesInfo } from '../seriesStateManager'

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
})

describe('SeriesStateManager', () => {
  const mockStudyUID = '1.2.3.4.5.6.7.8.9'
  const mockSeriesData: SeriesInfo[] = [
    {
      seriesInstanceUID: '1.2.3.4.5.6.7.8.9.1',
      seriesNumber: 1,
      seriesDescription: 'Axial T1',
      modality: 'MR',
      numberOfInstances: 25
    },
    {
      seriesInstanceUID: '1.2.3.4.5.6.7.8.9.2',
      seriesNumber: 2,
      seriesDescription: 'Axial T2',
      modality: 'MR',
      numberOfInstances: 30
    },
    {
      seriesInstanceUID: '1.2.3.4.5.6.7.8.9.3',
      seriesNumber: 3,
      seriesDescription: 'Sagittal T1',
      modality: 'MR',
      numberOfInstances: 20
    }
  ]

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Reset the series state manager
    seriesStateManager.resetSeriesState()
  })

  afterEach(() => {
    // Clean up after each test
    seriesStateManager.resetSeriesState()
  })

  describe('initializeStudy', () => {
    it('should initialize study with series data', () => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)

      expect(seriesStateManager.getCurrentStudy()).toBe(mockStudyUID)
      expect(seriesStateManager.getCurrentSeries()).toBe(mockSeriesData[0].seriesInstanceUID)
      expect(seriesStateManager.getAllSeriesMetadata()).toHaveLength(3)
    })

    it('should set first series as default', () => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)

      expect(seriesStateManager.getCurrentSeries()).toBe(mockSeriesData[0].seriesInstanceUID)
      expect(seriesStateManager.getCurrentFrame(mockSeriesData[0].seriesInstanceUID)).toBe(0)
    })

    it('should initialize frame positions to 0 for all series', () => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)

      mockSeriesData.forEach(series => {
        expect(seriesStateManager.getCurrentFrame(series.seriesInstanceUID)).toBe(0)
      })
    })

    it('should clear previous study data', () => {
      // Initialize first study
      seriesStateManager.initializeStudy('old-study', [mockSeriesData[0]])
      seriesStateManager.setCurrentFrame(mockSeriesData[0].seriesInstanceUID, 10)

      // Initialize new study
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)

      expect(seriesStateManager.getCurrentStudy()).toBe(mockStudyUID)
      expect(seriesStateManager.getAllSeriesMetadata()).toHaveLength(3)
    })
  })

  describe('series selection', () => {
    beforeEach(() => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)
    })

    it('should set current series', () => {
      const targetSeries = mockSeriesData[1].seriesInstanceUID
      seriesStateManager.setCurrentSeries(targetSeries)

      expect(seriesStateManager.getCurrentSeries()).toBe(targetSeries)
    })

    it('should not set invalid series', () => {
      const originalSeries = seriesStateManager.getCurrentSeries()
      seriesStateManager.setCurrentSeries('invalid-series-uid')

      expect(seriesStateManager.getCurrentSeries()).toBe(originalSeries)
    })

    it('should check if series exists', () => {
      expect(seriesStateManager.hasSeriesData(mockSeriesData[0].seriesInstanceUID)).toBe(true)
      expect(seriesStateManager.hasSeriesData('invalid-series-uid')).toBe(false)
    })
  })

  describe('frame navigation', () => {
    beforeEach(() => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)
    })

    it('should set frame position for series', () => {
      const seriesUID = mockSeriesData[0].seriesInstanceUID
      seriesStateManager.setCurrentFrame(seriesUID, 10)

      expect(seriesStateManager.getCurrentFrame(seriesUID)).toBe(10)
    })

    it('should validate frame bounds', () => {
      const seriesUID = mockSeriesData[0].seriesInstanceUID
      const maxFrames = mockSeriesData[0].numberOfInstances

      // Test upper bound
      seriesStateManager.setCurrentFrame(seriesUID, maxFrames + 10)
      expect(seriesStateManager.getCurrentFrame(seriesUID)).toBe(maxFrames - 1)

      // Test lower bound
      seriesStateManager.setCurrentFrame(seriesUID, -5)
      expect(seriesStateManager.getCurrentFrame(seriesUID)).toBe(0)
    })

    it('should get series frame count', () => {
      const seriesUID = mockSeriesData[1].seriesInstanceUID
      expect(seriesStateManager.getSeriesFrameCount(seriesUID)).toBe(30)
    })

    it('should return 0 for invalid series frame count', () => {
      expect(seriesStateManager.getSeriesFrameCount('invalid-series')).toBe(0)
    })
  })

  describe('navigation helpers', () => {
    beforeEach(() => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)
    })

    it('should get navigation bounds for current series', () => {
      const bounds = seriesStateManager.getCurrentSeriesNavigationBounds()

      expect(bounds).toEqual({
        minFrame: 0,
        maxFrame: 24, // numberOfInstances - 1
        currentFrame: 0
      })
    })

    it('should navigate to next frame', () => {
      const success = seriesStateManager.navigateToNextFrame()
      expect(success).toBe(true)

      const currentSeries = seriesStateManager.getCurrentSeries()!
      expect(seriesStateManager.getCurrentFrame(currentSeries)).toBe(1)
    })

    it('should navigate to previous frame', () => {
      const currentSeries = seriesStateManager.getCurrentSeries()!
      seriesStateManager.setCurrentFrame(currentSeries, 5)

      const success = seriesStateManager.navigateToPreviousFrame()
      expect(success).toBe(true)
      expect(seriesStateManager.getCurrentFrame(currentSeries)).toBe(4)
    })

    it('should not navigate beyond bounds', () => {
      const currentSeries = seriesStateManager.getCurrentSeries()!
      const maxFrame = seriesStateManager.getSeriesFrameCount(currentSeries) - 1

      // Set to last frame
      seriesStateManager.setCurrentFrame(currentSeries, maxFrame)

      // Try to go beyond
      const success = seriesStateManager.navigateToNextFrame()
      expect(success).toBe(false)
      expect(seriesStateManager.getCurrentFrame(currentSeries)).toBe(maxFrame)
    })

    it('should navigate to specific frame', () => {
      const success = seriesStateManager.navigateToFrame(15)
      expect(success).toBe(true)

      const currentSeries = seriesStateManager.getCurrentSeries()!
      expect(seriesStateManager.getCurrentFrame(currentSeries)).toBe(15)
    })

    it('should not navigate to invalid frame', () => {
      const currentSeries = seriesStateManager.getCurrentSeries()!
      const originalFrame = seriesStateManager.getCurrentFrame(currentSeries)

      const success = seriesStateManager.navigateToFrame(100)
      expect(success).toBe(false)
      expect(seriesStateManager.getCurrentFrame(currentSeries)).toBe(originalFrame)
    })
  })

  describe('metadata access', () => {
    beforeEach(() => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)
    })

    it('should get series metadata', () => {
      const seriesUID = mockSeriesData[1].seriesInstanceUID
      const metadata = seriesStateManager.getSeriesMetadata(seriesUID)

      expect(metadata).toEqual(mockSeriesData[1])
    })

    it('should return null for invalid series metadata', () => {
      const metadata = seriesStateManager.getSeriesMetadata('invalid-series')
      expect(metadata).toBeNull()
    })

    it('should get all series metadata', () => {
      const allMetadata = seriesStateManager.getAllSeriesMetadata()
      expect(allMetadata).toHaveLength(3)
      expect(allMetadata).toEqual(expect.arrayContaining(mockSeriesData))
    })
  })

  describe('session storage persistence', () => {
    beforeEach(() => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)
    })

    it('should persist state to session storage', () => {
      const seriesUID = mockSeriesData[1].seriesInstanceUID
      seriesStateManager.setCurrentSeries(seriesUID)
      seriesStateManager.setCurrentFrame(seriesUID, 10)

      expect(mockSessionStorage.setItem).toHaveBeenCalled()
      
      const lastCall = mockSessionStorage.setItem.mock.calls[mockSessionStorage.setItem.mock.calls.length - 1]
      expect(lastCall[0]).toBe('series_state_manager')
      
      const storedData = JSON.parse(lastCall[1])
      expect(storedData.studyInstanceUID).toBe(mockStudyUID)
      expect(storedData.currentSeriesUID).toBe(seriesUID)
      expect(storedData.seriesFramePositions[seriesUID]).toBe(10)
    })

    it('should restore state from session storage', () => {
      const mockStoredData = {
        studyInstanceUID: mockStudyUID,
        currentSeriesUID: mockSeriesData[2].seriesInstanceUID,
        seriesFramePositions: {
          [mockSeriesData[0].seriesInstanceUID]: 5,
          [mockSeriesData[1].seriesInstanceUID]: 15,
          [mockSeriesData[2].seriesInstanceUID]: 8
        },
        seriesMetadata: Object.fromEntries(
          mockSeriesData.map(series => [series.seriesInstanceUID, series])
        ),
        totalSeriesCount: 3,
        lastUpdated: Date.now()
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(mockStoredData))

      // Re-initialize to trigger restore
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)

      expect(seriesStateManager.getCurrentSeries()).toBe(mockSeriesData[2].seriesInstanceUID)
      expect(seriesStateManager.getCurrentFrame(mockSeriesData[0].seriesInstanceUID)).toBe(5)
      expect(seriesStateManager.getCurrentFrame(mockSeriesData[1].seriesInstanceUID)).toBe(15)
      expect(seriesStateManager.getCurrentFrame(mockSeriesData[2].seriesInstanceUID)).toBe(8)
    })

    it('should not restore expired session data', () => {
      const expiredData = {
        studyInstanceUID: mockStudyUID,
        currentSeriesUID: mockSeriesData[1].seriesInstanceUID,
        seriesFramePositions: {},
        seriesMetadata: {},
        totalSeriesCount: 3,
        lastUpdated: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(expiredData))

      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)

      // Should use default (first series) instead of expired data
      expect(seriesStateManager.getCurrentSeries()).toBe(mockSeriesData[0].seriesInstanceUID)
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('series_state_manager')
    })

    it('should not restore data for different study', () => {
      const differentStudyData = {
        studyInstanceUID: 'different-study-uid',
        currentSeriesUID: mockSeriesData[1].seriesInstanceUID,
        seriesFramePositions: {},
        seriesMetadata: {},
        totalSeriesCount: 3,
        lastUpdated: Date.now()
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(differentStudyData))

      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)

      // Should use default (first series) instead of different study data
      expect(seriesStateManager.getCurrentSeries()).toBe(mockSeriesData[0].seriesInstanceUID)
    })
  })

  describe('state reset', () => {
    it('should reset all state', () => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)
      seriesStateManager.setCurrentSeries(mockSeriesData[1].seriesInstanceUID)

      seriesStateManager.resetSeriesState()

      expect(seriesStateManager.getCurrentStudy()).toBeNull()
      expect(seriesStateManager.getCurrentSeries()).toBeNull()
      expect(seriesStateManager.getAllSeriesMetadata()).toHaveLength(0)
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('series_state_manager')
    })
  })

  describe('debug information', () => {
    beforeEach(() => {
      seriesStateManager.initializeStudy(mockStudyUID, mockSeriesData)
    })

    it('should provide debug information', () => {
      seriesStateManager.setCurrentSeries(mockSeriesData[1].seriesInstanceUID)
      seriesStateManager.setCurrentFrame(mockSeriesData[1].seriesInstanceUID, 10)

      const debugInfo = seriesStateManager.getDebugInfo()

      expect(debugInfo.studyInstanceUID).toBe(mockStudyUID)
      expect(debugInfo.currentSeriesUID).toBe(mockSeriesData[1].seriesInstanceUID)
      expect(debugInfo.totalSeriesCount).toBe(3)
      expect(debugInfo.seriesCount).toBe(3)
      expect(debugInfo.framePositions[mockSeriesData[1].seriesInstanceUID]).toBe(10)
      expect(debugInfo.seriesMetadata).toBeDefined()
    })
  })
})