import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
    title: {
        template: '%s | VoltIQ',
        default: 'VoltIQ — AI Home Energy Intelligence',
    },
    description: 'Track, analyse, and optimise your home energy with AI-powered insights.',
    openGraph: {
        title: 'VoltIQ — AI Home Energy Intelligence',
        description: 'Track, analyse, and optimise your home energy with AI-powered insights.',
        url: 'https://voltiq.dev',
        siteName: 'VoltIQ',
        images: [
            {
                url: 'https://voltiq.dev/og.png',
                width: 1200,
                height: 630,
            },
        ],
        locale: 'en_IN',
        type: 'website',
    },
}

import { Providers } from '@/components/providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                    <Providers>
                        {children}
                        <Toaster richColors position="top-right" />
                    </Providers>
                </ThemeProvider>
            </body>
        </html>
    )
}
