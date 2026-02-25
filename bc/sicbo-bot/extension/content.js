// Inject the script into the main page context to access the real WebSocket
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the injected script
window.addEventListener('message', (event) => {
    // Only accept messages from the same window and specific types
    if (event.source !== window || !event.data || event.data.source !== 'FAST_PARITY_INJECTOR') {
        return;
    }

    // Forward the message's payload to the background script
    chrome.runtime.sendMessage(event.data.payload);
});
