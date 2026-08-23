import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
const path = process.env.AUTHZ_STORE || '/data/authorization.json'
const empty = () => ({ applications: [], identities: [], roles: [], policies: [], requests: [], decisions: [], audit: [] })
const read = () => { try { return JSON.parse(readFileSync(path, 'utf8')) } catch (e) { if (e.code === 'ENOENT') return empty(); throw e } }
const write = (value) => { mkdirSync(dirname(path), { recursive:true }); const tmp = path + '.' + process.pid + '.tmp'; writeFileSync(tmp, JSON.stringify(value,null,2), {mode:0o600}); renameSync(tmp,path) }
const seed = (db) => { if (!db.roles.length) db.roles=[{id:'owner',name:'Owner',permissions:['*']},{id:'operator',name:'Operator',permissions:['apps.read','policies.read','requests.review','audit.read']},{id:'editor',name:'Editor',permissions:['content.read','content.propose']},{id:'viewer',name:'Viewer',permissions:['content.read']}]; if (!db.applications.length) db.applications=[{id:'brain',name:'Brain',branch:'brain',runtime:'dynamic-api',capabilities:['apps.read','routes.read','content.propose'],status:'registered'},{id:'admin',name:'Admin',branch:'admin',runtime:'static',capabilities:['apps.read','requests.review'],status:'registered'}]; return db }
export const authz = {
 applications(){ return seed(read()).applications },
 registerApplication(input){ const db=seed(read()); const app={...(db.applications.find(x=>x.id===input.id)||{}),...input,updatedAt:new Date().toISOString()}; db.applications=db.applications.filter(x=>x.id!==input.id).concat(app); write(db); return app },
 roles(){ return seed(read()).roles },
 decide({subject,application,action,context={}}){ const db=seed(read()); const identity=db.identities.find(x=>x.id===subject); const role=seed(db).roles.find(r=>(identity?.roles||[]).includes(r.id)); const app=seed(db).applications.find(a=>a.id===application); const allowed=subject==='tailnet-admin'||role?.permissions?.includes('*')||role?.permissions?.includes(action)||app?.capabilities?.includes(action); const decision={id:randomUUID(),subject,application,action,allowed:Boolean(allowed),reason:allowed?'matched role or application capability':'no matching authority',createdAt:new Date().toISOString(),context}; db.decisions.unshift(decision); db.audit.unshift({type:'policy.decision',...decision}); write(db); return decision },
 request(input){ const db=seed(read()); const item={id:randomUUID(),status:'pending',createdAt:new Date().toISOString(),...input}; db.requests.unshift(item); db.audit.unshift({type:'access.request',...item}); write(db); return item },
 requests(){ return seed(read()).requests }, audit(){ return seed(read()).audit.slice(0,100) }
}
