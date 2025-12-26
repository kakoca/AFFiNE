# Implementation Plan

- [x] 1. Set up core infrastructure and type definitions
  - Create new module at `packages/frontend/core/src/modules/ai-document-editor/`
  - Create base types and interfaces for document operations, database references, and command parsing
  - Define error types extending existing AFFiNE error classes (DocumentEditError, DatabaseReferenceError, CommandParseError)
  - Set up module structure following @toeverything/infra patterns (services/, entities/, stores/, types.ts, index.ts)
  - _Requirements: 9.1, 9.5, 11.8, 11.9_

- [x] 2. Create the affine:database-reference block type
  - [x] 2.1 Define DatabaseReferenceBlockSchema in blocksuite/affine/model
    - Create `blocksuite/affine/model/src/blocks/database-reference/database-reference-model.ts`
    - Define props: sourceDocId, sourceDatabaseId, viewId
    - Set metadata: parent=['affine:note'], children=[]
    - Export from blocksuite/affine/model/src/blocks/index.ts
    - _Requirements: 4.1, 11.4_

  - [x] 2.2 Implement DatabaseReferenceBlock component in blocksuite/affine/blocks
    - Create `blocksuite/affine/blocks/database-reference/` directory
    - Implement block component that loads source database via DocsService
    - Create DatabaseBlockDataSource from source database model
    - Render using existing database table/kanban components
    - Handle view-specific rendering when viewId is specified
    - _Requirements: 4.2, 4.4, 5.2_

  - [x] 2.3 Register block type in BlockSuite
    - Add FlavourExtension and BlockViewExtension for 'affine:database-reference'
    - Register in appropriate extension configuration
    - _Requirements: 11.4_

  - [ ]\* 2.4 Write property test for reference creation
    - **Property 10: Database reference points to source**
    - **Validates: Requirements 4.1**

- [x] 3. Implement CommandParser utility
  - [x] 3.1 Create CommandParser class with parsing logic
    - Implement command type detection (edit, add, create, reference)
    - Implement target document extraction from commands
    - Handle context-based document resolution ("this page", "current document")
    - _Requirements: 1.1, 6.1, 6.3_

  - [ ]\* 3.2 Write property test for command parsing
    - **Property 1: Command parsing identifies target document**
    - **Validates: Requirements 1.1, 6.1, 6.3**

- [x] 4. Implement DocumentContextManager
  - [x] 4.1 Create DocumentContextManager class
    - Implement active document tracking with observables
    - Implement context enrichment with database information (scan for affine:database blocks)
    - Handle multiple open documents with focus detection via WorkbenchService
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ]\* 4.2 Write property test for context management
    - **Property 18: Active document context includes databases**
    - **Validates: Requirements 6.2**

  - [ ]\* 4.3 Write property test for focused editor selection
    - **Property 19: Multiple open documents use focused editor**
    - **Validates: Requirements 6.4**

- [x] 5. Implement ChangePreviewService
  - [x] 5.1 Create ChangePreviewService class
    - Implement preview generation using document cloning and diff
    - Implement change application with transaction support (doc.blockSuiteDoc.transact)
    - Implement preview discard functionality
    - _Requirements: 7.3, 7.4_

  - [ ]\* 5.2 Write property test for preview rejection
    - **Property 20: Preview rejection leaves document unchanged**
    - **Validates: Requirements 7.4**

- [x] 6. Implement core AIDocumentEditorService
  - [x] 6.1 Create AIDocumentEditorService class structure
    - Set up service extending Service from @toeverything/infra
    - Inject DocsService and WorkspaceService via constructor
    - Implement getCopilotClient() method to access CopilotClient
    - Implement getActiveDocumentContext() method
    - Implement executeCommand() orchestration method
    - _Requirements: 1.1, 9.1, 11.1, 11.5_

  - [x] 6.2 Implement editDocument() method
    - Access CopilotClient via getCopilotClient()
    - Use existing applyDocUpdates for applying changes
    - Implement transaction rollback on failure using doc.blockSuiteDoc.transact
    - _Requirements: 1.2, 1.3, 8.1, 9.2_

  - [ ]\* 6.3 Write property test for content preservation
    - **Property 2: Edit operations preserve untargeted content**
    - **Validates: Requirements 1.3**

  - [ ]\* 6.4 Write property test for operation rollback
    - **Property 21: Failed operations roll back completely**
    - **Validates: Requirements 8.1**

  - [x] 6.5 Implement addContent() method
    - Use docsService.open() to access document
    - Use doc.blockSuiteDoc.addBlock() for block creation
    - Handle position specification with insertPositionToIndex from @blocksuite/affine-shared/utils
    - Support all block types (affine:paragraph, affine:list, affine:database)
    - Return block identifier for further operations
    - Always call release() when done
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 11.3_

  - [ ]\* 6.6 Write property test for content insertion position
    - **Property 4: Content insertion respects specified position**
    - **Validates: Requirements 2.1**

  - [ ]\* 6.7 Write property test for block type support
    - **Property 5: All block types can be inserted**
    - **Validates: Requirements 2.3**

  - [ ]\* 6.8 Write property test for hierarchy maintenance
    - **Property 6: Block hierarchy is maintained after insertion**
    - **Validates: Requirements 2.4**

  - [ ]\* 6.9 Write property test for block identifier return
    - **Property 7: Block insertion returns valid identifier**
    - **Validates: Requirements 2.5**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement database creation in AIDocumentEditorService
  - [x] 8.1 Implement createDatabase() method
    - Use doc.blockSuiteDoc.addBlock('affine:database', ...) to create database block
    - Get DatabaseBlockModel from created block
    - Create DatabaseBlockDataSource with the model: new DatabaseBlockDataSource(dbModel)
    - Configure columns using dataSource.propertyAdd()
    - Initialize view using dataSource.viewManager.viewAdd()
    - Add initial rows using dataSource.rowAdd() if specified
    - Return database block identifier
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.3, 11.2_

  - [ ]\* 8.2 Write property test for database creation
    - **Property 8: Database creation matches specification**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]\* 8.3 Write property test for database identifier return
    - **Property 9: Database creation returns valid identifier**
    - **Validates: Requirements 3.5**

- [x] 9. Implement DatabaseReferenceService
  - [x] 9.1 Create DatabaseReferenceService class
    - Implement createReference() method that creates affine:database-reference block
    - Store sourceDocId, sourceDatabaseId, and optional viewId in block props
    - Implement findReferences() to locate all references to a database
    - Implement validateReference() to check target existence
    - _Requirements: 4.1, 8.3, 11.4_

  - [x] 9.2 Implement getDataSourceForReference() method
    - Open source document via docsService.open()
    - Get source database block and model
    - Create and return DatabaseBlockDataSource connected to source
    - Return release function to clean up document references
    - _Requirements: 4.3, 5.4_

  - [ ]\* 9.3 Write property test for reference synchronization
    - **Property 11: Reference modifications update source and all references**
    - **Validates: Requirements 4.3**

  - [ ]\* 9.4 Write property test for view reference edits
    - **Property 16: View reference edits update source**
    - **Validates: Requirements 5.4**

  - [x] 9.5 Implement view-specific reference support in block component
    - Handle viewId parameter in DatabaseReferenceBlock
    - Use dataSource.viewManager.setCurrentView(viewId) for specific view
    - Preserve view configuration (filters, sorting) from source
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]\* 9.6 Write property test for view type support
    - **Property 12: All view types work through references**
    - **Validates: Requirements 4.4**

  - [ ]\* 9.7 Write property test for view-specific display
    - **Property 14: View-specific references display only specified view**
    - **Validates: Requirements 5.2**

  - [ ]\* 9.8 Write property test for view configuration preservation
    - **Property 15: View references preserve configuration**
    - **Validates: Requirements 5.3**

  - [x] 9.9 Implement reference stability across document moves
    - Use stable block IDs (sourceDocId + sourceDatabaseId) rather than document-relative paths
    - Reference remains valid as long as source database exists
    - _Requirements: 4.5_

  - [ ]\* 9.10 Write property test for reference stability
    - **Property 13: References remain valid after source moves**
    - **Validates: Requirements 4.5**

  - [ ]\* 9.11 Write property test for view config propagation
    - **Property 17: Source view changes propagate to references**
    - **Validates: Requirements 5.5**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement database manipulation methods
  - [x] 11.1 Add database row insertion to AIDocumentEditorService
    - Get DatabaseBlockDataSource for target database
    - Use dataSource.rowAdd(position) method
    - Parse row data from natural language commands
    - _Requirements: 10.1, 11.2_

  - [ ]\* 11.2 Write property test for row insertion
    - **Property 22: Database row insertion adds rows**
    - **Validates: Requirements 10.1**

  - [x] 11.3 Add cell update functionality
    - Use dataSource.cellValueChange(rowId, propertyId, value) method
    - Parse cell coordinates and values from commands
    - _Requirements: 10.2, 11.2_

  - [ ]\* 11.4 Write property test for cell updates
    - **Property 23: Cell updates modify specified cells**
    - **Validates: Requirements 10.2**

  - [x] 11.5 Add view configuration functionality
    - Use dataSource.viewDataUpdate(viewId, updater) method
    - Apply filters and sorting from commands
    - _Requirements: 10.3, 11.2_

  - [ ]\* 11.6 Write property test for view configuration
    - **Property 24: View configuration applies filters and sorting**
    - **Validates: Requirements 10.3**

  - [x] 11.7 Add new view creation functionality
    - Use dataSource.viewManager.viewAdd(viewType) method
    - Configure view with specified settings
    - _Requirements: 10.4, 11.2_

  - [ ]\* 11.8 Write property test for view creation
    - **Property 25: New view creation adds view with settings**
    - **Validates: Requirements 10.4**

- [x] 12. Implement real-time synchronization
  - [x] 12.1 Verify Y.js synchronization works for database references
    - Ensure edits through DatabaseReferenceBlock trigger Y.js updates on source doc
    - Verify changes propagate to all clients viewing source or references
    - _Requirements: 1.5, 11.6_

  - [ ]\* 12.2 Write property test for multi-session sync
    - **Property 3: Multi-session synchronization propagates edits**
    - **Validates: Requirements 1.5**

- [x] 13. Implement module registration
  - [x] 13.1 Create module configuration function
    - Create configureAIDocumentEditorModule(framework) function
    - Register AIDocumentEditorService, DatabaseReferenceService, ChangePreviewService
    - Register in WorkspaceScope
    - Export from module index.ts
    - _Requirements: 11.9_

  - [x] 13.2 Integrate module into AFFiNE
    - Import and call configureAIDocumentEditorModule in app initialization
    - _Requirements: 11.9_

- [x] 14. Implement UI components
  - [x] 14.1 Create AI command input component
    - Extend existing chat panel with document editing capabilities
    - Add command suggestions and autocomplete
    - Follow existing component patterns and design system
    - _Requirements: 11.7_

  - [x] 14.2 Create change preview dialog component
    - Display additions, modifications, and deletions
    - Provide approve/reject/modify actions
    - Use existing dialog components and styling
    - _Requirements: 7.1, 7.2, 7.5, 11.7_

- [x] 15. Implement error handling and user feedback
  - [x] 15.1 Add error handling to all service methods
    - Wrap operations in try-catch with proper error types
    - Implement transaction rollback on errors using doc.blockSuiteDoc.transact
    - Always call release() in finally blocks
    - _Requirements: 8.1, 8.2, 9.5, 11.8_

  - [x] 15.2 Add user-friendly error messages
    - Translate technical errors to actionable messages
    - Provide suggestions for common error scenarios (database not found, permission denied)
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 15.3 Implement retry logic for network errors
    - Add exponential backoff for failed CopilotClient operations
    - Queue operations during network interruptions
    - _Requirements: 8.5_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Integration and end-to-end testing
  - [x] 17.1 Test complete command execution flows
    - Test edit command from chat to document update
    - Test database creation and manipulation
    - Test database reference creation and synchronization
    - _Requirements: All_

  - [x] 17.2 Test multi-user scenarios
    - Test concurrent edits from multiple users
    - Test reference synchronization across users
    - _Requirements: 1.5, 4.3_

  - [x] 17.3 Test edge cases
    - Test empty document handling
    - Test no active document scenario
    - Test invalid reference targets (source database deleted)
    - Test permission-denied scenarios
    - _Requirements: 8.3, 8.4_

- [x] 18. Documentation and examples
  - [x] 18.1 Document AI command syntax
    - Create command reference guide
    - Provide examples for common operations
    - Document database reference syntax

  - [x] 18.2 Create developer documentation
    - Document service APIs
    - Provide integration examples
    - Document extension points for future features
