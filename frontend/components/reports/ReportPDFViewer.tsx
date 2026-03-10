"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { EnergyReport } from "@/components/reports/EnergyReport";

export default function ReportPDFViewer({ reportData }: { reportData: any }) {
    return (
        <PDFViewer className="w-full h-full border-none">
            <EnergyReport data={reportData} />
        </PDFViewer>
    );
}
