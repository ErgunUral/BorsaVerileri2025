// Setup Node.js globals for jsdom environment
const { TextEncoder, TextDecoder } = require('util');

// Add Node.js globals to jsdom environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add other Node.js globals if needed
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = setTimeout;
}

if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = clearTimeout;
}

// Add Buffer if not available
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}