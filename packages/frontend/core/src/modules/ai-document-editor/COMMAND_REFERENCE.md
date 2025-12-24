# AI Document Editor - Command Reference Guide

This guide provides comprehensive documentation for using natural language commands to edit documents, create databases, and manage database references in AFFiNE.

## Table of Contents

- [Overview](#overview)
- [Command Types](#command-types)
- [Document Editing Commands](#document-editing-commands)
- [Content Addition Commands](#content-addition-commands)
- [Database Creation Commands](#database-creation-commands)
- [Database Reference Commands](#database-reference-commands)
- [Database Manipulation Commands](#database-manipulation-commands)
- [Context and Targeting](#context-and-targeting)
- [Advanced Examples](#advanced-examples)

## Overview

The AI Document Editor allows you to use natural language commands in the chat interface to manipulate documents, create structured data, and manage database references across pages. The system understands context and can work with your currently active document without explicit specification.

### Key Concepts

- **Active Document**: The document currently in focus in your editor
- **Database Block**: A structured data table with multiple views (table, kanban, gallery)
- **Database Reference**: A live link to a database that displays its data in another document
- **View**: A specific way of displaying database data with its own filters and sorting

## Command Types

The AI Document Editor recognizes four main command types:

1. **Edit Commands**: Modify existing content in a document
2. **Add Commands**: Insert new content at specific locations
3. **Create Commands**: Create new databases with specified structure
4. **Reference Commands**: Link to existing databases from other documents

## Document Editing Commands

Edit commands modify existing content in your documents.

### Basic Editing

```
"Edit the paragraph about project goals to emphasize user experience"
```

```
"Change the heading 'Introduction' to 'Getting Started'"
```

```
"Update the bullet list to include the new team member"
```

### Context-Aware Editing

When working in an active document, you can use contextual references:

```
"Edit this page to add a summary at the top"
```

```
"Update the current document with the latest project status"
```

```
"Change the text in this section to be more concise"
```

### Targeted Editing

Specify exact locations or blocks:

```
"Edit the third paragraph to include the deadline"
```

```
"Update the code block with the new API endpoint"
```

```
"Change the image caption to describe the architecture diagram"
```

## Content Addition Commands

Add commands insert new content at specified positions.

### Adding Paragraphs

```
"Add a paragraph about security considerations"
```

```
"Insert a note at the beginning explaining the purpose"
```

```
"Add text after the introduction describing the methodology"
```

### Adding Lists

```
"Add a bullet list of project requirements"
```

```
"Insert a numbered list of steps to follow"
```

```
"Add a checklist for the deployment process"
```

### Adding Headings

```
"Add a heading 'Technical Specifications' before the database section"
```

```
"Insert a subheading 'Phase 2 Goals' in the roadmap"
```

### Position Specification

You can specify where content should be added:

```
"Add a paragraph at the beginning of the document"
```

```
"Insert a heading at the end"
```

```
"Add content after the 'Overview' section"
```

```
"Insert a note before the conclusion"
```

## Database Creation Commands

Create commands set up new database blocks with specified structure.

### Basic Database Creation

```
"Create a task database with columns for title, status, and assignee"
```

```
"Add a project tracker with name, deadline, and priority columns"
```

```
"Create a contacts database with name, email, and phone fields"
```

### Specifying Column Types

```
"Create a database with:
- Title (text)
- Due Date (date)
- Status (select: Todo, In Progress, Done)
- Priority (select: Low, Medium, High)
- Assignee (text)"
```

### Specifying View Type

```
"Create a kanban board for tracking bugs with columns for status"
```

```
"Add a table view database for inventory management"
```

```
"Create a gallery view database for design assets"
```

### Adding Initial Data

```
"Create a task database with these initial tasks:
- Set up development environment
- Write documentation
- Deploy to staging"
```

### Complete Example

```
"Create a project management database with:
- Project Name (text)
- Status (select: Planning, Active, Completed)
- Start Date (date)
- End Date (date)
- Team Lead (text)
- Budget (number)

Display as a table view and add these initial projects:
- Website Redesign, Active, 2024-01-15, 2024-03-30, Alice
- Mobile App, Planning, 2024-02-01, 2024-06-15, Bob"
```

## Database Reference Commands

Reference commands create links to existing databases in other documents.

### Basic Reference Creation

```
"Add a reference to the Tasks database from the Projects page"
```

```
"Link the Team Members database to this document"
```

```
"Show the Inventory database here"
```

### View-Specific References

```
"Add a reference to the 'My Tasks' view from the main task database"
```

```
"Show only the 'High Priority' view of the bugs database"
```

```
"Link the kanban view of the project tracker"
```

### Cross-Document References

```
"Reference the database from the 'Q1 Planning' document"
```

```
"Add the task list from the team workspace page"
```

```
"Show the contacts database from the company directory"
```

### Complete Reference Example

```
"Add a reference to the 'Sprint Tasks' database from the 'Team Planning' document, 
showing only the 'Current Sprint' view filtered for my assigned tasks"
```

## Database Manipulation Commands

Manipulate existing databases with natural language commands.

### Adding Rows

```
"Add a new task: 'Review pull requests' with status 'Todo' and assignee 'Alice'"
```

```
"Insert a row in the contacts database for John Doe, john@example.com"
```

```
"Add these items to the inventory:
- Laptop, 15 units, $1200
- Monitor, 30 units, $300"
```

### Updating Cells

```
"Update the status of 'Write documentation' task to 'Done'"
```

```
"Change Alice's email to alice.new@example.com in the contacts database"
```

```
"Set the priority of all overdue tasks to 'High'"
```

### Configuring Views

```
"Filter the task database to show only items assigned to me"
```

```
"Sort the projects by deadline, earliest first"
```

```
"Add a filter to show only 'In Progress' items in the kanban view"
```

```
"Group the table by status and sort by priority"
```

### Creating New Views

```
"Create a new kanban view called 'By Priority' grouped by priority level"
```

```
"Add a gallery view showing only completed projects"
```

```
"Create a table view filtered for high-priority tasks due this week"
```

## Context and Targeting

### Understanding Context

The AI automatically detects your active document and uses it as context:

```
"Add a task database"  
→ Creates database in the currently active document
```

```
"Show the team database here"  
→ References database in the current document
```

### Explicit Document Targeting

You can explicitly specify target documents:

```
"Edit the 'Project Overview' document to add a status update"
```

```
"Add a reference to the tasks database in the 'Weekly Review' page"
```

```
"Create a contacts database in the 'Team Directory' document"
```

### Contextual References

Use natural references to the current context:

- "this page"
- "current document"
- "this document"
- "here"

Examples:

```
"Add a summary to this page"
```

```
"Create a task list in the current document"
```

```
"Show the project database here"
```

### Database Context

When your active document contains databases, the AI includes them in context:

```
"Add a row to the task database"  
→ Automatically finds the task database in the current document
```

```
"Filter the database to show my items"  
→ Works with databases in the active document
```

## Advanced Examples

### Multi-Step Workflows

**Setting up a project management system:**

```
1. "Create a projects database with name, status, start date, end date, and owner"
2. "Create a tasks database with title, project, status, assignee, and due date"
3. "Add a reference to the projects database in the team dashboard"
4. "Add a reference to the 'My Tasks' view in my personal workspace"
```

### Complex Database Operations

**Creating a filtered view for team members:**

```
"Create a new table view called 'Alice's Tasks' that shows only tasks where:
- Assignee is 'Alice'
- Status is not 'Done'
- Due date is within the next 7 days
Sort by priority (High to Low), then by due date (earliest first)"
```

### Cross-Document Workflows

**Linking related information:**

```
"In the 'Q1 Planning' document, add references to:
- The 'Team Goals' database from the strategy page
- The 'Active Projects' view from the project tracker
- The 'Budget' database from the finance document"
```

### Batch Operations

**Adding multiple items:**

```
"Add these tasks to the sprint backlog:
1. Implement user authentication - High priority - Alice
2. Design dashboard mockups - Medium priority - Bob
3. Set up CI/CD pipeline - High priority - Charlie
4. Write API documentation - Low priority - Alice
5. Conduct user testing - Medium priority - Bob"
```

### View Management

**Creating specialized views:**

```
"Create three views for the task database:
1. 'My Tasks' - table view, filtered to my assignments, sorted by due date
2. 'Team Kanban' - kanban view, grouped by status, showing all team tasks
3. 'Overdue Items' - table view, filtered to past due dates, sorted by priority"
```

## Best Practices

### Be Specific

Instead of: "Update the database"
Use: "Update the status column of the 'Website Redesign' project to 'Completed'"

### Use Context

Instead of: "Add a reference to the database with ID abc123 from document xyz789"
Use: "Add a reference to the Tasks database here"

### Describe Structure Clearly

Instead of: "Create a database"
Use: "Create a task database with title, status (Todo/In Progress/Done), assignee, and due date columns"

### Leverage Views

Instead of: Creating multiple databases for different filters
Use: Create one database with multiple views for different perspectives

### Combine Operations

Instead of: Multiple separate commands
Use: "Create a project database, add initial projects, and create a kanban view grouped by status"

## Troubleshooting

### Command Not Recognized

If the AI doesn't understand your command:
- Be more specific about what you want to do
- Use keywords like "create", "add", "edit", "reference"
- Specify the target document if not using the active one

### Database Not Found

If a database reference fails:
- Verify the database exists in the source document
- Check that you have permission to access the source document
- Use the exact database name or describe it clearly

### Changes Not Applied

If edits don't appear:
- Check that you approved the preview (if enabled)
- Verify you have edit permissions for the document
- Ensure the document is not locked by another user

### Reference Not Updating

If a database reference doesn't show changes:
- Verify the source database still exists
- Check that the view configuration hasn't been deleted
- Refresh the document to ensure synchronization

## Syntax Summary

### Command Patterns

| Pattern | Example |
|---------|---------|
| `Edit [target] to [change]` | "Edit the introduction to add context" |
| `Add [content] [position]` | "Add a heading at the top" |
| `Create [database] with [structure]` | "Create a task database with status and assignee" |
| `Add reference to [database]` | "Add reference to the team database" |
| `Update [cell] to [value]` | "Update status to Done" |
| `Filter [database] by [criteria]` | "Filter tasks by assignee = Alice" |
| `Create view [name] [type]` | "Create view 'My Tasks' as table" |

### Position Keywords

- "at the beginning"
- "at the end"
- "after [section]"
- "before [section]"
- "at the top"
- "at the bottom"

### Context Keywords

- "this page"
- "current document"
- "here"
- "this document"
- "active document"

### Database Keywords

- "database"
- "table"
- "kanban"
- "gallery"
- "view"
- "reference"
- "link"

## Related Documentation

- [Developer API Documentation](./API_REFERENCE.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Architecture Overview](./design.md)
- [Requirements Specification](./requirements.md)
