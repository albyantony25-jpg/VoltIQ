import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Overview',
    description: 'Real-time pulse of your VoltIQ-managed energy environment.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
