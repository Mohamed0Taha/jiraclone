import { useState, useRef, useCallback, useEffect } from 'react';

// Global registry to track active speech recognition instances
const activeSpeechRecognitionComponents = new Set();

/**
 * Custom hook for isolated speech recognition
 * This prevents multiple components from interfering with each other
 */
export function useIsolatedSpeechRecognition(componentId) {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef(null);
    const componentIdRef = useRef(componentId);

    // Check browser support
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        setIsSupported(!!SpeechRecognition);

        if (SpeechRecognition && !recognitionRef.current) {
            // Create a new recognition instance for this component
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                console.log(`Speech recognition started for ${componentIdRef.current}`);
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                // Use final transcript if available, otherwise use interim
                setTranscript(finalTranscript || interimTranscript);
            };

            recognition.onerror = (event) => {
                console.error(
                    `Speech recognition error for ${componentIdRef.current}:`,
                    event.error
                );
                setIsListening(false);
            };

            recognition.onend = () => {
                console.log(`Speech recognition ended for ${componentIdRef.current}`);
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        // Cleanup on unmount
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                    recognitionRef.current = null;
                    activeSpeechRecognitionComponents.delete(componentIdRef.current);
                    console.log(`Speech recognition cleaned up for ${componentIdRef.current}`);
                } catch (error) {
                    console.warn(
                        `Error cleaning up recognition for ${componentIdRef.current}:`,
                        error
                    );
                }
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || !isSupported) {
            console.warn(
                `Cannot start listening for ${componentIdRef.current}: not supported or not initialized`
            );
            return false;
        }

        try {
            // Stop any other active recognition instances
            activeSpeechRecognitionComponents.forEach((otherComponentId) => {
                if (otherComponentId !== componentIdRef.current) {
                    console.log(`Stopping other active recognition: ${otherComponentId}`);
                }
            });

            // Clear the active registry and add this component
            activeSpeechRecognitionComponents.clear();
            activeSpeechRecognitionComponents.add(componentIdRef.current);

            // Stop any existing recognition first
            if (isListening) {
                recognitionRef.current.stop();
            }

            // Clear previous transcript
            setTranscript('');

            // Start new recognition
            recognitionRef.current.start();
            return true;
        } catch (error) {
            console.error(`Error starting recognition for ${componentIdRef.current}:`, error);
            setIsListening(false);
            activeSpeechRecognitionComponents.delete(componentIdRef.current);
            return false;
        }
    }, [isListening, isSupported]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) {
            console.warn(`Cannot stop listening for ${componentIdRef.current}: not initialized`);
            return;
        }

        try {
            recognitionRef.current.stop();
            activeSpeechRecognitionComponents.delete(componentIdRef.current);
        } catch (error) {
            console.warn(`Error stopping recognition for ${componentIdRef.current}:`, error);
        }
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    return {
        transcript,
        listening: isListening,
        browserSupportsSpeechRecognition: isSupported,
        startListening,
        stopListening,
        resetTranscript,
    };
}
