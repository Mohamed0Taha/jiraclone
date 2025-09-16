# Component Update Functionality

## Overview
Enterprise-grade component editing allows users to iteratively refine and update components after initial creation. Users can request specific modifications without losing existing functionality.

## How It Works

### 1. Update Detection
The system automatically detects whether a request is for a new component or an update:

```javascript
// Frontend automatically sends existing component code
body: {
    projectId: project?.id,
    viewName,
    currentCode: memoizedComponentCode, // Existing component if present
    projectContext: { tasks, users, methodology }
}
```

### 2. Backend Processing
When `currentCode` is provided, the system switches to update mode:

```php
$isUpdateRequest = !empty($currentComponentCode) && !empty(trim($currentComponentCode));

if ($isUpdateRequest) {
    // Use update-specific prompt that preserves existing functionality
    $prompt = "MODIFICATION TASK: Update existing component...";
} else {
    // Use creation prompt for new components
    $prompt = "CREATION TASK: Create new component...";
}
```

### 3. Update-Specific Prompts
The AI receives specialized instructions for updates:

- **Preserve**: Existing functionality, state management, data patterns
- **Modify**: Only the specific aspects requested by user
- **Maintain**: Backward compatibility, responsive design, styling

## Common Update Scenarios

### 1. Add Column to Table
**User Request**: "Add a status column to the table"
**System Response**: Adds new column while preserving existing columns and data

### 2. Change Colors/Styling  
**User Request**: "Make the buttons blue instead of green"
**System Response**: Updates CSS properties while keeping layout intact

### 3. Add New Feature
**User Request**: "Add a search filter above the table"
**System Response**: Adds search functionality integrated with existing state

### 4. Modify Layout
**User Request**: "Put the controls on the left side"
**System Response**: Adjusts positioning while keeping all elements

### 5. Update Data Fields
**User Request**: "Add priority field to each task"
**System Response**: Extends data model without breaking existing fields

## Enterprise Benefits

### ✅ Iterative Development
- Users can refine components step-by-step
- No need to start from scratch for modifications
- Preserves working functionality during updates

### ✅ Non-Destructive Updates
- Existing data and functionality preserved
- Only requested changes are modified
- Backward compatibility maintained

### ✅ Professional Workflow
- Natural conversation-based updates
- Specific change requests supported
- No technical knowledge required

### ✅ Data Integrity
- Existing data patterns preserved
- Real project data continues to work
- No data loss during updates

## Example Workflow

### Initial Creation:
```
User: "Create a task management table"
→ System creates: Basic table with task data
```

### Update 1:
```
User: "Add a priority column"
→ System adds: Priority column while keeping existing columns
```

### Update 2:
```
User: "Make high priority tasks red"
→ System adds: Conditional styling while preserving table structure
```

### Update 3:
```
User: "Add a filter dropdown above the table"
→ System adds: Filter functionality integrated with existing state
```

## Technical Implementation

### Frontend (CustomView.jsx)
```jsx
const { messages, append } = useChat({
    api: `/api/chat`,
    body: {
        currentCode: memoizedComponentCode, // Automatically includes existing code
        // ... other context
    },
    onFinish: (message) => {
        const wasUpdate = memoizedComponentCode && memoizedComponentCode.trim();
        setComponentCode(message.experimental_data.component_code);
        showSnackbar(wasUpdate ? 'Component updated!' : 'Component created!');
    }
});
```

### Backend (GenerativeUIService.php)
```php
public function processCustomViewRequest(...$currentComponentCode) {
    $isUpdateRequest = !empty($currentComponentCode);
    
    $prompt = $this->buildReactComponentPrompt(
        $userMessage, 
        $project, 
        $existingView,
        $conversationHistory,
        $projectContext,
        $currentComponentCode, // Sent to AI for context
        $authUser
    );
    
    return [
        'component_code' => $enhancedComponent,
        'message' => $isUpdateRequest ? 'Updated!' : 'Created!'
    ];
}
```

## User Experience

### Visual Feedback
- **Creating**: "Component generated successfully!"  
- **Updating**: "Component updated successfully!"
- **Error**: Context-aware error messages

### Debug Information
- Logs show whether update or creation mode
- Current component length displayed
- Update detection clearly indicated

### Seamless Transitions
- Component updates instantly replace previous version
- No flickering or jarring changes
- Existing data preserved across updates

This system enables true enterprise-grade component editing where users can iteratively improve and customize their components through natural conversation, making it suitable for business users who need powerful customization without technical complexity.