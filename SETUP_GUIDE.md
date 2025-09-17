# Quick Setup Guide for Enhanced GenerativeUIService

## Environment Variables

Add these to your `.env` file for full functionality:

```env
# Required - OpenAI API (already configured)
OPENAI_API_KEY=your_openai_key

# Optional - Google Custom Search API for real image search
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

## Google Custom Search Setup (Optional)

If you want real Google Images instead of placeholders:

1. **Enable API**: Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable "Custom Search API"
   - Create API Key

2. **Create Search Engine**: Go to [Google CSE](https://cse.google.com/)
   - Create new search engine
   - Search the entire web
   - Enable image search
   - Copy the Search Engine ID

3. **Configure Environment**:
   ```env
   GOOGLE_SEARCH_API_KEY=AIza...your_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   ```

## Testing the Implementation

### Manual Test (Calculator Example)

1. Navigate to any project's custom views
2. Type: "I want a basic calculator"
3. Observe the enhanced workflow in action:
   - Check logs for "Using enhanced 3-step workflow"
   - Note the sophisticated component generated
   - Compare with previous minimal components

### Expected Behavior

**With Google API**:
- Real design images fetched
- Rich design inspiration
- Professional styling

**Without Google API** (Default):
- Placeholder images used
- Still enhanced prompting
- Better than standard workflow

### Log Messages to Watch

```
GenerativeUIService: Using enhanced 3-step workflow
UI Analysis completed
Enhanced component generated
```

## Fallback Strategy

The system gracefully degrades:
1. **Best**: Full workflow with Google API
2. **Good**: Enhanced workflow with placeholders  
3. **Safe**: Standard workflow if enhanced fails

## Performance Notes

- Image search is cached where possible
- Minimal overhead for non-SPA requests
- Standard workflow unchanged for updates
- Backward compatibility maintained

Ready to generate professional-quality components! 🚀