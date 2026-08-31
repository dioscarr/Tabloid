import './style.css'
import { mountSharedNav } from './shared-nav.js'
import { initializeContentAdapter } from './content-adapter.js'
import { mountTopology3D } from './topology-3d.js'

const BRAIN_API='https://tabloid-brain-api.tail70b7f1.ts.net'
const ADMIN_API=String(import.meta.env.VITE_ADMIN_API_URL||'').trim().replace(/\/+$/,'')
const escapeHtml=value=>String(value).replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[character])

const GRAPH_WIDTH=1000,GRAPH_HEIGHT=620
const apps = [
  ['brain','Brain','Topology intelligence',500,310,'#a78bfa','healthy','Static gateway'],
  ['admin','Admin','Identity & control',190,145,'#38bdf8','healthy','Static gateway'],
  ['auth','Auth','Authentication provider',500,85,'#f472b6','healthy','Static gateway'],
  ['dashboard','Dashboard','System telemetry',810,145,'#2dd4bf','healthy','Static gateway'],
  ['main','Daily Echo','Production experience',845,405,'#fbbf24','healthy','Dedicated runtime'],
  ['big-news','Big News','Personal intelligence',650,535,'#fb7185','healthy','Static gateway'],
  ['ai-news','AI News','AI project intelligence',820,310,'#fb7185','healthy','Static gateway'],
  ['tech','Tech','Developer intelligence',350,535,'#a3e635','healthy','Static gateway'],
  ['logging','Logging','Event pipeline',130,405,'#fb923c','warning','Static gateway'],
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
let studioMode=false
let themeMode='system'
let tools=[],skills=[],activity=[],catalogApps=[]
let skillDialogMode='preview',activeSkill=null,csrfToken=''
try{studioMode=sessionStorage.getItem('brain-studio-mode')==='true'}catch{}
try{themeMode=localStorage.getItem('brain-theme-mode')||'system'}catch{}

function resolvedTheme(){return themeMode==='system'?(window.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark'):themeMode}
function applyTheme(){const theme=resolvedTheme();document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}
function renderThemeState(){const toggle=document.querySelector('#theme-toggle');if(!toggle)return;const light=resolvedTheme()==='light';toggle.setAttribute('aria-pressed',String(light));toggle.setAttribute('aria-label',light?'Switch to dark theme':'Switch to light theme');toggle.textContent=light?'Dark theme':'Light theme'}
applyTheme()

document.title='Brain | Tabloid'
document.querySelector('#app').innerHTML=`<div class="shell"><header class="topbar"><a class="brand" href="#top"><span class="brand-mark">B</span><span><b>Brain</b><small>Intelligence control plane</small></span></a><nav class="primary-nav" aria-label="Brain sections"><a href="#top">Overview</a><a href="#tools">Tools</a><a href="#skills">Skills</a><a href="#routes">Routes</a></nav><div class="top-actions"><span class="live"><i></i> Brain API connected</span><button id="studio-toggle" class="studio-toggle" type="button" aria-pressed="${studioMode}" aria-label="${studioMode?'Exit Studio mode':'Enter Studio mode'}">${studioMode?'Exit Studio':'Enter Studio'}</button><button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="${resolvedTheme()==='light'}" aria-label="${resolvedTheme()==='light'?'Switch to dark theme':'Switch to light theme'}">${resolvedTheme()==='light'?'Dark theme':'Light theme'}</button><span data-shared-nav-slot></span><button class="avatar" aria-label="Operator profile">DR</button></div></header><main id="top"><div id="studio-banner" class="studio-banner" role="status" aria-live="polite"></div>
<section class="hero"><div><p class="kicker">Your AI operating layer</p><h1>See it. Govern it.<br><span>Put it to work.</span></h1><p class="intro">Manage every MCP tool, skill, permission, and application route from one living control plane.</p><div class="hero-actions"><a href="#tools">Manage tools</a><a class="secondary" href="#skills">Explore skills</a></div></div><div class="pulse-card"><span class="pulse-orb"><i></i></span><div><small>Brain status</small><strong id="health-score">—</strong><p id="health-copy">Connecting to control plane…</p></div></div></section>
<section class="metrics" aria-label="Control plane summary">${[['Connected apps','8','All discovered','app-count'],['Enabled tools','—','MCP registry','tool-count'],['Active skills','—','Reusable workflows','skill-count'],['Median latency','47 ms','Prototype telemetry','latency-count']].map(x=>`<article><span>${x[0]}</span><strong id="${x[3]}">${x[1]}</strong><small>${x[2]}</small></article>`).join('')}</section>
<section class="workspace"><div class="section-head"><div><p class="kicker">Neural topology</p><h2>Connection map</h2><p>Select a node to trace every route in and out.</p></div><div class="topology-controls"><div class="view-switch" role="group" aria-label="Topology view"><button data-topology-view="2d" class="active">2D map</button><button data-topology-view="3d">3D brain</button></div><div class="filters" role="group"><button data-filter="all" class="active">All</button><button data-filter="healthy">Healthy</button><button data-filter="warning">Attention</button></div></div></div><div id="topology-2d" class="map-grid"><div class="graph"><div class="graph-toolbar"><span><i class="legend healthy"></i> Healthy</span><span><i class="legend warning"></i> Attention</span><span class="prototype">Prototype telemetry</span></div><svg id="lines" class="lines" viewBox="0 0 1000 620" preserveAspectRatio="none"></svg><div id="nodes" class="nodes"></div></div><aside id="inspector" class="inspector" aria-live="polite"></aside></div><div id="topology-3d" class="topology-3d" hidden><div id="topology-3d-scene"></div><button id="topology-3d-reset" class="topology-3d-reset" type="button">Close full screen view</button></div></section>
<section id="tools" class="control-section"><div class="section-head"><div><p class="kicker">MCP capability registry</p><h2>Tools</h2><p>Control what Brain exposes to connected agents and how every call is approved.</p></div><div class="section-badge"><span id="enabled-tools">0</span> enabled</div></div><div id="tool-grid" class="tool-grid"><div class="loading-card">Loading tools from Brain…</div></div></section>
<section id="skills" class="control-section"><div class="section-head"><div><p class="kicker">Reusable intelligence</p><h2>Skills</h2><p>Preview instructions, ask Hermes for improvements, and control which applications can use each workflow.</p></div><div class="skill-head-actions"><button id="new-skill" class="skill-primary" type="button">+ New skill</button><div class="section-badge"><span id="enabled-skills">0</span> active</div></div></div><div id="skill-grid" class="skill-grid"><div class="loading-card">Loading skills…</div></div></section>
<section id="routes" class="routes"><div class="section-head compact"><div><p class="kicker">Route registry</p><h2>How everything connects</h2></div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Search app, path, or protocol" aria-label="Search routes"></label></div><div class="table-wrap"><table><thead><tr><th>Connection</th><th>Protocol & path</th><th>Dependency</th><th>Health</th><th>Latency</th><th>Traffic · 24h</th></tr></thead><tbody id="route-body"></tbody></table></div></section>
<section class="activity-section"><div class="section-head compact"><div><p class="kicker">Governance trail</p><h2>Recent activity</h2></div><span class="prototype">Persistent audit events</span></div><div id="activity-list" class="activity-list"><div class="loading-card">No configuration changes yet.</div></div></section><div id="skill-dialog" class="skill-dialog" hidden><button class="skill-backdrop" data-skill-close aria-label="Close skill editor"></button><section class="skill-panel" role="dialog" aria-modal="true" aria-labelledby="skill-dialog-title"><header><div><p class="kicker" id="skill-dialog-mode">Skill preview</p><h2 id="skill-dialog-title">Skill</h2></div><button class="skill-close" data-skill-close type="button" aria-label="Close">×</button></header><div id="skill-preview" class="skill-preview"></div><form id="skill-form" class="skill-form"><div class="skill-fields two"><label>Name<input name="name" required maxlength="120"></label><label>Identifier<input name="id" required pattern="[a-z0-9][a-z0-9-]{0,63}"></label></div><label>Description<textarea name="description" required rows="3" maxlength="1000"></textarea></label><label>Instructions<textarea name="instructions" required rows="10" maxlength="20000"></textarea></label><fieldset><legend>Application scope</legend><div id="skill-apps" class="scope-grid"></div></fieldset><fieldset><legend>Allowed tools</legend><div id="skill-capabilities" class="scope-grid"></div></fieldset><label class="enabled-field"><input name="enabled" type="checkbox"> Active</label><div class="hermes-box"><label>Describe the change for Hermes<textarea id="skill-instruction" rows="3" placeholder="For example: make this skill verify deployment evidence and allow Dashboard to use it."></textarea></label><button id="generate-skill" class="skill-secondary" type="button">✦ Generate with Hermes</button></div><div class="skill-actions"><button id="delete-skill" class="skill-danger" type="button">Delete</button><span></span><button data-skill-close class="skill-secondary" type="button">Cancel</button><button class="skill-primary" type="submit">Save skill</button></div></form><div class="skill-preview-actions"><button id="edit-skill" class="skill-primary" type="button">Edit skill</button></div></section></div><div id="toast" class="toast" role="status" aria-live="polite"></div><footer><span>Brain / private control plane</span><span>Live MCP registry · persistent settings · tailnet restricted</span></footer></main></div>`
mountSharedNav()
initializeContentAdapter('brain')

function renderGraph(){
  document.querySelector('#lines').setAttribute('viewBox',`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`)
  document.querySelector('#lines').innerHTML=routes.map((r,i)=>{const a=getApp(r.from),b=getApp(r.to),metric=routeMetric(r),visible=filter==='all'||r.health===filter,related=selected===r.from||selected===r.to;if(!metric)return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="edge ${r.health} ${related?'related':''} ${visible?'':'hidden'}"/>`;const packetCount=Math.min(12,metric.activeConnections||0);const duration=`${3+i%4}s`,path=`M ${a.x} ${a.y} L ${b.x} ${b.y}`;return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="edge ${r.health} ${related?'related':''} ${visible?'':'hidden'}"/>${Array.from({length:packetCount},(_,packetIndex)=>{const delay=`-${(packetIndex/Math.max(packetCount,1))*3}s`;return `<circle class="packet-ring ${r.health} ${visible?'':'hidden'}" r="3"><animate attributeName="r" values="3;11;3" dur="${duration}" begin="${delay}" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0;.8" dur="${duration}" begin="${delay}" repeatCount="indefinite"/><animateMotion dur="${duration}" begin="${delay}" repeatCount="indefinite" path="${path}"/></circle><circle class="packet ${r.health} ${visible?'':'hidden'}" r="3"><animateMotion dur="${duration}" begin="${delay}" repeatCount="indefinite" path="${path}"/></circle>`}).join('')}`}).join('')
  document.querySelector('#nodes').innerHTML=apps.map(a=>{const related=routes.some(r=>(r.from===selected&&r.to===a.id)||(r.to===selected&&r.from===a.id));return `<button class="node ${a.id===selected?'selected':''} ${a.id!==selected&&!related?'dim':''}" style="--x:${a.x/GRAPH_WIDTH*100}%;--y:${a.y/GRAPH_HEIGHT*100}%;--node:${a.color}" data-node="${a.id}" aria-pressed="${a.id===selected}"><span class="node-core">${a.name.slice(0,2).toUpperCase()}</span><span class="node-copy"><b>${a.name}</b><small>${a.role}</small></span></button>`}).join('')
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>select(b.dataset.node))
}
function renderTopologyView(){
  const twoD=document.querySelector('#topology-2d'),threeD=document.querySelector('#topology-3d')
  twoD.hidden=topologyMode!=='2d';threeD.hidden=topologyMode!=='3d'
  document.querySelectorAll('[data-topology-view]').forEach(button=>{button.classList.toggle('active',button.dataset.topologyView===topologyMode)})
  if(topologyMode==='3d'){
    document.querySelector('#topology-3d').classList.add('fullscreen')
    document.body.style.overflow = 'hidden'
    if(!topology3d){topology3d=mountTopology3D({container:document.querySelector('#topology-3d-scene'),apps,routes,getMetric:routeMetric,onSelect:select})}
  } else {
    document.querySelector('#topology-3d').classList.remove('fullscreen')
    document.body.style.overflow = ''
  }
}
document.querySelector('#topology-3d-reset').onclick=()=>{topologyMode='2d';renderTopologyView()}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&topologyMode==='3d'){topologyMode='2d';renderTopologyView()}})
function renderInspector(){
  const a=getApp(selected), connected=routes.filter(r=>r.from===selected||r.to===selected),measured=connected.map(routeMetric).filter(Boolean),avg=measured.length?Math.round(measured.reduce((sum,metric)=>sum+metric.averageLatencyMs,0)/measured.length):'Unknown',traffic=measured.length?measured.reduce((sum,metric)=>sum+metric.requests,0):'Unknown'
  document.querySelector('#inspector').innerHTML=`<div class="inspector-top"><span class="detail-icon" style="--node:${a.color}">${a.name.slice(0,2).toUpperCase()}</span><div><small>Selected node</small><h3>${a.name}</h3><p>${a.role}</p></div><span class="status ${a.status}">${a.status==='healthy'?'Healthy':'Attention'}</span></div><div class="detail-stats"><div><span>Connections</span><strong>${connected.length}</strong></div><div><span>Measured latency</span><strong>${avg==='Unknown'?'Unknown':`${avg} ms`}</strong></div><div><span>Measured requests</span><strong>${traffic}</strong></div></div><h4>Connected routes</h4><div class="connected-list">${connected.map(r=>{const incoming=r.to===selected,p=getApp(incoming?r.from:r.to);return `<button data-peer="${p.id}"><span class="peer-icon" style="--node:${p.color}">${p.name[0]}</span><span><b>${incoming?'←':'→'} ${p.name}</b><small>${r.protocol} · ${r.path} · ${routeTraffic(r)} requests</small></span><i class="route-dot ${r.health}"></i></button>`}).join('')||'<p>No registered routes.</p>'}</div><div class="insight"><span>✦</span><div><b>Topology insight</b><p>${telemetry?'Measured traffic reflects signals received by Brain in the selected window.':'Waiting for measured traffic from connected applications.'}</p></div></div>`
  document.querySelectorAll('[data-peer]').forEach(b=>b.onclick=()=>select(b.dataset.peer))
}
function renderRoutes(q=''){
  const needle=q.toLowerCase(),list=routes.filter(r=>filter==='all'||r.health===filter).filter(r=>`${getApp(r.from).name} ${getApp(r.to).name} ${r.protocol} ${r.path} ${r.dependency}`.toLowerCase().includes(needle))
  document.querySelector('#route-body').innerHTML=list.map(r=>`<tr class="${r.from===selected||r.to===selected?'selected-row':''}"><td><div class="connection"><span style="--node:${getApp(r.from).color}">${getApp(r.from).name[0]}</span><b>${getApp(r.from).name}</b><i>→</i><span style="--node:${getApp(r.to).color}">${getApp(r.to).name[0]}</span><b>${getApp(r.to).name}</b></div></td><td><strong class="protocol">${r.protocol}</strong><code>${r.path}</code></td><td>${r.dependency}</td><td><span class="status ${r.health}">${r.health==='healthy'?'Healthy':'Attention'}</span></td><td><b>${routeLatency(r)==='Unknown'?'Unknown':`${routeLatency(r)} ms`}</b></td><td>${routeTraffic(r)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No routes match this view.</td></tr>'
}
function select(id){selected=id;renderGraph();renderInspector();renderRoutes(document.querySelector('#search').value);topology3d?.focus(id)}
function notify(message,error=false){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.toggle('error',error);toast.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),3200)}
function renderStudioState(){
  const toggle=document.querySelector('#studio-toggle'),banner=document.querySelector('#studio-banner')
  toggle.setAttribute('aria-pressed',String(studioMode));toggle.setAttribute('aria-label',studioMode?'Exit Studio mode':'Enter Studio mode');toggle.textContent=studioMode?'Exit Studio':'Enter Studio'
  banner.classList.toggle('visible',studioMode)
  banner.innerHTML=studioMode?'<strong>Studio mode</strong><span>Editing controls are enabled. Brain authorization and approval policies still apply on the server.</span>':'<strong>View mode</strong><span>Enter Studio mode to edit tools, skills, and approval policies.</span>'
  document.querySelector('#new-skill').hidden=!studioMode
}
function renderTools(){
  const enabled=tools.filter(tool=>tool.enabled).length
  document.querySelector('#tool-count').textContent=enabled
  document.querySelector('#enabled-tools').textContent=enabled
  document.querySelector('#tool-grid').innerHTML=tools.map(tool=>`<article class="tool-card ${tool.enabled?'enabled':'disabled'}"><div class="card-top"><span class="tool-icon">${escapeHtml(tool.name.slice(0,2).toUpperCase())}</span><label class="switch"><input aria-label="${escapeHtml(`Enable ${tool.name}`)}" type="checkbox" data-tool-toggle="${escapeHtml(tool.id)}" ${tool.enabled?'checked':''} ${!studioMode||tool.id==='content_publish'?'disabled':''}><span></span></label></div><div class="tool-meta"><span>${escapeHtml(tool.category)}</span><span class="risk ${escapeHtml(tool.risk)}">${escapeHtml(tool.risk)}</span></div><h3>${escapeHtml(tool.name)}</h3><code>${escapeHtml(tool.id)}</code><p>${escapeHtml(tool.description)}</p><label class="approval">Approval policy<select aria-label="${escapeHtml(`Approval policy for ${tool.name}`)}" data-tool-approval="${escapeHtml(tool.id)}" ${!studioMode||tool.id==='content_publish'?'disabled':''}>${['automatic','review','manual','blocked'].map(mode=>`<option value="${mode}" ${tool.approvalMode===mode?'selected':''}>${mode}</option>`).join('')}</select></label>${tool.id==='content_publish'?'<div class="locked">🔒 Locked until identity roles are enforced</div>':''}</article>`).join('')
  document.querySelectorAll('[data-tool-toggle]').forEach(input=>input.onchange=()=>configureTool(input.dataset.toolToggle,{enabled:input.checked}))
  document.querySelectorAll('[data-tool-approval]').forEach(select=>select.onchange=()=>configureTool(select.dataset.toolApproval,{approvalMode:select.value}))
}
function renderSkills(){
  const enabled=skills.filter(skill=>skill.enabled).length
  document.querySelector('#skill-count').textContent=enabled
  document.querySelector('#enabled-skills').textContent=enabled
  document.querySelector('#skill-grid').innerHTML=skills.map((skill,index)=>`<article class="skill-card ${skill.enabled?'enabled':''}"><div class="skill-orb">${String(index+1).padStart(2,'0')}</div><div class="skill-copy"><div class="card-top"><span>${skill.enabled?'Active':'Available'}</span><label class="switch"><input aria-label="${escapeHtml(`Enable ${skill.name}`)}" type="checkbox" data-skill-toggle="${escapeHtml(skill.id)}" ${skill.enabled?'checked':''} ${studioMode?'':'disabled'}><span></span></label></div><h3>${escapeHtml(skill.name)}</h3><p>${escapeHtml(skill.description)}</p><div class="chips">${skill.capabilities.map(item=>`<code>${escapeHtml(item)}</code>`).join('')}</div><small>Apps · ${skill.apps.map(escapeHtml).join(', ')}</small><div class="skill-card-actions"><button data-skill-preview="${escapeHtml(skill.id)}" type="button">Preview</button>${studioMode?`<button data-skill-edit="${escapeHtml(skill.id)}" type="button">Edit</button>`:''}</div></div></article>`).join('')
  document.querySelectorAll('[data-skill-toggle]').forEach(input=>input.onchange=()=>configureSkill(input.dataset.skillToggle,input.checked))
  document.querySelectorAll('[data-skill-preview]').forEach(button=>button.onclick=()=>openSkill(button.dataset.skillPreview,'preview'))
  document.querySelectorAll('[data-skill-edit]').forEach(button=>button.onclick=()=>openSkill(button.dataset.skillEdit,'edit'))
}
async function adminRequest(path,{method='POST',body={}}={}){
  if(!ADMIN_API)throw new Error('Set VITE_ADMIN_API_URL to enable governed skill changes.')
  if(!csrfToken){const session=await fetch(`${ADMIN_API}/api/v1/session`,{credentials:'include'}),payload=await session.json();if(!session.ok)throw new Error(payload.error?.message||'Admin authentication is required.');csrfToken=payload.data.csrfToken}
  const response=await fetch(`${ADMIN_API}${path}`,{method,credentials:'include',headers:{'content-type':'application/json','x-csrf-token':csrfToken,'idempotency-key':crypto.randomUUID()},body:JSON.stringify(body)})
  const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error?.message||payload.error||`Admin returned ${response.status}`);return payload.data
}
function skillCheckboxes(skill){
  const appChoices=[{id:'all',name:'All applications'},...catalogApps]
  document.querySelector('#skill-apps').innerHTML=appChoices.map(app=>`<label><input type="checkbox" data-skill-app="${escapeHtml(app.id)}" ${skill.apps?.includes(app.id)?'checked':''}> ${escapeHtml(app.name)}</label>`).join('')
  document.querySelector('#skill-capabilities').innerHTML=tools.map(tool=>`<label><input type="checkbox" data-skill-capability="${escapeHtml(tool.id)}" ${skill.capabilities?.includes(tool.id)?'checked':''}> ${escapeHtml(tool.name)}</label>`).join('')
  document.querySelectorAll('[data-skill-app]').forEach(input=>input.onchange=()=>{if(!input.checked)return;if(input.dataset.skillApp==='all')document.querySelectorAll('[data-skill-app]:not([data-skill-app="all"])').forEach(item=>{item.checked=false});else document.querySelector('[data-skill-app="all"]').checked=false})
}
function fillSkillForm(skill){
  const form=document.querySelector('#skill-form');for(const key of ['name','id','description','instructions'])form.elements[key].value=skill[key]||''
  form.elements.id.readOnly=!skill.isNew;form.elements.enabled.checked=skill.enabled!==false;skillCheckboxes(skill)
  document.querySelector('#delete-skill').hidden=Boolean(skill.isNew)
}
function readSkillForm(){
  const form=document.querySelector('#skill-form')
  return {id:form.elements.id.value.trim(),name:form.elements.name.value.trim(),description:form.elements.description.value.trim(),instructions:form.elements.instructions.value.trim(),apps:[...document.querySelectorAll('[data-skill-app]:checked')].map(input=>input.dataset.skillApp),capabilities:[...document.querySelectorAll('[data-skill-capability]:checked')].map(input=>input.dataset.skillCapability),enabled:form.elements.enabled.checked}
}
function openSkill(id,mode='preview'){
  const existing=id?skills.find(skill=>skill.id===id):null
  activeSkill=existing?{...existing,apps:[...existing.apps],capabilities:[...existing.capabilities],isNew:false}:{id:'',name:'',description:'',instructions:'# New skill\n\n',apps:['brain'],capabilities:['apps_list'],enabled:true,isNew:true}
  skillDialogMode=mode;const dialog=document.querySelector('#skill-dialog'),preview=document.querySelector('#skill-preview'),form=document.querySelector('#skill-form'),previewActions=document.querySelector('.skill-preview-actions')
  dialog.hidden=false;document.body.classList.add('modal-open');document.querySelector('#skill-dialog-title').textContent=activeSkill.name||'New skill';document.querySelector('#skill-dialog-mode').textContent=mode==='preview'?'Skill preview':activeSkill.isNew?'Create skill':'Edit skill'
  preview.hidden=mode!=='preview';form.hidden=mode==='preview';previewActions.hidden=mode!=='preview'||!studioMode
  if(mode==='preview')preview.innerHTML=`<p>${escapeHtml(activeSkill.description)}</p><div class="chips">${activeSkill.capabilities.map(item=>`<code>${escapeHtml(item)}</code>`).join('')}</div><small>Apps · ${activeSkill.apps.map(escapeHtml).join(', ')}</small><pre>${escapeHtml(activeSkill.instructions)}</pre>`
  else fillSkillForm(activeSkill)
}
function closeSkill(){document.querySelector('#skill-dialog').hidden=true;document.body.classList.remove('modal-open');activeSkill=null}
async function configureSkill(id,enabled){
  try{const data=await adminRequest(`/api/v1/brain/skills/${encodeURIComponent(id)}`,{body:{enabled}});skills=skills.map(skill=>skill.id===id?data.skill:skill);await refreshActivity();renderSkills();notify(`${data.skill.name} ${enabled?'enabled':'disabled'}`)}catch(error){notify(error.message,true);await loadControlPlane()}
}
function renderActivity(){
  document.querySelector('#activity-list').innerHTML=activity.length?activity.slice(0,8).map(event=>`<article><span class="activity-icon">${event.type.startsWith('tool')?'T':'S'}</span><div><b>${escapeHtml(event.message)}</b><small>${escapeHtml(event.actor)} · ${new Date(event.createdAt).toLocaleString()}</small></div><code>${escapeHtml(event.subject)}</code></article>`).join(''):'<div class="loading-card">No configuration changes yet. Tool and skill updates will appear here.</div>'
}
async function configureTool(id,change){
  try{const response=await fetch(`${BRAIN_API}/api/v1/tools/${id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(change)}),payload=await response.json();if(!response.ok)throw new Error(payload.error||`Brain returned ${response.status}`);tools=tools.map(tool=>tool.id===id?payload.tool:tool);await refreshActivity();renderTools();notify(`${payload.tool.name} updated`)}catch(error){notify(error.message,true);await loadControlPlane()}
}
async function refreshActivity(){const response=await fetch(`${BRAIN_API}/api/v1/activity`,{cache:'no-store'});if(response.ok)activity=(await response.json()).activity;renderActivity()}
async function loadControlPlane(){
  let preservedBrief = null
  // Attempt to preserve any existing product brief before showing error state
  try {
    const briefElement = document.querySelector('.hero > div > p.intro')
    if (briefElement) {
      preservedBrief = briefElement.textContent.trim()
    }
  } catch {}

  try {
    const [toolResponse,skillResponse,activityResponse,appResponse]=await Promise.all([fetch(`${BRAIN_API}/api/v1/tools`,{cache:'no-store'}),fetch(`${BRAIN_API}/api/v1/skills`,{cache:'no-store'}),fetch(`${BRAIN_API}/api/v1/activity`,{cache:'no-store'}),fetch(`${BRAIN_API}/api/v1/apps`,{cache:'no-store'})]);if(!toolResponse.ok||!skillResponse.ok||!activityResponse.ok||!appResponse.ok)throw new Error('Brain control API is unavailable');tools=(await toolResponse.json()).tools;skills=(await skillResponse.json()).skills;activity=(await activityResponse.json()).activity;catalogApps=(await appResponse.json()).apps;renderTools();renderSkills();renderActivity();document.querySelector('#health-score').textContent='99.2';document.querySelector('#health-copy').textContent=`Healthy · ${tools.filter(tool=>tool.enabled).length} tools ready`;document.querySelector('.live').innerHTML='<i></i> Brain API connected'}
  catch(error){
    // Restore preserved brief if Brain is unavailable
    const briefArea = document.querySelector('.hero > div')
    if (preservedBrief && briefArea) {
      const existingIntro = briefArea.querySelector('.intro')
      if (existingIntro) {
        existingIntro.textContent = preservedBrief
      } else {
        const p = document.createElement('p')
        p.className = 'intro'
        p.textContent = preservedBrief
        briefArea.insertBefore(p, briefArea.firstChild)
      }
    }
    document.querySelector('#health-score').textContent='—'
    document.querySelector('#health-copy').textContent=error.message
    document.querySelector('.live').innerHTML='<i></i> Control API unavailable'
    document.querySelector('.live').classList.add('offline')
    notify(error.message,true)
  }
}
async function loadTelemetry(){
  try{
    const response=await fetch(`${BRAIN_API}/api/v1/telemetry/routes?range=24h`,{cache:'no-store'})
    if(!response.ok)throw new Error(`Telemetry returned ${response.status}`)
    telemetry=await response.json()
    renderGraph();renderInspector();renderRoutes(document.querySelector('#search').value);if(topology3d){topology3d.destroy();topology3d=null};renderTopologyView()
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
document.querySelectorAll('[data-topology-view]').forEach(b=>b.onclick=()=>{topologyMode=b.dataset.topologyView;renderTopologyView()})
document.querySelector('#search').oninput=e=>renderRoutes(e.target.value)
document.querySelector('#studio-toggle').onclick=()=>{studioMode=!studioMode;try{sessionStorage.setItem('brain-studio-mode',String(studioMode))}catch{};renderStudioState();renderTools();renderSkills();if(studioMode)document.querySelector('#tool-grid input:not(:disabled),#skill-grid input:not(:disabled)')?.focus()}
document.querySelector('#theme-toggle').onclick=()=>{themeMode=resolvedTheme()==='light'?'dark':'light';try{localStorage.setItem('brain-theme-mode',themeMode)}catch{};applyTheme();renderThemeState()}
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change',()=>{if(themeMode==='system'){applyTheme();renderThemeState()}})
document.querySelector('#new-skill').onclick=()=>openSkill(null,'edit')
document.querySelectorAll('[data-skill-close]').forEach(button=>button.onclick=closeSkill)
document.querySelector('#edit-skill').onclick=()=>activeSkill&&openSkill(activeSkill.id,'edit')
document.querySelector('#generate-skill').onclick=async()=>{const button=document.querySelector('#generate-skill'),instruction=document.querySelector('#skill-instruction').value.trim();if(instruction.length<10){notify('Describe the requested change in at least 10 characters.',true);return}button.disabled=true;button.textContent='Hermes is drafting…';try{const body={instruction,...(!activeSkill.isNew?{skillId:activeSkill.id}:{})},data=await adminRequest('/api/v1/brain/skills/generate',{body});activeSkill={...data.draft,isNew:activeSkill.isNew};fillSkillForm(activeSkill);document.querySelector('#skill-dialog-title').textContent=activeSkill.name;notify('Hermes draft is ready for review.')}catch(error){notify(error.message,true)}finally{button.disabled=false;button.textContent='✦ Generate with Hermes'}}
document.querySelector('#skill-form').onsubmit=async event=>{event.preventDefault();const draft=readSkillForm();if(!draft.apps.length||!draft.capabilities.length){notify('Select at least one application and one allowed tool.',true);return}const submit=event.submitter;submit.disabled=true;try{const isNew=activeSkill.isNew,data=await adminRequest(isNew?'/api/v1/brain/skills':`/api/v1/brain/skills/${encodeURIComponent(activeSkill.id)}`,{method:isNew?'POST':'PUT',body:draft});skills=isNew?[...skills,data.skill]:skills.map(skill=>skill.id===data.skill.id?data.skill:skill);closeSkill();await refreshActivity();renderSkills();notify(`${data.skill.name} saved`)}catch(error){notify(error.message,true)}finally{submit.disabled=false}}
document.querySelector('#delete-skill').onclick=async()=>{if(!activeSkill||activeSkill.isNew||!confirm(`Delete ${activeSkill.name}? This removes it from every application.`))return;const button=document.querySelector('#delete-skill');button.disabled=true;try{const data=await adminRequest(`/api/v1/brain/skills/${encodeURIComponent(activeSkill.id)}`,{method:'DELETE',body:{}});skills=skills.filter(skill=>skill.id!==data.deleted.id);closeSkill();await refreshActivity();renderSkills();notify(`${data.deleted.name} deleted`)}catch(error){notify(error.message,true)}finally{button.disabled=false}}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('#skill-dialog').hidden)closeSkill()})
renderStudioState();renderThemeState();renderGraph();renderInspector();renderRoutes();loadControlPlane()
