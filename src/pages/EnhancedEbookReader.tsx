// // // // // // // // // "use client"

// // // // // // // // // import { useState, useRef, useCallback } from "react"
// // // // // // // // // import { ReactReader } from "react-reader"
// // // // // // // // // import { Button } from "@/components/ui/button"
// // // // // // // // // import { Input } from "@/components/ui/input"
// // // // // // // // // import { Play, X } from "lucide-react"
// // // // // // // // // // import PlayMode from '@/components/readaloud';  // Import the updated PlayMode

// // // // // // // // // import PlayMode from '@/components/PlayMode';  // Import the updated PlayMode




// // // // // // // // // export default function EnhancedEbookReader() {
// // // // // // // // //   const [book, setBook] = useState<ArrayBuffer | null>(null);
// // // // // // // // //   const [location, setLocation] = useState<string | null>(null);
// // // // // // // // //   const [isPlayMode, setIsPlayMode] = useState<boolean>(false);
// // // // // // // // //   const [currentPageContent, setCurrentPageContent] = useState<string>("");
// // // // // // // // //   const renditionRef = useRef<any>(null); // Reference to EPUB renderer

// // // // // // // // //   // Handle EPUB file upload
// // // // // // // // //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // // // // // // //     const file = event.target.files?.[0];
// // // // // // // // //     if (file) {
// // // // // // // // //       const reader = new FileReader();
// // // // // // // // //       reader.onload = (e: ProgressEvent<FileReader>) => {
// // // // // // // // //         const result = e.target?.result;
// // // // // // // // //         if (result) {
// // // // // // // // //           setBook(result as ArrayBuffer);
// // // // // // // // //         }
// // // // // // // // //       };
// // // // // // // // //       reader.readAsArrayBuffer(file);
// // // // // // // // //     }
// // // // // // // // //   };


// // // // // // // // //   const extractText = () => {
// // // // // // // // //     if (!renditionRef.current || !renditionRef.current.location) return;
  
// // // // // // // // //     const { start } = renditionRef.current.location;
// // // // // // // // //     if (start?.cfi) {
// // // // // // // // //       setTimeout(() => {
// // // // // // // // //         renditionRef.current.book
// // // // // // // // //           .getRange(start.cfi)
// // // // // // // // //           .then((range: Range | null) => {
// // // // // // // // //             if (range) {
// // // // // // // // //               console.log("Extracted Text:", range.toString());
// // // // // // // // //               setCurrentPageContent(prevContent => prevContent || range.toString());
// // // // // // // // //             } else {
// // // // // // // // //               setCurrentPageContent(prevContent => prevContent || "Text extraction failed.");
// // // // // // // // //             }
// // // // // // // // //           })
// // // // // // // // //           .catch((error: unknown) => {
// // // // // // // // //             console.error("Error getting range:", error);
// // // // // // // // //             setCurrentPageContent(prevContent => prevContent || "Error extracting text.");
// // // // // // // // //           });
// // // // // // // // //       }, 700);
// // // // // // // // //     }
// // // // // // // // //   };
  
  
// // // // // // // // //   // Store EPUB rendering instance
// // // // // // // // //   const getRendition = useCallback((rendition: any) => {
// // // // // // // // //     renditionRef.current = rendition;

// // // // // // // // //     rendition.hooks.content.register((contents: any) => {
// // // // // // // // //       setTimeout(() => {
// // // // // // // // //         const extractedText = contents.document.body.innerText.trim();
// // // // // // // // //         setCurrentPageContent(extractedText || "No text found on this page.");
// // // // // // // // //       }, 500);
// // // // // // // // //     });

// // // // // // // // //     rendition.on("locationChanged", locationChanged);
// // // // // // // // //   }, []);



// // // // // // // // //   const togglePlayMode = () => {
// // // // // // // // //     setIsPlayMode((prev) => {
// // // // // // // // //       if (!prev) {
// // // // // // // // //         extractText(); // Extract text when opening PlayMode
// // // // // // // // //       }
// // // // // // // // //       return !prev;
// // // // // // // // //     });
// // // // // // // // //   };


// // // // // // // // //   const locationChanged = (epubcifi: any) => {
// // // // // // // // //       if (typeof epubcifi === "string") {
// // // // // // // // //         setLocation(epubcifi);
// // // // // // // // //         extractText();
// // // // // // // // //       } else {
// // // // // // // // //         console.warn("Unexpected location format:", epubcifi);
// // // // // // // // //       }
// // // // // // // // //     };
    
  

// // // // // // // // //   return (
// // // // // // // // //     <div className="container mx-auto p-4">
// // // // // // // // //       <h1 className="text-2xl font-bold mb-4">Enhanced Ebook Reader</h1>
// // // // // // // // //       <Input type="file" accept=".epub" onChange={handleFileUpload} className="mb-4" />

// // // // // // // // //       {book && (
// // // // // // // // //         <div className="relative mb-4 h-[600px]">
// // // // // // // // //           <ReactReader 
// // // // // // // // //             url={book} 
// // // // // // // // //             location={location} 
// // // // // // // // //             getRendition={getRendition} 
// // // // // // // // //             locationChanged={locationChanged} 
// // // // // // // // //           />
// // // // // // // // //           {isPlayMode && (
// // // // // // // // //           // The overlay now only covers the ebook section.
// // // // // // // // //         <div className="absolute inset-0 bg-black bg-opacity-75 z-10">
// // // // // // // // //           <PlayMode 
// // // // // // // // //             currentPageContent={currentPageContent} // Rename 'content' to 'currentPageContent'
// // // // // // // // //             onClose={() => setIsPlayMode(false)} 
// // // // // // // // //             extractText={extractText} // Rename 'updateContent' to 'extractText'
// // // // // // // // //           />
// // // // // // // // //           </div>
// // // // // // // // //         )
      
// // // // // // // // //       }
// // // // // // // // //         </div>
// // // // // // // // //       )}

// // // // // // // // //       <div className="mb-4">
// // // // // // // // //         <Button onClick={togglePlayMode} className="mr-2" disabled={!book || !renditionRef.current}>
// // // // // // // // //           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// // // // // // // // //           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// // // // // // // // //         </Button>
// // // // // // // // //       </div>

// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // }



// // // // // // // // "use client"

// // // // // // // // import { useState, useRef, useCallback } from "react"
// // // // // // // // import { ReactReader } from "react-reader"
// // // // // // // // import { Button } from "@/components/ui/button"
// // // // // // // // import { Input } from "@/components/ui/input"
// // // // // // // // import { Play, X } from "lucide-react"
// // // // // // // // import PlayMode from "@/components/PlayMode"
// // // // // // // // // EnhancedEbookReader.tsx (excerpt)
// // // // // // // // import DefinitionSidebar from "@/components/DefinitionSidebar"

// // // // // // // // export default function EnhancedEbookReader() {
// // // // // // // //   const [book, setBook] = useState<ArrayBuffer | null>(null)
// // // // // // // //   const [location, setLocation] = useState<string | null>(null)
// // // // // // // //   const [isPlayMode, setIsPlayMode] = useState<boolean>(false)
// // // // // // // //   const [currentPageContent, setCurrentPageContent] = useState<string>("")
// // // // // // // //   const renditionRef = useRef<any>(null) // Reference to EPUB renderer

// // // // // // // //   // Handle EPUB file upload
// // // // // // // //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // // // // // //     const file = event.target.files?.[0]
// // // // // // // //     if (file) {
// // // // // // // //       const reader = new FileReader()
// // // // // // // //       reader.onload = (e: ProgressEvent<FileReader>) => {
// // // // // // // //         const result = e.target?.result
// // // // // // // //         if (result) {
// // // // // // // //           setBook(result as ArrayBuffer)
// // // // // // // //         }
// // // // // // // //       }
// // // // // // // //       reader.readAsArrayBuffer(file)
// // // // // // // //     }
// // // // // // // //   }

// // // // // // // //   const extractText = () => {
// // // // // // // //     if (!renditionRef.current || !renditionRef.current.location) return

// // // // // // // //     const { start } = renditionRef.current.location
// // // // // // // //     if (start?.cfi) {
// // // // // // // //       setTimeout(() => {
// // // // // // // //         renditionRef.current.book
// // // // // // // //           .getRange(start.cfi)
// // // // // // // //           .then((range: Range | null) => {
// // // // // // // //             if (range) {
// // // // // // // //               console.log("Extracted Text:", range.toString())
// // // // // // // //               setCurrentPageContent(prevContent => prevContent || range.toString())
// // // // // // // //             } else {
// // // // // // // //               setCurrentPageContent(prevContent => prevContent || "Text extraction failed.")
// // // // // // // //             }
// // // // // // // //           })
// // // // // // // //           .catch((error: unknown) => {
// // // // // // // //             console.error("Error getting range:", error)
// // // // // // // //             setCurrentPageContent(prevContent => prevContent || "Error extracting text.")
// // // // // // // //           })
// // // // // // // //       }, 700)
// // // // // // // //     }
// // // // // // // //   }

// // // // // // // //   // Store EPUB rendering instance
// // // // // // // //   const getRendition = useCallback((rendition: any) => {
// // // // // // // //     renditionRef.current = rendition

// // // // // // // //     rendition.hooks.content.register((contents: any) => {
// // // // // // // //       setTimeout(() => {
// // // // // // // //         const extractedText = contents.document.body.innerText.trim()
// // // // // // // //         setCurrentPageContent(extractedText || "No text found on this page.")
// // // // // // // //       }, 500)
// // // // // // // //     })

// // // // // // // //     rendition.on("locationChanged", locationChanged)
// // // // // // // //   }, [])

// // // // // // // //   const locationChanged = (epubcifi: any) => {
// // // // // // // //     if (typeof epubcifi === "string") {
// // // // // // // //       setLocation(epubcifi)
// // // // // // // //       extractText()
// // // // // // // //     } else {
// // // // // // // //       console.warn("Unexpected location format:", epubcifi)
// // // // // // // //     }
// // // // // // // //   }

// // // // // // // //   const togglePlayMode = () => {
// // // // // // // //     setIsPlayMode((prev) => {
// // // // // // // //       if (!prev) {
// // // // // // // //         extractText() // Extract text when opening PlayMode
// // // // // // // //       }
// // // // // // // //       return !prev
// // // // // // // //     })
// // // // // // // //   }

// // // // // // // //   // return (
// // // // // // // //   //   <div className="container mx-auto p-4 ">
// // // // // // // //   //     {/* <h1 className="text-2xl font-bold mb-4">Enhanced Ebook Reader</h1> */}
// // // // // // // //   //     <Input 
// // // // // // // //   //       type="file" 
// // // // // // // //   //       accept=".epub" 
// // // // // // // //   //       onChange={handleFileUpload} 
// // // // // // // //   //       className="mb-4"
// // // // // // // //   //     />


// // // // // // // //   //   {book ? (
// // // // // // // //   //     <div className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900">
// // // // // // // //   //       <ReactReader 
// // // // // // // //   //         url={book} 
// // // // // // // //   //         location={location} 
// // // // // // // //   //         getRendition={getRendition} 
// // // // // // // //   //         locationChanged={locationChanged} 
// // // // // // // //   //       />
// // // // // // // //   //       {isPlayMode && (
// // // // // // // //   //         // Overlay covers only the reader section
// // // // // // // //   //         <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
// // // // // // // //   //           <PlayMode 
// // // // // // // //   //             currentPageContent={currentPageContent}
// // // // // // // //   //             onClose={() => setIsPlayMode(false)}
// // // // // // // //   //             extractText={extractText}
// // // // // // // //   //           />
// // // // // // // //   //         </div>
// // // // // // // //   //       )}
// // // // // // // //   //     </div>
// // // // // // // //   //   ) : (
// // // // // // // //   //     <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// // // // // // // //   //       Please upload an EPUB file to get started.
// // // // // // // //   //     </p>
// // // // // // // //   //   )}


// // // // // // // //   //     <div className="mb-4">
// // // // // // // //   //       <Button 
// // // // // // // //   //         onClick={togglePlayMode} 
// // // // // // // //   //         className="mr-2" 
// // // // // // // //   //         disabled={!book || !renditionRef.current}
// // // // // // // //   //       >
// // // // // // // //   //         {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// // // // // // // //   //         {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// // // // // // // //   //       </Button>
// // // // // // // //   //     </div>
// // // // // // // //   //   </div>
// // // // // // // //   // )



// // // // // // // //   return (
// // // // // // // //     <div className="container mx-auto p-4">
// // // // // // // //       <Input 
// // // // // // // //         type="file" 
// // // // // // // //         accept=".epub" 
// // // // // // // //         onChange={handleFileUpload} 
// // // // // // // //         className="mb-4"
// // // // // // // //       />
  
// // // // // // // //       {book ? (
// // // // // // // //         <div className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900">
// // // // // // // //           <ReactReader 
// // // // // // // //             url={book} 
// // // // // // // //             location={location} 
// // // // // // // //             getRendition={getRendition} 
// // // // // // // //             locationChanged={locationChanged} 
// // // // // // // //           />
// // // // // // // //           {isPlayMode && (
// // // // // // // //             <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
// // // // // // // //               <PlayMode 
// // // // // // // //                 currentPageContent={currentPageContent}
// // // // // // // //                 onClose={() => setIsPlayMode(false)}
// // // // // // // //                 extractText={extractText}
// // // // // // // //               />
// // // // // // // //             </div>
// // // // // // // //           )}
// // // // // // // //         </div>
// // // // // // // //       ) : (
// // // // // // // //         <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// // // // // // // //           Please upload an EPUB file to get started.
// // // // // // // //         </p>
// // // // // // // //       )}
  
// // // // // // // //       <div className="flex justify-between items-center">
// // // // // // // //         <Button 
// // // // // // // //           onClick={togglePlayMode} 
// // // // // // // //           className="mr-2" 
// // // // // // // //           disabled={!book || !renditionRef.current}
// // // // // // // //         >
// // // // // // // //           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// // // // // // // //           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// // // // // // // //         </Button>
  
// // // // // // // //         {/* Pass the onToggleSidebar callback to trigger a resize after toggling the sidebar */}
// // // // // // // //         <DefinitionSidebar onToggleSidebar={() => {
// // // // // // // //           // Delay to match the sidebar transition duration (300ms)
// // // // // // // //           setTimeout(() => {
// // // // // // // //             renditionRef.current?.resize()
// // // // // // // //           }, 300)
// // // // // // // //         }} />
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   )

// // // // // // // // }



// // // // // // // // EnhancedEbookReader.tsx
// // // // // // // "use client"

// // // // // // // import { useState, useRef, useCallback } from "react"
// // // // // // // import { ReactReader } from "react-reader"
// // // // // // // import { Button } from "@/components/ui/button"
// // // // // // // import { Input } from "@/components/ui/input"
// // // // // // // import { Play, X } from "lucide-react"
// // // // // // // import PlayMode from "@/components/PlayMode"
// // // // // // // import DefinitionSidebar from "@/components/DefinitionSidebar"

// // // // // // // export default function EnhancedEbookReader() {
// // // // // // //   const [book, setBook] = useState<ArrayBuffer | null>(null)
// // // // // // //   const [location, setLocation] = useState<string | null>(null)
// // // // // // //   const [isPlayMode, setIsPlayMode] = useState<boolean>(false)
// // // // // // //   const [currentPageContent, setCurrentPageContent] = useState<string>("")
// // // // // // //   const renditionRef = useRef<any>(null) // Reference to EPUB renderer

// // // // // // //   // Handle EPUB file upload
// // // // // // //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // // // // //     const file = event.target.files?.[0]
// // // // // // //     if (file) {
// // // // // // //       const reader = new FileReader()
// // // // // // //       reader.onload = (e: ProgressEvent<FileReader>) => {
// // // // // // //         const result = e.target?.result
// // // // // // //         if (result) {
// // // // // // //           setBook(result as ArrayBuffer)
// // // // // // //         }
// // // // // // //       }
// // // // // // //       reader.readAsArrayBuffer(file)
// // // // // // //     }
// // // // // // //   }

// // // // // // //   const extractText = () => {
// // // // // // //     if (!renditionRef.current || !renditionRef.current.location) return

// // // // // // //     const { start } = renditionRef.current.location
// // // // // // //     if (start?.cfi) {
// // // // // // //       setTimeout(() => {
// // // // // // //         renditionRef.current.book
// // // // // // //           .getRange(start.cfi)
// // // // // // //           .then((range: Range | null) => {
// // // // // // //             if (range) {
// // // // // // //               console.log("Extracted Text:", range.toString())
// // // // // // //               setCurrentPageContent(prevContent => prevContent || range.toString())
// // // // // // //             } else {
// // // // // // //               setCurrentPageContent(prevContent => prevContent || "Text extraction failed.")
// // // // // // //             }
// // // // // // //           })
// // // // // // //           .catch((error: unknown) => {
// // // // // // //             console.error("Error getting range:", error)
// // // // // // //             setCurrentPageContent(prevContent => prevContent || "Error extracting text.")
// // // // // // //           })
// // // // // // //       }, 700)
// // // // // // //     }
// // // // // // //   }

// // // // // // //   // Store EPUB rendering instance
// // // // // // //   const getRendition = useCallback((rendition: any) => {
// // // // // // //     renditionRef.current = rendition

// // // // // // //     rendition.hooks.content.register((contents: any) => {
// // // // // // //       setTimeout(() => {
// // // // // // //         const extractedText = contents.document.body.innerText.trim()
// // // // // // //         setCurrentPageContent(extractedText || "No text found on this page.")
// // // // // // //       }, 500)
// // // // // // //     })

// // // // // // //     rendition.on("locationChanged", locationChanged)
// // // // // // //   }, [])

// // // // // // //   const locationChanged = (epubcifi: any) => {
// // // // // // //     if (typeof epubcifi === "string") {
// // // // // // //       setLocation(epubcifi)
// // // // // // //       extractText()
// // // // // // //     } else {
// // // // // // //       console.warn("Unexpected location format:", epubcifi)
// // // // // // //     }
// // // // // // //   }

// // // // // // //   const togglePlayMode = () => {
// // // // // // //     setIsPlayMode((prev) => {
// // // // // // //       if (!prev) {
// // // // // // //         extractText() // Extract text when opening PlayMode
// // // // // // //       }
// // // // // // //       return !prev
// // // // // // //     })
// // // // // // //   }

// // // // // // //   return (
// // // // // // //     <div className="w-full p-4">
// // // // // // //       <Input 
// // // // // // //         type="file" 
// // // // // // //         accept=".epub" 
// // // // // // //         onChange={handleFileUpload} 
// // // // // // //         className="mb-4"
// // // // // // //       />
// // // // // // //       {book ? (
// // // // // // //         <div className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full">
// // // // // // //           <ReactReader 
// // // // // // //             url={book} 
// // // // // // //             location={location} 
// // // // // // //             getRendition={getRendition} 
// // // // // // //             locationChanged={locationChanged} 
// // // // // // //           />
// // // // // // //           {isPlayMode && (
// // // // // // //             <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
// // // // // // //               <PlayMode 
// // // // // // //                 currentPageContent={currentPageContent}
// // // // // // //                 onClose={() => setIsPlayMode(false)}
// // // // // // //                 extractText={extractText}
// // // // // // //               />
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       ) : (
// // // // // // //         <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// // // // // // //           Please upload an EPUB file to get started.
// // // // // // //         </p>
// // // // // // //       )}
// // // // // // //       <div className="mb-4">
// // // // // // //         <Button 
// // // // // // //           onClick={togglePlayMode} 
// // // // // // //           className="mr-2" 
// // // // // // //           disabled={!book || !renditionRef.current}
// // // // // // //         >
// // // // // // //           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// // // // // // //           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// // // // // // //         </Button>
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // }




// // // // // // EnhancedEbookReader.tsx
// // // // // "use client"

// // // // // import { useState, useRef, useCallback, useEffect } from "react"
// // // // // import { ReactReader } from "react-reader"
// // // // // import { Button } from "@/components/ui/button"
// // // // // import { Input } from "@/components/ui/input"
// // // // // import { Play, X } from "lucide-react"
// // // // // import PlayMode from "@/components/PlayMode"
// // // // // import DefinitionSidebar from "@/components/DefinitionSidebar"
// // // // // import { useTheme } from "next-themes"

// // // // // export default function EnhancedEbookReader() {
// // // // //   const { theme } = useTheme()
// // // // //   const [book, setBook] = useState<ArrayBuffer | null>(null)
// // // // //   const [location, setLocation] = useState<string | null>(null)
// // // // //   const [isPlayMode, setIsPlayMode] = useState<boolean>(false)
// // // // //   const [currentPageContent, setCurrentPageContent] = useState<string>("")
// // // // //   const renditionRef = useRef<any>(null) // Reference to EPUB renderer

// // // // //   // Handle EPUB file upload
// // // // //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // // //     const file = event.target.files?.[0]
// // // // //     if (file) {
// // // // //       const reader = new FileReader()
// // // // //       reader.onload = (e: ProgressEvent<FileReader>) => {
// // // // //         const result = e.target?.result
// // // // //         if (result) {
// // // // //           setBook(result as ArrayBuffer)
// // // // //         }
// // // // //       }
// // // // //       reader.readAsArrayBuffer(file)
// // // // //     }
// // // // //   }

// // // // //   const extractText = () => {
// // // // //     if (!renditionRef.current || !renditionRef.current.location) return

// // // // //     const { start } = renditionRef.current.location
// // // // //     if (start?.cfi) {
// // // // //       setTimeout(() => {
// // // // //         renditionRef.current.book
// // // // //           .getRange(start.cfi)
// // // // //           .then((range: Range | null) => {
// // // // //             if (range) {
// // // // //               console.log("Extracted Text:", range.toString())
// // // // //               setCurrentPageContent(prevContent => prevContent || range.toString())
// // // // //             } else {
// // // // //               setCurrentPageContent(prevContent => prevContent || "Text extraction failed.")
// // // // //             }
// // // // //           })
// // // // //           .catch((error: unknown) => {
// // // // //             console.error("Error getting range:", error)
// // // // //             setCurrentPageContent(prevContent => prevContent || "Error extracting text.")
// // // // //           })
// // // // //       }, 700)
// // // // //     }
// // // // //   }

// // // // //   // Store EPUB rendering instance and inject CSS based on theme
// // // // //   const getRendition = useCallback((rendition: any) => {
// // // // //     renditionRef.current = rendition

// // // // //     // Inject custom CSS into the epub content based on the active theme.
// // // // //     rendition.hooks.content.register((contents: any) => {
// // // // //       const styleEl = contents.document.createElement("style")
// // // // //       if (theme === "dark") {
// // // // //         // Softer dark mode styling:
// // // // //         styleEl.innerHTML = `
// // // // //           body {
// // // // //             background-color: #2c2c2c !important;
// // // // //             color: #dcdcdc !important;
// // // // //           }
// // // // //           a {
// // // // //             color: #82aaff !important;
// // // // //           }
// // // // //         `
// // // // //       } else {
// // // // //         // Light mode styling:
// // // // //         styleEl.innerHTML = `
// // // // //           body {
// // // // //             background-color: #ffffff !important;
// // // // //             color: #000000 !important;
// // // // //           }
// // // // //           a {
// // // // //             color: #0070f3 !important;
// // // // //           }
// // // // //         `
// // // // //       }
// // // // //       contents.document.head.appendChild(styleEl)

// // // // //       // Extract text from the content after a short delay
// // // // //       setTimeout(() => {
// // // // //         const extractedText = contents.document.body.innerText.trim()
// // // // //         setCurrentPageContent(extractedText || "No text found on this page.")
// // // // //       }, 500)
// // // // //     })

// // // // //     rendition.on("locationChanged", locationChanged)
// // // // //   }, [theme])

// // // // //   const locationChanged = (epubcifi: any) => {
// // // // //     if (typeof epubcifi === "string") {
// // // // //       setLocation(epubcifi)
// // // // //       extractText()
// // // // //     } else {
// // // // //       console.warn("Unexpected location format:", epubcifi)
// // // // //     }
// // // // //   }

// // // // //   const togglePlayMode = () => {
// // // // //     setIsPlayMode((prev) => {
// // // // //       if (!prev) {
// // // // //         extractText() // Extract text when opening PlayMode
// // // // //       }
// // // // //       return !prev
// // // // //     })
// // // // //   }
  
  
// // // // //   return (
// // // // //     <div className="w-full p-4">
// // // // //       <Input 
// // // // //         type="file" 
// // // // //         accept=".epub" 
// // // // //         onChange={handleFileUpload} 
// // // // //         className="mb-4"
// // // // //       />
// // // // //       {book ? (
// // // // //         <div className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full">
// // // // //           <ReactReader 
// // // // //             url={book} 
// // // // //             location={location} 
// // // // //             getRendition={getRendition} 
// // // // //             locationChanged={locationChanged} 
// // // // //           />
// // // // //           {isPlayMode && (
// // // // //             <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
// // // // //               <PlayMode 
// // // // //                 currentPageContent={currentPageContent}
// // // // //                 onClose={() => setIsPlayMode(false)}
// // // // //                 extractText={extractText}
// // // // //               />
// // // // //             </div>
// // // // //           )}
// // // // //         </div>
// // // // //       ) : (
// // // // //         <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// // // // //           Please upload an EPUB file to get started.
// // // // //         </p>
// // // // //       )}
// // // // //       <div className="mb-4">
// // // // //         <Button 
// // // // //           onClick={togglePlayMode} 
// // // // //           className="mr-2" 
// // // // //           disabled={!book || !renditionRef.current}
// // // // //         >
// // // // //           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// // // // //           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// // // // //         </Button>
// // // // //       </div>
// // // // //     </div>
// // // // //   )
// // // // // }





// // // // // EnhancedEbookReader.tsx
// // // // "use client"

// // // // import { useState, useRef, useCallback, useEffect } from "react"
// // // // import { ReactReader } from "react-reader"
// // // // import { Button } from "@/components/ui/button"
// // // // import { Input } from "@/components/ui/input"
// // // // import { Play, X } from "lucide-react"
// // // // import PlayMode from "@/components/PlayMode"
// // // // import DefinitionSidebar from "@/components/DefinitionSidebar"
// // // // import { useTheme } from "next-themes"

// // // // export default function EnhancedEbookReader() {
// // // //   const { theme } = useTheme()
// // // //   const [book, setBook] = useState<ArrayBuffer | null>(null)
// // // //   const [location, setLocation] = useState<string | null>(null)
// // // //   const [isPlayMode, setIsPlayMode] = useState<boolean>(false)
// // // //   const [currentPageContent, setCurrentPageContent] = useState<string>("")
// // // //   const renditionRef = useRef<any>(null) // Reference to EPUB renderer

// // // //   // Handle EPUB file upload
// // // //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // //     const file = event.target.files?.[0]
// // // //     if (file) {
// // // //       const reader = new FileReader()
// // // //       reader.onload = (e: ProgressEvent<FileReader>) => {
// // // //         const result = e.target?.result
// // // //         if (result) {
// // // //           setBook(result as ArrayBuffer)
// // // //         }
// // // //       }
// // // //       reader.readAsArrayBuffer(file)
// // // //     }
// // // //   }

// // // //   const extractText = () => {
// // // //     if (!renditionRef.current || !renditionRef.current.location) return

// // // //     const { start } = renditionRef.current.location
// // // //     if (start?.cfi) {
// // // //       setTimeout(() => {
// // // //         renditionRef.current.book
// // // //           .getRange(start.cfi)
// // // //           .then((range: Range | null) => {
// // // //             if (range) {
// // // //               console.log("Extracted Text:", range.toString())
// // // //               setCurrentPageContent(prevContent => prevContent || range.toString())
// // // //             } else {
// // // //               setCurrentPageContent(prevContent => prevContent || "Text extraction failed.")
// // // //             }
// // // //           })
// // // //           .catch((error: unknown) => {
// // // //             console.error("Error getting range:", error)
// // // //             setCurrentPageContent(prevContent => prevContent || "Error extracting text.")
// // // //           })
// // // //       }, 700)
// // // //     }
// // // //   }

// // // //   // Store EPUB rendering instance and inject CSS based on theme
// // // //   const getRendition = useCallback((rendition: any) => {
// // // //     renditionRef.current = rendition

// // // //     // Inject custom CSS into the epub content based on the active theme.
// // // //     rendition.hooks.content.register((contents: any) => {
// // // //       const styleEl = contents.document.createElement("style")
// // // //       if (theme === "dark") {
// // // //         // Softer dark mode styling:
// // // //         styleEl.innerHTML = `
// // // //           body {
// // // //             background-color: #2c2c2c !important;
// // // //             color: #dcdcdc !important;
// // // //           }
// // // //           a {
// // // //             color: #82aaff !important;
// // // //           }
// // // //         `
// // // //       } else {
// // // //         // Light mode styling:
// // // //         styleEl.innerHTML = `
// // // //           body {
// // // //             background-color: #ffffff !important;
// // // //             color: #000000 !important;
// // // //           }
// // // //           a {
// // // //             color: #0070f3 !important;
// // // //           }
// // // //         `
// // // //       }
// // // //       contents.document.head.appendChild(styleEl)

// // // //       // Extract text from the content after a short delay
// // // //       setTimeout(() => {
// // // //         const extractedText = contents.document.body.innerText.trim()
// // // //         setCurrentPageContent(extractedText || "No text found on this page.")
// // // //       }, 500)
// // // //     })

// // // //     rendition.on("locationChanged", locationChanged)
// // // //   }, [theme])

// // // //   const locationChanged = (epubcifi: any) => {
// // // //     if (typeof epubcifi === "string") {
// // // //       setLocation(epubcifi)
// // // //       extractText()
// // // //     } else {
// // // //       console.warn("Unexpected location format:", epubcifi)
// // // //     }
// // // //   }

// // // //   const togglePlayMode = () => {
// // // //     setIsPlayMode((prev) => {
// // // //       if (!prev) {
// // // //         extractText() // Extract text when opening PlayMode
// // // //       }
// // // //       return !prev
// // // //     })
// // // //   }
  
// // // //   // Add global keyboard event listener for navigation
// // // //   useEffect(() => {
// // // //     const handleKeyDown = (e: KeyboardEvent) => {
// // // //       // Do nothing if no reader is available or PlayMode overlay is active.
// // // //       if (!renditionRef.current || isPlayMode) return

// // // //       if (e.key === "ArrowRight") {
// // // //         renditionRef.current.next()
// // // //       } else if (e.key === "ArrowLeft") {
// // // //         renditionRef.current.prev()
// // // //       }
// // // //     }
// // // //     window.addEventListener("keydown", handleKeyDown)
// // // //     return () => window.removeEventListener("keydown", handleKeyDown)
// // // //   }, [isPlayMode])
  
// // // //   return (
// // // //     <div className="w-full p-4">
// // // //       <Input 
// // // //         type="file" 
// // // //         accept=".epub" 
// // // //         onChange={handleFileUpload} 
// // // //         className="mb-4"
// // // //       />
// // // //       {book ? (
// // // //         <div className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full">
// // // //           <ReactReader 
// // // //             url={book} 
// // // //             location={location} 
// // // //             getRendition={getRendition} 
// // // //             locationChanged={locationChanged} 
// // // //           />
// // // //           {isPlayMode && (
// // // //             <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
// // // //               <PlayMode 
// // // //                 currentPageContent={currentPageContent}
// // // //                 onClose={() => setIsPlayMode(false)}
// // // //                 extractText={extractText}
// // // //               />
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       ) : (
// // // //         <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// // // //           Please upload an EPUB file to get started.
// // // //         </p>
// // // //       )}
// // // //       <div className="mb-4">
// // // //         <Button 
// // // //           onClick={togglePlayMode} 
// // // //           className="mr-2" 
// // // //           disabled={!book || !renditionRef.current}
// // // //         >
// // // //           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// // // //           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// // // //         </Button>
// // // //       </div>
// // // //     </div>
// // // //   )
// // // // }




// // // // // EnhancedEbookReader.tsx
// // // // "use client"

// // // // import { useState, useRef, useCallback, useEffect } from "react"
// // // // import { ReactReader } from "react-reader"
// // // // import { Button } from "@/components/ui/button"
// // // // import { Input } from "@/components/ui/input"
// // // // import { Play, X } from "lucide-react"
// // // // import PlayMode from "@/components/PlayMode"
// // // // import DefinitionSidebar from "@/components/DefinitionSidebar"
// // // // import { useTheme } from "next-themes"

// // // // export default function EnhancedEbookReader() {
// // // //   const { theme } = useTheme()
// // // //   const [book, setBook] = useState<ArrayBuffer | null>(null)
// // // //   const [location, setLocation] = useState<string | null>(null)
// // // //   const [isPlayMode, setIsPlayMode] = useState<boolean>(false)
// // // //   const [currentPageContent, setCurrentPageContent] = useState<string>("")
// // // //   const renditionRef = useRef<any>(null) // Reference to EPUB renderer

// // // //   // Handle EPUB file upload
// // // //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // //     const file = event.target.files?.[0]
// // // //     if (file) {
// // // //       const reader = new FileReader()
// // // //       reader.onload = (e: ProgressEvent<FileReader>) => {
// // // //         const result = e.target?.result
// // // //         if (result) {
// // // //           setBook(result as ArrayBuffer)
// // // //         }
// // // //       }
// // // //       reader.readAsArrayBuffer(file)
// // // //     }
// // // //   }

// // // //   const extractText = () => {
// // // //     if (!renditionRef.current || !renditionRef.current.location) return

// // // //     const { start } = renditionRef.current.location
// // // //     if (start?.cfi) {
// // // //       setTimeout(() => {
// // // //         renditionRef.current.book
// // // //           .getRange(start.cfi)
// // // //           .then((range: Range | null) => {
// // // //             if (range) {
// // // //               console.log("Extracted Text:", range.toString())
// // // //               setCurrentPageContent(prevContent => prevContent || range.toString())
// // // //             } else {
// // // //               setCurrentPageContent(prevContent => prevContent || "Text extraction failed.")
// // // //             }
// // // //           })
// // // //           .catch((error: unknown) => {
// // // //             console.error("Error getting range:", error)
// // // //             setCurrentPageContent(prevContent => prevContent || "Error extracting text.")
// // // //           })
// // // //       }, 700)
// // // //     }
// // // //   }

// // // //   // Helper function: Determines if we're on the cover page.
// // // //   // This heuristic checks whether the first spine item is non-linear.
// // // //   const isOnCover = () => {
// // // //     if (!renditionRef.current || !renditionRef.current.book || !renditionRef.current.location) return false;
// // // //     const spineItems = renditionRef.current.book.spine?.spineItems;
// // // //     if (!spineItems || spineItems.length === 0) return false;
// // // //     const firstSpine = spineItems[0];
// // // //     // Many EPUBs mark the cover as non-linear.
// // // //     return firstSpine && firstSpine.linear === "no";
// // // //   }

// // // //   // Store EPUB rendering instance, inject CSS, and auto-skip cover if needed
// // // //   const getRendition = useCallback((rendition: any) => {
// // // //     renditionRef.current = rendition

// // // //     // Inject custom CSS into the epub content based on the active theme.
// // // //     rendition.hooks.content.register((contents: any) => {
// // // //       const styleEl = contents.document.createElement("style")
// // // //       if (theme === "dark") {
// // // //         // Dark mode styling:
// // // //         styleEl.innerHTML = `
// // // //           body {
// // // //             background-color: #2c2c2c !important;
// // // //             color: #dcdcdc !important;
// // // //           }
// // // //           a {
// // // //             color: #82aaff !important;
// // // //           }
// // // //         `
// // // //       } else {
// // // //         // Light mode styling:
// // // //         styleEl.innerHTML = `
// // // //           body {
// // // //             background-color: #ffffff !important;
// // // //             color: #000000 !important;
// // // //           }
// // // //           a {
// // // //             color: #0070f3 !important;
// // // //           }
// // // //         `
// // // //       }
// // // //       contents.document.head.appendChild(styleEl)

// // // //       // Extract text from the content after a short delay
// // // //       setTimeout(() => {
// // // //         const extractedText = contents.document.body.innerText.trim()
// // // //         setCurrentPageContent(extractedText || "No text found on this page.")
// // // //       }, 500)
// // // //     })

// // // //     rendition.on("locationChanged", locationChanged)

// // // //     // After a delay (allowing the cover to render), check if we are on the cover.
// // // //     // If so, call next() to skip it.
// // // //     setTimeout(() => {
// // // //       if (isOnCover()) {
// // // //         rendition.next()
// // // //       }
// // // //     }, 1000) // Adjust this delay as needed
// // // //   }, [theme])

// // // //   const locationChanged = (epubcifi: any) => {
// // // //     if (typeof epubcifi === "string") {
// // // //       setLocation(epubcifi)
// // // //       extractText()
// // // //     } else {
// // // //       console.warn("Unexpected location format:", epubcifi)
// // // //     }
// // // //   }

// // // //   const togglePlayMode = () => {
// // // //     setIsPlayMode((prev) => {
// // // //       if (!prev) {
// // // //         extractText() // Extract text when opening PlayMode
// // // //       }
// // // //       return !prev
// // // //     })
// // // //   }

// // // //   // Global keyboard event listener for navigation
// // // //   useEffect(() => {
// // // //     const handleKeyDown = (e: KeyboardEvent) => {
// // // //       // Skip navigation if no reader or if PlayMode overlay is active.
// // // //       if (!renditionRef.current || isPlayMode) return

// // // //       if (e.key === "ArrowRight") {
// // // //         renditionRef.current.next()
// // // //       } else if (e.key === "ArrowLeft") {
// // // //         renditionRef.current.prev()
// // // //       }
// // // //     }
// // // //     window.addEventListener("keydown", handleKeyDown)
// // // //     return () => window.removeEventListener("keydown", handleKeyDown)
// // // //   }, [isPlayMode])

// // // //   return (
// // // //     <div className="w-full p-4">
// // // //       <Input 
// // // //         type="file" 
// // // //         accept=".epub" 
// // // //         onChange={handleFileUpload} 
// // // //         className="mb-4"
// // // //       />
// // // //       {book ? (
// // // //         <div className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full">
// // // //           <ReactReader 
// // // //             url={book} 
// // // //             location={location} 
// // // //             getRendition={getRendition} 
// // // //             locationChanged={locationChanged} 
// // // //           />
// // // //           {isPlayMode && (
// // // //             <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
// // // //               <PlayMode 
// // // //                 currentPageContent={currentPageContent}
// // // //                 onClose={() => setIsPlayMode(false)}
// // // //                 extractText={extractText}
// // // //               />
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       ) : (
// // // //         <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// // // //           Please upload an EPUB file to get started.
// // // //         </p>
// // // //       )}
// // // //       <div className="mb-4">
// // // //         <Button 
// // // //           onClick={togglePlayMode} 
// // // //           className="mr-2" 
// // // //           disabled={!book || !renditionRef.current}
// // // //         >
// // // //           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// // // //           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// // // //         </Button>
// // // //       </div>
// // // //     </div>
// // // //   )
// // // // }


// // //   // // Handle EPUB file upload
// // //   // const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // //   //   const file = event.target.files?.[0]
// // //   //   if (file) {
// // //   //     const reader = new FileReader()
// // //   //     reader.onload = (e: ProgressEvent<FileReader>) => {
// // //   //       const result = e.target?.result
// // //   //       if (result) {
// // //   //         setBook(result as ArrayBuffer)
// // //   //       }
// // //   //     }
// // //   //     reader.readAsArrayBuffer(file)
// // //   //   }
// // //   // }



// // // // // Define a function to trigger the container startup.
// // // // const triggerContainer = async () => {
// // // //   try {
// // // //     // Call your API endpoint that starts the container.
// // // //     await axios.post("/api/start-container");
// // // //     console.log("Container startup triggered.");
// // // //   } catch (error) {
// // // //     console.error("Error triggering container startup:", error);
// // // //   }
// // // // };

// // // // const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // // //   const file = event.target.files?.[0];
// // // //   if (file) {
// // // //     const reader = new FileReader();
// // // //     reader.onload = (e: ProgressEvent<FileReader>) => {
// // // //       const result = e.target?.result;
// // // //       if (result) {
// // // //         setBook(result as ArrayBuffer);
// // // //         // Trigger the container startup right after the EPUB is uploaded.
// // // //         triggerContainer();
// // // //       }
// // // //     };
// // // //     reader.readAsArrayBuffer(file);
// // // //   }
// // // // };


// // // // EnhancedEbookReader.tsx
// // // "use client"

// // // import { useState, useRef, useCallback, useEffect } from "react"
// // // import { ReactReader } from "react-reader"
// // // import { Button } from "@/components/ui/button"
// // // import { Input } from "@/components/ui/input"
// // // import { Play, X } from "lucide-react"
// // // import PlayMode from "@/components/PlayMode"
// // // import DefinitionSidebar from "@/components/DefinitionSidebar"
// // // import { useTheme } from "next-themes"
// // // import axios from "axios";

// // // export default function EnhancedEbookReader() {
// // //   const { theme } = useTheme()
// // //   const [book, setBook] = useState<ArrayBuffer | null>(null)
// // //   const [location, setLocation] = useState<string | null>(null)
// // //   const [isPlayMode, setIsPlayMode] = useState<boolean>(false)
// // //   const [currentPageContent, setCurrentPageContent] = useState<string>("")
// // //   const renditionRef = useRef<any>(null) // Reference to EPUB renderer

// // //   const hasStartedContainer = useRef(false);

// // //   useEffect(() => {
// // //     if (!hasStartedContainer.current) {
// // //       hasStartedContainer.current = true;
// // //       const startContainer = async () => {
// // //         try {
// // //           const res = await fetch("/api/start-container", { method: "POST" });
// // //           if (!res.ok) {
// // //             console.error("Failed to start container:", res.statusText);
// // //             return;
// // //           }
// // //           const data = await res.json();
// // //           console.log("Container started:", data);
// // //         } catch (error) {
// // //           console.error("Error starting container:", error);
// // //         }
// // //       };

// // //       startContainer();
// // //     }
// // //   }, []);

// // //   // Helper function to detect if the current location is the cover.
// // //   // This example assumes that many EPUBs mark the cover as non-linear.
// // //   const isOnCover = () => {
// // //     if (!renditionRef.current || !renditionRef.current.book || !renditionRef.current.location) return false
// // //     const spineItems = renditionRef.current.book.spine.spineItems
// // //     if (!spineItems || spineItems.length === 0) return false
// // //     return spineItems[0].linear === "no"
// // //   }

// // //   // Helper function to jump to chapter one.
// // //   // Finds the first spine item with linear === "yes" and displays it.
// // //   const goToChapterOne = () => {
// // //     if (!renditionRef.current || !renditionRef.current.book) return
// // //     const spineItems = renditionRef.current.book.spine.spineItems
// // //     const chapterOne = spineItems.find((item: any) => item.linear === "yes")
// // //     if (chapterOne) {
// // //       renditionRef.current.display(chapterOne.href)
// // //     }
// // //   }



// // // // Define a function to trigger the container startup.
// // //   const triggerContainer = async () => {
// // //     try {
// // //       await axios.post("/api/start-container");
// // //       console.log("Container startup triggered.");
// // //     } catch (error) {
// // //       console.error("Error triggering container startup:", error);
// // //     }
// // //   };

// // //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// // //     const file = event.target.files?.[0];
// // //     if (file) {
// // //       const reader = new FileReader();
// // //       reader.onload = (e: ProgressEvent<FileReader>) => {
// // //         const result = e.target?.result;
// // //         if (result) {
// // //           setBook(result as ArrayBuffer);
// // //           // Trigger container startup right after the EPUB is uploaded.
// // //           triggerContainer();
// // //         }
// // //       };
// // //       reader.readAsArrayBuffer(file);
// // //     }
// // //   };


// // //   const extractText = () => {
// // //     if (!renditionRef.current || !renditionRef.current.location) return

// // //     const { start } = renditionRef.current.location
// // //     if (start?.cfi) {
// // //       setTimeout(() => {
// // //         renditionRef.current.book
// // //           .getRange(start.cfi)
// // //           .then((range: Range | null) => {
// // //             if (range) {
// // //               console.log("Extracted Text:", range.toString())
// // //               setCurrentPageContent(prevContent => prevContent || range.toString())
// // //             } else {
// // //               setCurrentPageContent(prevContent => prevContent || "Text extraction failed.")
// // //             }
// // //           })
// // //           .catch((error: unknown) => {
// // //             console.error("Error getting range:", error)
// // //             setCurrentPageContent(prevContent => prevContent || "Error extracting text.")
// // //           })
// // //       }, 700)
// // //     }
// // //   }

// // //   // Store EPUB rendering instance, inject CSS, and auto-jump to chapter one if needed.
// // //   const getRendition = useCallback((rendition: any) => {
// // //     renditionRef.current = rendition

// // //     // Inject custom CSS into the epub content based on the active theme.
// // //     rendition.hooks.content.register((contents: any) => {
// // //       const styleEl = contents.document.createElement("style")
// // //       if (theme === "dark") {
// // //         styleEl.innerHTML = `
// // //           body {
// // //             background-color: #2c2c2c !important;
// // //             color: #dcdcdc !important;
// // //           }
// // //           a {
// // //             color: #82aaff !important;
// // //           }
// // //         `
// // //       } else {
// // //         styleEl.innerHTML = `
// // //           body {
// // //             background-color: #ffffff !important;
// // //             color: #000000 !important;
// // //           }
// // //           a {
// // //             color: #0070f3 !important;
// // //           }
// // //         `
// // //       }
// // //       contents.document.head.appendChild(styleEl)

// // //       // Extract text from the content after a short delay.
// // //       setTimeout(() => {
// // //         const extractedText = contents.document.body.innerText.trim()
// // //         setCurrentPageContent(extractedText || "No text found on this page.")
// // //       }, 500)
// // //     })

// // //     rendition.on("locationChanged", locationChanged)

// // //     // After a delay, if we're on the cover, jump to chapter one.
// // //     setTimeout(() => {
// // //       if (isOnCover()) {
// // //         goToChapterOne()
// // //       }
// // //     }, 1000)
// // //   }, [theme])

// // //   const locationChanged = (epubcifi: any) => {
// // //     if (typeof epubcifi === "string") {
// // //       setLocation(epubcifi)
// // //       extractText()
// // //     } else {
// // //       console.warn("Unexpected location format:", epubcifi)
// // //     }
// // //   }

// // //   const togglePlayMode = () => {
// // //     setIsPlayMode((prev) => {
// // //       if (!prev) {
// // //         extractText() // Extract text when opening PlayMode
// // //       }
// // //       return !prev
// // //     })
// // //   }

// // //   // Global keyboard event listener for navigation
// // //   useEffect(() => {
// // //     const handleKeyDown = (e: KeyboardEvent) => {
// // //       // Skip navigation if no reader or if PlayMode overlay is active.
// // //       if (!renditionRef.current || isPlayMode) return

// // //       if (e.key === "ArrowRight") {
// // //         renditionRef.current.next()
// // //       } else if (e.key === "ArrowLeft") {
// // //         renditionRef.current.prev()
// // //       }
// // //     }
// // //     window.addEventListener("keydown", handleKeyDown)
// // //     return () => window.removeEventListener("keydown", handleKeyDown)
// // //   }, [isPlayMode])

// // //   return (
// // //     <div className="w-full p-4">
// // //       <Input 
// // //         type="file" 
// // //         accept=".epub" 
// // //         onChange={handleFileUpload} 
// // //         className="mb-4"
// // //       />
// // //       {book ? (
// // //         <div className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full">
// // //           <ReactReader 
// // //             url={book} 
// // //             location={location} 
// // //             getRendition={getRendition} 
// // //             locationChanged={locationChanged} 
// // //           />
// // //           {isPlayMode && (
// // //             <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
// // //               <PlayMode 
// // //                 currentPageContent={currentPageContent}
// // //                 onClose={() => setIsPlayMode(false)}
// // //                 extractText={extractText}
// // //               />
// // //             </div>
// // //           )}
// // //         </div>
// // //       ) : (
// // //         <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// // //           Please upload an EPUB file to get started.
// // //         </p>
// // //       )}
// // //       <div className="mb-4">
// // //         <Button 
// // //           onClick={togglePlayMode} 
// // //           className="mr-2" 
// // //           disabled={!book || !renditionRef.current}
// // //         >
// // //           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// // //           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// // //         </Button>
// // //       </div>
// // //     </div>
// // //   )
// // // }


// // // EnhancedEbookReader.tsx
// // "use client"

// // import { useState, useRef, useCallback, useEffect } from "react"
// // import { ReactReader } from "react-reader"
// // import { Button } from "@/components/ui/button"
// // import { Input } from "@/components/ui/input"
// // import { Play, X } from "lucide-react"
// // import PlayMode from "@/components/PlayMode"
// // import { useTheme } from "next-themes"
// // import axios from "axios"

// // export interface Segment {
// //   speaker: string;
// //   text: string;
// //   voice?: string;
// //   gender: "MALE" | "FEMALE";
// // }

// // export interface VoiceMapping {
// //   voice: string;
// //   source: "predefined" | "generated";
// // }

// // export interface VoiceMappings {
// //   [key: string]: VoiceMapping;
// // }

// // interface TTSResult {
// //   audioUrl: string;
// //   failed: boolean;
// // }

// // interface PlayModeProps {
// //   currentPageContent: string;
// //   onClose: () => void;
// //   extractText: () => void;
// // }

// // export default function EnhancedEbookReader() {
// //   const { theme } = useTheme()
// //   const [book, setBook] = useState<ArrayBuffer | null>(null)
// //   const [location, setLocation] = useState<string | null>(null)
// //   const [isPlayMode, setIsPlayMode] = useState<boolean>(false)
// //   const [currentPageContent, setCurrentPageContent] = useState<string>("")
// //   const renditionRef = useRef<any>(null)
// //   // Ref for the container that wraps ReactReader
// //   const containerRef = useRef<HTMLDivElement>(null)
// //   // Ref to accumulate extracted texts (for debugging)
// //   const extractedTextsRef = useRef<string[]>([])

// //   const hasStartedContainer = useRef(false);

// //   // Global patch for window.fetch to fix duplicated paths.
// //   useEffect(() => {
// //     const originalFetch = window.fetch;
// //     window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
// //       let requestInput: RequestInfo;
// //       if (input instanceof URL) {
// //         requestInput = input.toString();
// //       } else {
// //         requestInput = input;
// //       }
// //       if (typeof requestInput === "string" && requestInput.includes("/OEBPS/OEBPS/")) {
// //         requestInput = requestInput.replace("/OEBPS/OEBPS/", "/OEBPS/");
// //         console.log("Global fetch fixed URL:", requestInput);
// //       }
// //       return originalFetch(requestInput, init);
// //     }) as typeof window.fetch;
// //     return () => {
// //       window.fetch = originalFetch;
// //     };
// //   }, []);
  

// //   useEffect(() => {
// //     if (!hasStartedContainer.current) {
// //       hasStartedContainer.current = true;
// //       const startContainer = async () => {
// //         try {
// //           const res = await fetch("/api/start-container", { method: "POST" });
// //           if (!res.ok) {
// //             console.error("Failed to start container:", res.statusText);
// //             return;
// //           }
// //           const data = await res.json();
// //           console.log("Container started:", data);
// //         } catch (error) {
// //           console.error("Error starting container:", error);
// //         }
// //       };
// //       startContainer();
// //     }
// //   }, []);

// //   // Use an interval to check for the iframe inside containerRef and update its sandbox attribute.
// //   useEffect(() => {
// //     if (!containerRef.current) return;
// //     const intervalId = setInterval(() => {
// //       const iframe = containerRef.current?.querySelector("iframe");
// //       if (iframe) {
// //         iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
// //         console.log("Iframe sandbox updated to:", iframe.getAttribute("sandbox"));
// //         clearInterval(intervalId);
// //       } else {
// //         console.warn("Iframe not found inside containerRef.");
// //       }
// //     }, 500);
// //     return () => clearInterval(intervalId);
// //   }, [book, location]);

// //   const isOnCover = () => {
// //     if (!renditionRef.current || !renditionRef.current.book || !renditionRef.current.location) return false;
// //     const spineItems = renditionRef.current.book.spine.spineItems;
// //     if (!spineItems || spineItems.length === 0) return false;
// //     return spineItems[0].linear === "no";
// //   };

// //   const goToChapterOne = () => {
// //     if (!renditionRef.current || !renditionRef.current.book) return;
// //     const spineItems = renditionRef.current.book.spine.spineItems;
// //     const chapterOne = spineItems.find((item: any) => item.linear === "yes");
// //     if (chapterOne) {
// //       renditionRef.current.display(chapterOne.href);
// //     }
// //   };

// //   const triggerContainer = async () => {
// //     try {
// //       await axios.post("/api/start-container");
// //       console.log("Container startup triggered.");
// //     } catch (error) {
// //       console.error("Error triggering container startup:", error);
// //     }
// //   };

// //   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
// //     const file = event.target.files?.[0];
// //     if (file) {
// //       const reader = new FileReader();
// //       reader.onload = (e: ProgressEvent<FileReader>) => {
// //         const result = e.target?.result;
// //         if (result) {
// //           setBook(result as ArrayBuffer);
// //           triggerContainer();
// //         }
// //       };
// //       reader.readAsArrayBuffer(file);
// //     }
// //   };

// //   const extractText = () => {
// //     if (!renditionRef.current || !renditionRef.current.location) return;
// //     const { start } = renditionRef.current.location;
// //     if (start?.cfi) {
// //       setTimeout(() => {
// //         renditionRef.current.book
// //           .getRange(start.cfi)
// //           .then((range: Range | null) => {
// //             if (range) {
// //               const text = range.toString();
// //               console.log("Extracted Text:", text);
// //               extractedTextsRef.current.push(text);
// //               console.log("All Extracted Texts:", extractedTextsRef.current);
// //               setCurrentPageContent(prev => prev || text);
// //             } else {
// //               setCurrentPageContent(prev => prev || "Text extraction failed.");
// //             }
// //           })
// //           .catch((error: unknown) => {
// //             console.error("Error getting range:", error);
// //             setCurrentPageContent(prev => prev || "Error extracting text.");
// //           });
// //       }, 700);
// //     }
// //   };

// //   // Patch the book's request method in getRendition to fix duplicate OEBPS paths.
// //   const getRendition = useCallback((rendition: any) => {
// //     renditionRef.current = rendition;

// //     if (rendition.book && typeof rendition.book.request === "function") {
// //       const originalRequest = rendition.book.request.bind(rendition.book);
// //       rendition.book.request = (url: string, options: any) => {
// //         if (url.includes("/OEBPS/OEBPS/")) {
// //           url = url.replace("/OEBPS/OEBPS/", "/OEBPS/");
// //           console.log("Fixed URL:", url);
// //         }
// //         return originalRequest(url, options);
// //       };
// //     }
    
// //     rendition.hooks.content.register((contents: any) => {
// //       const styleEl = contents.document.createElement("style");
// //       if (theme === "dark") {
// //         styleEl.innerHTML = `
// //           body {
// //             background-color: #2c2c2c !important;
// //             color: #dcdcdc !important;
// //           }
// //           a {
// //             color: #82aaff !important;
// //           }
// //         `;
// //       } else {
// //         styleEl.innerHTML = `
// //           body {
// //             background-color: #ffffff !important;
// //             color: #000000 !important;
// //           }
// //           a {
// //             color: #0070f3 !important;
// //           }
// //         `;
// //       }
// //       contents.document.head.appendChild(styleEl);

// //       setTimeout(() => {
// //         const extractedText = contents.document.body.innerText.trim();
// //         setCurrentPageContent(extractedText || "No text found on this page.");
// //       }, 500);
// //     });

// //     rendition.on("locationChanged", locationChanged);

// //     setTimeout(() => {
// //       if (isOnCover()) {
// //         goToChapterOne();
// //       }
// //     }, 1000);
// //   }, [theme]);

// //   // Handle both string and object formats for location.
// //   const locationChanged = (epubcifi: any) => {
// //     if (typeof epubcifi === "string") {
// //       setLocation(epubcifi);
// //       extractText();
// //     } else if (epubcifi && epubcifi.href) {
// //       setLocation(epubcifi.href);
// //       extractText();
// //     } else {
// //       console.warn("Unexpected location format:", epubcifi);
// //     }
// //   };

// //   const togglePlayMode = () => {
// //     setIsPlayMode(prev => {
// //       if (!prev) {
// //         extractText();
// //       }
// //       return !prev;
// //     });
// //   };

// //   useEffect(() => {
// //     const handleKeyDown = (e: KeyboardEvent) => {
// //       if (!renditionRef.current || isPlayMode) return;
// //       if (e.key === "ArrowRight") {
// //         renditionRef.current.next();
// //       } else if (e.key === "ArrowLeft") {
// //         renditionRef.current.prev();
// //       }
// //     };
// //     window.addEventListener("keydown", handleKeyDown);
// //     return () => window.removeEventListener("keydown", handleKeyDown);
// //   }, [isPlayMode]);

// //   return (
// //     <div className="w-full p-4">
// //       <Input 
// //         type="file" 
// //         accept=".epub" 
// //         onChange={handleFileUpload} 
// //         className="mb-4"
// //       />
// //       {book ? (
// //         // This container is positioned relative so that absolute children are contained.
// //         <div 
// //           ref={containerRef} 
// //           className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full"
// //         >
// //           <ReactReader 
// //             url={book} 
// //             location={location} 
// //             getRendition={getRendition} 
// //             locationChanged={locationChanged}
// //           />
// //           {isPlayMode && (
// //             // This overlay is absolutely positioned relative to the container (inset-0 means it covers the whole container).
// //             <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
// //               <PlayMode 
// //                 currentPageContent={currentPageContent}
// //                 onClose={() => setIsPlayMode(false)}
// //                 extractText={extractText}
// //               />
// //             </div>
// //           )}
// //         </div>
// //       ) : (
// //         <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
// //           Please upload an EPUB file to get started.
// //         </p>
// //       )}
// //       <div className="mb-4">
// //         <Button 
// //           onClick={togglePlayMode} 
// //           className="mr-2" 
// //           disabled={!book || !renditionRef.current}
// //         >
// //           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
// //           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
// //         </Button>
// //       </div>
// //     </div>
// //   )  
// // }


// // EnhancedEbookReader.tsx
// "use client"

// import { useState, useRef, useCallback, useEffect } from "react"
// import { ReactReader } from "react-reader"
// import { Button } from "../components/ui/button"
// import { Input } from "../components/ui/input"
// import { Play, X } from "lucide-react"
// import PlayMode from "../components/PlayMode"
// import { useTheme } from "../components/theme-provider"
// import axios from "axios"
// // Import storage helpers
// import { saveEpub, loadEpub } from "../lib/mediaStorage"

// export interface Segment {
//   speaker: string;
//   text: string;
//   voice?: string;
//   gender: "MALE" | "FEMALE";
// }

// export interface VoiceMapping {
//   voice: string;
//   source: "predefined" | "generated";
// }

// export interface VoiceMappings {
//   [key: string]: VoiceMapping;
// }

// interface TTSResult {
//   audioUrl: string;
//   failed: boolean;
// }

// interface PlayModeProps {
//   currentPageContent: string;
//   onClose: () => void;
//   extractText: () => void;
// }

// export default function EnhancedEbookReader() {
//   const { theme } = useTheme()
//   const [book, setBook] = useState<ArrayBuffer | null>(null)
//   const [location, setLocation] = useState<string | null>(null)
//   const [isPlayMode, setIsPlayMode] = useState<boolean>(false)
//   const [currentPageContent, setCurrentPageContent] = useState<string>("")
//   const renditionRef = useRef<any>(null)
//   // Ref for the container that wraps ReactReader
//   const containerRef = useRef<HTMLDivElement>(null)
//   // Ref to accumulate extracted texts (for debugging)
//   const extractedTextsRef = useRef<string[]>([])
//   // Add a state for the book name:
//   const [bookName, setBookName] = useState<string>("");

//   // const hasStartedContainer = useRef(false);

//   // Global patch for window.fetch to fix duplicated paths.
//   useEffect(() => {
//     const originalFetch = window.fetch;
//     window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
//       let requestInput: RequestInfo;
//       if (input instanceof URL) {
//         requestInput = input.toString();
//       } else {
//         requestInput = input;
//       }
//       if (typeof requestInput === "string" && requestInput.includes("/OEBPS/OEBPS/")) {
//         requestInput = requestInput.replace("/OEBPS/OEBPS/", "/OEBPS/");
//         console.log("Global fetch fixed URL:", requestInput);
//       }
//       return originalFetch(requestInput, init);
//     }) as typeof window.fetch;
//     return () => {
//       window.fetch = originalFetch;
//     };
//   }, []);
  
//   // Load saved EPUB from storage on mount
//   useEffect(() => {
//     loadEpub().then((storedBook) => {
//       if (storedBook) {
//         setBook(storedBook as ArrayBuffer);
//       }
//     });
//   }, []);

//   useEffect(() => {
//     const savedLocation = localStorage.getItem("currentEpubLocation");
//     if (savedLocation) {
//       setLocation(savedLocation);
//     }
//   }, []);
  

//   // Use an interval to check for the iframe inside containerRef and update its sandbox attribute.
//   useEffect(() => {
//     if (!containerRef.current) return;
//     const intervalId = setInterval(() => {
//       const iframe = containerRef.current?.querySelector("iframe");
//       if (iframe) {
//         iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
//         console.log("Iframe sandbox updated to:", iframe.getAttribute("sandbox"));
//         clearInterval(intervalId);
//       } else {
//         console.warn("Iframe not found inside containerRef.");
//       }
//     }, 500);
//     return () => clearInterval(intervalId);
//   }, [book, location]);

//   const isOnCover = () => {
//     if (!renditionRef.current || !renditionRef.current.book || !renditionRef.current.location) return false;
//     const spineItems = renditionRef.current.book.spine.spineItems;
//     if (!spineItems || spineItems.length === 0) return false;
//     return spineItems[0].linear === "no";
//   };

//   const goToChapterOne = () => {
//     if (!renditionRef.current || !renditionRef.current.book) return;
//     const spineItems = renditionRef.current.book.spine.spineItems;
//     const chapterOne = spineItems.find((item: any) => item.linear === "yes");
//     if (chapterOne) {
//       renditionRef.current.display(chapterOne.href);
//     }
//   };

//   // const triggerContainer = async () => {
//   //   try {
//   //     await axios.post("/api/start-container");
//   //     console.log("Container startup triggered.");
//   //   } catch (error) {
//   //     console.error("Error triggering container startup:", error);
//   //   }
//   // };

//   // Update file upload to persist EPUB using mediaStorage
//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (e: ProgressEvent<FileReader>) => {
//         const result = e.target?.result;
//         if (result) {
//           setBook(result as ArrayBuffer);
//           // Save the book persistently (IndexedDB/localForage)
//           saveEpub(result as ArrayBuffer);
//           // triggerContainer();
//         }
//       };
//       reader.readAsArrayBuffer(file);
//     }
//   };

//   const extractText = () => {
//     if (!renditionRef.current || !renditionRef.current.location) return;
//     const { start } = renditionRef.current.location;
//     if (start?.cfi) {
//       setTimeout(() => {
//         renditionRef.current.book
//           .getRange(start.cfi)
//           .then((range: Range | null) => {
//             if (range) {
//               const text = range.toString();
//               console.log("Extracted Text:", text);
//               extractedTextsRef.current.push(text);
//               console.log("All Extracted Texts:", extractedTextsRef.current);
//               setCurrentPageContent(prev => prev || text);
//             } else {
//               setCurrentPageContent(prev => prev || "Text extraction failed.");
//             }
//           })
//           .catch((error: unknown) => {
//             console.error("Error getting range:", error);
//             setCurrentPageContent(prev => prev || "Error extracting text.");
//           });
//       }, 700);
//     }
//   };

//   // // Patch the book's request method in getRendition to fix duplicate OEBPS paths.
//   // const getRendition = useCallback((rendition: any) => {
//   //   renditionRef.current = rendition;

//   //   if (rendition.book && typeof rendition.book.request === "function") {
//   //     const originalRequest = rendition.book.request.bind(rendition.book);
//   //     rendition.book.request = (url: string, options: any) => {
//   //       if (url.includes("/OEBPS/OEBPS/")) {
//   //         url = url.replace("/OEBPS/OEBPS/", "/OEBPS/");
//   //         console.log("Fixed URL:", url);
//   //       }
//   //       return originalRequest(url, options);
//   //     };
//   //   }
    
//   //   rendition.hooks.content.register((contents: any) => {
//   //     const styleEl = contents.document.createElement("style");
//   //     if (theme === "dark") {
//   //       styleEl.innerHTML = `
//   //         body {
//   //           background-color: #2c2c2c !important;
//   //           color: #dcdcdc !important;
//   //         }
//   //         a {
//   //           color: #82aaff !important;
//   //         }
//   //       `;
//   //     } else {
//   //       styleEl.innerHTML = `
//   //         body {
//   //           background-color: #ffffff !important;
//   //           color: #000000 !important;
//   //         }
//   //         a {
//   //           color: #0070f3 !important;
//   //         }
//   //       `;
//   //     }
//   //     contents.document.head.appendChild(styleEl);

//   //     setTimeout(() => {
//   //       const extractedText = contents.document.body.innerText.trim();
//   //       setCurrentPageContent(extractedText || "No text found on this page.");
//   //     }, 500);
//   //   });

//   //   rendition.on("locationChanged", locationChanged);

//   //   setTimeout(() => {
//   //     if (isOnCover()) {
//   //       goToChapterOne();
//   //     }
//   //   }, 1000);
//   // }, [theme]);


//   const getRendition = useCallback((rendition: any) => {
//     renditionRef.current = rendition;
  
//     if (rendition.book && typeof rendition.book.request === "function") {
//       const originalRequest = rendition.book.request.bind(rendition.book);
//       rendition.book.request = (url: string, options: any) => {
//         if (url.includes("/OEBPS/OEBPS/")) {
//           url = url.replace("/OEBPS/OEBPS/", "/OEBPS/");
//           console.log("Fixed URL:", url);
//         }
//         return originalRequest(url, options);
//       };
//     }
  
//     // Extract the book metadata (title) once the book is loaded.
//     rendition.book.ready.then(() => {
//       const metadata = rendition.book.package.metadata;
//       if (metadata && metadata.title) {
//         console.log("Book title extracted:", metadata.title);
//         setBookName(metadata.title);
//       }
//     });
    
  
//     rendition.hooks.content.register((contents: any) => {
//       const styleEl = contents.document.createElement("style");
//       if (theme === "dark") {
//         styleEl.innerHTML = `
//             body {
//               background-color: #2c2c2c !important;
//               color: #dcdcdc !important;
//             }
//             a {
//               color: #82aaff !important;
//             }
//           `;
//       } else {
//         styleEl.innerHTML = `
//             body {
//               background-color: #ffffff !important;
//               color: #000000 !important;
//             }
//             a {
//               color: #0070f3 !important;
//             }
//           `;
//       }
//       contents.document.head.appendChild(styleEl);
  
//       setTimeout(() => {
//         const extractedText = contents.document.body.innerText.trim();
//         setCurrentPageContent(extractedText || "No text found on this page.");
//       }, 500);
//     });
  
//     rendition.on("locationChanged", locationChanged);
  
//     setTimeout(() => {
//       if (isOnCover()) {
//         goToChapterOne();
//       }
//     }, 1000);
//   }, [theme]);
  

//   // Handle both string and object formats for location.
//   // const locationChanged = (epubcifi: any) => {
//   //   if (typeof epubcifi === "string") {
//   //     setLocation(epubcifi);
//   //     extractText();
//   //   } else if (epubcifi && epubcifi.href) {
//   //     setLocation(epubcifi.href);
//   //     extractText();
//   //   } else {
//   //     console.warn("Unexpected location format:", epubcifi);
//   //   }
//   // };

//   // const locationChanged = (epubcifi: any) => {
//   //   let newLocation: string | null = null;
//   //   if (typeof epubcifi === "string") {
//   //     newLocation = epubcifi;
//   //     setLocation(newLocation);
//   //     extractText();
//   //   } else if (epubcifi && epubcifi.href) {
//   //     newLocation = epubcifi.href;
//   //     setLocation(newLocation);
//   //     extractText();
//   //   } else {
//   //     console.warn("Unexpected location format:", epubcifi);
//   //   }
//   //   // Save the location if available
//   //   if (newLocation) {
//   //     localStorage.setItem("currentEpubLocation", newLocation);
//   //   }
//   // };


//   const locationChanged = (epubcifi: any) => {
//     let newLocation: string | null = null;
//     if (typeof epubcifi === "string") {
//       newLocation = epubcifi;
//     } else if (epubcifi && epubcifi.href) {
//       newLocation = epubcifi.href;
//     } else {
//       console.warn("Unexpected location format:", epubcifi);
//     }
//     if (newLocation) {
//       // Compare newLocation with the current location (using a type assertion)
//       if (newLocation !== (location as string)) {
//         // The chapter has changed—clear previous state so old audio isn't reused.
//         setLocation(newLocation);
//         // You can also clear other state as needed:
//         // For example, if you want to force re-extraction and avoid loading old audio:
//         // (This assumes that your PlayMode component will reinitialize when location changes.)
//         extractText();
//         // OPTIONAL: Clear previous persistent audio from storage.
//         // Uncomment the block below if you want to remove all saved audio keys.
//         /*
//         localforage.keys().then((keys) => {
//           keys.filter(key => key.startsWith("tts_")).forEach((key) => {
//             localforage.removeItem(key);
//             console.log(`Removed persistent audio key: ${key}`);
//           });
//         });
//         */
//         localStorage.setItem("currentEpubLocation", newLocation);
//       } else {
//         // If the location is the same, you might still want to re-extract text.
//         extractText();
//       }
//     }
//   };
  
  


//   const togglePlayMode = () => {
//     setIsPlayMode(prev => {
//       if (!prev) {
//         extractText();
//       }
//       return !prev;
//     });
//   };

//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (!renditionRef.current || isPlayMode) return;
//       if (e.key === "ArrowRight") {
//         renditionRef.current.next();
//       } else if (e.key === "ArrowLeft") {
//         renditionRef.current.prev();
//       }
//     };
//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [isPlayMode]);

//   return (
//     <div className="w-full p-4">
//       <Input 
//         type="file" 
//         accept=".epub" 
//         onChange={handleFileUpload} 
//         className="mb-4"
//       />
//       {book ? (
//         // This container is positioned relative so that absolute children are contained.
//         <div 
//           ref={containerRef} 
//           className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full"
//         >
//           <ReactReader 
//             url={book} 
//             location={location} 
//             getRendition={getRendition} 
//             locationChanged={locationChanged}
//           />
//           {isPlayMode && (
//             // This overlay is absolutely positioned relative to the container (inset-0 means it covers the whole container).
//             <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
//               <PlayMode 
//                 currentPageContent={currentPageContent}
//                 onClose={() => setIsPlayMode(false)}
//                 extractText={extractText}
//                 location={location || "default"}
//                 bookName={bookName || "UnknownBook"}  // Now using the extracted book name
//                 />
//             </div>
//           )}
//         </div>
//       ) : (
//         <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
//           Please upload an EPUB file to get started.
//         </p>
//       )}
//       <div className="mb-4">
//         <Button 
//           onClick={togglePlayMode} 
//           className="mr-2" 
//           disabled={!book || !renditionRef.current}
//         >
//           {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
//           {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
//         </Button>
//       </div>
//     </div>
//   )  
// }



import { useState, useRef, useCallback, useEffect } from "react";
import { ReactReader } from "react-reader";
import { Button } from "../components-old/ui/button";
import { Input } from "../components-old/ui/input";
import { Play, X } from "lucide-react";
import PlayMode from "../components-old/PlayMode";
import { useTheme } from "../components-old/theme-provider";
import axios from "axios";
// Import storage helpers
import { saveEpub, loadEpub } from "../lib/mediaStorage";

export interface Segment {
  speaker: string;
  text: string;
  voice?: string;
  gender: "MALE" | "FEMALE";
}

export interface VoiceMapping {
  voice: string;
  source: "predefined" | "generated";
}

export interface VoiceMappings {
  [key: string]: VoiceMapping;
}

interface TTSResult {
  audioUrl: string;
  failed: boolean;
}

interface PlayModeProps {
  currentPageContent: string;
  onClose: () => void;
  extractText: () => void;
  location: string;
  bookName: string;
}

function App() {
  const { theme } = useTheme();
  const [book, setBook] = useState<ArrayBuffer | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [isPlayMode, setIsPlayMode] = useState<boolean>(false);
  const [currentPageContent, setCurrentPageContent] = useState<string>("");
  const renditionRef = useRef<any>(null);
  // Ref for the container that wraps ReactReader
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref to accumulate extracted texts (for debugging)
  const extractedTextsRef = useRef<string[]>([]);
  // Add a state for the book name:
  const [bookName, setBookName] = useState<string>("");

  // Global patch for window.fetch to fix duplicated paths.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      let requestInput: RequestInfo;
      if (input instanceof URL) {
        requestInput = input.toString();
      } else {
        requestInput = input;
      }
      if (typeof requestInput === "string" && requestInput.includes("/OEBPS/OEBPS/")) {
        requestInput = requestInput.replace("/OEBPS/OEBPS/", "/OEBPS/");
        console.log("Global fetch fixed URL:", requestInput);
      }
      return originalFetch(requestInput, init);
    }) as typeof window.fetch;
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
  
  // Load saved EPUB from storage on mount
  useEffect(() => {
    loadEpub().then((storedBook) => {
      if (storedBook) {
        setBook(storedBook as ArrayBuffer);
      }
    });
  }, []);

  useEffect(() => {
    const savedLocation = localStorage.getItem("currentEpubLocation");
    if (savedLocation) {
      setLocation(savedLocation);
    }
  }, []);

  // Use an interval to check for the iframe inside containerRef and update its sandbox attribute.
  useEffect(() => {
    if (!containerRef.current) return;
    const intervalId = setInterval(() => {
      const iframe = containerRef.current?.querySelector("iframe");
      if (iframe) {
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        console.log("Iframe sandbox updated to:", iframe.getAttribute("sandbox"));
        clearInterval(intervalId);
      } else {
        console.warn("Iframe not found inside containerRef.");
      }
    }, 500);
    return () => clearInterval(intervalId);
  }, [book, location]);

  const isOnCover = () => {
    if (!renditionRef.current || !renditionRef.current.book || !renditionRef.current.location) return false;
    const spineItems = renditionRef.current.book.spine.spineItems;
    if (!spineItems || spineItems.length === 0) return false;
    return spineItems[0].linear === "no";
  };

  const goToChapterOne = () => {
    if (!renditionRef.current || !renditionRef.current.book) return;
    const spineItems = renditionRef.current.book.spine.spineItems;
    const chapterOne = spineItems.find((item: any) => item.linear === "yes");
    if (chapterOne) {
      renditionRef.current.display(chapterOne.href);
    }
  };

  // Update file upload to persist EPUB using mediaStorage
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (result) {
          setBook(result as ArrayBuffer);
          // Save the book persistently (IndexedDB/localForage)
          saveEpub(result as ArrayBuffer);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const extractText = () => {
    if (!renditionRef.current || !renditionRef.current.location) return;
    const { start } = renditionRef.current.location;
    if (start?.cfi) {
      setTimeout(() => {
        renditionRef.current.book
          .getRange(start.cfi)
          .then((range: Range | null) => {
            if (range) {
              const text = range.toString();
              console.log("Extracted Text:", text);
              extractedTextsRef.current.push(text);
              console.log("All Extracted Texts:", extractedTextsRef.current);
              setCurrentPageContent(prev => prev || text);
            } else {
              setCurrentPageContent(prev => prev || "Text extraction failed.");
            }
          })
          .catch((error: unknown) => {
            console.error("Error getting range:", error);
            setCurrentPageContent(prev => prev || "Error extracting text.");
          });
      }, 700);
    }
  };

  const getRendition = useCallback((rendition: any) => {
    renditionRef.current = rendition;
  
    if (rendition.book && typeof rendition.book.request === "function") {
      const originalRequest = rendition.book.request.bind(rendition.book);
      rendition.book.request = (url: string, options: any) => {
        if (url.includes("/OEBPS/OEBPS/")) {
          url = url.replace("/OEBPS/OEBPS/", "/OEBPS/");
          console.log("Fixed URL:", url);
        }
        return originalRequest(url, options);
      };
    }
  
    // Extract the book metadata (title) once the book is loaded.
    rendition.book.ready.then(() => {
      const metadata = rendition.book.package.metadata;
      if (metadata && metadata.title) {
        console.log("Book title extracted:", metadata.title);
        setBookName(metadata.title);
      }
    });
  
    rendition.hooks.content.register((contents: any) => {
      const styleEl = contents.document.createElement("style");
      if (theme === "dark") {
        styleEl.innerHTML = `
            body {
              background-color: #2c2c2c !important;
              color: #dcdcdc !important;
            }
            a {
              color: #82aaff !important;
            }
          `;
      } else {
        styleEl.innerHTML = `
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            a {
              color: #0070f3 !important;
            }
          `;
      }
      contents.document.head.appendChild(styleEl);
  
      setTimeout(() => {
        const extractedText = contents.document.body.innerText.trim();
        setCurrentPageContent(extractedText || "No text found on this page.");
      }, 500);
    });
  
    rendition.on("locationChanged", locationChanged);
  
    setTimeout(() => {
      if (isOnCover()) {
        goToChapterOne();
      }
    }, 1000);
  }, [theme]);

  const locationChanged = (epubcifi: any) => {
    let newLocation: string | null = null;
    if (typeof epubcifi === "string") {
      newLocation = epubcifi;
    } else if (epubcifi && epubcifi.href) {
      newLocation = epubcifi.href;
    } else {
      console.warn("Unexpected location format:", epubcifi);
    }
    if (newLocation) {
      // Compare newLocation with the current location (using a type assertion)
      if (newLocation !== (location as string)) {
        // The chapter has changed—clear previous state so old audio isn't reused.
        setLocation(newLocation);
        extractText();
        localStorage.setItem("currentEpubLocation", newLocation);
      } else {
        // If the location is the same, you might still want to re-extract text.
        extractText();
      }
    }
  };

  const togglePlayMode = () => {
    setIsPlayMode(prev => {
      if (!prev) {
        extractText();
      }
      return !prev;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!renditionRef.current || isPlayMode) return;
      if (e.key === "ArrowRight") {
        renditionRef.current.next();
      } else if (e.key === "ArrowLeft") {
        renditionRef.current.prev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlayMode]);

  return (
    <div className="w-full p-4">
      <Input 
        type="file" 
        accept=".epub" 
        onChange={handleFileUpload} 
        className="mb-4"
      />
      {book ? (
        // This container is positioned relative so that absolute children are contained.
        <div 
          ref={containerRef} 
          className="relative mb-4 h-[80vh] border border-gray-300 dark:border-gray-700 rounded shadow overflow-hidden bg-white dark:bg-gray-900 w-full"
        >
          <ReactReader 
            url={book} 
            location={location} 
            getRendition={getRendition} 
            locationChanged={locationChanged}
          />
          {isPlayMode && (
            // This overlay is absolutely positioned relative to the container
            <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center p-4">
              <PlayMode 
                currentPageContent={currentPageContent}
                onClose={() => setIsPlayMode(false)}
                extractText={extractText}
                location={location || "default"}
                bookName={bookName || "UnknownBook"}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
          Please upload an EPUB file to get started.
        </p>
      )}
      <div className="mb-4">
        <Button 
          onClick={togglePlayMode} 
          className="mr-2" 
          disabled={!book || !renditionRef.current}
        >
          {isPlayMode ? <X className="mr-2" /> : <Play className="mr-2" />}
          {isPlayMode ? "Exit Play Mode" : "Enter Play Mode"}
        </Button>
      </div>
    </div>
  );
}

export default App;