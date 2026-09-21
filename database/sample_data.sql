-- Sample Data for Smart Outpass Management System
-- WARNING: Passwords are hashed using SHA256 for demo purposes
-- In production, use bcrypt or similar strong hashing

-- Insert Departments
INSERT INTO departments (dept_name, dept_code) VALUES
('Computer Science Engineering', 'CSE'),
('Electronics and Communication', 'ECE'),
('Mechanical Engineering', 'MECH'),
('Civil Engineering', 'CIVIL'),
('Information Technology', 'IT');
-- Added BSc AI & Data Science department
INSERT INTO departments (dept_name, dept_code) VALUES
('BSc AI & Data Science', 'AI_DS');

-- Additional departments
INSERT INTO departments (dept_name, dept_code) VALUES
('Computer Science and Applications', 'CSA'),
('Bachelor of Business Administration', 'BBA'),
('Master of Business Administration', 'MBA'),
('Bachelor of Commerce', 'BCOM');

-- Insert Users
-- Password for all users: 'password123' (hashed with SHA256)
-- Hash: ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f

-- Admin
INSERT INTO users (username, email, password_hash, full_name, role, dept_id, phone) VALUES
('admin', 'admin@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'System Administrator', 'admin', NULL, '9876543210');

-- HODs
INSERT INTO users (username, email, password_hash, full_name, role, dept_id, phone) VALUES
('hod_cse', 'hod.cse@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Dr. Rajesh Kumar', 'hod', 1, '9876543211'),
('hod_ece', 'hod.ece@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Dr. Priya Sharma', 'hod', 2, '9876543212');

-- Staff/Advisors
INSERT INTO users (username, email, password_hash, full_name, role, dept_id, phone) VALUES
('staff_cse1', 'advisor1.cse@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Prof. Anil Verma', 'staff', 1, '9876543213'),
('staff_cse2', 'advisor2.cse@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Prof. Sneha Reddy', 'staff', 1, '9876543214'),
('staff_ece1', 'advisor1.ece@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Prof. Vikram Singh', 'staff', 2, '9876543215');

-- Security
INSERT INTO users (username, email, password_hash, full_name, role, dept_id, phone) VALUES
('security1', 'security1@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Ram Prasad', 'security', NULL, '9876543216'),
('security2', 'security2@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Shyam Kumar', 'security', NULL, '9876543217');

-- Students
INSERT INTO users (username, email, password_hash, full_name, role, dept_id, registration_no, phone, advisor_id) VALUES
('student1', 'cse2021001@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Amit Patel', 'student', 1, 'CSE2021001', '9876543218', 4),
('student2', 'cse2021002@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Priya Gupta', 'student', 1, 'CSE2021002', '9876543219', 4),
('student3', 'cse2021003@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Rahul Sharma', 'student', 1, 'CSE2021003', '9876543220', 5),
('student4', 'ece2021001@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Sneha Rao', 'student', 2, 'ECE2021001', '9876543221', 6),
('student5', 'ece2021002@vetias.ac.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Karthik Reddy', 'student', 2, 'ECE2021002', '9876543222', 6);

-- Sample Outpasses (with different statuses for testing)
INSERT INTO outpasses (student_id, out_date, out_time, expected_return_time, reason, destination, advisor_id, hod_id) VALUES
(9, '2026-02-03', '14:00:00', '18:00:00', 'Medical appointment', 'City Hospital', 4, 2),
(10, '2026-02-03', '10:00:00', '16:00:00', 'Family function', 'Home', 4, 2),
(11, '2026-02-04', '09:00:00', '17:00:00', 'Bank work', 'SBI Bank', 5, 2);

-- Update some outpasses to approved status with QR codes
UPDATE outpasses SET 
    advisor_status = 'approved',
    advisor_remarks = 'Approved for valid reason',
    advisor_action_time = NOW(),
    hod_status = 'approved',
    hod_remarks = 'Approved',
    hod_action_time = NOW(),
    final_status = 'approved',
    qr_code = CONCAT('QR', LPAD(outpass_id, 8, '0'), '-', UNIX_TIMESTAMP()),
    qr_generated_at = NOW(),
    qr_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
WHERE outpass_id = 1;

-- Sample logs
INSERT INTO outpass_logs (outpass_id, action_by, action_type, remarks) VALUES
(1, 9, 'created', 'Outpass request created by student'),
(1, 4, 'advisor_approved', 'Approved by advisor'),
(1, 2, 'hod_approved', 'Final approval given');

-- Create a view for easy outpass tracking
CREATE OR REPLACE VIEW vw_outpass_details AS
SELECT 
    o.outpass_id,
    o.out_date,
    o.out_time,
    o.expected_return_time,
    o.reason,
    o.destination,
    o.final_status,
    o.qr_code,
    s.full_name as student_name,
    s.registration_no,
    d.dept_name,
    a.full_name as advisor_name,
    h.full_name as hod_name,
    o.advisor_status,
    o.hod_status,
    o.created_at
FROM outpasses o
JOIN users s ON o.student_id = s.user_id
LEFT JOIN departments d ON s.dept_id = d.dept_id
LEFT JOIN users a ON o.advisor_id = a.user_id
LEFT JOIN users h ON o.hod_id = h.user_id;
