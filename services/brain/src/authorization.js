const base = process.env.AUTHZ_API_URL || 'https://tabloid-authorization.tail70b7f1.ts.net'
const token = process.env.AUTHZ_SERVICE_TOKEN || ''
export async function authorize({ subject, application, action, context = {} }) {
  const response = await fetch(base + '/api/v1/decisions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify({ subject, application, action, context })
  })
  if (!response.ok) throw new Error('Authorization service returned ' + response.status)
  return (await response.json()).decision
}
export async function listAuthorizedApplications(subject) {
  const response = await fetch(base + '/api/v1/applications', { headers: token ? { authorization: 'Bearer ' + token } : {} })
  if (!response.ok) throw new Error('Authorization service returned ' + response.status)
  return (await response.json()).applications
}
