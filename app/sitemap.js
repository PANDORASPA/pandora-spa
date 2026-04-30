const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pandoraheadspa.com'

const routes = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/tickets', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/booking', priority: 0.85, changeFrequency: 'daily' },
  { path: '/products', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/team', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/articles', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/login', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/register', priority: 0.4, changeFrequency: 'monthly' },
]

export default function sitemap() {
  const now = new Date()
  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
