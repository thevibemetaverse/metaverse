// Polyfill for simple-peer
if (typeof global === 'undefined') {
    window.global = window;
}

// Additional polyfills if needed
if (typeof process === 'undefined') {
    window.process = {
        env: {},
        browser: true,
        version: '',
        platform: 'browser',
        nextTick: (fn) => setTimeout(fn, 0)
    };
} 