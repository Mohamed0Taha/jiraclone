import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

export default function SlidesRDE({ state, setState }) {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Handle messages from the iframe
  const handleMessage = useCallback((event) => {
    // Only accept messages from our iframe
    if (event.source !== iframeRef.current?.contentWindow) return;
    
    const { type, json } = event.data;
    
    switch (type) {
      case 'RDE_READY':
        setIsReady(true);
        setIsLoading(false);
        // Send initial data if we have any
        if (state?.slides && state?.slides.length > 0) {
          sendToIframe('RDE_LOAD_JSON', { json: state });
        }
        break;
        
      case 'RDE_DATA_CHANGED':
        // Update our state with the new slides data
        setState(json);
        break;
        
      default:
        break;
    }
  }, [state, setState]);
  
  // Send message to iframe
  const sendToIframe = useCallback((type, data = {}) => {
    if (iframeRef.current?.contentWindow && isReady) {
      iframeRef.current.contentWindow.postMessage({
        type,
        ...data
      }, '*');
    }
  }, [isReady]);
  
  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);
  
  // Load data into iframe when state changes
  useEffect(() => {
    if (isReady && state?.slides) {
      sendToIframe('RDE_LOAD_JSON', { json: state });
    }
  }, [isReady, state, sendToIframe]);
  
  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    // The iframe will send RDE_READY when it's actually ready
    // This just means the HTML has loaded
  }, []);
  
  return (
    <Box sx={{ 
      height: '100%', 
      flex: 1,
      minHeight: 0,
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    }}>
      {isLoading && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1000
        }}>
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading Design Editor...
          </Typography>
        </Box>
      )}
      
      <iframe
        ref={iframeRef}
        src="/rde/slides-editor.html"
        onLoad={handleIframeLoad}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: '#f5f5f5'
        }}
        title="React Design Editor"
      />
    </Box>
  );
}
