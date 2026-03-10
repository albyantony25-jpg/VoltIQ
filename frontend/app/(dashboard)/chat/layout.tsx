import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Chat Assistant',
    description: 'Ask VoltIQ about your energy usage, bills, and saving tips.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
