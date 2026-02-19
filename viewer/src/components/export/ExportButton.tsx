import React, { useState } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Download as DownloadIcon,
  FolderZip as ZipIcon,
  Code as JsonIcon
} from '@mui/icons-material'

interface ExportButtonProps {
  type: 'patient' | 'study'
  id: string
  label?: string
  className?: string
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  type,
  id,
  label = 'Export',
  className
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'zip' | 'json') => {
    setExporting(true)
    setAnchorEl(null)

    try {
      const endpoint =
        type === 'patient'
          ? `/api/export/patient/${id}`
          : `/api/export/study/${id}`

      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      
      const response = await fetch(`${endpoint}?format=${format}&includeImages=true`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Export failed with status ${response.status}`)
      }

      const blob = await response.blob()
      
      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${type}-${id}.${format}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      alert('✅ Export completed successfully!')
    } catch (error: any) {
      console.error('Export error:', error)
      alert(`❌ Export failed: ${error.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button
        startIcon={exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={exporting}
        variant="outlined"
        size="small"
        className={className}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleExport('zip')}>
          <ListItemIcon>
            <ZipIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>ZIP Archive (with DICOM)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('json')}>
          <ListItemIcon>
            <JsonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>JSON Data Only</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
