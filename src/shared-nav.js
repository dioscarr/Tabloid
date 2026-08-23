const branches = [
  ['main', 'Production', 'https://tabloid.tail70b7f1.ts.net/'],
  ['admin', 'Admin', 'https://tabloid-admin-8c6976.tail70b7f1.ts.net/'],
  ['big-news', 'Big News', 'https://tabloid-big-news-f1a4f4.tail70b7f1.ts.net/'],
  ['tech', 'Tech', 'https://tabloid-tech-fe9bbd.tail70b7f1.ts.net/'],
  ['dashboard', 'Dashboard', 'https://tabloid-dashboard-66cd96.tail70b7f1.ts.net/'],
]

class TabloidSharedNav extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>
        :host { display: block; position: fixed; top: 12px; right: 12px; z-index: 60; }
        button { border: 1px solid #d6d3d1; border-radius: 8px; padding: 8px 10px; background: #fff; color: #1c1917; cursor: pointer; }
        nav { margin-top: 6px; min-width: 180px; padding: 8px; border: 1px solid #d6d3d1; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgb(28 25 23 / 18%); }
        nav[hidden] { display: none; }
        a { display: block; padding: 8px; color: #1c1917; text-decoration: none; }
        a:hover, a:focus-visible { background: #f5f5f4; }
      </style>
      <button type="button" aria-expanded="false">Apps</button>
      <nav hidden>${branches.map(([branch, label, url]) => `<a href="${url}">${label} (${branch})</a>`).join('')}</nav>`
    const button = root.querySelector('button')
    const menu = root.querySelector('nav')
    button.addEventListener('click', () => {
      const open = menu.hidden
      menu.hidden = !open
      button.setAttribute('aria-expanded', String(open))
    })
  }
}

if (!customElements.get('tabloid-shared-nav')) customElements.define('tabloid-shared-nav', TabloidSharedNav)

export const mountSharedNav = () => {
  if (document.querySelector('tabloid-shared-nav')) return
  document.body.prepend(document.createElement('tabloid-shared-nav'))
}
