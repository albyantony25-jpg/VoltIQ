import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Executive Reports',
    description: 'Download comprehensive monthly energy analysis reports.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
