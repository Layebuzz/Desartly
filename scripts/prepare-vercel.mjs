import{rename}from'node:fs/promises';
// A physical index.html takes precedence over Vercel's root rewrite.
await rename(new URL('../dist/index.html',import.meta.url),new URL('../dist/shell.html',import.meta.url));
