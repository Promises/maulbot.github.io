#!/usr/bin/env node
/*
 * Writes build/wc3-lobbies/index.html: the app's page with a robots meta tag in it, so a crawler
 * that never runs the app still sees that the hidden lobby page is not to be indexed. GitHub Pages
 * serves it for /wc3-lobbies, where every other deep link gets 404.html. Runs after the build.
 */
const fs = require('fs');
const path = require('path');

const build = path.join(__dirname, '..', 'build');
const page = fs.readFileSync(path.join(build, 'index.html'), 'utf8');
if (!page.includes('<head>')) {
    console.error('build/index.html has no <head> to put the robots meta tag in');
    process.exit(1);
}

const hidden = page.replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');
fs.mkdirSync(path.join(build, 'wc3-lobbies'), {recursive: true});
fs.writeFileSync(path.join(build, 'wc3-lobbies', 'index.html'), hidden);
