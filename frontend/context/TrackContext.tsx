"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Track = {
    id: string;
    label: string;
};

// Available tracks definition - easy to extend later
export const AVAILABLE_TRACKS: Track[] = [
    { id: 'bts_ndrc', label: 'BTS NDRC' },
    { id: 'bts_mco', label: 'BTS MCO' },
    { id: 'bts_gpme', label: 'BTS GPME' },
    { id: 'bts_assurance', label: 'BTS Assurance' },
    { id: 'bts_compta', label: 'BTS CG (Compta)' },
];

interface TrackContextType {
    currentTrack: string;
    setTrack: (trackId: string) => void;
    getLabel: (trackId: string) => string;
}

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export function TrackProvider({ children }: { children: React.ReactNode }) {
    // Default to BTS NDRC, but try to persist in localStorage
    const [currentTrack, setCurrentTrack] = useState<string>('bts_ndrc');

    useEffect(() => {
        const saved = localStorage.getItem('profvirtuel_track');
        if (saved) {
            setCurrentTrack(saved);
        }
    }, []);

    const setTrack = (trackId: string) => {
        setCurrentTrack(trackId);
        localStorage.setItem('profvirtuel_track', trackId);
    };

    const getLabel = (trackId: string) => {
        return AVAILABLE_TRACKS.find(t => t.id === trackId)?.label || trackId;
    }

    return (
        <TrackContext.Provider value={{ currentTrack, setTrack, getLabel }}>
            {children}
        </TrackContext.Provider>
    );
}

export function useTrack() {
    const context = useContext(TrackContext);
    if (context === undefined) {
        throw new Error('useTrack must be used within a TrackProvider');
    }
    return context;
}
