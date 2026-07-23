import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getColleges, createCollege } from '../../lib/firestore';
import { LogOut, Building, Plus, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';

const PlatformAdminDashboard = () => {
  const { userProfile } = useAuth();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    setLoading(true);
    const data = await getColleges();
    setColleges(data);
    setLoading(false);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Vishnu Pass Platform</h1>
          <p className="text-xs text-gray-500 mt-1">Super Admin Console</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button className="flex items-center gap-3 w-full px-4 py-3 bg-brand-orange/10 text-brand-orange rounded-lg font-medium">
            <Building className="w-5 h-5" />
            Colleges
          </button>
          <button className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium">
            <Settings className="w-5 h-5" />
            Platform Settings
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold">
              {userProfile?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{userProfile?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500">{userProfile?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm w-full p-2 rounded hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Manage Colleges</h2>
          <button className="flex items-center gap-2 bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add College
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colleges.map(college => (
              <div key={college.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                    {college.logoUrl ? (
                      <img src={college.logoUrl} alt={college.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <Building className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    college.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {college.status || 'Active'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{college.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{college.code}</p>
                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between">
                  <button className="text-sm font-medium text-brand-orange hover:text-orange-700 transition-colors">Manage Admins</button>
                  <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Settings</button>
                </div>
              </div>
            ))}
            {colleges.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Colleges Found</h3>
                <p className="text-gray-500 mb-4">Add your first college to get started.</p>
                <button className="bg-brand-orange text-white px-4 py-2 rounded-lg font-medium">Add College</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlatformAdminDashboard;
