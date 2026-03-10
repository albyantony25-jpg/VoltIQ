import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Billing & Trends',
    description: 'Historical bill projection, energy slabs, and exact appliance cost attribution.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
