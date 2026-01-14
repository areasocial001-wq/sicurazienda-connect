export function getPublicSiteUrl() {
  const env = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, '');
  return window.location.origin;
}

export function buildPublicUrl(path: string) {
  const base = getPublicSiteUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
