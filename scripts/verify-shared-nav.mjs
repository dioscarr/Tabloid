import { readFile } from 'node:fs/promises'

const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
const shell = await readFile(new URL('../src/shared-nav.js', import.meta.url), 'utf8')

if (!entry.includes("import { mountSharedNav } from './shared-nav.js'")) throw new Error('src/main.js must import the shared navigation shell')
if (!entry.includes('mountSharedNav()')) throw new Error('src/main.js must mount the shared navigation shell')
if (!shell.includes("customElements.define('tabloid-shared-nav'")) throw new Error('The shared navigation component is incomplete')

console.log('Shared navigation contract verified')
