# Collaborative Data Sharing System

## Overview
The collaborative data sharing system enables multiple users to interact with the same component in real-time, with proper data synchronization and user attribution.

## Key Components

### 1. Dynamic Authentication (`authUser`)
- Always represents the **current viewer**, not the component creator
- Enables proper user attribution for all CRUD operations
- Injected dynamically via `ReactComponentRenderer`

### 2. Collaborative Data Persistence (`useEmbeddedData`)
The `useEmbeddedData` hook manages both fast initialization and real-time collaboration:

```jsx
const [chatData, setChatData] = useEmbeddedData('chat-messages', { messages: [] });
```

#### Data Flow:
1. **Fast Initialization**: Uses embedded data for instant rendering
2. **Server Sync**: Always checks server for latest collaborative updates  
3. **Auto-Update**: Updates component if server has newer data
4. **Auto-Save**: Saves changes back to server for other users

#### Implementation:
```jsx
function useEmbeddedData(dataKey, defaultValue) {
  // 1. Initialize with embedded data (fast render)
  const [data, setData] = useState(() => 
    extractedEmbeddedData?.[dataKey] || defaultValue
  );
  
  // 2. Always check server for latest collaborative data
  useEffect(() => {
    loadViewDataFromServer(dataKey).then(serverData => {
      if (serverData && JSON.stringify(data) !== JSON.stringify(serverData)) {
        setData(serverData); // Update with latest collaborative changes
      }
    });
  }, [dataKey]);
  
  // 3. Save function that persists to server
  const saveData = useCallback((newData) => {
    setData(newData);
    saveViewData(dataKey, newData); // Saves to server + embeds in component
  }, [dataKey]);
  
  return [data, saveData, isLoaded];
}
```

### 3. Server-Side Data Persistence
- **Save Endpoint**: `/projects/{id}/custom-views/save-data`
  - Saves data to database
  - Embeds updated data into component code
  - Makes data available to other users

- **Load Endpoint**: `/projects/{id}/custom-views/load-data`  
  - Returns latest collaborative data
  - Bypasses embedded data for real-time sync

## Collaborative Workflow

### Scenario: Team Chat Component
1. **User A** creates chat component → saves to database
2. **User B** opens component:
   - Gets User B's auth data (`authUser`)
   - Loads with embedded data (fast render)
   - Checks server for latest messages
   - Updates if new messages exist
3. **User B** sends message:
   - Message attributed to User B
   - Saved to server with User B's details
   - Embedded in component code
4. **User A** refreshes/reopens:
   - Still gets User A's auth data
   - Sees User B's message with correct attribution
   - Can reply as User A

### Data Attribution Pattern
```jsx
const currentUser = authUser || { id: 1, name: 'Anonymous' };

// Create operation
const createMessage = (content) => {
  const message = {
    id: Date.now(),
    content,
    sender: currentUser,           // Current user (dynamic)
    created_by: currentUser.id,    // User ID tracking
    created_at: new Date().toISOString()
  };
  
  const updatedData = {
    ...chatData,
    messages: [...messages, message],
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: currentUser     // Track who made the change
  };
  
  setChatData(updatedData); // Auto-saves to server
};
```

## Benefits

### ✅ Real-Time Collaboration
- Multiple users can interact simultaneously
- Changes are automatically synchronized
- No data conflicts or loss

### ✅ Proper User Attribution  
- All actions tracked to correct user
- Complete audit trail
- No user impersonation possible

### ✅ Fast Performance
- Embedded data for instant loading
- Background sync for collaboration
- Optimistic updates

### ✅ Robust Fallbacks
- Embedded data → Server data → localStorage → defaults
- Graceful degradation if server unavailable
- No data loss

## Example: Multi-User Chat

### User Flow:
1. **Project Manager** creates chat: `createMessage("Team meeting at 3pm")`
   - Saved as: `{ sender: { name: "Project Manager" }, content: "..." }`

2. **Developer** opens same component:
   - Sees PM's message with correct attribution
   - Types reply: `createMessage("I'll be there")`
   - Saved as: `{ sender: { name: "Developer" }, content: "..." }`

3. **Designer** opens component:
   - Sees both messages with correct senders
   - Can delete only their own messages (permission check)

### Result:
- ✅ True collaboration between team members
- ✅ Each user's identity preserved and tracked
- ✅ Real-time data synchronization
- ✅ Proper audit trail and permissions

This system enables truly collaborative components where multiple project members can work together while maintaining proper user tracking and data integrity.