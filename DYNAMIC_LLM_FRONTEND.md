# Dynamic LLM Frontend Feature

This feature adds dynamic frontend generation capabilities powered by LLM (Large Language Model) integration to create custom views of project data.

## Overview

The Dynamic LLM Frontend feature allows users to:
- Chat with an AI assistant to create custom data visualizations
- Generate dynamic views of project data through natural language prompts
- Save and reuse custom view configurations
- Access project data through RESTful API endpoints
- Create interactive dashboards and reports

## Components

### 1. API Endpoints

#### GET `/api/project/{id}/tasks`
Returns comprehensive task data for a specific project.

**Response Structure:**
```json
{
  "project": {
    "id": 1,
    "name": "Project Name",
    "description": "Project description",
    "owner": { "id": 1, "name": "Owner Name" }
  },
  "tasks": [
    {
      "id": 1,
      "title": "Task Title",
      "description": "Task description",
      "status": "todo|inprogress|review|done",
      "priority": "low|medium|high|urgent",
      "created_at": "2024-01-01 10:00:00",
      "due_date": "2024-01-15",
      "assignee": { "id": 2, "name": "Assignee Name" },
      "comments_count": 3,
      "attachments_count": 1
    }
  ],
  "meta": {
    "total_tasks": 10,
    "by_status": {
      "todo": 3,
      "inprogress": 4,
      "review": 2,
      "done": 1
    },
    "endpoint": "/api/project/1/tasks"
  }
}
```

#### GET `/api/project/{id}/dashboard-data`
Returns statistical dashboard data for a project.

**Response Structure:**
```json
{
  "project": { /* project info */ },
  "statistics": {
    "total_tasks": 10,
    "completed_tasks": 3,
    "progress_percentage": 30.0,
    "tasks_by_status": { /* status breakdown */ },
    "tasks_by_priority": { /* priority breakdown */ }
  },
  "recent_activity": [ /* recent task updates */ ],
  "endpoints": {
    "tasks": "/api/project/1/tasks",
    "dashboard": "/api/project/1/dashboard-data"
  }
}
```

#### POST `/api/dashboard/chat`
Handles chat messages for dynamic view generation.

**Request Body:**
```json
{
  "message": "Create a chart showing task completion over time",
  "endpoint": "https://yourapp.com/api/project/1/tasks",
  "context": {
    "project_id": 1,
    "project_name": "My Project"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "I'll create a completion chart for you...",
  "view_config": {
    "type": "chart",
    "title": "Task Completion Over Time",
    "config": { /* view configuration */ }
  }
}
```

### 2. Frontend Components

#### DynamicViewManager
The main React component that provides:
- Chat interface for LLM interaction
- View configuration display
- Saved views management
- Real-time API data integration

**Usage in Board component:**
```jsx
import DynamicViewManager from '@/Components/DynamicViewManager';

// In your component
<DynamicViewManager
    project={project}
    isOpen={dynamicViewOpen}
    onClose={() => setDynamicViewOpen(false)}
/>
```

#### FloatingActionGroup
Updated to include a button for accessing the Dynamic View Manager.

### 3. Controllers

#### ProjectDataController
- Handles API endpoints for project data
- Implements authorization checks
- Formats data for consumption by LLM and frontend

#### DashboardChatController
- Processes LLM chat requests
- Integrates with OpenAI API
- Extracts view configurations from LLM responses

## How to Use

### 1. Access the Feature
1. Navigate to any project board
2. Click the floating action button (bottom right)
3. Click the purple "Custom Views & LLM Chat" button

### 2. Chat with the AI
1. Type natural language requests like:
   - "Show me a chart of tasks by status"
   - "Create a timeline view of completed tasks"
   - "Generate a report of high priority items"
   - "Display progress statistics"

2. The AI will respond with explanations and generate view configurations

### 3. Save Views
1. When the AI generates a view configuration, click "Save View"
2. Saved views appear as chips at the top of the dialog
3. Click any saved view chip to reload that configuration

### 4. API Integration
The AI has access to your project's API endpoint and can:
- Fetch real-time data
- Understand your project structure
- Generate appropriate visualizations
- Suggest data insights

## Example Prompts

### Data Visualization
- "Create a pie chart showing task distribution by status"
- "Show me a bar chart of tasks by priority level"
- "Generate a progress chart for this project"

### Reports
- "Create a summary report of project completion"
- "Show me overdue tasks"
- "Generate a team productivity report"

### Custom Views
- "Create a kanban board view with custom columns"
- "Show me a calendar view of task due dates"
- "Display tasks in a table format with filtering"

## Technical Details

### Authentication
- All API endpoints require authentication via Laravel Sanctum
- Users can only access projects they own or are members of

### Data Security
- API endpoints validate user permissions
- Chat context is limited to project-specific data
- No sensitive data is sent to external LLM services

### Extensibility
The system is designed to be extensible:
- Add new API endpoints for different data types
- Extend view configurations for new visualization types
- Customize LLM prompts for specific use cases

## Configuration

### OpenAI Integration
The feature requires OpenAI API configuration in your Laravel app:

```env
OPENAI_API_KEY=your-openai-api-key
```

### Customization
You can customize the system prompt in `DashboardChatController.php` to:
- Add domain-specific knowledge
- Include custom view types
- Modify response formatting

## Troubleshooting

### Common Issues
1. **403 Unauthorized**: Ensure the user has access to the project
2. **OpenAI API errors**: Check API key configuration and rate limits
3. **View not rendering**: Verify view configuration format

### Debug Mode
Enable debug logging to troubleshoot issues:
```php
Log::info('Chat request:', $request->all());
```

## Future Enhancements

Potential improvements:
- Real-time data streaming
- More visualization types
- Custom export formats
- Collaborative view sharing
- Advanced filtering and sorting
- Integration with external BI tools