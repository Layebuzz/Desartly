// Retire the original demo placeholders without maintaining a publication allowlist.
const starterIds=new Set(['onboarding-experience','research-agent','ai-workspace','visual-identity','brand-system','packaging-touchpoints','campaign-key-visual','digital-campaign','integrated-campaign','post-544761f6']);
export const isVisibleProject=p=>!p.hidden&&!p.archived&&(!starterIds.has(p.id)||p.managed===true);
