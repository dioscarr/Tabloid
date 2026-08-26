import './style.css'
import { mountSharedNav } from './shared-nav.js'
import { initializeContentAdapter } from './content-adapter.js'

const nodes = [
  [12, 38, 'violet'], [19, 22, 'cyan'], [28, 47, 'mint'], [35, 14, 'violet'],
  [43, 31, 'gold'], [50, 55, 'cyan'], [57, 19, 'mint'], [65, 42, 'violet'],
  [74, 14, 'cyan'], [83, 35, 'mint'], [80, 60, 'gold'], [65, 71, 'violet'],
  [46, 76, 'cyan'], [28, 69, 'mint'], [17, 57, 'violet'],
]

document.title = 'Brain | Tabloid'
document.querySelector('#app').innerHTML = `
  <div class="brain-landing">
    <header class="topbar">
      <a class="brand" href="#top"><span class="brand-mark" aria-hidden="true">B</span><span><b>Brain</b><small>Tabloid neural layer</small></span></a>
      <div class="top-actions"><span class="landing-status">Private workspace</span><span data-shared-nav-slot></span></div>
    </header>
    <main id="top">
      <section class="neural-stage" aria-labelledby="brain-title">
        <div class="neural-copy">
          <p class="kicker">Spatial intelligence</p>
          <h1 id="brain-title">A place for<br><span>connected thought.</span></h1>
          <p>Brain is the private coordination layer for Tabloid. Its capabilities become available here only when protected server APIs are connected.</p>
          <div class="availability"><span aria-hidden="true">◌</span><div><strong>Capability surface offline</strong><small>Tools, skills, activity, and telemetry require an authenticated server session.</small></div></div>
        </div>
        <div class="brain-visual" role="img" aria-label="Abstract neural brain made of glowing connected nodes">
          <svg viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true">
            <path class="outline" d="M18 30C25 8 43 6 55 15C75 4 92 20 85 37C97 51 87 76 69 75C56 89 32 83 30 67C10 62 7 43 18 30Z"/>
            <path class="signal a" d="M12 38 28 47 43 31 57 19 74 14"/>
            <path class="signal b" d="M19 22 35 14 43 31 50 55 65 71"/>
            <path class="signal c" d="M17 57 28 69 46 76 50 55 65 42 83 35"/>
            <path class="signal d" d="M28 47 65 42 80 60"/>
          </svg>
          ${nodes.map(([x, y, tone], index) => `<i class="neuron ${tone}" style="--x:${x}%;--y:${y}%;--delay:-${index * .28}s"></i>`).join('')}
          <span class="orbital one"></span><span class="orbital two"></span>
          <span class="visual-label">Neural field <b>◌</b></span>
        </div>
      </section>
      <section class="boundary-note"><span aria-hidden="true">◇</span><div><strong>Designed for protected connection</strong><p>The browser never receives service credentials or privileged tool access. When server-backed capabilities are ready, they will be exposed through an authenticated API.</p></div></section>
    </main>
  </div>
`

mountSharedNav()
initializeContentAdapter('brain')
