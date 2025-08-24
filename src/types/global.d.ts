// src/types/global.d.ts

interface Window {
  gtag: (...args: any[]) => void;
  dataLayer: any[];
  amplitude: {
    track: (eventName: string, eventProperties?: Record<string, any>) => void;
    setUserId: (userId: string) => void;
    setUserProperties: (properties: Record<string, any>) => void;
    add: (plugin: any) => void;
    init: (apiKey: string, options?: any) => void;
  };
  sessionReplay: {
    plugin: (options: any) => any;
  };
}