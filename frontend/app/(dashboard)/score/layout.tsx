import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Efficiency Score',
    description: 'Detailed breakdown of your home energy efficiency grade.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
