import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SeriesSelector } from './SeriesSelector'

const mockSeries = [
  {
    seriesInstanceUID: 'series-1',
    seriesNumber: 1,
    seriesDescription: 'Axial T1',
    modality: 'MR',
    numberOfInstances: 25,
    instances: []
  },
  {
    seriesInstanceUID: 'series-2',
    seriesNumber: 2,
    seriesDescription: 'Axial T2',
    modality: 'MR',
    numberOfInstances: 30,
    instances: []
  },
  {
    seriesInstanceUID: 'series-3',
    seriesNumber: 3,
    seriesDescription: 'Sagittal FLAIR',
    modality: 'MR',
    numberOfInstances: 20,
    instances: []
  }
]

const singleSeries = [
  {
    seriesInstanceUID: 'series-1',
    seriesNumber: 1,
    seriesDescription: 'Single Series',
    modality: 'CT',
    numberOfInstances: 100,
    instances: []
  }
]

describe('SeriesSelector', () => {
  const mockOnSeriesSelect = jest.fn()

  beforeEach(() => {
    mockOnSeriesSelect.mockClear()
  })

  describe('Conditional Display Logic (Requirement 2.5)', () => {
    it('should not render when series array is empty', () => {
      const { container } = render(
        <SeriesSelector
          series={[]}
          selectedSeriesUID=""
          onSeriesSelect={mockOnSeriesSelect}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('should not render when only one series exists', () => {
      const { container } = render(
        <SeriesSelector
          series={singleSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('should render when multiple series exist', () => {
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )
      expect(screen.getByText('Series Collection')).toBeInTheDocument()
    })
  })

  describe('Complete Series Metadata Display (Requirements 2.1, 2.2)', () => {
    beforeEach(() => {
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )
    })

    it('should display all series with complete metadata', () => {
      // Check series numbers
      expect(screen.getByText('Series 1')).toBeInTheDocument()
      expect(screen.getByText('Series 2')).toBeInTheDocument()
      expect(screen.getByText('Series 3')).toBeInTheDocument()

      // Check series descriptions
      expect(screen.getByText('Axial T1')).toBeInTheDocument()
      expect(screen.getByText('Axial T2')).toBeInTheDocument()
      expect(screen.getByText('Sagittal FLAIR')).toBeInTheDocument()

      // Check modalities
      expect(screen.getAllByText('MR')).toHaveLength(3)

      // Check image counts
      expect(screen.getByText('25 images')).toBeInTheDocument()
      expect(screen.getByText('30 images')).toBeInTheDocument()
      expect(screen.getByText('20 images')).toBeInTheDocument()
    })

    it('should show series count in header', () => {
      expect(screen.getByText('3 series • Use ↑↓ keys or click to navigate')).toBeInTheDocument()
    })
  })

  describe('Visual Indicators for Active Series (Requirement 2.4)', () => {
    it('should highlight the selected series', () => {
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-2"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      const selectedButton = screen.getByRole('option', { selected: true })
      expect(selectedButton).toHaveAttribute('aria-selected', 'true')
      expect(selectedButton).toHaveAttribute('aria-label', expect.stringContaining('Series 2: Axial T2'))
    })

    it('should show check icon for active series', () => {
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      // The check icon should be present for the selected series
      const selectedOption = screen.getByRole('option', { selected: true })
      expect(selectedOption).toBeInTheDocument()
    })

    it('should display current frame information for active series', () => {
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
          currentFrame={5}
          totalFrames={25}
        />
      )

      expect(screen.getByText('Frame: 6 / 25')).toBeInTheDocument()
    })
  })

  describe('Series Selection (Requirement 2.3)', () => {
    it('should call onSeriesSelect when a series is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      const series2Button = screen.getByRole('option', { name: /Series 2: Axial T2/ })
      await user.click(series2Button)

      expect(mockOnSeriesSelect).toHaveBeenCalledWith('series-2')
    })
  })

  describe('Keyboard Navigation Support (Enhanced)', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )
      container = result.container
    })

    it('should navigate to next series with ArrowDown', async () => {
      const user = userEvent.setup()
      const seriesContainer = container.querySelector('[role="listbox"]')
      
      if (seriesContainer) {
        seriesContainer.focus()
        await user.keyboard('{ArrowDown}')
        expect(mockOnSeriesSelect).toHaveBeenCalledWith('series-2')
      }
    })

    it('should navigate to previous series with ArrowUp', async () => {
      const user = userEvent.setup()
      
      // Start with series-2 selected
      const { rerender } = render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-2"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      const seriesContainer = container.querySelector('[role="listbox"]')
      if (seriesContainer) {
        seriesContainer.focus()
        await user.keyboard('{ArrowUp}')
        expect(mockOnSeriesSelect).toHaveBeenCalledWith('series-1')
      }
    })

    it('should navigate to first series with Home key', async () => {
      const user = userEvent.setup()
      
      // Start with series-3 selected
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-3"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      const seriesContainer = container.querySelector('[role="listbox"]')
      if (seriesContainer) {
        seriesContainer.focus()
        await user.keyboard('{Home}')
        expect(mockOnSeriesSelect).toHaveBeenCalledWith('series-1')
      }
    })

    it('should navigate to last series with End key', async () => {
      const user = userEvent.setup()
      const seriesContainer = container.querySelector('[role="listbox"]')
      
      if (seriesContainer) {
        seriesContainer.focus()
        await user.keyboard('{End}')
        expect(mockOnSeriesSelect).toHaveBeenCalledWith('series-3')
      }
    })

    it('should re-select current series with Enter key', async () => {
      const user = userEvent.setup()
      const seriesContainer = container.querySelector('[role="listbox"]')
      
      if (seriesContainer) {
        seriesContainer.focus()
        await user.keyboard('{Enter}')
        expect(mockOnSeriesSelect).toHaveBeenCalledWith('series-1')
      }
    })

    it('should not navigate beyond boundaries', async () => {
      const user = userEvent.setup()
      const seriesContainer = container.querySelector('[role="listbox"]')
      
      if (seriesContainer) {
        seriesContainer.focus()
        // Try to go up from first series
        await user.keyboard('{ArrowUp}')
        expect(mockOnSeriesSelect).not.toHaveBeenCalled()
      }
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      const listbox = screen.getByRole('listbox')
      expect(listbox).toHaveAttribute('aria-label', 'Series selector')

      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(3)
      
      options.forEach((option, index) => {
        expect(option).toHaveAttribute('aria-selected')
        expect(option).toHaveAttribute('aria-label')
      })
    })

    it('should be focusable', () => {
      render(
        <SeriesSelector
          series={mockSeries}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      const listbox = screen.getByRole('listbox')
      expect(listbox).toHaveAttribute('tabindex', '0')
    })
  })

  describe('Error Handling', () => {
    it('should handle series without descriptions', () => {
      const seriesWithoutDescription = [
        {
          seriesInstanceUID: 'series-1',
          seriesNumber: 1,
          modality: 'CT',
          numberOfInstances: 50,
          instances: []
        }
      ]

      render(
        <SeriesSelector
          series={seriesWithoutDescription}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      // Should show fallback text
      expect(screen.getByText('No Description Available')).toBeInTheDocument()
    })

    it('should handle series without modality', () => {
      const seriesWithoutModality = [
        {
          seriesInstanceUID: 'series-1',
          seriesNumber: 1,
          seriesDescription: 'Test Series',
          numberOfInstances: 50,
          instances: []
        },
        {
          seriesInstanceUID: 'series-2',
          seriesNumber: 2,
          seriesDescription: 'Another Series',
          numberOfInstances: 30,
          instances: []
        }
      ]

      render(
        <SeriesSelector
          series={seriesWithoutModality}
          selectedSeriesUID="series-1"
          onSeriesSelect={mockOnSeriesSelect}
        />
      )

      // Should still render without modality chips
      expect(screen.getByText('Test Series')).toBeInTheDocument()
      expect(screen.getByText('Another Series')).toBeInTheDocument()
    })
  })
})