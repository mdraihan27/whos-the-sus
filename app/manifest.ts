import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Who's the Sus?",
    short_name: 'Sus?',
    description: 'A bubbly social deduction game',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff', // white splash screen
    theme_color: '#38bdf8',
    icons: [
      {
        src: '/app-icon.svg',
        sizes: '1024x1024',
        type: 'image/svg+xml',
      },
      {
        src: '/app-icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  };
}
