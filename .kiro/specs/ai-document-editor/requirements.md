# Requirements Document

## Introduction

This feature enhances AFFiNE's AI capabilities by enabling the AI assistant to directly edit documents through chat commands and to create, add, and reference database blocks across pages. This transforms the AI from a passive assistant into an active collaborator that can manipulate workspace content, enabling powerful task and project management workflows where databases can be shared and referenced across multiple pages.

## Glossary

- **AI Assistant**: The AFFiNE AI copilot system that processes user commands and generates responses
- **Document**: An AFFiNE page containing blocks of content (text, images, databases, etc.)
- **Database Block**: A structured data block in AFFiNE that can display data in multiple views (table, kanban, etc.)
- **Database Reference**: A link to an existing database block that displays its data in another document
- **Chat Command**: A text instruction given to the AI Assistant through the chat interface
- **Block**: The fundamental unit of content in AFFiNE documents (paragraph, heading, database, etc.)
- **Workspace**: The container for all documents and data in an AFFiNE instance
- **Doc Update**: A change operation applied to a document's content structure
- **View**: A specific way of displaying database data (table, kanban, gallery, etc.)
- **CopilotClient**: The service that handles communication with the AI backend
- **DataSource**: The interface for manipulating database block data

## Requirements

### Requirement 1

**User Story:** As a user, I want to command the AI to edit my current document, so that I can modify content without manual copy-paste operations.

#### Acceptance Criteria

1. WHEN a user sends a chat command requesting document edits THEN the AI Assistant SHALL parse the command and identify the target document
2. WHEN the AI Assistant processes an edit command THEN the AI Assistant SHALL apply the requested changes directly to the document structure
3. WHEN document edits are applied THEN the system SHALL preserve the document's existing content that was not targeted for modification
4. WHEN edits are completed THEN the system SHALL display the updated content immediately in the editor
5. WHEN multiple users are viewing the same document THEN the system SHALL synchronize the AI-generated edits across all active sessions

### Requirement 2

**User Story:** As a user, I want to ask the AI to add new content to specific locations in my document, so that I can quickly insert blocks without interrupting my workflow.

#### Acceptance Criteria

1. WHEN a user specifies a location for new content THEN the AI Assistant SHALL insert the content at the specified position in the document
2. WHEN no location is specified THEN the AI Assistant SHALL append the content to the end of the document
3. WHEN the AI adds content THEN the system SHALL support all block types including paragraphs, headings, lists, and databases
4. WHEN content is added THEN the system SHALL maintain proper block hierarchy and nesting
5. WHEN the AI adds a block THEN the system SHALL return the block identifier to enable further operations

### Requirement 3

**User Story:** As a user, I want the AI to create new database blocks in my documents, so that I can quickly set up structured data for task and project management.

#### Acceptance Criteria

1. WHEN a user requests a new database THEN the AI Assistant SHALL create a database block with the specified structure
2. WHEN creating a database THEN the AI Assistant SHALL configure columns based on the user's requirements
3. WHEN a database is created THEN the system SHALL initialize it with the requested view type (table, kanban, etc.)
4. WHEN the database is created THEN the system SHALL add initial rows if specified in the command
5. WHEN the database is created THEN the system SHALL return the database block identifier for future reference

### Requirement 4

**User Story:** As a user, I want to reference existing databases in other documents, so that I can view and manage the same data from multiple pages without duplication.

#### Acceptance Criteria

1. WHEN a user requests to add a database reference THEN the AI Assistant SHALL create a reference block pointing to the source database
2. WHEN a database reference is created THEN the system SHALL display the source database's data in the target document
3. WHEN data is modified through a reference THEN the system SHALL update the source database and all other references
4. WHEN a database reference is displayed THEN the system SHALL support all view types available in the source database
5. WHEN a reference is created THEN the system SHALL maintain the link even if the source database is moved to another document

### Requirement 5

**User Story:** As a user, I want to ask the AI to add specific views of a database to other pages, so that I can create focused views for different contexts (e.g., "my tasks" vs "team tasks").

#### Acceptance Criteria

1. WHEN a user requests a specific database view THEN the AI Assistant SHALL identify the source database and the requested view
2. WHEN adding a database view THEN the system SHALL create a reference that displays only the specified view
3. WHEN a view reference is created THEN the system SHALL preserve the view's filters and sorting configuration
4. WHEN data is edited through a view reference THEN the system SHALL apply changes to the source database
5. WHEN the source view configuration changes THEN the system SHALL update all references to that view

### Requirement 6

**User Story:** As a user, I want the AI to understand context from my current document when executing commands, so that I don't have to repeatedly specify which document to edit.

#### Acceptance Criteria

1. WHEN a user sends a chat command THEN the AI Assistant SHALL automatically detect the currently active document
2. WHEN the active document contains databases THEN the AI Assistant SHALL include them in the command context
3. WHEN a command references "this page" or "current document" THEN the AI Assistant SHALL resolve it to the active document identifier
4. WHEN multiple documents are open THEN the AI Assistant SHALL use the focused editor's document as context
5. WHEN no document is active THEN the AI Assistant SHALL prompt the user to specify a target document

### Requirement 7

**User Story:** As a user, I want to see a preview of AI-proposed changes before they are applied, so that I can verify the changes match my intent.

#### Acceptance Criteria

1. WHEN the AI generates document edits THEN the system SHALL display a preview of the proposed changes
2. WHEN a preview is shown THEN the system SHALL highlight additions, deletions, and modifications
3. WHEN the user approves the preview THEN the system SHALL apply the changes to the document
4. WHEN the user rejects the preview THEN the system SHALL discard the proposed changes and maintain the current document state
5. WHEN the preview is displayed THEN the system SHALL provide options to approve, reject, or request modifications

### Requirement 8

**User Story:** As a user, I want the AI to handle errors gracefully when editing documents, so that my data remains safe even if commands fail.

#### Acceptance Criteria

1. WHEN an edit operation fails THEN the system SHALL roll back any partial changes to maintain document consistency
2. WHEN an error occurs THEN the AI Assistant SHALL provide a clear explanation of what went wrong
3. WHEN a database reference target does not exist THEN the system SHALL notify the user and suggest alternatives
4. WHEN permissions prevent an edit THEN the system SHALL inform the user of the permission requirements
5. WHEN network issues interrupt an operation THEN the system SHALL queue the changes for retry or notify the user

### Requirement 9

**User Story:** As a developer, I want the AI document editing system to integrate with the existing CopilotClient architecture, so that we maintain consistency with current AI features.

#### Acceptance Criteria

1. WHEN implementing document editing THEN the system SHALL use the existing CopilotClient for AI communication
2. WHEN applying document changes THEN the system SHALL use the existing applyDocUpdates method
3. WHEN creating database blocks THEN the system SHALL use the existing DatabaseBlockDataSource interface
4. WHEN managing document context THEN the system SHALL use the existing context management methods (addContextDoc, createContext)
5. WHEN handling errors THEN the system SHALL use the existing error handling patterns (resolveError, handleError)

### Requirement 10

**User Story:** As a user, I want to use natural language commands to manipulate databases, so that I can manage tasks and projects conversationally.

#### Acceptance Criteria

1. WHEN a user requests to add rows to a database THEN the AI Assistant SHALL parse the data and insert new rows
2. WHEN a user requests to update database cells THEN the AI Assistant SHALL modify the specified cells with new values
3. WHEN a user requests to filter or sort a database view THEN the AI Assistant SHALL apply the requested view configuration
4. WHEN a user requests to create a new view THEN the AI Assistant SHALL add the view with the specified settings
5. WHEN database operations complete THEN the system SHALL confirm the changes and display the updated database

### Requirement 11

**User Story:** As a developer, I want to maximize reuse of existing AFFiNE infrastructure and patterns, so that the new AI editing features integrate seamlessly and reduce implementation complexity.

#### Acceptance Criteria

1. WHEN implementing document editing THEN the system SHALL reuse the existing DocsService for document access and manipulation
2. WHEN implementing database operations THEN the system SHALL reuse the existing DatabaseBlockDataSource methods (rowAdd, cellValueChange, propertyAdd, viewDataAdd)
3. WHEN implementing block insertion THEN the system SHALL reuse the existing block creation methods (doc.addBlock, insertPositionToIndex)
4. WHEN implementing database references THEN the system SHALL extend the existing database block architecture rather than creating parallel systems
5. WHEN implementing AI context management THEN the system SHALL reuse the existing CopilotClient context methods (createContext, addContextDoc, getContextDocsAndFiles)
6. WHEN implementing real-time synchronization THEN the system SHALL leverage the existing Y.js-based document synchronization infrastructure
7. WHEN implementing UI components THEN the system SHALL reuse existing AFFiNE component patterns and design system elements
8. WHEN implementing error handling THEN the system SHALL extend the existing error types (UnauthorizedError, PaymentRequiredError, GeneralNetworkError)
9. WHEN implementing services THEN the system SHALL follow the existing service architecture patterns (@toeverything/infra Service, Entity, Store)
10. WHEN implementing GraphQL operations THEN the system SHALL extend the existing @affine/graphql mutations and queries rather than creating new communication channels

### Requirement 12

**User Story:** As a user, I want to use the "/" slash command menu to insert database references directly in my document, so that I can quickly reference databases from other pages without using the AI chat.

#### Acceptance Criteria

1. WHEN a user types "/" in the editor THEN the system SHALL display a slash command menu including a "Database Reference" option
2. WHEN the user selects "Database Reference" from the slash menu THEN the system SHALL display a picker modal to select the source page and database
3. WHEN the picker modal is displayed THEN the system SHALL show a searchable list of all pages containing databases in the workspace
4. WHEN the user selects a page THEN the system SHALL display all databases available in that page with their names and view types
5. WHEN the user selects a database THEN the system SHALL optionally allow selecting a specific view to display
6. WHEN the user confirms the selection THEN the system SHALL insert an `affine:database-reference` block at the cursor position
7. WHEN the database reference is inserted THEN the system SHALL display the referenced database inline with full interactivity
8. WHEN the user cancels the picker modal THEN the system SHALL close the modal without inserting any block
