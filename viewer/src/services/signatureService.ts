/**
 * FDA 21 CFR Part 11 Compliant Digital Signature Service
 * 
 * Provides client-side API for interacting with the digital signature backend
 */

const API_BASE = '/api/signatures'

export interface SignatureResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

export interface Signature {
  id: string
  reportId: string
  signerName: string
  signerRole: string
  meaning: 'author' | 'reviewer' | 'approver'
  timestamp: string
  status: 'valid' | 'revoked'
  algorithm: string
  keySize: number
}

export interface AuditEvent {
  timestamp: string
  action: string
  userId: string
  userName: string
  ipAddress: string
  result: string
  details?: any
}

class SignatureService {
  /**
   * Sign a report with FDA-compliant digital signature
   */
  async signReport(
    reportId: string,
    password: string,
    meaning: 'author' | 'reviewer' | 'approver'
  ): Promise<SignatureResponse> {
    try {
      const response = await fetch(`${API_BASE}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          reportId,
          password,
          meaning
        })
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error signing report:', error)
      return {
        success: false,
        message: error.message || 'Failed to sign report'
      }
    }
  }

  /**
   * Verify a digital signature
   */
  async verifySignature(signatureId: string): Promise<SignatureResponse> {
    try {
      const response = await fetch(`${API_BASE}/verify/${signatureId}`, {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error verifying signature:', error)
      return {
        success: false,
        message: error.message || 'Failed to verify signature'
      }
    }
  }

  /**
   * Get all signatures for a report
   */
  async getReportSignatures(reportId: string): Promise<SignatureResponse> {
    try {
      const response = await fetch(`${API_BASE}/report/${reportId}`, {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error getting report signatures:', error)
      return {
        success: false,
        message: error.message || 'Failed to get signatures'
      }
    }
  }

  /**
   * Get audit trail for a report
   */
  async getAuditTrail(reportId: string): Promise<SignatureResponse> {
    try {
      const response = await fetch(`${API_BASE}/audit-trail/${reportId}`, {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error getting audit trail:', error)
      return {
        success: false,
        message: error.message || 'Failed to get audit trail'
      }
    }
  }

  /**
   * Revoke a signature
   */
  async revokeSignature(
    signatureId: string,
    reason: string,
    password: string
  ): Promise<SignatureResponse> {
    try {
      const response = await fetch(`${API_BASE}/revoke/${signatureId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          reason,
          password
        })
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error revoking signature:', error)
      return {
        success: false,
        message: error.message || 'Failed to revoke signature'
      }
    }
  }

  /**
   * Validate all signatures for a report
   */
  async validateReportSignatures(reportId: string): Promise<SignatureResponse> {
    try {
      const response = await fetch(`${API_BASE}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ reportId })
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error validating signatures:', error)
      return {
        success: false,
        message: error.message || 'Failed to validate signatures'
      }
    }
  }

  /**
   * Get user's signature permissions
   */
  async getSignaturePermissions(): Promise<SignatureResponse> {
    try {
      const response = await fetch(`${API_BASE}/permissions`, {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error getting signature permissions:', error)
      return {
        success: false,
        message: error.message || 'Failed to get permissions'
      }
    }
  }
}

export const signatureService = new SignatureService()
