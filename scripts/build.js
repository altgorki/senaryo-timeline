#!/usr/bin/env node

/**
 * Build script for Senaryo Timeline Editörü
 *
 * Reads src/index.html, inlines CSS from css/ and JS from js/,
 * produces a single self-contained public/index.html for Firebase Hosting.
 *
 * Usage: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const CSS_DIR = path.join(SRC, 'css');
const JS_DIR = path.join(SRC, 'js');
const OUT_DIR = path.join(ROOT, 'public');

// Ordered JS modules — order matters for dependency resolution
// bootstrap.js MUST come first (defines const App = {} and firebaseConfig)
// app.js MUST come last (init IIFE depends on all modules)
// Order matches original index.html module sequence
const JS_FILES = [
  'bootstrap.js',
  'utils.js',
  'store.js',
  'ui.js',
  'mention.js',
  'auth.js',
  'autosave.js',
  'projects.js',
  'timeline.js',
  'screenplay.js',
  'screenplay-editor.js',
  'interaction.js',
  'panels.js',
  'analysis.js',
  'changelog.js',
  'notes.js',
  'ai.js',
  'io.js',
  'sync.js',
  'app.js'
];

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')   // Remove comments
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .replace(/\s*([{}:;,>+~])\s*/g, '$1') // Remove space around selectors
    .replace(/;}/g, '}')                 // Remove trailing semicolons
    .trim();
}

function build() {
  console.log('[build] Starting...');

  // Check if src/ directory exists (modular mode)
  const useSrc = fs.existsSync(SRC) && fs.existsSync(path.join(SRC, 'index.html'));

  if (!useSrc) {
    // Fallback: Just copy root index.html to public/
    console.log('[build] No src/ directory found. Copying index.html to public/');
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(OUT_DIR, 'index.html'));
    console.log('[build] Done! public/index.html updated.');
    return;
  }

  // Read the HTML shell
  let html = readFile(path.join(SRC, 'index.html'));

  // Inline CSS
  if (fs.existsSync(CSS_DIR)) {
    const cssFiles = fs.readdirSync(CSS_DIR).filter(f => f.endsWith('.css')).sort();
    if (cssFiles.length) {
      let allCSS = cssFiles.map(f => readFile(path.join(CSS_DIR, f))).join('\n');
      allCSS = minifyCSS(allCSS);
      html = html.replace('/* __CSS_PLACEHOLDER__ */', allCSS);
      console.log(`[build] Inlined ${cssFiles.length} CSS files (${(allCSS.length / 1024).toFixed(1)}KB)`);
    }
  }

  // Inline JS
  if (fs.existsSync(JS_DIR)) {
    const jsContent = JS_FILES
      .filter(f => fs.existsSync(path.join(JS_DIR, f)))
      .map(f => {
        const content = readFile(path.join(JS_DIR, f));
        return `// ── ${f} ──\n${content}`;
      })
      .join('\n\n');

    html = html.replace('/* __JS_PLACEHOLDER__ */', jsContent);
    console.log(`[build] Inlined ${JS_FILES.length} JS modules (${(jsContent.length / 1024).toFixed(1)}KB)`);
  }

  // Write output
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf8');

  const size = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`[build] Done! public/index.html (${size}KB)`);
}

build();
