// import React, { useEffect } from "react";

// interface PlayModeProps {
//   content: string;
//   onClose: () => void;
// }

// const PlayMode: React.FC<PlayModeProps> = ({ content, onClose }) => {
//   useEffect(() => {
//     console.log("Extracted content:", content);
//   }, [content]);

//   return (
//     <div className="p-4 bg-gray-100 rounded-lg shadow-md">
//       <h2 className="text-xl font-semibold mb-2">Current Page Content</h2>
//       <div className="whitespace-pre-wrap overflow-y-auto max-h-64 border p-2">
//         {content.trim() ? (
//           content.split(/(?:\r\n|\r|\n)/g).map((line, index) => (
//             <p key={index} className="mb-2">{line}</p>
//           ))
//         ) : (
//           <p className="text-gray-500 italic">No text extracted. Try navigating to another page.</p>
//         )}
//       </div>
//       <button 
//         onClick={onClose} 
//         className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//       >
//         Close
//       </button>
//     </div>
//   );
// };

// export default PlayMode;


import React, { useEffect, useState } from "react"

interface PlayModeProps {
  content: string;
  onClose: () => void;
  renditionRef: any;  // Reference to EPUB renderer
  updateContent: () => void;  // Function to extract text again
}

const PlayMode: React.FC<PlayModeProps> = ({ content, onClose, renditionRef, updateContent }) => {
  const [currentPage, setCurrentPage] = useState(1);  // Track the page number

  // Extract text when component is mounted
  useEffect(() => {
    console.log("Extracted content:", content);
  }, [content]);

  // // Function to go to the next page
  // const nextPage = () => {
  //   if (renditionRef.current) {
  //     renditionRef.current.next().then(() => {
  //       setCurrentPage(prev => prev + 1);
  //       // updateContent(); // Re-extract text after changing the page
  //       setTimeout(updateContent, 500); // Delay extraction slightly for stability
  //     });
  //   }
  // };

  // // Function to go to the previous page
  // const prevPage = () => {
  //   if (renditionRef.current) {
  //     renditionRef.current.prev().then(() => {
  //       setCurrentPage(prev => Math.max(1, prev - 1));
  //       // updateContent(); // Re-extract text after changing the page
  //       setTimeout(updateContent, 500);
  //     });
  //   }
  // };

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-2">Current Page Content</h2>
      
      <div className="whitespace-pre-wrap overflow-y-auto max-h-64 border p-2">
        {content.trim() ? (
          content.split(/(?:\r\n|\r|\n)/g).map((line, index) => (
            <p key={index} className="mb-2">{line}</p>
          ))
        ) : (
          <p className="text-gray-500 italic">No text extracted. Try navigating to another page.</p>
        )}
      </div>

      <div className="flex justify-between mt-4">
        {/* <button 
          onClick={prevPage} 
          className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
        >
          Previous Page
        </button> */}

        <p className="text-sm text-gray-600">Page {currentPage}</p>

        {/* <button 
          onClick={nextPage} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Next Page
        </button> */}
      </div>

      <button 
        onClick={onClose} 
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Close
      </button>
    </div>
  );
};

export default PlayMode;
