import { readFile } from 'node:fs/promises'

const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8')
const header = await readFile(new URL('../src/components/SiteHeader.astro', import.meta.url), 'utf8')
const shell = await readFile(new URL('../src/shared-nav.js', import.meta.url), 'utf8')

if (!layout.includes("import { mountSharedNav } from '../shared-nav.js'")) throw new Error('BaseLayout must import the shared navigation shell')
if (!layout.includes('mountSharedNav()')) throw new Error('BaseLayout must mount the shared navigation shell')
if (!header.includes('data-shared-nav-slot')) throw new Error('The rendered site header must provide a shared navigation slot')
if (!shell.includes("customElements.define('tabloid-shared-nav'")) throw new Error('The shared navigation component is incomplete')

console.log('Shared navigation contract verified')
