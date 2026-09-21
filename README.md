# Digital Outpass Management System - Setup Guide

# 🚀 VETIAS Digital outpass system

🔗 Live Demo: https://digital-outpass.onrender.com

> 💡 **Free Cloud Database Setup**: If deploying to Render, follow the [Free Database Setup Guide](docs/FREE_DATABASE_SETUP.md) to connect a free-forever **TiDB Cloud Serverless** or **Aiven** database without requiring a credit card.

## Project Overview
A complete college outpass management system with role-based access for Students, Staff, HOD, Security, and Admin with QR code verification.

## Technology Stack
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Python Flask
- **Database**: MySQL
- **QR Code**: qrcode library with PIL

## Prerequisites
1. Python 3.8 or higher
2. MySQL Server 5.7 or higher
3. pip (Python package manager)
4. Modern web browser (Chrome, Firefox, Edge)

## Installation Steps

### 1. Database Setup

#### Install MySQL (if not already installed)

**Windows:**
```bash
# Download MySQL Installer from https://dev.mysql.com/downloads/installer/
# Run installer and follow the setup wizard
```

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### Create Database
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE outpass_db;

# Create user (optional, for production)
CREATE USER 'outpass_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON outpass_db.* TO 'outpass_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Project Setup

#### Clone or Extract Project
```bash
# Navigate to project directory
cd smart_outpass_system
```

#### Create Virtual Environment (Recommended)
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

#### Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Database Connection

Edit `backend/config.py` and update the database configuration:

```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',              # Your MySQL username
    'password': '',              # Your MySQL password
    'database': 'outpass_db',
    'pool_name': 'outpass_pool',
    'pool_size': 5
}
```

### 4. Initialize Database

Run the Flask application for the first time:

```bash
python app.py
```

When prompted:
```
Initialize database with schema and sample data? (yes/no): yes
```

This will:
- Create all database tables
- Insert sample departments
- Create sample users for testing
- Insert sample outpass data

### 5. Run the Application

```bash
python app.py
```

The application will start on `http://localhost:5000`

### 6. Access the System

Open your web browser and navigate to:
```
http://localhost:5000
```

## Default Login Credentials

### Admin
- **Username**: admin
- **Password**: password123
- **Role**: System Administrator

### HOD (Computer Science)
- **Username**: hod_cse
- **Password**: password123
- **Role**: Head of Department

### Staff/Advisor
- **Username**: staff_cse1
- **Password**: password123
- **Role**: Faculty Advisor

### Security
- **Username**: security1
- **Password**: password123
- **Role**: Security Personnel

### Student
- **Username**: student1
- **Password**: password123
- **Role**: Student

## Features by Role

### Student Module
✓ Register/Login with college email
✓ Apply for outpass with reason and destination
✓ View outpass status (pending, approved, rejected)
✓ Download QR code after approval
✓ View outpass history

### Staff/Advisor Module
✓ View pending student requests
✓ Approve/reject requests with remarks
✓ View student outpass history
✓ View assigned students list

### HOD Module
✓ Final approval for outpasses
✓ View department-wide statistics
✓ Override approvals in emergencies
✓ View all department outpasses

### Security Module
✓ Scan QR code for verification
✓ Log exit and entry times
✓ Prevent QR code reuse
✓ View students currently outside
✓ View recent activity

### Admin Module
✓ Add/remove users (students, staff)
✓ Assign advisors to students
✓ Manage departments
✓ Generate system reports
✓ Monitor misuse attempts
✓ Reset user passwords

## System Features

1. **Role-Based Access Control**: Each role has specific permissions
2. **QR Code Generation**: Unique QR codes generated after approval
3. **QR Code Validation**: Prevents reuse and expired QR codes
4. **Approval Workflow**: Two-level approval (Advisor → HOD)
5. **Real-Time Updates**: Status updates reflected immediately
6. **Activity Logging**: All actions logged with timestamp and IP
7. **Responsive Design**: Works on desktop, tablet, and mobile
8. **Security**: Password hashing, session management

## Project Structure

```
smart_outpass_system/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── README.md                   # This file
│
├── backend/
│   ├── config.py              # Database and app configuration
│   ├── routes/
│   │   ├── auth.py           # Authentication routes
│   │   ├── student.py        # Student module routes
│   │   ├── staff.py          # Staff module routes
│   │   ├── hod.py            # HOD module routes
│   │   ├── security.py       # Security module routes
│   │   └── admin.py          # Admin module routes
│   └── utils/
│       └── helpers.py        # Utility functions
│
├── database/
│   ├── schema.sql            # Database schema
│   └── sample_data.sql       # Sample data for testing
│
├── frontend/
│   ├── index.html            # Main HTML file
│   ├── css/
│   │   └── styles.css        # CSS styles
│   └── js/
│       ├── app.js            # Main JavaScript
│       ├── student.js        # Student module JS
│       ├── staff.js          # Staff module JS
│       ├── hod.js            # HOD module JS
│       ├── security.js       # Security module JS
│       └── admin.js          # Admin module JS
│
└── docs/
    ├── ER_Diagram.png        # Entity-Relationship Diagram
    ├── Use_Case_Diagram.png  # Use Case Diagram
    └── Sequence_Diagrams.png # Sequence Diagrams
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - Student self-registration
- `GET /api/auth/session` - Check session status

### Student
- `POST /api/student/apply-outpass` - Apply for outpass
- `GET /api/student/my-outpasses` - Get all outpasses
- `GET /api/student/outpass/<id>` - Get outpass details
- `POST /api/student/cancel-outpass/<id>` - Cancel pending outpass

### Staff
- `GET /api/staff/pending-requests` - Get pending requests
- `POST /api/staff/approve-request/<id>` - Approve request
- `POST /api/staff/reject-request/<id>` - Reject request
- `GET /api/staff/student-history/<id>` - Get student history

### HOD
- `GET /api/hod/pending-approvals` - Get pending approvals
- `POST /api/hod/approve-final/<id>` - Final approval with QR
- `POST /api/hod/reject-final/<id>` - Reject outpass
- `GET /api/hod/department-statistics` - Get dept statistics
- `POST /api/hod/override-approval/<id>` - Emergency override

### Security
- `POST /api/security/scan-qr` - Scan and verify QR code
- `POST /api/security/verify-qr` - Verify without marking used
- `POST /api/security/record-entry` - Record student return
- `GET /api/security/students-out` - Get students currently out

### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/add-user` - Add new user
- `PUT /api/admin/update-user/<id>` - Update user
- `DELETE /api/admin/delete-user/<id>` - Deactivate user
- `POST /api/admin/reset-password/<id>` - Reset password
- `GET /api/admin/system-report` - Get system report

## Database Schema

### Tables
1. **departments** - College departments
2. **users** - All system users (students, staff, HOD, security, admin)
3. **outpasses** - Outpass requests and details
4. **outpass_logs** - Activity logs for tracking

### Key Relationships
- Users belong to departments
- Students have advisors (staff)
- Outpasses have student, advisor, and HOD
- Logs track all outpass actions

## Troubleshooting

### Database Connection Error
```
Error: Can't connect to MySQL server
Solution:
1. Check if MySQL service is running
2. Verify credentials in backend/config.py
3. Ensure database 'outpass_db' exists
```

### Port Already in Use
```
Error: Address already in use
Solution:
1. Change port in app.py: app.run(port=5001)
2. Or kill process using port 5000
```

### Import Error
```
Error: No module named 'flask'
Solution:
pip install -r requirements.txt
```

## Testing

### Test Cases

1. **Student Registration**
   - Register with college email
   - Verify email validation
   - Check duplicate prevention

2. **Outpass Application**
   - Apply with valid date/time
   - Verify date validation
   - Check required fields

3. **Approval Workflow**
   - Advisor approval
   - HOD approval
   - QR code generation

4. **QR Code Verification**
   - Valid QR scan
   - Expired QR rejection
   - Reused QR prevention

5. **Role-Based Access**
   - Student access restrictions
   - Staff permissions
   - Admin capabilities

## Production Deployment

### Security Recommendations
1. Change default passwords
2. Use environment variables for sensitive data
3. Enable HTTPS
4. Use strong SECRET_KEY
5. Implement rate limiting
6. Add input sanitization
7. Use bcrypt for password hashing (not SHA256)

### Performance Optimization
1. Enable database query caching
2. Use connection pooling (already implemented)
3. Add CDN for static files
4. Implement pagination for large datasets
5. Add database indexes (already implemented)

## Support and Maintenance

### Regular Maintenance Tasks
1. Database backup (daily recommended)
2. Log file rotation
3. Security updates
4. Performance monitoring

### Backup Database
```bash
mysqldump -u root -p outpass_db > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
mysql -u root -p outpass_db < backup_20240101.sql
```

## Future Enhancements

1. Email/SMS notifications
2. Mobile app (React Native)
3. Biometric verification
4. Analytics dashboard
5. Parent notification system
6. Hostel integration
7. Leave management
8. Attendance correlation

## License

This project is created for educational purposes.

## Contact

For issues or questions:
- Check the documentation
- Review error logs
- Contact system administrator

---

**Version**: 1.0.0
**Last Updated**: February 2026
**Status**: Production Ready

