import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Appliances',
    description: 'Manage electrical appliances and track itemized consumption.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
