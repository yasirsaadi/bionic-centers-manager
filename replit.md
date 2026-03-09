# Replit.md - Medical Center Patient Management System

## Overview

This is a full-stack medical center management application for "Bionic Center" (مركز بايونك), specializing in prosthetics and physiotherapy services across multiple branches in Iraq. The system manages patient records, visits, payments, and documents with Arabic RTL interface support.

**Core Purpose:** Track patients (amputees and physiotherapy cases), their treatment costs, payment history, visits, and medical documents across different geographical branches (Baghdad, Karbala, Dhi Qar, Mosul, Kirkuk).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack Query (React Query) for server state
- **UI Components:** shadcn/ui with Radix UI primitives
- **Styling:** Tailwind CSS with CSS variables for theming
- **Forms:** React Hook Form with Zod validation
- **RTL Support:** Mandatory Arabic RTL layout (`dir="rtl"`)
- **Fonts:** Almarai (display) and Tajawal (body) for Arabic typography

### Backend Architecture
- **Runtime:** Node.js with Express
- **Language:** TypeScript with ESM modules
- **API Pattern:** RESTful endpoints under `/api/*`
- **Build Tool:** Custom build script using esbuild (server) and Vite (client)
- **File Uploads:** Multer for document handling, stored in `/uploads` directory

### Data Storage
- **Database:** PostgreSQL via Drizzle ORM
- **Schema Location:** `shared/schema.ts`
- **Migrations:** Drizzle Kit with `db:push` command
- **Session Storage:** PostgreSQL-backed sessions via `connect-pg-simple`

### Authentication
- **Provider:** Replit Auth (OpenID Connect)
- **Session Management:** Express sessions with PostgreSQL store
- **User Model:** Linked to branches with role-based access (admin/staff)

### Key Data Models
- **Branches:** Geographic locations (Baghdad, Karbala, etc.)
- **Patients:** Medical records with amputee/physiotherapy classification
- **Visits:** Treatment session logs
- **Payments:** Financial transactions in Iraqi Dinar (IQD)
- **Documents:** Uploaded medical files and reports

### Shared Code Pattern
- `shared/` directory contains schemas and route definitions used by both client and server
- `drizzle-zod` generates Zod schemas from Drizzle tables for validation
- Route definitions in `shared/routes.ts` define API contracts with request/response schemas

## External Dependencies

### Database
- PostgreSQL (required, connection via `DATABASE_URL` environment variable)

### Authentication
- Replit Auth OIDC provider (`ISSUER_URL` defaults to `https://replit.com/oidc`)
- Requires `REPL_ID` and `SESSION_SECRET` environment variables

### Frontend Libraries
- Recharts for financial visualization
- date-fns for date formatting (Arabic locale support needed)
- Framer Motion for animations (listed in requirements)

### Development Tools
- Vite for frontend dev server with HMR
- Replit-specific plugins: runtime error overlay, cartographer, dev banner

### File Storage
- Local filesystem (`/uploads` directory) for document storage
- No external cloud storage configured

## Recent Changes

### Statistics System (January 2026)
- Added comprehensive `/statistics` page with multiple chart types (bar, pie, area)
- Statistics include: age distribution, medical condition types, payment status, branch distribution, monthly trends
- Time-range filtering: all time, last week, last month, last 3 months
- Branch filtering for admin users
- Financial metrics: all-time revenue, paid amounts, remaining balances, collection rate
- Time-filtered stats properly use visit dates and payment dates (not just patient registration dates)
- Monthly trends track patients by registration date, visits by visit date, payments by payment date

### Date-based Patient Filtering
- BranchDetails page includes date picker to view patients by any selected date
- Uses Gregorian calendar (en-GB format) with local date boundaries (not UTC)

### Sequential Patient Numbering
- Patient lists show sequential numbers (#1, #2, #3...) for easy visual counting

### Comprehensive Accounting System (January 2026)
- New `/accounting` page (admin-only access)
- Database tables: `expenses`, `installment_plans`, `invoices`, `invoice_items`
- Financial Dashboard with 6 KPIs: total revenue, payments, remaining, expenses, net profit, collection rate
- Multiple tabs: Dashboard, Expenses Management, Invoices, Reports, Analytics, Debtors

**Expenses Management:**
- Full CRUD operations with delete confirmation dialogs
- 6 categories: salaries, rent, medical_supplies, maintenance, utilities, other
- Color-coded category cards and charts

**Invoicing System:**
- Create invoices for patients with multiple line items
- Auto-generated invoice numbers (INV-YYYYMM-XXXX format)
- Service types: prosthetic, physiotherapy, medical support, consultation, other
- Invoice status tracking: pending, partial, paid, cancelled
- Payment amount tracking and remaining balance display

**Reports & Analytics:**
- Branch comparison and profitability analysis
- Monthly financial trends visualization with Area charts
- Service profitability breakdown (amputee, physiotherapy, medical support)
- Debtors tracking with outstanding balance monitoring
- PDF and Excel export with proper Arabic RTL support using arabic-reshaper

- All accounting endpoints are admin-only protected for write operations
- Branch staff can view their own branch's financial reports (read-only)
- Admin users see all branches with branch selector dropdown
- Branch staff see only their branch data with branch name badge

### Admin Settings System (January 2026)
- New `/admin` page for system administrators only
- Database tables: `system_settings`, `branch_passwords` for credential management
- Tabbed interface: Admin Password, Branch Passwords, Backup Email

**Password Security:**
- All passwords stored as bcrypt hashes (cost factor 10)
- Auto-migration: On first successful login with plaintext password, system automatically hashes and stores securely
- Legacy support: Environment variables (ADMIN_CODE, BRANCH_PASSWORD_X) supported for initial setup, auto-migrated to hashes
- Zod validation schemas for all auth endpoints

**Admin Features:**
- Change admin password (requires current password verification)
- Manage all branch passwords through UI
- Configure backup email for password recovery
- Sidebar menu item "إعدادات النظام" visible only to admin users

### User Management & Permissions System (February 2026)
- Database table: `system_users` for centralized user management
- Full CRUD operations for managing system users via AdminSettings "المستخدمين" tab
- Three user roles: admin, branch_manager, reception

**Authentication Flow:**
- Login checks `system_users` table first (username/password with bcrypt)
- Falls back to legacy branch-based authentication if no system user found
- Permissions stored in session (`branchSession.permissions`)
- Non-admin users require branch assignment

**12 Granular Permissions:**
- `canViewPatients`, `canAddPatients`, `canEditPatients`, `canDeletePatients`
- `canViewPayments`, `canAddPayments`, `canEditPayments`, `canDeletePayments`
- `canViewReports`, `canManageAccounting`, `canManageSettings`, `canManageUsers`

**Permission Enforcement:**
- Frontend: `usePermissions()` hook in `client/src/hooks/usePermissions.ts`
- Frontend: UI elements hidden based on permissions (buttons, menu items)
- Backend: `getPermissions()` helper in `server/routes.ts`
- Backend: Critical routes enforce permissions server-side (patient delete, payment delete)

**Default Permissions by Role:**
- Admin: Full permissions (all 13 enabled)
- Branch Manager: All except delete patients/payments, manage settings/users, manage treatment plans
- Reception: View and add only (no edit/delete permissions)
- Therapist (معالج طبيعي): View patients + manage treatment plans only

### Treatment Plan System (February 2026)
- Database table: `treatment_plans` for physiotherapy patient treatment plans
- New user role: `therapist` (معالج طبيعي) - can have multiple therapists per branch
- New permission: `canManageTreatmentPlans` - only therapists and admins can create/edit/delete plans
- Treatment plans visible to all users but editable only by therapists
- Multiple plans per patient (historical records with timestamps)
- Plan fields: diagnosis, injury type/location, MMT assessment, spasticity, sensation, pain level, ADL, session count, session frequency, device type, goal type (short-term/long-term), notes
- API endpoints: GET/POST `/api/patients/:patientId/treatment-plans`, PUT/DELETE `/api/treatment-plans/:id`
- Treatment plan section appears only for physiotherapy patients in PatientDetails page
- Therapist role supports shift selection (morning/evening) like reception role

### Payment Treatment Type Tracking (February 2026)
- Added `paymentTreatmentType` text column to `payments` table
- Payment modal includes treatment type checkboxes: روبوت، تمارين تأهيلية، أجهزة علاج طبيعي
- Multi-select stored as comma-separated string
- Treatment type displayed in patient payment history table
- Revenue by treatment type charts in Statistics and Accounting pages
- API endpoint: GET `/api/statistics/revenue-by-treatment` with optional `branchId` filter
- Legacy payments without treatment type shown as "غير محدد"

### Shift Tracking System (February 2026)
- Added `shift` text column to `visits` table ("morning" | "evening")
- Login form includes shift selector for non-admin branch users (صباحي/مسائي/تلقائي)
- Shift stored in session (`branchSession.shift`)
- Reception users: use their selected shift for all visits they create
- Admin/branch managers: shift auto-determined by server time (8-15 = morning, 16-21 = evening)
- Shift statistics chart added to Statistics page with PieChart and percentage breakdown
- Referral source statistics (الجهات المحول منها) added to Statistics page - accessible to all users

### Patient Satisfaction Survey System (February 2026)
- Database tables: `survey_templates`, `survey_questions`, `survey_responses`, `survey_answers`
- New user role: `surveyor` (موظف استبيان) with `canManageSurveys` permission
- 3 predefined survey templates auto-seeded on startup:
  - Prosthetics Assessment (10 questions: comfort, function, appearance, durability, service, pain, overall)
  - Physiotherapy Assessment (10 questions: treatment, therapist, communication, equipment, environment, scheduling, results, overall)
  - General Branch Assessment (5 questions: reception, waiting, cleanliness, facilities, overall)
- All questions bilingual (Arabic/English), rating type 1-5 scale
- Auto-template selection based on patient type (isAmputee→prosthetics, isPhysiotherapy→physiotherapy, isMedicalSupport→general)
- Survey page `/surveys` with two tabs: Add Survey (patient search, star ratings, submit) and Results (summary cards, branch/department comparison charts, recent surveys table, detail dialog)
- API endpoints: GET `/api/survey-templates`, GET `/api/survey-templates/:id/questions`, GET/POST `/api/survey-responses`, GET `/api/survey-results`
- Responses auto-calculate totalScore, maxScore, percentage
- Surveyor role redirects to /surveys on login, sees only survey functionality

### Daily Stats Performance Optimization (March 2026)
- `/api/reports/daily` endpoint rewritten to use 4 direct parameterized SQL queries instead of N+1 queries (was 554+ individual queries for each patient's visits)
- Uses drizzle-orm `sql` tagged template literals for parameterized queries (no SQL injection risk)
- Baghdad timezone (UTC+3) date boundaries computed correctly for `timestamp without time zone` columns
- Dates converted to plain timestamp strings (no `Z` suffix) with explicit `::timestamp` casts for correct comparison
- Branch filter validated (returns 400 for invalid branchId)
- Error handling with try/catch and Arabic error message

### Statistics New vs Returning Patient Split (March 2026)
- Statistics page now distinguishes between "new registered" patients (registered in selected time period) vs "total active" patients (registered OR visited OR paid in period)
- New summary cards: "مسجلون جدد" (new registered), "دافعون من الجدد" (new patients who have any payment record)
- Per-type breakdown (amputee, physiotherapy, medical support) now shows new registered count alongside total
- `newPaidPatients` counts new patients who have ANY payment (not limited to payments within the time range)
- When no time filter is active, new registered = all patients (all are "new" since inception)

### Patient Classification Field (March 2026)
- Added `patient_classification` text column to `patients` table
- Dropdown field visible only for Karbala branch (branchId=2) in CreatePatient and EditPatient forms
- Two options: "new" (مريض جديد) and "past" (مريض قديم)
- Field appears before "General Notes" in the form
- Classification displayed in PatientDetails page for Karbala branch patients