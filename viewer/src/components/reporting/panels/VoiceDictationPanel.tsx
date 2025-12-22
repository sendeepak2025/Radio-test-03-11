/**
 * Voice Dictation Panel
 * Enhanced voice-to-text with real-time transcription, voice commands, and auto-punctuation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  LinearProgress,
  Collapse
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
  VolumeUp as VolumeIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ContentCopy as CopyIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useReporting } from '../../../contexts/ReportingContext';

// Voice command definitions
const VOICE_COMMANDS: Record<string, { action: string; description: string }> = {
  'period': { action: 'punctuation', description: 'Insert period (.)' },
  'full stop': { action: 'punctuation', description: 'Insert period (.)' },
  'comma': { action: 'punctuation', description: 'Insert comma (,)' },
  'question mark': { action: 'punctuation', description: 'Insert question mark (?)' },
  'exclamation mark': { action: 'punctuation', description: 'Insert exclamation mark (!)' },
  'colon': { action: 'punctuation', description: 'Insert colon (:)' },
  'semicolon': { action: 'punctuation', description: 'Insert semicolon (;)' },
  'new line': { action: 'newline', description: 'Insert new line' },
  'new paragraph': { action: 'paragraph', description: 'Insert new paragraph' },
  'next field': { action: 'nextField', description: 'Move to next field' },
  'previous field': { action: 'prevField', description: 'Move to previous field' },
  'go to findings': { action: 'gotoFindings', description: 'Switch to Findings field' },
  'go to impression': { action: 'gotoImpression', description: 'Switch to Impression field' },
  'go to technique': { action: 'gotoTechnique', description: 'Switch to Technique field' },
  'go to history': { action: 'gotoHistory', description: 'Switch to Clinical History field' },
  'go to recommendations': { action: 'gotoRecommendations', description: 'Switch to Recommendations field' },
  'clear field': { action: 'clearField', description: 'Clear current field' },
  'undo': { action: 'undo', description: 'Undo last dictation' },
  'stop dictation': { action: 'stop', description: 'Stop voice dictation' },
  'pause dictation': { action: 'pause', description: 'Pause voice dictation' }
};

// Punctuation mappings for auto-punctuation
const PUNCTUATION_MAP: Record<string, string> = {
  'period': '.',
  'full stop': '.',
  'comma': ',',
  'question mark': '?',
  'exclamation mark': '!',
  'exclamation point': '!',
  'colon': ':',
  'semicolon': ';',
  'hyphen': '-',
  'dash': '—',
  'open parenthesis': '(',
  'close parenthesis': ')',
  'open bracket': '[',
  'close bracket': ']',
  'quote': '"',
  'apostrophe': "'"
};

// Field order for navigation
const FIELD_ORDER = ['clinicalHistory', 'technique', 'findingsText', 'impression', 'recommendations'];

const VoiceDictationPanel: React.FC = () => {
  const { state, actions } = useReporting();
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [targetField, setTargetField] = useState<string>('findingsText');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Settings
  const [autoPunctuation, setAutoPunctuation] = useState(true);
  const [voiceCommands, setVoiceCommands] = useState(true);
  const [autoCapitalize, setAutoCapitalize] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  
  // History for undo
  const [history, setHistory] = useState<string[]>([]);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Process text with auto-punctuation and capitalization
  const processText = useCallback((text: string): string => {
    let processed = text;
    
    if (autoPunctuation) {
      // Replace spoken punctuation with symbols
      Object.entries(PUNCTUATION_MAP).forEach(([spoken, symbol]) => {
        const regex = new RegExp(`\\b${spoken}\\b`, 'gi');
        processed = processed.replace(regex, symbol);
      });
    }
    
    if (autoCapitalize) {
      // Capitalize after sentence-ending punctuation
      processed = processed.replace(/([.!?]\s*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
      
      // Capitalize first letter if at start
      if (processed.length > 0 && /[a-z]/.test(processed[0])) {
        processed = processed[0].toUpperCase() + processed.slice(1);
      }
    }
    
    return processed;
  }, [autoPunctuation, autoCapitalize]);

  // Handle voice commands
  const handleVoiceCommand = useCallback((text: string): boolean => {
    if (!voiceCommands) return false;
    
    const lowerText = text.toLowerCase().trim();
    
    for (const [command, config] of Object.entries(VOICE_COMMANDS)) {
      if (lowerText.includes(command)) {
        setLastCommand(command);
        
        switch (config.action) {
          case 'punctuation':
            const punct = PUNCTUATION_MAP[command] || '.';
            const currentValue = state[targetField as keyof typeof state] as string || '';
            actions.updateField(targetField as any, currentValue.trimEnd() + punct + ' ');
            return true;
            
          case 'newline':
            const val1 = state[targetField as keyof typeof state] as string || '';
            actions.updateField(targetField as any, val1 + '\n');
            return true;
            
          case 'paragraph':
            const val2 = state[targetField as keyof typeof state] as string || '';
            actions.updateField(targetField as any, val2 + '\n\n');
            return true;
            
          case 'nextField':
            const currentIdx = FIELD_ORDER.indexOf(targetField);
            if (currentIdx < FIELD_ORDER.length - 1) {
              setTargetField(FIELD_ORDER[currentIdx + 1]);
            }
            return true;
            
          case 'prevField':
            const prevIdx = FIELD_ORDER.indexOf(targetField);
            if (prevIdx > 0) {
              setTargetField(FIELD_ORDER[prevIdx - 1]);
            }
            return true;
            
          case 'gotoFindings':
            setTargetField('findingsText');
            return true;
            
          case 'gotoImpression':
            setTargetField('impression');
            return true;
            
          case 'gotoTechnique':
            setTargetField('technique');
            return true;
            
          case 'gotoHistory':
            setTargetField('clinicalHistory');
            return true;
            
          case 'gotoRecommendations':
            setTargetField('recommendations');
            return true;
            
          case 'clearField':
            setHistory(prev => [...prev, state[targetField as keyof typeof state] as string || '']);
            actions.updateField(targetField as any, '');
            return true;
            
          case 'undo':
            if (history.length > 0) {
              const lastValue = history[history.length - 1];
              actions.updateField(targetField as any, lastValue);
              setHistory(prev => prev.slice(0, -1));
            }
            return true;
            
          case 'stop':
            stopListening();
            return true;
            
          case 'pause':
            pauseListening();
            return true;
        }
      }
    }
    
    return false;
  }, [voiceCommands, targetField, state, actions, history]);

  // Initialize audio level monitoring
  const startAudioMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateLevel = () => {
        if (analyserRef.current && isListening) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, average * 1.5));
          animationRef.current = requestAnimationFrame(updateLevel);
        }
      };
      
      updateLevel();
    } catch (err) {
      console.error('Audio monitoring error:', err);
    }
  }, [isListening]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptText + ' ';
          } else {
            interim += transcriptText;
          }
        }
        
        if (final) {
          // Check for voice commands first
          if (!handleVoiceCommand(final)) {
            // Process and add to field
            const processed = processText(final);
            setTranscript(prev => prev + processed);
            setInterimTranscript('');
            
            // Save to history for undo
            setHistory(prev => [...prev.slice(-10), state[targetField as keyof typeof state] as string || '']);
            
            // Update the target field
            const currentValue = state[targetField as keyof typeof state] as string || '';
            actions.updateField(targetField as any, currentValue + processed);
          }
        } else {
          setInterimTranscript(interim);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(`Error: ${event.error}`);
        }
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };
      
      recognitionRef.current.onend = () => {
        if (isListening && !isPaused) {
          // Restart if still supposed to be listening
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started
          }
        }
      };
    } else {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isListening, isPaused, targetField, state, actions, handleVoiceCommand, processText]);
  
  const startListening = async () => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      setLastCommand(null);
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsPaused(false);
        await startAudioMonitoring();
      } catch (e: any) {
        setError(e.message);
      }
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsPaused(false);
      setInterimTranscript('');
      setAudioLevel(0);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };
  
  const pauseListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsPaused(true);
      setAudioLevel(0);
    }
  };
  
  const resumeListening = () => {
    if (recognitionRef.current && isPaused) {
      recognitionRef.current.start();
      setIsPaused(false);
    }
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      clinicalHistory: 'Clinical History',
      technique: 'Technique',
      findingsText: 'Findings',
      impression: 'Impression',
      recommendations: 'Recommendations'
    };
    return labels[field] || field;
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MicIcon color="primary" />
          Voice Dictation
        </Typography>
        <Tooltip title="Settings">
          <IconButton size="small" onClick={() => setShowSettings(!showSettings)}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Settings Panel */}
      <Collapse in={showSettings}>
        <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Settings
          </Typography>
          <FormControlLabel
            control={<Switch checked={autoPunctuation} onChange={(e) => setAutoPunctuation(e.target.checked)} size="small" />}
            label={<Typography variant="body2">Auto-punctuation</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={voiceCommands} onChange={(e) => setVoiceCommands(e.target.checked)} size="small" />}
            label={<Typography variant="body2">Voice commands</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={autoCapitalize} onChange={(e) => setAutoCapitalize(e.target.checked)} size="small" />}
            label={<Typography variant="body2">Auto-capitalize</Typography>}
          />
        </Paper>
      </Collapse>
      
      {/* Target Field Selector */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Dictate to Field</InputLabel>
        <Select
          value={targetField}
          label="Dictate to Field"
          onChange={(e) => setTargetField(e.target.value)}
        >
          <MenuItem value="clinicalHistory">Clinical History</MenuItem>
          <MenuItem value="technique">Technique</MenuItem>
          <MenuItem value="findingsText">Findings</MenuItem>
          <MenuItem value="impression">Impression</MenuItem>
          <MenuItem value="recommendations">Recommendations</MenuItem>
        </Select>
      </FormControl>
      
      {/* Status & Audio Level */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: isListening ? (isPaused ? 'warning.light' : 'success.light') : 'background.default' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <VolumeIcon fontSize="small" color={isListening ? 'success' : 'disabled'} />
            <Typography variant="body2">
              {isListening ? (isPaused ? 'Paused' : `Dictating to: ${getFieldLabel(targetField)}`) : 'Ready'}
            </Typography>
          </Box>
          {isListening && !isPaused && (
            <Chip 
              label="● LIVE" 
              color="error" 
              size="small"
              sx={{ animation: 'pulse 1.5s infinite' }}
            />
          )}
        </Box>
        
        {/* Audio Level Meter */}
        {isListening && !isPaused && (
          <LinearProgress 
            variant="determinate" 
            value={audioLevel} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                bgcolor: audioLevel > 70 ? 'error.main' : audioLevel > 40 ? 'warning.main' : 'success.main'
              }
            }}
          />
        )}

        {/* Last Command */}
        {lastCommand && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last command: "{lastCommand}"
          </Typography>
        )}
      </Paper>
      
      {/* Controls */}
      <Box display="flex" gap={1} justifyContent="center" mb={2}>
        {!isListening ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<MicIcon />}
            onClick={startListening}
            size="large"
            fullWidth
          >
            Start Dictation
          </Button>
        ) : (
          <>
            {!isPaused ? (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<PauseIcon />}
                onClick={pauseListening}
                sx={{ flex: 1 }}
              >
                Pause
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="success"
                startIcon={<PlayIcon />}
                onClick={resumeListening}
                sx={{ flex: 1 }}
              >
                Resume
              </Button>
            )}
            
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={stopListening}
              sx={{ flex: 1 }}
            >
              Stop
            </Button>
          </>
        )}
      </Box>
      
      {/* Live Transcript */}
      {(transcript || interimTranscript) && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Session Transcript
            </Typography>
            <Box>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={copyTranscript}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear">
                <IconButton size="small" onClick={clearTranscript}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ maxHeight: 150, overflow: 'auto' }}>
            {transcript}
            <span style={{ color: '#666', fontStyle: 'italic', backgroundColor: '#fff3cd' }}>
              {interimTranscript}
            </span>
          </Typography>
        </Paper>
      )}

      {/* Voice Commands Reference */}
      <Paper elevation={1} sx={{ p: 2, bgcolor: 'info.light' }}>
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          sx={{ cursor: 'pointer' }}
          onClick={() => setShowCommands(!showCommands)}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            🎤 Voice Commands
          </Typography>
          {showCommands ? <CollapseIcon /> : <ExpandIcon />}
        </Box>
        
        <Collapse in={showCommands}>
          <Divider sx={{ my: 1 }} />
          <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
            {Object.entries(VOICE_COMMANDS).slice(0, 15).map(([command, config]) => (
              <ListItem key={command} sx={{ py: 0 }}>
                <ListItemText
                  primary={<Typography variant="caption" sx={{ fontWeight: 'bold' }}>"{command}"</Typography>}
                  secondary={<Typography variant="caption" color="text.secondary">{config.description}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
        
        {!showCommands && (
          <Typography variant="caption" component="div" sx={{ mt: 1 }}>
            Say "period", "comma", "new line", "go to findings", etc.
          </Typography>
        )}
      </Paper>
      
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  );
};

export default VoiceDictationPanel;
