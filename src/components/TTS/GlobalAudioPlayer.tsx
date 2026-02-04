
import React from 'react';
import { LegacyTTSPlayer } from './LegacyTTSPlayer';
import { PersistentTTSPlayer } from './PersistentTTSPlayer';

/**
 * Global Audio Player Checkpoint
 * 
 * Toggle USE_LEGACY_SYSTEM to switch between architectures.
 * - true: Use original "Just-In-Time" Streaming (LegacyTTSPlayer)
 * - false: Use new "Persistent Background" Queue (PersistentTTSPlayer)
 */
const USE_LEGACY_SYSTEM = false;

export const GlobalAudioPlayer: React.FC = () => {
    if (USE_LEGACY_SYSTEM) {
        console.log('[GlobalAudioPlayer] Using Legacy Streaming Architecture');
        return <LegacyTTSPlayer />;
    }

    console.log('[GlobalAudioPlayer] Using Persistent Background Architecture');
    return <PersistentTTSPlayer />;
};
