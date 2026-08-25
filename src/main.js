import './style.css'
import { mountSharedNav } from './shared-nav.js'
import { initializeContentAdapter } from './content-adapter.js'

const BRAIN_API='https://tabloid-brain-api.tail70b7f1.ts.net'
const escapeHtml=value=>String(value).replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[character])

const apps = [
  ['brain','Brain','Topology intelligence',50,48,'#a78bfa','healthy','Static gateway'],
  ['admin','Admin','Identity & control',19,23,'#38bdf8','healthy','Static gateway'],
  ['auth','Auth','Authentication provider',50,13,'#f472b6','healthy','Static gateway'],
  ['dashboard','Dashboard','System telemetry',81,23,'#2dd4bf','healthy','Static gateway'],
  ['main','Daily Echo','Production experience',87,65,'#fbbf24','healthy','Dedicated runtime'],
  ['big-news','Big News','Personal intelligence',67,86,'#fb7185','healthy','Static gateway'],
  ['ai-news','AI News','AI project intelligence',86,48,'#fb7185','healthy','Static gateway'],
  ['tech','Tech','Developer intelligence',33,86,'#a3e635','healthy','Static gateway'],
  ['logging','Logging','Event pipeline',13,65,'#fb923c','warning','Static gateway'],
].map(([id,name,role,x,y,color,status,runtime])=>({id,name,role,x,y,color,status,runtime}))
const routes = [
  ['brain','admin','HTTPS','/api/v1/branches','healthy',34,'1.2k','Branch inventory'],
  ['brain','auth','OIDC','/oauth/session','healthy',48,'386','Shared identity'],
  ['brain','dashboard','HTTPS','/?app=:branch','healthy',27,'842','Application telemetry'],
  ['brain','main','HTTPS','/','healthy',41,'2.8k','Production surface'],
  ['brain','big-news','HTTPS','/feed','healthy',56,'1.7k','Intelligence feed'],
  ['admin','brain','HTTPS','/api/v1/content','healthy',31,'Unknown','Content Studio'],
  ['ai-news','brain','HTTPS','/api/v1/content','healthy',39,'Unknown','Content Studio'],
  ['ai-news','brain','HTTPS','/api/v1/engagement/events','healthy',72,'Unknown','Learning signals'],
  ['brain','tech','HTTPS','/discover','healthy',38,'2.1k','Project discovery'],
  ['brain','logging','OTLP','/v1/logs','warning',94,'9.4k','Event observability'],
  ['admin','auth','OIDC','/oauth/callback','healthy',51,'214','Admin access'],
  ['dashboard','logging','HTTPS','/api/events','warning',107,'4.6k','Runtime events'],
  ['big-news','tech','JSON','/api/signals','healthy',45,'721','Shared tech signals'],
].map(([from,to,protocol,path,health,latency,traffic,dependency])=>({from,to,protocol,path,health,latency,traffic,dependency}))
const getApp=id=>apps.find(x=>x.id===id)
let selected='brain', filter='all'
let tools=[],skills=[],activity=[]
let telemetry=null
const routeMetric=route=>{const sourceApp=route.to==='brain'?route.from:'brain';return telemetry?.routes?.find(metric=>metric.sourceApp===sourceApp&&metric.targetRoute===route.path)}
const routeLatency=route=>routeMetric(route)?.averageLatencyMs??'Unknown'
const routeTraffic=route=>routeMetric(route)?.requests??'Unknown'

document.title='Brain | Tabloid'
document.querySelector('#app').innerHTML=`<div class="shell"><header class="topbar"><a class="brand" href="#top"><span class="brand-mark">B</span><span><b>Brain</b><small>Intelligence control plane</small></span></a><nav class="primary-nav" aria-label="Brain sections"><a href="#top">Overview</a><a href="#tools">Tools</a><a href="#skills">Skills</a><a href="#routes">Routes</a></nav><div class="top-actions"><span class="live"><i></i> Brain API connected</span><span data-shared-nav-slot></span><button class="avatar" aria-label="Operator profile">DR</button></div></header><main id="top">
<section class="hero"><div><p class="kicker">Your AI operating layer</p><h1>See it. Govern it.<br><span>Put it to work.</span></h1><p class="intro">Manage every MCP tool, skill, permission, and application route from one living control plane.</p><div class="hero-actions"><a href="#tools">Manage tools</a><a class="secondary" href="#skills">Explore skills</a></div></div><div class="pulse-card"><span class="pulse-orb"><i></i></span><div><small>Brain status</small><strong id="health-score">—</strong><p id="health-copy">Connecting to control plane…</p></div></div></section>
<section class="metrics" aria-label="Control plane summary">${[['Connected apps','8','All discovered','app-count'],['Enabled tools','—','MCP registry','tool-count'],['Active skills','—','Reusable workflows','skill-count'],['Median latency','47 ms','Prototype telemetry','latency-count']].map(x=>`<article><span>${x[0]}</span><strong id="${x[3]}">${x[1]}</strong><small>${x[2]}</small></article>`).join('')}</section>
<section class="workspace"><div class="section-head"><div><p class="kicker">Neural topology</p><h2>Connection map</h2><p>Select a node to trace every route in and out.</p></div><div class="filters" role="group"><button data-filter="all" class="active">All</button><button data-filter="healthy">Healthy</button><button data-filter="warning">Attention</button></div></div><div class="map-grid"><div class="graph"><div class="graph-toolbar"><span><i class="legend healthy"></i> Healthy</span><span><i class="legend warning"></i> Attention</span><span class="prototype">Prototype telemetry</span></div><svg id="lines" class="lines" viewBox="0 0 1000 620" preserveAspectRatio="none"></svg><div id="nodes" class="nodes"></div></div><aside id="inspector" class="inspector" aria-live="polite"></aside></div></section>
<section id="tools" class="control-section"><div class="section-head"><div><p class="kicker">MCP capability registry</p><h2>Tools</h2><p>Control what Brain exposes to connected agents and how every call is approved.</p></div><div class="section-badge"><span id="enabled-tools">0</span> enabled</div></div><div id="tool-grid" class="tool-grid"><div class="loading-card">Loading tools from Brain…</div></div></section>
<section id="skills" class="control-section"><div class="section-head"><div><p class="kicker">Reusable intelligence</p><h2>Skills</h2><p>Purpose-built workflows combine approved tools, context, and product-specific instructions.</p></div><div class="section-badge"><span id="enabled-skills">0</span> active</div></div><div id="skill-grid" class="skill-grid"><div class="loading-card">Loading skills…</div></div></section>
<section id="routes" class="routes"><div class="section-head compact"><div><p class="kicker">Route registry</p><h2>How everything connects</h2></div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Search app, path, or protocol" aria-label="Search routes"></label></div><div class="table-wrap"><table><thead><tr><th>Connection</th><th>Protocol & path</th><th>Dependency</th><th>Health</th><th>Latency</th><th>Traffic · 24h</th></tr></thead><tbody id="route-body"></tbody></table></div></section>
<section class="activity-section"><div class="section-head compact"><div><p class="kicker">Governance trail</p><h2>Recent activity</h2></div><span class="prototype">Persistent audit events</span></div><div id="activity-list" class="activity-list"><div class="loading-card">No configuration changes yet.</div></div></section><div id="toast" class="toast" role="status" aria-live="polite"></div><footer><span>Brain / private control plane</span><span>Live MCP registry · persistent settings · tailnet restricted</span></footer></main></div>`
mountSharedNav()
initializeContentAdapter('brain')

function renderGraph(){
  document.querySelector('#lines').innerHTML=routes.map((r,i)=>{const a=getApp(r.from),b=getApp(r.to),metric=routeMetric(r),visible=filter==='all'||r.health===filter,related=selected===r.from||selected===r.to,packetSize=metric?Math.min(9,4+Math.log10(metric.requests+1)):2,duration=`${3+i%4}s`,path=`M ${a.x*10} ${a.y*6.2} L ${b.x*10} ${b.y*6.2}`;return `<line x1="${a.x*10}" y1="${a.y*6.2}" x2="${b.x*10}" y2="${b.y*6.2}" class="edge ${r.health} ${related?'related':''} ${visible?'':'hidden'}"/><circle class="packet-ring ${r.health} ${visible?'':'hidden'}" r="${packetSize}"><animate attributeName="r" values="${packetSize};${packetSize+8};${packetSize}" dur="${duration}" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0;.8" dur="${duration}" repeatCount="indefinite"/><animateMotion dur="${duration}" repeatCount="indefinite" path="${path}"/></circle><circle class="packet ${r.health} ${visible?'':'hidden'}" r="${packetSize}"><animateMotion dur="${duration}" repeatCount="indefinite" path="${path}"/></circle>`}).join('')
  document.querySelector('#nodes').innerHTML=apps.map(a=>{const related=routes.some(r=>(r.from===selected&&r.to===a.id)||(r.to===selected&&r.from===a.id));return `<button class="node ${a.id===selected?'selected':''} ${a.id!==selected&&!related?'dim':''}" style="--x:${a.x}%;--y:${a.y}%;--node:${a.color}" data-node="${a.id}" aria-pressed="${a.id===selected}"><span class="node-core">${a.name.slice(0,2).toUpperCase()}</span><span class="node-copy"><b>${a.name}</b><small>${a.role}</small></span></button>`}).join('')
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>select(b.dataset.node))
}
function renderInspector(){
  const a=getApp(selected), connected=routes.filter(r=>r.from===selected||r.to===selected),measured=connected.map(routeMetric).filter(Boolean),avg=measured.length?Math.round(measured.reduce((sum,metric)=>sum+metric.averageLatencyMs,0)/measured.length):'Unknown',traffic=measured.length?measured.reduce((sum,metric)=>sum+metric.requests,0):'Unknown'
  document.querySelector('#inspector').innerHTML=`<div class="inspector-top"><span class="detail-icon" style="--node:${a.color}">${a.name.slice(0,2).toUpperCase()}</span><div><small>Selected node</small><h3>${a.name}</h3><p>${a.role}</p></div><span class="status ${a.status}">${a.status==='healthy'?'Healthy':'Attention'}</span></div><div class="detail-stats"><div><span>Connections</span><strong>${connected.length}</strong></div><div><span>Measured latency</span><strong>${avg==='Unknown'?'Unknown':`${avg} ms`}</strong></div><div><span>Measured requests</span><strong>${traffic}</strong></div></div><h4>Connected routes</h4><div class="connected-list">${connected.map(r=>{const incoming=r.to===selected,p=getApp(incoming?r.from:r.to);return `<button data-peer="${p.id}"><span class="peer-icon" style="--node:${p.color}">${p.name[0]}</span><span><b>${incoming?'←':'→'} ${p.name}</b><small>${r.protocol} · ${r.path} · ${routeTraffic(r)} requests</small></span><i class="route-dot ${r.health}"></i></button>`}).join('')||'<p>No registered routes.</p>'}</div><div class="insight"><span>✦</span><div><b>Topology insight</b><p>${telemetry?'Measured traffic reflects signals received by Brain in the selected window.':'Waiting for measured traffic from connected applications.'}</p></div></div>`
  document.querySelectorAll('[data-peer]').forEach(b=>b.onclick=()=>select(b.dataset.peer))
}
function renderRoutes(q=''){
  const needle=q.toLowerCase(),list=routes.filter(r=>filter==='all'||r.health===filter).filter(r=>`${getApp(r.from).name} ${getApp(r.to).name} ${r.protocol} ${r.path} ${r.dependency}`.toLowerCase().includes(needle))
  document.querySelector('#route-body').innerHTML=list.map(r=>`<tr class="${r.from===selected||r.to===selected?'selected-row':''}"><td><div class="connection"><span style="--node:${getApp(r.from).color}">${getApp(r.from).name[0]}</span><b>${getApp(r.from).name}</b><i>→</i><span style="--node:${getApp(r.to).color}">${getApp(r.to).name[0]}</span><b>${getApp(r.to).name}</b></div></td><td><strong class="protocol">${r.protocol}</strong><code>${r.path}</code></td><td>${r.dependency}</td><td><span class="status ${r.health}">${r.health==='healthy'?'Healthy':'Attention'}</span></td><td><b>${routeLatency(r)==='Unknown'?'Unknown':`${routeLatency(r)} ms`}</b></td><td>${routeTraffic(r)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No routes match this view.</td></tr>'
}
function select(id){selected=id;renderGraph();renderInspector();renderRoutes(document.querySelector('#search').value)}
function notify(message,error=false){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.toggle('error',error);toast.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),3200)}
function renderTools(){
  const enabled=tools.filter(tool=>tool.enabled).length
  document.querySelector('#tool-count').textContent=enabled
  document.querySelector('#enabled-tools').textContent=enabled
  document.querySelector('#tool-grid').innerHTML=tools.map(tool=>`<article class="tool-card ${tool.enabled?'enabled':'disabled'}"><div class="card-top"><span class="tool-icon">${escapeHtml(tool.name.slice(0,2).toUpperCase())}</span><label class="switch"><input type="checkbox" data-tool-toggle="${escapeHtml(tool.id)}" ${tool.enabled?'checked':''} ${tool.id==='content_publish'?'disabled':''}><span></span></label></div><div class="tool-meta"><span>${escapeHtml(tool.category)}</span><span class="risk ${escapeHtml(tool.risk)}">${escapeHtml(tool.risk)}</span></div><h3>${escapeHtml(tool.name)}</h3><code>${escapeHtml(tool.id)}</code><p>${escapeHtml(tool.description)}</p><label class="approval">Approval policy<select data-tool-approval="${escapeHtml(tool.id)}" ${tool.id==='content_publish'?'disabled':''}>${['automatic','review','manual','blocked'].map(mode=>`<option value="${mode}" ${tool.approvalMode===mode?'selected':''}>${mode}</option>`).join('')}</select></label>${tool.id==='content_publish'?'<div class="locked">🔒 Locked until identity roles are enforced</div>':''}</article>`).join('')
  document.querySelectorAll('[data-tool-toggle]').forEach(input=>input.onchange=()=>configureTool(input.dataset.toolToggle,{enabled:input.checked}))
  document.querySelectorAll('[data-tool-approval]').forEach(select=>select.onchange=()=>configureTool(select.dataset.toolApproval,{approvalMode:select.value}))
}
function renderSkills(){
  const enabled=skills.filter(skill=>skill.enabled).length
  document.querySelector('#skill-count').textContent=enabled
  document.querySelector('#enabled-skills').textContent=enabled
  document.querySelector('#skill-grid').innerHTML=skills.map((skill,index)=>`<article class="skill-card ${skill.enabled?'enabled':''}"><div class="skill-orb">0${index+1}</div><div class="skill-copy"><div class="card-top"><span>${skill.enabled?'Active':'Available'}</span><label class="switch"><input type="checkbox" data-skill-toggle="${escapeHtml(skill.id)}" ${skill.enabled?'checked':''}><span></span></label></div><h3>${escapeHtml(skill.name)}</h3><p>${escapeHtml(skill.description)}</p><div class="chips">${skill.capabilities.map(item=>`<code>${escapeHtml(item)}</code>`).join('')}</div><small>Apps · ${skill.apps.map(escapeHtml).join(', ')}</small></div></article>`).join('')
  document.querySelectorAll('[data-skill-toggle]').forEach(input=>input.onchange=()=>configureSkill(input.dataset.skillToggle,input.checked))
}
function renderActivity(){
  document.querySelector('#activity-list').innerHTML=activity.length?activity.slice(0,8).map(event=>`<article><span class="activity-icon">${event.type.startsWith('tool')?'T':'S'}</span><div><b>${escapeHtml(event.message)}</b><small>${escapeHtml(event.actor)} · ${new Date(event.createdAt).toLocaleString()}</small></div><code>${escapeHtml(event.subject)}</code></article>`).join(''):'<div class="loading-card">No configuration changes yet. Tool and skill updates will appear here.</div>'
}
async function configureTool(id,change){
  try{const response=await fetch(`${BRAIN_API}/api/v1/tools/${id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(change)}),payload=await response.json();if(!response.ok)throw new Error(payload.error||`Brain returned ${response.status}`);tools=tools.map(tool=>tool.id===id?payload.tool:tool);await refreshActivity();renderTools();notify(`${payload.tool.name} updated`)}catch(error){notify(error.message,true);await loadControlPlane()}
}
async function configureSkill(id,enabled){
  try{const response=await fetch(`${BRAIN_API}/api/v1/skills/${id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled})}),payload=await response.json();if(!response.ok)throw new Error(payload.error||`Brain returned ${response.status}`);skills=skills.map(skill=>skill.id===id?payload.skill:skill);await refreshActivity();renderSkills();notify(`${payload.skill.name} ${enabled?'enabled':'disabled'}`)}catch(error){notify(error.message,true);await loadControlPlane()}
}
async function refreshActivity(){const response=await fetch(`${BRAIN_API}/api/v1/activity`,{cache:'no-store'});if(response.ok)activity=(await response.json()).activity;renderActivity()}
async function loadControlPlane(){
  try{const [toolResponse,skillResponse,activityResponse]=await Promise.all([fetch(`${BRAIN_API}/api/v1/tools`,{cache:'no-store'}),fetch(`${BRAIN_API}/api/v1/skills`,{cache:'no-store'}),fetch(`${BRAIN_API}/api/v1/activity`,{cache:'no-store'})]);if(!toolResponse.ok||!skillResponse.ok||!activityResponse.ok)throw new Error('Brain control API is unavailable');tools=(await toolResponse.json()).tools;skills=(await skillResponse.json()).skills;activity=(await activityResponse.json()).activity;renderTools();renderSkills();renderActivity();document.querySelector('#health-score').textContent='99.2';document.querySelector('#health-copy').textContent=`Healthy · ${tools.filter(tool=>tool.enabled).length} tools ready`;document.querySelector('.live').innerHTML='<i></i> Brain API connected'}catch(error){document.querySelector('#health-score').textContent='—';document.querySelector('#health-copy').textContent=error.message;document.querySelector('.live').innerHTML='<i></i> Control API unavailable';document.querySelector('.live').classList.add('offline');notify(error.message,true)}
}
async function loadTelemetry(){
  try{
    const response=await fetch(`${BRAIN_API}/api/v1/telemetry/routes?range=24h`,{cache:'no-store'})
    if(!response.ok)throw new Error(`Telemetry returned ${response.status}`)
    telemetry=await response.json()
    renderGraph();renderInspector();renderRoutes(document.querySelector('#search').value)
    const measured=telemetry.routes||[],requests=measured.reduce((sum,metric)=>sum+metric.requests,0)
    document.querySelector('#latency-count').textContent=measured.length?`${Math.round(measured.reduce((sum,metric)=>sum+metric.averageLatencyMs,0)/measured.length)} ms`:'Unknown'
    document.querySelector('#health-copy').textContent=`Healthy · ${requests.toLocaleString()} measured requests`
  }catch(error){telemetry=null;renderGraph();renderInspector();renderRoutes(document.querySelector('#search').value);document.querySelector('#latency-count').textContent='Unknown'}
}
function connectTelemetryStream(){
  if(!window.EventSource)return
  const stream=new EventSource(`${BRAIN_API}/api/v1/telemetry/stream`)
  stream.onmessage=loadTelemetry
  stream.onerror=()=>{ stream.close(); window.setTimeout(connectTelemetryStream,10000) }
}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderGraph();renderRoutes(document.querySelector('#search').value)})
document.querySelector('#search').oninput=e=>renderRoutes(e.target.value)
renderGraph();renderInspector();renderRoutes();loadControlPlane();loadTelemetry();connectTelemetryStream()
