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

const ManageCourses = ({ institutionId }) => {
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    facultyId: '',
    duration: '',
    requirements: '',
    description: '',
    fees: '',
    capacity: ''
  });

  useEffect(() => {
    fetchFaculties();
    fetchCourses();
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

  const fetchCourses = async () => {
    try {
      const q = query(
        collection(db, 'courses'), 
        where('institutionId', '==', institutionId)
      );
      const querySnapshot = await getDocs(q);
      const coursesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesList);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const faculty = faculties.find(f => f.id === formData.facultyId);
      
      const courseData = {
        ...formData,
        institutionId: institutionId,
        facultyName: faculty?.name,
        fees: parseFloat(formData.fees) || 0,
        capacity: parseInt(formData.capacity) || 0,
        duration: parseInt(formData.duration) || 1
      };

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), {
          ...courseData,
          updatedAt: new Date()
        });
        alert('Course updated successfully!');
      } else {
        await addDoc(collection(db, 'courses'), {
          ...courseData,
          createdAt: new Date(),
          status: 'active'
        });
        alert('Course added successfully!');
      }
      
      setShowForm(false);
      setEditingCourse(null);
      setFormData({ 
        name: '', code: '', facultyId: '', duration: '', 
        requirements: '', description: '', fees: '', capacity: '' 
      });
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Error saving course');
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      facultyId: course.facultyId,
      duration: course.duration.toString(),
      requirements: course.requirements,
      description: course.description,
      fees: course.fees.toString(),
      capacity: course.capacity.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This will affect student applications.')) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
        alert('Course deleted successfully!');
        fetchCourses();
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course');
      }
    }
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingCourse(null);
    setFormData({ 
      name: '', code: '', facultyId: '', duration: '', 
      requirements: '', description: '', fees: '', capacity: '' 
    });
  };

  return (
    <div className="manage-courses">
      <div className="section-header">
        <h2>Manage Courses</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="btn-primary"
          disabled={showForm || faculties.length === 0}
        >
          Add New Course
        </button>
      </div>

      {faculties.length === 0 && (
        <div className="warning-message">
          <p>You need to create at least one faculty before adding courses.</p>
        </div>
      )}

      {showForm && (
        <div className="form-modal">
          <div className="modal-content">
            <h3>{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Course Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Course Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Faculty *</label>
                <select
                  value={formData.facultyId}
                  onChange={(e) => setFormData({...formData, facultyId: e.target.value})}
                  required
                >
                  <option value="">Select Faculty</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (years) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    min="1"
                    max="6"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Fees (M)</label>
                  <input
                    type="number"
                    value={formData.fees}
                    onChange={(e) => setFormData({...formData, fees: e.target.value})}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Requirements</label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                  placeholder="e.g., High School Diploma, Specific subjects..."
                  rows="3"
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
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingCourse ? 'Update Course' : 'Add Course'}
                </button>
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="courses-table">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Course Name</th>
              <th>Faculty</th>
              <th>Duration</th>
              <th>Fees</th>
              <th>Capacity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr key={course.id}>
                <td>{course.code}</td>
                <td>{course.name}</td>
                <td>{course.facultyName}</td>
                <td>{course.duration} years</td>
                <td>M{course.fees}</td>
                <td>{course.capacity}</td>
                <td className="actions">
                  <button 
                    onClick={() => handleEdit(course)}
                    className="btn-edit"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(course.id)}
                    className="btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {courses.length === 0 && (
          <div className="empty-state">
            <p>No courses found. Add your first course to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCourses;