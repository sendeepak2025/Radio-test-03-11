/**
 * 💾 AUTOSAVE HOOK
 * Debounced autosave with version conflict handling, exponential backoff, offline resilience, and queue management
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { reportsApi } from '../services/ReportsApi';
import type { StructuredReport, VersionConflict } from '../types/reporting';
import { mapApiError, telemetryEmit, reportError } from '../utils/reportingUtils';
import { offlineQueue } from '../lib/offlineQueue';

interface UseAutosaveOptions {
  reportId?: string;
  data: Partial<StructuredReport>;
  enabled?: boolean;
  paused?: boolean; // Pause autosave during critical operations
  interval?: number; // milliseconds
  onSaveSuccess?: (report: StructuredReport) => void;
  onSaveError?: (error: string) => void;
  onVersionConflict?: (conflict: VersionConflict) => void;
  useOfflineQueue?: boolean; // Enable offline queue (default: true)
}

interface UseAutosaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  saveNow: () => Promise<void>;
  hasUnsavedChanges: boolean;
  isOffline: boolean;
  retryCount: number;
  queuedItemsCount: number;
}

// Exponential backoff configuration
const BACKOFF_BASE = 1000; // 1 second
const BACKOFF_MAX = 30000; // 30 seconds
const BACKOFF_JITTER = 0.2; // ±20%

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(retries: number): number {
  const exponential = Math.min(BACKOFF_MAX, BACKOFF_BASE * Math.pow(2, retries));
  const jitter = exponential * BACKOFF_JITTER * (Math.random() * 2 - 1);
  return Math.floor(exponential + jitter);
}

/**
 * Autosave hook with 3-second debounce, exponential backoff, and offline resilience
 */
export const useAutosave = ({
  reportId,
  data,
  enabled = true,
  paused = false,
  interval = 3000,
  onSaveSuccess,
  onSaveError,
  onVersionConflict,
  useOfflineQueue: enableQueue = true
}: UseAutosaveOptions): UseAutosaveReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [queuedItemsCount, setQueuedItemsCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout>();
  const dataRef = useRef(data);
  const inFlightRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');
  const retryTimerRef = useRef<NodeJS.Timeout>();

  // Update data ref
  useEffect(() => {
    dataRef.current = data;
    
    // Check if data has changed
    const currentDataStr = JSON.stringify(data);
    if (currentDataStr !== lastSavedDataRef.current && lastSavedDataRef.current !== '') {
      setHasUnsavedChanges(true);
    }
  }, [data]);
  
  // Update queued items count
  useEffect(() => {
    if (!enableQueue || !reportId) return;
    
    const updateCount = async () => {
      const items = await offlineQueue.getByReportId(reportId);
      setQueuedItemsCount(items.length);
    };
    
    updateCount();
    const interval = setInterval(updateCount, 5000); // Update every 5s
    
    return () => clearInterval(interval);
  }, [reportId, enableQueue]);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network online - resuming autosave');
      setIsOffline(false);
      setRetryCount(0);
      telemetryEmit('autosave.network.online', { reportId });
      
      // Process offline queue
      if (enableQueue) {
        offlineQueue.processQueue().catch(console.error);
      }
      
      // Immediate save attempt when coming back online
      if (hasUnsavedChanges && !paused) {
        save();
      }
    };

    const handleOffline = () => {
      console.log('📡 Network offline - pausing autosave');
      setIsOffline(true);
      telemetryEmit('autosave.network.offline', { reportId });
      
      // Clear any pending timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reportId, hasUnsavedChanges, paused, enableQueue]);

  /**
   * Save function with exponential backoff
   */
  const save = useCallback(async () => {
    if (!enabled || inFlightRef.current || isOffline) {
      return;
    }

    // F) Don't save temporary drafts (offline mode)
    if (reportId?.startsWith('temp-')) {
      console.warn('⚠️ Skipping autosave for temporary draft (offline mode)');
      return;
    }

    // Don't save if no changes
    const currentDataStr = JSON.stringify(dataRef.current);
    if (currentDataStr === lastSavedDataRef.current) {
      return;
    }

    try {
      inFlightRef.current = true;
      setIsSaving(true);
      setError(null);

      telemetryEmit('autosave.attempt', { reportId, retryCount });

      let response;

      if (reportId) {
        // Update existing report
        response = await reportsApi.update(reportId, dataRef.current);
      } else {
        // Create new report
        response = await reportsApi.upsert(dataRef.current);
      }

      const savedReport = response.report || response.data;

      if (savedReport) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setRetryCount(0); // Reset retry count on success
        lastSavedDataRef.current = currentDataStr;
        
        telemetryEmit('autosave.success', { reportId, retryCount });
        
        if (onSaveSuccess) {
          onSaveSuccess(savedReport);
        }
      }
    } catch (err: any) {
      console.error('❌ Autosave error:', err);

      // Handle version conflict (409)
      if (err.response?.status === 409) {
        const conflict: VersionConflict = {
          serverVersion: err.response.data.serverVersion || 0,
          clientVersion: err.response.data.clientVersion || 0,
          serverReport: err.response.data.serverReport,
          conflictFields: err.response.data.conflictFields || []
        };

        telemetryEmit('autosave.version_conflict', { reportId, conflict });

        if (onVersionConflict) {
          onVersionConflict(conflict);
        }
      } else {
        // Network or server error - retry with exponential backoff
        const errorMsg = mapApiError(err);
        setError(errorMsg);
        
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);

        reportError(err, { 
          reportId, 
          action: 'autosave', 
          retryCount: newRetryCount 
        }, 'medium');

        telemetryEmit('autosave.failure', { 
          reportId, 
          error: errorMsg, 
          retryCount: newRetryCount 
        });
        
        if (onSaveError) {
          onSaveError(errorMsg);
        }

        // Add to offline queue if enabled and reportId exists
        if (enableQueue && reportId && !reportId.startsWith('temp-')) {
          try {
            await offlineQueue.add({
              reportId,
              action: reportId ? 'update' : 'create',
              data: dataRef.current
            });
            console.log('💾 Added failed save to offline queue');
            telemetryEmit('autosave.queued', { reportId });
            
            // Update queue count immediately
            const items = await offlineQueue.getByReportId(reportId);
            setQueuedItemsCount(items.length);
          } catch (queueError) {
            console.error('Failed to add to offline queue:', queueError);
          }
        }

        // Schedule retry with exponential backoff
        const backoffDelay = calculateBackoff(newRetryCount);
        console.log(`⏱️ Retrying autosave in ${backoffDelay}ms (attempt ${newRetryCount})`);
        
        retryTimerRef.current = setTimeout(() => {
          save();
        }, backoffDelay);
      }
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, [reportId, enabled, isOffline, retryCount, enableQueue, onSaveSuccess, onSaveError, onVersionConflict]);

  /**
   * Debounced autosave effect
   */
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges || paused || isOffline) {
      return;
    }

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      save();
    }, interval);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [enabled, hasUnsavedChanges, paused, isOffline, interval, save]);

  /**
   * Manual save function
   */
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    await save();
  }, [save]);

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
    hasUnsavedChanges,
    isOffline,
    retryCount,
    queuedItemsCount
  };
};

export default useAutosave;
