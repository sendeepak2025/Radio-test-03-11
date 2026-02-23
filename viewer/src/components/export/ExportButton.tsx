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
      // URL encode the ID to handle special characters like dots
      const encodedId = encodeURIComponent(id)
      
      const endpoint =
        type === 'patient'
          ? `/api/export/patient/${encodedId}`
          : `/api/export/study/${encodedId}`

      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      
      console.log('🔄 Starting direct browser download:', { type, id, encodedId, endpoint })
      
      // Direct browser download using window.location
      // This triggers native browser download without JavaScript blob handling
      const downloadUrl = `${endpoint}?format=${format}&includeImages=true&token=${encodeURIComponent(token || '')}`
      
      console.log('📥 Triggering download:', downloadUrl)
      
      // Use window.location for direct download
      window.location.href = downloadUrl
      
      console.log('✅ Download triggered successfully')
      
      // Reset button state after a delay
      setTimeout(() => {
        setExporting(false)
      }, 3000)
      
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
