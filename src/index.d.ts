interface Window {
  __INITIAL_DATA__?: unknown;
  webkit?: {
    messageHandlers?: {
      customEvent?: {
        postMessage?: (message: any) => void;
      };
    };
  };
}
