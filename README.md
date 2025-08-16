# Medical Dashboard - Healthcare Management System

A comprehensive medical dashboard built with Next.js, TypeScript, and Supabase for managing patients, observations, and laboratory reports in healthcare facilities.

## 🌟 Features

### Patient Management
- **Patient Registration**: Add and manage patient records with unique OP numbers
- **Patient Search**: Quick search functionality by name or OP number
- **Patient Data Export**: Export patient data in CSV, Excel, and PDF formats

### Laboratory Management
- **Test Groups**: Organize lab tests into categories (Hematology, Biochemistry, Serology, etc.)
- **Lab Tests**: Manage individual test parameters with normal values and units
- **Report Groups**: Create report categories for organizing related tests

### Observations & Reports
- **Patient Observations**: Record comprehensive test results across multiple categories
- **Report Generation**: Generate detailed PDF reports with professional formatting
- **Daily Reports**: View and manage reports by date
- **Print Functionality**: Direct printing of patient reports

### Dashboard Analytics
- **Live Statistics**: Real-time patient and report counts
- **Test Frequency Analysis**: Visual analytics of most requested tests
- **Recent Activity**: Quick access to recent reports and patients
- **Quick Actions**: Fast navigation to commonly used features

### System Features
- **User Authentication**: Secure doctor login with username/password
- **Data Export**: Complete database backup and individual table exports
- **Password Management**: Secure password change functionality
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Custom auth with bcrypt password hashing
- **UI/UX**: Framer Motion animations, Headless UI components
- **Export**: jsPDF, ExcelJS for data exports
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager
- Supabase account
- Vercel account (for deployment)

## 🚀 Installation & Setup

### 1. Clone the Repository
```
git clone https://github.com/your-username/medical-dashboard.git
cd medical-dashboard
```

### 2. Install Dependencies
```
npm install
# or
yarn install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Database Setup
Run the following SQL commands in your Supabase SQL Editor:

```
-- Create doctors table
CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patients table
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  opno VARCHAR(6) NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 150),
  gender CHAR(1) CHECK (gender IN ('M', 'F')),
  address VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(doctor_id, opno)
);

-- Create test_groups table
CREATE TABLE test_groups (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method_used TEXT,
  specimen TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create lab_tests table
CREATE TABLE lab_tests (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normal_value TEXT NOT NULL,
  unit TEXT NOT NULL,
  test_group TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create report_groups table
CREATE TABLE report_groups (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  test_groups TEXT[]
);

-- Create observations table
CREATE TABLE observations (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_name VARCHAR(100) NOT NULL,
  parameters JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_observations_doctor_patient ON observations(doctor_id, patient_id);
CREATE INDEX idx_observations_date ON observations(report_date);
```

### 5. Create Default Doctor Account
Insert a default doctor account (password: 'admin123'):
```
INSERT INTO doctors (username, password) VALUES 
('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJguATqHK');
```

### 6. Run Development Server
```
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` and login with:
- Username: `admin`
- Password: `admin123`

## 🌐 Deployment to Vercel

### 1. Install Vercel CLI
```
npm install -g vercel
```

### 2. Login to Vercel
```
vercel login
```

### 3. Deploy Project
```
vercel --prod
```

### 4. Environment Variables
Add the following environment variables in your Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 5. Custom Domain (Optional)
Add your custom domain in Vercel dashboard under Project Settings → Domains.

## 📱 Usage

### Getting Started
1. **Login**: Use admin credentials to access the dashboard
2. **Add Patients**: Register patients with unique OP numbers
3. **Configure Tests**: Set up test groups and lab test parameters
4. **Record Observations**: Add patient test results and observations
5. **Generate Reports**: Create and print comprehensive patient reports
6. **Export Data**: Backup your data using the export functionality

### Key Features
- **Patient Search**: Use the dashboard search to quickly find patients
- **Report Categories**: Organize tests using predefined categories (Hematology, Biochemistry, etc.)
- **Export Options**: Export individual tables or complete database
- **Print Reports**: Generate professional PDF reports for patients

## 🔧 Configuration

### Test Categories
The system supports the following test categories:
- Hematology (Blood tests)
- Biochemistry (Chemical analysis)
- Serology (Immunology tests)
- Urine Analysis
- Semen Analysis
- Hormone Tests
- And more...

### Customization
- Add new test categories in `/app/dashboard/observations/page.tsx`
- Modify report templates in the print functions
- Customize export formats in respective page components

## 📊 Database Schema

```
doctors
├── id (Primary Key)
├── username (Unique)
├── password (Hashed)
└── created_at

patients
├── id (Primary Key)
├── doctor_id (Foreign Key → doctors.id)
├── opno (6-digit unique number)
├── name
├── age
├── gender
├── address
└── created_at

observations
├── id (Primary Key)
├── doctor_id (Foreign Key → doctors.id)
├── patient_id (Foreign Key → patients.id)
├── report_date
├── report_name
├── parameters (JSONB)
└── created_at
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact: support@trax.xyz

## 🎯 Roadmap

- [ ] Multi-doctor support
- [ ] Advanced analytics and reporting
- [ ] Mobile app development
- [ ] Integration with medical devices
- [ ] Appointment scheduling system
- [ ] Patient portal access

---

**Built with ❤️ by Team Trax for healthcare professionals**