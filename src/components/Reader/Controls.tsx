// // // // src/components/Reader/Controls.tsx
// // // import React from 'react';
// // // import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle } from 'lucide-react';
// // // import './Controls.css';

// // // interface ControlsProps {
// // //   currentPage: number;
// // //   totalPages: number;
// // //   onPrevious: () => void;
// // //   onNext: () => void;
// // //   onReadAloud: () => void;
// // //   isReading: boolean;
// // //   onAudiobook: () => void;
// // //   isPlayModeActive: boolean;
// // // }

// // // const Controls: React.FC<ControlsProps> = ({
// // //   currentPage,
// // //   totalPages,
// // //   onPrevious,
// // //   onNext,
// // //   onReadAloud,
// // //   isReading,
// // //   onAudiobook,
// // //   isPlayModeActive
// // // }) => {
// // //   return (
// // //     <div className="reader-controls">
// // //       <div className="nav-controls">
// // //         <button 
// // //           onClick={onPrevious} 
// // //           disabled={currentPage === 0}
// // //           className="control-button icon-button"
// // //           aria-label="Previous page"
// // //           title="Previous page"
// // //         >
// // //           <ChevronLeft size={20} />
// // //         </button>
        
// // //         <span className="page-info">
// // //           {currentPage + 1} / {totalPages}
// // //         </span>
        
// // //         <button 
// // //           onClick={onNext} 
// // //           disabled={currentPage === totalPages - 1}
// // //           className="control-button icon-button"
// // //           aria-label="Next page"
// // //           title="Next page"
// // //         >
// // //           <ChevronRight size={20} />
// // //         </button>
// // //       </div>
      
// // //       <div className="audio-controls">
// // //         <button 
// // //           onClick={onReadAloud} 
// // //           className={`control-button icon-button ${isReading ? 'active' : ''}`}
// // //           aria-label={isReading ? 'Stop reading' : 'Read aloud'}
// // //           title={isReading ? 'Stop reading' : 'Read aloud'}
// // //         >
// // //           {isReading ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
// // //           <span className="button-text">Read</span>
// // //         </button>
        
// // //         <button 
// // //           onClick={onAudiobook} 
// // //           className={`control-button icon-button ${isPlayModeActive ? 'active' : ''}`}
// // //           aria-label="Audiobook mode"
// // //           title="Audiobook mode"
// // //         >
// // //           <Headphones size={20} />
// // //           <span className="button-text">Audiobook</span>
// // //         </button>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default Controls;


// // // src/components/Reader/Controls.tsx
// // import React from 'react';
// // import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, Loader2 } from 'lucide-react'; // Added Loader2 for processing
// // import './Controls.css';

// // interface ControlsProps {
// //   currentPage: number;
// //   totalPages: number;
// //   onPrevious: () => void;
// //   onNext: () => void;
// //   onReadAloud: () => void; // This single handler now manages Read/Pause/Resume
// //   isReading: boolean;      // True when audio is actively playing
// //   isPaused: boolean;       // True when audio is paused
// //   isProcessing: boolean;   // True when audio is being fetched/prepared
// //   onAudiobook: () => void;
// //   isPlayModeActive: boolean;
// // }

// // const Controls: React.FC<ControlsProps> = ({
// //   currentPage,
// //   totalPages,
// //   onPrevious,
// //   onNext,
// //   onReadAloud,
// //   isReading,      // Currently playing sound
// //   isPaused,       // Active session, but paused
// //   isProcessing,   // Fetching/preparing audio
// //   onAudiobook,
// //   isPlayModeActive
// // }) => {

// //   // Determine the state for the Read/Pause/Resume button
// //   let readButtonIcon: React.ReactNode;
// //   let readButtonLabel: string;
// //   let readButtonTitle: string;
// //   let isReadButtonActive = isReading || isPaused; // Button is 'active' if playing or paused

// //   if (isProcessing) {
// //     readButtonIcon = <Loader2 size={20} className="animate-spin" />; // Show spinner when processing
// //     readButtonLabel = 'Loading...';
// //     readButtonTitle = 'Preparing audio...';
// //   } else if (isPaused) {
// //     readButtonIcon = <PlayCircle size={20} />; // Show Play icon to indicate Resume
// //     readButtonLabel = 'Resume';
// //     readButtonTitle = 'Resume reading';
// //   } else if (isReading) {
// //     readButtonIcon = <PauseCircle size={20} />; // Show Pause icon
// //     readButtonLabel = 'Pause';
// //     readButtonTitle = 'Pause reading';
// //   } else {
// //     readButtonIcon = <PlayCircle size={20} />; // Show Play icon to indicate Start
// //     readButtonLabel = 'Read';
// //     readButtonTitle = 'Read aloud';
// //   }

// //   return (
// //     <div className="reader-controls">
// //       {/* --- Navigation Controls (Unchanged) --- */}
// //       <div className="nav-controls">
// //         <button
// //           onClick={onPrevious}
// //           disabled={currentPage === 0}
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
// //           disabled={currentPage === totalPages - 1}
// //           className="control-button icon-button"
// //           aria-label="Next page"
// //           title="Next page"
// //         >
// //           <ChevronRight size={20} />
// //         </button>
// //       </div>

// //       {/* --- Audio Controls (Read/Pause/Resume button updated) --- */}
// //       <div className="audio-controls">
// //         <button
// //           onClick={onReadAloud} // Single handler manages the action
// //           className={`control-button icon-button ${isReadButtonActive ? 'active' : ''}`}
// //           aria-label={readButtonTitle} // Use dynamic label
// //           title={readButtonTitle}     // Use dynamic title
// //           disabled={isProcessing}     // Disable button while processing
// //         >
// //           {readButtonIcon} {/* Use dynamic icon */}
// //           <span className="button-text">{readButtonLabel}</span> {/* Use dynamic text */}
// //         </button>

// //         {/* --- Audiobook Button (Unchanged) --- */}
// //         <button
// //           onClick={onAudiobook}
// //           className={`control-button icon-button ${isPlayModeActive ? 'active' : ''}`}
// //           aria-label="Audiobook mode"
// //           title="Audiobook mode"
// //         >
// //           <Headphones size={20} />
// //           <span className="button-text">Audiobook</span>
// //         </button>
// //       </div>
// //     </div>
// //   );
// // };

// // export default Controls;


// // src/components/Reader/Controls.tsx
// import React from 'react';
// import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2 } from 'lucide-react'; // Added RotateCcw for Resume Reading, Loader2
// import './Controls.css';

// interface ControlsProps {
//   currentPage: number;
//   totalPages: number;
//   onPrevious: () => void;
//   onNext: () => void;
//   onReadAloud: () => void; // Single handler for Read/Pause/Resume/Resume Reading
//   isReading: boolean;      // Actively playing sound
//   isPaused: boolean;       // Paused mid-playback
//   isProcessing: boolean;   // Fetching/preparing audio
//   canResume: boolean;      // Indicates if saved progress exists and TTS is idle
//   onAudiobook: () => void;
//   isPlayModeActive: boolean;
// }

// const Controls: React.FC<ControlsProps> = ({
//   currentPage,
//   totalPages,
//   onPrevious,
//   onNext,
//   onReadAloud,
//   isReading,
//   isPaused,
//   isProcessing,
//   canResume, // New prop
//   onAudiobook,
//   isPlayModeActive
// }) => {

//   // Determine the state for the main audio control button
//   let readButtonIcon: React.ReactNode;
//   let readButtonLabel: string;
//   let readButtonTitle: string;
//   // Button is considered 'active' if playing, paused, OR has resumable state
//   let isReadButtonActive = isReading || isPaused || canResume;

//   if (isProcessing) {
//     readButtonIcon = <Loader2 size={20} className="animate-spin" />;
//     readButtonLabel = 'Loading...';
//     readButtonTitle = 'Preparing audio...';
//   } else if (isPaused) {
//     readButtonIcon = <PlayCircle size={20} />; // Show Play icon to indicate Resume Paused
//     readButtonLabel = 'Resume';
//     readButtonTitle = 'Resume paused reading';
//   } else if (isReading) {
//     readButtonIcon = <PauseCircle size={20} />; // Show Pause icon
//     readButtonLabel = 'Pause';
//     readButtonTitle = 'Pause reading';
//   } else if (canResume) { // --- NEW: Check for resumable state ---
//     readButtonIcon = <RotateCcw size={20} />; // Use a different icon for resuming from saved state
//     readButtonLabel = 'Resume'; // Keep label as 'Resume' for simplicity or change to 'Resume Reading'
//     readButtonTitle = 'Resume reading from last position';
//   } else {
//     readButtonIcon = <PlayCircle size={20} />; // Default: Show Play icon to indicate Start Reading
//     readButtonLabel = 'Read';
//     readButtonTitle = 'Read aloud from beginning';
//   }

//   return (
//     <div className="reader-controls">
//       {/* --- Navigation Controls (Unchanged) --- */}
//       <div className="nav-controls">
//         <button
//           onClick={onPrevious}
//           disabled={currentPage === 0 || isProcessing} // Also disable nav while processing audio
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
//           disabled={currentPage === totalPages - 1 || isProcessing} // Also disable nav while processing audio
//           className="control-button icon-button"
//           aria-label="Next page"
//           title="Next page"
//         >
//           <ChevronRight size={20} />
//         </button>
//       </div>

//       {/* --- Audio Controls (Read/Pause/Resume button updated) --- */}
//       <div className="audio-controls">
//         <button
//           onClick={onReadAloud} // Single handler manages all actions
//           // Add 'can-resume' class if needed for specific styling
//           className={`control-button icon-button ${isReadButtonActive ? 'active' : ''} ${canResume ? 'can-resume' : ''}`}
//           aria-label={readButtonTitle}
//           title={readButtonTitle}
//           disabled={isProcessing} // Disable button only while processing
//         >
//           {readButtonIcon}
//           <span className="button-text">{readButtonLabel}</span>
//         </button>

//         {/* --- Audiobook Button (Unchanged) --- */}
//         <button
//           onClick={onAudiobook}
//           className={`control-button icon-button ${isPlayModeActive ? 'active' : ''}`}
//           aria-label="Audiobook mode"
//           title="Audiobook mode"
//           disabled={isProcessing} // Also disable this if audio is processing
//         >
//           <Headphones size={20} />
//           <span className="button-text">Audiobook</span>
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Controls;


// src/components/Reader/Controls.tsx
import React from 'react';
import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2 } from 'lucide-react'; // Added RotateCcw for Resume Reading, Loader2
import './Controls.css'; // Assuming you might have some base styles here

interface ControlsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onReadAloud: () => void; // Single handler for Read/Pause/Resume/Resume Reading
  isReading: boolean;      // Actively playing sound
  isPaused: boolean;       // Paused mid-playback
  isProcessing: boolean;   // Fetching/preparing audio
  canResume: boolean;      // Indicates if saved progress exists and TTS is idle
  onAudiobook: () => void;
  isPlayModeActive: boolean;
  // Add derived prop for better className logic on the main read button
  isReadButtonActive: boolean; // Derived state: true if reading, paused, or canResume
}

const Controls: React.FC<ControlsProps> = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onReadAloud,
  isReading,
  isPaused,
  isProcessing,
  canResume, // New prop
  onAudiobook,
  isPlayModeActive,
  isReadButtonActive // Pass the derived state as a prop or calculate it here
}) => {

  // Determine the state for the main audio control button
  let readButtonIcon: React.ReactNode;
  let readButtonLabel: string;
  let readButtonTitle: string;
  // This calculation should ideally happen in the parent component and passed down
  // or calculated here if the prop isn't passed:
  // let isReadButtonActive = isReading || isPaused || canResume;

  if (isProcessing) {
    readButtonIcon = <Loader2 size={20} className="animate-spin" />;
    readButtonLabel = 'Loading...';
    readButtonTitle = 'Preparing audio...';
  } else if (isPaused) {
    readButtonIcon = <PlayCircle size={20} />; // Show Play icon to indicate Resume Paused
    readButtonLabel = 'Resume';
    readButtonTitle = 'Resume paused reading';
  } else if (isReading) {
    readButtonIcon = <PauseCircle size={20} />; // Show Pause icon
    readButtonLabel = 'Pause';
    readButtonTitle = 'Pause reading';
  } else if (canResume) { // --- NEW: Check for resumable state ---
    readButtonIcon = <RotateCcw size={20} />; // Use a different icon for resuming from saved state
    readButtonLabel = 'Resume'; // Keep label as 'Resume' for simplicity or change to 'Resume Reading'
    readButtonTitle = 'Resume reading from last position';
  } else {
    readButtonIcon = <PlayCircle size={20} />; // Default: Show Play icon to indicate Start Reading
    readButtonLabel = 'Read';
    readButtonTitle = 'Read aloud from beginning';
  }

  return (
    <div className="reader-controls"> {/* Add Tailwind classes here or in CSS if needed */}
      {/* --- Navigation Controls --- */}
      <div className="nav-controls"> {/* Add Tailwind classes here or in CSS if needed */}
        <button
          onClick={onPrevious}
          disabled={currentPage === 0 || isProcessing} // Also disable nav while processing audio
          className="control-button icon-button" // Base classes from CSS?
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="page-info"> {/* Style page info */}
          {currentPage + 1} / {totalPages}
        </span>

        <button
          onClick={onNext}
          disabled={currentPage === totalPages - 1 || isProcessing} // Also disable nav while processing audio
          className="control-button icon-button" // Base classes from CSS?
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* --- Audio Controls --- */}
      <div className="audio-controls"> {/* Add Tailwind classes here or in CSS if needed */}
        {/* Read/Pause/Resume Button */}
        <button
          onClick={onReadAloud} // Single handler manages all actions
          // Add 'can-resume' class if needed for specific CSS styling
          // Added Tailwind classes for flex layout
          className={`control-button icon-button ${isReadButtonActive ? 'active' : ''} ${canResume ? 'can-resume' : ''} inline-flex items-center justify-center`}
          aria-label={readButtonTitle}
          title={readButtonTitle}
          disabled={isProcessing} // Disable button only while processing
        >
          {readButtonIcon}
          {/* Added ml-1 for margin */}
          <span className="button-text ml-1">{readButtonLabel}</span>
        </button>

        {/* --- Audiobook Button (MODIFIED with Tailwind classes) --- */}
        <button
          onClick={onAudiobook}
          // Base classes + active state + HIDDEN on mobile + VISIBLE (inline-flex) on md screens and up
          className={`control-button icon-button ${isPlayModeActive ? 'active' : ''} hidden md:inline-flex items-center justify-center`}
          aria-label="Audiobook mode"
          title="Audiobook mode"
          disabled={isProcessing} // Also disable this if audio is processing
        >
          <Headphones size={20} />
           {/* Added ml-1 for margin */}
          <span className="button-text ml-1">Audiobook</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;