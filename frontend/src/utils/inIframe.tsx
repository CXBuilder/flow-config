export const inIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    // Error can be thrown when in a cross-origin iframe, so assume iframed
    return true;
  }
};
