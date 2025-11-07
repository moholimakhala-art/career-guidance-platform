import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [institutions, setInstitutions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchInstitutions(),
        fetchCompanies(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    const querySnapshot = await getDocs(collection(db, 'institutions'));
    const institutionsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setInstitutions(institutionsList);
  };

  const fetchCompanies = async () => {
    const querySnapshot = await getDocs(collection(db, 'companies'));
    const companiesList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCompanies(companiesList);
  };

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const usersList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setUsers(usersList);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: currentStatus === 'active' ? 'suspended' : 'active'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const toggleInstitutionStatus = async (institutionId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'institutions', institutionId), {
        status: currentStatus === 'active' ? 'suspended' : 'active'
      });
      fetchInstitutions();
    } catch (error) {
      console.error('Error updating institution status:', error);
    }
  };

  const toggleCompanyStatus = async (companyId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        status: currentStatus === 'active' ? 'suspended' : 'active'
      });
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company status:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview institutions={institutions} companies={companies} users={users} />;
      case 'institutions':
        return <ManageInstitutions institutions={institutions} onToggleStatus={toggleInstitutionStatus} />;
      case 'companies':
        return <ManageCompanies companies={companies} onToggleStatus={toggleCompanyStatus} />;
      case 'users':
        return <ManageUsers users={users} onToggleStatus={toggleUserStatus} />;
      default:
        return <AdminOverview institutions={institutions} companies={companies} users={users} />;
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {userData?.name || user?.email}</p>
        <p>Role: <span className="user-role">{userData?.role}</span></p>
      </div>

      {/* NAVBAR - HORIZONTAL NAVIGATION */}
      <nav className="admin-navbar">
        <button 
          className={activeTab === 'overview' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'institutions' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('institutions')}
        >
          Institutions
        </button>
        <button 
          className={activeTab === 'companies' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('companies')}
        >
          Companies
        </button>
        <button 
          className={activeTab === 'users' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
      </nav>

      <main className="admin-content">
        {renderTabContent()}
      </main>
    </div>
  );
};

// Sub-components remain EXACTLY THE SAME
const AdminOverview = ({ institutions, companies, users }) => {
  const stats = {
    totalInstitutions: institutions.length,
    activeInstitutions: institutions.filter(inst => inst.status === 'active').length,
    totalCompanies: companies.length,
    activeCompanies: companies.filter(comp => comp.status === 'active').length,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status !== 'suspended').length,
    students: users.filter(u => u.role === 'student').length,
    institutions: users.filter(u => u.role === 'institution').length,
    companies: users.filter(u => u.role === 'company').length,
  };

  return (
    <div className="admin-overview">
      <h2>System Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Institutions</h3>
          <p className="stat-number">{stats.totalInstitutions}</p>
          <small>Active: {stats.activeInstitutions}</small>
        </div>
        
        <div className="stat-card">
          <h3>Total Companies</h3>
          <p className="stat-number">{stats.totalCompanies}</p>
          <small>Active: {stats.activeCompanies}</small>
        </div>
        
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{stats.totalUsers}</p>
          <small>Active: {stats.activeUsers}</small>
        </div>
        
        <div className="stat-card">
          <h3>User Distribution</h3>
          <div className="user-distribution">
            <div>Students: {stats.students}</div>
            <div>Institutions: {stats.institutions}</div>
            <div>Companies: {stats.companies}</div>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span>System is running normally</span>
            <small>Just now</small>
          </div>
          <div className="activity-item">
            <span>Last data refresh completed</span>
            <small>2 minutes ago</small>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManageInstitutions = ({ institutions, onToggleStatus }) => {
  return (
    <div className="manage-section">
      <h2>Manage Institutions</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map(institution => (
              <tr key={institution.id}>
                <td>{institution.name}</td>
                <td>{institution.email}</td>
                <td>
                  <span className={`status status-${institution.status || 'active'}`}>
                    {institution.status || 'active'}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => onToggleStatus(institution.id, institution.status || 'active')}
                    className={institution.status === 'suspended' ? 'btn-success' : 'btn-warning'}
                  >
                    {institution.status === 'suspended' ? 'Activate' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {institutions.length === 0 && (
          <div className="empty-state">No institutions found</div>
        )}
      </div>
    </div>
  );
};

const ManageCompanies = ({ companies, onToggleStatus }) => {
  return (
    <div className="manage-section">
      <h2>Manage Companies</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id}>
                <td>{company.name}</td>
                <td>{company.email}</td>
                <td>{company.industry || 'N/A'}</td>
                <td>
                  <span className={`status status-${company.status || 'active'}`}>
                    {company.status || 'active'}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => onToggleStatus(company.id, company.status || 'active')}
                    className={company.status === 'suspended' ? 'btn-success' : 'btn-warning'}
                  >
                    {company.status === 'suspended' ? 'Activate' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <div className="empty-state">No companies found</div>
        )}
      </div>
    </div>
  );
};

const ManageUsers = ({ users, onToggleStatus }) => {
  return (
    <div className="manage-section">
      <h2>Manage Users</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name || 'N/A'}</td>
                <td>{user.email}</td>
                <td>
                  <span className="user-role-badge">{user.role}</span>
                </td>
                <td>
                  <span className={`status status-${user.status || 'active'}`}>
                    {user.status || 'active'}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => onToggleStatus(user.id, user.status || 'active')}
                    className={user.status === 'suspended' ? 'btn-success' : 'btn-warning'}
                  >
                    {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="empty-state">No users found</div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;