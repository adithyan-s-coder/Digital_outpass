-- Smart Outpass Management System Database Schema
-- Database: outpass_db

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    dept_id INT PRIMARY KEY AUTO_INCREMENT,
    dept_name VARCHAR(100) NOT NULL UNIQUE,
    dept_code VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (Students, Staff, HOD, Security, Admin)
-- Users Table (Updated with Parent details)
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('student', 'staff', 'hod', 'security', 'admin') NOT NULL,
    dept_id INT,
    registration_no VARCHAR(50) UNIQUE,
    academic_year INT,
    phone VARCHAR(15),
    parent_name VARCHAR(100),
    parent_mobile VARCHAR(15),
    profile_image VARCHAR(255),
    advisor_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id),
    FOREIGN KEY (advisor_id) REFERENCES users(user_id)
);

-- Migration for existing databases
ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) AFTER parent_mobile;

-- Outpasses Table
CREATE TABLE IF NOT EXISTS outpasses (
    outpass_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    out_date DATE NOT NULL,
    out_time TIME NOT NULL,
    expected_return_time TIME NOT NULL,
    reason TEXT NOT NULL,
    destination VARCHAR(200),
    
    -- Approval workflow
    advisor_id INT,
    advisor_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    advisor_remarks TEXT,
    advisor_action_time TIMESTAMP NULL,
    
    hod_id INT,
    hod_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    hod_remarks TEXT,
    hod_action_time TIMESTAMP NULL,
    
    -- Final status
    final_status ENUM('pending', 'approved', 'rejected', 'used', 'expired') DEFAULT 'pending',
    
    -- QR Code
    qr_code VARCHAR(255) UNIQUE,
    qr_generated_at TIMESTAMP NULL,
    qr_expires_at TIMESTAMP NULL,
    is_qr_used BOOLEAN DEFAULT FALSE,
    
    -- Exit/Entry logs
    actual_exit_time TIMESTAMP NULL,
    actual_entry_time TIMESTAMP NULL,
    exit_security_id INT,
    entry_security_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (advisor_id) REFERENCES users(user_id),
    FOREIGN KEY (hod_id) REFERENCES users(user_id),
    FOREIGN KEY (exit_security_id) REFERENCES users(user_id),
    FOREIGN KEY (entry_security_id) REFERENCES users(user_id)
);

-- Outpass Logs Table (for tracking all actions)
CREATE TABLE IF NOT EXISTS outpass_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    outpass_id INT NOT NULL,
    action_by INT NOT NULL,
    action_type ENUM('created', 'advisor_approved', 'advisor_rejected', 'hod_approved', 'hod_rejected', 'exit_scanned', 'entry_scanned', 'expired') NOT NULL,
    remarks TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outpass_id) REFERENCES outpasses(outpass_id),
    FOREIGN KEY (action_by) REFERENCES users(user_id)
);

-- Indexes for better performance
CREATE INDEX idx_outpasses_student ON outpasses(student_id);
CREATE INDEX idx_outpasses_advisor ON outpasses(advisor_id);
CREATE INDEX idx_outpasses_hod ON outpasses(hod_id);
CREATE INDEX idx_outpasses_status ON outpasses(final_status);
CREATE INDEX idx_outpasses_date ON outpasses(out_date);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_users_dept ON users(dept_id);
