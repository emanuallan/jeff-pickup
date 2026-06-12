import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Headcount',
  description: 'Track who\'s coming to your recurring group activities',
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
