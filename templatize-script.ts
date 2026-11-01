import fs from 'node:fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8')) as { engines: { node: string } }
const minNodeVersion = pkg.engines.node.replace(/[^0-9.]/g, '')

const scriptPath = 'dist/script.sh'
fs.writeFileSync(scriptPath, fs.readFileSync(scriptPath, 'utf8').replace('__MIN_NODE_VERSION__', minNodeVersion))
