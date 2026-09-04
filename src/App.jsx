import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/college/Dashboard';
import StudentDashboard from './components/student/StudentDashboard';
import GuardDashboard from './components/guard/GuardDashboard';
import VisitorPassView from './components/visitor/VisitorPassView';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { supabase } from './config/supabase';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  const [collegeActivePage, setCollegeActivePage] = useState('dashboard');
  const [branding, setBranding] = useState({
    portalLogo: null,
    loginBackground: null,
    collegeName: 'Vishnu Institute'
  });
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Load branding and portal settings from Supabase
  useEffect(() => {
    const loadPortalSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from('portal_settings')
          .select('*');

        if (settings) {
          const brandObj = { ...branding };
          settings.forEach(s => {
            if (s.key === 'portalLogo') brandObj.portalLogo = s.value;
            if (s.key === 'loginBackground') brandObj.loginBackground = s.value;
            if (s.key === 'collegeName') brandObj.collegeName = s.value;
            if (s.key === 'maintenance_mode') setIsMaintenanceMode(s.value === 'true' || s.value === true);
          });
          setBranding(prev => ({ ...prev, ...brandObj }));
        }
      } catch (e) {
        console.warn('Error loading portal settings:', e);
      }
    };

    loadPortalSettings();
  }, []);

  const handleBrandingUpdate = (key, value) => {
    setBranding(prev => ({ ...prev, [key]: value }));
  };

  const handleSplashFinish = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const MaintenanceScreen = () => (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center p-6 text-gray-900 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#f47c20]/20 to-transparent" />
      <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 border border-gray-100 shadow-xl shadow-gray-100 animate-pulse">
        <svg className="w-12 h-12 text-[#f47c20]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
      <h1 className="text-4xl font-black italic tracking-tighter mb-4 uppercase text-center text-gray-900">System Maintenance Mode</h1>
      <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px] mb-12 max-w-sm text-center leading-relaxed">
        Please try after some time. Security protocols remain active in the background.
      </p>
    </div>
  );

  // Public Visitor Pass Route (Accessible via QR scan without login)
  const isVisitorPassRoute = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/visitor-pass') ||
    window.location.pathname.startsWith('/pass/visitor') ||
    window.location.search.includes('visitor_pass') ||
    window.location.search.includes('data=') ||
    window.location.search.includes('pass_id=')
  );

  if (isVisitorPassRoute) {
    return <VisitorPassView />;
  }

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} branding={branding} />;
  }

  // Maintenance Gate
  if (isMaintenanceMode) {
    return <MaintenanceScreen />;
  }

  const isLoggedIn = !!currentUser && !!userProfile;

  return (
    <>
      {authLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-[#f9fafb]">
          <div className="w-10 h-10 border-4 border-[#f47c20] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : isLoggedIn ? (
        (userProfile.role?.trim() === 'college_admin' || userProfile.role?.trim() === 'admin') ? (
          <NotificationProvider>
            <Dashboard
              onLogout={handleLogout}
              branding={{
                ...branding,
                collegeName: branding.collegeName || userProfile.name || 'Vishnu Institute',
                portalLogo: branding.portalLogo || null
              }}
              onBrandingUpdate={handleBrandingUpdate}
              collegeData={{
                ...userProfile,
                collegeId: 'vishnu-institute',
                collegeName: branding.collegeName || 'Vishnu Institute'
              }}
              activePage={collegeActivePage || 'dashboard'}
              onNavigate={setCollegeActivePage}
            />
          </NotificationProvider>
        ) : userProfile.role?.trim() === 'guard' ? (
          <GuardDashboard onLogout={handleLogout} guardData={userProfile} />
        ) : (
          <StudentDashboard onLogout={handleLogout} studentData={userProfile} />
        )
      ) : (
        <LoginScreen branding={branding} />
      )}
    </>
  );
}

export default App;
