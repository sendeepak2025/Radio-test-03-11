import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { ValidationError } from '@/hooks/useReportValidation';

interface ValidationAlertsProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  onClose?: () => void;
}

export const ValidationAlerts: React.FC<ValidationAlertsProps> = ({
  errors,
  warnings,
  onClose
}) => {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Errors ({errors.length})</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="destructive" className="mt-0.5">
                    {error.field}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{error.message}</p>
                    {error.suggestion && (
                      <p className="text-xs mt-1 text-muted-foreground">
                        💡 {error.suggestion}
                      </p>
                    )}
                    {error.missingItems && error.missingItems.length > 0 && (
                      <p className="text-xs mt-1 text-muted-foreground">
                        Missing: {error.missingItems.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant="default" className="border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900">
            Warnings ({warnings.length})
          </AlertTitle>
          <AlertDescription className="text-yellow-800">
            <div className="mt-2 space-y-2">
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 border-yellow-600 text-yellow-900">
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
              <Info className="inline h-3 w-3 mr-1" />
              You can sign the report with warnings, but consider addressing them.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
