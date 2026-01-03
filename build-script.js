// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs')
// eslint-disable-next-line no-undef
const content = fs.readFileSync(process.argv[2], 'utf-8');

// Escape special characters for bash
const escapedContent = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$')

// Format as a bash variable
console.log(escapedContent)