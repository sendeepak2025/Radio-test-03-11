/**
 * Integration Example: How to Add AI Analysis Control to MedicalImageViewer
 * 
 * This shows the minimal changes needed to integrate the new AI analysis system
 */

// ============================================
// STEP 1: Add imports at the top of MedicalImageViewer.tsx
// ============================================

import { AIAnalysisControl } from './AIAnalysisControl'
import { BackgroundJobsPanel } from './BackgroundJobsPanel'
import { aiAnalysisQueue, QueueStats } from '../../services/AIAnalysisQueue'

// ============================================
// STEP 2: Add state variables (around line 300)
// ============================================

// AI Analysis Control
const [showAIControl, setShowAIControl] = useState(false)
const [showBackgroundJobs, setShowBackgroundJobs] = useState(false)
const [queueStats, setQueueStats] = useState<QueueStats>({
  total: 0,
  queued: 0,
  processing: 0,
  complete: 0,
  failed: 0,
  progress: 0
})

// ============================================
// STEP 3: Subscribe to queue updates (add useEffect)
// ============================================

// Subscribe to AI analysis queue updates
useEffect(() => {
  const unsubscribe = aiAnalysisQueue.subscribe((stats) => {
    setQueueStats(stats)
  })

  return unsubscribe
}, [])

// ============================================
// STEP 4: Add toolbar buttons (in the toolbar section)
// ============================================

{/* AI Analysis Control Button */}
<Tooltip title="AI Analysis Control">
  <IconButton
    onClick={() => setShowAIControl(!showAIControl)}
    color={showAIControl ? 'primary' : 'default'}
  >
    <AIIcon />
  </IconButton>
</Tooltip>

{/* Background Jobs Button (with badge) */}
<Tooltip title="Background Jobs">
  <Badge 
    badgeContent={queueStats.processing + queueStats.queued} 
    color="primary"
    invisible={queueStats.processing + queueStats.queued === 0}
  >
    <IconButton
      onClick={() => setShowBackgroundJobs(!showBackgroundJobs)}
      color={showBackgroundJobs ? 'primary' : 'default'}
    >
      <ListIcon />
    </IconButton>
  </Badge>
</Tooltip>

// ============================================
// STEP 5: Add panels (in the main render, after canvas)
// ============================================

{/* AI Analysis Control Panel */}
{showAIControl && (
  <Box
    sx={{
      position: 'absolute',
      top: 80,
      right: 20,
      zIndex: 1000,
      maxWidth: 500,
    }}
  >
    <AIAnalysisControl
      studyInstanceUID={currentStudyId}
      seriesInstanceUID={seriesInstanceUID}
      currentFrameIndex={currentFrameIndex}
      totalFrames={totalFrames}
      onClose={() => setShowAIControl(false)}
    />
  </Box>
)}

{/* Background Jobs Panel */}
{showBackgroundJobs && (
  <Box
    sx={{
      position: 'absolute',
      top: 80,
      right: 20,
      zIndex: 1000,
      maxWidth: 600,
    }}
  >
    <BackgroundJobsPanel
      onViewResult={(job) => {
        // Navigate to the slice
        setCurrentFrameIndex(job.sliceIndex)
        
        // Show the result in analysis panel
        setIsAnalysisPanelOpen(true)
        
        // Close background jobs panel
        setShowBackgroundJobs(false)
        
        console.log('Viewing result for job:', job)
      }}
    />
  </Box>
)}

// ============================================
// COMPLETE EXAMPLE: Minimal Integration
// ============================================

/**
 * Here's what the toolbar section would look like with AI buttons added:
 */

<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
  {/* Existing buttons */}
  <Tooltip title="Pan">
    <IconButton onClick={() => setActiveTool('pan')}>
      <PanIcon />
    </IconButton>
  </Tooltip>
  
  <Tooltip title="Zoom">
    <IconButton onClick={() => setActiveTool('zoom')}>
      <ZoomIcon />
    </IconButton>
  </Tooltip>

  <Divider orientation="vertical" flexItem />

  {/* NEW: AI Analysis Buttons */}
  <Tooltip title="AI Analysis Control">
    <IconButton
      onClick={() => setShowAIControl(!showAIControl)}
      color={showAIControl ? 'primary' : 'default'}
    >
      <AIIcon />
    </IconButton>
  </Tooltip>

  <Tooltip title="Background Jobs">
    <Badge 
      badgeContent={queueStats.processing + queueStats.queued} 
      color="primary"
      invisible={queueStats.processing + queueStats.queued === 0}
    >
      <IconButton
        onClick={() => setShowBackgroundJobs(!showBackgroundJobs)}
        color={showBackgroundJobs ? 'primary' : 'default'}
      >
        <ListIcon />
      </IconButton>
    </Badge>
  </Tooltip>

  <Divider orientation="vertical" flexItem />

  {/* More existing buttons... */}
</Box>

// ============================================
// ALTERNATIVE: Dialog-based Integration
// ============================================

/**
 * If you prefer dialogs instead of floating panels:
 */

{/* AI Analysis Control Dialog */}
<Dialog
  open={showAIControl}
  onClose={() => setShowAIControl(false)}
  maxWidth="sm"
  fullWidth
>
  <AIAnalysisControl
    studyInstanceUID={currentStudyId}
    seriesInstanceUID={seriesInstanceUID}
    currentFrameIndex={currentFrameIndex}
    totalFrames={totalFrames}
    onClose={() => setShowAIControl(false)}
  />
</Dialog>

{/* Background Jobs Dialog */}
<Dialog
  open={showBackgroundJobs}
  onClose={() => setShowBackgroundJobs(false)}
  maxWidth="md"
  fullWidth
>
  <DialogTitle>
    Background Analysis Jobs
    <IconButton
      onClick={() => setShowBackgroundJobs(false)}
      sx={{ position: 'absolute', right: 8, top: 8 }}
    >
      <CloseIcon />
    </IconButton>
  </DialogTitle>
  <DialogContent>
    <BackgroundJobsPanel
      onViewResult={(job) => {
        setCurrentFrameIndex(job.sliceIndex)
        setIsAnalysisPanelOpen(true)
        setShowBackgroundJobs(false)
      }}
    />
  </DialogContent>
</Dialog>

// ============================================
// KEYBOARD SHORTCUTS (Optional Enhancement)
// ============================================

/**
 * Add keyboard shortcuts for quick access:
 */

useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl+Shift+A: Toggle AI Control
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault()
      setShowAIControl(prev => !prev)
    }
    
    // Ctrl+Shift+J: Toggle Background Jobs
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault()
      setShowBackgroundJobs(prev => !prev)
    }
    
    // Ctrl+Shift+Q: Quick analyze current slice
    if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
      e.preventDefault()
      // Trigger quick analysis
      aiAnalysisQueue.addJob({
        sliceIndex: currentFrameIndex,
        studyInstanceUID: currentStudyId,
        seriesInstanceUID: seriesInstanceUID,
        priority: 'urgent'
      })
    }
  }

  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [currentFrameIndex, currentStudyId, seriesInstanceUID])

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example 1: Analyze current slice (Phase 1)
 */
const analyzeCurrentSlice = async () => {
  await autoAnalysisService.autoAnalyze({
    studyInstanceUID: currentStudyId,
    seriesInstanceUID: seriesInstanceUID,
    slices: [currentFrameIndex],
    mode: 'single'
  })
}

/**
 * Example 2: Batch analyze series (Phase 2)
 */
const batchAnalyzeSeries = () => {
  // Analyze every 10th slice
  const slices = Array.from(
    { length: Math.ceil(totalFrames / 10) },
    (_, i) => i * 10
  ).filter(i => i < totalFrames)

  aiAnalysisQueue.addBatch(
    slices,
    currentStudyId,
    seriesInstanceUID,
    'normal'
  )
}

/**
 * Example 3: Urgent analysis (high priority)
 */
const urgentAnalysis = () => {
  aiAnalysisQueue.addJob({
    sliceIndex: currentFrameIndex,
    studyInstanceUID: currentStudyId,
    seriesInstanceUID: seriesInstanceUID,
    priority: 'urgent' // Will be processed first
  })
}

/**
 * Example 4: Background analysis (low priority)
 */
const backgroundAnalysis = () => {
  const allSlices = Array.from({ length: totalFrames }, (_, i) => i)
  
  aiAnalysisQueue.addBatch(
    allSlices,
    currentStudyId,
    seriesInstanceUID,
    'background' // Will be processed when idle
  )
}

// ============================================
// TESTING CHECKLIST
// ============================================

/**
 * After integration, test these scenarios:
 * 
 * Phase 1 (Manual):
 * ✅ Click "Analyze Current Slice" button
 * ✅ Verify analysis starts
 * ✅ Verify results appear in Analysis Panel
 * ✅ Verify error handling (disconnect backend)
 * 
 * Phase 2 (Batch):
 * ✅ Select "Batch" mode
 * ✅ Configure smart sampling
 * ✅ Click "Start Batch Analysis"
 * ✅ Verify queue progress updates
 * ✅ Verify jobs appear in Background Jobs panel
 * ✅ Test cancel/retry/clear actions
 * ✅ Verify rate limiting (check console logs)
 * ✅ Verify caching (analyze same slice twice)
 * 
 * UI/UX:
 * ✅ Verify panels are positioned correctly
 * ✅ Verify panels can be closed
 * ✅ Verify badge shows correct count
 * ✅ Verify keyboard shortcuts work
 * ✅ Verify responsive layout
 */

// ============================================
// TROUBLESHOOTING
// ============================================

/**
 * Common issues and solutions:
 * 
 * 1. "Queue not processing"
 *    - Check console for errors
 *    - Verify backend is running
 *    - Check rate limit settings
 * 
 * 2. "Results not showing"
 *    - Verify AutoAnalysisService integration
 *    - Check Analysis Panel is open
 *    - Verify slice index matches
 * 
 * 3. "Badge not updating"
 *    - Verify queue subscription in useEffect
 *    - Check queueStats state updates
 * 
 * 4. "Panels overlapping"
 *    - Adjust zIndex values
 *    - Adjust positioning (top, right values)
 *    - Consider using dialogs instead
 */

export {}
