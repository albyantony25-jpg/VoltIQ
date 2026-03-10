"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { EnergyReport } from "@/components/reports/EnergyReport";
import { Loader2, Download } from "lucide-react";

export default function ReportPDFLink({ reportData, month }: { reportData: any; month: string }) {
    return (
        <PDFDownloadLink
            document={<EnergyReport data={reportData} />}
            fileName={`VoltIQ-Report-${month.replace(" ", "-").toLowerCase()}.pdf`}
            className="w-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 border border-emerald-500/20"
        >
            {/* @ts-ignore */}
            {({ loading }) =>
                loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Rendering PDF...</>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        Download PDF
                    </>
                )
            }
        </PDFDownloadLink>
    );
}
