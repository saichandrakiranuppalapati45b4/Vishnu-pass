import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/admin/Dashboard';
import StudentDashboard from './components/student/StudentDashboard';
import GuardDashboard from './components/guard/GuardDashboard';
import PlatformAdminDashboard from './components/platform/PlatformAdminDashboard';
import SuperAdminAccessModal from './components/admin/SuperAdminAccessModal';
import SuperAdminPortal from './components/admin/SuperAdminPortal';
import { useAuth } from './contexts/AuthContext';
import { auth, db } from './config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  
  const [adminActivePage, setAdminActivePage] = useState('dashboard');
  const [branding, setBranding] = useState({
    portalLogo: null,
    loginBackground: null,
    adminName: 'Admin User'
  });
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  
  // Super Admin States
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState(false);

  useEffect(() => {
    // In Phase 5+, fetch from Firestore instead of Supabase
    // For now, using default branding
    setBranding({
      portalLogo: null,
      loginBackground: null,
      adminName: 'Platform Admin'
    });
    setIsMaintenanceMode(false);
  }, []);

  // Keyboard Shortcut for Super Admin: Ctrl + Shift + Space
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey) {
        if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
          e.preventDefault();
          e.stopPropagation();
          
          if (userProfile?.role === 'platform_admin' || userProfile?.role === 'college_admin') {
            setShowSuperAdminModal(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userProfile]);

  const handleBrandingUpdate = (key, value) => {
    setBranding(prev => ({ ...prev, [key]: value }));
  };

  const handleSplashFinish = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
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

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} branding={branding} />;
  }

  // Maintenance Gate
  if (isMaintenanceMode && userProfile?.role !== 'platform_admin') {
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
        userProfile.role === 'platform_admin' ? (
          <PlatformAdminDashboard />
        ) : userProfile.role === 'college_admin' ? (
          <Dashboard 
            onLogout={handleLogout} 
            branding={branding} 
            onBrandingUpdate={handleBrandingUpdate} 
            adminData={userProfile} 
            activePage={adminActivePage}
            onNavigate={setAdminActivePage}
          />
        ) : userProfile.role === 'guard' ? (
          <GuardDashboard onLogout={handleLogout} guardData={userProfile} />
        ) : (
          <StudentDashboard onLogout={handleLogout} studentData={userProfile} />
        )
      ) : (
        <LoginScreen branding={branding} />
      )}

      {/* Super Admin Overlays */}
      <SuperAdminAccessModal 
        isOpen={showSuperAdminModal} 
        onClose={() => setShowSuperAdminModal(false)}
        onVerified={() => setIsSuperAdminAuthenticated(true)}
      />

      {isSuperAdminAuthenticated && (
        <SuperAdminPortal 
          onClose={() => setIsSuperAdminAuthenticated(false)} 
          branding={branding}
          onBrandingUpdate={handleBrandingUpdate}
          adminData={userProfile}
          onNavigate={(page) => {
            setAdminActivePage(page);
            setIsSuperAdminAuthenticated(false);
          }}
        />
      )}
    </>
  )
}

export default App;
