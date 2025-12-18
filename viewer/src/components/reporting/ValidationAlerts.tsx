import React from 'react';
import {Alert} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import type { ValidationError } from '@/hooks/useReportValidation';

interface ValidationAlertsProps {
  errors: ValidationError[];
  warnings: ValidationError[];
}

export const ValidationAlerts: React.FC<ValidationAlertsProps> = ({
  errors,
  warnings
}) => {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="error">
          <div>
            <h4 className="font-semibold mb-2">Validation Errors ({errors.length})</h4>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="error" className="mt-0.5">
                    {error.field}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{error.message}</p>
                    {error.suggestion && (
                      <p className="text-xs mt-1 opacity-80">
                        💡 {error.suggestion}
                      </p>
                    )}
                    {error.missingItems && error.missingItems.length > 0 && (
                      <p className="text-xs mt-1 opacity-80">
                        Missing: {error.missingItems.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Alert>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant="warning">
          <div>
            <h4 className="font-semibold mb-2">Warnings ({warnings.length})</h4>
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="warning" className="mt-0.5">
                    {warning.field}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{warning.message}</p>
                    {warning.suggestion && (
                      <p className="text-xs mt-1 opacity-80">
                        💡 {warning.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 opacity-75">
              ℹ️ You can sign the report with warnings, but consider addressing them.
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
};
