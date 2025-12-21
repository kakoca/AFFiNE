# Implementation Plan

- [ ] 1. Set up core infrastructure and type definitions
  - Create base types and interfaces for document operations, database references, and command parsing
  - Define error types extending existing AFFiNE error classes
  - Set up module structure following @toeverything/infra patterns
  - _Requirements: 9.1, 9.5, 11.8, 11.9_

- [ ] 2. Implement CommandParser utility
  - [ ] 2.1 Create CommandParser class with parsing logic
    - Implement command type detection (edit, add, create, reference)
    - Implement target document extraction from commands
    - Handle context-based document resolution ("this page", "current document")
    - _Requirements: 1.1, 6.1, 6.3_

  - [ ]* 2.2 Write property test for command parsing
    - **Property 1: Command parsing identifies target document**
    - **Validates: Requirements 1.1, 6.1, 6.3**

- [ ] 3. Implement DocumentContextManager
  - [ ] 3.1 Create DocumentContextManager class
    - Implement active document tracking with observables
    - Implement context enrichment with database information
    - Handle multiple open documents with focus detection
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ]* 3.2 Write property test for context management
    - **Property 18: Active document context includes databases**
    - **Validates: Requirements 6.2**

  - [ ]* 3.3 Write property test for focused editor selection
    - **Property 19: Multiple open documents use focused editor**
    - **Validates: Requirements 6.4**

- [ ] 4. Implement ChangePreviewService
  - [ ] 4.1 Create ChangePreviewService class
    - Implement preview generation using document cloning and diff
    - Implement change application with transaction support
    - Implement preview discard functionality
    - _Requirements: 7.3, 7.4_

  - [ ]* 4.2 Write property test for preview rejection
    - **Property 20: Preview rejection leaves document unchanged**
    - **Validates: Requirements 7.4**

- [ ] 5. Implement core AIDocumentEditorService
  - [ ] 5.1 Create AIDocumentEditorService class structure
    - Set up service with dependency injection (CopilotClient, DocsService, etc.)
    - Implement getActiveDocumentContext() method
    - Implement executeCommand() orchestration method
    - _Requirements: 1.1, 9.1, 11.1, 11.5_

  - [ ] 5.2 Implement editDocument() method
    - Integrate with CopilotClient for AI communication
    - Use existing applyDocUpdates for applying changes
    - Implement transaction rollback on failure
    - _Requirements: 1.2, 1.3, 8.1, 9.2_

  - [ ]* 5.3 Write property test for content preservation
    - **Property 2: Edit operations preserve untargeted content**
    - **Validates: Requirements 1.3**

  - [ ]* 5.4 Write property test for operation rollback
    - **Property 21: Failed operations roll back completely**
    - **Validates: Requirements 8.1**

  - [ ] 5.5 Implement addContent() method
    - Use existing doc.addBlock() for block creation
    - Handle position specification with insertPositionToIndex
    - Support all block types (paragraph, heading, list, database)
    - Return block identifier for further operations
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 11.3_

  - [ ]* 5.6 Write property test for content insertion position
    - **Property 4: Content insertion respects specified position**
    - **Validates: Requirements 2.1**

  - [ ]* 5.7 Write property test for block type support
    - **Property 5: All block types can be inserted**
    - **Validates: Requirements 2.3**

  - [ ]* 5.8 Write property test for hierarchy maintenance
    - **Property 6: Block hierarchy is maintained after insertion**
    - **Validates: Requirements 2.4**

  - [ ]* 5.9 Write property test for block identifier return
    - **Property 7: Block insertion returns valid identifier**
    - **Validates: Requirements 2.5**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement database creation in AIDocumentEditorService
  - [ ] 7.1 Implement createDatabase() method
    - Use existing DatabaseBlockDataSource for database creation
    - Configure columns based on specifications
    - Initialize with requested view type
    - Add initial rows if specified
    - Return database block identifier
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.3, 11.2_

  - [ ]* 7.2 Write property test for database creation
    - **Property 8: Database creation matches specification**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 7.3 Write property test for database identifier return
    - **Property 9: Database creation returns valid identifier**
    - **Validates: Requirements 3.5**

- [ ] 8. Implement DatabaseReferenceService
  - [ ] 8.1 Create DatabaseReferenceService class
    - Implement createReference() method using new block type
    - Implement findReferences() to locate all references to a database
    - Implement validateReference() to check target existence
    - _Requirements: 4.1, 8.3, 11.4_

  - [ ]* 8.2 Write property test for reference creation
    - **Property 10: Database reference points to source**
    - **Validates: Requirements 4.1**

  - [ ] 8.3 Implement syncReferences() method
    - Subscribe to source database changes
    - Propagate changes to all references
    - Handle bidirectional updates (reference → source → other references)
    - _Requirements: 4.3, 5.4_

  - [ ]* 8.4 Write property test for reference synchronization
    - **Property 11: Reference modifications update source and all references**
    - **Validates: Requirements 4.3**

  - [ ]* 8.5 Write property test for view reference edits
    - **Property 16: View reference edits update source**
    - **Validates: Requirements 5.4**

  - [ ] 8.6 Implement view-specific reference support
    - Handle viewId parameter in createReference()
    - Filter displayed data to specified view
    - Preserve view configuration (filters, sorting)
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 8.7 Write property test for view type support
    - **Property 12: All view types work through references**
    - **Validates: Requirements 4.4**

  - [ ]* 8.8 Write property test for view-specific display
    - **Property 14: View-specific references display only specified view**
    - **Validates: Requirements 5.2**

  - [ ]* 8.9 Write property test for view configuration preservation
    - **Property 15: View references preserve configuration**
    - **Validates: Requirements 5.3**

  - [ ] 8.10 Implement reference stability across document moves
    - Use stable block IDs rather than document-relative paths
    - Update reference tracking when source moves
    - _Requirements: 4.5_

  - [ ]* 8.11 Write property test for reference stability
    - **Property 13: References remain valid after source moves**
    - **Validates: Requirements 4.5**

  - [ ] 8.12 Implement view configuration synchronization
    - Listen for source view configuration changes
    - Update all references when source view config changes
    - _Requirements: 5.5_

  - [ ]* 8.13 Write property test for view config propagation
    - **Property 17: Source view changes propagate to references**
    - **Validates: Requirements 5.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement database manipulation methods
  - [ ] 10.1 Add database row insertion to AIDocumentEditorService
    - Use DatabaseBlockDataSource.rowAdd() method
    - Parse row data from natural language commands
    - _Requirements: 10.1, 11.2_

  - [ ]* 10.2 Write property test for row insertion
    - **Property 22: Database row insertion adds rows**
    - **Validates: Requirements 10.1**

  - [ ] 10.3 Add cell update functionality
    - Use DatabaseBlockDataSource.cellValueChange() method
    - Parse cell coordinates and values from commands
    - _Requirements: 10.2, 11.2_

  - [ ]* 10.4 Write property test for cell updates
    - **Property 23: Cell updates modify specified cells**
    - **Validates: Requirements 10.2**

  - [ ] 10.5 Add view configuration functionality
    - Use DatabaseBlockDataSource.viewDataUpdate() method
    - Apply filters and sorting from commands
    - _Requirements: 10.3, 11.2_

  - [ ]* 10.6 Write property test for view configuration
    - **Property 24: View configuration applies filters and sorting**
    - **Validates: Requirements 10.3**

  - [ ] 10.7 Add new view creation functionality
    - Use DatabaseBlockDataSource.viewDataAdd() method
    - Configure view with specified settings
    - _Requirements: 10.4, 11.2_

  - [ ]* 10.8 Write property test for view creation
    - **Property 25: New view creation adds view with settings**
    - **Validates: Requirements 10.4**

- [ ] 11. Implement real-time synchronization
  - [ ] 11.1 Integrate with Y.js synchronization infrastructure
    - Ensure AI-generated edits trigger Y.js updates
    - Subscribe to Y.js updates for multi-user synchronization
    - _Requirements: 1.5, 11.6_

  - [ ]* 11.2 Write property test for multi-session sync
    - **Property 3: Multi-session synchronization propagates edits**
    - **Validates: Requirements 1.5**

- [ ] 12. Implement GraphQL extensions
  - [ ] 12.1 Add new mutations for AI document editing
    - Extend existing GraphQL schema with document edit mutations
    - Add mutations for database reference operations
    - Follow existing mutation patterns
    - _Requirements: 11.10_

  - [ ] 12.2 Add context enrichment queries
    - Add queries to fetch document context with databases
    - Extend existing context queries rather than creating new ones
    - _Requirements: 11.10_

- [ ] 13. Implement UI components
  - [ ] 13.1 Create AI command input component
    - Extend existing chat panel with document editing capabilities
    - Add command suggestions and autocomplete
    - Follow existing component patterns and design system
    - _Requirements: 11.7_

  - [ ] 13.2 Create change preview dialog component
    - Display additions, modifications, and deletions
    - Provide approve/reject/modify actions
    - Use existing dialog components and styling
    - _Requirements: 7.1, 7.2, 7.5, 11.7_

  - [ ] 13.3 Create database reference block component
    - Render database references with live data
    - Support all view types (table, kanban, gallery)
    - Enable inline editing through references
    - _Requirements: 4.2, 11.7_

- [ ] 14. Implement error handling and user feedback
  - [ ] 14.1 Add error handling to all service methods
    - Wrap operations in try-catch with proper error types
    - Implement transaction rollback on errors
    - _Requirements: 8.1, 8.2, 9.5, 11.8_

  - [ ] 14.2 Add user-friendly error messages
    - Translate technical errors to actionable messages
    - Provide suggestions for common error scenarios
    - _Requirements: 8.2, 8.3, 8.4_

  - [ ] 14.3 Implement retry logic for network errors
    - Add exponential backoff for failed operations
    - Queue operations during network interruptions
    - _Requirements: 8.5_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integration and end-to-end testing
  - [ ] 16.1 Test complete command execution flows
    - Test edit command from chat to document update
    - Test database creation and manipulation
    - Test database reference creation and synchronization
    - _Requirements: All_

  - [ ] 16.2 Test multi-user scenarios
    - Test concurrent edits from multiple users
    - Test reference synchronization across users
    - _Requirements: 1.5, 4.3_

  - [ ] 16.3 Test edge cases
    - Test empty document handling
    - Test no active document scenario
    - Test invalid reference targets
    - Test permission-denied scenarios
    - _Requirements: 8.3, 8.4_

- [ ] 17. Documentation and examples
  - [ ] 17.1 Document AI command syntax
    - Create command reference guide
    - Provide examples for common operations
    - Document database reference syntax

  - [ ] 17.2 Create developer documentation
    - Document service APIs
    - Provide integration examples
    - Document extension points for future features
