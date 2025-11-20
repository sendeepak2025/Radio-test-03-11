import { useState, useCallback } from 'react';
import ApiService from '@/services/ApiService';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
  missingItems?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export const useReportValidation = (reportId: string) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (strict = false): Promise<ValidationResult> => {
    setIsValidating(true);
    try {
      const endpoint = strict 
        ? `/api/reports/${reportId}/validate-sign`
        : `/api/reports/${reportId}/validate`;
      
      const response = await ApiService.apiCall(endpoint, {
        method: 'POST',
      });
      
      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok || (contentType && contentType.includes('text/html'))) {
        throw new Error(
          response.status === 404 
            ? 'Validation service is not available. Please try again later.'
            : response.status === 500
            ? 'Server error during validation. Please contact support.'
            : 'Unable to validate report. Please check your connection and try again.'
        );
      }
      
      const data = await response.json();
      
      const result: ValidationResult = {
        valid: data.valid,
        errors: data.errors || [],
        warnings: data.warnings || []
      };
      
      setValidationResult(result);
      return result;
      
    } catch (error: any) {
      console.error('Validation error:', error);
      
      // User-friendly error messages
      let userMessage = error.message;
      
      // Handle JSON parse errors (HTML response)
      if (error.message && error.message.includes('Unexpected token')) {
        userMessage = 'The validation service is currently unavailable. Please try again in a moment.';
      }
      
      // Handle network errors
      if (error.message && error.message.includes('fetch')) {
        userMessage = 'Unable to connect to the server. Please check your internet connection.';
      }
      
      const result: ValidationResult = {
        valid: false,
        errors: [{
          field: 'general',
          message: userMessage,
          severity: 'error',
          suggestion: 'If this problem persists, please contact your system administrator.'
        }],
        warnings: []
      };
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [reportId]);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    validate,
    clearValidation,
    validationResult,
    isValidating,
    hasErrors: validationResult && validationResult.errors.length > 0,
    hasWarnings: validationResult && validationResult.warnings.length > 0
  };
};
