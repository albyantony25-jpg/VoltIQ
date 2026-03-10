"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

const ReportPDFLink = dynamic(() => import("@/components/reports/ReportPDFLink"), { ssr: false })
const ReportPDFViewer = dynamic(() => import("@/components/reports/ReportPDFViewer"), { ssr: false })
import { FileText, Loader2, RefreshCw, Download } from "lucide-react"

export default function ReportsPage() {
    const MOCK_HOME_ID = "00000000-0000-0000-0000-000000000000"
    const [month, setMonth] = useState("August 2026")
    const [reportData, setReportData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isClient, setIsClient] = useState(false)

    // react-pdf avoids SSR issues
    useEffect(() => {
        setIsClient(true)
    }, [])

    const handleGenerate = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/${MOCK_HOME_ID}/${month}/data`)
            if (res.ok) {
                const data = await res.json()
                setReportData(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isClient) return null;

    return (
        <div className="w-full flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] drop-shadow-sm font-sans">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col shrink-0">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Generate Report</h2>
                </div>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                            Billing Month
                        </label>
                        <select
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                        >
                            <option>August 2026</option>
                            <option>July 2026</option>
                            <option>June 2026</option>
                            <option>May 2026</option>
                            <option>April 2026</option>
                            <option>March 2026</option>
                        </select>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {isLoading ? "Compiling Data..." : "Generate PDF"}
                    </button>

                    {reportData && (
                        <ReportPDFLink reportData={reportData} month={month} />
                    )}
                </div>

                <div className="flex-1">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Report Archive</h3>
                    <div className="space-y-2">
                        {["July 2026", "June 2026", "May 2026"].map(past => (
                            <div key={past} className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg flex items-center justify-between text-sm text-slate-300">
                                <span className="font-medium text-slate-400">{past}</span>
                                <button className="text-slate-600 hover:text-indigo-400 transition-colors">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 bg-slate-950 rounded-xl overflow-hidden relative shadow-inner">
                {reportData ? (
                    <ReportPDFViewer reportData={reportData} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center max-w-sm mx-auto">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
                            <FileText className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-300 mb-2">PDF Report Generator</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Select a month from the sidebar and click generate to compile your beautifully formatted, 6-page interactive home energy report.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
