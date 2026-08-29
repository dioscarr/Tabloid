import { readFile } from 'node:fs/promises'

const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
const shell = await readFile(new URL('../src/shared-nav.js', import.meta.url), 'utf8')

if (!entry.includes("import { mountSharedNav } from './shared-nav.js'")) throw new Error('src/main.js must import the shared navigation shell')
if (!entry.includes('mountSharedNav()')) throw new Error('src/main.js must mount the shared navigation shell')
if (!shell.includes("customElements.define('tabloid-shared-nav'")) throw new Error('The shared navigation component is incomplete')
if (!entry.includes('data-shared-nav-slot') && !shell.includes("querySelector('#apps-button')")) throw new Error('The app must provide a shared navigation slot or legacy launcher target')
for (const required of ['Vibe', 'tabloid-vibe', 'Brain Studio', 'customElements.define']) {
  if (!shell.includes(required)) throw new Error(`The shared navigation is missing required launcher behavior: ${required}`)
}

console.log('Shared navigation contract verified')
