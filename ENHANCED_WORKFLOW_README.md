# Enhanced GenerativeUIService Workflow

## Overview

The GenerativeUIService has been enhanced with a 3-step workflow to produce higher quality React components that are visually appealing and functionally rich.

## New Workflow

When a user requests a new SPA/widget/calculator-type application, the service now:

1. **Step 1**: Ask OpenAI for standard UI elements and Google image search keywords
2. **Step 2**: Use keywords to fetch design inspiration images from Google Images  
3. **Step 3**: Generate enhanced React component using UI elements and design inspiration

## SPA Detection

The service automatically detects requests for new applications based on keywords like:
- calculator, spa, widget, app, application, tool
- dashboard, component, interface, form, chart
- editor, viewer, manager, tracker, monitor

## Configuration

### Google Custom Search API (Optional)

To enable real Google Images fetching, add these environment variables:

```env
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

If not configured, the service will use placeholder images as fallback.

### Setting up Google Custom Search API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Custom Search API
3. Create credentials (API Key)
4. Set up a Custom Search Engine at [Google CSE](https://cse.google.com/)
5. Configure it to search the entire web for images
6. Get the Search Engine ID from the setup

## Fallback Behavior

- If Google API is not configured: Uses placeholder images from Picsum
- If enhanced workflow fails: Falls back to standard component generation
- Maintains backward compatibility with existing functionality

## Implementation Details

### New Classes

- `GoogleImageService`: Handles image search and placeholder generation
- Enhanced `GenerativeUIService`: Implements 3-step workflow

### New Methods

- `detectsSpaRequest()`: Identifies new SPA requests
- `generateEnhancedComponent()`: Orchestrates the 3-step workflow
- `getUIElementsAndKeywords()`: Step 1 - Get UI analysis from OpenAI
- `generateComponentWithDesignInspiration()`: Step 3 - Generate with design context

## Testing

Run the test script to validate the implementation:

```bash
php test_enhanced_workflow.php
```

## Benefits

1. **Better UI Design**: Components inspired by real design examples
2. **Rich Functionality**: Comprehensive UI elements identified by AI
3. **Professional Appearance**: Enhanced prompts for production-ready components
4. **Backward Compatible**: Existing functionality preserved
5. **Configurable**: Works with or without Google API access

## Example

User request: "I want a basic calculator"

1. OpenAI identifies UI elements: [input, button, display, calculator-grid]
2. Google Images searched for: "calculator design", "calculator ui", "material design calculator"
3. Component generated with design inspiration and comprehensive functionality

Result: Professional calculator component with proper styling, full functionality, and modern design.