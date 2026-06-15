import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Organizr',
    template: '%s · Organizr',
  },
  description:
    'Organizr is the easy headcount for recurring group activities — share a link, see who\'s coming, and run your sessions.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
