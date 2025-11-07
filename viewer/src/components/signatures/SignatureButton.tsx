import React, { useState } from 'react'
import { Button, CircularProgress } from '@mui/material'
import { VerifiedUser as SignatureIcon } from '@mui/icons-material'
import { SignatureModal } from './SignatureModal'
import { signatureService } from '../../services/signatureService'

interface SignatureButtonProps {
  reportId: string
  onSigned?: () => void
  disabled?: boolean
}

export const SignatureButton: React.FC<SignatureButtonProps> = ({
  reportId,
  onSigned,
  disabled = false
}) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSign = async (password: string, meaning: 'author' | 'reviewer' | 'approver') => {
    setLoading(true)
    setError(null)

    try {
      const result = await signatureService.signReport(reportId, password, meaning)
      
      if (result.success) {
        setOpen(false)
        onSigned?.()
      } else {
        setError(result.message || 'Failed to sign report')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while signing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SignatureIcon />}
        onClick={() => setOpen(true)}
        disabled={disabled || loading}
      >
        Sign Report
      </Button>

      <SignatureModal
        open={open}
        onClose={() => {
          setOpen(false)
          setError(null)
        }}
        onSign={handleSign}
        loading={loading}
        error={error}
      />
    </>
  )
}
