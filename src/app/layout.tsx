import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'AIstands — Your AI workspace for standards',
  description: 'Upload your standards, ask questions in plain English, build compliance workbooks, track version changes, and generate checklists — all in one intelligent workspace.',
  keywords: 'standards, compliance, ISO, AI, workbook, checklist, regulations',
  openGraph: {
    title: 'AIstands — Your AI workspace for standards',
    description: 'The AI workspace built for standards professionals.',
    url: 'https://aistands.com',
    siteName: 'AIstands',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
