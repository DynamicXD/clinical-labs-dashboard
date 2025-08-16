// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Add this after your imports
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
    readable: `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`
  };
};


interface LabTest {
  id: number;
  name: string;
  normalValue: string;
  unit: string;
  group: string;
}

export default function LabTestsPage() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    normalValue: '',
    unit: '',
    group: ''
  });
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: string, bottom?: string, left?: string, right?: string }>({});

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageDirection, setPageDirection] = useState(0);

  // Export dropdown
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const [testGroups, setTestGroups] = useState<string[]>([]);

  const { doctorId } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLabTests();
    fetchTestGroups();
  }, [doctorId]);

  const fetchLabTests = async () => {
    if (!doctorId) return;

    try {
      const response = await fetch('/api/lab-tests', {
        headers: { authorization: doctorId.toString() }
      });
      const data = await response.json();
      setLabTests(Array.isArray(data) ? data : []);

      // Auto-refresh test groups when lab tests are fetched
      await fetchTestGroups();
    } catch (error) {
      console.error('Error fetching lab tests:', error);
    }
  };

  const fetchTestGroups = async () => {
    if (!doctorId) return;

    try {
      const response = await fetch('/api/test-groups', {
        headers: { authorization: doctorId.toString() }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        // Extract unique group names from test groups
        const groupNames = [...new Set(data.map(group => group.name))].sort();
        setTestGroups(groupNames);
      }
    } catch (error) {
      console.error('Error fetching test groups:', error);
    }
  };


  // Get unique groups for filter dropdown
  const availableGroups = useMemo(() => {
    // Combine test groups and existing lab test groups
    const labTestGroups = [...new Set(labTests.map(test => test.group).filter(Boolean))];
    const allGroups = [...new Set([...testGroups, ...labTestGroups])];
    return allGroups.sort();
  }, [testGroups, labTests]);


  // Sort, search and filter lab tests
  const sortedAndFilteredTests = useMemo(() => {
    let filtered = [...labTests].sort((a, b) => a.name.localeCompare(b.name));

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(test =>
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.normalValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.group.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply group filter
    if (filterGroup) {
      filtered = filtered.filter(test => test.group === filterGroup);
    }

    return filtered;
  }, [labTests, searchTerm, filterGroup]);

  // Pagination logic with filtered data
  const totalPages = useMemo(() => {
    return pageSize === 0 ? 1 : Math.ceil(sortedAndFilteredTests.length / pageSize);
  }, [sortedAndFilteredTests.length, pageSize]);

  const paginatedData = useMemo(() => {
    if (pageSize === 0) return sortedAndFilteredTests; // Show all
    const startIndex = (currentPage - 1) * pageSize;
    return sortedAndFilteredTests.slice(startIndex, startIndex + pageSize);
  }, [sortedAndFilteredTests, currentPage, pageSize]);

  // Reset to first page when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  // Calculate dropdown position based on row position
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

  const handleDropdownToggle = (testId: number, buttonElement: HTMLElement, rowIndex: number) => {
    if (dropdownOpen === testId) {
      setDropdownOpen(null);
    } else {
      const position = calculateDropdownPosition(buttonElement, rowIndex);
      setDropdownPosition(position);
      setDropdownOpen(testId);
    }
  };

  // Fixed pagination display logic
  const getPaginationText = () => {
    if (pageSize === 0) {
      return `Showing 1 to ${sortedAndFilteredTests.length} of ${sortedAndFilteredTests.length} entries`;
    }
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, sortedAndFilteredTests.length);
    return `Showing ${startIndex} to ${endIndex} of ${sortedAndFilteredTests.length} entries`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = '/api/lab-tests';
      const method = editingTest ? 'PUT' : 'POST';
      const body = editingTest
        ? { id: editingTest.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          authorization: doctorId!.toString()
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchLabTests();
        setShowModal(false);
        setEditingTest(null);
        setFormData({ name: '', normalValue: '', unit: '', group: '' });
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      console.error('Error saving lab test:', error);
      alert('Error saving lab test');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (test: LabTest) => {
    setEditingTest(test);
    setFormData({
      name: test.name,
      normalValue: test.normalValue,
      unit: test.unit,
      group: test.group
    });
    setShowModal(true);
    setDropdownOpen(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this lab test?')) {
      try {
        const response = await fetch('/api/lab-tests', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            authorization: doctorId!.toString()
          },
          body: JSON.stringify({ id })
        });

        if (response.ok) {
          await fetchLabTests();
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        console.error('Error deleting lab test:', error);
        alert('Error deleting lab test');
      }
    }
    setDropdownOpen(null);
  };

  const handleExport = async (format: string) => {
    const data = sortedAndFilteredTests;
    const headers = ['Sl.No', 'Name', 'Normal Value', 'Unit', 'Group'];

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

  const exportToCSV = (data: LabTest[], headers: string[]) => {
    const dateTime = getISTDateTime();
    const BOM = '\uFEFF';
    const csvContent = [
      `"Lab Tests Report"`,
      `"Generated on: ${dateTime.readable}"`,
      `"Total Records: ${data.length}"`,
      `""`, // Empty line
      headers.map(header => `"${header}"`).join(','),
      ...data.map((test, index) => [
        index + 1,
        `"${test.name.replace(/"/g, '""')}"`,
        `"${test.normalValue.replace(/"/g, '""')}"`,
        `"${test.unit.replace(/"/g, '""')}"`,
        `"${test.group.replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\r\n');

    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lab-tests-${dateTime.filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async (data: LabTest[], headers: string[]) => {
    const dateTime = getISTDateTime();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lab Tests');

    // Add headers
    worksheet.addRow(headers);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    data.forEach((test, index) => {
      worksheet.addRow([
        index + 1,
        test.name,
        test.normalValue,
        test.unit,
        test.group
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
    link.download = `lab-tests-${dateTime.filename}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (data: LabTest[], headers: string[]) => {
    const dateTime = getISTDateTime();
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Lab Tests Report', 20, 25);

    // Add metadata
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Total Records: ${data.length}`, 20, 42);

    // Prepare table data
    const tableData = data.map((test, index) => [
      index + 1,
      test.name,
      test.normalValue || 'N/A',
      test.unit || 'N/A',
      test.group || 'N/A'
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
        1: { cellWidth: 60 }, // Name
        2: { cellWidth: 35 }, // Normal Value  
        3: { cellWidth: 25 }, // Unit
        4: { cellWidth: 40 }, // Group
      }
    });

    doc.save(`lab-tests-${dateTime.filename}.pdf`);
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
          <h1 className="text-2xl font-bold text-gray-900">Lab Tests</h1>
          <p className="text-gray-600">Manage laboratory test parameters and reference ranges</p>
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
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Lab Test</span>
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
              placeholder="Search by name, normal value, unit, or group..."
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
              value={filterGroup}
              onChange={(e) => {
                setFilterGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">All Groups</option>
              {availableGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || filterGroup) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterGroup('');
                setCurrentPage(1);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="text-sm text-gray-500 whitespace-nowrap">
          {searchTerm || filterGroup ? `Found ${sortedAndFilteredTests.length} results` : `${labTests.length} total entries`}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Normal Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <AnimatePresence mode="wait" custom={pageDirection}>
                {paginatedData.map((test, index) => {
                  // Calculate sequential S.No based on current page
                  const sequentialNumber = pageSize === 0
                    ? index + 1
                    : (currentPage - 1) * pageSize + index + 1;

                  return (
                    <motion.tr
                      key={`${currentPage}-${test.id}`}
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
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
                        <div title={test.name} className="truncate">
                          {truncateText(test.name, 30)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div title={test.normalValue} className="truncate">
                          {test.normalValue ? truncateText(test.normalValue, 20) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div title={test.unit} className="truncate">
                          {test.unit ? truncateText(test.unit, 15) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div title={test.group} className="truncate">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {test.group ? truncateText(test.group, 15) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDropdownToggle(test.id, e.currentTarget, index);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>

                          <AnimatePresence>
                            {dropdownOpen === test.id && (
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
                                      handleEdit(test);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDelete(test.id);
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
                  {editingTest ? 'Edit Lab Test' : 'Add New Lab Test'}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTest(null);
                    setFormData({ name: '', normalValue: '', unit: '', group: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={50}
                    required
                    placeholder="e.g., HEMOGLOBIN"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.name.length}/50 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Normal Value</label>
                  <input
                    type="text"
                    value={formData.normalValue}
                    onChange={(e) => setFormData({ ...formData, normalValue: e.target.value })}
                    maxLength={30}
                    placeholder="e.g., 14-18 or <200"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.normalValue.length}/30 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    maxLength={20}
                    placeholder="e.g., Gm %, Mg/dl, %"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.unit.length}/20 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group</label>
                  <select
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="">Select Group</option>
                    {availableGroups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.group}
                      onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                      placeholder="Or type a new group name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.group.length}/30 characters</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTest(null);
                      setFormData({ name: '', normalValue: '', unit: '', group: '' });
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
                    <span>{loading ? 'Saving...' : (editingTest ? 'Update' : 'Create')}</span>
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
