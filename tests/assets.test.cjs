'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCES = [
  'index.html',
  'game.js',
  'motorcycle.js',
  'android/app/src/main/game/android-layout.css',
];
const MEDIA = /\bassets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|gif|webp|svg|mp4|webm|mp3|ogg|wav)\b/gi;

function checkLocalAsset(ref) {
  const normalized = path.posix.normalize(ref.split(/[?#]/)[0]);
  assert.ok(!normalized.startsWith('../') && !path.isAbsolute(normalized),
    'Asset path escapes the project: ' + ref);
  const filename = path.join(ROOT, normalized);
  assert.ok(fs.existsSync(filename), 'Missing referenced file: ' + ref);
  assert.ok(fs.statSync(filename).isFile(), 'Not a file: ' + ref);
  assert.ok(fs.statSync(filename).size > 0, 'Empty referenced file: ' + ref);
}

test('static game media references exist and are nonempty', () => {
  const references = new Set();
  for (const source of SOURCES) {
    const filename = path.join(ROOT, source);
    assert.ok(fs.existsSync(filename), 'Missing source: ' + source);
    const code = fs.readFileSync(filename, 'utf8');
    for (const match of code.matchAll(MEDIA)) references.add(match[0]);
  }
  assert.ok(references.size >= 20, 'Expected multiple assets; check the reference scanner');
  for (const ref of references) checkLocalAsset(ref);
});

test('HTML local entrypoint resources exist and are nonempty', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const sourceTag = /<(?:img|video|script)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  const references = [...html.matchAll(sourceTag)]
    .map(match => match[1].split(/[?#]/)[0])
    .filter(ref => !/^(?:https?:|data:|blob:|\/\/)/i.test(ref));
  assert.ok(references.includes('game.js'), 'Missing game.js entrypoint');
  assert.ok(references.includes('motorcycle.js'), 'Missing motorcycle.js entrypoint');
  assert.ok(references.length >= 3, 'Expected HTML entrypoint assets');
  for (const ref of references) checkLocalAsset(ref);
});
