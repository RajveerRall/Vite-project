// // import React, { useEffect, useState } from "react";
// // import { motion } from "framer-motion";

// // const sampleText = "Tsiory waited, and, as expected, Colonel Dayo Okello chimed in.";

// // const WritingAnimation = () => {
// //   const [words, setWords] = useState<string[]>([]);

// //   useEffect(() => {
// //     setWords(sampleText.split(" ")); // Prevents re-renders
// //   }, []);

// //   const wordAnimation = {
// //     hidden: { opacity: 0, y: 10 },
// //     visible: (index: number) => ({
// //       opacity: 1,
// //       y: 0,
// //       transition: {
// //         delay: index * 0.2, // Adjust animation speed
// //         duration: 0.5,
// //       },
// //     }),
// //   };

// //   return (
// //     <div
// //       className="flex items-center justify-center min-h-screen w-full bg-cover bg-center bg-no-repeat p-8"
// //       style={{
// //         backgroundImage: "url('/images/olderpaper.jpg')",
// //         backgroundSize: "cover",
// //         backgroundPosition: "center",
// //       }}
// //     >
// //       <motion.div
// //         initial="hidden"
// //         animate="visible"
// //         className="text-3xl font-serif leading-relaxed text-white bg-black/50 p-6 rounded-md shadow-md"
// //       >
// //         {words.map((word, index) => (
// //           <motion.span
// //             key={index}
// //             custom={index}
// //             variants={wordAnimation}
// //             className="inline-block mr-2"
// //           >
// //             {word}
// //           </motion.span>
// //         ))}
// //       </motion.div>
// //     </div>
// //   );
// // };

// // export default WritingAnimation;



// import React, { useEffect, useState } from "react";
// import { motion } from "framer-motion";

// const sampleText = "Tsiory waited, and, as expected, Colonel Dayo Okello chimed in.";

// const WritingAnimation = () => {
//   const [displayedText, setDisplayedText] = useState(""); // Stores animated text
//   const [currentIndex, setCurrentIndex] = useState(0); // Current character index

//   useEffect(() => {
//     if (currentIndex < sampleText.length) {
//       const timeout = setTimeout(() => {
//         setDisplayedText((prev) => prev + sampleText[currentIndex]); // Add one character
//         setCurrentIndex(currentIndex + 1);
//       }, 100); // Adjust this delay for typing speed

//       return () => clearTimeout(timeout);
//     }
//   }, [currentIndex]);

//   return (
//     <div
//       className="flex items-center justify-center min-h-screen w-full bg-cover bg-center bg-no-repeat p-8"
//       style={{
//         backgroundImage: "url('/images/olderpaper.jpg')",
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       <motion.div
//         className="text-3xl font-serif leading-relaxed text-white bg-black/50 p-6 rounded-md shadow-md"
//       >
//         {displayedText}
//         {/* <span className="animate-pulse">|</span> Blinking cursor */}
//       </motion.div>
//     </div>
//   );
// };

// export default WritingAnimation;



import React, { useEffect, useState, useRef } from "react";

const sampleText = "Tsiory waited, and, as expected, Colonel Dayo Okello chimed in.";

const WritingAnimation = () => {
  const [displayedText, setDisplayedText] = useState(""); // Stores animated text
  const [currentIndex, setCurrentIndex] = useState(0); // Current character index
  const [charInterval, setCharInterval] = useState(100); // Default typing speed
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support speech synthesis.");
      return;
    }

    synthRef.current = window.speechSynthesis;
    utteranceRef.current = new SpeechSynthesisUtterance(sampleText);

    // When speech starts, calculate the time for typing effect
    utteranceRef.current.onstart = () => {
      const estimatedDuration = (sampleText.split(" ").length * 500); // Roughly 500ms per word
      setCharInterval(estimatedDuration / sampleText.length);
    };

    // When speech ends, ensure text finishes
    utteranceRef.current.onend = () => {
      setDisplayedText(sampleText);
    };

    // Start speech synthesis
    synthRef.current.speak(utteranceRef.current);
  }, []);

  useEffect(() => {
    if (currentIndex < sampleText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + sampleText[currentIndex]); // Add one character
        setCurrentIndex(currentIndex + 1);
      }, charInterval);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, charInterval]);

  return (
    <div
      className="flex items-center justify-center min-h-screen w-full bg-cover bg-center bg-no-repeat p-8"
      style={{
        backgroundImage: "url('/images/olderpaper.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="text-3xl font-serif leading-relaxed text-white bg-black/50 p-6 rounded-md shadow-md">
        {displayedText}
      </div>
    </div>
  );
};

export default WritingAnimation;
