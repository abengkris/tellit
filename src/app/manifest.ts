import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tell it!',
    short_name: 'Tell it!',
    description: 'Whatever it is, just Tell It. A decentralized microblogging platform on Nostr.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/favicon.ico',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.ico',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
    orientation: 'portrait',
    scope: '/',
    categories: ['social', 'news'],
    shortcuts: [
      {
        name: 'New Post',
        url: '/',
        icons: [{ src: '/favicon.ico', sizes: '192x192' }]
      },
      {
        name: 'Messages',
        url: '/messages',
        icons: [{ src: '/favicon.ico', sizes: '192x192' }]
      }
    ]
  }
}
