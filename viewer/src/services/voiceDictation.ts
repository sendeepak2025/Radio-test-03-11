/**
 * Voice Dictation Service
 * Web Speech API integration for continuous dictation
 */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface DictationOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

class VoiceDictationService {
  private recognition: any = null;
  private isListening: boolean = false;
  private language: string = 'en-US';
  private continuous: boolean = true;
  private interimResults: boolean = true;
  
  constructor() {
    this.initialize();
  }

  /**
   * Initialize Speech Recognition
   */
  private initialize() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      console.warn('Speech Recognition API not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Start dictation
   */
  start(options: DictationOptions = {}): void {
    if (!this.recognition) {
      options.onError?.('Speech recognition not supported');
      return;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    // Configure recognition
    this.recognition.lang = options.language || this.language;
    this.recognition.continuous = options.continuous ?? this.continuous;
    this.recognition.interimResults = options.interimResults ?? this.interimResults;
    this.recognition.maxAlternatives = options.maxAlternatives || 1;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      options.onStart?.();
      console.log('🎤 Dictation started');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      options.onEnd?.();
      console.log('🎤 Dictation ended');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        options.onResult?.(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        options.onResult?.(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        options.onError?.('No speech detected. Please try again.');
      } else if (event.error === 'audio-capture') {
        options.onError?.('Microphone not found. Please check your microphone.');
      } else if (event.error === 'not-allowed') {
        options.onError?.('Microphone permission denied.');
      } else {
        options.onError?.(event.error);
      }
    };

    // Start recognition
    try {
      this.recognition.start();
    } catch (error: any) {
      console.error('Failed to start recognition:', error);
      options.onError?.(error.message);
    }
  }

  /**
   * Stop dictation
   */
  stop(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Failed to stop recognition:', error);
    }
  }

  /**
   * Abort dictation (immediate stop)
   */
  abort(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.abort();
      this.isListening = false;
    } catch (error) {
      console.error('Failed to abort recognition:', error);
    }
  }

  /**
   * Change language
   */
  setLanguage(language: string): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): { code: string; name: string }[] {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'en-AU', name: 'English (Australia)' },
      { code: 'en-CA', name: 'English (Canada)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'ar-SA', name: 'Arabic' }
    ];
  }

  /**
   * Apply auto-punctuation to transcript
   */
  applyAutoPunctuation(text: string): string {
    let result = text;

    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1);

    // Add period at end if not present
    if (!result.match(/[.!?]$/)) {
      result += '.';
    }

    // Capitalize after periods
    result = result.replace(/\. ([a-z])/g, (match, letter) => '. ' + letter.toUpperCase());

    // Handle common dictation commands
    result = result.replace(/\b(period|full stop)\b/gi, '.');
    result = result.replace(/\bcomma\b/gi, ',');
    result = result.replace(/\bquestion mark\b/gi, '?');
    result = result.replace(/\bexclamation mark\b/gi, '!');
    result = result.replace(/\bnew paragraph\b/gi, '\n\n');
    result = result.replace(/\bnew line\b/gi, '\n');

    return result;
  }

  /**
   * Apply medical vocabulary corrections
   */
  applyMedicalCorrections(text: string): string {
    const corrections: Record<string, string> = {
      // Common radiology terms
      'new mothorax': 'pneumothorax',
      'consolidation': 'consolidation',
      'parenchymal': 'parenchymal',
      'mediastinum': 'mediastinum',
      'pulmonary': 'pulmonary',
      'cardio megaly': 'cardiomegaly',
      'hepato megaly': 'hepatomegaly',
      'spleno megaly': 'splenomegaly',
      'lymph adenopathy': 'lymphadenopathy',
      
      // Measurements
      'centimeter': 'cm',
      'centimeters': 'cm',
      'millimeter': 'mm',
      'millimeters': 'mm',
      
      // Common findings
      'no acute': 'no acute',
      'within normal limits': 'within normal limits',
      'unremarkable': 'unremarkable'
    };

    let result = text;
    for (const [wrong, correct] of Object.entries(corrections)) {
      const regex = new RegExp(wrong, 'gi');
      result = result.replace(regex, correct);
    }

    return result;
  }
}

export default new VoiceDictationService();
