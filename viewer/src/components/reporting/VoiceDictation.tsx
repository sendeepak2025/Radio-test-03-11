import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Typography,
  ToggleButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Mic,
  MicOff,
  Stop,
  Settings,
  Help
} from '@mui/icons-material';
import voiceDictation from '../../services/voiceDictation';
import voiceCommands from '../../services/voiceCommands';

interface VoiceDictationProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onCommand?: (command: string) => void;
  enabled?: boolean;
}

export default function VoiceDictation({
  onTranscript,
  onCommand,
  enabled = true
}: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confidence, setConfidence] = useState(100);

  const languages = voiceDictation.getAvailableLanguages();
  const isSupported = voiceDictation.isSupported();

  useEffect(() => {
    return () => {
      if (isListening) {
        voiceDictation.stop();
      }
    };
  }, [isListening]);

  const handleStart = () => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    setError(null);
    setInterimTranscript('');

    voiceDictation.start({
      language,
      continuous: true,
      interimResults: true,
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          // Check for voice commands
          const result = voiceCommands.processTranscript(transcript);
          
          if (result.isCommand) {
            if (result.executed && result.command) {
              onCommand?.(result.command);
            }
            setInterimTranscript('');
          } else {
            // Apply medical corrections and punctuation
            let processedText = voiceDictation.applyMedicalCorrections(transcript);
            processedText = voiceDictation.applyAutoPunctuation(processedText);
            
            onTranscript(processedText, true);
            setInterimTranscript('');
          }
        } else {
          setInterimTranscript(transcript);
          onTranscript(transcript, false);
        }
      },
      onError: (err) => {
        setError(err);
        setIsListening(false);
      },
      onStart: () => {
        setIsListening(true);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
  };

  const handleStop = () => {
    voiceDictation.stop();
    setIsListening(false);
    setInterimTranscript('');
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    voiceDictation.setLanguage(newLanguage);
    
    if (isListening) {
      handleStop();
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <Box>
      {/* Dictation Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isListening ? 'Stop Dictation' : 'Start Dictation'}>
          <ToggleButton
            value="dictation"
            selected={isListening}
            onChange={() => isListening ? handleStop() : handleStart()}
            color={isListening ? 'error' : 'primary'}
            disabled={!isSupported}
          >
            {isListening ? <MicOff /> : <Mic />}
          </ToggleButton>
        </Tooltip>

        {isListening && (
          <Chip
            label="Recording"
            color="error"
            size="small"
            icon={<Mic />}
            sx={{
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 }
              }
            }}
          />
        )}

        <Tooltip title="Settings">
          <IconButton size="small" onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>
        </Tooltip>

        <Tooltip title="Voice Commands Help">
          <IconButton size="small" onClick={() => setHelpOpen(true)}>
            <Help />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Interim Transcript Display */}
      {isListening && interimTranscript && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Listening...
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            {interimTranscript}
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Paper>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Not Supported Warning */}
      {!isSupported && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Voice dictation is not supported in your browser. Please use Chrome, Edge, or Safari.
        </Alert>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Voice Dictation Settings</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Language</InputLabel>
            <Select
              value={language}
              label="Language"
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {languages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="body2" sx={{ mt: 3 }} color="text.secondary">
            Voice dictation uses your browser's speech recognition API. 
            For best results, speak clearly and use a quality microphone.
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Voice Commands</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            You can use voice commands to navigate and control the report editor:
          </Typography>

          <List>
            {voiceCommands.getCommands().map((cmd, idx) => (
              <ListItem key={idx}>
                <ListItemText
                  primary={cmd.command}
                  secondary={
                    <>
                      {cmd.description}
                      <br />
                      <Typography component="span" variant="caption" color="text.secondary">
                        Aliases: {cmd.aliases.join(', ')}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
            <strong>Dictation Tips:</strong>
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary='Say "period" or "comma" to insert punctuation' />
            </ListItem>
            <ListItem>
              <ListItemText primary='Say "new paragraph" to start a new paragraph' />
            </ListItem>
            <ListItem>
              <ListItemText primary='Say "delete last sentence" to undo' />
            </ListItem>
            <ListItem>
              <ListItemText primary="Medical terms are automatically corrected" />
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
