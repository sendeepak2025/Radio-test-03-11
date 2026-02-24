import React, { useState, useEffect } from 'react';
import { X, Disc, AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface BurnTask {
  id: string;
  targetType: 'patient' | 'study';
  targetId: string;
  targetName?: string;
  status: 'preparing' | 'burning' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  startTime: number;
  endTime?: number;
  error?: string;
}

interface BurnStatusPanelProps {
  tasks: BurnTask[];
  onCancel: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
  onClearAll: () => void;
}

export const BurnStatusPanel: React.FC<BurnStatusPanelProps> = ({
  tasks,
  onCancel,
  onDismiss,
  onClearAll,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newElapsedTimes: Record<string, number> = {};
      
      tasks.forEach(task => {
        if (task.status === 'preparing' || task.status === 'burning') {
          newElapsedTimes[task.id] = Math.floor((now - task.startTime) / 1000);
        }
      });
      
      setElapsedTimes(newElapsedTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  if (tasks.length === 0) return null;

  const activeTasks = tasks.filter(t => t.status === 'preparing' || t.status === 'burning');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: BurnTask['status']) => {
    switch (status) {
      case 'preparing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'burning':
        return <Disc className="w-5 h-5 text-orange-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: BurnTask['status']) => {
    switch (status) {
      case 'preparing':
        return 'bg-blue-50 border-blue-200';
      case 'burning':
        return 'bg-orange-50 border-orange-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'cancelled':
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Disc className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">
            CD Burn Operations
          </h3>
          {activeTasks.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
              {activeTasks.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '^' : 'v'}
          </button>
          {(activeTasks.length > 0 || completedTasks.length > 0) && (
            <button
              onClick={() => {
                if (activeTasks.length > 0) {
                  if (window.confirm(`Cancel ${activeTasks.length} active burn(s) and clear all tasks?`)) {
                    onClearAll();
                  }
                } else {
                  onClearAll();
                }
              }}
              className="text-xs px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Cancel all active burns and clear completed tasks"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                In Progress
              </h4>
              {activeTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${getStatusColor(task.status)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {task.targetName || `${task.targetType} ${task.targetId}`}
                        </p>
                        <p className="text-xs text-gray-600">
                          {task.status === 'preparing' ? 'Preparing files...' : 'Burning to disc...'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancel(task.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{task.message}</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Elapsed Time */}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Elapsed: {formatTime(elapsedTimes[task.id] || 0)}</span>
                    <span>Est. 5-10 min</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="p-4 space-y-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Completed ({completedTasks.length})
                </h4>
                <button
                  onClick={() => {
                    completedTasks.forEach(task => onDismiss(task.id));
                  }}
                  className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                  Clear Completed
                </button>
              </div>
              {completedTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${getStatusColor(task.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {task.targetName || `${task.targetType} ${task.targetId}`}
                        </p>
                        <p className="text-xs text-gray-600">
                          {task.status === 'completed' && 'Burn completed successfully'}
                          {task.status === 'failed' && (task.error || 'Burn failed')}
                          {task.status === 'cancelled' && 'Cancelled by user'}
                        </p>
                        {task.endTime && (
                          <p className="text-xs text-gray-500 mt-1">
                            Duration: {formatTime(Math.max(1, Math.floor((task.endTime - task.startTime) / 1000)))}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDismiss(task.id);
                      }}
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      title="Remove this task"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Minimized View */}
      {isMinimized && activeTasks.length > 0 && (
        <div className="p-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {activeTasks.length} burn{activeTasks.length > 1 ? 's' : ''} in progress...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BurnStatusPanel;
