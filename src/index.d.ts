interface Window {
  __INITIAL_DATA__?: any;
  webkit?: {
    messageHandlers?: {
      customEvent?: {
        postMessage?: (message: any) => void;
      };
    };
  };
}
