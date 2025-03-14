// // components/DarkModeToggle.tsx
// "use client";

// import { useTheme } from "next-themes";
// import { Sun, Moon } from "lucide-react"; // You can use any icon library

// export default function DarkModeToggle() {
//   const { theme, setTheme } = useTheme();

//   return (
//     <button
//       onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
//       className="p-2 rounded focus:outline-none bg-gray-200 dark:bg-gray-700"
//       aria-label="Toggle Dark Mode"
//     >
//       {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
//     </button>
//   );
// }

// src/components/DarkModeToggle.tsx
import React from "react";
import { useTheme } from "./theme-provider";
import { Sun, Moon } from "lucide-react";

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  
  // Add console log to verify theme value
  console.log("Current theme:", theme);

  return (
    <button
      onClick={() => {
        const newTheme = theme === "dark" ? "light" : "dark";
        console.log("Setting theme to:", newTheme);
        setTheme(newTheme);
      }}
      className="p-2 rounded-md bg-gray-200 dark:bg-gray-700"
      aria-label="Toggle Dark Mode"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}