'use strict';

/**
 * Finds declarations that are never referenced anywhere else in the project, and
 * CSS rules whose class name never appears in the sources that use them.
 *
 * Read-only: it prints a report, it does not change anything.
 *
 *   node tools/find-dead-code.js
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const APPS = ['angular/client', 'angular/admin'];

/** Every file we consider a usage source (templates count as usage). */
function collectFiles(dir, extensions, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, extensions, out);
    else if (extensions.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

function report(label, findings) {
  console.log(`\n=== ${label} ===`);
  if (!findings.length) {
    console.log('  none');
    return;
  }
  for (const item of findings) console.log(`  ${item}`);
}

// ---------------------------------------------------------------------------
// 1. Class members that are declared but never used
// ---------------------------------------------------------------------------
console.log('Dead code report for PROG2002-A3');

const unusedMembers = [];

for (const app of APPS) {
  const srcDir = path.join(ROOT, app, 'src', 'app');
  if (!fs.existsSync(srcDir)) continue;

  const tsFiles = collectFiles(srcDir, ['.ts']);
  const htmlFiles = collectFiles(srcDir, ['.html']);

  // All templates plus all TypeScript, so a member used only in a template counts.
  const allText = [...tsFiles, ...htmlFiles]
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');

  for (const file of tsFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(ROOT, file);

    // protected/private class members: name = ... at the start of a line
    const memberPattern = /^\s{2}(?:protected|private)\s+(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*[=(:]/gm;
    for (const match of source.matchAll(memberPattern)) {
      const name = match[1];
      // Count references outside the declaration line itself.
      const occurrences = (allText.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
      if (occurrences <= 1) {
        unusedMembers.push(`${relative}: member "${name}"`);
      }
    }
  }
}
report('Unused class members (no reference anywhere, including templates)', unusedMembers);

// ---------------------------------------------------------------------------
// 2. Unused CSS classes inside component stylesheets
// ---------------------------------------------------------------------------
const unusedClasses = [];

for (const app of APPS) {
  const srcDir = path.join(ROOT, app, 'src', 'app');
  if (!fs.existsSync(srcDir)) continue;

  for (const cssFile of collectFiles(srcDir, ['.css'])) {
    const css = fs.readFileSync(cssFile, 'utf8');
    const relative = path.relative(ROOT, cssFile);

    // The template of the same component, plus other templates that might use it.
    const htmlFile = cssFile.replace(/\.css$/, '.html');
    const template = fs.existsSync(htmlFile) ? fs.readFileSync(htmlFile, 'utf8') : '';
    const allTemplates = collectFiles(srcDir, ['.html'])
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n');

    for (const match of css.matchAll(/\.([a-z][a-z0-9_-]*)/gi)) {
      const className = match[1];
      const inOwnTemplate = new RegExp(`\\b${className}\\b`).test(template);
      const inAnyTemplate = new RegExp(`\\b${className}\\b`).test(allTemplates);
      if (!inAnyTemplate) {
        unusedClasses.push(`${relative}: .${className} (in no template)`);
      } else if (!inOwnTemplate) {
        unusedClasses.push(`${relative}: .${className} (used by another template only)`);
      }
    }
  }
}
report('CSS classes not referenced by any template', [...new Set(unusedClasses)]);

// ---------------------------------------------------------------------------
// 3. Unused top-level exports / imports that are never referenced
// ---------------------------------------------------------------------------
const unusedImports = [];

for (const app of APPS) {
  const srcDir = path.join(ROOT, app, 'src');
  if (!fs.existsSync(srcDir)) continue;

  for (const file of collectFiles(srcDir, ['.ts'])) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(ROOT, file);
    // Named imports from Angular / rxjs / local modules
    for (const match of source.matchAll(/^import\s*\{([^}]+)\}\s*from/gm)) {
      const names = match[1].split(',').map((n) => n.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
      const body = source.slice(match.index + match[0].length);
      for (const name of names) {
        const used = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`).test(body);
        if (!used) unusedImports.push(`${relative}: import { ${name} }`);
      }
    }
  }
}
report('Imported symbols never used in the importing file', unusedImports);

console.log('\nDone. Review each line before deleting: templates and dynamic class names can hide real usage.');
