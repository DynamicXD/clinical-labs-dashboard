'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      // Check localStorage for authentication
      const doctorId = localStorage.getItem('doctorId');
      const username = localStorage.getItem('username');
      
      // Check cookies for middleware compatibility
      const authToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='));
      
      if (doctorId && username && authToken) {
        // User is authenticated
        router.replace('/dashboard/home');
      } else {
        // User is not authenticated
        router.replace('/login');
      }
    };

    // Small delay to prevent flash
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  // Loading screen while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        {/* Logo/Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        
        {/* Loading Text */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Medical Dashboard</h1>
        <p className="text-gray-600 mb-6">Please wait while we load your dashboard...</p>
        
        {/* Loading Animation */}
        <div className="inline-flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        
        {/* Fallback Link */}
        <div className="mt-8">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Click here if not redirected automatically
          </button>
        </div>
      </div>
    </div>
  );
}
