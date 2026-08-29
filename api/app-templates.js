export const appTemplates = Object.freeze([
  Object.freeze({
    id: 'tabloid-vite',
    name: 'Tabloid Vite application',
    description: 'A governed branch-based Vite and Tailwind application using the shared navigation contract.',
    kind: 'static-web',
  }),
  Object.freeze({
    id: 'admin-control-plane',
    name: 'Admin control-plane application',
    description: 'A private Admin application foundation with server-side authorization boundaries.',
    kind: 'admin-web',
  }),
])

export const getAppTemplate = (templateId) => appTemplates.find((template) => template.id === templateId) || null

export const reservedAppIdentities = Object.freeze(new Set([
  'admin',
  'api',
  'auth',
  'big-news',
  'daily-echo',
  'default',
  'main',
  'root',
  'system',
  'tabloid',
  'tailscale',
  'tech',
  'www',
]))
