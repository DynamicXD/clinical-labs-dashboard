'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/auth';

interface SystemSettings {
    backupFrequency: string;
    autoBackup: boolean;
}

export default function SystemPage() {
    const [settings, setSettings] = useState<SystemSettings>({
        backupFrequency: 'daily',
        autoBackup: true
    });

    const [activeTab, setActiveTab] = useState('security');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    // Password change state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const { doctorId, username } = useAuth();

    useEffect(() => {
        // Load saved settings from localStorage (in real app, this would be from database)
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings(prev => ({ ...prev, ...parsed }));
        }
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // In a real app, you'd save this to the database
            localStorage.setItem('systemSettings', JSON.stringify(settings));

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof SystemSettings, value: string | boolean) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordLoading(true);
        setPasswordError('');
        setPasswordSuccess(false);

        // Client-side validation
        if (!passwordForm.currentPassword.trim()) {
            setPasswordError('Current password is required');
            setPasswordLoading(false);
            return;
        }

        if (!passwordForm.newPassword.trim()) {
            setPasswordError('New password is required');
            setPasswordLoading(false);
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New passwords do not match');
            setPasswordLoading(false);
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters long');
            setPasswordLoading(false);
            return;
        }

        if (passwordForm.currentPassword === passwordForm.newPassword) {
            setPasswordError('New password must be different from current password');
            setPasswordLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: doctorId!.toString()
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                setPasswordSuccess(true);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => setPasswordSuccess(false), 5000);
            } else {
                setPasswordError(result.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Password change error:', error);
            setPasswordError('Network error. Please check your connection and try again.');
        } finally {
            setPasswordLoading(false);
        }
    };

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

    const exportData = async (type: string) => {
        const dateTime = getISTDateTime();

        try {
            let data;
            let filename;

            switch (type) {
                case 'all':
                    // Export all tables - Actually fetch the data
                    try {
                        const [testGroupsRes, labTestsRes, reportGroupsRes, patientsRes, observationsRes] = await Promise.all([
                            fetch('/api/test-groups', { headers: { authorization: doctorId!.toString() } }),
                            fetch('/api/lab-tests', { headers: { authorization: doctorId!.toString() } }),
                            fetch('/api/report-groups', { headers: { authorization: doctorId!.toString() } }),
                            fetch('/api/patients', { headers: { authorization: doctorId!.toString() } }),
                            fetch('/api/observations', { headers: { authorization: doctorId!.toString() } })
                        ]);

                        const [testGroups, labTests, reportGroups, patients, observations] = await Promise.all([
                            testGroupsRes.json(),
                            labTestsRes.json(),
                            reportGroupsRes.json(),
                            patientsRes.json(),
                            observationsRes.json()
                        ]);

                        const allData = {
                            exportInfo: {
                                exportDate: dateTime.readable,
                                exportType: 'Complete Database',
                                doctor: username
                            },
                            testGroups: Array.isArray(testGroups) ? testGroups : [],
                            labTests: Array.isArray(labTests) ? labTests : [],
                            reportGroups: Array.isArray(reportGroups) ? reportGroups : [],
                            patients: Array.isArray(patients) ? patients : [],
                            observations: Array.isArray(observations) ? observations : [],
                            reports: [] // Keep this empty since reports API might not exist yet
                        };

                        data = JSON.stringify(allData, null, 2);
                        filename = `complete-database-${dateTime.filename}.json`;
                    } catch (error) {
                        console.error('Error fetching data for export:', error);
                        alert('Failed to export database. Please try again.');
                        return;
                    }
                    break;

                case 'test-groups':
                    const testGroupsResponse = await fetch('/api/test-groups', {
                        headers: { authorization: doctorId!.toString() }
                    });
                    const testGroups = await testGroupsResponse.json();
                    data = JSON.stringify({
                        exportInfo: {
                            exportDate: dateTime.readable,
                            exportType: 'Test Groups',
                            doctor: username
                        },
                        data: testGroups
                    }, null, 2);
                    filename = `test-groups-${dateTime.filename}.json`;
                    break;

                case 'lab-tests':
                    const labTestsResponse = await fetch('/api/lab-tests', {
                        headers: { authorization: doctorId!.toString() }
                    });
                    const labTests = await labTestsResponse.json();
                    data = JSON.stringify({
                        exportInfo: {
                            exportDate: dateTime.readable,
                            exportType: 'Lab Tests',
                            doctor: username
                        },
                        data: labTests
                    }, null, 2);
                    filename = `lab-tests-${dateTime.filename}.json`;
                    break;

                case 'report-groups':
                    const reportGroupsResponse = await fetch('/api/report-groups', {
                        headers: { authorization: doctorId!.toString() }
                    });
                    const reportGroups = await reportGroupsResponse.json();
                    data = JSON.stringify({
                        exportInfo: {
                            exportDate: dateTime.readable,
                            exportType: 'Report Groups',
                            doctor: username
                        },
                        data: reportGroups
                    }, null, 2);
                    filename = `report-groups-${dateTime.filename}.json`;
                    break;

                case 'patients':
                    const patientsResponse = await fetch('/api/patients', {
                        headers: { authorization: doctorId!.toString() }
                    });
                    const patients = await patientsResponse.json();
                    data = JSON.stringify({
                        exportInfo: {
                            exportDate: dateTime.readable,
                            exportType: 'Patients',
                            doctor: username
                        },
                        data: patients
                    }, null, 2);
                    filename = `patients-${dateTime.filename}.json`;
                    break;

                case 'observations':
                    const observationsResponse = await fetch('/api/observations', {
                        headers: { authorization: doctorId!.toString() }
                    });
                    const observations = await observationsResponse.json();
                    data = JSON.stringify({
                        exportInfo: {
                            exportDate: dateTime.readable,
                            exportType: 'Observations',
                            doctor: username
                        },
                        data: observations
                    }, null, 2);
                    filename = `observations-${dateTime.filename}.json`;
                    break;

                default:
                    return;
            }

            const dataBlob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    };

    const tabs = [
        { id: 'security', name: 'Security', icon: '🔒' },
        { id: 'backup', name: 'Backup & Export', icon: '💾' }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-600">Configure security and backup settings</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Security Settings */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>

                            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        required
                                        minLength={6}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm New Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                {passwordError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-red-600">{passwordError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}


                                {passwordSuccess && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <p className="text-sm text-green-600">Password changed successfully!</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                                >
                                    {passwordLoading && (
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    <span>{passwordLoading ? 'Changing Password...' : 'Change Password'}</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Backup & Export */}
                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Database Export</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Complete Database */}
                                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Complete Database</h4>
                                            <p className="text-sm text-gray-600 mt-1">Export all tables and data</p>
                                        </div>
                                        <button
                                            onClick={() => exportData('all')}
                                            className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                        >
                                            Export All
                                        </button>
                                    </div>
                                </div>

                                {/* Test Groups */}
                                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Test Groups</h4>
                                            <p className="text-sm text-gray-600 mt-1">Export test group categories</p>
                                        </div>
                                        <button
                                            onClick={() => exportData('test-groups')}
                                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                                        >
                                            Export
                                        </button>
                                    </div>
                                </div>

                                {/* Lab Tests */}
                                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Lab Tests</h4>
                                            <p className="text-sm text-gray-600 mt-1">Export laboratory test parameters</p>
                                        </div>
                                        <button
                                            onClick={() => exportData('lab-tests')}
                                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                                        >
                                            Export
                                        </button>
                                    </div>
                                </div>

                                {/* Report Groups */}
                                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Report Groups</h4>
                                            <p className="text-sm text-gray-600 mt-1">Export report categories</p>
                                        </div>
                                        <button
                                            onClick={() => exportData('report-groups')}
                                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                                        >
                                            Export
                                        </button>
                                    </div>
                                </div>

                                {/* Patients */}
                                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Patients</h4>
                                            <p className="text-sm text-gray-600 mt-1">Export patient records</p>
                                        </div>
                                        <button
                                            onClick={() => exportData('patients')}
                                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                                        >
                                            Export
                                        </button>
                                    </div>
                                </div>

                                {/* Observations */}
                                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Observations</h4>
                                            <p className="text-sm text-gray-600 mt-1">Export patient observations and test results</p>
                                        </div>
                                        <button
                                            onClick={() => exportData('observations')}
                                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                                        >
                                            Export
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Export Information</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• All exports include metadata with date, time (IST), and doctor information</li>
                                    <li>• Files are exported in JSON format for easy data portability</li>
                                    <li>• Individual table exports contain only the selected data type</li>
                                    <li>• Complete database export includes all tables in a single file</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
