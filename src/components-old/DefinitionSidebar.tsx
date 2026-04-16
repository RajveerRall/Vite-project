// // // // // // // // // // components/DefinitionSidebar.tsx
// // // // // // // // // "use client"

// // // // // // // // // import { useState } from "react"
// // // // // // // // // import { Input } from "@/components/ui/input"
// // // // // // // // // import { Button } from "@/components/ui/button"

// // // // // // // // // export default function DefinitionSidebar() {
// // // // // // // // //   const [query, setQuery] = useState("")
// // // // // // // // //   const [definition, setDefinition] = useState("")
// // // // // // // // //   const [translation, setTranslation] = useState("")

// // // // // // // // //   const handleLookup = async () => {
// // // // // // // // //     // Replace this with your actual API calls to fetch definition and translation.
// // // // // // // // //     setDefinition(`Definition for "${query}" (sample data).`)
// // // // // // // // //     setTranslation(`Translation for "${query}" (sample data).`)
// // // // // // // // //   }

// // // // // // // // //   return (
// // // // // // // // //     <aside
// // // // // // // // //       style={{
// // // // // // // // //         width: "300px",
// // // // // // // // //         padding: "1rem",
// // // // // // // // //         borderLeft: "1px solid #ddd",
// // // // // // // // //         backgroundColor: "#f9f9f9",
// // // // // // // // //         overflowY: "auto",
// // // // // // // // //       }}
// // // // // // // // //     >
// // // // // // // // //       <h2 className="text-xl font-bold mb-2">Lookup</h2>
// // // // // // // // //       <Input
// // // // // // // // //         type="text"
// // // // // // // // //         placeholder="Enter word..."
// // // // // // // // //         value={query}
// // // // // // // // //         onChange={(e) => setQuery(e.target.value)}
// // // // // // // // //         className="mb-2"
// // // // // // // // //       />
// // // // // // // // //       <Button onClick={handleLookup} className="mb-4">
// // // // // // // // //         Search
// // // // // // // // //       </Button>
// // // // // // // // //       {definition && (
// // // // // // // // //         <div className="mb-4">
// // // // // // // // //           <h3 className="font-semibold">Definition</h3>
// // // // // // // // //           <p>{definition}</p>
// // // // // // // // //         </div>
// // // // // // // // //       )}
// // // // // // // // //       {translation && (
// // // // // // // // //         <div>
// // // // // // // // //           <h3 className="font-semibold">Translation</h3>
// // // // // // // // //           <p>{translation}</p>
// // // // // // // // //         </div>
// // // // // // // // //       )}
// // // // // // // // //     </aside>
// // // // // // // // //   )
// // // // // // // // // }

// // // // // // // // // components/DefinitionSidebar.tsx
// // // // // // // // "use client"

// // // // // // // // import { useState } from "react"
// // // // // // // // import { Input } from "@/components/ui/input"
// // // // // // // // import { Button } from "@/components/ui/button"
// // // // // // // // import { FaChevronLeft, FaChevronRight } from "react-icons/fa"

// // // // // // // // export default function DefinitionSidebar() {
// // // // // // // //   const [query, setQuery] = useState("")
// // // // // // // //   const [definition, setDefinition] = useState("")
// // // // // // // //   const [translation, setTranslation] = useState("")
// // // // // // // //   const [isExpanded, setIsExpanded] = useState(true)

// // // // // // // //   const handleLookup = async () => {
// // // // // // // //     // Replace this with your actual API calls to fetch definition and translation.
// // // // // // // //     setDefinition(`Definition for "${query}" (sample data).`)
// // // // // // // //     setTranslation(`Translation for "${query}" (sample data).`)
// // // // // // // //   }

// // // // // // // //   const toggleSidebar = () => {
// // // // // // // //     setIsExpanded((prev) => !prev)
// // // // // // // //   }

// // // // // // // //   return (
// // // // // // // //     <aside
// // // // // // // //       style={{
// // // // // // // //         position: "relative",
// // // // // // // //         transition: "width 0.3s ease",
// // // // // // // //         width: isExpanded ? "300px" : "60px",
// // // // // // // //         borderLeft: "1px solid #ddd",
// // // // // // // //         backgroundColor: "#f9f9f9",
// // // // // // // //         // Reserve extra space on the right so the button area isn’t occupied by the scrollbar
// // // // // // // //         paddingRight: "40px",
// // // // // // // //         overflow: "visible",
// // // // // // // //       }}
// // // // // // // //     >
// // // // // // // //       {/* Scrollable Content */}
// // // // // // // //       <div
// // // // // // // //         style={{
// // // // // // // //           padding: isExpanded ? "1rem" : "0.5rem",
// // // // // // // //           overflowY: "auto",
// // // // // // // //           maxHeight: "100vh",
// // // // // // // //           boxSizing: "border-box",
// // // // // // // //         }}
// // // // // // // //       >
// // // // // // // //         {isExpanded && (
// // // // // // // //           <div>
// // // // // // // //             <h2 className="text-xl font-bold mb-2">Lookup</h2>
// // // // // // // //             <Input
// // // // // // // //               type="text"
// // // // // // // //               placeholder="Enter word..."
// // // // // // // //               value={query}
// // // // // // // //               onChange={(e) => setQuery(e.target.value)}
// // // // // // // //               className="mb-2"
// // // // // // // //             />
// // // // // // // //             <Button onClick={handleLookup} className="mb-4">
// // // // // // // //               Search
// // // // // // // //             </Button>
// // // // // // // //             {definition && (
// // // // // // // //               <div className="mb-4">
// // // // // // // //                 <h3 className="font-semibold">Definition</h3>
// // // // // // // //                 <p>{definition}</p>
// // // // // // // //               </div>
// // // // // // // //             )}
// // // // // // // //             {translation && (
// // // // // // // //               <div>
// // // // // // // //                 <h3 className="font-semibold">Translation</h3>
// // // // // // // //                 <p>{translation}</p>
// // // // // // // //               </div>
// // // // // // // //             )}
// // // // // // // //           </div>
// // // // // // // //         )}
// // // // // // // //       </div>

// // // // // // // //       {/* Toggle Button */}
// // // // // // // //       <button
// // // // // // // //         onClick={toggleSidebar}
// // // // // // // //         style={{
// // // // // // // //           position: "absolute",
// // // // // // // //           top: "10px",
// // // // // // // //           // Place the button inside the reserved padding area
// // // // // // // //           right: "10px",
// // // // // // // //           zIndex: 10,
// // // // // // // //           background: "#fff",
// // // // // // // //           border: "1px solid #ccc",
// // // // // // // //           borderRadius: "50%",
// // // // // // // //           width: "30px",
// // // // // // // //           height: "30px",
// // // // // // // //           cursor: "pointer",
// // // // // // // //           display: "flex",
// // // // // // // //           alignItems: "center",
// // // // // // // //           justifyContent: "center",
// // // // // // // //         }}
// // // // // // // //         aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
// // // // // // // //       >
// // // // // // // //         {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
// // // // // // // //       </button>
// // // // // // // //     </aside>
// // // // // // // //   )
// // // // // // // // }



// // // // // // // // components/DefinitionSidebar.tsx
// // // // // // // "use client"

// // // // // // // import { useState } from "react"
// // // // // // // import { Input } from "@/components/ui/input"
// // // // // // // import { Button } from "@/components/ui/button"
// // // // // // // import { ThemeProvider } from "next-themes"; 
// // // // // // // import { FaChevronLeft, FaChevronRight } from "react-icons/fa"

// // // // // // // export default function DefinitionSidebar() {
// // // // // // //   const [query, setQuery] = useState("")
// // // // // // //   const [definition, setDefinition] = useState("")
// // // // // // //   const [translation, setTranslation] = useState("")
// // // // // // //   const [isExpanded, setIsExpanded] = useState(true)

// // // // // // //   const handleLookup = async () => {
// // // // // // //     // Replace this with your actual API calls to fetch definition and translation.
// // // // // // //     setDefinition(`Definition for "${query}" (sample data).`)
// // // // // // //     setTranslation(`Translation for "${query}" (sample data).`)
// // // // // // //   }

// // // // // // //   const toggleSidebar = () => {
// // // // // // //     setIsExpanded((prev) => !prev)
// // // // // // //   }

// // // // // // //   return (
// // // // // // //     <aside
// // // // // // //       className={`relative transition-width duration-300 overflow-y-auto
// // // // // // //         ${isExpanded ? "w-72 p-4" : "w-16 p-2"} 
// // // // // // //         bg-sidebar dark:bg-sidebar dark:bg-opacity-100 border-l 
// // // // // // //         border-gray-200 dark:border-gray-700`}
// // // // // // //     >
// // // // // // //       {/* Toggle Button */}
// // // // // // //       <button
// // // // // // //         onClick={toggleSidebar}
// // // // // // //         className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
// // // // // // //         aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
// // // // // // //       >
// // // // // // //         {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
// // // // // // //       </button>

// // // // // // //       {isExpanded && (
// // // // // // //         <div>
// // // // // // //           <h2 className="text-xl font-bold mb-2">Lookup</h2>
// // // // // // //           <Input
// // // // // // //             type="text"
// // // // // // //             placeholder="Enter word..."
// // // // // // //             value={query}
// // // // // // //             onChange={(e) => setQuery(e.target.value)}
// // // // // // //             className="mb-2"
// // // // // // //           />
// // // // // // //           <Button onClick={handleLookup} className="mb-4">
// // // // // // //             Search
// // // // // // //           </Button>
// // // // // // //           {definition && (
// // // // // // //             <div className="mb-4">
// // // // // // //               <h3 className="font-semibold">Definition</h3>
// // // // // // //               <p>{definition}</p>
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //           {translation && (
// // // // // // //             <div>
// // // // // // //               <h3 className="font-semibold">Translation</h3>
// // // // // // //               <p>{translation}</p>
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       )}
// // // // // // //     </aside>
// // // // // // //   )
// // // // // // // }




// // // // // // // components/DefinitionSidebar.tsx
// // // // // // "use client"

// // // // // // import { useState } from "react"
// // // // // // import { Input } from "@/components/ui/input"
// // // // // // import { Button } from "@/components/ui/button"
// // // // // // import { FaChevronLeft, FaChevronRight } from "react-icons/fa"

// // // // // // export default function DefinitionSidebar() {
// // // // // //   const [query, setQuery] = useState("")
// // // // // //   const [definition, setDefinition] = useState("")
// // // // // //   const [translation, setTranslation] = useState("")
// // // // // //   const [isExpanded, setIsExpanded] = useState(true)

// // // // // //   const handleLookup = async () => {
// // // // // //     if (!query) return

// // // // // //     // Reset previous results
// // // // // //     setDefinition("")
// // // // // //     setTranslation("")

// // // // // //     // 1. Fetch definition using dictionaryapi.dev
// // // // // //     try {
// // // // // //       const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`)
// // // // // //       if (dictResponse.ok) {
// // // // // //         const dictData = await dictResponse.json()
// // // // // //         // Extract the first definition (adjust based on your needs)
// // // // // //         const firstDefinition = dictData[0]?.meanings?.[0]?.definitions?.[0]?.definition
// // // // // //         setDefinition(firstDefinition || "No definition found.")
// // // // // //       } else {
// // // // // //         setDefinition("No definition found.")
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       console.error("Error fetching definition:", error)
// // // // // //       setDefinition("Error fetching definition.")
// // // // // //     }

// // // // // //     // 2. Fetch translation using LibreTranslate
// // // // // //     try {
// // // // // //       const translateResponse = await fetch("https://libretranslate.de/translate", {
// // // // // //         method: "POST",
// // // // // //         headers: { "Content-Type": "application/json" },
// // // // // //         body: JSON.stringify({
// // // // // //           q: query,
// // // // // //           source: "en",
// // // // // //           target: "es", // Change "es" to your desired target language code
// // // // // //           format: "text"
// // // // // //         })
// // // // // //       })
// // // // // //       if (translateResponse.ok) {
// // // // // //         const translateData = await translateResponse.json()
// // // // // //         setTranslation(translateData.translatedText)
// // // // // //       } else {
// // // // // //         setTranslation("No translation found.")
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       console.error("Error fetching translation:", error)
// // // // // //       setTranslation("Error fetching translation.")
// // // // // //     }
// // // // // //   }

// // // // // //   const toggleSidebar = () => {
// // // // // //     setIsExpanded((prev) => !prev)
// // // // // //   }

// // // // // //   return (
// // // // // //     <aside
// // // // // //       className={`relative transition-width duration-300 overflow-y-auto
// // // // // //         ${isExpanded ? "w-72 p-4" : "w-16 p-2"} 
// // // // // //         bg-sidebar dark:bg-sidebar dark:bg-opacity-100 border-l 
// // // // // //         border-gray-200 dark:border-gray-700`}
// // // // // //     >
// // // // // //       {/* Toggle Button */}
// // // // // //       <button
// // // // // //         onClick={toggleSidebar}
// // // // // //         className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
// // // // // //         aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
// // // // // //       >
// // // // // //         {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
// // // // // //       </button>

// // // // // //       {isExpanded && (
// // // // // //         <div>
// // // // // //           <h2 className="text-xl font-bold mb-2">Lookup</h2>
// // // // // //           <Input
// // // // // //             type="text"
// // // // // //             placeholder="Enter word..."
// // // // // //             value={query}
// // // // // //             onChange={(e) => setQuery(e.target.value)}
// // // // // //             className="mb-2"
// // // // // //           />
// // // // // //           <Button onClick={handleLookup} className="mb-4">
// // // // // //             Search
// // // // // //           </Button>
// // // // // //           {definition && (
// // // // // //             <div className="mb-4">
// // // // // //               <h3 className="font-semibold">Definition</h3>
// // // // // //               <p>{definition}</p>
// // // // // //             </div>
// // // // // //           )}
// // // // // //           {translation && (
// // // // // //             <div>
// // // // // //               <h3 className="font-semibold">Translation</h3>
// // // // // //               <p>{translation}</p>
// // // // // //             </div>
// // // // // //           )}
// // // // // //         </div>
// // // // // //       )}
// // // // // //     </aside>
// // // // // //   )
// // // // // // }


// // // // // // components/DefinitionSidebar.tsx
// // // // // "use client"

// // // // // import { useState } from "react"
// // // // // import { Input } from "@/components/ui/input"
// // // // // import { Button } from "@/components/ui/button"
// // // // // import { FaChevronLeft, FaChevronRight } from "react-icons/fa"
// // // // // import { ImSpinner2 } from "react-icons/im" // Spinner icon for loading state

// // // // // export default function DefinitionSidebar() {
// // // // //   const [query, setQuery] = useState("")
// // // // //   const [definition, setDefinition] = useState("")
// // // // //   const [isExpanded, setIsExpanded] = useState(true)
// // // // //   const [isLoading, setIsLoading] = useState(false)

// // // // //   const handleLookup = async () => {
// // // // //     if (!query.trim()) return

// // // // //     // Reset previous result and start loading
// // // // //     setDefinition("")
// // // // //     setIsLoading(true)

// // // // //     try {
// // // // //       const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`)
// // // // //       if (response.ok) {
// // // // //         const data = await response.json()
// // // // //         // Extract the first definition; adjust this if needed.
// // // // //         const firstDefinition = data[0]?.meanings?.[0]?.definitions?.[0]?.definition
// // // // //         setDefinition(firstDefinition || "No definition found.")
// // // // //       } else {
// // // // //         setDefinition("No definition found.")
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Error fetching definition:", error)
// // // // //       setDefinition("Error fetching definition.")
// // // // //     } finally {
// // // // //       setIsLoading(false)
// // // // //     }
// // // // //   }

// // // // //   const toggleSidebar = () => {
// // // // //     setIsExpanded((prev) => !prev)
// // // // //   }

// // // // //   return (
// // // // //     <aside
// // // // //       className={`relative transition-all duration-300 overflow-y-auto
// // // // //         ${isExpanded ? "w-72 p-4" : "w-16 p-2"}
// // // // //         bg-sidebar dark:bg-sidebar dark:bg-opacity-100 border-l 
// // // // //         border-gray-200 dark:border-gray-700`}
// // // // //     >
// // // // //       {/* Toggle Button */}
// // // // //       <button
// // // // //         onClick={toggleSidebar}
// // // // //         className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
// // // // //         aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
// // // // //       >
// // // // //         {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
// // // // //       </button>

// // // // //       {isExpanded && (
// // // // //         <div>
// // // // //           <h2 className="text-xl font-bold mb-2">Lookup</h2>
// // // // //           <Input
// // // // //             type="text"
// // // // //             placeholder="Enter word..."
// // // // //             value={query}
// // // // //             onChange={(e) => setQuery(e.target.value)}
// // // // //             className="mb-2"
// // // // //           />
// // // // //           <Button onClick={handleLookup} className="mb-4 flex items-center justify-center">
// // // // //             {isLoading && <ImSpinner2 className="animate-spin mr-2" size={18} />}
// // // // //             Search
// // // // //           </Button>
// // // // //           {definition && (
// // // // //             <div className="mb-4">
// // // // //               <h3 className="font-semibold mb-1">Definition</h3>
// // // // //               <p className="text-sm leading-relaxed">{definition}</p>
// // // // //             </div>
// // // // //           )}
// // // // //         </div>
// // // // //       )}
// // // // //     </aside>
// // // // //   )
// // // // // }




// // // // // components/DefinitionSidebar.tsx
// // // // "use client"

// // // // import { useState } from "react"
// // // // import { Input } from "@/components/ui/input"
// // // // import { Button } from "@/components/ui/button"
// // // // import { FaChevronLeft, FaChevronRight } from "react-icons/fa"
// // // // import { ImSpinner2 } from "react-icons/im"

// // // // type DefinitionData = {
// // // //   partOfSpeech: string
// // // //   definitions: Array<{
// // // //     definition: string
// // // //     example?: string
// // // //     synonyms?: string[]
// // // //   }>
// // // // }

// // // // export default function DefinitionSidebar() {
// // // //   const [query, setQuery] = useState("")
// // // //   const [definitions, setDefinitions] = useState<DefinitionData[]>([])
// // // //   const [isExpanded, setIsExpanded] = useState(true)
// // // //   const [isLoading, setIsLoading] = useState(false)
// // // //   const [errorMessage, setErrorMessage] = useState("")

// // // //   const handleLookup = async () => {
// // // //     if (!query.trim()) return

// // // //     // Reset previous results
// // // //     setDefinitions([])
// // // //     setErrorMessage("")
// // // //     setIsLoading(true)

// // // //     try {
// // // //       const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`)
// // // //       if (response.ok) {
// // // //         const data = await response.json()
// // // //         // The API returns an array; we use the first entry.
// // // //         if (data && data.length > 0) {
// // // //           // Extract the meanings which include partOfSpeech and definitions.
// // // //           const meanings: DefinitionData[] = data[0]?.meanings || []
// // // //           if (meanings.length > 0) {
// // // //             setDefinitions(meanings)
// // // //           } else {
// // // //             setErrorMessage("No definitions found.")
// // // //           }
// // // //         } else {
// // // //           setErrorMessage("No definitions found.")
// // // //         }
// // // //       } else {
// // // //         setErrorMessage("No definitions found.")
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Error fetching definition:", error)
// // // //       setErrorMessage("Error fetching definition.")
// // // //     } finally {
// // // //       setIsLoading(false)
// // // //     }
// // // //   }

// // // //   const toggleSidebar = () => {
// // // //     setIsExpanded((prev) => !prev)
// // // //   }

// // // //   return (
// // // //     <aside
// // // //       className={`relative transition-all duration-300 overflow-y-auto
// // // //         ${isExpanded ? "w-72 p-4" : "w-16 p-2"}
// // // //         bg-sidebar dark:bg-sidebar dark:bg-opacity-100 border-l 
// // // //         border-gray-200 dark:border-gray-700`}
// // // //     >
// // // //       {/* Toggle Button */}
// // // //       <button
// // // //         onClick={toggleSidebar}
// // // //         className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
// // // //         aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
// // // //       >
// // // //         {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
// // // //       </button>

// // // //       {isExpanded && (
// // // //         <div>
// // // //           <h2 className="text-xl font-bold mb-2">Lookup</h2>
// // // //           <Input
// // // //             type="text"
// // // //             placeholder="Enter word..."
// // // //             value={query}
// // // //             onChange={(e) => setQuery(e.target.value)}
// // // //             className="mb-2"
// // // //           />
// // // //           <Button onClick={handleLookup} className="mb-4 flex items-center justify-center">
// // // //             {isLoading && <ImSpinner2 className="animate-spin mr-2" size={18} />}
// // // //             Search
// // // //           </Button>

// // // //           {errorMessage && (
// // // //             <p className="mb-4 text-red-600 text-sm">{errorMessage}</p>
// // // //           )}

// // // //           {definitions.length > 0 && (
// // // //             <div className="space-y-4">
// // // //               {definitions.map((meaning, i) => (
// // // //                 <div key={i}>
// // // //                   <h3 className="font-semibold capitalize mb-1">{meaning.partOfSpeech}</h3>
// // // //                   {meaning.definitions.map((def, j) => (
// // // //                     <div key={j} className="mb-3">
// // // //                       <p className="text-sm">{def.definition}</p>
// // // //                       {def.example && (
// // // //                         <p className="text-xs italic text-gray-600 dark:text-gray-400 mt-1">
// // // //                           Example: {def.example}
// // // //                         </p>
// // // //                       )}
// // // //                       {def.synonyms && def.synonyms.length > 0 && (
// // // //                         <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
// // // //                           Synonyms: {def.synonyms.join(", ")}
// // // //                         </p>
// // // //                       )}
// // // //                     </div>
// // // //                   ))}
// // // //                 </div>
// // // //               ))}
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       )}
// // // //     </aside>
// // // //   )
// // // // }



// // // // components/DefinitionSidebar.tsx
// // // "use client"

// // // import { useState } from "react"
// // // import { Input } from "@/components/ui/input"
// // // import { Button } from "@/components/ui/button"
// // // import { FaChevronLeft, FaChevronRight } from "react-icons/fa"
// // // import { ImSpinner2 } from "react-icons/im"

// // // type DefinitionData = {
// // //   partOfSpeech: string
// // //   definitions: Array<{
// // //     definition: string
// // //     example?: string
// // //     synonyms?: string[]
// // //   }>
// // // }

// // // export default function DefinitionSidebar() {
// // //   const [query, setQuery] = useState("")
// // //   const [definitions, setDefinitions] = useState<DefinitionData[]>([])
// // //   const [isExpanded, setIsExpanded] = useState(true)
// // //   const [isLoading, setIsLoading] = useState(false)
// // //   const [errorMessage, setErrorMessage] = useState("")

// // //   const handleLookup = async () => {
// // //     if (!query.trim()) return

// // //     // Reset previous results
// // //     setDefinitions([])
// // //     setErrorMessage("")
// // //     setIsLoading(true)

// // //     try {
// // //       const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`)
// // //       if (response.ok) {
// // //         const data = await response.json()
// // //         if (data && data.length > 0) {
// // //           const meanings: DefinitionData[] = data[0]?.meanings || []
// // //           if (meanings.length > 0) {
// // //             setDefinitions(meanings)
// // //           } else {
// // //             setErrorMessage("No definitions found.")
// // //           }
// // //         } else {
// // //           setErrorMessage("No definitions found.")
// // //         }
// // //       } else {
// // //         setErrorMessage("No definitions found.")
// // //       }
// // //     } catch (error) {
// // //       console.error("Error fetching definition:", error)
// // //       setErrorMessage("Error fetching definition.")
// // //     } finally {
// // //       setIsLoading(false)
// // //     }
// // //   }

// // //   const toggleSidebar = () => {
// // //     setIsExpanded((prev) => !prev)
// // //   }

// // //   return (
// // //     <aside
// // //       className={`relative transition-all duration-300 overflow-y-auto
// // //         ${isExpanded ? "w-72 p-4" : "w-16 p-2"}
// // //         bg-sidebar dark:bg-sidebar dark:bg-opacity-100 border-l 
// // //         border-gray-200 dark:border-gray-700`}
// // //     >
// // //       {/* Toggle Button */}
// // //       <button
// // //         onClick={toggleSidebar}
// // //         className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
// // //         aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
// // //       >
// // //         {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
// // //       </button>

// // //       {isExpanded && (
// // //         <div>
// // //           <h2 className="text-xl font-bold mb-2">Lookup</h2>
// // //           <Input
// // //             type="text"
// // //             placeholder="Enter word..."
// // //             value={query}
// // //             onChange={(e) => setQuery(e.target.value)}
// // //             className="mb-2"
// // //           />
// // //           <Button onClick={handleLookup} className="mb-4 flex items-center justify-center">
// // //             {isLoading && <ImSpinner2 className="animate-spin mr-2" size={18} />}
// // //             Search
// // //           </Button>

// // //           {errorMessage && (
// // //             <p className="mb-4 text-red-600 text-sm">{errorMessage}</p>
// // //           )}

// // //           {definitions.length > 0 && (
// // //             <div className="space-y-6">
// // //               {/* New Title: Display the current query */}
// // //               <h3 className="text-sm text-gray-500 dark:text-gray-400 italic">
// // //                 Results for &ldquo;{query}&rdquo;
// // //               </h3>

// // //               {definitions.map((meaning, i) => (
// // //                 <div key={i}>
// // //                   <h4 className="text-lg font-bold capitalize text-blue-600 border-b pb-1 mb-2">
// // //                     {meaning.partOfSpeech}
// // //                   </h4>
// // //                   <ul className="space-y-4">
// // //                     {meaning.definitions.map((def, j) => (
// // //                       <li key={j} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm">
// // //                         <p className="text-sm text-gray-800 dark:text-gray-200">{def.definition}</p>
// // //                         {def.example && (
// // //                           <p className="text-xs italic text-gray-600 dark:text-gray-400 mt-1">
// // //                             Example: {def.example}
// // //                           </p>
// // //                         )}
// // //                         {def.synonyms && def.synonyms.length > 0 && (
// // //                           <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
// // //                             Synonyms: {def.synonyms.join(", ")}
// // //                           </p>
// // //                         )}
// // //                       </li>
// // //                     ))}
// // //                   </ul>
// // //                 </div>
// // //               ))}
// // //             </div>
// // //           )}
// // //         </div>
// // //       )}
// // //     </aside>
// // //   )
// // // }



// // // components/DefinitionSidebar.tsx
// // "use client"

// // import { useState } from "react"
// // import { Input } from "@/components/ui/input"
// // import { Button } from "@/components/ui/button"
// // import { FaChevronLeft, FaChevronRight } from "react-icons/fa"
// // import { ImSpinner2 } from "react-icons/im"

// // type DefinitionData = {
// //   partOfSpeech: string
// //   definitions: Array<{
// //     definition: string
// //     example?: string
// //     synonyms?: string[]
// //   }>
// // }

// // interface DefinitionSidebarProps {
// //   // Callback to trigger a reflow in the parent after toggling the sidebar.
// //   onToggleSidebar?: () => void
// // }

// // export default function DefinitionSidebar({ onToggleSidebar }: DefinitionSidebarProps) {
// //   const [query, setQuery] = useState("")
// //   const [definitions, setDefinitions] = useState<DefinitionData[]>([])
// //   const [isExpanded, setIsExpanded] = useState(true)
// //   const [isLoading, setIsLoading] = useState(false)
// //   const [errorMessage, setErrorMessage] = useState("")

// //   const handleLookup = async () => {
// //     if (!query.trim()) return

// //     // Reset previous results
// //     setDefinitions([])
// //     setErrorMessage("")
// //     setIsLoading(true)

// //     try {
// //       const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`)
// //       if (response.ok) {
// //         const data = await response.json()
// //         if (data && data.length > 0) {
// //           const meanings: DefinitionData[] = data[0]?.meanings || []
// //           if (meanings.length > 0) {
// //             setDefinitions(meanings)
// //           } else {
// //             setErrorMessage("No definitions found.")
// //           }
// //         } else {
// //           setErrorMessage("No definitions found.")
// //         }
// //       } else {
// //         setErrorMessage("No definitions found.")
// //       }
// //     } catch (error) {
// //       console.error("Error fetching definition:", error)
// //       setErrorMessage("Error fetching definition.")
// //     } finally {
// //       setIsLoading(false)
// //     }
// //   }

// //   // Update the toggleSidebar function to call the onToggleSidebar callback after a delay
// //   const toggleSidebar = () => {
// //     setIsExpanded((prev) => !prev)
// //     // Wait for the CSS transition to finish (300ms) then call the callback.
// //     if (onToggleSidebar) {
// //       setTimeout(() => {
// //         onToggleSidebar()
// //       }, 300)
// //     }
// //   }

// //   return (
// //     <aside
// //       className={`relative transition-all duration-300 overflow-y-auto
// //         ${isExpanded ? "w-72 p-4" : "w-16 p-2"}
// //         bg-sidebar dark:bg-sidebar dark:bg-opacity-100 border-l 
// //         border-gray-200 dark:border-gray-700`}
// //     >
// //       {/* Toggle Button */}
// //       <button
// //         onClick={toggleSidebar}
// //         className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
// //         aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
// //       >
// //         {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
// //       </button>

// //       {isExpanded && (
// //         <div>
// //           <h2 className="text-xl font-bold mb-2">Lookup</h2>
// //           <Input
// //             type="text"
// //             placeholder="Enter word..."
// //             value={query}
// //             onChange={(e) => setQuery(e.target.value)}
// //             className="mb-2"
// //           />
// //           <Button onClick={handleLookup} className="mb-4 flex items-center justify-center">
// //             {isLoading && <ImSpinner2 className="animate-spin mr-2" size={18} />}
// //             Search
// //           </Button>

// //           {errorMessage && (
// //             <p className="mb-4 text-red-600 text-sm">{errorMessage}</p>
// //           )}

// //           {definitions.length > 0 && (
// //             <div className="space-y-6">
// //               {/* New Title: Display the current query */}
// //               <h3 className="text-sm text-gray-500 dark:text-gray-400 italic">
// //                 Results for &ldquo;{query}&rdquo;
// //               </h3>

// //               {definitions.map((meaning, i) => (
// //                 <div key={i}>
// //                   <h4 className="text-lg font-bold capitalize text-blue-600 border-b pb-1 mb-2">
// //                     {meaning.partOfSpeech}
// //                   </h4>
// //                   <ul className="space-y-4">
// //                     {meaning.definitions.map((def, j) => (
// //                       <li key={j} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm">
// //                         <p className="text-sm text-gray-800 dark:text-gray-200">{def.definition}</p>
// //                         {def.example && (
// //                           <p className="text-xs italic text-gray-600 dark:text-gray-400 mt-1">
// //                             Example: {def.example}
// //                           </p>
// //                         )}
// //                         {def.synonyms && def.synonyms.length > 0 && (
// //                           <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
// //                             Synonyms: {def.synonyms.join(", ")}
// //                           </p>
// //                         )}
// //                       </li>
// //                     ))}
// //                   </ul>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </aside>
// //   )
// // }



// // components/DefinitionSidebar.tsx
// "use client"

// import { useState } from "react"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { FaChevronLeft, FaChevronRight } from "react-icons/fa"
// import { ImSpinner2 } from "react-icons/im"

// type DefinitionData = {
//   partOfSpeech: string
//   definitions: Array<{
//     definition: string
//     example?: string
//     synonyms?: string[]
//   }>
// }

// interface DefinitionSidebarProps {
//   // This callback is called when the sidebar toggles (after a delay)
//   onToggleSidebar?: () => void
// }

// export default function DefinitionSidebar({ onToggleSidebar }: DefinitionSidebarProps) {
//   const [query, setQuery] = useState("")
//   const [definitions, setDefinitions] = useState<DefinitionData[]>([])
//   const [isExpanded, setIsExpanded] = useState(true)
//   const [isLoading, setIsLoading] = useState(false)
//   const [errorMessage, setErrorMessage] = useState("")

//   const handleLookup = async () => {
//     if (!query.trim()) return

//     // Reset previous results
//     setDefinitions([])
//     setErrorMessage("")
//     setIsLoading(true)

//     try {
//       const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`)
//       if (response.ok) {
//         const data = await response.json()
//         if (data && data.length > 0) {
//           const meanings: DefinitionData[] = data[0]?.meanings || []
//           if (meanings.length > 0) {
//             setDefinitions(meanings)
//           } else {
//             setErrorMessage("No definitions found.")
//           }
//         } else {
//           setErrorMessage("No definitions found.")
//         }
//       } else {
//         setErrorMessage("No definitions found.")
//       }
//     } catch (error) {
//       console.error("Error fetching definition:", error)
//       setErrorMessage("Error fetching definition.")
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   // When toggling, update local state and then call the callback after the transition delay.
//   const toggleSidebar = () => {
//     setIsExpanded((prev) => !prev)
//     if (onToggleSidebar) {
//       // Delay should match your CSS transition (here 300ms)
//       setTimeout(() => {
//         onToggleSidebar()
//       }, 300)
//     }
//   }

//   return (
//     <aside
//       className={`relative transition-all duration-300 overflow-y-auto
//         ${isExpanded ? "w-72 p-4" : "w-16 p-2"}
//         bg-sidebar dark:bg-sidebar dark:bg-opacity-100 border-l 
//         border-gray-200 dark:border-gray-700`}
//     >
//       {/* Toggle Button */}
//       <button
//         onClick={toggleSidebar}
//         className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
//         aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
//       >
//         {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
//       </button>

//       {isExpanded && (
//         <div>
//           <h2 className="text-xl font-bold mb-2">Lookup</h2>
//           <Input
//             type="text"
//             placeholder="Enter word..."
//             value={query}
//             onChange={(e) => setQuery(e.target.value)}
//             className="mb-2"
//           />
//           <Button onClick={handleLookup} className="mb-4 flex items-center justify-center">
//             {isLoading && <ImSpinner2 className="animate-spin mr-2" size={18} />}
//             Search
//           </Button>

//           {errorMessage && (
//             <p className="mb-4 text-red-600 text-sm">{errorMessage}</p>
//           )}

//           {definitions.length > 0 && (
//             <div className="space-y-6">
//               <h3 className="text-sm text-gray-500 dark:text-gray-400 italic">
//                 Results for &ldquo;{query}&rdquo;
//               </h3>
//               {definitions.map((meaning, i) => (
//                 <div key={i}>
//                   <h4 className="text-lg font-bold capitalize text-blue-600 border-b pb-1 mb-2">
//                     {meaning.partOfSpeech}
//                   </h4>
//                   <ul className="space-y-4">
//                     {meaning.definitions.map((def, j) => (
//                       <li key={j} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm">
//                         <p className="text-sm text-gray-800 dark:text-gray-200">{def.definition}</p>
//                         {def.example && (
//                           <p className="text-xs italic text-gray-600 dark:text-gray-400 mt-1">
//                             Example: {def.example}
//                           </p>
//                         )}
//                         {def.synonyms && def.synonyms.length > 0 && (
//                           <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
//                             Synonyms: {def.synonyms.join(", ")}
//                           </p>
//                         )}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}
//     </aside>
//   )
// }



// components/DefinitionSidebar.tsx
"use client"

import { useState } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { FaChevronLeft, FaChevronRight } from "react-icons/fa"
import { ImSpinner2 } from "react-icons/im"

type DefinitionData = {
  partOfSpeech: string
  definitions: Array<{
    definition: string
    example?: string
    synonyms?: string[]
  }>
}

export default function DefinitionSidebar() {
  const [query, setQuery] = useState("")
  const [definitions, setDefinitions] = useState<DefinitionData[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleLookup = async () => {
    if (!query.trim()) return

    // Reset previous results
    setDefinitions([])
    setErrorMessage("")
    setIsLoading(true)

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          const meanings: DefinitionData[] = data[0]?.meanings || []
          if (meanings.length > 0) {
            setDefinitions(meanings)
          } else {
            setErrorMessage("No definitions found.")
          }
        } else {
          setErrorMessage("No definitions found.")
        }
      } else {
        setErrorMessage("No definitions found.")
      }
    } catch (error) {
      console.error("Error fetching definition:", error)
      setErrorMessage("Error fetching definition.")
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle the sidebar and, after the transition delay, dispatch a resize event
  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev)
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"))
    }, 300)
  }

  return (
    <aside
      className={`relative transition-all duration-300 overflow-y-auto
        ${isExpanded ? "w-72 p-4" : "w-16 p-2"}
        bg-sidebar dark:bg-sidebar dark:bg-opacity-100 border-l 
        border-gray-200 dark:border-gray-700`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
      </button>

      {isExpanded && (
        <div>
          <h2 className="text-xl font-bold mb-2">Lookup</h2>
          <Input
            type="text"
            placeholder="Enter word..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
          />
          <Button onClick={handleLookup} className="mb-4 flex items-center justify-center">
            {isLoading && <ImSpinner2 className="animate-spin mr-2" size={18} />}
            Search
          </Button>

          {errorMessage && (
            <p className="mb-4 text-red-600 text-sm">{errorMessage}</p>
          )}

          {definitions.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-sm text-gray-500 dark:text-gray-400 italic">
                Results for &ldquo;{query}&rdquo;
              </h3>
              {definitions.map((meaning, i) => (
                <div key={i}>
                  <h4 className="text-lg font-bold capitalize text-blue-600 border-b pb-1 mb-2">
                    {meaning.partOfSpeech}
                  </h4>
                  <ul className="space-y-4">
                    {meaning.definitions.map((def, j) => (
                      <li key={j} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{def.definition}</p>
                        {def.example && (
                          <p className="text-xs italic text-gray-600 dark:text-gray-400 mt-1">
                            Example: {def.example}
                          </p>
                        )}
                        {def.synonyms && def.synonyms.length > 0 && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Synonyms: {def.synonyms.join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
