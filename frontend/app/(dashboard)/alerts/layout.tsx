import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Alerts & Anomalies',
    description: 'Real-time anomaly detection and home energy notifications.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
