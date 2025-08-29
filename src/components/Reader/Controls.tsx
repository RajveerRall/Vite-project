// // // // // // // src/components/Reader/Controls.tsx
// // // // // // import React from 'react';
// // // // // // import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle } from 'lucide-react';
// // // // // // import './Controls.css';

// // // // // // interface ControlsProps {
// // // // // //   currentPage: number;
// // // // // //   totalPages: number;
// // // // // //   onPrevious: () => void;
// // // // // //   onNext: () => void;
// // // // // //   onReadAloud: () => void;
// // // // // //   isReading: boolean;
// // // // // //   onAudiobook: () => void;
// // // // // //   isPlayModeActive: boolean;
// // // // // // }

// // // // // // const Controls: React.FC<ControlsProps> = ({
// // // // // //   currentPage,
// // // // // //   totalPages,
// // // // // //   onPrevious,
// // // // // //   onNext,
// // // // // //   onReadAloud,
// // // // // //   isReading,
// // // // // //   onAudiobook,
// // // // // //   isPlayModeActive
// // // // // // }) => {
// // // // // //   return (
// // // // // //     <div className="reader-controls">
// // // // // //       <div className="nav-controls">
// // // // // //         <button 
// // // // // //           onClick={onPrevious} 
// // // // // //           disabled={currentPage === 0}
// // // // // //           className="control-button icon-button"
// // // // // //           aria-label="Previous page"
// // // // // //           title="Previous page"
// // // // // //         >
// // // // // //           <ChevronLeft size={20} />
// // // // // //         </button>
        
// // // // // //         <span className="page-info">
// // // // // //           {currentPage + 1} / {totalPages}
// // // // // //         </span>
        
// // // // // //         <button 
// // // // // //           onClick={onNext} 
// // // // // //           disabled={currentPage === totalPages - 1}
// // // // // //           className="control-button icon-button"
// // // // // //           aria-label="Next page"
// // // // // //           title="Next page"
// // // // // //         >
// // // // // //           <ChevronRight size={20} />
// // // // // //         </button>
// // // // // //       </div>
      
// // // // // //       <div className="audio-controls">
// // // // // //         <button 
// // // // // //           onClick={onReadAloud} 
// // // // // //           className={`control-button icon-button ${isReading ? 'active' : ''}`}
// // // // // //           aria-label={isReading ? 'Stop reading' : 'Read aloud'}
// // // // // //           title={isReading ? 'Stop reading' : 'Read aloud'}
// // // // // //         >
// // // // // //           {isReading ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
// // // // // //           <span className="button-text">Read</span>
// // // // // //         </button>
        
// // // // // //         <button 
// // // // // //           onClick={onAudiobook} 
// // // // // //           className={`control-button icon-button ${isPlayModeActive ? 'active' : ''}`}
// // // // // //           aria-label="Audiobook mode"
// // // // // //           title="Audiobook mode"
// // // // // //         >
// // // // // //           <Headphones size={20} />
// // // // // //           <span className="button-text">Audiobook</span>
// // // // // //         </button>
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // };

// // // // // // export default Controls;


// // // // // // src/components/Reader/Controls.tsx
// // // // // import React from 'react';
// // // // // import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, Loader2 } from 'lucide-react'; // Added Loader2 for processing
// // // // // import './Controls.css';

// // // // // interface ControlsProps {
// // // // //   currentPage: number;
// // // // //   totalPages: number;
// // // // //   onPrevious: () => void;
// // // // //   onNext: () => void;
// // // // //   onReadAloud: () => void; // This single handler now manages Read/Pause/Resume
// // // // //   isReading: boolean;      // True when audio is actively playing
// // // // //   isPaused: boolean;       // True when audio is paused
// // // // //   isProcessing: boolean;   // True when audio is being fetched/prepared
// // // // //   onAudiobook: () => void;
// // // // //   isPlayModeActive: boolean;
// // // // // }

// // // // // const Controls: React.FC<ControlsProps> = ({
// // // // //   currentPage,
// // // // //   totalPages,
// // // // //   onPrevious,
// // // // //   onNext,
// // // // //   onReadAloud,
// // // // //   isReading,      // Currently playing sound
// // // // //   isPaused,       // Active session, but paused
// // // // //   isProcessing,   // Fetching/preparing audio
// // // // //   onAudiobook,
// // // // //   isPlayModeActive
// // // // // }) => {

// // // // //   // Determine the state for the Read/Pause/Resume button
// // // // //   let readButtonIcon: React.ReactNode;
// // // // //   let readButtonLabel: string;
// // // // //   let readButtonTitle: string;
// // // // //   let isReadButtonActive = isReading || isPaused; // Button is 'active' if playing or paused

// // // // //   if (isProcessing) {
// // // // //     readButtonIcon = <Loader2 size={20} className="animate-spin" />; // Show spinner when processing
// // // // //     readButtonLabel = 'Loading...';
// // // // //     readButtonTitle = 'Preparing audio...';
// // // // //   } else if (isPaused) {
// // // // //     readButtonIcon = <PlayCircle size={20} />; // Show Play icon to indicate Resume
// // // // //     readButtonLabel = 'Resume';
// // // // //     readButtonTitle = 'Resume reading';
// // // // //   } else if (isReading) {
// // // // //     readButtonIcon = <PauseCircle size={20} />; // Show Pause icon
// // // // //     readButtonLabel = 'Pause';
// // // // //     readButtonTitle = 'Pause reading';
// // // // //   } else {
// // // // //     readButtonIcon = <PlayCircle size={20} />; // Show Play icon to indicate Start
// // // // //     readButtonLabel = 'Read';
// // // // //     readButtonTitle = 'Read aloud';
// // // // //   }

// // // // //   return (
// // // // //     <div className="reader-controls">
// // // // //       {/* --- Navigation Controls (Unchanged) --- */}
// // // // //       <div className="nav-controls">
// // // // //         <button
// // // // //           onClick={onPrevious}
// // // // //           disabled={currentPage === 0}
// // // // //           className="control-button icon-button"
// // // // //           aria-label="Previous page"
// // // // //           title="Previous page"
// // // // //         >
// // // // //           <ChevronLeft size={20} />
// // // // //         </button>

// // // // //         <span className="page-info">
// // // // //           {currentPage + 1} / {totalPages}
// // // // //         </span>

// // // // //         <button
// // // // //           onClick={onNext}
// // // // //           disabled={currentPage === totalPages - 1}
// // // // //           className="control-button icon-button"
// // // // //           aria-label="Next page"
// // // // //           title="Next page"
// // // // //         >
// // // // //           <ChevronRight size={20} />
// // // // //         </button>
// // // // //       </div>

// // // // //       {/* --- Audio Controls (Read/Pause/Resume button updated) --- */}
// // // // //       <div className="audio-controls">
// // // // //         <button
// // // // //           onClick={onReadAloud} // Single handler manages the action
// // // // //           className={`control-button icon-button ${isReadButtonActive ? 'active' : ''}`}
// // // // //           aria-label={readButtonTitle} // Use dynamic label
// // // // //           title={readButtonTitle}     // Use dynamic title
// // // // //           disabled={isProcessing}     // Disable button while processing
// // // // //         >
// // // // //           {readButtonIcon} {/* Use dynamic icon */}
// // // // //           <span className="button-text">{readButtonLabel}</span> {/* Use dynamic text */}
// // // // //         </button>

// // // // //         {/* --- Audiobook Button (Unchanged) --- */}
// // // // //         <button
// // // // //           onClick={onAudiobook}
// // // // //           className={`control-button icon-button ${isPlayModeActive ? 'active' : ''}`}
// // // // //           aria-label="Audiobook mode"
// // // // //           title="Audiobook mode"
// // // // //         >
// // // // //           <Headphones size={20} />
// // // // //           <span className="button-text">Audiobook</span>
// // // // //         </button>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export default Controls;


// // // // // src/components/Reader/Controls.tsx
// // // // import React from 'react';
// // // // import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2 } from 'lucide-react'; // Added RotateCcw for Resume Reading, Loader2
// // // // import './Controls.css';

// // // // interface ControlsProps {
// // // //   currentPage: number;
// // // //   totalPages: number;
// // // //   onPrevious: () => void;
// // // //   onNext: () => void;
// // // //   onReadAloud: () => void; // Single handler for Read/Pause/Resume/Resume Reading
// // // //   isReading: boolean;      // Actively playing sound
// // // //   isPaused: boolean;       // Paused mid-playback
// // // //   isProcessing: boolean;   // Fetching/preparing audio
// // // //   canResume: boolean;      // Indicates if saved progress exists and TTS is idle
// // // //   onAudiobook: () => void;
// // // //   isPlayModeActive: boolean;
// // // // }

// // // // const Controls: React.FC<ControlsProps> = ({
// // // //   currentPage,
// // // //   totalPages,
// // // //   onPrevious,
// // // //   onNext,
// // // //   onReadAloud,
// // // //   isReading,
// // // //   isPaused,
// // // //   isProcessing,
// // // //   canResume, // New prop
// // // //   onAudiobook,
// // // //   isPlayModeActive
// // // // }) => {

// // // //   // Determine the state for the main audio control button
// // // //   let readButtonIcon: React.ReactNode;
// // // //   let readButtonLabel: string;
// // // //   let readButtonTitle: string;
// // // //   // Button is considered 'active' if playing, paused, OR has resumable state
// // // //   let isReadButtonActive = isReading || isPaused || canResume;

// // // //   if (isProcessing) {
// // // //     readButtonIcon = <Loader2 size={20} className="animate-spin" />;
// // // //     readButtonLabel = 'Loading...';
// // // //     readButtonTitle = 'Preparing audio...';
// // // //   } else if (isPaused) {
// // // //     readButtonIcon = <PlayCircle size={20} />; // Show Play icon to indicate Resume Paused
// // // //     readButtonLabel = 'Resume';
// // // //     readButtonTitle = 'Resume paused reading';
// // // //   } else if (isReading) {
// // // //     readButtonIcon = <PauseCircle size={20} />; // Show Pause icon
// // // //     readButtonLabel = 'Pause';
// // // //     readButtonTitle = 'Pause reading';
// // // //   } else if (canResume) { // --- NEW: Check for resumable state ---
// // // //     readButtonIcon = <RotateCcw size={20} />; // Use a different icon for resuming from saved state
// // // //     readButtonLabel = 'Resume'; // Keep label as 'Resume' for simplicity or change to 'Resume Reading'
// // // //     readButtonTitle = 'Resume reading from last position';
// // // //   } else {
// // // //     readButtonIcon = <PlayCircle size={20} />; // Default: Show Play icon to indicate Start Reading
// // // //     readButtonLabel = 'Read';
// // // //     readButtonTitle = 'Read aloud from beginning';
// // // //   }

// // // //   return (
// // // //     <div className="reader-controls">
// // // //       {/* --- Navigation Controls (Unchanged) --- */}
// // // //       <div className="nav-controls">
// // // //         <button
// // // //           onClick={onPrevious}
// // // //           disabled={currentPage === 0 || isProcessing} // Also disable nav while processing audio
// // // //           className="control-button icon-button"
// // // //           aria-label="Previous page"
// // // //           title="Previous page"
// // // //         >
// // // //           <ChevronLeft size={20} />
// // // //         </button>

// // // //         <span className="page-info">
// // // //           {currentPage + 1} / {totalPages}
// // // //         </span>

// // // //         <button
// // // //           onClick={onNext}
// // // //           disabled={currentPage === totalPages - 1 || isProcessing} // Also disable nav while processing audio
// // // //           className="control-button icon-button"
// // // //           aria-label="Next page"
// // // //           title="Next page"
// // // //         >
// // // //           <ChevronRight size={20} />
// // // //         </button>
// // // //       </div>

// // // //       {/* --- Audio Controls (Read/Pause/Resume button updated) --- */}
// // // //       <div className="audio-controls">
// // // //         <button
// // // //           onClick={onReadAloud} // Single handler manages all actions
// // // //           // Add 'can-resume' class if needed for specific styling
// // // //           className={`control-button icon-button ${isReadButtonActive ? 'active' : ''} ${canResume ? 'can-resume' : ''}`}
// // // //           aria-label={readButtonTitle}
// // // //           title={readButtonTitle}
// // // //           disabled={isProcessing} // Disable button only while processing
// // // //         >
// // // //           {readButtonIcon}
// // // //           <span className="button-text">{readButtonLabel}</span>
// // // //         </button>

// // // //         {/* --- Audiobook Button (Unchanged) --- */}
// // // //         <button
// // // //           onClick={onAudiobook}
// // // //           className={`control-button icon-button ${isPlayModeActive ? 'active' : ''}`}
// // // //           aria-label="Audiobook mode"
// // // //           title="Audiobook mode"
// // // //           disabled={isProcessing} // Also disable this if audio is processing
// // // //         >
// // // //           <Headphones size={20} />
// // // //           <span className="button-text">Audiobook</span>
// // // //         </button>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Controls;


// // // // src/components/Reader/Controls.tsx
// // // import React from 'react';
// // // import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2 } from 'lucide-react'; // Added RotateCcw for Resume Reading, Loader2
// // // import './Controls.css'; // Assuming you might have some base styles here

// // // interface ControlsProps {
// // //   currentPage: number;
// // //   totalPages: number;
// // //   onPrevious: () => void;
// // //   onNext: () => void;
// // //   onReadAloud: () => void; // Single handler for Read/Pause/Resume/Resume Reading
// // //   isReading: boolean;      // Actively playing sound
// // //   isPaused: boolean;       // Paused mid-playback
// // //   isProcessing: boolean;   // Fetching/preparing audio
// // //   canResume: boolean;      // Indicates if saved progress exists and TTS is idle
// // //   onAudiobook: () => void;
// // //   isPlayModeActive: boolean;
// // //   // Add derived prop for better className logic on the main read button
// // //   isReadButtonActive: boolean; // Derived state: true if reading, paused, or canResume
// // // }

// // // const Controls: React.FC<ControlsProps> = ({
// // //   currentPage,
// // //   totalPages,
// // //   onPrevious,
// // //   onNext,
// // //   onReadAloud,
// // //   isReading,
// // //   isPaused,
// // //   isProcessing,
// // //   canResume, // New prop
// // //   onAudiobook,
// // //   isPlayModeActive,
// // //   isReadButtonActive // Pass the derived state as a prop or calculate it here
// // // }) => {

// // //   // Determine the state for the main audio control button
// // //   let readButtonIcon: React.ReactNode;
// // //   let readButtonLabel: string;
// // //   let readButtonTitle: string;
// // //   // This calculation should ideally happen in the parent component and passed down
// // //   // or calculated here if the prop isn't passed:
// // //   // let isReadButtonActive = isReading || isPaused || canResume;

// // //   if (isProcessing) {
// // //     readButtonIcon = <Loader2 size={20} className="animate-spin" />;
// // //     readButtonLabel = 'Loading...';
// // //     readButtonTitle = 'Preparing audio...';
// // //   } else if (isPaused) {
// // //     readButtonIcon = <PlayCircle size={20} />; // Show Play icon to indicate Resume Paused
// // //     readButtonLabel = 'Resume';
// // //     readButtonTitle = 'Resume paused reading';
// // //   } else if (isReading) {
// // //     readButtonIcon = <PauseCircle size={20} />; // Show Pause icon
// // //     readButtonLabel = 'Pause';
// // //     readButtonTitle = 'Pause reading';
// // //   } else if (canResume) { // --- NEW: Check for resumable state ---
// // //     readButtonIcon = <RotateCcw size={20} />; // Use a different icon for resuming from saved state
// // //     readButtonLabel = 'Resume'; // Keep label as 'Resume' for simplicity or change to 'Resume Reading'
// // //     readButtonTitle = 'Resume reading from last position';
// // //   } else {
// // //     readButtonIcon = <PlayCircle size={20} />; // Default: Show Play icon to indicate Start Reading
// // //     readButtonLabel = 'Read';
// // //     readButtonTitle = 'Read aloud from beginning';
// // //   }

// // //   return (
// // //     <div className="reader-controls"> {/* Add Tailwind classes here or in CSS if needed */}
// // //       {/* --- Navigation Controls --- */}
// // //       <div className="nav-controls"> {/* Add Tailwind classes here or in CSS if needed */}
// // //         <button
// // //           onClick={onPrevious}
// // //           disabled={currentPage === 0 || isProcessing} // Also disable nav while processing audio
// // //           className="control-button icon-button" // Base classes from CSS?
// // //           aria-label="Previous page"
// // //           title="Previous page"
// // //         >
// // //           <ChevronLeft size={20} />
// // //         </button>

// // //         <span className="page-info"> {/* Style page info */}
// // //           {currentPage + 1} / {totalPages}
// // //         </span>

// // //         <button
// // //           onClick={onNext}
// // //           disabled={currentPage === totalPages - 1 || isProcessing} // Also disable nav while processing audio
// // //           className="control-button icon-button" // Base classes from CSS?
// // //           aria-label="Next page"
// // //           title="Next page"
// // //         >
// // //           <ChevronRight size={20} />
// // //         </button>
// // //       </div>

// // //       {/* --- Audio Controls --- */}
// // //       <div className="audio-controls"> {/* Add Tailwind classes here or in CSS if needed */}
// // //         {/* Read/Pause/Resume Button */}
// // //         <button
// // //           onClick={onReadAloud} // Single handler manages all actions
// // //           // Add 'can-resume' class if needed for specific CSS styling
// // //           // Added Tailwind classes for flex layout
// // //           className={`control-button icon-button ${isReadButtonActive ? 'active' : ''} ${canResume ? 'can-resume' : ''} inline-flex items-center justify-center`}
// // //           aria-label={readButtonTitle}
// // //           title={readButtonTitle}
// // //           disabled={isProcessing} // Disable button only while processing
// // //         >
// // //           {readButtonIcon}
// // //           {/* Added ml-1 for margin */}
// // //           <span className="button-text ml-1">{readButtonLabel}</span>
// // //         </button>

// // //         {/* --- Audiobook Button (MODIFIED with Tailwind classes) --- */}
// // //         <button
// // //           onClick={onAudiobook}
// // //           // Base classes + active state + HIDDEN on mobile + VISIBLE (inline-flex) on md screens and up
// // //           className={`control-button icon-button ${isPlayModeActive ? 'active' : ''} hidden md:inline-flex items-center justify-center`}
// // //           aria-label="Audiobook mode"
// // //           title="Audiobook mode"
// // //           disabled={isProcessing} // Also disable this if audio is processing
// // //         >
// // //           <Headphones size={20} />
// // //            {/* Added ml-1 for margin */}
// // //           <span className="button-text ml-1">Audiobook</span>
// // //         </button>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default Controls;


// // // src/components/Reader/Controls.tsx
// // import React from 'react';
// // import {
// //   ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2,
// //   Square // Stop Icon
// // } from 'lucide-react';
// // import './Controls.css';

// // interface ControlsProps {
// //   currentPage: number;
// //   totalPages: number;
// //   onPrevious: () => void;
// //   onNext: () => void;
// //   onReadAloud: () => void; // Handles Read/Pause/Resume from last character index
// //   onStopTTS: () => void;   // <<<< NEW: Handler for stopping TTS and clearing resume state
// //   isReading: boolean;      // TTS is actively playing sound
// //   isPaused: boolean;       // TTS is paused mid-playback
// //   isProcessing: boolean;   // TTS is fetching/preparing audio
// //   canResume: boolean;      // Indicates if saved TTS character index progress exists and TTS is idle
// //   onAudiobook: () => void;
// //   isPlayModeActive: boolean;
// //   isReadButtonActive: boolean; // True if reading, paused, or canResume (from saved char index)
// // }

// // const Controls: React.FC<ControlsProps> = ({
// //   currentPage,
// //   totalPages,
// //   onPrevious,
// //   onNext,
// //   onReadAloud,
// //   onStopTTS, // <<<< NEW
// //   isReading,
// //   isPaused,
// //   isProcessing,
// //   canResume,
// //   onAudiobook,
// //   isPlayModeActive,
// //   isReadButtonActive
// // }) => {

// //   let readButtonIcon: React.ReactNode;
// //   let readButtonLabel: string;
// //   let readButtonTitle: string;

// //   if (isProcessing) {
// //     readButtonIcon = <Loader2 size={20} className="animate-spin" />;
// //     readButtonLabel = 'Loading...';
// //     readButtonTitle = 'Preparing audio...';
// //   } else if (isPaused) {
// //     readButtonIcon = <PlayCircle size={20} />;
// //     readButtonLabel = 'Resume';
// //     readButtonTitle = 'Resume paused reading';
// //   } else if (isReading) {
// //     readButtonIcon = <PauseCircle size={20} />;
// //     readButtonLabel = 'Pause';
// //     readButtonTitle = 'Pause reading';
// //   } else if (canResume) { // Resuming from a saved character index on the page
// //     readButtonIcon = <RotateCcw size={20} />;
// //     readButtonLabel = 'Resume';
// //     readButtonTitle = 'Resume reading from last TTS position';
// //   } else { // Start fresh (from selection or page beginning)
// //     readButtonIcon = <PlayCircle size={20} />;
// //     readButtonLabel = 'Read';
// //     readButtonTitle = 'Read aloud (select text or from start of page)';
// //   }

// //   // Determine if the Stop button should be active
// //   // Active if TTS is playing, paused, or even just processing (as user might want to cancel processing)
// //   const canStopTTS = isReading || isPaused || isProcessing;

// //   return (
// //     <div className="reader-controls">
// //       <div className="nav-controls">
// //         <button
// //           onClick={onPrevious}
// //           disabled={currentPage === 0 || isProcessing}
// //           className="control-button icon-button"
// //           aria-label="Previous page"
// //           title="Previous page"
// //         >
// //           <ChevronLeft size={20} />
// //         </button>
// //         <span className="page-info">
// //           {currentPage + 1} / {totalPages}
// //         </span>
// //         <button
// //           onClick={onNext}
// //           disabled={currentPage === totalPages - 1 || isProcessing}
// //           className="control-button icon-button"
// //           aria-label="Next page"
// //           title="Next page"
// //         >
// //           <ChevronRight size={20} />
// //         </button>
// //       </div>

// //       <div className="audio-controls">
// //         <button
// //           onClick={onReadAloud}
// //           className={`control-button icon-button ${isReadButtonActive ? 'active' : ''} ${canResume ? 'can-resume' : ''} inline-flex items-center justify-center`}
// //           aria-label={readButtonTitle}
// //           title={readButtonTitle}
// //           disabled={isProcessing && !isReading && !isPaused} // Allow pause/stop if processing but already started
// //         >
// //           {readButtonIcon}
// //           <span className="button-text ml-1">{readButtonLabel}</span>
// //         </button>

// //         {/* NEW Stop Button */}
// //         {canStopTTS && ( // Only show stop button if there's something to stop
// //           <button
// //             onClick={onStopTTS}
// //             className="control-button icon-button stop-button inline-flex items-center justify-center" // Add specific class if needed
// //             aria-label="Stop TTS"
// //             title="Stop TTS and clear saved position"
// //           >
// //             <Square size={20} /> {/* Stop Icon */}
// //             <span className="button-text ml-1">Stop</span>
// //           </button>
// //         )}

// //         <button
// //           onClick={onAudiobook}
// //           className={`control-button icon-button ${isPlayModeActive ? 'active' : ''} hidden md:inline-flex items-center justify-center`}
// //           aria-label="Audiobook mode"
// //           title="Audiobook mode"
// //           disabled={isProcessing}
// //         >
// //           <Headphones size={20} />
// //           <span className="button-text ml-1">Audiobook</span>
// //         </button>
// //       </div>
// //     </div>
// //   );
// // };

// // export default Controls;


// // src/components/Reader/Controls.tsx
// import React from 'react';
// import {
//   ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2,
//   Square // Stop Icon
// } from 'lucide-react';
// import './Controls.css'; // Make sure this file exists or remove if not used

// interface ControlsProps {
//   currentPage: number;
//   totalPages: number;
//   onPrevious: () => void;
//   onNext: () => void;
//   onReadAloud: () => void;
//   onStopTTS: () => void;   // Handler for stopping TTS
//   isReading: boolean;
//   isPaused: boolean;
//   isProcessing: boolean;
//   canResume: boolean;      // For TTS character index resume
//   onAudiobook: () => void;
//   isPlayModeActive: boolean;
//   isReadButtonActive: boolean;
// }

// const Controls: React.FC<ControlsProps> = ({
//   currentPage,
//   totalPages,
//   onPrevious,
//   onNext,
//   onReadAloud,
//   onStopTTS, // Ensure this is received
//   isReading,
//   isPaused,
//   isProcessing,
//   canResume,
//   onAudiobook,
//   isPlayModeActive,
//   isReadButtonActive // This is true if isReading || isPaused || canResume
// }) => {

//   let readButtonIcon: React.ReactNode;
//   let readButtonLabel: string;
//   let readButtonTitle: string;

//   if (isProcessing && !isReading && !isPaused) { // Show loading only if processing AND not already playing/paused
//     readButtonIcon = <Loader2 size={20} className="animate-spin" />;
//     readButtonLabel = 'Loading...';
//     readButtonTitle = 'Preparing audio...';
//   } else if (isPaused) {
//     readButtonIcon = <PlayCircle size={20} />;
//     readButtonLabel = 'Resume';
//     readButtonTitle = 'Resume paused reading';
//   } else if (isReading) {
//     readButtonIcon = <PauseCircle size={20} />;
//     readButtonLabel = 'Pause';
//     readButtonTitle = 'Pause reading';
//   } else if (canResume) {
//     readButtonIcon = <RotateCcw size={20} />;
//     readButtonLabel = 'Resume';
//     readButtonTitle = 'Resume reading from last TTS position';
//   } else {
//     readButtonIcon = <PlayCircle size={20} />;
//     readButtonLabel = 'Read';
//     readButtonTitle = 'Read aloud (select text or from start of page)';
//   }

//   // Determine if the Stop button should be visible/active
//   // Show stop if TTS is playing, paused, or actively processing (even before playing starts)
//   const showStopButton = isReading || isPaused || isProcessing;

//   return (
//     <div className="reader-controls">
//       {/* --- Navigation Controls --- */}
//       <div className="nav-controls">
//         <button
//           onClick={onPrevious}
//           disabled={currentPage === 0 || isProcessing} // Disable nav while initial TTS processing too
//           className="control-button icon-button"
//           aria-label="Previous page"
//           title="Previous page"
//         >
//           <ChevronLeft size={20} />
//         </button>

//         <span className="page-info">
//           {currentPage + 1} / {totalPages}
//         </span>

//         <button
//           onClick={onNext}
//           disabled={currentPage === totalPages - 1 || isProcessing} // Disable nav while initial TTS processing too
//           className="control-button icon-button"
//           aria-label="Next page"
//           title="Next page"
//         >
//           <ChevronRight size={20} />
//         </button>
//       </div>

//       {/* --- Audio Controls --- */}
//       <div className="audio-controls">
//         {/* Read/Pause/Resume Button */}
//         <button
//           onClick={onReadAloud}
//           className={`control-button icon-button ${
//             isReadButtonActive ? 'active' : ''
//           } ${canResume ? 'can-resume' : ''} inline-flex items-center justify-center`}
//           aria-label={readButtonTitle}
//           title={readButtonTitle}
//           // Disable if processing but not yet playing/paused. Allow pause/stop if already playing/paused during processing of next chunks.
//           disabled={isProcessing && !isReading && !isPaused}
//         >
//           {readButtonIcon}
//           <span className="button-text ml-1">{readButtonLabel}</span>
//         </button>

//         {/* ++++++++++ STOP BUTTON RENDER LOGIC ++++++++++ */}
//         {showStopButton && (
//           <button
//             onClick={onStopTTS}
//             className="control-button icon-button stop-button inline-flex items-center justify-center" // Add 'stop-button' class for specific styling if needed
//             aria-label="Stop TTS"
//             title="Stop TTS and clear saved position"
//           >
//             <Square size={20} /> {/* Stop Icon */}
//             <span className="button-text ml-1">Stop</span>
//           </button>
//         )}
//         {/* +++++++++++++++++++++++++++++++++++++++++++++++ */}

//         <button
//           onClick={onAudiobook}
//           className={`control-button icon-button ${
//             isPlayModeActive ? 'active' : ''
//           } hidden md:inline-flex items-center justify-center`}
//           aria-label="Audiobook mode"
//           title="Audiobook mode"
//           disabled={isProcessing} // Also disable this if audio is processing
//         >
//           <Headphones size={20} />
//           <span className="button-text ml-1">Audiobook</span>
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Controls;



import React from 'react';
import {
  ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2, Square
} from 'lucide-react';

// Import the stylesheet. It will now handle all the appearance styling.
import './Controls.css'; 

interface ControlsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onReadAloud: () => void;
  onStopTTS: () => void;
  isReading: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  canResume: boolean;
  onAudiobook: () => void;
  isPlayModeActive: boolean;
  isReadButtonActive: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onReadAloud,
  onStopTTS,
  isReading,
  isPaused,
  isProcessing,
  canResume,
  onAudiobook,
  isPlayModeActive,
  isReadButtonActive
}) => {

  let readButtonIcon: React.ReactNode;
  let readButtonLabel: string;
  let readButtonTitle: string;

  if (isProcessing && !isReading && !isPaused) {
    readButtonIcon = <Loader2 size={20} className="animate-spin" />;
    readButtonLabel = 'Loading...';
    readButtonTitle = 'Preparing audio...';
  } else if (isPaused) {
    readButtonIcon = <PlayCircle size={20} />;
    readButtonLabel = 'Resume';
    readButtonTitle = 'Resume paused reading';
  } else if (isReading) {
    readButtonIcon = <PauseCircle size={20} />;
    readButtonLabel = 'Pause';
    readButtonTitle = 'Pause reading';
  } else if (canResume) {
    readButtonIcon = <RotateCcw size={20} />;
    readButtonLabel = 'Resume';
    readButtonTitle = 'Resume reading from last TTS position';
  } else {
    readButtonIcon = <PlayCircle size={20} />;
    readButtonLabel = 'Read';
    readButtonTitle = 'Read aloud (select text or from start of page)';
  }

  const showStopButton = isReading || isPaused || isProcessing;
  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage + 1 < totalPages;

  return (
    // This container uses Tailwind for high-level layout
    <div className="flex items-center justify-between gap-x-6">
      
      {/* Navigation Controls use Tailwind for layout */}
      <div className="flex items-center gap-x-3">
        <button
          onClick={onPrevious}
          disabled={!canGoPrev || isProcessing}
          // The className is now simple, letting the CSS file do the work
          className="control-button flex items-center gap-2 px-3 py-2"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={20} />
          <span className="button-text text-sm font-medium">Previous</span>
        </button>

        <span className="page-info px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium">
          {currentPage + 1} / {totalPages}
        </span>

        <button
          onClick={onNext}
          disabled={!canGoNext || isProcessing}
          className="control-button flex items-center gap-2 px-3 py-2"
          aria-label="Next page"
          title="Next page"
        >
          <span className="button-text text-sm font-medium">Next</span>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Audio Controls use Tailwind for layout */}
      <div className="flex items-center gap-x-3">
        {/* Read/Pause/Resume Button */}
        <button
          onClick={onReadAloud}
          className={`control-button flex items-center gap-2 px-3 py-2 ${isReadButtonActive ? 'active' : ''}`}
          aria-label={readButtonTitle}
          title={readButtonTitle}
          disabled={isProcessing && !isReading && !isPaused}
        >
          {readButtonIcon}
          <span className="button-text text-sm font-medium">{readButtonLabel}</span>
        </button>

        {/* Stop Button */}
        {showStopButton && (
          <button
            onClick={onStopTTS}
            className="control-button stop-button flex items-center gap-2 px-3 py-2"
            aria-label="Stop TTS"
            title="Stop TTS and clear saved position"
          >
            <Square size={20} />
            <span className="button-text text-sm font-medium">Stop</span>
          </button>
        )}

        {/* Audiobook Button */}
        <button
          onClick={onAudiobook}
          // We keep Tailwind's responsive classes for layout control
          className={`control-button hidden md:flex items-center gap-2 px-3 py-2 ${isPlayModeActive ? 'active' : ''}`}
          aria-label="Audiobook mode"
          title="Audiobook mode"
          disabled={isProcessing}
        >
          <Headphones size={20} />
          <span className="button-text text-sm font-medium">Audiobook</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;