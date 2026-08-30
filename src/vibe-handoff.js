const TAILNET = 'tail70b7f1.ts.net'
export const VIBE_URL = `https://tabloid-vibe.${TAILNET}`

export const buildVibeHref = (currentApp) => {
  if (!currentApp) return VIBE_URL
  const model = encodeURIComponent(`vibe-${currentApp.id}`)
  const prompt = encodeURIComponent(`Help me improve ${currentApp.name}. Start by understanding this app and ask what I want to change.`)
  return `${VIBE_URL}/?model=${model}&q=${prompt}`
}
