/**
 * Manual test file to verify CommandParser functionality
 * This can be run with ts-node or similar to verify the implementation
 */

import { CommandParser } from '../command-parser';
import { CommandType } from '../types';
import type { DocumentContext } from '../types';

// Mock context
const mockContext: DocumentContext = {
  docId: 'test-doc-123',
  databases: [],
};

console.log('=== CommandParser Manual Tests ===\n');

// Test 1: Edit command with context keyword
console.log('Test 1: Edit command with "this page"');
const result1 = CommandParser.parse('Edit this page', mockContext);
console.log('Result:', result1);
console.log('✓ Type:', result1.type === CommandType.Edit ? 'PASS' : 'FAIL');
console.log('✓ Target:', result1.targetDocId === 'test-doc-123' ? 'PASS' : 'FAIL');
console.log();

// Test 2: Add command
console.log('Test 2: Add command');
const result2 = CommandParser.parse('Add a paragraph to current document', mockContext);
console.log('Result:', result2);
console.log('✓ Type:', result2.type === CommandType.Add ? 'PASS' : 'FAIL');
console.log('✓ Target:', result2.targetDocId === 'test-doc-123' ? 'PASS' : 'FAIL');
console.log();

// Test 3: Create database command
console.log('Test 3: Create database command');
const result3 = CommandParser.parse('Create a new kanban database', mockContext);
console.log('Result:', result3);
console.log('✓ Type:', result3.type === CommandType.Create ? 'PASS' : 'FAIL');
console.log('✓ ViewType:', result3.parameters?.viewType === 'kanban' ? 'PASS' : 'FAIL');
console.log();

// Test 4: Reference command
console.log('Test 4: Reference command');
const result4 = CommandParser.parse('Reference the database from another page', mockContext);
console.log('Result:', result4);
console.log('✓ Type:', result4.type === CommandType.Reference ? 'PASS' : 'FAIL');
console.log();

// Test 5: Explicit document reference
console.log('Test 5: Explicit document reference');
const result5 = CommandParser.parse('Edit in document abc-456', mockContext);
console.log('Result:', result5);
console.log('✓ Target:', result5.targetDocId === 'abc-456' ? 'PASS' : 'FAIL');
console.log();

// Test 6: Position parameters
console.log('Test 6: Position parameters');
const result6 = CommandParser.parse('Add content at the beginning', mockContext);
console.log('Result:', result6);
console.log('✓ Position:', result6.parameters?.position === 'start' ? 'PASS' : 'FAIL');
console.log();

// Test 7: Database operation
console.log('Test 7: Database operation');
const result7 = CommandParser.parse('Add a row to the database', mockContext);
console.log('Result:', result7);
console.log('✓ Type:', result7.type === CommandType.DatabaseOperation ? 'PASS' : 'FAIL');
console.log();

// Test 8: Error handling - empty command
console.log('Test 8: Error handling - empty command');
try {
  CommandParser.parse('', mockContext);
  console.log('✗ FAIL: Should have thrown error');
} catch (error) {
  console.log('✓ PASS: Correctly threw error:', (error as Error).message);
}
console.log();

console.log('=== All Manual Tests Complete ===');
