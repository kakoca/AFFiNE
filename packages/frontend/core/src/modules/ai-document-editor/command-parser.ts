import { CommandParseError } from './errors';
import type { CommandType, DocumentContext, ParsedCommand } from './types';
import { CommandType as CommandTypeEnum } from './types';

/**
 * Utility class for parsing natural language commands into structured operations.
 * Handles command type detection, target document extraction, and context-based resolution.
 */
export class CommandParser {
  /**
   * Keywords that indicate different command types
   */
  private static readonly COMMAND_KEYWORDS = {
    edit: ['edit', 'modify', 'change', 'update', 'revise', 'rewrite'],
    add: ['add', 'insert', 'append', 'include', 'put'],
    create: ['create', 'make', 'new', 'build', 'generate'],
    reference: ['reference', 'link', 'connect', 'embed', 'show'],
    database: ['database', 'table', 'kanban', 'board', 'view'],
  };

  /**
   * Keywords that refer to the current/active document
   */
  private static readonly CONTEXT_KEYWORDS = [
    'this page',
    'current page',
    'this document',
    'current document',
    'here',
    'this',
  ];

  /**
   * Parse a command string into a structured command object
   * @param command - The natural language command to parse
   * @param context - The current document context
   * @returns A parsed command with type, target document, and instructions
   * @throws CommandParseError if the command cannot be parsed
   */
  static parse(command: string, context: DocumentContext): ParsedCommand {
    try {
      const normalizedCommand = command.toLowerCase().trim();

      if (!normalizedCommand) {
        throw new CommandParseError('Command cannot be empty', command);
      }

      // Determine command type
      const type = this.getCommandType(normalizedCommand);

      // Extract target document
      const targetDocId = this.extractTargetDocument(
        normalizedCommand,
        context
      );

      // Extract any additional parameters
      const parameters = this.extractParameters(normalizedCommand, type);

      return {
        type,
        targetDocId,
        instructions: command, // Keep original command for AI processing
        parameters,
      };
    } catch (error) {
      if (error instanceof CommandParseError) {
        throw error;
      }
      throw new CommandParseError(
        `Failed to parse command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        command,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Determine the command type based on keywords in the command
   * @param command - The normalized command string
   * @returns The detected command type
   */
  static getCommandType(command: string): CommandType {
    const normalizedCommand = command.toLowerCase();

    // Check for database operations first (more specific)
    if (
      this.containsAnyKeyword(normalizedCommand, this.COMMAND_KEYWORDS.database)
    ) {
      // Distinguish between creating a new database and referencing an existing one
      if (
        this.containsAnyKeyword(
          normalizedCommand,
          this.COMMAND_KEYWORDS.reference
        )
      ) {
        return CommandTypeEnum.Reference;
      }
      if (
        this.containsAnyKeyword(normalizedCommand, this.COMMAND_KEYWORDS.create)
      ) {
        return CommandTypeEnum.Create;
      }
      // If it mentions database but not create/reference, it's likely a database operation
      return CommandTypeEnum.DatabaseOperation;
    }

    // Check for reference commands
    if (
      this.containsAnyKeyword(
        normalizedCommand,
        this.COMMAND_KEYWORDS.reference
      )
    ) {
      return CommandTypeEnum.Reference;
    }

    // Check for add commands first (before create) to avoid "add a new" being detected as create
    if (this.containsAnyKeyword(normalizedCommand, this.COMMAND_KEYWORDS.add)) {
      return CommandTypeEnum.Add;
    }

    // Check for create commands
    if (
      this.containsAnyKeyword(normalizedCommand, this.COMMAND_KEYWORDS.create)
    ) {
      return CommandTypeEnum.Create;
    }

    // Check for edit commands
    if (
      this.containsAnyKeyword(normalizedCommand, this.COMMAND_KEYWORDS.edit)
    ) {
      return CommandTypeEnum.Edit;
    }

    // Default to edit if no specific keyword is found
    return CommandTypeEnum.Edit;
  }

  /**
   * Extract the target document ID from the command or context
   * @param command - The normalized command string
   * @param context - The current document context
   * @returns The target document ID, or null if it cannot be determined
   */
  static extractTargetDocument(
    command: string,
    context: DocumentContext
  ): string | null {
    const normalizedCommand = command.toLowerCase();

    // Check if command references the current document
    if (this.containsAnyKeyword(normalizedCommand, this.CONTEXT_KEYWORDS)) {
      return context.docId;
    }

    // Check for explicit document references (e.g., "in document abc123")
    const docIdMatch = normalizedCommand.match(
      /(?:in|to|on)\s+(?:document|page|doc)\s+([a-zA-Z0-9-_]+)/
    );
    if (docIdMatch && docIdMatch[1]) {
      return docIdMatch[1];
    }

    // If no explicit reference, use the active document from context
    return context.docId;
  }

  /**
   * Extract additional parameters from the command based on command type
   * @param command - The normalized command string
   * @param type - The command type
   * @returns A record of extracted parameters
   */
  private static extractParameters(
    command: string,
    type: CommandType
  ): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Extract position information for add commands
    if (type === CommandTypeEnum.Add) {
      if (
        command.includes('at the beginning') ||
        command.includes('at the start')
      ) {
        parameters.position = 'start';
      } else if (
        command.includes('at the end') ||
        command.includes('at the bottom')
      ) {
        parameters.position = 'end';
      } else if (command.includes('after')) {
        parameters.position = 'after';
      } else if (command.includes('before')) {
        parameters.position = 'before';
      }
    }

    // Extract database-related parameters
    if (
      type === CommandTypeEnum.Create ||
      type === CommandTypeEnum.DatabaseOperation
    ) {
      if (command.includes('table')) {
        parameters.viewType = 'table';
      } else if (command.includes('kanban') || command.includes('board')) {
        parameters.viewType = 'kanban';
      } else if (command.includes('gallery')) {
        parameters.viewType = 'gallery';
      }
    }

    // Extract view ID for reference commands
    if (type === CommandTypeEnum.Reference) {
      const viewMatch = command.match(/view\s+([a-zA-Z0-9-_]+)/);
      if (viewMatch && viewMatch[1]) {
        parameters.viewId = viewMatch[1];
      }
    }

    return parameters;
  }

  /**
   * Check if the command contains any of the specified keywords
   * @param command - The command string to check
   * @param keywords - Array of keywords to search for
   * @returns True if any keyword is found
   */
  private static containsAnyKeyword(
    command: string,
    keywords: string[]
  ): boolean {
    return keywords.some(keyword => {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(command);
    });
  }
}
