/**
 * Voice Commands Service
 * Handle voice commands for navigation and actions
 */

export interface VoiceCommand {
  command: string;
  aliases: string[];
  action: () => void;
  description: string;
}

class VoiceCommandsService {
  private commands: Map<string, VoiceCommand> = new Map();
  private enabled: boolean = false;

  /**
   * Register a voice command
   */
  register(command: VoiceCommand): void {
    this.commands.set(command.command.toLowerCase(), command);
    
    // Register aliases
    command.aliases.forEach(alias => {
      this.commands.set(alias.toLowerCase(), command);
    });
  }

  /**
   * Unregister a command
   */
  unregister(commandName: string): void {
    const command = this.commands.get(commandName.toLowerCase());
    if (command) {
      this.commands.delete(commandName.toLowerCase());
      command.aliases.forEach(alias => {
        this.commands.delete(alias.toLowerCase());
      });
    }
  }

  /**
   * Process transcript for commands
   */
  processTranscript(transcript: string): { isCommand: boolean; executed: boolean; command?: string } {
    if (!this.enabled) {
      return { isCommand: false, executed: false };
    }

    const lowerTranscript = transcript.toLowerCase().trim();

    // Check if transcript matches any command
    for (const [key, command] of this.commands.entries()) {
      if (lowerTranscript.includes(key)) {
        try {
          command.action();
          return { isCommand: true, executed: true, command: command.command };
        } catch (error) {
          console.error(`Failed to execute command ${command.command}:`, error);
          return { isCommand: true, executed: false, command: command.command };
        }
      }
    }

    return { isCommand: false, executed: false };
  }

  /**
   * Get all registered commands
   */
  getCommands(): VoiceCommand[] {
    const uniqueCommands = new Map<string, VoiceCommand>();
    
    this.commands.forEach((command) => {
      if (!uniqueCommands.has(command.command)) {
        uniqueCommands.set(command.command, command);
      }
    });

    return Array.from(uniqueCommands.values());
  }

  /**
   * Enable voice commands
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable voice commands
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if commands are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
  }

  /**
   * Register common report navigation commands
   */
  registerReportCommands(callbacks: {
    nextSection?: () => void;
    previousSection?: () => void;
    goToSection?: (section: string) => void;
    saveReport?: () => void;
    signReport?: () => void;
    newParagraph?: () => void;
    deleteLastSentence?: () => void;
  }): void {
    if (callbacks.nextSection) {
      this.register({
        command: 'next section',
        aliases: ['next', 'go to next section', 'move to next section'],
        action: callbacks.nextSection,
        description: 'Navigate to the next section'
      });
    }

    if (callbacks.previousSection) {
      this.register({
        command: 'previous section',
        aliases: ['previous', 'go to previous section', 'go back', 'back'],
        action: callbacks.previousSection,
        description: 'Navigate to the previous section'
      });
    }

    if (callbacks.goToSection) {
      const sections = ['findings', 'impression', 'technique', 'comparison', 'indication'];
      sections.forEach(section => {
        this.register({
          command: `go to ${section}`,
          aliases: [`${section}`, `jump to ${section}`, `navigate to ${section}`],
          action: () => callbacks.goToSection!(section),
          description: `Navigate to ${section} section`
        });
      });
    }

    if (callbacks.saveReport) {
      this.register({
        command: 'save report',
        aliases: ['save', 'save draft'],
        action: callbacks.saveReport,
        description: 'Save the current report'
      });
    }

    if (callbacks.signReport) {
      this.register({
        command: 'sign report',
        aliases: ['sign', 'finalize report'],
        action: callbacks.signReport,
        description: 'Open signature dialog'
      });
    }

    if (callbacks.newParagraph) {
      this.register({
        command: 'new paragraph',
        aliases: ['paragraph', 'start new paragraph'],
        action: callbacks.newParagraph,
        description: 'Insert a new paragraph'
      });
    }

    if (callbacks.deleteLastSentence) {
      this.register({
        command: 'delete last sentence',
        aliases: ['undo', 'scratch that', 'delete that'],
        action: callbacks.deleteLastSentence,
        description: 'Delete the last sentence'
      });
    }
  }
}

export default new VoiceCommandsService();
