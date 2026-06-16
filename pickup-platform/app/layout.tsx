import type { Metadata } from 'next'
import './globals.css'
import { buildRootMetadata } from '@/lib/og-metadata'

export const metadata: Metadata = buildRootMetadata()

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
