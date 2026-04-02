import { describe, expect, test } from 'vitest';

import { CommandParser } from '../command-parser';
import { CommandParseError } from '../errors';
import type { DocumentContext } from '../types';
import { CommandType } from '../types';

describe('CommandParser', () => {
  const mockContext: DocumentContext = {
    docId: 'test-doc-123',
    databases: [],
  };

  describe('parse', () => {
    test('should parse a basic edit command', () => {
      const result = CommandParser.parse('Edit this page', mockContext);
      expect(result.type).toBe(CommandType.Edit);
      expect(result.targetDocId).toBe('test-doc-123');
      expect(result.instructions).toBe('Edit this page');
    });

    test('should parse an add command', () => {
      const result = CommandParser.parse(
        'Add a paragraph to this document',
        mockContext
      );
      expect(result.type).toBe(CommandType.Add);
      expect(result.targetDocId).toBe('test-doc-123');
    });

    test('should parse a create command', () => {
      const result = CommandParser.parse('Create a new database', mockContext);
      expect(result.type).toBe(CommandType.Create);
    });

    test('should parse a reference command', () => {
      const result = CommandParser.parse(
        'Reference the database from another page',
        mockContext
      );
      expect(result.type).toBe(CommandType.Reference);
    });

    test('should throw error for empty command', () => {
      expect(() => CommandParser.parse('', mockContext)).toThrow(
        CommandParseError
      );
    });

    test('should throw error for whitespace-only command', () => {
      expect(() => CommandParser.parse('   ', mockContext)).toThrow(
        CommandParseError
      );
    });
  });

  describe('getCommandType', () => {
    test('should detect edit commands', () => {
      expect(CommandParser.getCommandType('edit the content')).toBe(
        CommandType.Edit
      );
      expect(CommandParser.getCommandType('modify this text')).toBe(
        CommandType.Edit
      );
      expect(CommandParser.getCommandType('change the heading')).toBe(
        CommandType.Edit
      );
      expect(CommandParser.getCommandType('update the paragraph')).toBe(
        CommandType.Edit
      );
    });

    test('should detect add commands', () => {
      expect(CommandParser.getCommandType('add a new section')).toBe(
        CommandType.Add
      );
      expect(CommandParser.getCommandType('insert a paragraph')).toBe(
        CommandType.Add
      );
      expect(CommandParser.getCommandType('append content')).toBe(
        CommandType.Add
      );
    });

    test('should detect create commands', () => {
      expect(CommandParser.getCommandType('create a database')).toBe(
        CommandType.Create
      );
      expect(CommandParser.getCommandType('make a new table')).toBe(
        CommandType.Create
      );
      expect(CommandParser.getCommandType('generate a kanban board')).toBe(
        CommandType.Create
      );
    });

    test('should detect reference commands', () => {
      expect(CommandParser.getCommandType('reference the database')).toBe(
        CommandType.Reference
      );
      expect(CommandParser.getCommandType('link to another database')).toBe(
        CommandType.Reference
      );
      expect(CommandParser.getCommandType('embed the table')).toBe(
        CommandType.Reference
      );
    });

    test('should detect database operations', () => {
      expect(CommandParser.getCommandType('add a row to the database')).toBe(
        CommandType.DatabaseOperation
      );
      expect(CommandParser.getCommandType('update the table')).toBe(
        CommandType.DatabaseOperation
      );
    });

    test('should default to edit for ambiguous commands', () => {
      expect(CommandParser.getCommandType('do something')).toBe(
        CommandType.Edit
      );
      expect(CommandParser.getCommandType('fix this')).toBe(CommandType.Edit);
    });
  });

  describe('extractTargetDocument', () => {
    test('should extract document from context keywords', () => {
      expect(
        CommandParser.extractTargetDocument('edit this page', mockContext)
      ).toBe('test-doc-123');
      expect(
        CommandParser.extractTargetDocument(
          'modify current document',
          mockContext
        )
      ).toBe('test-doc-123');
      expect(
        CommandParser.extractTargetDocument('change this', mockContext)
      ).toBe('test-doc-123');
      expect(
        CommandParser.extractTargetDocument('update here', mockContext)
      ).toBe('test-doc-123');
    });

    test('should extract explicit document references', () => {
      expect(
        CommandParser.extractTargetDocument(
          'edit in document abc-456',
          mockContext
        )
      ).toBe('abc-456');
      expect(
        CommandParser.extractTargetDocument('add to page xyz-789', mockContext)
      ).toBe('xyz-789');
      expect(
        CommandParser.extractTargetDocument(
          'modify on doc test-123',
          mockContext
        )
      ).toBe('test-123');
    });

    test('should default to context document when no reference found', () => {
      expect(
        CommandParser.extractTargetDocument('just edit something', mockContext)
      ).toBe('test-doc-123');
    });
  });

  describe('parameter extraction', () => {
    test('should extract position parameters for add commands', () => {
      const result1 = CommandParser.parse(
        'Add content at the beginning',
        mockContext
      );
      expect(result1.parameters?.position).toBe('start');

      const result2 = CommandParser.parse(
        'Add content at the end',
        mockContext
      );
      expect(result2.parameters?.position).toBe('end');

      const result3 = CommandParser.parse(
        'Add content after the heading',
        mockContext
      );
      expect(result3.parameters?.position).toBe('after');

      const result4 = CommandParser.parse(
        'Add content before the paragraph',
        mockContext
      );
      expect(result4.parameters?.position).toBe('before');
    });

    test('should extract view type parameters for database commands', () => {
      const result1 = CommandParser.parse(
        'Create a table database',
        mockContext
      );
      expect(result1.parameters?.viewType).toBe('table');

      const result2 = CommandParser.parse('Create a kanban board', mockContext);
      expect(result2.parameters?.viewType).toBe('kanban');

      const result3 = CommandParser.parse('Create a gallery view', mockContext);
      expect(result3.parameters?.viewType).toBe('gallery');
    });

    test('should extract view ID for reference commands', () => {
      const result = CommandParser.parse('Reference view abc-123', mockContext);
      expect(result.parameters?.viewId).toBe('abc-123');
    });
  });
});
