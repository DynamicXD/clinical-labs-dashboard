'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Patient {
  id: number;
  opno: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  address: string;
  created_at?: string;
}

// IST DateTime helper function
const getISTDateTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
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

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    opno: '',
    name: '',
    age: '',
    gender: 'M' as 'M' | 'F',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top?: string, bottom?: string, left?: string, right?: string}>({});
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [sortField, setSortField] = useState<keyof Patient>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageDirection, setPageDirection] = useState(0);
  
  // Export dropdown
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  
  const { doctorId } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPatients();
  }, [doctorId]);

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

  // Sort, search and filter patients
  const sortedAndFilteredPatients = useMemo(() => {
    let filtered = [...patients];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.opno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.age.toString().includes(searchTerm.toLowerCase()) ||
        patient.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply gender filter
    if (filterGender) {
      filtered = filtered.filter(patient => patient.gender === filterGender);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Convert to comparable values
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return filtered;
  }, [patients, searchTerm, filterGender, sortField, sortDirection]);

  // Pagination logic with filtered data
  const totalPages = useMemo(() => {
    return pageSize === 0 ? 1 : Math.ceil(sortedAndFilteredPatients.length / pageSize);
  }, [sortedAndFilteredPatients.length, pageSize]);

  const paginatedData = useMemo(() => {
    if (pageSize === 0) return sortedAndFilteredPatients; // Show all
    const startIndex = (currentPage - 1) * pageSize;
    return sortedAndFilteredPatients.slice(startIndex, startIndex + pageSize);
  }, [sortedAndFilteredPatients, currentPage, pageSize]);

  // Reset to first page when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  // Generate next OPNO
  const generateNextOpno = () => {
    if (patients.length === 0) return '000001';
    const maxOpno = Math.max(...patients.map(p => parseInt(p.opno)));
    return (maxOpno + 1).toString().padStart(6, '0');
  };

  // Calculate dropdown position based on row position
  const calculateDropdownPosition = (buttonElement: HTMLElement, rowIndex: number) => {
    const isNearTop = rowIndex <= 1;
    const isNearBottom = rowIndex >= paginatedData.length - 2;
    
    let position: {top?: string, bottom?: string, left?: string, right?: string} = {};
    
    if (isNearTop) {
      position = { top: '100%', right: '0px' };
    } else if (isNearBottom) {
      position = { bottom: '100%', right: '0px' };
    } else {
      position = { top: '50%', right: '100%', transform: 'translateY(-50%)' };
    }
    
    return position;
  };

  const handleDropdownToggle = (patientId: number, buttonElement: HTMLElement, rowIndex: number) => {
    if (dropdownOpen === patientId) {
      setDropdownOpen(null);
    } else {
      const position = calculateDropdownPosition(buttonElement, rowIndex);
      setDropdownPosition(position);
      setDropdownOpen(patientId);
    }
  };

  const handleSort = (field: keyof Patient) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Patient) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Fixed pagination display logic
  const getPaginationText = () => {
    if (pageSize === 0) {
      return `Showing 1 to ${sortedAndFilteredPatients.length} of ${sortedAndFilteredPatients.length} entries`;
    }
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, sortedAndFilteredPatients.length);
    return `Showing ${startIndex} to ${endIndex} of ${sortedAndFilteredPatients.length} entries`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = '/api/patients';
      const method = editingPatient ? 'PUT' : 'POST';
      const body = editingPatient 
        ? { id: editingPatient.id, ...formData }
        : { ...formData, opno: formData.opno || generateNextOpno() };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          authorization: doctorId!.toString()
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchPatients();
        setShowModal(false);
        setEditingPatient(null);
        setFormData({ opno: '', name: '', age: '', gender: 'M', address: '' });
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Error saving patient');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      opno: patient.opno,
      name: patient.name,
      age: patient.age.toString(),
      gender: patient.gender,
      address: patient.address
    });
    setShowModal(true);
    setDropdownOpen(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this patient?')) {
      try {
        const response = await fetch('/api/patients', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            authorization: doctorId!.toString()
          },
          body: JSON.stringify({ id })
        });

        if (response.ok) {
          await fetchPatients();
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        console.error('Error deleting patient:', error);
        alert('Error deleting patient');
      }
    }
    setDropdownOpen(null);
  };

  const handleExport = async (format: string) => {
    const data = sortedAndFilteredPatients;
    const headers = ['Sl.No', 'OP No', 'Name', 'Age', 'Gender', 'Address'];
    
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

  const exportToCSV = (data: Patient[], headers: string[]) => {
    const dateTime = getISTDateTime();
    const BOM = '\uFEFF';
    const csvContent = [
      `"Patients Report"`,
      `"Generated on: ${dateTime.readable}"`,
      `"Total Records: ${data.length}"`,
      `""`, // Empty line
      headers.map(header => `"${header}"`).join(','),
      ...data.map((patient, index) => [
        index + 1,
        `"${patient.opno}"`,
        `"${patient.name.replace(/"/g, '""')}"`,
        patient.age,
        `"${patient.gender === 'M' ? 'Male' : 'Female'}"`,
        `"${patient.address.replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\r\n');

    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients-${dateTime.filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async (data: Patient[], headers: string[]) => {
    const dateTime = getISTDateTime();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Patients');

    // Add title and metadata
    worksheet.addRow(['Patients Report']);
    worksheet.addRow([`Generated on: ${dateTime.readable}`]);
    worksheet.addRow([`Total Records: ${data.length}`]);
    worksheet.addRow([]); // Empty row
    
    // Style title
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { italic: true };
    worksheet.getRow(3).font = { italic: true };

    // Add headers
    worksheet.addRow(headers);
    
    // Style headers (row 5 now)
    worksheet.getRow(5).font = { bold: true };
    worksheet.getRow(5).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    data.forEach((patient, index) => {
      worksheet.addRow([
        index + 1,
        patient.opno,
        patient.name,
        patient.age,
        patient.gender === 'M' ? 'Male' : 'Female',
        patient.address
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients-${dateTime.filename}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (data: Patient[], headers: string[]) => {
    const dateTime = getISTDateTime();
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Patients Report', 20, 25);
    
    // Add metadata with IST time
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated on: ${dateTime.readable}`, 20, 35);
    doc.text(`Total Records: ${data.length}`, 20, 42);

    // Prepare table data
    const tableData = data.map((patient, index) => [
      index + 1,
      patient.opno,
      patient.name,
      patient.age,
      patient.gender === 'M' ? 'Male' : 'Female',
      patient.address || 'N/A'
    ]);

    // Add table
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 50,
      styles: { 
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: { 
        fillColor: [68, 114, 196],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 }, // Sl.No
        1: { halign: 'center', cellWidth: 25 }, // OP No
        2: { cellWidth: 50 }, // Name
        3: { halign: 'center', cellWidth: 15 }, // Age
        4: { halign: 'center', cellWidth: 20 }, // Gender
        5: { cellWidth: 60 }, // Address
      }
    });

    doc.save(`patients-${dateTime.filename}.pdf`);
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

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Enhanced page navigation with animation direction
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
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Animation variants for page transitions (faster)
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
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600">Manage patient records and information</p>
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

          {/* Add Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowModal(true);
              setFormData({ ...formData, opno: generateNextOpno() });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Patient</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Box */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by OP No, name, age, or address..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="sm:w-48">
            <select
              value={filterGender}
              onChange={(e) => {
                setFilterGender(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">All Genders</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          
          {(searchTerm || filterGender) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterGender('');
                setCurrentPage(1);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {searchTerm || filterGender ? `Found ${sortedAndFilteredPatients.length} results` : `${patients.length} total entries`}
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
          {getPaginationText()}
        </div>
      </div>

      {/* Table with Animation */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Sl.No
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('opno')}
                >
                  <div className="flex items-center space-x-1">
                    <span>OP No</span>
                    {getSortIcon('opno')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('age')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Age</span>
                    {getSortIcon('age')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('gender')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Gender</span>
                    {getSortIcon('gender')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <AnimatePresence mode="wait" custom={pageDirection}>
                {paginatedData.map((patient, index) => {
                  // Calculate sequential S.No based on current page
                  const sequentialNumber = pageSize === 0 
                    ? index + 1 
                    : (currentPage - 1) * pageSize + index + 1;
                  
                  return (
                    <motion.tr 
                      key={`${currentPage}-${patient.id}`}
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
                        {patient.opno}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
                        <div title={patient.name} className="truncate">
                          {truncateText(patient.name, 30)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.age}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.gender === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {patient.gender === 'M' ? 'Male' : 'Female'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div title={patient.address} className="truncate">
                          {patient.address ? truncateText(patient.address, 25) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDropdownToggle(patient.id, e.currentTarget, index);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          
                          <AnimatePresence>
                            {dropdownOpen === patient.id && (
                              <motion.div 
                                ref={dropdownRef}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute w-32 bg-white rounded-md shadow-xl border border-gray-200 z-50"
                                style={dropdownPosition}
                              >
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleEdit(patient);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDelete(patient.id);
                                    }}
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
                  className={`px-3 py-2 border text-sm font-medium rounded-md cursor-pointer transition-colors ${
                    currentPage === page
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

      {/* Modal with Blur Background */}
      <AnimatePresence>
        {showModal && (
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
              className="bg-white bg-opacity-95 backdrop-blur-xl rounded-xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 border-opacity-20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPatient ? 'Edit Patient' : 'Add New Patient'}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPatient(null);
                    setFormData({ opno: '', name: '', age: '', gender: 'M', address: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OP Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.opno}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6).padStart(6, '0');
                        setFormData({ ...formData, opno: value });
                      }}
                      required
                      placeholder="000001"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">6-digit patient number</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.age}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                        setFormData({ ...formData, age: value });
                      }}
                      required
                      placeholder="25"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum 2 digits</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 100) })}
                    required
                    placeholder="Mr. John Doe"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.name.length}/100 characters</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value.slice(0, 100) })}
                    rows={3}
                    placeholder="Patient's address..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.address.length}/100 characters</p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPatient(null);
                      setFormData({ opno: '', name: '', age: '', gender: 'M', address: '' });
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
                    <span>{loading ? 'Saving...' : (editingPatient ? 'Update' : 'Create')}</span>
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
