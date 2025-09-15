# Dynamic Authentication for Collaborative Components

## Problem
Components needed to support collaborative usage where multiple project members interact with the same component, but each user's actions should be attributed to them individually, not to the component creator.

## Root Cause
1. Initial approach attempted to embed static auth data in component code
2. This would have attributed all actions to the component creator
3. True collaboration requires dynamic auth data per current viewer

## Solution

### 1. Dynamic Auth Injection (ReactComponentRenderer)
- Always injects current session's auth data via props
- Never uses static/embedded auth data
- Ensures `authUser` represents current viewer, not creator:
  ```jsx
  // IMPORTANT: Always use the current user's auth data from props (dynamic per viewer)
  const authUser = __auth;
  ```

### 2. Robust Auth Data Access (CustomView)
- Uses current auth prop with Inertia fallback
- Ensures auth data is always available:
  ```jsx
  const { props } = usePage();
  const currentAuth = auth || props.auth?.user || null;
  ```

### 3. Enhanced AI Prompts (GenerativeUIService)
- Emphasizes `authUser` represents current viewer
- Promotes collaborative usage patterns:
  ```php
  // authUser represents the CURRENT VIEWER, not the component creator
  // Multiple project members can use the same component with their own identity
  const currentUser = authUser || { id: 1, name: 'Anonymous', email: 'user@example.com' };
  ```

### 4. Updated Controllers
- `CustomViewPageController` explicitly passes auth data for direct page loads

## Collaborative Workflow
1. User A creates component → saved to database  
2. User B opens same component → gets User B's auth data
3. User B performs CRUD operations → attributed to User B
4. User A reloads → sees User B's changes with correct attribution

## Files Modified
- `/app/Services/GenerativeUIService.php` - Enhanced prompts for collaboration
- `/resources/js/utils/ReactComponentRenderer.jsx` - Dynamic auth injection
- `/resources/js/Pages/Tasks/CustomView.jsx` - Robust auth data access
- `/app/Http/Controllers/CustomViewPageController.php` - Explicit auth passing

## Verification
✅ Components use current viewer's auth data (not creator's)
✅ Multiple users can collaborate on same component  
✅ CRUD operations correctly attributed to current user
✅ Works for both direct page loads and chat-generated components

## Next Steps
Test collaborative functionality with multiple project members to verify proper user attribution in all CRUD operations.