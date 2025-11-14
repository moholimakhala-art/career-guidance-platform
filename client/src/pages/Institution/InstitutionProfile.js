import React, { useState, useEffect } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const InstitutionProfile = ({ institution, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    website: '',
    establishedYear: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Safe date conversion utility function
  const safeToDate = (dateField) => {
    if (!dateField) return null;
    
    // If it's a Firestore Timestamp with toDate method
    if (dateField.toDate && typeof dateField.toDate === 'function') {
      return dateField.toDate();
    }
    
    // If it's already a Date object
    if (dateField instanceof Date) {
      return dateField;
    }
    
    // If it's a string or number that can be converted to Date
    try {
      const date = new Date(dateField);
      return !isNaN(date.getTime()) ? date : null;
    } catch (error) {
      console.error('Error converting to date:', error);
      return null;
    }
  };

  // Format date safely
  const formatDate = (dateField) => {
    const date = safeToDate(dateField);
    return date ? date.toLocaleDateString() : 'N/A';
  };

  useEffect(() => {
    if (institution) {
      setFormData({
        name: institution.name || '',
        email: institution.email || '',
        phone: institution.phone || '',
        address: institution.address || '',
        description: institution.description || '',
        website: institution.website || '',
        establishedYear: institution.establishedYear || ''
      });
    }
  }, [institution]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateDoc(doc(db, 'institutions', institution.id), {
        ...formData,
        updatedAt: new Date()
      });
      
      alert('Profile updated successfully!');
      setIsEditing(false);
      onUpdate(); // Refresh institution data
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: institution.name || '',
      email: institution.email || '',
      phone: institution.phone || '',
      address: institution.address || '',
      description: institution.description || '',
      website: institution.website || '',
      establishedYear: institution.establishedYear || ''
    });
    setIsEditing(false);
  };

  if (!institution) {
    return <div>Loading institution profile...</div>;
  }

  return (
    <div className="institution-profile">
      <div className="section-header">
        <h2>Institution Profile</h2>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={isEditing ? 'btn-secondary' : 'btn-primary'}
        >
          {isEditing ? 'Cancel Editing' : 'Edit Profile'}
        </button>
      </div>

      <div className="profile-card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Institution Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!isEditing}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Established Year</label>
              <input
                type="number"
                value={formData.establishedYear}
                onChange={(e) => setFormData({...formData, establishedYear: e.target.value})}
                disabled={!isEditing}
                min="1900"
                max="2024"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={!isEditing}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                disabled={!isEditing}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              disabled={!isEditing}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              disabled={!isEditing}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              disabled={!isEditing}
              rows="4"
              placeholder="Describe your institution, its mission, vision, and key features..."
            />
          </div>

          {isEditing && (
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
              </button>
              <button 
                type="button" 
                onClick={handleCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </form>

        {!isEditing && (
          <div className="profile-info">
            <div className="info-grid">
              <div className="info-item">
                <strong>Institution ID:</strong>
                <span>{institution.id}</span>
              </div>
              <div className="info-item">
                <strong>Status:</strong>
                <span className={`status-badge status-${institution.status || 'active'}`}>
                  {institution.status || 'active'}
                </span>
              </div>
              <div className="info-item">
                <strong>Registered:</strong>
                {/* FIXED: Using safe date formatting */}
                <span>{formatDate(institution.createdAt)}</span>
              </div>
              {institution.updatedAt && (
                <div className="info-item">
                  <strong>Last Updated:</strong>
                  {/* FIXED: Using safe date formatting */}
                  <span>{formatDate(institution.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionProfile;