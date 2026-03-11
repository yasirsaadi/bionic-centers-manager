# Replit.md - Medical Center Patient Management System

## Overview

This is a full-stack medical center management application for "Bionic Center" (مركز بايونك), specializing in prosthetics and physiotherapy services across multiple branches in Iraq. The system's primary purpose is to efficiently manage patient records, treatment plans, visits, payments, and medical documents. It supports Arabic RTL interface and aims to streamline operations across various geographical locations (Baghdad, Karbala, Dhi Qar, Mosul, Kirkuk). The system includes robust accounting features, user and permission management, patient satisfaction surveys, and detailed statistics for operational insights and financial tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework & Libraries:** React 18 with TypeScript, Wouter for routing, TanStack Query for state management.
- **UI & Styling:** shadcn/ui with Radix UI primitives, Tailwind CSS with CSS variables for theming.
- **Forms:** React Hook Form with Zod validation.
- **Internationalization:** Mandatory Arabic RTL layout, Almarai and Tajawal fonts for Arabic typography.

### Backend
- **Runtime & Language:** Node.js with Express, TypeScript with ESM modules.
- **API:** RESTful endpoints.
- **Build:** Custom build script using esbuild (server) and Vite (client).
- **File Management:** Multer for file uploads, stored locally in `/uploads`.

### Data Management
- **Database:** PostgreSQL managed via Drizzle ORM.
- **Schema & Migrations:** `shared/schema.ts` for schema definition, Drizzle Kit for migrations.
- **Session Management:** PostgreSQL-backed sessions using `connect-pg-simple`.

### Authentication & Authorization
- **Authentication Provider:** Replit Auth (OpenID Connect).
- **User Roles:** Admin, Branch Manager, Reception, Therapist, Surveyor.
- **Permissions:** Granular, role-based permissions (e.g., view/add/edit/delete patients/payments, manage accounting, settings, users, treatment plans, surveys).
- **Security:** Passwords stored as bcrypt hashes.

### Key Data Models
- **Core Entities:** Branches, Patients, Visits, Payments, Documents.
- **Extended Entities:** Expenses, Installment Plans, Invoices, Invoice Items, System Settings, Branch Passwords, System Users, Treatment Plans, Survey Templates, Survey Questions, Survey Responses, Survey Answers.

### Shared Code
- `shared/` directory for common schemas and route definitions, enabling consistent API contracts and validation across client and server.

### Core Features
- **Patient Management:** Comprehensive patient profiles, classification (new/past), sequential numbering, date-based filtering.
- **Financial Management:** Detailed payment tracking, comprehensive accounting system with expenses, invoices, and installment plans. Includes a financial dashboard with KPIs.
- **Reporting & Statistics:** Extensive statistics page with various charts (age, condition, payment status, branch distribution, monthly trends, revenue by treatment type, new vs. returning patients, monthly new patients report), and PDF/Excel exports.
- **User & Access Management:** Centralized user management with role-based access control and granular permissions enforced on both frontend and backend.
- **Treatment Plans:** Dedicated system for physiotherapy patient treatment plans with specific therapist access.
- **Surveys:** Patient satisfaction survey system with customizable templates, response collection, and analysis.
- **Operational:** Shift tracking for visits, admin settings for system and branch password management.

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit Auth OIDC provider

### Frontend Libraries
- Recharts (for visualizations)
- date-fns (for date manipulation)
- Framer Motion (for animations)

### File Storage
- Local filesystem (`/uploads` directory)