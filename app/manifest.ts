import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Who's the Sus?",
    short_name: 'Sus?',
    description: 'A bubbly social deduction game',
    start_url: '/',
    display: 'standalone',
    background_color: '#38bdf8', // sky-400
    theme_color: '#38bdf8',
    icons: [
      {
        src: '/icon-512x512.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
