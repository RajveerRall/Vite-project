// src/types/global.d.ts

// This tells TypeScript that we are extending the global Window interface.
declare global {
  interface Window {
    // We are telling TS that the window object might have a gtag property.
    // This function can be called in two ways based on Google's docs:
    // gtag('js', new Date());
    // gtag('event', 'event_name', { ...params });
    gtag?: (
      command: 'config' | 'event' | 'js',
      target: string | Date,
      params?: { [key: string]: any }
    ) => void;
  }
}

// This export statement is needed to make the file a module.
export {};