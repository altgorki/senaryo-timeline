import { beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Helper to load an IIFE module file into the current global context
export function loadModule(relativePath) {
  const fullPath = resolve(__dirname, '..', relativePath);
  const code = readFileSync(fullPath, 'utf-8');
  // Execute in the global context so App.* assignments work
  const fn = new Function(code);
  fn();
}

// Set up global App namespace before each test
beforeEach(() => {
  // Reset App namespace
  globalThis.App = {};

  // Provide stub for App.UI.toast (used by validateText in utils.js)
  globalThis.App.UI = {
    toast: () => {}
  };

  // Mock firebase globals that some modules may reference at load time
  globalThis.firebase = {
    auth: () => ({
      onAuthStateChanged: () => {},
      signInWithPopup: () => Promise.resolve(),
      signOut: () => Promise.resolve(),
      currentUser: null
    }),
    database: () => ({
      ref: () => ({
        on: () => {},
        off: () => {},
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        push: () => ({ key: 'mock-key' }),
        once: () => Promise.resolve({ val: () => null })
      })
    }),
    initializeApp: () => {}
  };
});
