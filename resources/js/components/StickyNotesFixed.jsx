import React, { useState, useEffect } from 'react';

export default function StickyNotesComponent() {
    const { ContentContainer, BeautifulCard, SectionHeader, PrimaryButton, SuccessButton, DangerButton } = StyledComponents;
    const [notesData, setNotesData] = useEmbeddedData('sticky-notes', { notes: [] });
    const notes = notesData?.notes || [];
    const currentUser = authUser || { id: 1, name: 'Anonymous', email: 'user@example.com' };
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Predefined colors that work well in both light and dark modes
    const colorOptions = [
        { bg: '#FFE066', text: '#2A2A2A' }, // Yellow
        { bg: '#B4E7CE', text: '#2A2A2A' }, // Green  
        { bg: '#F4A6C7', text: '#2A2A2A' }, // Pink
        { bg: '#A8DADC', text: '#2A2A2A' }, // Blue
        { bg: '#FFB4A2', text: '#2A2A2A' }, // Coral
        { bg: '#E5989B', text: '#2A2A2A' }, // Rose
        { bg: '#B5838D', text: '#FFFFFF' }, // Mauve
        { bg: '#6D6875', text: '#FFFFFF' }  // Purple Grey
    ];

    const getNextColor = () => {
        const existingColors = notes.map(note => note.color);
        const lastColor = existingColors[existingColors.length - 1];
        if (!lastColor) return colorOptions[0];
        
        const lastIndex = colorOptions.findIndex(color => 
            color.bg === lastColor.bg && color.text === lastColor.text
        );
        return colorOptions[(lastIndex + 1) % colorOptions.length];
    };

    const addNote = (text = 'Add your notes...') => {
        const newNote = {
            id: `note-${Date.now()}`,
            text,
            color: getNextColor(),
            x: 20 + (notes.length % 4) * 220,
            y: 20 + Math.floor(notes.length / 4) * 180,
            width: 200,
            height: 160,
            creator: currentUser,
            created_at: new Date().toISOString(),
            created_by: currentUser.id,
            updated_at: new Date().toISOString(),
            updated_by: currentUser.id
        };
        const updatedData = {
            ...notesData,
            notes: [...notes, newNote],
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser
        };
        setNotesData(updatedData);
    };

    const updateNote = (id, updates) => {
        const updatedData = {
            ...notesData,
            notes: notes.map(note => note.id === id ? { 
                ...note, 
                ...updates, 
                updated_at: new Date().toISOString(),
                updated_by: currentUser.id,
                last_editor: currentUser
            } : note),
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser
        };
        setNotesData(updatedData);
    };

    const deleteNote = (id) => {
        const noteToDelete = notes.find(note => note.id === id);
        const deletionRecord = {
            id: noteToDelete?.id,
            text: noteToDelete?.text || 'Unknown Note',
            deleted_at: new Date().toISOString(),
            deleted_by: currentUser.id,
            deleted_by_user: currentUser
        };
        const updatedData = {
            ...notesData,
            notes: notes.filter(note => note.id !== id),
            deletions: [...(notesData.deletions || []), deletionRecord],
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser
        };
        setNotesData(updatedData);
    };

    const handleNoteChange = (updatedNotes) => {
        setNotesData({
            ...notesData,
            notes: updatedNotes,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser
        });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeydown = (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                // Trigger save functionality
            }
            if (e.key === 'Escape') {
                // Close modals or cancel operations
            }
        };
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, []);

    return (
        <ContentContainer>
            <BeautifulCard>
                <SectionHeader>Sticky Notes</SectionHeader>
                <PrimaryButton 
                    startIcon={<AddIcon />} 
                    onClick={() => addNote()}
                    sx={{ mb: 2 }}
                >
                    Add Note
                </PrimaryButton>
                <Templates.StickyNotes 
                    notes={notes} 
                    onChange={handleNoteChange} 
                    sessionKey="sticky-notes-session" 
                    containerHeight="600px" 
                    persistKey="sticky-notes-persist"
                />
            </BeautifulCard>
        </ContentContainer>
    );
}
