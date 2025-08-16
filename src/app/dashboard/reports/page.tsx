// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Patient {
    id: number;
    name: string;
    opno: string;
}

interface Report {
    id: number;
    report_date: string;
    report_name: string;
    parameters: Record<string, any>;
    patients: Patient;
}

// Test categories configuration (same as observations page)
const TEST_CATEGORIES = {
    'COMMON TESTS': {
        'URINE': ['URINE', 'REACTION', 'PH', 'ACETONE', 'ALBUMIN', 'SUGAR', 'BILE SALT', 'BILE PIGMENT', 'MICROALBUMIN'],
        'DEPOSITS': ['DEPOSITS', 'PUS CELLS', 'RBC', 'EPITHELIAL CELLS', 'CASTS', 'CRYSTALS', 'OTHERS', 'PREGNANCY TEST', 'SPECIFIC GRAVITY', 'CULTURE & SENSITIVITY'],
        'MOTION': ['MOTION', 'OVA', 'CYST', 'TROPHOZOITE', 'PUS CELLS', 'RBC', 'OTHERS', 'OCCULT BLOOD', 'REDUCTION TEST'],
        'SPUTUM': ['SPUTUM : AFB']
    },
    'LAB': {
        'HEMATOLOGY': [
            'HEMOGLOBIN', 'TOTAL RBC', 'TOTAL WBC', 'NEUTROPHIL', 'LYMPHOCYTE', 'MONOCYTE', 'BASOPHIL', 'EOSINOPHIL',
            'ESR 1/2 HR', 'ESR 1HR', 'PCV', 'MCV', 'MCH', 'MCHC', 'BLEEDING TIME', 'CLOTTING TIME', 'PLATELET COUNT',
            'RETICULOCYTE COUNT', 'ABSOLUTE EOSINOPHIL COUNT', 'MP, MF - SLIDE METHOD', 'MP - CARD METHOD',
            'BLOOD GROUPING', 'RH - TYPING', 'CROSS MATCHING', 'MANTOUX TEST'
        ],
        'BIOCHEMISTRY': [
            'SUGAR(FASTING)', 'SUGAR(RANDOM)', 'SUGAR (PP)', 'HbA1C', 'S. UREA', 'S.CREATININE', 'CHOLESTEROL : TOTAL',
            'CHOLESTEROL :HDL', 'CHOLESTEROL :LDL', 'CHOLESTEROL :VLDL', 'TRIGLYCERIDES', 'URICACID', 'S.CALCIUM',
            'CK MB', 'CPK', 'TROPONIN-I', 'SODIUM', 'POTASSIUM', 'CHLORIDE', 'BI-CARBONATE', 'S.BILIRUBIN : TOTAL',
            'S.BILIRUBIN : DIRECT', 'S.BILIRUBIN : INDIRECT', 'TOTAL PROTIEN', 'ALBUMIN', 'GLOBULIN', 'ICTERIC INDEX',
            'S.ALKALINE PHOSPHATASE', 'S.ACID PHOSPHATASE', 'SGOT', 'SGPT', 'S.AMYLASE'
        ],
        'SEROLOGY': [
            'WIDAL :O', 'WIDAL :H', 'WIDAL :A(H)', 'WIDAL :B(H)', 'DENGUE', 'VDRL', 'HIV- I & II', 'RA FACTOR',
            'ASO TITRE', 'CRP', 'HBs Ag', 'HCV', 'TB LGM', 'LEPTOSPIRA'
        ],
        'SEMEN ANALYSIS': ['SEMEN ANALYSIS', 'VOLUME', 'VISCOSITY', 'COLOUR', 'ODOUR', 'REACTION', 'PH', 'COUNT'],
        'MOTILITY': ['MOTILITY', 'ACTIVE MOTILE', 'SLUGGISH MOTILE', 'NON MOTILE', 'ABNORMAL', 'PUS CELLS', 'RBC', 'EPITHELIAL CELLS'],
        'SEROLOGY TEST': ['RF(RHEUMATOID FACTOR)', 'CRP (C-REACTIVE PROTEIN)', 'ASO']
    },
    'SEMEN': {
        'SEMEN ANALYSIS': ['SEMEN ANALYSIS', 'VOLUME', 'VISCOSITY', 'COLOUR', 'ODOUR', 'REACTION', 'PH', 'COUNT'],
        'MOTILITY': ['MOTILITY', 'ACTIVE MOTILE', 'SLUGGISH MOTILE', 'NON MOTILE', 'ABNORMAL', 'PUS CELLS', 'RBC', 'EPITHELIAL CELLS']
    },
    'URINE': {
        'URINE': ['URINE', 'REACTION', 'PH', 'ACETONE', 'ALBUMIN', 'SUGAR', 'BILE SALT', 'BILE PIGMENT', 'MICROALBUMIN'],
        'DEPOSITS': ['DEPOSITS', 'PUS CELLS', 'RBC', 'EPITHELIAL CELLS', 'CASTS', 'CRYSTALS', 'OTHERS', 'PREGNANCY TEST', 'SPECIFIC GRAVITY', 'CULTURE & SENSITIVITY']
    },
    'HEMATOLOGY': [
        'HEMOGLOBIN', 'TOTAL RBC', 'TOTAL WBC', 'NEUTROPHIL', 'LYMPHOCYTE', 'MONOCYTE', 'BASOPHIL', 'EOSINOPHIL',
        'ESR 1/2 HR', 'ESR 1HR', 'PCV', 'MCV', 'MCH', 'MCHC', 'BLEEDING TIME', 'CLOTTING TIME', 'PLATELET COUNT',
        'RETICULOCYTE COUNT', 'ABSOLUTE EOSINOPHIL COUNT', 'MP, MF - SLIDE METHOD', 'MP - CARD METHOD',
        'BLOOD GROUPING', 'RH - TYPING', 'CROSS MATCHING', 'MANTOUX TEST'
    ],
    'SEROLOGY': [
        'WIDAL :O', 'WIDAL :H', 'WIDAL :A(H)', 'WIDAL :B(H)', 'DENGUE', 'VDRL', 'HIV- I & II', 'RA FACTOR',
        'ASO TITRE', 'CRP', 'HBs Ag', 'HCV', 'TB LGM', 'LEPTOSPIRA'
    ],
    'BIOCHEMISTRY': [
        'SUGAR(FASTING)', 'SUGAR(RANDOM)', 'SUGAR (PP)', 'HbA1C', 'S. UREA', 'S.CREATININE', 'CHOLESTEROL : TOTAL',
        'CHOLESTEROL :HDL', 'CHOLESTEROL :LDL', 'CHOLESTEROL :VLDL', 'TRIGLYCERIDES', 'URICACID', 'S.CALCIUM',
        'CK MB', 'CPK', 'TROPONIN-I', 'SODIUM', 'POTASSIUM', 'CHLORIDE', 'BI-CARBONATE', 'S.BILIRUBIN : TOTAL',
        'S.BILIRUBIN : DIRECT', 'S.BILIRUBIN : INDIRECT', 'TOTAL PROTIEN', 'ALBUMIN', 'GLOBULIN', 'ICTERIC INDEX',
        'S.ALKALINE PHOSPHATASE', 'S.ACID PHOSPHATASE', 'SGOT', 'SGPT', 'S.AMYLASE'
    ],
    'SEMEN ANALYSIS': ['SEMEN ANALYSIS', 'VOLUME', 'VISCOSITY', 'COLOUR', 'ODOUR', 'REACTION', 'PH', 'COUNT'],
    'MOTILITY': ['MOTILITY', 'ACTIVE MOTILE', 'SLUGGISH MOTILE', 'NON MOTILE', 'ABNORMAL', 'PUS CELLS', 'RBC', 'EPITHELIAL CELLS'],
    'DEPOSITS': ['DEPOSITS', 'PUS CELLS', 'RBC', 'EPITHELIAL CELLS', 'CASTS', 'CRYSTALS', 'OTHERS', 'PREGNANCY TEST', 'SPECIFIC GRAVITY', 'CULTURE & SENSITIVITY'],
    'MOTION': ['MOTION', 'OVA', 'CYST', 'TROPHOZOITE', 'PUS CELLS', 'RBC', 'OTHERS', 'OCCULT BLOOD', 'REDUCTION TEST'],
    'HORMONE': ['T3', 'T4', 'TSH 3RD GENERATION (HS TSH)'],
    'HORMONE_UNDER_16': ['T3', 'T4', 'TSH 3RD GENERATION (HS TSH)'],
    'SPUTUM': ['SPUTUM : AFB'],
    'URINE CULTURE': {
        'ISO ORGANISM': ['ISO ORGANISM'],
        'SENSITIVE': [
            'NITROFURANTOIN', 'CHLOROMPHENICOL', 'CEFTRIAXONE', 'TETRACYCLINE', 'GENTAMYCIN', 'AMOXYCILLIN',
            'NORFLOXACIN', 'AMIKACIN', 'ERYTHROMYCIN', 'CLOXACILLIN', 'KANAMYCIN', 'CEFALEXIN', 'OFLOXACIN',
            'AZITHROMYCIN', 'CIPROFLOXACIN'
        ],
        'RESISTANCE': [
            'NITROFURANTOIN', 'CHLOROMPHENICOL', 'CEFTRIAXONE', 'TETRACYCLINE', 'GENTAMYCIN', 'AMOXYCILLIN',
            'NORFLOXACIN', 'AMIKACIN', 'ERYTHROMYCIN', 'CLOXACILLIN', 'KANAMYCIN', 'CEFALEXIN', 'OFLOXACIN',
            'AZITHROMYCIN', 'CIPROFLOXACIN'
        ]
    },
    'SEROLOGY TEST': ['RF(RHEUMATOID FACTOR)', 'CRP (C-REACTIVE PROTEIN)', 'ASO']
};

// IST DateTime helper function
const getISTDateTime = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    const day = istTime.getUTCDate().toString().padStart(2, '0');
    const month = (istTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = istTime.getUTCFullYear();
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = (hours % 12 || 12).toString().padStart(2, '0');

    return {
        filename: `${day}-${month}-${year}-${displayHours}-${minutes}-${ampm}`,
        readable: `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm} IST`
    };
};

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [viewingReport, setViewingReport] = useState<Report | null>(null);

    // Edit form data
    const [editFormData, setEditFormData] = useState({
        date: '',
        reportGroup: '',
        parameters: {} as Record<string, any>
    });

    const [loading, setLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<any>({});

    // Export dropdown
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [pageDirection, setPageDirection] = useState(0);

    const { doctorId } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedDate) {
            fetchReports();
        }
    }, [selectedDate, doctorId]);

    const fetchReports = async () => {
        if (!doctorId || !selectedDate) return;

        try {
            const response = await fetch(`/api/reports?date=${selectedDate}`, {
                headers: { authorization: doctorId.toString() }
            });
            const data = await response.json();
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        }
    };

    // Pagination logic
    const totalPages = useMemo(() => {
        return pageSize === 0 ? 1 : Math.ceil(reports.length / pageSize);
    }, [reports.length, pageSize]);

    const paginatedData = useMemo(() => {
        if (pageSize === 0) return reports;
        const startIndex = (currentPage - 1) * pageSize;
        return reports.slice(startIndex, startIndex + pageSize);
    }, [reports, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize]);

    // Fixed positioning dropdown (Option 5 solution)
    const handleDropdownToggle = (reportId: number, buttonElement: HTMLElement, rowIndex: number) => {
        if (dropdownOpen === reportId) {
            setDropdownOpen(null);
        } else {
            // Get button position relative to viewport
            const rect = buttonElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Calculate position to ensure dropdown stays within viewport
            let top = rect.bottom + 5;
            let left = rect.left - 100; // Position to the left of the button

            // Adjust if dropdown would go off-screen
            if (left < 10) {
                left = rect.right - 130; // Position to the right if no space on left
            }

            if (top + 160 > viewportHeight) {
                top = rect.top - 160; // Position above if no space below
            }

            const position = {
                position: 'fixed' as const,
                top: `${top}px`,
                left: `${left}px`,
                zIndex: 9999
            };

            setDropdownPosition(position);
            setDropdownOpen(reportId);
        }
    };


    const handleView = (report: Report) => {
        setViewingReport(report);
        setShowModal(true);
        setDropdownOpen(null);
    };

    const handleEdit = (report: Report) => {
        setEditingReport(report);
        setEditFormData({
            date: report.report_date,
            reportGroup: report.report_name,
            parameters: report.parameters
        });
        setShowEditModal(true);
        setDropdownOpen(null);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this report?')) {
            try {
                const response = await fetch('/api/reports', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: doctorId!.toString()
                    },
                    body: JSON.stringify({ id })
                });

                if (response.ok) {
                    await fetchReports();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error('Error deleting report:', error);
                alert('Error deleting report');
            }
        }
        setDropdownOpen(null);
    };

    const handlePrint = (report: Report) => {
        generatePrintableReport(report);
        setDropdownOpen(null);
    };

    const generatePrintableReport = (report: Report) => {
        const dateTime = getISTDateTime();
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('LABORATORY REPORT', 105, 25, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Patient: ${report.patients.name}`, 20, 45);
        doc.text(`OP No: ${report.patients.opno}`, 20, 52);
        doc.text(`Report Date: ${new Date(report.report_date).toLocaleDateString()}`, 20, 59);
        doc.text(`Report Type: ${report.report_name}`, 20, 66);
        doc.text(`Generated on: ${dateTime.readable}`, 20, 73);

        // Parameters table
        const tableData: string[][] = [];
        Object.entries(report.parameters).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    tableData.push([`${key} - ${subKey}`, String(subValue || 'N/A')]);
                });
            } else {
                tableData.push([key, String(value || 'N/A')]);
            }
        });

        autoTable(doc, {
            head: [['Parameter', 'Value']],
            body: tableData,
            startY: 85,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [68, 114, 196], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        window.open(doc.output('bloburl'), '_blank');
    };

    const handleExport = async (format: string) => {
        const data = reports;
        const headers = ['Sl.No', 'OP No', 'Name', 'Report Name', 'Date'];

        switch (format) {
            case 'csv':
                exportToCSV(data, headers);
                break;
            case 'excel':
                await exportToExcel(data, headers);
                break;
            case 'pdf':
                exportToPDF(data, headers);
                break;
            default:
                break;
        }
        setExportDropdownOpen(false);
    };

    const exportToCSV = (data: Report[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const BOM = '\uFEFF';
        const csvContent = [
            `"Reports - ${selectedDate}"`,
            `"Generated on: ${dateTime.readable}"`,
            `"Total Records: ${data.length}"`,
            `""`,
            headers.map(header => `"${header}"`).join(','),
            ...data.map((report, index) => [
                index + 1,
                `"${report.patients.opno}"`,
                `"${report.patients.name.replace(/"/g, '""')}"`,
                `"${report.report_name.replace(/"/g, '""')}"`,
                `"${new Date(report.report_date).toLocaleDateString()}"`,
            ].join(','))
        ].join('\r\n');

        const blob = new Blob([BOM + csvContent], {
            type: 'text/csv;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reports-${selectedDate}-${dateTime.filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToExcel = async (data: Report[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reports');

        worksheet.addRow([`Reports - ${selectedDate}`]);
        worksheet.addRow([`Generated on: ${dateTime.readable}`]);
        worksheet.addRow([`Total Records: ${data.length}`]);
        worksheet.addRow([]);

        worksheet.getRow(1).font = { bold: true, size: 16 };
        worksheet.getRow(2).font = { italic: true };
        worksheet.getRow(3).font = { italic: true };

        worksheet.addRow(headers);

        worksheet.getRow(5).font = { bold: true };
        worksheet.getRow(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        data.forEach((report, index) => {
            worksheet.addRow([
                index + 1,
                report.patients.opno,
                report.patients.name,
                report.report_name,
                new Date(report.report_date).toLocaleDateString()
            ]);
        });

        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reports-${selectedDate}-${dateTime.filename}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToPDF = (data: Report[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text(`Reports - ${selectedDate}`, 20, 25);

        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text(`Generated on: ${dateTime.readable}`, 20, 35);
        doc.text(`Total Records: ${data.length}`, 20, 42);

        const tableData = data.map((report, index) => [
            index + 1,
            report.patients.opno,
            report.patients.name,
            report.report_name,
            new Date(report.report_date).toLocaleDateString()
        ]);

        autoTable(doc, {
            head: [headers],
            body: tableData,
            startY: 50,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [68, 114, 196], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                1: { halign: 'center', cellWidth: 25 },
                2: { cellWidth: 50 },
                3: { cellWidth: 40 },
                4: { halign: 'center', cellWidth: 30 },
            }
        });

        doc.save(`reports-${selectedDate}-${dateTime.filename}.pdf`);
    };

    const handleParameterChange = (paramName: string, value: string | boolean, section?: string) => {
        setEditFormData(prev => ({
            ...prev,
            parameters: {
                ...prev.parameters,
                ...(section ? {
                    [section]: {
                        ...prev.parameters[section],
                        [paramName]: value
                    }
                } : {
                    [paramName]: value
                })
            }
        }));
    };

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingReport) return;

        setLoading(true);

        try {
            const response = await fetch('/api/reports', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: doctorId!.toString()
                },
                body: JSON.stringify({
                    id: editingReport.id,
                    patient_id: editingReport.patients.id,
                    report_date: editFormData.date,
                    report_name: editFormData.reportGroup,
                    parameters: editFormData.parameters
                })
            });

            if (response.ok) {
                await fetchReports();
                setShowEditModal(false);
                setEditingReport(null);
                setEditFormData({ date: '', reportGroup: '', parameters: {} });
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error updating report:', error);
            alert('Error updating report');
        } finally {
            setLoading(false);
        }
    };

    const renderParameterInputs = () => {
        const categoryParams = TEST_CATEGORIES[editFormData.reportGroup as keyof typeof TEST_CATEGORIES];

        if (!categoryParams) return null;

        if (Array.isArray(categoryParams)) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {categoryParams.map((param) => (
                        <div key={param}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {param}
                            </label>
                            <input
                                type="text"
                                value={editFormData.parameters[param] || ''}
                                onChange={(e) => handleParameterChange(param, e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                    ))}
                </div>
            );
        } else if (typeof categoryParams === 'object') {
            return (
                <div className="space-y-6">
                    {Object.entries(categoryParams).map(([section, params]) => (
                        <div key={section}>
                            <h4 className="text-lg font-medium text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                {section}
                            </h4>
                            {section === 'RESISTANCE' ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {(params as string[]).map((param) => (
                                        <div key={param} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`${section}-${param}`}
                                                checked={editFormData.parameters[section]?.[param] || false}
                                                onChange={(e) => handleParameterChange(param, e.target.checked, section)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor={`${section}-${param}`} className="text-sm text-gray-700">
                                                {param}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {(params as string[]).map((param) => (
                                        <div key={param}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {param}
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.parameters[section]?.[param] || ''}
                                                onChange={(e) => handleParameterChange(param, e.target.value, section)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        return null;
    };

    const generatePageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > currentPage) {
            setPageDirection(1);
        } else {
            setPageDirection(-1);
        }
        setCurrentPage(newPage);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.dropdown-container')) {
                setDropdownOpen(null);
                setExportDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const pageVariants = {
        initial: (direction: number) => ({
            x: direction > 0 ? 200 : -200,
            opacity: 0,
        }),
        in: {
            x: 0,
            opacity: 1,
        },
        out: (direction: number) => ({
            x: direction < 0 ? 200 : -200,
            opacity: 0,
        }),
    };

    const pageTransition = {
        type: 'tween',
        ease: 'anticipate',
        duration: 0.2,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                    <p className="text-gray-600">View and manage daily reports</p>
                </div>

                <div className="flex space-x-3">
                    {/* Export Dropdown */}
                    <div className="relative dropdown-container">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExportDropdownOpen(!exportDropdownOpen);
                            }}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export</span>
                        </button>

                        <AnimatePresence>
                            {exportDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 z-10"
                                >
                                    <div className="py-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleExport('csv');
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                        >
                                            Export as CSV
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleExport('excel');
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                        >
                                            Export as Excel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleExport('pdf');
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                        >
                                            Export as PDF
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Date Selection */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="text-sm text-gray-500">
                        {reports.length} reports found for {new Date(selectedDate).toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* Page Size Selector */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-900 cursor-pointer focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={0}>All</option>
                    </select>
                    <span className="text-sm text-gray-700">entries</span>
                </div>

                <div className="text-sm text-gray-700">
                    {pageSize === 0
                        ? `Showing 1 to ${reports.length} of ${reports.length} entries`
                        : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, reports.length)} of ${reports.length} entries`
                    }
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto" style={{ position: 'relative', zIndex: 1 }}>
                    <table className="min-w-full divide-y divide-gray-200">

                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                    Sl.No
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    OP No
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Report Name
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            <AnimatePresence mode="wait" custom={pageDirection}>
                                {paginatedData.map((report, index) => {
                                    const sequentialNumber = pageSize === 0
                                        ? index + 1
                                        : (currentPage - 1) * pageSize + index + 1;

                                    return (
                                        <motion.tr
                                            key={`${currentPage}-${report.id}`}
                                            custom={pageDirection}
                                            variants={pageVariants}
                                            initial="initial"
                                            animate="in"
                                            exit="out"
                                            transition={pageTransition}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {sequentialNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                                {report.patients.opno}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {report.patients.name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {report.report_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="relative dropdown-container">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDropdownToggle(report.id, e.currentTarget, index);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                        </svg>
                                                    </button>


                                                    <AnimatePresence>
                                                        {dropdownOpen === report.id && (
                                                            <motion.div
                                                                ref={dropdownRef}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="w-32 bg-white rounded-md shadow-xl border border-gray-200"
                                                                style={{
                                                                    position: dropdownPosition.position,
                                                                    top: dropdownPosition.top,
                                                                    left: dropdownPosition.left,
                                                                    right: dropdownPosition.right,
                                                                    zIndex: dropdownPosition.zIndex
                                                                }}
                                                            >
                                                                <div className="py-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleView(report)}
                                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                                                    >
                                                                        View
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEdit(report)}
                                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handlePrint(report)}
                                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                                                    >
                                                                        Print
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDelete(report.id)}
                                                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer transition-colors"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            Previous
                        </motion.button>

                        <div className="flex space-x-1">
                            {generatePageNumbers().map((page) => (
                                <motion.button
                                    key={page}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-2 border text-sm font-medium rounded-md cursor-pointer transition-colors ${currentPage === page
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </motion.button>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            Next
                        </motion.button>
                    </div>

                    <div className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                    </div>
                </div>
            )}

            {/* View Modal */}
            <AnimatePresence>
                {showModal && viewingReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white bg-opacity-95 backdrop-blur-xl rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl border border-gray-200 border-opacity-20"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-medium text-gray-900">
                                    View Report - {viewingReport.report_name}
                                </h3>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setViewingReport(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </motion.button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div><strong>Patient:</strong> {viewingReport.patients.name}</div>
                                    <div><strong>OP No:</strong> {viewingReport.patients.opno}</div>
                                    <div><strong>Date:</strong> {new Date(viewingReport.report_date).toLocaleDateString()}</div>
                                    <div><strong>Report Type:</strong> {viewingReport.report_name}</div>
                                </div>

                                <div className="space-y-4">
                                    {Object.entries(viewingReport.parameters).map(([key, value]) => (
                                        <div key={key} className="border border-gray-200 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 mb-3">{key}</h4>
                                            {typeof value === 'object' && value !== null ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                                    {Object.entries(value).map(([subKey, subValue]) => (
                                                        <div key={subKey} className="text-sm">
                                                            <span className="font-medium text-gray-700">{subKey}:</span>
                                                            <span className="ml-2 text-gray-900">
                                                                {typeof subValue === 'boolean' ? (subValue ? 'Yes' : 'No') : String(subValue || 'N/A')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-900">{String(value || 'N/A')}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && editingReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white bg-opacity-95 backdrop-blur-xl rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-200 border-opacity-20"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Edit Report - {editingReport.patients.name}
                                </h3>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingReport(null);
                                        setEditFormData({ date: '', reportGroup: '', parameters: {} });
                                    }}
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </motion.button>
                            </div>

                            <form onSubmit={handleSubmitEdit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div><strong>Patient:</strong> {editingReport.patients.name}</div>
                                    <div><strong>OP No:</strong> {editingReport.patients.opno}</div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={editFormData.date}
                                            onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                                            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div><strong>Report Type:</strong> {editFormData.reportGroup}</div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4">
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                                        Test Parameters - {editFormData.reportGroup}
                                    </h4>
                                    {renderParameterInputs()}
                                </div>

                                <div className="flex justify-end space-x-3 pt-6">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditingReport(null);
                                            setEditFormData({ date: '', reportGroup: '', parameters: {} });
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2 cursor-pointer"
                                    >
                                        {loading && (
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        <span>{loading ? 'Updating...' : 'Update Report'}</span>
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
