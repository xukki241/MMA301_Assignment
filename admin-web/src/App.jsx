import React, { useState, useEffect } from 'react';

// API Configuration
const API_AUTH_URL = 'http://localhost/api/auth';
const API_CORE_URL = 'http://localhost/api';

export default function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('admin_user') || 'null'));
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Active View State
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'logs'

  // User Management State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // System Logs State
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [logFilter, setLogFilter] = useState('all'); // 'all', 'info', 'warn', 'error'
  const [logSearch, setLogSearch] = useState('');

  // Notification Banner
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Show temporary notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter email and password');
      return;
    }
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Check if user is Admin or Teacher (privileged roles)
      const userRole = data.user?.role || '';
      if (userRole !== 'Admin' && userRole !== 'Teacher') {
        throw new Error('Access denied: Admin or Teacher credentials required');
      }

      localStorage.setItem('admin_token', data.accessToken);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);
      showNotification(`Welcome back, ${data.user.fullName}!`);
    } catch (err) {
      setLoginError(err.message || 'An error occurred during login');
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken('');
    setUser(null);
    showNotification('Logged out successfully');
  };

  // Fetch Users
  const fetchUsers = async () => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError('');
    try {
      const response = await fetch(`${API_AUTH_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }
      setUsers(data);
    } catch (err) {
      setUsersError(err.message || 'Error loading users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    if (!token) return;
    setLogsLoading(true);
    setLogsError('');
    try {
      const response = await fetch(`${API_CORE_URL}/system-logs`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch system logs');
      }
      setLogs(data);
    } catch (err) {
      setLogsError(err.message || 'Error loading logs');
    } finally {
      setLogsLoading(false);
    }
  };

  // Assign Role
  const handleAssignRole = async (userId, newRole) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch(`${API_AUTH_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update role');
      }
      showNotification('User role updated successfully');
      fetchUsers(); // Refresh
    } catch (err) {
      showNotification(err.message || 'Error updating role', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Toggle Deactivation Status
  const handleToggleDeactivate = async (userId, currentStatus) => {
    setUpdatingUserId(userId);
    const targetStatus = !currentStatus; // true = active, false = deactivated
    try {
      const response = await fetch(`${API_AUTH_URL}/users/${userId}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: targetStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to change user status');
      }
      showNotification(`User ${targetStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers(); // Refresh
    } catch (err) {
      showNotification(err.message || 'Error updating user status', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Fetch data on login or tab switch
  useEffect(() => {
    if (token) {
      if (activeTab === 'users') {
        fetchUsers();
      } else {
        fetchLogs();
      }
    }
  }, [token, activeTab]);

  // Filtered Users
  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    const matchesLevel = logFilter === 'all' || log.level?.toLowerCase() === logFilter.toLowerCase();
    const matchesSearch = 
      log.message?.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.actionName?.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // Render Login View if not authenticated
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
          <div>
            <div className="flex justify-center">
              <span className="text-indigo-600 font-extrabold text-4xl tracking-wider">LMS ADMIN</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to admin panel
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Authorized personnel only
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {loginError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700 font-medium">{loginError}</p>
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label className="sr-only">Email address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Admin Email address"
                />
              </div>
              <div>
                <label className="sr-only">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loginLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loginLoading ? 'Authenticating...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Render Main Admin Panel View
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center bg-gray-950 px-6">
          <span className="text-xl font-bold tracking-wider text-indigo-400">LMS DASHBOARD</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-left font-medium transition-all ${
              activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            User Management
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-left font-medium transition-all ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            System Logs
          </button>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-lg text-white">
              {user?.fullName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 border border-red-600 rounded-lg text-red-500 hover:bg-red-600 hover:text-white transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <h1 className="text-2xl font-bold text-gray-800">
            {activeTab === 'users' ? 'User Management' : 'System Logs'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="bg-indigo-100 text-indigo-800 text-xs px-3 py-1.5 rounded-full font-semibold">
              Role: {user?.role || 'Admin'}
            </span>
          </div>
        </header>

        {/* Global Notification Banner */}
        {notification.show && (
          <div className={`mx-8 mt-4 p-4 rounded-lg border flex items-center justify-between shadow-sm transition-all duration-300 ${
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <span className="font-medium text-sm">{notification.message}</span>
            <button onClick={() => setNotification({ show: false })} className="text-gray-400 hover:text-gray-600">
              &times;
            </button>
          </div>
        )}

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          
          {/* USER MANAGEMENT PAGE */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Toolbar Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="Search name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={fetchUsers}
                  className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
                  </svg>
                  Refresh Users
                </button>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {usersLoading ? (
                  <div className="p-12 text-center text-gray-500">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-sm font-medium">Loading user records...</p>
                  </div>
                ) : usersError ? (
                  <div className="p-12 text-center text-red-500 font-medium">
                    <p className="mb-2">⚠️ {usersError}</p>
                    <button onClick={fetchUsers} className="text-indigo-600 hover:underline text-sm">Try Again</button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 font-medium">
                    No users found matching your search.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User Details</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredUsers.map((u) => (
                          <tr key={u.userId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center mr-3">
                                  {u.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{u.fullName}</div>
                                  <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={u.role}
                                disabled={updatingUserId === u.userId}
                                onChange={(e) => handleAssignRole(u.userId, e.target.value)}
                                className="border border-gray-300 rounded px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                              >
                                <option value="Admin">Admin</option>
                                <option value="Teacher">Teacher</option>
                                <option value="Student">Student</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold ${
                                u.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {u.isActive ? 'Active' : 'Deactivated'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <button
                                disabled={updatingUserId === u.userId}
                                onClick={() => handleToggleDeactivate(u.userId, u.isActive)}
                                className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${
                                  u.isActive
                                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white'
                                    : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-600 hover:text-white'
                                }`}
                              >
                                {updatingUserId === u.userId ? 'Updating...' : u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SYSTEM LOGS PAGE */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              {/* Toolbar Controls */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search message, IP..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <span className="px-3 bg-gray-50 border-r border-gray-300 text-xs font-semibold text-gray-500">Filter Level</span>
                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="px-3 py-2 text-sm bg-white focus:outline-none focus:ring-0 text-gray-700"
                    >
                      <option value="all">All Levels</option>
                      <option value="info">Info</option>
                      <option value="warn">Warn</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={fetchLogs}
                  className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
                  </svg>
                  Refresh Logs
                </button>
              </div>

              {/* Logs View */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {logsLoading ? (
                  <div className="p-12 text-center text-gray-500">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-sm font-medium">Loading system logs...</p>
                  </div>
                ) : logsError ? (
                  <div className="p-12 text-center text-red-500 font-medium">
                    <p className="mb-2">⚠️ {logsError}</p>
                    <button onClick={fetchLogs} className="text-indigo-600 hover:underline text-sm">Try Again</button>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 font-medium">
                    No logs found matching criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Level</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Audit / Message</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-mono text-xs">
                        {filteredLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 rounded font-bold text-xs uppercase ${
                                log.level === 'error' ? 'bg-red-100 text-red-800' :
                                log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {log.level}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap font-bold text-gray-700">
                              {log.actionName}
                            </td>
                            <td className="px-6 py-3 font-sans text-sm text-gray-600 max-w-md break-words">
                              {log.message}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                              {log.ipAddress}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-gray-500 font-sans">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
