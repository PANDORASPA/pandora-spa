const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pandoraheadspa.com'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
