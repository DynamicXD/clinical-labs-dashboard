// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Patient {
    id: number;
    name: string;
    opno: string;
}

interface Observation {
    id: number;
    report_date: string;
    report_name: string;
    parameters: Record<string, any>;
    patients: Patient;
}

// Test categories and their parameters
// Updated test categories with section-based structure
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
    // Combined SEMEN category (shows both sections)
    'SEMEN': {
        'SEMEN ANALYSIS': ['SEMEN ANALYSIS', 'VOLUME', 'VISCOSITY', 'COLOUR', 'ODOUR', 'REACTION', 'PH', 'COUNT'],
        'MOTILITY': ['MOTILITY', 'ACTIVE MOTILE', 'SLUGGISH MOTILE', 'NON MOTILE', 'ABNORMAL', 'PUS CELLS', 'RBC', 'EPITHELIAL CELLS']
    },
    // Combined URINE category (shows both sections)
    'URINE': {
        'URINE': ['URINE', 'REACTION', 'PH', 'ACETONE', 'ALBUMIN', 'SUGAR', 'BILE SALT', 'BILE PIGMENT', 'MICROALBUMIN'],
        'DEPOSITS': ['DEPOSITS', 'PUS CELLS', 'RBC', 'EPITHELIAL CELLS', 'CASTS', 'CRYSTALS', 'OTHERS', 'PREGNANCY TEST', 'SPECIFIC GRAVITY', 'CULTURE & SENSITIVITY']
    },
    // Individual categories (simple arrays)
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

export default function ObservationsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [observations, setObservations] = useState<Observation[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
    const [viewingObservation, setViewingObservation] = useState<Observation | null>(null);

    // Add report form data
    const [addFormData, setAddFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        reportGroup: '',
        parameters: {} as Record<string, any>
    });

    const [loading, setLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ position?: string, top?: string, bottom?: string, left?: string, right?: string, transform?: string, zIndex?: number }>({});

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [pageDirection, setPageDirection] = useState(0);

    const { doctorId } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchPatients();
    }, [doctorId]);

    useEffect(() => {
        if (selectedPatient) {
            fetchObservations();
        } else {
            setObservations([]);
        }
    }, [selectedPatient]);

    const fetchPatients = async () => {
        if (!doctorId) return;

        try {
            const response = await fetch('/api/patients', {
                headers: { authorization: doctorId.toString() }
            });
            const data = await response.json();
            setPatients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching patients:', error);
        }
    };

    const fetchObservations = async () => {
        if (!doctorId || !selectedPatient) return;

        try {
            const response = await fetch(`/api/observations?patient_id=${selectedPatient.id}`, {
                headers: { authorization: doctorId.toString() }
            });
            const data = await response.json();
            setObservations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching observations:', error);
        }
    };

    // Pagination logic
    const totalPages = useMemo(() => {
        return pageSize === 0 ? 1 : Math.ceil(observations.length / pageSize);
    }, [observations.length, pageSize]);

    const paginatedData = useMemo(() => {
        if (pageSize === 0) return observations;
        const startIndex = (currentPage - 1) * pageSize;
        return observations.slice(startIndex, startIndex + pageSize);
    }, [observations, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize]);

    const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const patientId = parseInt(e.target.value);
        const patient = patients.find(p => p.id === patientId);
        setSelectedPatient(patient || null);
        setCurrentPage(1);
    };

    const handlePatientKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && selectedPatient) {
            fetchObservations();
        }
    };

    const calculateDropdownPosition = (buttonElement: HTMLElement, rowIndex: number) => {
        const isNearTop = rowIndex <= 1;
        const isNearBottom = rowIndex >= paginatedData.length - 2;

        let position: { top?: string, bottom?: string, left?: string, right?: string } = {};

        if (isNearTop) {
            position = { top: '100%', right: '0px' };
        } else if (isNearBottom) {
            position = { bottom: '100%', right: '0px' };
        } else {
            position = { top: '50%', right: '100%', transform: 'translateY(-50%)' };
        }

        return position;
    };

    const handleDropdownToggle = (observationId: number, buttonElement: HTMLElement, rowIndex: number) => {
        if (dropdownOpen === observationId) {
            setDropdownOpen(null);
        } else {
            // Use fixed positioning based on button's screen position
            const rect = buttonElement.getBoundingClientRect();
            const position = {
                position: 'fixed',
                top: `${rect.bottom + 5}px`,
                right: `${window.innerWidth - rect.right}px`,
                zIndex: 9999
            };
            setDropdownPosition(position);
            setDropdownOpen(observationId);
        }
    };

    const handleView = (observation: Observation) => {
        setViewingObservation(observation);
        setShowModal(true);
        setDropdownOpen(null);
    };

    const handleEdit = (observation: Observation) => {
        setEditingObservation(observation);
        setAddFormData({
            date: observation.report_date,
            reportGroup: observation.report_name,
            parameters: observation.parameters
        });
        setShowAddModal(true);
        setDropdownOpen(null);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this observation?')) {
            try {
                const response = await fetch('/api/observations', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: doctorId!.toString()
                    },
                    body: JSON.stringify({ id })
                });

                if (response.ok) {
                    await fetchObservations();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error('Error deleting observation:', error);
                alert('Error deleting observation');
            }
        }
        setDropdownOpen(null);
    };

    const handlePrint = (observation: Observation) => {
        generatePrintableReport(observation);
        setDropdownOpen(null);
    };

    const generatePrintableReport = (observation: Observation) => {
        const dateTime = getISTDateTime();
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('LABORATORY REPORT', 105, 25, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Patient: ${observation.patients.name}`, 20, 45);
        doc.text(`OP No: ${observation.patients.opno}`, 20, 52);
        doc.text(`Report Date: ${new Date(observation.report_date).toLocaleDateString()}`, 20, 59);
        doc.text(`Report Type: ${observation.report_name}`, 20, 66);
        doc.text(`Generated on: ${dateTime.readable}`, 20, 73);

        // Parameters table
        const tableData: string[][] = [];
        Object.entries(observation.parameters).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                // Handle nested objects (like URINE CULTURE)
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

        // Open print dialog
        window.open(doc.output('bloburl'), '_blank');
    };

    const handleAddReport = () => {
        setAddFormData({
            date: new Date().toISOString().split('T')[0],
            reportGroup: '',
            parameters: {}
        });
        setEditingObservation(null);
        setShowAddModal(true);
    };

    const handleReportGroupChange = (reportGroup: string) => {
        setAddFormData({ ...addFormData, reportGroup, parameters: {} });

        // Initialize parameters based on selected group
        const categoryParams = TEST_CATEGORIES[reportGroup as keyof typeof TEST_CATEGORIES];
        const initialParams: Record<string, any> = {};

        if (Array.isArray(categoryParams)) {
            // Simple parameter list
            categoryParams.forEach(param => {
                initialParams[param] = '';
            });
        } else if (typeof categoryParams === 'object') {
            // Handle complex categories with sections
            Object.entries(categoryParams).forEach(([section, params]) => {
                if (section === 'RESISTANCE') {
                    // Checkboxes for resistance
                    initialParams[section] = {};
                    (params as string[]).forEach(param => {
                        initialParams[section][param] = false;
                    });
                } else {
                    // Text inputs for other sections
                    initialParams[section] = {};
                    (params as string[]).forEach(param => {
                        initialParams[section][param] = '';
                    });
                }
            });
        }

        setAddFormData(prev => ({ ...prev, parameters: initialParams }));
    };

    const handleParameterChange = (paramName: string, value: string | boolean, section?: string) => {
        setAddFormData(prev => ({
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

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setLoading(true);

        try {
            const url = '/api/observations';
            const method = editingObservation ? 'PUT' : 'POST';
            const body = editingObservation
                ? {
                    id: editingObservation.id,
                    patient_id: selectedPatient.id,
                    report_date: addFormData.date,
                    report_name: addFormData.reportGroup,
                    parameters: addFormData.parameters
                }
                : {
                    patient_id: selectedPatient.id,
                    report_date: addFormData.date,
                    report_name: addFormData.reportGroup,
                    parameters: addFormData.parameters
                };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    authorization: doctorId!.toString()
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await fetchObservations();
                setShowAddModal(false);
                setEditingObservation(null);
                setAddFormData({ date: new Date().toISOString().split('T')[0], reportGroup: '', parameters: {} });
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error saving observation:', error);
            alert('Error saving observation');
        } finally {
            setLoading(false);
        }
    };

    const renderParameterInputs = () => {
        const categoryParams = TEST_CATEGORIES[addFormData.reportGroup as keyof typeof TEST_CATEGORIES];

        if (!categoryParams) return null;

        if (Array.isArray(categoryParams)) {
            // Simple parameter list (individual categories)
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {categoryParams.map((param) => (
                        <div key={param}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {param}
                            </label>
                            <input
                                type="text"
                                value={addFormData.parameters[param] || ''}
                                onChange={(e) => handleParameterChange(param, e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                    ))}
                </div>
            );
        } else if (typeof categoryParams === 'object') {
            // Complex category with multiple sections
            return (
                <div className="space-y-6">
                    {Object.entries(categoryParams).map(([section, params]) => (
                        <div key={section}>
                            <h4 className="text-lg font-medium text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                {section}
                            </h4>
                            {section === 'RESISTANCE' ? (
                                // Checkboxes for resistance
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {(params as string[]).map((param) => (
                                        <div key={param} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`${section}-${param}`}
                                                checked={addFormData.parameters[section]?.[param] || false}
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
                                // Text inputs for other sections
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {(params as string[]).map((param) => (
                                        <div key={param}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {param}
                                            </label>
                                            <input
                                                type="text"
                                                value={addFormData.parameters[section]?.[param] || ''}
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.dropdown-container')) {
                setDropdownOpen(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Animation variants
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
                    <h1 className="text-2xl font-bold text-gray-900">Observations</h1>
                    <p className="text-gray-600">Manage patient observations and test reports</p>
                </div>
            </div>

            {/* Patient Selection */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Patient
                        </label>
                        <select
                            value={selectedPatient?.id || ''}
                            onChange={handlePatientSelect}
                            onKeyPress={handlePatientKeyPress}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                        >
                            <option value="">Choose a patient...</option>
                            {patients.map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.name} (OP: {patient.opno})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedPatient && (
                <>
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

                        <button
                            onClick={handleAddReport}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Report</span>
                        </button>
                    </div>

                    {/* Observations Table */}
                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                            Sl.No
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
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
                                        {paginatedData.map((observation, index) => {
                                            const sequentialNumber = pageSize === 0
                                                ? index + 1
                                                : (currentPage - 1) * pageSize + index + 1;

                                            return (
                                                <motion.tr
                                                    key={`${currentPage}-${observation.id}`}
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
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {new Date(observation.report_date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {observation.report_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="relative dropdown-container">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleDropdownToggle(observation.id, e.currentTarget, index);
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                </svg>
                                                            </button>

                                                            <AnimatePresence>
                                                                {dropdownOpen === observation.id && (
                                                                    <motion.div
                                                                        ref={dropdownRef}
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                                        transition={{ duration: 0.15 }}
                                                                        className="absolute w-32 bg-white rounded-md shadow-xl border border-gray-200 z-50"
                                                                        style={{
                                                                            position: dropdownPosition.position || 'absolute' as any,
                                                                            top: dropdownPosition.top,
                                                                            right: dropdownPosition.right,
                                                                            bottom: dropdownPosition.bottom,
                                                                            left: dropdownPosition.left,
                                                                            transform: dropdownPosition.transform,
                                                                            zIndex: dropdownPosition.zIndex || 9999
                                                                        }}

                                                                    >
                                                                        <div className="py-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleView(observation)}
                                                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                                                            >
                                                                                View
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleEdit(observation)}
                                                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handlePrint(observation)}
                                                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                                                            >
                                                                                Print
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDelete(observation.id)}
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
                </>
            )}

            {/* View Modal */}
            <AnimatePresence>
                {showModal && viewingObservation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4 z-50"
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
                                    View Report - {viewingObservation.report_name}
                                </h3>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setViewingObservation(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </motion.button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 text-zinc-700 rounded-lg">
                                    <div>
                                        <strong>Patient:</strong> {viewingObservation.patients.name}
                                    </div>
                                    <div>
                                        <strong>OP No:</strong> {viewingObservation.patients.opno}
                                    </div>
                                    <div>
                                        <strong>Date:</strong> {new Date(viewingObservation.report_date).toLocaleDateString()}
                                    </div>
                                    <div>
                                        <strong>Report Type:</strong> {viewingObservation.report_name}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {Object.entries(viewingObservation.parameters).map(([key, value]) => (
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
                                                <div className="text-sm text-gray-900">
                                                    {String(value || 'N/A')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add/Edit Report Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4 z-50"
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
                                    {editingObservation ? 'Edit Report' : 'Add New Report'}
                                </h3>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingObservation(null);
                                        setAddFormData({ date: new Date().toISOString().split('T')[0], reportGroup: '', parameters: {} });
                                    }}
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </motion.button>
                            </div>

                            <form onSubmit={handleSubmitReport} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Report Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={addFormData.date}
                                            onChange={(e) => setAddFormData({ ...addFormData, date: e.target.value })}
                                            required
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Report Group <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={addFormData.reportGroup}
                                            onChange={(e) => handleReportGroupChange(e.target.value)}
                                            required
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                                        >
                                            <option value="">Select Report Group</option>
                                            {Object.keys(TEST_CATEGORIES).map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {addFormData.reportGroup && (
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                                            Test Parameters - {addFormData.reportGroup}
                                        </h4>
                                        {renderParameterInputs()}
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3 pt-6">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setEditingObservation(null);
                                            setAddFormData({ date: new Date().toISOString().split('T')[0], reportGroup: '', parameters: {} });
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="submit"
                                        disabled={loading || !addFormData.reportGroup}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2 cursor-pointer"
                                    >
                                        {loading && (
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        <span>{loading ? 'Saving...' : (editingObservation ? 'Update Report' : 'Create Report')}</span>
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
