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
      const encodedId = encodeURIComponent(id)
      
      const endpoint =
        type === 'patient'
          ? `/api/export/patient/${encodedId}`
          : `/api/export/study/${encodedId}`

      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      
      console.log('🔄 Starting streaming download:', { type, id, endpoint })
      
      // ✅ Use fetch API for proper streaming download
      const response = await fetch(
        `${endpoint}?format=${format}&includeImages=true`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${type}_${id}_export.${format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/)
        if (match) filename = match[1]
      }

      console.log('📥 Streaming response received, downloading:', filename)

      // ✅ Stream response to blob - browser shows progress
      const blob = await response.blob()
      
      console.log('✅ Download complete, size:', blob.size, 'bytes')

      // Trigger browser download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      setExporting(false)
      
    } catch (error: any) {
      console.error('❌ Export error:', error)
      alert(`❌ Export failed: ${error.message}`)
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
