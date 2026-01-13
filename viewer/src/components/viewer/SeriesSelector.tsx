import React, { useEffect, useRef, useState } from 'react'

interface Series {
  seriesInstanceUID: string
  seriesDescription?: string
  seriesNumber?: string | number
  modality?: string
  numberOfInstances?: number
  totalFrames?: number
  numberOfImages?: number
  instances?: any[]
}

interface SeriesSelectorProps {
  series: Series[]
  selectedSeriesUID: string
  onSeriesSelect: (seriesUID: string) => void
  currentFrame?: number
  totalFrames?: number
  studyInstanceUID?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const SeriesSelector: React.FC<SeriesSelectorProps> = React.memo(({
  series,
  selectedSeriesUID,
  onSeriesSelect,
  currentFrame,
  totalFrames,
  studyInstanceUID,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false)

  // Enhanced keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current || series.length <= 1) return

      const isContainerFocused = containerRef.current.contains(document.activeElement)
      if (!isContainerFocused) return

      const currentIndex = series.findIndex(s => s.seriesInstanceUID === selectedSeriesUID)
      if (currentIndex === -1) return

      let newIndex = currentIndex

      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault()
          newIndex = Math.max(0, currentIndex - 1)
          break
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault()
          newIndex = Math.min(series.length - 1, currentIndex + 1)
          break
        case 'Home':
          event.preventDefault()
          newIndex = 0
          break
        case 'End':
          event.preventDefault()
          newIndex = series.length - 1
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          onSeriesSelect(series[currentIndex].seriesInstanceUID)
          return
        default:
          return
      }

      if (newIndex !== currentIndex) {
        onSeriesSelect(series[newIndex].seriesInstanceUID)
        
        setTimeout(() => {
          const selectedElement = containerRef.current?.querySelector(`[data-series-index="${newIndex}"]`)
          if (selectedElement) {
            selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        }, 50)
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleKeyDown)
      container.setAttribute('tabindex', '0')
      container.setAttribute('role', 'listbox')
      container.setAttribute('aria-label', 'Series selector')
    }

    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [series, selectedSeriesUID, onSeriesSelect])

  useEffect(() => {
    if (containerRef.current && series.length > 1) {
      containerRef.current.focus()
    }
  }, [selectedSeriesUID, series.length])

  if (!series || series.length === 0) {
    return null
  }

  // Debug logging
  console.log('SeriesSelector render - series count:', series.length, 'series:', series)
  console.log('SeriesSelector selectedSeriesUID:', selectedSeriesUID)
  console.log('SeriesSelector studyInstanceUID:', studyInstanceUID)
  
  series.forEach((s, index) => {
    console.log(`Series ${index + 1}:`, {
      uid: s.seriesInstanceUID,
      number: s.seriesNumber,
      description: s.seriesDescription,
      modality: s.modality,
      instances: s.numberOfInstances
    });
  });
  
  // Generate placeholder image based on modality
  const generatePlaceholderImage = (modality: string, isSelected: boolean) => {
    const baseColor = isSelected ? '1976d2' : '424242'
    const accentColor = isSelected ? '1565c0' : '616161'
    const textColor = isSelected ? 'ffffff' : 'bdbdbd'
    
    let iconPath = ''
    switch (modality?.toUpperCase()) {
      case 'CT':
        iconPath = `%3Ccircle cx='32' cy='32' r='20' fill='none' stroke='%23${textColor}' stroke-width='2'/%3E%3Ccircle cx='32' cy='32' r='12' fill='none' stroke='%23${textColor}' stroke-width='2'/%3E%3Ccircle cx='32' cy='32' r='4' fill='%23${textColor}'/%3E`
        break
      case 'MR':
      case 'MRI':
        iconPath = `%3Cpath d='M20 20h24v24H20z' fill='none' stroke='%23${textColor}' stroke-width='2'/%3E%3Cpath d='M24 24h16v16H24z' fill='none' stroke='%23${textColor}' stroke-width='2'/%3E%3Cpath d='M28 28h8v8h-8z' fill='%23${textColor}'/%3E`
        break
      case 'XA':
      case 'XR':
        iconPath = `%3Cpath d='M16 16h32v32H16z' fill='none' stroke='%23${textColor}' stroke-width='2'/%3E%3Cpath d='M20 20l24 24M44 20L20 44' stroke='%23${textColor}' stroke-width='2'/%3E`
        break
      case 'US':
        iconPath = `%3Cpath d='M16 32c0-8 7-16 16-16s16 8 16 16c0 8-7 16-16 16s-16-8-16-16z' fill='none' stroke='%23${textColor}' stroke-width='2'/%3E%3Cpath d='M24 32c0-4 4-8 8-8s8 4 8 8c0 4-4 8-8 8s-8-4-8-8z' fill='%23${textColor}'/%3E`
        break
      default:
        iconPath = `%3Crect x='20' y='20' width='24' height='24' fill='none' stroke='%23${textColor}' stroke-width='2' rx='2'/%3E%3Ccircle cx='28' cy='28' r='2' fill='%23${textColor}'/%3E%3Cpath d='M20 40l6-6 3 3 6-6 9 9v4H20z' fill='%23${textColor}'/%3E`
    }
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Crect width='72' height='72' fill='%23${baseColor}' rx='6'/%3E%3Crect x='8' y='8' width='56' height='56' fill='%23${accentColor}' rx='4'/%3E${iconPath}%3Ctext x='36' y='68' text-anchor='middle' fill='%23${textColor}' font-size='8' font-family='Arial, sans-serif' font-weight='bold'%3E${modality || 'IMG'}%3C/text%3E%3C/svg%3E`
  }

  if (!series || series.length === 0) {
    return (
      <div className="w-80 h-full bg-gray-900 border-r border-gray-700 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading series data...</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`bg-gray-900 border-r border-gray-700 outline-none transition-all duration-200
                  ${isCollapsed ? 'w-14' : 'w-64'}
                  ${isMobileCollapsed ? 'max-md:w-0 max-md:overflow-hidden' : 'max-md:w-56'}
                  flex flex-col`}
      style={{ height: '100%', minHeight: 0, maxHeight: '100%' }}
      onWheel={(e) => {
        e.stopPropagation()
      }}
    >
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        title={isMobileCollapsed ? "Show Series" : "Hide Series"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
      </button>

      {/* Header - Compact */}
      <div className={`bg-gray-800 flex-shrink-0 ${isCollapsed ? 'p-1.5' : 'px-3 py-2'} border-b border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <h3 className="text-white font-medium text-sm">
                Series
              </h3>
            )}
            <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
              {series.length}
            </span>
          </div>
          
          {/* Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Series List with Scroll */}
      <div 
        className="overflow-y-auto flex-1 overscroll-contain scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" 
        style={{ 
          minHeight: 0, // Critical for flex child to allow shrinking
          scrollBehavior: 'smooth',
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="p-0" role="listbox">
          {series.map((seriesItem, index) => {
            const isSelected = seriesItem.seriesInstanceUID === selectedSeriesUID
            // Use totalFrames for multi-frame DICOM, fallback to numberOfInstances
            const instanceCount = seriesItem.totalFrames || seriesItem.numberOfImages || seriesItem.numberOfInstances || seriesItem.instances?.length || 0
            const seriesNumber = seriesItem.seriesNumber || index + 1

            return (
              <div key={seriesItem.seriesInstanceUID || index}>
                <div className="p-0">
                  <button
                    onClick={() => onSeriesSelect(seriesItem.seriesInstanceUID)}
                    data-series-index={index}
                    role="option"
                    aria-selected={isSelected}
                    aria-label={`Series ${seriesNumber}: ${seriesItem.seriesDescription || 'No Description'}, ${seriesItem.modality || 'Unknown modality'}, ${instanceCount} images`}
                    className={`w-full transition-all duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-blue-500 relative ${
                      isCollapsed 
                        ? 'py-1.5 px-1.5 mx-0.5 my-0.5 rounded-md border' 
                        : 'py-2 px-2 mx-1 my-0.5 rounded-lg border'
                    } ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-900/80 to-blue-800/80 border-blue-500 text-white'
                        : 'bg-gray-800/30 border-transparent text-gray-300 hover:bg-gray-800/60 hover:border-gray-600'
                    }`}
                  >
                    {/* Left accent bar for selected item */}
                    {isSelected && !isCollapsed && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-400 rounded-full" />
                    )}
                    {isCollapsed ? (
                      /* Collapsed View - Just thumbnail and number */
                      <div className="flex flex-col items-center gap-1">
                        <div className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          isSelected ? 'border-blue-400' : 'border-gray-600'
                        }`}>
                          {studyInstanceUID ? (
                            <img
                              src={`/api/dicom/studies/${studyInstanceUID}/series/${seriesItem.seriesInstanceUID}/thumbnail`}
                              alt={`Series ${seriesNumber} thumbnail`}
                              className={`w-full h-full object-cover transition-all duration-200 ${
                                isSelected ? 'brightness-110 contrast-110' : 'brightness-90'
                              }`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  parent.style.backgroundImage = `url("${generatePlaceholderImage(seriesItem.modality || 'IMG', isSelected)}")`
                                  parent.style.backgroundSize = 'cover'
                                  parent.style.backgroundPosition = 'center'
                                  parent.style.backgroundColor = isSelected ? '#1e40af' : '#374151'
                                }
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="w-full h-full bg-cover bg-center flex items-center justify-center"
                              style={{
                                backgroundImage: `url("${generatePlaceholderImage(seriesItem.modality || 'IMG', isSelected)}")`,
                                backgroundColor: isSelected ? '#1e40af' : '#374151',
                              }}
                            />
                          )}
                          
                          {/* Series number badge */}
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-200 z-10 ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-300' 
                              : 'bg-gray-700 text-white border-gray-500'
                          }`}>
                            {seriesNumber}
                          </div>
                        </div>
                        
                        {/* Modality badge */}
                        {seriesItem.modality && (
                          <span className={`px-1 py-0.5 rounded text-xs font-semibold border transition-all duration-200 ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-400' 
                              : 'bg-blue-800 text-white border-none'
                          }`}>
                            {seriesItem.modality}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Expanded View - Compact layout */
                      <div className="flex items-center gap-2">
                        {/* Thumbnail - smaller and fixed size */}
                        <div className={`relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border transition-all duration-150 ${
                          isSelected ? 'border-blue-400' : 'border-gray-600'
                        }`}>
                          {studyInstanceUID ? (
                            <img
                              src={`/api/dicom/studies/${studyInstanceUID}/series/${seriesItem.seriesInstanceUID}/thumbnail`}
                              alt={`Series ${seriesNumber} thumbnail`}
                              className={`w-full h-full object-cover transition-all duration-200 ${
                                isSelected ? 'brightness-110 contrast-110' : 'brightness-90'
                              }`}
                              onError={(e) => {
                                console.warn(`❌ Failed to load thumbnail for series ${seriesItem.seriesInstanceUID}`)
                                console.warn(`❌ Thumbnail URL: /api/dicom/studies/${studyInstanceUID}/series/${seriesItem.seriesInstanceUID}/thumbnail`)
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  parent.style.backgroundImage = `url("${generatePlaceholderImage(seriesItem.modality || 'IMG', isSelected)}")`
                                  parent.style.backgroundSize = 'cover'
                                  parent.style.backgroundPosition = 'center'
                                  parent.style.backgroundColor = isSelected ? '#1e40af' : '#374151'
                                }
                              }}
                              onLoad={() => {
                                console.log(`✅ Thumbnail loaded successfully for series ${seriesItem.seriesInstanceUID}`)
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="w-full h-full bg-cover bg-center flex items-center justify-center"
                              style={{
                                backgroundImage: `url("${generatePlaceholderImage(seriesItem.modality || 'IMG', isSelected)}")`,
                                backgroundColor: isSelected ? '#1e40af' : '#374151',
                              }}
                            >
                              <div className="text-center">
                                <div className="text-xs text-white opacity-75">No Study ID</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Overlay */}
                          <div className={`absolute inset-0 transition-all duration-200 ${
                            isSelected ? 'bg-blue-600/15' : 'bg-black/10'
                          }`} />
                          
                          {/* Series number badge */}
                          <div className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 z-10 ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-300' 
                              : 'bg-gray-700 text-white border-gray-500'
                          }`}>
                            {seriesNumber}
                          </div>
                        </div>

                        {/* Metadata - Compact */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className={`font-medium text-sm truncate ${
                              isSelected ? 'text-white' : 'text-gray-200'
                            }`}>
                              {seriesItem.seriesDescription || `Series ${seriesNumber}`}
                            </h4>
                            {isSelected && (
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                            )}
                          </div>

                          <p className={`text-xs leading-tight truncate ${
                            isSelected ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {seriesItem.modality || 'OT'} • {instanceCount} images
                          </p>

                          {/* Frame info for active series - inline */}
                          {isSelected && currentFrame !== undefined && totalFrames !== undefined && (
                            <p className="text-xs text-blue-400 mt-0.5">
                              Frame {currentFrame + 1}/{totalFrames}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                </div>
                {!isCollapsed && index < series.length - 1 && (
                  <div className="mx-2 border-b border-gray-800/50" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default SeriesSelector