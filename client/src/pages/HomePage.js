import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const { currentUser, userRole } = useAuth();

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Career Guidance & Employment Integration Platform</h1>
          <p>Connecting students with higher education institutions and career opportunities in Lesotho</p>
          
          {!currentUser ? (
            <div className="hero-actions">
              <Link to="/login" className="btn btn-primary">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Learn More
              </Link>
            </div>
          ) : (
            <div className="hero-actions">
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2>How It Works</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"></div>
              <h3>For Students</h3>
              <ul>
                <li>Discover higher learning institutions in Lesotho</li>
                <li>Apply for courses online</li>
                <li>Upload academic transcripts</li>
                <li>Find job opportunities after graduation</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon"></div>
              <h3>For Institutions</h3>
              <ul>
                <li>Manage faculties and courses</li>
                <li>Process student applications</li>
                <li>Publish admissions</li>
                <li>Connect with qualified students</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon"></div>
              <h3>For Companies</h3>
              <ul>
                <li>Post job opportunities</li>
                <li>Find qualified graduates</li>
                <li>Filter applicants automatically</li>
                <li>Connect with talented professionals</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;