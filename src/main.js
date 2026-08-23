import './style.css'
import { mountSharedNav } from './shared-nav.js'

const apps = [
  ['brain','Brain','Topology intelligence',50,48,'#a78bfa','healthy','Static gateway'],
  ['admin','Admin','Identity & control',19,23,'#38bdf8','healthy','Static gateway'],
  ['auth','Auth','Authentication provider',50,13,'#f472b6','healthy','Static gateway'],
  ['dashboard','Dashboard','System telemetry',81,23,'#2dd4bf','healthy','Static gateway'],
  ['main','Daily Echo','Production experience',87,65,'#fbbf24','healthy','Dedicated runtime'],
  ['big-news','Big News','Personal intelligence',67,86,'#fb7185','healthy','Static gateway'],
  ['tech','Tech','Developer intelligence',33,86,'#a3e635','healthy','Static gateway'],
  ['logging','Logging','Event pipeline',13,65,'#fb923c','warning','Static gateway'],
].map(([id,name,role,x,y,color,status,runtime])=>({id,name,role,x,y,color,status,runtime}))
const routes = [
  ['brain','admin','HTTPS','/api/v1/branches','healthy',34,'1.2k','Branch inventory'],
  ['brain','auth','OIDC','/oauth/session','healthy',48,'386','Shared identity'],
  ['brain','dashboard','HTTPS','/?app=:branch','healthy',27,'842','Application telemetry'],
  ['brain','main','HTTPS','/','healthy',41,'2.8k','Production surface'],
  ['brain','big-news','HTTPS','/feed','healthy',56,'1.7k','Intelligence feed'],
  ['brain','tech','HTTPS','/discover','healthy',38,'2.1k','Project discovery'],
  ['brain','logging','OTLP','/v1/logs','warning',94,'9.4k','Event observability'],
  ['admin','auth','OIDC','/oauth/callback','healthy',51,'214','Admin access'],
  ['dashboard','logging','HTTPS','/api/events','warning',107,'4.6k','Runtime events'],
  ['big-news','tech','JSON','/api/signals','healthy',45,'721','Shared tech signals'],
].map(([from,to,protocol,path,health,latency,traffic,dependency])=>({from,to,protocol,path,health,latency,traffic,dependency}))
const getApp=id=>apps.find(x=>x.id===id)
let selected='brain', filter='all'

document.title='Brain | Tabloid'
document.querySelector('#app').innerHTML=`<div class="shell"><header class="topbar"><a class="brand" href="#top"><span class="brand-mark">B</span><span><b>Brain</b><small>System intelligence</small></span></a><div class="top-actions"><span class="live"><i></i> Neural map live</span><span data-shared-nav-slot></span><button class="avatar">DR</button></div></header><main id="top">
<section class="hero"><div><p class="kicker">Your system, understood</p><h1>Every connection.<br><span>One living brain.</span></h1><p class="intro">Explore how your applications talk, depend on one another, and behave as a single organism.</p></div><div class="pulse-card"><span class="pulse-orb"><i></i></span><div><small>System pulse</small><strong>98.7</strong><p>Strong · 1 route needs attention</p></div></div></section>
<section class="metrics" aria-label="Topology summary">${[['Connected apps','8','All discovered'],['Active routes','10','9 healthy'],['Flow · 24h','23.9k','↑ 12.4%'],['Median latency','47 ms','Across all routes']].map(x=>`<article><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('')}</section>
<section class="workspace"><div class="section-head"><div><p class="kicker">Neural topology</p><h2>Connection map</h2><p>Select a node to trace every route in and out.</p></div><div class="filters" role="group"><button data-filter="all" class="active">All</button><button data-filter="healthy">Healthy</button><button data-filter="warning">Attention</button></div></div><div class="map-grid"><div class="graph"><div class="graph-toolbar"><span><i class="legend healthy"></i> Healthy</span><span><i class="legend warning"></i> Attention</span><span class="prototype">Prototype telemetry</span></div><svg id="lines" class="lines" viewBox="0 0 1000 620" preserveAspectRatio="none"></svg><div id="nodes" class="nodes"></div></div><aside id="inspector" class="inspector" aria-live="polite"></aside></div></section>
<section class="routes"><div class="section-head compact"><div><p class="kicker">Route registry</p><h2>How everything connects</h2></div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Search app, path, or protocol" aria-label="Search routes"></label></div><div class="table-wrap"><table><thead><tr><th>Connection</th><th>Protocol & path</th><th>Dependency</th><th>Health</th><th>Latency</th><th>Traffic · 24h</th></tr></thead><tbody id="route-body"></tbody></table></div></section><footer><span>Brain / topology prototype</span><span>Static demo data · live collectors are not connected yet</span></footer></main></div>`
mountSharedNav()

function renderGraph(){
  document.querySelector('#lines').innerHTML=routes.map((r,i)=>{const a=getApp(r.from),b=getApp(r.to),visible=filter==='all'||r.health===filter,related=selected===r.from||selected===r.to;return `<line x1="${a.x*10}" y1="${a.y*6.2}" x2="${b.x*10}" y2="${b.y*6.2}" class="edge ${r.health} ${related?'related':''} ${visible?'':'hidden'}"/><circle class="packet ${r.health} ${visible?'':'hidden'}" r="4"><animateMotion dur="${3+i%4}s" repeatCount="indefinite" path="M ${a.x*10} ${a.y*6.2} L ${b.x*10} ${b.y*6.2}"/></circle>`}).join('')
  document.querySelector('#nodes').innerHTML=apps.map(a=>{const related=routes.some(r=>(r.from===selected&&r.to===a.id)||(r.to===selected&&r.from===a.id));return `<button class="node ${a.id===selected?'selected':''} ${a.id!==selected&&!related?'dim':''}" style="--x:${a.x}%;--y:${a.y}%;--node:${a.color}" data-node="${a.id}" aria-pressed="${a.id===selected}"><span class="node-core">${a.name.slice(0,2).toUpperCase()}</span><span class="node-copy"><b>${a.name}</b><small>${a.role}</small></span></button>`}).join('')
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>select(b.dataset.node))
}
function renderInspector(){
  const a=getApp(selected), connected=routes.filter(r=>r.from===selected||r.to===selected),avg=Math.round(connected.reduce((s,r)=>s+r.latency,0)/(connected.length||1))
  document.querySelector('#inspector').innerHTML=`<div class="inspector-top"><span class="detail-icon" style="--node:${a.color}">${a.name.slice(0,2).toUpperCase()}</span><div><small>Selected node</small><h3>${a.name}</h3><p>${a.role}</p></div><span class="status ${a.status}">${a.status==='healthy'?'Healthy':'Attention'}</span></div><div class="detail-stats"><div><span>Connections</span><strong>${connected.length}</strong></div><div><span>Avg latency</span><strong>${avg} ms</strong></div><div><span>Runtime</span><strong>${a.runtime}</strong></div></div><h4>Connected routes</h4><div class="connected-list">${connected.map(r=>{const incoming=r.to===selected,p=getApp(incoming?r.from:r.to);return `<button data-peer="${p.id}"><span class="peer-icon" style="--node:${p.color}">${p.name[0]}</span><span><b>${incoming?'←':'→'} ${p.name}</b><small>${r.protocol} · ${r.path}</small></span><i class="route-dot ${r.health}"></i></button>`}).join('')||'<p>No registered routes.</p>'}</div><div class="insight"><span>✦</span><div><b>Topology insight</b><p>${selected==='brain'?'Brain reaches every core product directly. Logging is the only degraded path and adds 47 ms above median.':`${a.name} has ${connected.length} registered connection${connected.length===1?'':'s'}. Select a peer to continue tracing the graph.`}</p></div></div>`
  document.querySelectorAll('[data-peer]').forEach(b=>b.onclick=()=>select(b.dataset.peer))
}
function renderRoutes(q=''){
  const needle=q.toLowerCase(),list=routes.filter(r=>filter==='all'||r.health===filter).filter(r=>`${getApp(r.from).name} ${getApp(r.to).name} ${r.protocol} ${r.path} ${r.dependency}`.toLowerCase().includes(needle))
  document.querySelector('#route-body').innerHTML=list.map(r=>`<tr class="${r.from===selected||r.to===selected?'selected-row':''}"><td><div class="connection"><span style="--node:${getApp(r.from).color}">${getApp(r.from).name[0]}</span><b>${getApp(r.from).name}</b><i>→</i><span style="--node:${getApp(r.to).color}">${getApp(r.to).name[0]}</span><b>${getApp(r.to).name}</b></div></td><td><strong class="protocol">${r.protocol}</strong><code>${r.path}</code></td><td>${r.dependency}</td><td><span class="status ${r.health}">${r.health==='healthy'?'Healthy':'Attention'}</span></td><td><b>${r.latency} ms</b></td><td>${r.traffic}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No routes match this view.</td></tr>'
}
function select(id){selected=id;renderGraph();renderInspector();renderRoutes(document.querySelector('#search').value)}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderGraph();renderRoutes(document.querySelector('#search').value)})
document.querySelector('#search').oninput=e=>renderRoutes(e.target.value)
renderGraph();renderInspector();renderRoutes()
