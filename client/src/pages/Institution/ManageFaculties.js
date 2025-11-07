import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../services/firebase';

const ManageFaculties = ({ institutionId }) => {
  const [faculties, setFaculties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dean: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchFaculties();
  }, [institutionId]);

  const fetchFaculties = async () => {
    try {
      const q = query(
        collection(db, 'faculties'), 
        where('institutionId', '==', institutionId)
      );
      const querySnapshot = await getDocs(q);
      const facultiesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFaculties(facultiesList);
    } catch (error) {
      console.error('Error fetching faculties:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFaculty) {
        // Update existing faculty
        await updateDoc(doc(db, 'faculties', editingFaculty.id), {
          ...formData,
          updatedAt: new Date()
        });
        alert('Faculty updated successfully!');
      } else {
        // Add new faculty
        await addDoc(collection(db, 'faculties'), {
          ...formData,
          institutionId: institutionId,
          createdAt: new Date(),
          status: 'active'
        });
        alert('Faculty added successfully!');
      }
      
      setShowForm(false);
      setEditingFaculty(null);
      setFormData({ name: '', description: '', dean: '', email: '', phone: '' });
      fetchFaculties();
    } catch (error) {
      console.error('Error saving faculty:', error);
      alert('Error saving faculty');
    }
  };

  const handleEdit = (faculty) => {
    setEditingFaculty(faculty);
    setFormData({
      name: faculty.name,
      description: faculty.description,
      dean: faculty.dean,
      email: faculty.email,
      phone: faculty.phone
    });
    setShowForm(true);
  };

  const handleDelete = async (facultyId) => {
    if (window.confirm('Are you sure you want to delete this faculty? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'faculties', facultyId));
        alert('Faculty deleted successfully!');
        fetchFaculties();
      } catch (error) {
        console.error('Error deleting faculty:', error);
        alert('Error deleting faculty');
      }
    }
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingFaculty(null);
    setFormData({ name: '', description: '', dean: '', email: '', phone: '' });
  };

  return (
    <div className="manage-faculties">
      <div className="section-header">
        <h2>Manage Faculties</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="btn-primary"
          disabled={showForm}
        >
          Add New Faculty
        </button>
      </div>

      {showForm && (
        <div className="form-modal">
          <div className="modal-content">
            <h3>{editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Faculty Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Dean Name</label>
                <input
                  type="text"
                  value={formData.dean}
                  onChange={(e) => setFormData({...formData, dean: e.target.value})}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingFaculty ? 'Update Faculty' : 'Add Faculty'}
                </button>
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="faculties-grid">
        {faculties.map(faculty => (
          <div key={faculty.id} className="faculty-card">
            <div className="card-header">
              <h4>{faculty.name}</h4>
              <span className={`status-badge status-${faculty.status}`}>
                {faculty.status}
              </span>
            </div>
            
            <div className="card-body">
              <p>{faculty.description}</p>
              
              <div className="faculty-details">
                {faculty.dean && (
                  <div className="detail-item">
                    <strong>Dean:</strong> {faculty.dean}
                  </div>
                )}
                {faculty.email && (
                  <div className="detail-item">
                    <strong>Email:</strong> {faculty.email}
                  </div>
                )}
                {faculty.phone && (
                  <div className="detail-item">
                    <strong>Phone:</strong> {faculty.phone}
                  </div>
                )}
              </div>
            </div>
            
            <div className="card-actions">
              <button 
                onClick={() => handleEdit(faculty)}
                className="btn-edit"
              >
                Edit
              </button>
              <button 
                onClick={() => handleDelete(faculty.id)}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        
        {faculties.length === 0 && (
          <div className="empty-state">
            <p>No faculties found. Add your first faculty to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageFaculties;