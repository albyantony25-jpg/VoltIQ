import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Digital Twin',
    description: 'Simulate what-if scenarios for solar upgrades and appliance replacements.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
