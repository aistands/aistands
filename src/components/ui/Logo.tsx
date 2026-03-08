'use client'
import Link from 'next/link'

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-5xl',
  }
  return (
    <Link href="/" className={`font-display font-black ${sizes[size]} tracking-tight leading-none`}>
      <span style={{ color: '#1E8AFF' }}>AI</span>
      <span>stands</span>
    </Link>
  )
}
