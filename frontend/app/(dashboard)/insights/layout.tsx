import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'AI Insights',
    description: 'AI-generated insights based on your energy consumption patterns.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
