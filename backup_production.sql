--
-- PostgreSQL database dump
--

\restrict wOURtwfVHocIadMR1wZmfV2g0Fri16zviM8yLyO5KBKsbREJevu5pYaybhdXpo6

-- Dumped from database version 16.12 (8dbf2dd)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _system; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA _system;


ALTER SCHEMA _system OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: replit_database_migrations_v1; Type: TABLE; Schema: _system; Owner: neondb_owner
--

CREATE TABLE _system.replit_database_migrations_v1 (
    id bigint NOT NULL,
    build_id text NOT NULL,
    deployment_id text NOT NULL,
    statement_count bigint NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE _system.replit_database_migrations_v1 OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE; Schema: _system; Owner: neondb_owner
--

CREATE SEQUENCE _system.replit_database_migrations_v1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE OWNED BY; Schema: _system; Owner: neondb_owner
--

ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNED BY _system.replit_database_migrations_v1.id;


--
-- Name: branch_passwords; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.branch_passwords (
    id integer NOT NULL,
    branch_id integer NOT NULL,
    password text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.branch_passwords OWNER TO neondb_owner;

--
-- Name: branch_passwords_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.branch_passwords_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branch_passwords_id_seq OWNER TO neondb_owner;

--
-- Name: branch_passwords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.branch_passwords_id_seq OWNED BY public.branch_passwords.id;


--
-- Name: branch_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.branch_settings (
    id integer NOT NULL,
    branch_id integer NOT NULL,
    show_patients boolean DEFAULT true,
    show_visits boolean DEFAULT true,
    show_payments boolean DEFAULT true,
    show_documents boolean DEFAULT true,
    show_statistics boolean DEFAULT true,
    show_accounting boolean DEFAULT true,
    show_expenses boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT now(),
    show_dashboard boolean DEFAULT true
);


ALTER TABLE public.branch_settings OWNER TO neondb_owner;

--
-- Name: branch_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.branch_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branch_settings_id_seq OWNER TO neondb_owner;

--
-- Name: branch_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.branch_settings_id_seq OWNED BY public.branch_settings.id;


--
-- Name: branches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    name text NOT NULL,
    location text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.branches OWNER TO neondb_owner;

--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branches_id_seq OWNER TO neondb_owner;

--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: custom_stats; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.custom_stats (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    stat_type text NOT NULL,
    category text NOT NULL,
    filter_field text,
    filter_value text,
    branch_id integer,
    is_global boolean DEFAULT false,
    created_by text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.custom_stats OWNER TO neondb_owner;

--
-- Name: custom_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.custom_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_stats_id_seq OWNER TO neondb_owner;

--
-- Name: custom_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.custom_stats_id_seq OWNED BY public.custom_stats.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    document_type text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.documents OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    branch_id integer NOT NULL,
    category text NOT NULL,
    subcategory text,
    description text,
    amount integer NOT NULL,
    expense_date date NOT NULL,
    payment_method text,
    vendor text,
    invoice_number text,
    notes text,
    created_by text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO neondb_owner;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO neondb_owner;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: installment_plans; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.installment_plans (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    branch_id integer NOT NULL,
    total_amount integer NOT NULL,
    installment_amount integer NOT NULL,
    number_of_installments integer NOT NULL,
    start_date date NOT NULL,
    interval_days integer DEFAULT 30,
    status text DEFAULT 'active'::text,
    notes text,
    created_by text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.installment_plans OWNER TO neondb_owner;

--
-- Name: installment_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.installment_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.installment_plans_id_seq OWNER TO neondb_owner;

--
-- Name: installment_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.installment_plans_id_seq OWNED BY public.installment_plans.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    description text NOT NULL,
    service_type text,
    quantity integer DEFAULT 1,
    unit_price integer NOT NULL,
    total integer NOT NULL
);


ALTER TABLE public.invoice_items OWNER TO neondb_owner;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_items_id_seq OWNER TO neondb_owner;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number text NOT NULL,
    patient_id integer NOT NULL,
    branch_id integer NOT NULL,
    invoice_date date NOT NULL,
    due_date date,
    subtotal integer NOT NULL,
    discount integer DEFAULT 0,
    total integer NOT NULL,
    paid_amount integer DEFAULT 0,
    status text DEFAULT 'pending'::text,
    notes text,
    created_by text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO neondb_owner;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    name text NOT NULL,
    age text NOT NULL,
    weight text,
    height text,
    medical_condition text NOT NULL,
    is_amputee boolean DEFAULT false,
    amputation_site text,
    is_physiotherapy boolean DEFAULT false,
    disease_type text,
    total_cost integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    injury_date date,
    general_notes text,
    prosthetic_type text,
    treatment_type text,
    branch_id integer NOT NULL,
    phone text,
    address text,
    injury_cause text,
    silicon_type text,
    silicon_size text,
    suspension_system text,
    foot_type text,
    foot_size text,
    knee_joint_type text,
    is_medical_support boolean DEFAULT false,
    support_type text,
    injury_side text,
    referral_source text DEFAULT ''::text NOT NULL,
    referral_notes text,
    injury_type text,
    injury_area text,
    injuries text,
    patient_classification text
);


ALTER TABLE public.patients OWNER TO neondb_owner;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO neondb_owner;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    amount integer NOT NULL,
    notes text,
    date timestamp without time zone DEFAULT now(),
    branch_id integer,
    payment_treatment_type text,
    session_count integer,
    is_free_sessions boolean DEFAULT false
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: survey_answers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.survey_answers (
    id integer NOT NULL,
    response_id integer NOT NULL,
    question_id integer NOT NULL,
    rating_value integer,
    text_value text,
    bool_value boolean
);


ALTER TABLE public.survey_answers OWNER TO neondb_owner;

--
-- Name: survey_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.survey_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.survey_answers_id_seq OWNER TO neondb_owner;

--
-- Name: survey_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.survey_answers_id_seq OWNED BY public.survey_answers.id;


--
-- Name: survey_questions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.survey_questions (
    id integer NOT NULL,
    template_id integer NOT NULL,
    question_text text NOT NULL,
    question_text_en text NOT NULL,
    question_order integer NOT NULL,
    question_type text NOT NULL,
    category text NOT NULL
);


ALTER TABLE public.survey_questions OWNER TO neondb_owner;

--
-- Name: survey_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.survey_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.survey_questions_id_seq OWNER TO neondb_owner;

--
-- Name: survey_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.survey_questions_id_seq OWNED BY public.survey_questions.id;


--
-- Name: survey_responses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.survey_responses (
    id integer NOT NULL,
    template_id integer NOT NULL,
    patient_id integer NOT NULL,
    branch_id integer NOT NULL,
    surveyor_id integer,
    surveyor_name text,
    total_score integer NOT NULL,
    max_score integer NOT NULL,
    percentage integer NOT NULL,
    notes text,
    completed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.survey_responses OWNER TO neondb_owner;

--
-- Name: survey_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.survey_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.survey_responses_id_seq OWNER TO neondb_owner;

--
-- Name: survey_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.survey_responses_id_seq OWNED BY public.survey_responses.id;


--
-- Name: survey_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.survey_templates (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    target_type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.survey_templates OWNER TO neondb_owner;

--
-- Name: survey_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.survey_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.survey_templates_id_seq OWNER TO neondb_owner;

--
-- Name: survey_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.survey_templates_id_seq OWNED BY public.survey_templates.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO neondb_owner;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO neondb_owner;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: system_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.system_users (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    branch_id integer,
    role text DEFAULT 'reception'::text NOT NULL,
    is_active boolean DEFAULT true,
    can_view_patients boolean DEFAULT true,
    can_add_patients boolean DEFAULT true,
    can_edit_patients boolean DEFAULT false,
    can_delete_patients boolean DEFAULT false,
    can_view_payments boolean DEFAULT true,
    can_add_payments boolean DEFAULT true,
    can_view_reports boolean DEFAULT false,
    can_manage_accounting boolean DEFAULT false,
    can_manage_settings boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    can_edit_payments boolean DEFAULT false,
    can_delete_payments boolean DEFAULT false,
    can_manage_users boolean DEFAULT false,
    can_manage_treatment_plans boolean DEFAULT false,
    language text DEFAULT 'ar'::text,
    can_manage_surveys boolean DEFAULT false NOT NULL
);


ALTER TABLE public.system_users OWNER TO neondb_owner;

--
-- Name: system_users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.system_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_users_id_seq OWNER TO neondb_owner;

--
-- Name: system_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.system_users_id_seq OWNED BY public.system_users.id;


--
-- Name: treatment_plans; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.treatment_plans (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    branch_id integer NOT NULL,
    therapist_id integer,
    therapist_name text,
    diagnosis text,
    injury_type text,
    injury_location text,
    mmt_assessment text,
    spasticity text,
    sensation text,
    pain_level text,
    adl text,
    session_count integer,
    session_frequency text,
    device_type text,
    goal_type text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    disease_history text
);


ALTER TABLE public.treatment_plans OWNER TO neondb_owner;

--
-- Name: treatment_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.treatment_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.treatment_plans_id_seq OWNER TO neondb_owner;

--
-- Name: treatment_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.treatment_plans_id_seq OWNED BY public.treatment_plans.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: visits; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.visits (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    branch_id integer NOT NULL,
    visit_date timestamp without time zone DEFAULT now(),
    details text,
    notes text,
    treatment_type text,
    session_count integer,
    cost integer,
    shift text
);


ALTER TABLE public.visits OWNER TO neondb_owner;

--
-- Name: visits_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.visits_id_seq OWNER TO neondb_owner;

--
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.visits_id_seq OWNED BY public.visits.id;


--
-- Name: replit_database_migrations_v1 id; Type: DEFAULT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1 ALTER COLUMN id SET DEFAULT nextval('_system.replit_database_migrations_v1_id_seq'::regclass);


--
-- Name: branch_passwords id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_passwords ALTER COLUMN id SET DEFAULT nextval('public.branch_passwords_id_seq'::regclass);


--
-- Name: branch_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_settings ALTER COLUMN id SET DEFAULT nextval('public.branch_settings_id_seq'::regclass);


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: custom_stats id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_stats ALTER COLUMN id SET DEFAULT nextval('public.custom_stats_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: installment_plans id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.installment_plans ALTER COLUMN id SET DEFAULT nextval('public.installment_plans_id_seq'::regclass);


--
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: survey_answers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_answers ALTER COLUMN id SET DEFAULT nextval('public.survey_answers_id_seq'::regclass);


--
-- Name: survey_questions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_questions ALTER COLUMN id SET DEFAULT nextval('public.survey_questions_id_seq'::regclass);


--
-- Name: survey_responses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_responses ALTER COLUMN id SET DEFAULT nextval('public.survey_responses_id_seq'::regclass);


--
-- Name: survey_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_templates ALTER COLUMN id SET DEFAULT nextval('public.survey_templates_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: system_users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_users ALTER COLUMN id SET DEFAULT nextval('public.system_users_id_seq'::regclass);


--
-- Name: treatment_plans id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.treatment_plans ALTER COLUMN id SET DEFAULT nextval('public.treatment_plans_id_seq'::regclass);


--
-- Name: visits id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.visits ALTER COLUMN id SET DEFAULT nextval('public.visits_id_seq'::regclass);


--
-- Data for Name: replit_database_migrations_v1; Type: TABLE DATA; Schema: _system; Owner: neondb_owner
--

COPY _system.replit_database_migrations_v1 (id, build_id, deployment_id, statement_count, applied_at) FROM stdin;
1	732671f8-08a5-4e26-9df0-59f0ca617ffe	e330715a-66c7-472b-84ce-20a1fdb0740b	3	2026-01-12 13:39:28.467339+00
2	b601ec67-7dc9-4846-8880-1bcb4b382e18	e330715a-66c7-472b-84ce-20a1fdb0740b	6	2026-01-14 06:01:55.038714+00
3	86a2250d-327c-4b8e-a1e3-dde0ca3ebe25	e330715a-66c7-472b-84ce-20a1fdb0740b	3	2026-01-17 17:59:09.8865+00
4	f1b5ea2f-1a49-477c-a92e-8692c285291c	e330715a-66c7-472b-84ce-20a1fdb0740b	2	2026-01-25 23:37:38.553876+00
5	e6d74eac-8a10-44ea-995f-223fd6ac959f	e330715a-66c7-472b-84ce-20a1fdb0740b	10	2026-01-26 06:44:35.88033+00
6	43116531-c124-4496-b566-f17eb23d1527	e330715a-66c7-472b-84ce-20a1fdb0740b	5	2026-01-26 17:54:46.892568+00
7	31980b45-3eee-4657-9e67-fe4cbbfbd1f6	e330715a-66c7-472b-84ce-20a1fdb0740b	4	2026-02-03 08:54:55.558013+00
8	482fa7b0-5a56-4acc-b6f8-84743a837199	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-02-03 10:43:17.445206+00
9	df67b44a-d54e-4a9f-910d-cf847af4901a	e330715a-66c7-472b-84ce-20a1fdb0740b	2	2026-02-03 11:16:11.440711+00
10	25b167fa-976c-4e9f-80d8-86d00f9cf390	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-02-13 20:08:04.752835+00
11	dd1bd4c3-5dee-48cf-88c4-232ba90b2457	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-02-13 20:45:18.210999+00
12	ffa6191e-058d-4ede-a20e-bc3a5ce5d899	e330715a-66c7-472b-84ce-20a1fdb0740b	3	2026-02-14 06:19:05.593957+00
13	c14f8312-caf6-41ca-9452-847f9714c20e	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-02-15 07:14:06.806829+00
14	51b1c19c-c15d-4938-8fa8-b3d85cfa6a56	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-02-16 15:01:29.697919+00
15	1c0a1c2b-eaa2-43fd-b5b9-7522c5f64457	e330715a-66c7-472b-84ce-20a1fdb0740b	5	2026-02-16 19:33:11.39857+00
16	ceff68cb-5109-417d-bf75-9198b96a5763	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-02-16 21:59:24.560549+00
17	e5003877-aa79-4f20-b49b-3091760cc26b	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-02-18 07:31:24.371476+00
18	9bfd4f89-b07b-429b-89ee-c3ee848cb1b5	e330715a-66c7-472b-84ce-20a1fdb0740b	12	2026-02-23 11:15:08.69133+00
19	632ec6e4-156d-456b-8256-e963ee055f6c	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-02-23 11:34:29.960761+00
20	0cc6cdf3-6dcc-4b6d-8db6-ceb2ea07a712	e330715a-66c7-472b-84ce-20a1fdb0740b	1	2026-03-09 09:54:25.460603+00
\.


--
-- Data for Name: branch_passwords; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branch_passwords (id, branch_id, password, updated_at) FROM stdin;
5	1	$2b$10$s7EfKyly4YUFLCgJSkRVLekt7Vkb8.OHTMDyC.7BUCHF5dPAMGgwa	2026-02-03 09:36:09.068
2	2	$2b$10$VBIS9h2juRZfqIv2Pr85h.JJdVrR5syutDsYLQu/KAJ8XR6RtTw3K	2026-02-03 09:36:17.832
3	4	$2b$10$gCqtZScwdg6YbPHBFs5Hnu5KxPJdalAD0wsZUd9xb.uNMVo7c3QCm	2026-02-03 09:36:32.871
4	5	$2b$10$5Di8RRD6sK2O6ogxerZXmuoO97TPMnXE.CaajuP3dyD32rmtvX/IC	2026-02-03 09:36:39.754
1	3	$2b$10$lYn4.d9sQYRELaDY9y5XBONtZyr03vNP1q8sGyLVFtcKdxt01WZcG	2026-02-23 11:25:00.945
\.


--
-- Data for Name: branch_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branch_settings (id, branch_id, show_patients, show_visits, show_payments, show_documents, show_statistics, show_accounting, show_expenses, updated_at, show_dashboard) FROM stdin;
1	1	t	t	t	t	t	t	t	2026-01-26 17:42:21.024	t
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branches (id, name, location, created_at) FROM stdin;
1	بغداد	بغداد	2026-01-12 11:49:16.325957
2	كربلاء	كربلاء	2026-01-12 11:49:16.362123
3	ذي قار	ذي قار	2026-01-12 11:49:16.384018
4	الموصل	الموصل	2026-01-12 11:49:16.406219
5	كركوك	كركوك	2026-01-12 11:49:16.428535
\.


--
-- Data for Name: custom_stats; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.custom_stats (id, name, description, stat_type, category, filter_field, filter_value, branch_id, is_global, created_by, created_at) FROM stdin;
1	التحويلات	بيان مصادر تحويلات المرضى للمركز	count	patients	isPhysiotherapy	true	\N	f	unknown	2026-02-15 06:28:22.757831
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documents (id, patient_id, document_type, file_name, file_url, uploaded_at) FROM stdin;
1	27	report	AC9D30DD-0214-4736-B7B2-B1878B2783E4.jpeg	/uploads/file-1768422548392-136251198.jpeg	2026-01-14 20:29:08.438711
4	22	report	AC9D30DD-0214-4736-B7B2-B1878B2783E4.jpeg	/uploads/file-1768423410917-975379002.jpeg	2026-01-14 20:43:31.091781
6	29	report	ÙØ¹ÙØ© Ø§ÙÙÙ.jpeg	/uploads/file-1768473057604-454727397.jpeg	2026-01-15 10:30:57.771767
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.expenses (id, branch_id, category, subcategory, description, amount, expense_date, payment_method, vendor, invoice_number, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: installment_plans; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.installment_plans (id, patient_id, branch_id, total_amount, installment_amount, number_of_installments, start_date, interval_days, status, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoice_items (id, invoice_id, description, service_type, quantity, unit_price, total) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, invoice_number, patient_id, branch_id, invoice_date, due_date, subtotal, discount, total, paid_amount, status, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patients (id, name, age, weight, height, medical_condition, is_amputee, amputation_site, is_physiotherapy, disease_type, total_cost, created_at, injury_date, general_notes, prosthetic_type, treatment_type, branch_id, phone, address, injury_cause, silicon_type, silicon_size, suspension_system, foot_type, foot_size, knee_joint_type, is_medical_support, support_type, injury_side, referral_source, referral_notes, injury_type, injury_area, injuries, patient_classification) FROM stdin;
28	اساور نعيم كريم لوتي 	28	58	156	physiotherapy	f		t	انزلاق فقرات الرقبه 	400000	2026-01-15 07:56:48.53496	2020-06-05	تم تسديد قيمة باكج مكوّن من 6 جلسات بمبلغ 25,000 للجلسة الواحدة، ليكون إجمالي المبلغ المدفوع 150,000.		علاج طبيعي 	3	07831703415	الناصريه حي اور	كثرة الشغل والطباعه 							f	\N	\N		\N	\N	\N	\N	\N
13	سندس محسن جعاز خنجر	56			physiotherapy	f		t	الأم مفصل الورك 	50000	2026-01-13 11:53:00.919557	\N			علاج طبيعي	3	07800637765	ذي قار الناصريه السكك		\N	\N	\N	\N	\N	\N	f	\N	\N		\N	\N	\N	\N	\N
109	سرحان ذياب حريز	36	75	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		3000000	2026-01-24 17:54:59.53305	2025-06-01		تحت الركبة عرض كاربوني 		5	07733576339	صلاح الدين/ سامراء 	اصابة عمل 	واكنر الماني	32	فاكيوم	كاربوني عالي 	25		f				\N	\N	\N	\N	\N
24	نوال كامل ياسر سدخان	50	80	175	physiotherapy	f		t	الام في الرقبة والاكتاف 	250000	2026-01-14 10:15:33.900013	2025-12-09	بكج 10 جلسات على 25 الف مريضة محولة من دكتور علي فاخر الزيدي		علاج طبيعي	3	07763827705	الناصرية المجمع اللبناني	فشل في الغدة الكظرية اثر على الاعصاب 							f	\N	\N		\N	\N	\N	\N	\N
27	علي جابر علي مهاوش	42	82	180	physiotherapy	f		t	انزلاق بالفقرات القطنية 	50000	2026-01-14 17:53:17.410666	2025-03-01				3	07802814233		رياضة 							f	\N	\N		\N	\N	\N	\N	\N
25	عباس جبار هاشم فرحان	60	90	180	physiotherapy	f		t	lumber pain L4/L5/S1 	40000	2026-01-14 11:47:20.461993	\N			علاج طبيعي 	3	07800229075	العراق - Iraq, ذي قار الناصرية  الادارة المحلية	age							f	\N	\N		\N	\N	\N	\N	\N
26	حوراء جبار محسن جبر	30	66	170	physiotherapy	f		t	شلل نصفي	50000	2026-01-14 16:55:42.462632	2021-09-05	تحتاج الى تاهيل لمدة 3 اسابيع		علاج طبيعي	3	07700060306	ذي قار/ النصر	سقوط مفاجى على الظهر							f	\N	\N		\N	\N	\N	\N	\N
110	رندة خليل ابراهيم 	29	59	160	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين	f		600000	2026-01-24 18:04:47.130372	2024-10-10				5	07831725037	كركوك / حي الواسطي	حادث							f				\N	\N	\N	\N	\N
37	قاسم مزهر مناحي خفي	56	97	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقربات العنقيه 	35000	2026-01-17 08:41:59.420626	2025-06-12	مراجع قديم اخر جلسه كانت في تاريخ 4/9/2025 		علاج طبيعي	3	07802191843	ناصريه ال نياز 	العمل وتقدم السن 							f	\N	\N		\N	\N	\N	\N	\N
32	علي مالك صالح منصور	40	88	170	physiotherapy	f		t	تشنج عضلي 	50000	2026-01-15 13:41:43.797139	2026-12-01			علاج طبيعي	3	07801377322	ذي قار حي الرافدين	تعب وجهد							f								
29	نعمة الله مكرم جان 	25	65	175	amputee	t	احادي - طرف علوي - يسار	f		0	2026-01-15 10:25:38.716841	2024-08-01	مراجع سابق /تم استلام الطرف /علمأ ان سعر الطرف خمسة ملايين 	يد سلكونية تجميلية		2	07734570079	كربلاء 	حادث عمل 							f			فيسبوك		\N	\N		past
108	دنيا كريم ياسر لعيوس	49		155	physiotherapy	f	احادي - طرف سفلي - يمين	t	كسر تهشمي 	360000	2026-01-24 16:20:04.629982	2025-12-10			تأهيل حركي 	3	07809374195	ذي قار الناصرية حي اور 	سقوط من درج كهربائي 							f				\N	\N	\N	\N	\N
20	شهاب عبيد احمد 	37	83	185	amputee	t	احادي - طرف سفلي - يمين	f		0	2026-01-13 14:47:42.538097	2025-01-06	مجاني 	طرف تحت الركبة شتل لوك مع سليكون البس امريكي وقدم ساج فوت		1	07806845952	بغداد - اليوسفية 	الفدم السكري 							f					\N	\N		new
15	نصير كريم مجيد 	65	82	180	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-01-13 13:23:16.395102	2021-07-10	طرف بنظام العرض مع ركبة اضافية وقدم سنكل وسليكون البس اضافي بسعر ٧ مليون تم دفعها قبل شهر تقريبا	طرف فوق الركبة بايونك هيدروليكي هوائي 		1	07901765258	بغداد - الدورة شارع ٦٠	انسداد الشرايين مع السكري	البس 		شتل لوك 	سنكل 	26	بايونك هوائي 	f			فيسبوك		\N	\N		past
104	عثمان تتويج صالح 	34	63	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		5400000	2026-01-24 13:27:13.32426	2006-01-24		مفصل بايونيك + قالب كاربون درجه اولى		1	07832024433	بغداد / ابو غريب 	انفجار 	البس		شتل لوك	سنكل	26	بايونيك	f			فيسبوك		\N	\N		new
17	حميدة سهم غافل 	55	100		amputee	t	احادي - طرف سفلي - يمين	f		0	2026-01-13 13:45:50.935561	2016-12-27	المريضة مستلمة الطرف من كربلاء بسنة 2017 وتم مراجعة فرع بغداد لغرض تبديل السليكون اوتوبوك علما انها دفعت كلفة السليكون والبالغة مليون قبل اسبوع	طرف تحت الركبة شتل لوك مع قدم متحركة سنكل وسليكون اوتوبوك		1	07704560442	بغداد - الحرية - دور نواب الضباط 	القدم السكري 							f					\N	\N		past
16	نضال حاجم سلمان 	65	94	190	amputee	t	احادي - طرف سفلي - يمين	f		475000	2026-01-13 13:30:53.131091	2021-04-10		طرف تحت الركبة بقدم كاربونية بايونك 		1	07827178806	بابل - النيل - قرية العزة 	القدم السكري 							f					\N	\N		new
30	حسن عبد الزهرة عبد عون  	34	85	185	amputee	t	احادي - طرف علوي - يمين	f		0	2026-01-15 10:30:44.61948	2023-02-01	مراجع جديد /لديه كتاب /وتم عرض له يد تجميلية سلكونية 			2	07721535102	كربلاء 	كهرباء 							f			فيسبوك		\N	\N		new
19	اسعد رضا كرماش 	49	97	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		2750000	2026-01-13 14:42:23.67606	2003-12-13	المريض قد عمل سابقا طرف بقيمة ١٣ مليون ونص واليوم اتى لعمل قالب بقيمة مليون ونص	قالب تحت الركبة كاربون درجة اولى		1	07901586299 / 07705581228	بغداد - الطوبجي 	طلق ناري 	3d اوتوبوك  		فاكيوم	اكيلون 		تحت الركبه	f					\N	\N		past
5	مصطفى محمد حامد	20	80	175	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين	f		1200000	2026-01-12 14:36:27.966137	2022-12-08	تم عرض الاجزاء السيليكونية من عمل مراكزنا وتم اخذ القالب بتارخ 12/1/2026	سلكوني تجميلي		4	07719035580	نينوى \\موصل الجديدة	حادث							f			فيسبوك		\N	\N		new
42	حسين قاسم فليح حسن	34	80	172	physiotherapy	f	احادي - طرف سفلي - يمين	t	تنخر بمفصل الورك الايمن والايسر والنزلاق بالفقرة الرابعة والخامسة 	35000	2026-01-17 14:17:44.339153	2025-01-02			علاج طبيعي 	3	07803116687	الغراف	الم مفاجىء 							f	\N	\N		\N	\N	\N	\N	\N
105	محمد فلاح حسن عبد الامير 	36	65	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	 ضعف بالعضلات 	150000	2026-01-24 13:31:03.538453	2024-12-03			علاج طبيعي 	3	07800511287	ذي قار الناصرية السبل 	سقوط من مكان عالي 							f				\N	\N	\N	\N	\N
41	غنيمة عبد الصاحب جبار مزعل	62	72	156	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق وضيق بقناة الحبل الشوكي 	385000	2026-01-17 14:07:34.412198	2025-02-08			علاج الطبيعي	3	07834000007	سيد دخيل	حادث سقوط 							f	\N	\N		\N	\N	\N	\N	\N
33	دحام محمد خلف	48	67	166	amputee	t	احادي - طرف سفلي - يمين	f		0	2026-01-15 13:48:57.571409	2016-06-27	استعلام.......تم عرض طرف نظام فاكيوم قالب كاربون مع قدم متحرك بسعر سبعة ملايين حسب طلب المريض			4	07701860959	نينوى-موصل-حي اليرموك	عملية ارهابية							f			فيسبوك		\N	\N		new
38	حسن فرحان جويد 	35	89	180	amputee	t	اطراف سليكونية تعويضية - اذن - يسار	f		0	2026-01-17 13:23:15.314085	2025-11-14	مراجع جديد /وتم تحويله الى مركز بغداد 			2	07800815121	المثنى 	حادث سير							f					\N	\N		new
31	عقيل عبد اللطيف عبد الرضا 	43	69	155	physiotherapy	f		t	كسر في المرفق 	485000	2026-01-15 13:24:25.456362	2025-02-09	المريض تمت عمليته من قبل دكتور محمد توفيق وتمت مراجعته لدكتور حيدر محمد ونصحوه بإستمراره بالعلاج الطبيعي في مركزنا وتم اليوم اخذ استشاره له من قبل دكتور مصطفى العضاض وباشر في جلسته الاولى بتاريخ اليوم		تأهيل حركي 	3	07816180282	ذي قار المنصورية 	سقوط من مكان عالي 							f				\N	\N	\N	\N	\N
39	احمد كاظم شمخي 	63	85	180	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-01-17 13:28:27.302173	2024-11-11	مراجع سابق تم تركيب طرف له بقيمة 8,000,000 ملايين 	طرف هوائي 3R78		2	07716165737	كربلاء 	قدم سكري 	بروتيد شتل لوك	38	شتل لوك	سنكل 	27	3R78	f			فيسبوك		\N	\N		past
44	وليد هادي فرج 	52	103	185	amputee	t	ثنائي - سفلي	f		0	2026-01-17 16:58:05.739094	2017-01-17	اطراف تحت الركبة باقدام بايونك كاربونية بسعر ٦ ملايين 	طرف سفلي تحت الركبة باقدام بايونك 		1	07906957239	بغداد / عويريج 	القدم السكري 	البس امريكي 	28	شتل لوك 	قدم كاربون بايونك 	42 / 26 	لايوجد 	f					\N	\N		past
50	رياض عداي حومد 	44	85	175	amputee	t	ثنائي - سفلي	f		0	2026-01-17 18:30:55.227592	2007-01-17	مريض سابق من جرحى الداخلية 	1c62 اوتوبوك 		1	07700047240	ديالى / بلد روز 	انفجار 	3D اوتوبوك مع سليف اوتوبوك	26	فاكيوم 	1c62	26	لايوجد 	f					\N	\N		past
48	مصطفى عليوي عبد	24	55	160	medical_support	f	احادي - طرف سفلي - يمين	f		900000	2026-01-17 18:14:49.010043	2017-01-17	راجعنا بتاريخ 22-3-2025 وعمل مسند ظهر بسعر مليون و ٢٥٠ الف …..ثم راجعنا مرة ثانية بتاريخ 17-1-2026 وعمل مسند ثاني لان نسبة الانحراف قلت بفضل المسند الاول وحدد له الاخصائي عمل مسند ثاني 			1	07812531334	النجف / الكوفة	انحراف العمود الفقري							t	مسند ظهر 	مسند تقويمي للظهر			\N	\N		past
47	ضياء كمر عبود 	49	100	165	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		7000000	2026-01-17 17:40:09.89815	2013-01-17	تم مراجعة المركز بتاريج 22-12-2025 وقام بشراء قالب وسليكون وشتل بسعر مليونين و ٥٠٠ الف وتم الاستلام بتاريخ 3-1-2026 ثم قام بشراء طرف هيدروليكي هوائي بايونك بتاريخ 7-1-2026 بسعر ٥ ملايين ودفع ٥٠٠ بنفس اليورم ليبقى ٤ مليون ونص	طرف 3R78 الماني 		1	07714575715	بغداد / حي العامل 	حادث سير 	البس امريكي	38	شتل لوك	متحركة سنكل 	26	3R78 الماني 	f					\N	\N		past
45	علي نزار صبير 	21	50	160	amputee	t	ثنائي - سفلي	f		0	2026-01-17 17:07:24.357963	2024-01-17	مراجع سابق منذ 2025	طرفين 3R60 اوتوبوك مع اقدام سنكل متحركة 		1	07735789244	بغداد / البلديات 	حادث سير 	البس امريكي 	32	شتل لوك 	قدم متحركة سنكل اكسسز	26	3R60 	f			فيسبوك		\N	\N		past
40	زيد رحيم شمخي 	23	50	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-01-17 13:32:36.857403	2010-11-11	مراجع سابق / تم شراء طرف بقيمة 3,000,000 مسبقا / تم اخذ قالب ( م محمد )	باسف 		2	07725067464	الديوانية 	انفجار سيارة 	البس امريكي	20	باسف فاكيوم	كاربون 	25	لايوجد 	f			فيسبوك		\N	\N		past
34	احمد عماد عبد	41	100	174	amputee	t	ثنائي - سفلي	f		3750000	2026-01-15 13:54:17.671324	2023-06-28	تبديل قالب فقط تكلفة القالبين ثلاثة ملايين تم تغليف الاطراف بالكاربون فايبر وتم تسليم الطرف بتاريخ 27/1/2026			4	07740853362	نينوى-موصل-حي البكر	انسداد شرايين							f			فيسبوك		\N	\N		new
46	كريم عبد خلف 	65	90	170	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		5000000	2026-01-17 17:16:31.163899	2017-10-17	المريض يعاني من بتر فوق الركبة طوله متوسط حالته الحركية متوسطة يستخدم الرباعية بالمشي وكان لابس طرف لوك ني قديم جدا وردئ الصنع . تم شراء طرف لوكني قفل  بسعر 5 ملايين	طرف لوكني بدل هايدروليكي		1	07700263779	بغداد / البلديات 	القدم السكري 	البس امريكي 	38	شتل لوك 	متحركة سنكل 	26	هيدروليكي هوائي بايونك 	f					\N	\N		new
111	علي جمال حسين 	22	56	161	amputee	t	احادي - طرف سفلي - يمين - خلال الركبة 	f		5000000	2026-01-24 18:10:58.259378	2025-08-01		عرض تركي هوائي		5	07703369522	صلاح الدين / بيجي	ولادي مع عمليه متأخرة 			سوفت 	كاربوني	26	بايونك هوائي	f				\N	\N	\N	\N	\N
63	محمد عبد الرضا غالي حمد	35	70	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان 	80000	2026-01-18 18:41:40.754158	2018-01-06			علاج بالابر الصينية 	3	07828791667	ذي قار الناصرية الحبوبي	جهد وتعب مستمر بسبب العمل							f				\N	\N	\N	\N	\N
61	بنين عبد الله جبار عليوي	21	50	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	اختلاجات بالدماغ	20000	2026-01-18 15:48:51.919287	2022-06-08	الجلسة المفردة الاولى من الابر الصينية		ابر صينية 	3	07815317767	ذي قار الناصرية حي اور	عوامل نفسية وتوتر 							f				\N	\N	\N	\N	\N
59	جواد كاظم هادي 	50	87	186	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق في الفقرات 	50000	2026-01-18 13:52:52.674709	2022-12-02	الجلسة المفردة الاولى من برنامج الكلاسك مشترك 		علاج طبيعي 	3	078063733027	ذي قار الناصرية الشرقية 	بسبب الرياضة 							f				\N	\N	\N	\N	\N
53	محمد عبد العظيم عبد علي	27	72		physiotherapy	f	احادي - طرف سفلي - يمين	t	تبديل مفصل	200000	2026-01-18 07:37:55.716563	2026-09-01	تم دفع بكج لمدة 8 ايام على 25 الف حيث ان المريض جاء من قبل تحويل من طبيب وهذا النوع من المرضى نتعامل معهم بالاسعار القديمة 		علاج طبيعي	3	07813044061	اطراف الناصرية قرية حجي بصير محاذية للبصرة	تبديل مفصل							f				\N	\N	\N	\N	\N
57	علي ياسر حسين طاهر	36	72	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقربات القطنية L5 S1	35000	2026-01-18 11:11:01.96374	2023-07-17	مراجع سابق حيث راجع المركز في تاريخ 1/1/2026 يدفع يوميا على 35 الف جلسة فردية على الاسعار القديمة		علاج طبيعي 	3	07806277162	ذي قار الناصريه المنصوريه 	اصابه اثناء العمل 							f				\N	\N	\N	\N	\N
81	زينب كاظم هميم عامر	60	93	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق غضروفي في الفقرة الرابعة والخامسة وتضيق بالقناة الشوكية 	150000	2026-01-20 13:43:24.216425	2025-01-01	بكج 6 جلسات بسعر 25		علاج طبيعي 	3	07832013022	ذي قار  الناصرية حي التضحية	بسبب الجهد والتعب 							f				\N	\N	\N	\N	\N
107	سلام اسعد كاظم حيوك 	30	67	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق غضروفي حاد	300000	2026-01-24 15:38:55.249601	2025-05-06			علاج طبيعي 	3	07813846843	ذي قار الناصرية حي اور 	اصابة كرة قدم 							f				\N	\N	\N	\N	\N
56	 عجيبة مزهر محسن عبيد	70	72	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	250000	2026-01-18 10:34:27.030707	2025-03-08	تم الاتفاق مع المريضة على دفع بكج لمدة 10 ايام على 25 الف حيث اخذت جلسة اولى اليوم كونها لا تحمل المبلغ كامل على ان تكمل المبلغ غدا		علاج طبيعي	3	07818085325	الناصرية حي الحسين 	عدم الحركة بعد اجراء عملية تثبت للفقرات القطنية 							f				\N	\N	\N	\N	\N
74	امير حسين سرحان مالح	1	10		physiotherapy	f	احادي - طرف سفلي - يمين	t	خلع ولادي و ضعف بالعصب النسوي	225000	2026-01-19 16:01:35.518032	2024-12-07			تأهيل حركي 	3	07867935352	ذي قار ناصرية الاسكان الصناعي 	من الولادة 							f				\N	\N	\N	\N	\N
76	سهام محمود محمد 	72	59	160	amputee	t	احادي - طرف سفلي - يمين	f		1000000	2026-01-19 16:23:30.584807	2025-08-04	راجعت المركز بتاريخ 7-1-2025 وتم تحديد طرف بايونك عرض بسعر ٣ ملايين وتم اخذ قالب ودفع مبلغ مليونين وباقي مليون 	تحت الركبة بقدم كاربونيك بايونك (العرض)		1	07705329101	بغداد / العطيفية 	القدم السكري 	البس امريكي	26	قفل شتل لوك 	كاربونية فريدوم 	25	لايوجد	f					\N	\N		past
60	وعد علي كاظم 	35	59	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات القطنية 	385000	2026-01-18 14:07:39.158882	2019-02-09	الجلسة المفردة الاولى من برنامج الكلاسك مشترك 		علاج طبيعي	3		ذي قار الشطرة شارع دبي	الجلوس المستمر 							f			طبيب	\N	\N	\N	\N	\N
62	جمال كامل كشمر 	68	68	170	amputee	t	احادي - طرف سفلي - يسار	f		0	2026-01-18 16:16:18.826453	2025-07-16	راجع المركز بناريخ 22-11-2025 تم تحديد طرف لوك ني له بسعر ٤ ملايين و ٣٥٠ الف	ركبة مقفولة lucked knee		1	07800025256	واسط / العزيزية 	القدم السكري	البس امريكي 	32	شتل لوك 	متحركة سنكل 	26	ميكانيكي مقفول 	f					\N	\N		past
70	سعد خلف حسين 	38	95	180	amputee	t	اطراف سليكونية تعويضية - كف - يسار	f		0	2026-01-19 12:24:25.538832	2018-11-11	مراجع سابق / وزارة الداخلية			2	07812268799	بغداد	حرب / وزارة الداخلية 							f					\N	\N		past
54	سعد عباس فاضل	31	90	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-01-18 09:48:43.760393	2025-05-10	مراجع جديد تم عرض اطراف صناعية هايدروليكية وهوائية 			2	07819767877	بابل	انسداد الشرايين							f			فيسبوك		\N	\N		new
78	زينب فلاح صبار جليب	15	46	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	تقوس العمود الفقري 	75000	2026-01-20 08:12:01.417328	2025-11-01	حضرت المريضه للاستشاره عند دكتور عبد الله خان بتاريخ 20/1/2026 وبدات الجلسة مباشرتا بعد الاستشارة 		علاج الطبيعي	3	07843418698	ذي قار الناصريه الاسكان 	حمل اغراض ثقيله 							f				\N	\N	\N	\N	\N
73	محمد صالح بلط 	41	92	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	رباط صليبي وانحراف بالعظم 	120000	2026-01-19 14:08:07.469814	2008-01-07	بكج كلاسك 		علاج طبيعي 	3	07830543020	ذي قار بطحاء 	بسبب الرياضة 							f				\N	\N	\N	\N	\N
82	حمدية شاكر خضير كزار 	53	75	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة سببت شلل ونزف بالدماغ 	25000	2026-01-20 14:51:40.173071	2023-02-03	جلسة مفردة بسعر 25 الف 		تأهيل حركي 	3	07831982599	ذي قار الناصرية سومر 	بسبب سقوط وخلل في العملية 							f				\N	\N	\N	\N	\N
86	نهى يوسف جاسم مظلوم	58	72	167	physiotherapy	f	احادي - طرف سفلي - يمين	t	عرج النسه	25000	2026-01-21 13:05:08.067514	2025-11-02	حضرت المريضه للاستشاره عند دكتور عبد الله بتاريخ 21/1/2025 وبدات بعد الاستشاره مباشرتا مع الشفت المسائي بسبب الوقت 		علاج الطبيعي	3	07838579001	ذي قار الناصريه حي المتنزه	انزلاق الفقرات 							f				\N	\N	\N	\N	\N
87	مهند محمد ماجد درعان	48	75	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	الام في الرقبة والاكتاف 	25000	2026-01-21 13:10:22.881486	2025-11-01	حضر المريض للاستشاره بتاريخ 21/1/2025 وباشر بعد الاستشاره مباشرتا 		علاج طبيعي 	3	07801208612	ذي قار الشطره 	بسبب العمل 							f				\N	\N	\N	\N	\N
92	حميدة جاسم محمد علي	45	٩٠	١٧٠	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات القطنية	150000	2026-01-22 18:49:49.291156	2026-01-22			علاج طبيعي	3	07824267539	ذي قار ناصرية قرب مستشفى التركي	تعب شديد وجهد 							f				\N	\N	\N	\N	\N
95	عدنان بدري حسين جبر	55	80	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	الام الظهر	200000	2026-01-24 06:01:21.661981	2025-11-01	حضر المريض للاستشاره بتاريخ 22/1/2026 عند دكتور عبد الله وباشر  بتاريخ 24/1/2026		علاج طبيعي 	3	07816100016	ذي قار الناصريه حي اور	العمر							f				\N	\N	\N	\N	\N
79	محمد كريم سرحان كزار	58	85	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية + الام الظهر 	400000	2026-01-20 08:29:22.056137	\N	دأ المريض العلاج مع د. عبد الله خان بتاريخ 04/01/2026، ومع تحسن حالته تم تقليل الجلسات إلى جلستين اسبوعيا		علاج الطبيعي	3	07801128766	ذي قار الناصريه حي اور 	عمل 							f				\N	\N	\N	\N	\N
98	يقين رياض مصري 	13	50	150	medical_support	f	احادي - طرف سفلي - يمين	f		4500000	2026-01-24 08:11:24.835272	\N				2	07826096501	بابل	ولادي 							t	طرف مسندي 	يسار 			\N	\N		new
88	محمد خليل اسماعيل	58	97	186	amputee	t	احادي - طرف سفلي - يمين	f		0	2026-01-21 15:39:29.743235	2025-12-05	تم المعاينة من قبل استاذ سيف وتم عرض طرف فوق الركبة بمفصل ثابت للمريض ونال استحسانه ولكن بتره لم يلتأم بشكل وسوف يراجعنا بعد شفاء بتره بالكامل لتليمه طريقة لف الباندج بطريقة صحيحة			4	077041866540	نينوى-موصل حي الحدباء	داء السكر							f			فيسبوك		\N	\N		new
66	رواء رزاق عبد 	19	65	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-01-19 09:57:53.750133	2014-12-01	مراجع سابق / لديها كتاب تخفيض وتم عرض اطراف لها 			2	07811965705	بابل	حادث سيارة 							f			فيسبوك		\N	\N		past
84	فاطمة عبد الحسين كاظم حسون 	40	66	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات العنقية وشد بالعضلات	100000	2026-01-20 18:04:30.769829	2023-12-05	المريضة قديمة ومستمرة بدفع جلسات كلاسك مفرد بسعر 20 الف		علاج طبيعي 	3	07800091715	ذي قار الناصرية الشرقية 	تعب شديد بسبب العمل 							f								
80	جاسم علي عبد الحسين 	30	90	180	amputee	t	اطراف سليكونية تعويضية - كف - يسار	f		0	2026-01-20 09:06:00.673608	2022-11-11				2	07831792979	كربلاء 	حادث سيارة 							f			فيسبوك		\N	\N		new
77	الاء كعكوش جبار محيسن	33	80	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنيه 	100000	2026-01-20 06:43:05.478326	2025-04-01	حضرت المريضه للاستشاره عند دكتور عبد الله خان بتاريخ 19/1/2026 وبدات الجلسة  الاولى لها بتاريخ 20/1/2026 ضمن بكج 9 جلسات (بالاضافة الى الجلسة المجانية) \n		علاج طبيعي	3	07810780956	ذي قار الناصريه شارع 30 	بسبب كسر بالفقره 							f								
93	علي سعدي كاظم	23	105	178	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق غضروفي	60000	2026-01-22 18:55:20.529547	2024-10-15			علاج طبيعي	3	07806660163	ذي قار الناصرية شارع النهر	تعب العمل							f				\N	\N	\N	\N	\N
85	علي ستار خليف 	22	80	185	amputee	t	اطراف سليكونية تعويضية - كف - يمين	f		0	2026-01-21 12:42:31.178871	2006-11-11	مراجع جديد ولديه كتاب تخفيض			2	07838410435	بابل 	حادث سير							f			فيسبوك		\N	\N		new
71	ياسر احمد محسن 	30	100	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-01-19 12:36:24.382955	2003-11-01	مراجع سابق /تجميل للطرف 	باسف 		2	07821624430	بابل 	حادث سيارة 	البس	24	فاكيوم	كاربون 	27R		f			فيسبوك		\N	\N		past
94	احمد قاسم خضير زرار	21	98	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	شد عضلي	20000	2026-01-22 19:05:11.155879	2025-01-30			علاج طبيعي	3	07806996889	ذي قار الناصرية الادارة المحلية	الرياضة							f				\N	\N	\N	\N	\N
97	وئام مهدي احمد نعمه 	40	69	173	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق فقرات الرقبه 	125000	2026-01-24 07:48:46.658724	2012-07-01	حضر المريض للاستشاره عند دكتور بيرام باغش بتاريخ 22/1/2026 وباشر اليوم بتاريخ 24/1/2026 جلسات العلاج الطبيعي مع دكتور عبد الله 		علاج طبيعي 	3	07829737080	ذي قار الناصريه حي العسكري 	كثرة العمل والطباعه 							f				\N	\N	\N	\N	\N
96	شمس الضحى حيدر علي كاظم 	8	48	130	physiotherapy	f	احادي - طرف سفلي - يمين	t	انحراف الحوض 	250000	2026-01-24 06:55:40.793416	0005-08-08	حضرت المريضه للاستشاره عند دكتور عبد الله قبل اسبوع وبدات بتاريخ 24/1/2026		علاج طبيعي	3	07823812582	ذي قار الناصريه الاسكان الصناعي 	ولادي 							f				\N	\N	\N	\N	\N
103	اكرم رياض عبد الحسن 	40	80	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	125000	2026-01-24 13:08:57.105018	2025-12-01			علاج طبيعي 	3	07800585966	ذي قار الناصرية الفضلية 	حركة خطأ وتعب شديد							f				\N	\N	\N	\N	\N
106	حكيمة جابر عصيد 	60	75	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة سببت شلل ونزف بالدماغ 	175000	2026-01-24 13:46:36.48747	2025-01-12			تأهيل حركي 	3	07807808492	ذي قار الناصرية حي اور 	مشكلة في المنزل 							f				\N	\N	\N	\N	\N
117	محسن احمد محيسن عبد الله	7	26	63	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضمور بالدماغ	0	2026-01-26 07:31:44.377775	2019-06-03			تأهيل حركي 	3	07745907600	الناصرية الصالحية قرب جامع صاحب الزمان	ضمور ولادي							f				\N	\N	\N	\N	\N
118	 صادق عبد الحسين عويد محمد	75	78	167	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق غضروفي 	150000	2026-01-26 08:08:37.77822	2015-05-09	المريض مراجع سابق لمركزنا بتاريخ 23\\10 		علاج طبيعي 	3	07801834521	الناصرية الشموخ 2	انزلاق غضروفي مع سقوط بالقدم							f				\N	\N	\N	\N	\N
124	 سحاب سعد صوجر حسن	32	80	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	25000	2026-01-26 11:12:35.404947	\N	مريضة محولة من الطبيب التركي بيرم		علاج طبيعي 	3	07831255397	ذي قار الناصرية القرية العصرية	انزلاق الفقرات							f				\N	\N	\N	\N	\N
64	فاطمة شعلان حمود كون	9	43	120	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضمور بالدماغ	625000	2026-01-19 08:16:02.09355	2017-05-04	المريضة قديمة ومستمرة حيث بلغت جلساتها مع جلسة اليوم 80 جلسة مفردة بقيمة 25 الف		علاج الطبيعي مكثف ومستمر	3	07811510120	الناصرية حي الشهداء	ضمور بالدماغ							f				\N	\N	\N	\N	\N
90	سجاد يونس علي 	22	70	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		750000	2026-01-22 07:40:16.77666	2025-07-02	مراجع سابق/تم شراء طرف بقيمة  14750000 والمتبقي بذمته 750000	ميركوري 		2	07702928132	بغداد 	كانسر 	البس شتل لوك 	34		سنكل 	27R	ميركوري 	f			فيسبوك		\N	\N		past
91	محمد علي عباس 	60	100	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-01-22 08:23:36.083893	2024-11-11	مراجع جديد /مجاني يحتاج الى علاج طبيعي 			2	07732511597	بغداد 	قدم سكري 							f			فيسبوك		\N	\N		new
99	نجم عبد الله عباس 	44	90	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-01-24 08:17:59.528164	2022-11-11	مراجع سابق /صيانة للقالب  	شتل لوك 		2	07706096348	الكوت 	قدم سكري 	سوفت 		دكم	سنكل 		لايوجد 	f			فيسبوك		\N	\N		past
112	حسن علاء عباس 	32	90	195	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين	f		0	2026-01-25 09:23:31.559002	2025-12-01	مراجع جديد /فحص جديد 			2	07814163320	كربلاء 	حادث عمل 							f			فيسبوك		\N	\N		new
114	عباس رياض كامل 	23	80	185	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-01-25 09:47:51.214582	2010-01-01	مراجع سابق /مجاني /تم استلام قالب 	3r78		2	07851317450	ذي قار 	كهرباء 	حلقي 	38	دكم 	سنكل 	26	3r78	f			فيسبوك		\N	\N		past
115	عبد المحسن علوان شعبان 	65	90	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		3500000	2026-01-25 10:10:04.661386	2025-07-13	مراجع جديد / تم شراء طرف وتم اخذ قالب 	شتل لوك مع قدم كاربونية 		2	07801217149	بصرة 	قدم سكري 	البس امريكي 	26		كاربون 	27R	لايوجد 	f			فيسبوك		\N	\N		new
116	محمد وزة متعب 	37	85	185	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-01-25 12:04:08.753098	2024-09-15	مراجع جديد /فحص ومعاينة 			2	07733719460	بابل 	حادث سير							f			فيسبوك		\N	\N		new
119	جواد كاظم ماضي 	30	140	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		7000000	2026-01-26 08:24:49.027054	2023-11-01	مراجع سابق / تم شراء طرف /تم اخذ قالب 	طرف فوق الركبة تركي عرض بايونك 		2	07703109665	بصرة 	اطلاق ناري 	حلقي 	50	كاربون 	متحركة سنكل 	28r	بايونك	f			فيسبوك		\N	\N		new
101	خنساء غازي طاهر 	46	95	160	medical_support	f	احادي - طرف سفلي - يمين	f		4000000	2026-01-24 11:33:02.819293	2025-11-11	مراجع جديد /تم شراء مساند 			2		كربلاء 	مرض							t	مساند كاربونية 	كلا الجانبين 			\N	\N		new
120	مهدي لفتة سلمان 	58	120	150	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		3000000	2026-01-26 08:45:08.00667	1987-11-01	مراجع سابق / تم تبديل له قدم سنكل بدل القدم الكاربونية وتم صيانة سوفت 	طرف شتل لوك 		2	07714861793	الكوت 	لغم 	البس 		دكم 	سنكل 	28	لايوجد 	f			فيسبوك		\N	\N		new
100	جنان عبد الزهرة محمد	52	75	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		900000	2026-01-24 08:56:47.703009	2020-02-01	مراجع سابق / تم شراء سلكون 	باسف فاكيوم 		2	07800535659	كربلاء 	قدم سكري 	البس 	28		متحركة 	26		f			فيسبوك		\N	\N		new
122	 حكيمه خير الله علي غلام	51	85	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	25000	2026-01-26 09:44:23.006495	2025-11-05	مريضة جاءت الى د.بيرم حيث تلقت العلاج بالحقن بين الفقرات ومن ثم تحولت من خلاله اللى العلاج الطبيعي		علاج طبيعي 	3	 07825087743		انزلاق الفقرات							f				\N	\N	\N	\N	\N
102	امنه كاظم يونس عليخ	60	77	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	100000	2026-01-24 13:07:19.773937	2023-04-06			علاج طبيعي 	3	07831088746	ذي قار الناصرية الفضلية 	حركة خطأ وتعب شديد							f				\N	\N	\N	\N	\N
125	 صفاء كاظم جبار حسن	54	86	171	physiotherapy	f	احادي - طرف سفلي - يمين	t	تبديل مفصل 	250000	2026-01-26 11:57:10.550954	2026-01-02	راجعتنا بتاريخ 10\\1 لغرض اخذ جلسات علاج طبيعي بعدما اكملت عملية تبديل المفصل من قبل د. محمود شهاب ورقدت في المستشفى لمدة 4 ايام لغرض جلسات العلاج طبيعي		علاج الطبيعي	3	07852750158	الناصرية الزاوية قرب مفوضية الانتخابات	تبديل مفصل 							f				\N	\N	\N	\N	\N
130	محمد راشد حسن فارس	41	85	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	ماء والتهاب في الاعصاب 	200000	2026-01-26 14:06:01.359424	2025-01-07			علاج طبيعي 	3	07889624970	ذي قار -الناصرية-شارع المحطة 	حادث سقوط على بسمار 							f				\N	\N	\N	\N	\N
178	علي حسن كاظم علوان	55	67	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل تام للجسم	0	2026-01-31 16:07:34.971478	2026-10-01			علاج طبيعي مكثف	3		الناصرية حي الفداء	جلطة دماغية							f				\N	\N	\N	\N	\N
138	علي صبار لطيف عطية 	30	70	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق غضروفي في الفقرات القطنية 	0	2026-01-26 17:19:32.006472	2015-01-06	استشارة اولية		علاج طبيعي 	3	07840019955	ذي قار الناصرية شارع 20	تعب شديد بسبب العمل 							f				\N	\N	\N	\N	\N
126	هاشم غبش بندر هويدي	84	100	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	150000	2026-01-26 12:39:10.074867	2025-12-05			علاج طبيعي 	3	078028130551	الناصرية قضاء الشطرة	جلطة دماغية 							f				\N	\N	\N	\N	\N
135	نسرين  مهدي فيصل علي 	43	118	164	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات العنقية 	70000	2026-01-26 15:44:18.037042	2022-05-04			علاج طبيعي	3	07817613538	ذي قار الناصرية قرب المدينة المائية 	حادث 							f				\N	\N	\N	\N	\N
128	افراح جهيد خضر 	37	65	170	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-01-26 12:49:12.676029	2025-12-01	مراجع سابق /صيانة اشرطة 			2		ذي قار 	التهاب الحبل الشوكي شلل الاطراف 							t	مساند عدد 2	كلا الجانبين 			\N	\N		past
129	انور بندر سيف منصور	75	105	169	physiotherapy	f	احادي - طرف سفلي - يمين	t	خلل في الاعصاب والعضلات 	150000	2026-01-26 13:22:04.469088	2022-04-03	استشارة اولية		تاهيل حركي 	3	07802778177	ذي قار الناصرية حي الامن الداخلي 	3 جلطات بالدماغ							f				\N	\N	\N	\N	\N
121	علي نعمه خافور ديبس 	60	85	174	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة دماغية	450000	2026-01-26 09:01:59.538963	2023-07-15	استشارة اولية		علاج طبيعي 	3	07812008886	الناصرية حي اريدو 	جلطة دماغية							f				\N	\N	\N	\N	\N
127	عمر رعد علي 	47	95	185	physiotherapy	f	احادي - طرف سفلي - يمين	t	تهشم الركبة 	0	2026-01-26 12:42:19.855871	2003-02-01	مراجع جديد /تم تحويله الى مركز اختصاص مفاصل 			2	07723995710	بغداد	معركة داعش							f								new
123	محمد قاسم محل عوده	56	86	172	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة دماغية	0	2026-01-26 10:54:17.297473	2023-06-11	راجعنا المريض بتاريخ 12\\1 اخذ استشارة مع المباشرة حينها تحت اشراف المعالج عبد الله خان		علاج طبيعي	3	07801186064	ذي قار الناصريه قضاء الرفاعي	جلطة دماغية 							f				\N	\N	\N	\N	\N
144	زينب مهدي فيصل	25	140	160	physiotherapy	f	احادي - طرف سفلي - يمين	t		25000	2026-01-26 20:47:33.046314	\N				3	07849835901	الناصرية حي اور								f				\N	\N	\N	\N	\N
139	عبد الهادي رشغ مراح جابر	53	90	176	physiotherapy	f	احادي - طرف سفلي - يمين	t	تضرر وتمزق طولي في الغضاريف وسوفان من الدرجة الثانية في الركبة اليسار 	50000	2026-01-26 18:13:49.301433	2013-01-09			تاهيل حركي 	3	07803631433	ذي قار الناصرية الادارة المحلية 	سقوط اثناء الرياضة 							f				\N	\N	\N	\N	\N
136	زينب مهدي فيصل علي 	25	140	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	نتوء بالقدمين	50000	2026-01-26 15:52:28.232187	2024-09-04			علاج طبيعي 	3	07849835901	ذي قار الناصرية حي اور 	جهد وتعب مستمر بسبب العمل							f				\N	\N	\N	\N	\N
137	رتبة بدر حيدر عريبش 	50	55	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	تليف في عضلات الكتف وزادت حدته بعد حادث حصل مع المريضة 	190000	2026-01-26 16:19:33.141469	2020-01-03	جلسة ابر صينية 		علاج طبيعي	3	07810069198	ذي قار البطحاء 	حادث 							f				\N	\N	\N	\N	\N
150	ليلى داغر مسير عبيد	56	75	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضمور الاعصاب 	0	2026-01-27 08:50:16.022329	2024-01-01	جاء المريض للاستشارة عند الدكتور عبد الله خان بتاريخ 27/1/2026، وتم أخذ رقم هاتفه لتحديد موعد خاص له ليحضر على أساسه.		علاج طبيعي 	3	07826506872	ذي قار البطحه	حاله عصبية 							f				\N	\N	\N	\N	\N
151	كيان عدنان ناصر سلمان 	10	24	120	physiotherapy	f	احادي - طرف سفلي - يمين	t	صرع / ضمور الدماغ 	0	2026-01-27 09:06:44.21405	2016-07-12	جاء المريض للاستشارة عند الدكتور عبد الله خان بتاريخ 22/1/2026، وقد تكفّل الدكتور ياسر بكامل تكاليف علاجه داخل المركز. وباشر المريض اليوم، بتاريخ 27/1/2026، أول جلسة له بعد تحديد مواعيد جلساته.		علاج طبيعي 	3	07816507027	ذي قار سوق الشيوخ كرمة بني سعيد 	ولادي 							f				\N	\N	\N	\N	\N
152	وليد حميد كريم حسن	65	90	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي	0	2026-01-27 11:24:23.368353	2024-07-22	راجعنا المريض بتاريخ 11\\1 وباشر معنا بتاريخ 13\\1 تحت اشراف المعالج عبد الله خان حيث دفع المريض بكج لعشر جلسات بقيمة 250 الف		علاج طبيعي	3	07830909780	ذي قار الناصريه الشهداء	جلطة دماغية							f				\N	\N	\N	\N	\N
161	مهدي نعمه محمد جبر	31	62	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضرر في الحبل الشوكي وكسر في الفقرات 	250000	2026-01-28 11:42:06.899389	2025-02-04	راجع المريض الدكتور عبد الله للاستشارة بتاريخ 5/10/2025، وتمت مباشرة الجلسات العلاجية بعد تحديد الخطة العلاجية من قبل المعالج عبد الله خان. ولا يزال المريض مستمرًا في الجلسات العلاجية المخصصة له، حيث إن هذه الجلسة تُعد الجلسة الأولى من البكج الخامس.		تاهيل حركي 	3	07819886570	ذي قار الناصرية الموحية 	حادث سقوط من مكان عالي 							f				\N	\N	\N	\N	\N
159	مبجل انمار عبد كريم	19	71	177	physiotherapy	f	احادي - طرف سفلي - يمين	t	عملية ربط اوتار	125000	2026-01-28 07:38:23.956816	2025-11-05	راجعنا اليوم لاول مرة كون المريض يسكن في بريطانيا لكن سمع من اقاربه هنا ان هناك مركز للعلاج الطبيعي يمتلك اجهزة حديثة		علاج طبيعي 	3	07866555105	الناصرية الشموخ	قطع بالاوتار 							f				\N	\N	\N	\N	\N
155	طالب داخل ناهي مزعل 	52	85	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات القطنية  	150000	2026-01-27 13:33:18.705048	2019-01-12			علاج طبيعي	3	07807565810	ذي قار الناصرية سومر 	جهد وتعب مستمر بسبب العمل							f				\N	\N	\N	\N	\N
162	فضيلة عباس صالح شلتاغ	83	95	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	تلف في الاعصاب 	25000	2026-01-28 14:51:19.100315	2026-12-01			تأهيل حركي 	3	07807127012	ذي قار الناصرية حي اريدو 	ارتفاع ثنائي اوكسيد الكاربون 							f				\N	\N	\N	\N	\N
164	حيدر زامل عبد الحسين طعمة 	24	60	185	physiotherapy	f	احادي - طرف سفلي - يمين	t	خلل في العصب السابع 	150000	2026-01-28 17:37:17.879267	2020-04-12			تأهيل حركي 	3	07814804382	ذي قار الناصرية مدينة الصدر 	بسبب مضاعفات نفسية 							f				\N	\N	\N	\N	\N
154	هدير علي محمد 	24	98	168	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		1000000	2026-01-27 13:16:29.275403	2024-06-29	مراجع سابق/تم شراء طرف سابقا بتاريخ 18/8/2025بمبلغ 14000000ذ/ والنتبقي بذمتها 1000000 ( من ممثلية العتبة ) / وتم عمل صيانة اظافة سوفت للقالب 	ميركوري 		2	07801078474	بصرة 	كانسر 	اوسور 	50	كاربون 	اسبرت 	26	ميركوري 	f			فيسبوك		\N	\N		past
158	حيدر علي صكبان شبيب	47	75	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة بالدماغ وانسداد بالشريان الوسطي 	400000	2026-01-27 14:16:33.171477	2026-05-01			علاج طبيعي	3	07810208011	ذي قار الناصرية التضحية 	جهد وتعب مستمر بسبب العمل							f				\N	\N	\N	\N	\N
147	حياة عجيل مطلك خضير	63	80	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل الاطراف السفبية 	250000	2026-01-27 05:47:24.890673	2025-12-03	مريضة قديمة حضر للاستشارة عند دكتور عبد الله خان بتاريخ 5/1/2026، وبدأ العلاج ضمن باقة مكوّنة من 10 جلسات بتاريخ 7/1/2025 بعد سداد قيمة الباقة. ولا يزال مستمرًا بالعلاج، حيث إن جلسة اليوم هي الجلسة التاسعة من أصل عشر جلسات.		علاج طبيعي	3	07830194193	ذي قار سيد دخيل 	عملية رفع انزلاق 							f					اصابة حبل شوكي		[{"type":"اصابة حبل شوكي","area":"","side":""}]	\N
163	رائد محمد احمد 	37	75	172	amputee	t	احادي - طرف سفلي - يمين	f		0	2026-01-28 16:46:16.131386	2017-07-15	تم تبديل قالب فقط للمريض بتاريخ 26/7/2025 مع شراء شتل لوك بنظام القساط بالاتفاق مع استاذ عمر وباقي المبلغ 400000 دينار فقط	شتل لوك		4	07518445986	نينوى-موصل-وادي حجر	عملية ارهابية							f			فيسبوك		\N	\N		past
156	ايناس غازي غالي عيسى 	47	85	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات العنقية والقطنية 	115000	2026-01-27 14:08:44.694287	2012-01-08	ابرة صينية 		علاج طبيعي	3	07805038590	ذي قار الناصرية حي اور 	حادث سيارة 							f				\N	\N	\N	\N	\N
131	مصرية طاهر جبر ناصر 	55	77	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضغط على الحبل الشوكي في الفقرات العنقية 	400000	2026-01-26 14:13:52.525632	2022-01-08			تاهيل حركي 	3	07823176787	ذي قار الناصرية الاصلاح 	حادث سيارة 							f				\N	\N	\N	\N	\N
160	علي احمد علي جعفر 	9	50	150	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-01-28 08:02:28.21312	\N	مراجع جديد / فحص ومعاينة 			2		كربلاء 	ولادي 							t		كلا الجانبين 			\N	\N		new
168	محمد علي عبد الحسن عبد 	31	88	179	physiotherapy	f	احادي - طرف سفلي - يمين	t	الم الركبة 	0	2026-01-29 09:23:21.617496	2025-09-01	جاء المريض للاستشارة عند الدكتور عبد الله خان بتاريخ اليوم وتم اراسله لوحدة الرنين والاشعه لغرض دقة التشخيص مع الرنين 			3	07819452094	ذي قار الناصريه حي اور	حركه خاطئه 							f				\N	\N	\N	\N	\N
169	سيف محمد كريم سعدون	32	90	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	0	2026-01-29 12:05:58.979189	\N			علاج الطبيعي	3	07837997485	ذي قار ناحية الفهود	انزلاق الفقرات							f				\N	\N	\N	\N	\N
170	سيف محمد كريم سعدون 	32	90	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات	0	2026-01-29 12:10:51.6995	2026-08-01	جاء اليوم لغرض الاستشارة على المعالج عبد الخان بسبب الم بالفقرات علما ان المريض اجراءه عملية لتبديل الغضروف ب2015		علاج الطبيعي	3	07837997485	ذي قار ناحية الفهود	بسبب السفر الطويل ولساعات 							f				\N	\N	\N	\N	\N
171	هدى حسين داخل عفيت 	29	70	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية وانحراف بالعمود الفقري	25000	2026-01-29 14:52:44.713472	2024-01-03			علاج طبيعي 	3	07855668712	ذي قار الناصرية حي المتنزه 	حركة خطأ وحمل وزن  ثقل 							f				\N	\N	\N	\N	\N
176	حسين طارق منصور 	15	50	162	medical_support	f	احادي - طرف سفلي - يمين	f		300000	2026-01-31 13:14:26.672574	2011-03-31				5	07723289315	كركوك/ الاسرة المفقودين /مدرسة المعراج للبنين	ولادي							t	مساند ليلية بلاستك	الجهتين		\N	\N	\N	\N	\N
177	حسنة عامر هاشم موازي	49	85	173	physiotherapy	f	احادي - طرف سفلي - يمين	t	عملية تثبيت فقرات 	0	2026-01-31 14:04:49.334901	2025-12-20	مريضة د.حسن ناجي جلسات مجانية سبق وان اخذنا موافقة دكتور ياسر		علاج طبيعي	3	07839223208	الناصرية حي الزهراء	سقوط على على الظهر							f				\N	\N	\N	\N	\N
180	علي حسن كاظم علوان	55	79	169	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل كامل للحركة والنطق	0	2026-01-31 17:42:55.035396	2026-10-01	مريض راقد في الطابق الرابع على د.علي رشيد تعرض الى جلطة حادة 		علاج طبيعي مكثف	3	07827519989	الناصرية حي الفداء 	جلطة دماغية 							f				\N	\N	\N	\N	\N
175	حسن نور كريم 	46	85	185	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-01-31 09:52:38.554269	2025-12-31	مراجع جديد/فحص ومعاينة			2	07730463159	نجف 	كانسر							f			فيسبوك		\N	\N		new
153	طوعه هاشم فاضل ملوح	33	60	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	تشوهات خلقية للاطراف السفلية 	750000	2026-01-27 11:47:43.965983	1993-03-23	حضرت المريضة للاستشارة بتاريخ 19/10/2025 تقريبًا لدى الدكتور عبد الله، وباشرت العلاج بتاريخ 26/10/2025، ولا تزال مستمرة بالجلسات حتى تاريخ اليوم. ويصادف اليوم جلستها السادسة والأخيرة من هذه الباقة (الباقة الرابعة).		علاج طبيعي	3	07742104357	ذي قار الفهود 	تشوه خلايا الدم ولادي							f				\N	\N	\N	\N	\N
22	ضرغام كاظم بليحس 	28	100	180	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1400000	2026-01-14 07:37:00.793958	2025-11-10	مراجع سابق /شراء قالب كاربون بنصف السعر مع سلكون البس قياس 28برغي /مهندس محمد 	اسبرت 		2	07726508875	الكوت 	حادث سير	البس شتل لوك 	28	شتل لوك 	اسبرت بريطاني	27R	لايوجد 	f			فيسبوك		\N	\N		past
166	سناء فليح جكجوك	44	65	170	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-01-29 07:45:46.429271	2011-11-11	مراجع سابق /تم شراء طرف سابقابتاريخ 18/12/2025بمبلغ 3500000د /تم لبس الطرف والتدريب عليه	طرف ثابت 		2	07805579449	كربلاء 	حادث سير	بروتد 		دكم	سنكل 		ثابتة	f			فيسبوك		\N	\N		past
167	ايات احمد علي	14	55	150	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		2000000	2026-01-29 08:52:01.521967	2011-11-01	مراجع سابق /تم اخذ قالب 	سايمز		2	07804456371	نجف 	ولادي 	سوفت 		كاربون 	سنكل 	20	لايوجد 	f			فيسبوك		\N	\N		past
173	مهند محمد ماجد درعان	48	68	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات الثالثه والرابعه والخامسة والسادسة + انجماد بمفصل الكتف 	75000	2026-01-31 08:44:19.543239	2025-11-10	حضر المريض للاستشارة عند الدكتور عبد الله خان بتاريخ 21/1/2026 وبدا الجلسة الاولى بعد الاستشارة مباشرتا..... وحكضر اليوم بتاريخ 31/1/2026 للجلسة الثانية 		علاج طبيعي 	3	07801208612	ذي قار الشطره المشتل 	كثرة العمل والانحلاء وحل ثقل عالي 							f				\N	\N	\N	\N	\N
165	مثنى عبد الامير كاظم جاهل 	35	80	179	physiotherapy	f	احادي - طرف سفلي - يمين	t	قطع الاوتار وعدم توزن وضعف الحركة 	425000	2026-01-29 07:34:49.894419	2025-09-01	حضرت المريضة للاستشارة بتاريخ 28/1/2026 وباشرت العلاج مباشرتا بعد الاستشارة 		علاج طبيعي 	3	07807749773	ذي قار الشطره حي المعلمين 	صعقة تيار كهربائي الضغط العالي							f				\N	\N	\N	\N	\N
174	حسين يوسف عبد الحسين	29	75	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-01-31 09:43:57.415982	2024-08-22	مراجع سابق/تم عمل له صيانة للطرف علما انه تم شراء طرف سابقا بتاريخ 4/3/2025 بكلفة 3000000د	قدم بايونك مع شتل لوك 		2	07831334619	بابل 	كوسرة	البس		دكم	كاربون 		لايوجد 	f			فيسبوك		\N	\N		past
187	غند حاتم مشاري الاسدي	88	70	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	0	2026-02-01 12:43:11.032905	2026-01-27	استشارة علاجية 		علاج طبيعي 	3	07810205534	ذي قار الناصرية حي اور	جلطة دماغية 							f				\N	\N	\N	\N	\N
186	علي حسن كاظم علوان	56	70	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	0	2026-02-01 12:34:35.412643	2026-01-27	استشارة علاجية 		علاج طبيعي 	3	07827497743	ذي قار الناصرية حي الفداء	جلطة دماغية 							f				\N	\N	\N	\N	\N
183	نورية كاظم كعيد شاتي 	70	60	165	amputee	t	احادي - طرف سفلي - يمين - بتر تحت الركبة 	f		0	2026-02-01 09:16:07.557605	2025-09-01	مراجعة من طرف حميد الاعرج			3	07803369278	ذي قار قضاء النصر 	قدم سكري 							f	طرف اسفل الركبة 	يمين 		\N	\N	\N	\N	\N
190	زينب عمار طالب مونس	2	10	50	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضمور في العضلات 	150000	2026-02-01 13:54:42.794898	2023-01-07			تأهيل حركي 	3	07817058355	ذي قار الناصرية الاسكان الصناعي 	من الولادة 							f				\N	\N	\N	\N	\N
191	زينب فائق جعفر عبد الحسين 	28	67	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	ICH 	125000	2026-02-01 14:27:18.765701	2025-08-08	المريضة كانت تراجع منذ افتتاح المركز		تأهيل حركي 	3	07812844855	ذي قار الناصرية الشطرة 								f				\N	\N	\N	\N	\N
192	زينب اسامة مالك فياض 	20	56	150	physiotherapy	f	احادي - طرف سفلي - يمين	t	فتحه في الغضروف و	0	2026-02-01 14:34:13.406774	2024-02-06			تأهيل حركي 	3	07836177563	ذي قار كرمة بني سعيد 	ورم في القدم اليمنى							f				\N	\N	\N	\N	\N
157	اخلاص غازي غالي عيسى 	45	82	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات العنقية والقطنية وتليف بالعضلات ( وهن العضل اللليفي )	125000	2026-01-27 14:11:12.672874	\N			علاج طبيعي	3	07829798082	ذي قار الناصرية حي اور 	نقص فيتامين D3 جهد وتعب مستمر بسبب العمل 							f				\N	\N	\N	\N	\N
188	ايات غني جاسم محمد 	31	75	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل كامل فقدت خلاله النطق والحركة تماما	650000	2026-02-01 13:36:03.052523	2024-07-05			علاج طبيعي 	3	07821382366	ذي قار قضاء الرفاعي	نقص تروية للدماغ							f				\N	\N	\N	\N	\N
185	كرار حيدر باقر 	30	85	185	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		3000000	2026-02-01 12:07:42.651603	2022-01-01	مراجع جديد	طرف ثابت فوق الركبة 		2		صلاح الدين 	قدم سكري 	حلقي 	40	دكم 	قدم ثابتة 	27R	ثابتة	f			فيسبوك		\N	\N		new
184	بتول حامد محسن 	21	75	175	amputee	t	اطراف سليكونية تعويضية - كف - يمين	f		1500000	2026-02-01 11:11:33.426796	2005-01-01				2	07721703622	كربلاء 	ولادي 							f			فيسبوك		\N	\N		new
189	هظيمة لفتة خليف ناصر	56	84	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	انجماد بالمفصل	275000	2026-02-01 13:46:45.13233	2025-11-04	تحويل من دكتور حسن ناجي 		علاج طبيعي	3	07819882428	الناصرية حي الامير	سقوط على ارضية (انزلاق على سيراميك)							f				\N	\N	\N	\N	\N
195	هناء محمود جرجيس	58	67	160	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-01 17:05:37.529645	1990-07-15	تمت المعاينة من قبل استاذ سيف تم عرض مسند سايد بار  بمبلغ مليونين دينار عراقي لان المسند القديم يحتوي على اخطاء تسبب للمريضة الام في الظهر			4	07740899151	نينوى-موصل-حي فلسطين	شلل اطفال مع حادث سير							t		يمين	فيسبوك		\N	\N		new
181	تكتم هاني قاسم حمدان	5	32	100	physiotherapy	f	احادي - طرف سفلي - يمين	t	التهاب الحبل الشوكي 	250000	2026-02-01 06:20:22.801614	2025-06-20	المريضة كانت مستمرة معنا وبشكل مستمر لكن تعرضت الى كسر حينها اتصلت بنا والدة الطفلة وابلغتنا بالحادث وطلبت انذاك تاجيل ما تبقى من جلساتها الى حين شفاء الطفلة.		علاج طبيعي 	3	07827791577	ذي قار قضاء النصر 	بدون سبب 							f			فيسبوك		التهاب حبل شوكي		[{"type":"التهاب حبل شوكي","area":"","side":""}]	\N
194	سجى رزاق مطر  عطيب	25	66	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	ms	125000	2026-02-01 15:30:03.565596	2019-06-05			تأهيل حركي 	3	07711683631	ذي قار الفهود								f			فيسبوك					\N
193	رونق احمد عودة	28	50	165	amputee	t	اطراف سليكونية تعويضية - محجر عين - يمين | ملاحظات: تمت المعاينة وتم عرض النماذج السليكونية من اعمال مراكزنا وتم اخذ صور للحالة من قبل استاذ سيف وتم عرض سعر الجزء السليكوني عليهم المقدر ب3375000 دينار عراقي	f		0	2026-02-01 14:37:08.1856	2017-10-10				4	07734246685	نينوى-القيارة	عملية ارهابية							f			فيسبوك		\N	\N		new
200	سهام قاسم رشاك كيطان 	31	90	150	physiotherapy	f	احادي - طرف سفلي - يمين	t	تبديل مفصل	50000	2026-02-03 00:00:00	2025-08-18	حضرت المريضة للاستشارة بتاريخ 27/12/2025، وباشرت بالعلاج المخصص من قبل الدكتور حيدر حازم بمعدل جلستين أسبوعيًا، حيث أكملت (7) جلسات، ثم انقطعت عن العلاج بسبب ظرف خاص، وكانت آخر جلسة لها بتاريخ 17/1/2026، وعادت اليوم لاستكمال الجلسات العلاجية، وتُعد جلسة اليوم الجلسة الثامنة.		علاج طبيعي 	3	07809410879	ذي قار الدواية 	سقوط من الدرج 							f			طبيب	حيدر حازم	إصابة اربطة	الركبة	\N	\N
203	عبد الكريم عوده جياد	65	75	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان الركبتان 	0	2026-02-03 00:00:00	2023-01-01	استشارة اولية		علاج طبيعي	3	07866396504	ذي قار الناصريه 	حركه والتواء خاطئ							f			فيسبوك		سوفان	الركبة	\N	\N
204	حسين كامل عويد فرهود	54	90	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	150000	2026-02-03 00:00:00	\N	حضر المريض للاستشارة وأخذ الجلسة الأولى بتاريخ 2/2/2026 في الشفت المسائي، وتم تحويله اليوم إلى الشفت الصباحي بطلب من المريض		علاج طبيعي 	3	07805090571	ذي قار  قضاء الشطره	جلطة دماغية 							f			فيسبوك		جلطة دماغية	العمود الفقري	\N	\N
206	فاطمه عدنان قاسم بزيع	16	44	150	physiotherapy	f	احادي - طرف سفلي - يمين	t	تليف العصب الزندي والوسطي لليد اليمنى 	0	2026-02-03 00:00:00	\N	حضرت المريضة للاستشارة بتاريخ 13/12/2025، وباشرت بالعلاج مباشرةً بعد الاستشارة. لاحقًا توقفت عن العلاج لفترة بسبب الامتحانات والمرض بعد انتهائها، وكانت قد وصلت إلى الجلسة السابعة من باكج مكوّن من (10) جلسات، وكانت آخر جلسة بتاريخ 25/12/2025. ثم عادت لاستكمال الجلسات بتاريخ 2/2/2026، وتُعد جلسة اليوم الجلسة التاسعة من الباكج.		علاج طبيعي	3	07805340405	ذي قار الناصريه حي العسكري	كثرة الكتابه + حل ثقل عالي 							f			فيسبوك		تشنج عضلي	الرسغ	\N	\N
196	عادل هاشم اسماعيل	50	70	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		3000000	2026-02-03 00:00:00	2025-12-16	مراجع جديد 	شتل لوك تيتانيوم		2	07782606103	كربلاء	حادث سير	البس	24	شتل لوك	سنكل بايونك	26		f			فيسبوك		\N	\N		new
202	ادم اسماعيل عبد حريز 	2	31	95	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل الاطراف السفبية 	25000	2026-02-03 00:00:00	2024-02-08	استشارة اولية 		علاج طبيعي	3	07828713820	ذي قار الغراف 	ولادي 							f			طبيب	حسن ناجي الشدود	ضمور عضلي	الحوض	\N	\N
198	سلوى محمد حثيل عليوي	58	58	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية + الام الظهر 	350000	2026-02-03 00:00:00	2025-05-02	حضر المريض للاستشارة، وباشر بالعلاج مباشرةً بعد الاستشارة.		علاج طبيعي 	3	07806374493	ذي قار الغراف 	العمل  							f			من شخص آخر	من قبل مراجع قديم حصل نتائج جيدة 	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
205	علي عبد الرزاق ناصر عجيل	43	80	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	350000	2026-02-03 00:00:00	2023-01-01	حضر المريض للاستشارة لدى الدكتور عبد الله خان قبل أكثر من أسبوعين، وبدأ اليوم جلسات العلاج بعد تحديد الوقت المناسب له.		علاج طبيعي 	3	07801262121	ذي قار الناصرية شارع النيل 	جلطة دماغية 							f			فيسبوك		جلطة دماغية	العمود الفقري	[{"type":"جلطة دماغية","area":"العمود الفقري","side":""}]	\N
149	قبس طه نجم يونس 	22	58	153	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق يضغط على الفقرات	175000	2026-01-27 07:48:16.166203	2025-07-07	المريضة كانت تراجع منذ افتتاح المركز وعادت اليوم للعلاج بسبب الالم بتاريخ 27/1/2026		علاج طبيعي	3	 07856300173	الناصرية قضاء الشطرة	تنمول وتشنجات قوية وعدم القدرة على الوقوف							f								
199	شيماء محمد علي 	44	60	155	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-03 00:00:00	1982-01-01				2	07701384676	كركوك	ولادي بسبب خطأ طبي 							t		كلا الجانبين 	فيسبوك		\N	\N		new
72	حميدة علي ابوشكه الخفاجي	53	69	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	500000	2026-01-19 13:21:55.716588	2025-06-22	راجعت المريضة المركز بتاريخ 10/01/2016 بعد استشارة الدكتور عبد الله.		علاج طبيعي 	3	07812543875	ذي قار الناصريه حي اور	جلطة دماغية 							f				\N	\N	\N	\N	\N
197	عباس فاضل حسن	40	115	180	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-03 00:00:00	2025-03-27				2	07878939821	واسط	طلق ناري							f			فيسبوك		\N	\N		new
55	التفات شريف اسد علي	63	89	162	physiotherapy	f	احادي - طرف سفلي - يمين	t	تبديل مفصل	395000	2026-01-18 10:12:48.683786	2025-12-24	المريضة راجعتنا بتاريخ 29/12 من دكتور حبدر حازم حيث كانت تستخدم جهاز CPM اما اليوم فقد غيره طبيبها الاجهزة الليزر و التنس وكانت اليوم جلسة مفردة كون المريضة مراجعتنا سابقا		علاج الطبيعي	3	7807778880	الناصرية قرب جامعة ذي قار	تبديل مفصل							f				\N	\N	\N	\N	\N
215	محمد رضا عبد الكريم مهدي محمد	25	72	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	تصلب اعصاب اليد والرجل الايسر 	0	2026-02-04 00:00:00	2026-01-28	استشارة اولية		علاج طبيعي	3	07806725177	ذي قار الناصريه حي الفرات 	انهيار عصبي 							f			مستشفى	منتسب / موظف بقسم الهندسة 	إصابة عصب محيطي	اليد	\N	\N
214	جاسم محسن شنابه غانم 	92	80	162	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضعف الحركة وبالاخص الكتف 	50000	2026-02-04 00:00:00	2026-01-16	استشارة اولية لمريض تحويل من دكتور علي رشيد 		تأهيل حركي 	3	07801795616	ذي قار الناصريه حي اور 	جلطة دماغية  عابرة							f			طبيب	الدكتور علي رشيد 	جلطة دماغية	الكتف	\N	\N
212	حسن تركي درويش حسين	43	80	174	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	0	2026-02-02 00:00:00	2026-01-08			جلسات علاج طبيعي 	3	07815595771	الناصرية قضاء البطحاء	جلطة دماغية 							f			من شخص آخر		جلطة دماغية	الرأس	\N	\N
213	فاطمة شعلان حمود	10	10	100	physiotherapy	f	احادي - طرف سفلي - يمين	t		25000	2026-02-02 00:00:00	\N				3	00000000000	ذي قار								f			طبيب		\N	\N	\N	\N
201	ازهار فهد جبر علي 	51	69	169	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان وتاكل بالركبتان + انزلاق الفقرات القطنية	100000	2026-02-03 00:00:00	\N	حضرت المريضة للاستشارة لدى الدكتور عبد الله بتاريخ 2/2/2026، وبدأت اليوم بالجلسة العلاجية الأولى. كما راجعت الدكتور حيدر الكناني، الذي أوصى بإجراء عملية تبديل مفصل، على أن يسبقها علاج طبيعي لمدة ثلاثة أشهر.		علاج طبيعي 	3	07819954017	ذي قار الشطره	جهد وتعب مستمر بسبب العمل							f			فيسبوك		سوفان	الركبة	\N	\N
221	حسين مصطفى قحطان 	39	75	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-04 00:00:00	2019-11-11		بايونك 		2	07705508462	بصرة 	حادث سير	حلقي 	38		سنكل 	26	بايونك	f			فيسبوك		\N	\N		new
219	علي احمد حلوف 	29	70	178	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-04 00:00:00	2015-11-11	لديه طرف صناعي / يحتاج صيانة قالب مع سليف			2	07719181999	بصرة 	حادث سير							f			فيسبوك		\N	\N		past
218	ازهار عبد الحسين كندوح فجر 	50	105	162	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات + تبديل غضاريف 	25000	2026-02-04 00:00:00	\N	استشارة اولية		علاج طبيعي 	3	07810781190	ذي قار الناصريه الحبوبي	سقوط							f			مستشفى	حسن ناجي ال شدود	انزلاق فقرات	الرقبة	\N	\N
211	فريضة فزيع مشوي مري	66	80	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان 	25000	2026-02-02 00:00:00	2023-03-15			جلسات علاج طبيعي 	3	07827849626	الناصرية قضاء سوق الشيوخ ناحية الفضلية	تعب وجهد 							f			من شخص آخر		سوفان	الرقبة	\N	\N
208	ليلى داغر مسير عبيد	56	80	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة دماغية 	300000	2026-02-03 00:00:00	2023-11-15			جلسات علاج طبيعي 	3	07826506872	الناصرية قضاء البطحاء	انهيار عصبي							f			طبيب		ضمور عصبي	الرأس	\N	\N
207	اركان محمد جابر خليوي	26	79	185	physiotherapy	f	احادي - طرف سفلي - يمين	t	كسر مركب 	50000	2026-02-03 00:00:00	2023-09-11	يرجع المريض في كربلاء عند دكتور محمد سعد الحارس الذي بدوره ارشده على مركزنا لتلقي العلاج الطبيعي		علاج الطبيعي	3	078067168054	ذي قار الشطرة قضاء الدواية	حادث سير							f			طبيب	محمد سعد عبد الزهرة الحارس	كسر	الساق	\N	\N
222	فاطمة باسم محمد يوسف	19	46	150	physiotherapy	f	احادي - طرف سفلي - يمين	t	كانسر بالورك 	350000	2026-02-04 00:00:00	\N	استشارة اولية		تأهيل حركي 	3	07833734035	ذي قار الناصرية مدينة الصدر 								f			منظمة انسانية	مؤوسسة العين 	\N	الورك	\N	\N
220	جعفر  منصور  احمد 	19	70	170	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-04 00:00:00	\N				2	07802749888	بصرة  	ولادي 							t	طرف مسندي 		فيسبوك		\N	\N		new
217	عبد الله عنود صبر 	31	70	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-04 00:00:00	2005-11-11		بايونك 		2	07767812112	بصرة 	ضحايا ارهاب 	حلقي 	38	فاكيوم 		27	بايونك	f			فيسبوك		\N	\N		new
216	احمد عبد علي شلال 	30	95	184	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-04 00:00:00	\N	مجاني 	شتل لوك		2	07725820251	بصرة 	ولادي 	البس 	25	شتل لوك 	سنكل 	27		f			فيسبوك		\N	\N		new
75	ايمان ابراهيم عباس	32	55	155	amputee	t	احادي - طرف سفلي - يسار	f		0	2026-01-19 16:16:52.57349	2024-09-15	تم عمل قالب تجريبي وتم التدريب عليه خلال هذه الفترة وتم عمل القالب مجانا بامر الدكتور ياسر الساعدي المحترم			4		نينوى-موصل -حي التاميم	عملية ارهابية							f			فيسبوك		\N	\N		new
35	سعود اكعود محسن	21	95	171	amputee	t	احادي - طرف سفلي - يمين	f		0	2026-01-15 14:02:15.636991	2025-02-28	تم عمل طرف تحت الركبة نظام فاكيوم بتاريخ 27/11/2025 وتم تسليم الطرف بتاريخ 11/12/2025 بكلفة ثلاثة ملايين			4	07509556798	نينوى -الزمار	حادث							f			فيسبوك		\N	\N		new
254	مرتضى مهدي عبد علي خلف 	34	79	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	0	2026-02-09 00:00:00	2017-01-01	استشارة اولية		علاج طبيعي 	3	07814600979	ذي قار الناصريه مدينة الصدر	حركه خاطئه اثناء لعب الكرة 							f			فيسبوك		انزلاق فقرات	منطقة الظهر العلوية	\N	\N
225	يسرى عباس خضير فهد	52	116	162	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان الركبة	200000	2026-02-05 00:00:00	2025-03-25	استشارة اولية ومن ثم المباشرى بالجلسات		علاج طبيعي	3	07830909099	ذي قار قضاء الشطرة	الوزن الثقيل							f			فيسبوك		سوفان	الركبة	\N	\N
226	حسين علي بندر حسين 	64	92	174	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	100000	2026-02-05 00:00:00	1980-06-02	استشارة اولية ومن ثم المباشرة بالجلسات		علاج طبيعي	3	07830909099	ذي قار قضاء الشطرة	سقوط اثناء ممارسة كرة القدم واستمرت معه 							f			فيسبوك		انزلاق فقرات	القطن	\N	\N
469	محمد سعدون حمزه 	38	82	179	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-22 08:15:04.795711	2015-04-08				1	07711331279	حله /الحمزه الغربي	حادث سير							f			فيسبوك					new
231	فاضل عيسى محمد خليف	60	60	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	تليف بالاعصاب	0	2026-02-05 00:00:00	2025-12-25	استشارة اولية		علاج طبيعي 	3	07812959385	الناصرية قضاء الغراف	التعب اثناء العمل العسكري							f			من شخص آخر		ضمور عصبي	الكتف	\N	\N
232	حازم كاظم هادي 	51	75	175	amputee	t	ثنائي - سفلي	f		0	2026-02-05 00:00:00	2021-01-01				2	07734534131	كربلاء 	قدم سكري 			دكم	سنكل 		لايوجد 	f			فيسبوك		\N	\N		past
227	امال محمود  مشهدي 	47	85	185	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		250000	2026-02-05 00:00:00	1994-11-01		باسف 		2	07710855266	ميسان 	حادث سير	البس 	28	فاكيوم	كاربون 	23	لايوجد 	f			فيسبوك		\N	\N		new
230	حسين محمد عبد اللطيف	25	70	160	amputee	t	ثنائي - سفلي	f		2400000	2026-02-05 00:00:00	2015-11-11	مراجع سابق / تم شراء اطراف مسبقا بقيمة 8000000 والباقي بذمته 2400000	باسف فاكيوم 		2	07725113708	بابل 	كهرباء 	امريكي 	28		سنكل 	26	لايوجد 	f			فيسبوك		\N	\N		past
234	محمد خالد صالح بلط	20	65	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	رباط صليبي	20000	2026-02-05 00:00:00	2025-01-11	استشارة اولية		علاج طبيعي	3	07800159190	ذي قار البطحاء 	سقوط بسبب كرة القدم 							f			فيسبوك		إصابة اربطة	الركبة	\N	\N
235	تاجية دحام نزال مناحي	55	96	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات القطنية و سوفان في الركبة والتهاب بالعصب 	0	2026-02-05 00:00:00	2004-01-05	استشارة اولية		علاج طبيعي 	3	07827995905	ذي ار الناصرية مدينة الصدر	حادث سقوط 							f			من شخص آخر	من قبل معرفتهم مريض سابق في المركز اشدى في خدمات مركزنا 	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
210	ختام محسن عنيد جويد	53	79	166	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات العنقية وانزلاق غضروفي كذلك انزلاق بالفقرات القطنية	75000	2026-02-03 00:00:00	\N	جلسة كلاسك مفردة 		علاج طبيعي	3	07829838387	ذي قار الناصرية الاسكان القديم	سبب حمل وزن ثكيل 							f			من شخص آخر		\N	الرقبة	\N	\N
223	محمد جبار مكي جوني	34	80	185	physiotherapy	f	احادي - طرف سفلي - يمين	t	تشنج عضلي 	50000	2026-02-04 00:00:00	\N	استشارة اولية		علاج طبيعي 	3	07802852497	ذي قار الناصرية الادارة المحلية 	جهد وتعب مستمر بسبب العمل							f			من شخص آخر	من قبل موظف المركز سماء يعرب 	تشنج عضلي	منطقة الظهر السفلية	\N	\N
113	صلاح بحر محمد علي	56	85	185	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-01-25 09:34:16.864363	1991-11-01	مراجع سابق / تم شراء طرف بمبلغ 6,250,000 تم لبس الطرف والاستلام من قبل كتاب العتبة السابق بتاريخ 62/6/2023	باسف 		2	07722291970	كربلاء 	انتفاضة 	امريكي 	28	فاكيوم	س	27R	لايوجد 	f			فيسبوك		\N	\N		past
229	اية سلام خليفة 	19	55	155	amputee	t	اطراف سليكونية تعويضية - كف - يمين	f		1500000	2026-02-05 00:00:00	2014-11-01	مراجع سابق / تم شراء طرف بقيمة 3000000 قبل البرنامج والباقي عليها 1500000			2	07718465441	بغداد	مثرامة لحم 							f			فيسبوك		\N	\N		past
228	عقيل سعيد يدام شجر	53	79	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	300000	2026-02-05 00:00:00	2024-03-01	استشارة اولية عند المعالج عبد الله خان		علاج طبيعي 	3	07803041092	ذي قار  قناحية القلعة	حادث سير							f			من شخص آخر		اصابة حبل شوكي	العمود الفقري	\N	\N
89	عباس حسين محمد	37	95	180	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-01-22 07:30:35.112842	2023-11-11	مراجع سابق /تم شراء طرف صناعي بقيمة 5000000 ملايين دينار وتم دفع المبلغ بالكامل تم لبس الطرف والتدريب عليه 	طرف فوق الركبة تركي 		2	07829735342	بابل	قدم سكري 	البس						f			فيسبوك		\N	\N		past
23	خالد محمود شاكر 	52	75	175	amputee	t	ثنائي - سفلي	f		0	2026-01-14 07:45:27.573276	2025-02-07	مراجع سابق / تم شراء طرف بتاريخ ....... بمبلغ ٩ مليون و٣٥٠ الف	3r15 مع ركلبة ثابتة 		2	07801519160	بابل 	قدم سكري 	شتل لوك تركي 	40	شتل لوك 	سنكل 	26	ميكانيكي 	f			فيسبوك		\N	\N		past
233	ميثاق محي عبد الكاظم 	38	75	175	amputee	t	ثنائي - سفلي	f		700000	2026-02-05 00:00:00	\N	مراجع سابق 	باسف فاكيوم + 3r80		2	07806493947	بابل 	اثناء الواجب 	البس + هيما حلقي 	28 + 40	فاكيوم	سنكل 	26 	3r80 	f			فيسبوك		\N	\N		past
239	نور سلمان عبد حنين	39	70	164	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات العنقية 	150000	2026-02-07 00:00:00	2024-10-13	مراجعة قديمة واليوم جاءت للبدا بكورس علاجي جديد		علاج طبيعي	3	07805698565	الناصرية شارع بغداد	التعب والجهد اثناء العمل							f			طبيب	دكتور حيدر حازم	انزلاق فقرات	الرقبة	\N	\N
246	رعد زامل ناهي عاجل	42	94	182	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	0	2026-02-08 00:00:00	2020-01-01	استشارة اولية		علاج طبيعي 	3	07805935562	ذي قار الشطره حي الزهراء 	كثرة العمل							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	\N	\N
240	محسن عاشور عاكول عيسى 	63	70	159	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		500000	2026-02-07 00:00:00	1981-06-11	حالة البتر جيدة كون المريض مستمر بلبس الطرف 	طرف سفلي 		3	07814318423	ذي قار سوق الشيوخ 	اطلاق ناري 	بدون سيليكون 		BTP SC 	SACH 	25	بدون مفصل ركبة 	f			فيسبوك		\N	\N	\N	\N
242	لنا وطن عيسى عبد العالي	16	50	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	0	2026-02-07 00:00:00	2016-01-01	استشارة اولية		علاج طبيعي 	3	07806369276	ذي قار الدوايه قرب المجلس البلدي 	بدون سبب او غير معروف 							f			فيسبوك		إصابة عصب محيطي	الحوض	\N	\N
412	حسام صبحي داوود 	48	95	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-11 12:00:31	2003-10-01	مراجع سابق منذ 2025 	شتل لوك		1	07901202408	بغداد /حي القاهره	حادث سير	البس	28	شتل لوك	سنكل	26	تحت الركبه	f			فيسبوك		\N	\N		past
244	إنذار عبد الله كاظم يونس 	40	104	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	تليف في الكتف واليد وانزلاق في الفقرات 	95000	2026-02-07 00:00:00	2023-01-05	استشارة اولية		علاج طبيعي 	3	07831088746	ذي قار الفضلية 	بسبب تعب شديد وجهد							f			من شخص آخر	سماع عن طريق الصدفة خلال تواجده في المستشفى وكذلك الاعلانات 	انزلاق فقرات	الكتف	\N	\N
247	كرار حيدر غازي	21	75	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-08 00:00:00	2023-01-01				2	07715183640	بصرة 	لغم 							f			فيسبوك		\N	\N		past
250	شيماء ضيدان جيجان سعيد	43	90	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	Brain Abscess ,وتعاني من ضعف حسي وحركي في الجهة اليسار 	75000	2026-02-08 00:00:00	2025-05-08	استشارة اولية		علاج طبيعي 	3	07810550130	ذي قار الناصرية السبل								f			مستشفى	مستشفى العين الطابق الخامس 	\N	الرأس	\N	\N
243	حليمة عبد فاضل فارس 	75	80	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضمور في الدماغ والتهاب اعصاب محيطي 	225000	2026-02-07 00:00:00	\N	استشارة اولية		تأهيل حركي 	3	07707059944	ذي قار الناصرية شارع السفينة 	بسبب ارتفاع الضغط والسكر وحالة من الدوار المستمر 							f			فيسبوك		ضمور عصبي	الركبة	\N	\N
251	فتاة ياسر سلمان محمد 	58	70	150	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	100000	2026-02-09 00:00:00	\N	استشارة اولية		علاج طبيعي 	3	07810048749	ذي قار الناصريه الاسكان الصناعي	سقوط من مكان عالي 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	\N	\N
471	علي كاظم كزار 	28	72	170	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		15000000	2026-02-21 08:50:11	2020-08-21		ميركوري		1	07804490965	بغداد/الشعله	حادث سير				كاربون اسبريت			f			فيسبوك					new
253	حسين ناصر حسين	40	85	178	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-09 00:00:00	2018-04-01	مراجع سابق 	P3 Harmony 		2	07719282989	كربلاء 	حادث سير	امريكي 	34	فاكيوم	سنكل 	27		f			فيسبوك		\N	\N		past
252	نصر محمد جعفر	44	85	172	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-02-09 00:00:00	2025-09-29				2	07708283901	بغداد	سكري							f			فيسبوك		\N	\N		new
245	علي هادي حمزة 	52	75	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-08 00:00:00	2025-09-01	مراجع جديد 			2	07871404450	بابل	قدم سكري 							f			فيسبوك		\N	\N		new
248	صادق حميد فاضل 	23	75	185	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		500000	2026-02-08 00:00:00	2023-01-21				2	07725797245	بصرة 	حادث سير							f			فيسبوك		\N	\N		new
241	حيدر امجد عبد 	20	70	170	amputee	t	احادي - طرف سفلي - يمين - جوبارت	f		0	2026-02-07 00:00:00	2025-01-01		قدم كاربونية سلكونية 		2	07812270341	بابل					كاربون 	28r		f			فيسبوك		\N	\N		past
236	حامد محمود احمد 	75	87	173	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-05 00:00:00	52025-04-11	تم عمل طرف للمريض بتاريخ 6/11/2025 وتم تسليم الطرف بتاريخ 22/11/2025 على مسؤولية المريض .....وبتكلفة ثلاثة ملايين دينار وتم تسديد نصف المبلغ عند الشراء ويكون الباقي على شكل اقساط 200000 دينار لكل شهر بالاتفاق مع استاذ عمر وحاليا الباقي في ذمة المريض 900000 دينار عراقي فقط	طرف تحت الركبة كاربون درجة ثانية		4	07703086079	نينوى -البو سيف	انسداد شرايين	البس امريكي 	28	فاكيوم	قدم سنكل اكسز متحرك	27 R		f			فيسبوك		\N	\N		new
359	كرار زيارة عجيل	31	67	170	amputee	t	ثنائي - سفلي	f		0	2026-02-03 18:08:00	2015-05-06		قالب تحت الركبة عدد 2		1	07714301347	بغداد / بسماية	انفجار	سليكون الماني 3d	28	فاكيوم 	كاربون	26		f			فيسبوك		\N	\N		past
915	مهدي اياد كاظم 	20	70	178	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-04-08 13:12:21.28581	\N	مراجع سابق /	اللوكس 2 ياباني المنشأ		2	07712476005	بصرة 	حادث سيارة 	حلقي 		فاكيوم	كاربون 		الوكس 	f			فيسبوك					past
361	ابراهيم مصطفى ماجد	4	16	75	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-01-26 15:19:27	2022-06-08	150000 دينار عراقي			1	07705070779	بغداد / الاعلام	ولادي							t	afo عدد2	كلا الجانبين	فيسبوك		\N	\N		new
255	حسين ناصر مجلي حمزه 	59	77	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	تصلب الكتف 	250000	2026-02-09 00:00:00	\N	استشارة اولية		علاج طبيعي 	3	07802459337	ذي قار الناصريه المنصوريه	كثرة العمل							f			فيسبوك	مستشفى العين الطابق الخامس 	تصلب لويحي	الكتف	\N	\N
263	حسين حيدر حسن علي	16	82	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضمور عضلي	0	2026-02-10 10:31:31.223458	2009-07-13	استشارة اولية		علاج طبيعي	3	07803580092	ذيقار قضاء الشطرة	ضمور عضلي ولادي							f			طبيب	دكتور علي عزيز	ضمور عضلي	\N	\N	\N
256	محمد وسيم صبحي	23	75	180	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-09 00:00:00	2016-12-08	استعلام وتمت المعاينة من قبل استاذ سيف والمريض بحاجة الى تبديل قالب مع تغيير نظام التعليق الى الشتل لوك لان لديه ترهل كبير في العضلات وتم عرض انواع السليكونات والقوالب بتكلفة 2700000 يتضمن هذا المبلغ تبديل القالب بسعر مليون ونصف وسيليكون بسعر 900000 شركة اوسور  مع قفل شتل لوك 300000			4	07764722138	نينوى-موصل-مزارع زيونة	عملية ارهابية							f			فيسبوك		\N	\N		new
258	مهدي عطية عبد مشتت	55	90	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	تصلب منطقة الضهر العلوية 	125000	2026-02-10 00:00:00	2011-05-22	استشارة اولية		علاج طبيعي 	3	07812492045	الناصرية قرب المستشفى التركي	السياقة 							f			من شخص آخر	من طرف مراجع سابق للمركز ( قاسم بزيع )	تصلب لويحي	منطقة الظهر العلوية	\N	\N
261	حسين مرتضى مطرود مجلي	33	90	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	كسر بالساق + بلاتين 	150000	2026-02-10 00:00:00	2025-10-08	استشارة اولية		علاج طبيعي 	3	07860803001	ذي قار الناصريه الموحيه 	حادث							f			فيسبوك		كسر	الساق	\N	\N
257	عباس مجيد عجيل بدر 	62	53	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	تلف في الكتف واليد 	50000	2026-02-10 00:00:00	\N	باشر المريض جلسته الاولى بعد الاستشارة مباشرتا 		علاج طبيعي 	3	07733985363	ذي قار اسوق الشيوخ ناحية الفضلية 	بدون سبب يذكر 							f			طبيب	دكتور وهبي غالب 	\N	اليد	\N	\N
260	مرتضى صلاح جمعه حمد 	17	53	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	كسر بالساق + بلاتين 	50000	2026-02-10 00:00:00	2025-09-11	استشارة اولية		علاج طبيعي	3	07831285637	ذي قار الناصريه حي اور	حادث							f			من شخص آخر	من طرف مراجع سابق باسم اسامة صلاح 	كسر	الساق	\N	\N
267	رعد رياض عبد الحسن جاسم	48	99	186	physiotherapy	f	احادي - طرف سفلي - يمين	t	خلل في الاعصاب والعضلات 	50000	2026-02-10 16:19:48.366651	2021-01-05	استشارة اولية		علاج طبيعي 	3	07831088746	ذي قار الفضلية	عملية رفع انزلاق من بعدها تسبب بهذا المرض							f			من شخص آخر	من قبل مراجع قديم حصل نتائج جيدة 	تشنج عضلي	الفخذ	\N	\N
269	ذكريات علي عاشور عبود	54	75	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات القطنية وهشاشة بالعظام	195000	2026-02-10 17:14:02.791401	2025-05-09	استشارة اولية		علاج طبيعي 	3	07803070134	ذي قار الناصرية الشموخ	حمل وزن ثقيل							f			من شخص آخر	اشخاص كانوا يعالجون في المركز وكذلك العاملين فيها	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
259	كرار علي صافي 	12	55	150	amputee	t	احادي - طرف سفلي - يمين - خلال الحوض	f		0	2026-02-10 00:00:00	2023-01-01		3R45+7E7		2	07728546026	بغداد	مرض	لايوجد		دكم	سنكل 	23		f			فيسبوك		\N	\N		past
270	لازم ذياب جابر عبرة	52	70	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	استئصال ورم من الدماغ	240000	2026-02-10 18:03:11.523111	\N	استشارة اولية / تم تخفيض الجلسة من قبل د. ياسر 		تأهيل حركي 	3	07822220291	ذي قار الناصرية الشموخ	سرطان في الدماغ							f				دكتور غيث ابراهيم		منطقة الظهر السفلية	[{"type":"","area":"منطقة الظهر السفلية","side":""}]	
266	سوسن فاضل عباس محمد	22	60	150	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-10 16:06:17.790769	2026-02-07	تمت المعاينة من قبل استاذ سيف وتم اخذ قالب للمريضة وعمل مسند مجاني بامر استاذ عمر كون والدها احد موظفي المركز 			4	07702004048	نينوى-موصل-حي الامن	التواء كاحل القدم							t	مسند AFO	يمين	من شخص آخر		\N	\N		new
264	ازهار حمود عبيد شبيب	40	65	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة دماغية 	610000	2026-02-10 13:32:23.593257	2025-02-11	المريضة من المرضى القديمين للمركز 		تأهيل حركي 	3	07723844688	ذي قار الاصلاح	بسبب اخذ نوع من العلاج وتضييق في الشريان التاجي							f			من شخص آخر	من قبل موظف في مستشفى العين 	جلطة دماغية	الرأس	\N	\N
364	اشراق طالب جبار	49	88	185	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-01-31 18:46:00	2025-03-04	مجاني	لوك ني		1	07738924634	بغداد - بوب الشام	سكري	البس	36	شتل لوك	سنكل	27	لوك ني	f			فيسبوك		\N	\N		past
268	زهراء عبد الرزاق ناصر 	33	78	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	كانت مصابة بالحزام الناري سابقًا	25000	2026-02-10 16:40:56.276079	2021-01-07	استشارة اولية 		علاج طبيعي 	3	07831910151	ذي قار الناصرية سومر	جهد وتعب مسمتر ويزداد الالم لحظتها							f			من شخص آخر	شخص في المستشفى 	\N	\N	\N	\N
271	محمد عبد الوهاب صباح عداي 	22	45	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	كسر بالساق + بلاتين + ربط فقرات 	250000	2026-02-11 06:04:49.224341	2025-11-25	استشارة اولية 		علاج طبيعي	3	07819953120	ذي قار الناصريه الزهيريه 	سقوط من مكان مرتفع 							f			طبيب	دكتور محمد توفيق 	كسر	الساق	\N	\N
275	شلة مرزوك عليوي جبارة	70	78	156	physiotherapy	f	احادي - طرف سفلي - يمين	t	كسر في فقرات الظهر وكسر في اليد	25000	2026-02-11 14:03:17.890069	\N			علاج طبيعي 	3	07811404010	ذي قار الشطرة 	حادث سيارة 							f			مستشفى	علي عواد ومحمد توفيق	كسر	منطقة الظهر السفلية	\N	\N
279	احمد نعمه مطير 	13	38	140	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضمور بالدماغ	0	2026-02-12 08:48:45.292014	2013-03-25	استشارة اولية		تأهيل حركي 	3	07815550422	الناصرية الاسكان الصناعي	ولادي							f			فيسبوك	علي عواد اخصائي جراحة جملة عصبية	شلل دماغ	الرأس	\N	\N
280	خلدون وليد محمد 	40	120	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	تشنج عضلي 	25000	2026-02-12 08:54:05.518869	2026-02-09	استشارة اولية ومن ثم المباشرة بالجلسات		علاج طبيعي 	3	07831077099	الناصرية حي المتنزة	رفع احمال ثقيلة							f			فيسبوك		تشنج عضلي	الكتف	\N	\N
281	مريم محمد حسن	25	50	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	التهاب بالمخيخ	0	2026-02-12 08:58:01.39317	2020-07-17	استشارة اولية		علاج الطبيعي	3	07860138120	الناصرية منطقة السفينة	عامل وراثي							f			فيسبوك		التهاب سحايا	الرأس	\N	\N
278	عبير عبد الحسين كريم 	30	65	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-12 08:21:38.65211	2009-01-11		باسف 		2	07800352392	ذي قار 	حادث سير	البس		كاربون 	سنكل 	25	لايوجد 	f			فيسبوك		\N	\N		new
284	مناظل ناظر مالك 	23	95	182	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		500000	2026-02-12 11:06:35.2769	2023-08-08		اوريون مع قدم كاربونية 		2	07719401509	كربلاء 	حادث سير	شتل لوك تركي 			سنكل 	27	اوريون 	f			فيسبوك		\N	\N		past
309	احمد محمود ضايف طلاب	7	15	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوائل في الدماغ وضعف في الاعصاب 	150000	2026-02-14 15:21:52.993449	\N	استشارة اولية			3	07816257916	الناصرية الشموخ	من الولادة 							f			طبيب	حسن ناجي ال شدود	ضمور عصبي	الرأس	\N	\N
286	محمد نعيم قاسم 	18	120	180	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		35250000	2026-02-12 12:41:54.921472	2025-07-26	تم شراء طرف مبلغ 25000 الف دولار ما يعادل 37500000 تم دفع مبلغ 3000000 مسبقا 	اللوكس 2		2	07712049000	بصرة 	حادث سير	هيما حلقي 	50	فاكيوم	كاربون 	27	اللوكس2	f			فيسبوك		\N	\N		new
288	يعقوب يوسف محمد يوسف	55	60	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة نزفية 	100000	2026-02-12 13:32:08.481203	\N	استشارة اولية		تأهيل حركي 	3	07814393784	ذي قار سيد دخيل 	بسبب مرض مزمن الضغط والعجز الكلوي 							f			طبيب	دكتور محمد حسن 	جلطة دماغية	منطقة الظهر السفلية	\N	\N
285	كيان كريم دعيوج	10	30	100	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-12 12:12:30.302815	\N				2	07708020489	ميسان 	ولادي 							t	مسند AFO	يمين 	فيسبوك		\N	\N		past
282	حليمة حسن ديوان 	65	65	165	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		5250000	2026-02-12 09:49:08.593435	2023-01-05		تيتانيوم شتل لوك 		2	07725447478	بابل	قدم سكري 	البس 	28	دكم	سنكل 	24	لايوجد 	f			فيسبوك		\N	\N		new
287	علي الاكبر ماجد محمد جثير 	10	32	120	physiotherapy	f	احادي - طرف سفلي - يمين	t	خلع بالكتف 	175000	2026-02-12 13:07:34.331906	2016-09-16	استشارة اولية		علاج طبيعي 	3	07827501711	ذي قار سوق الشيوخ حجام 	ولادي							f			طبيب	حسن ناجي ال شدود	قطع جزئي في العضلات	الكتف	\N	\N
273	مهند مهدي حسين 	50	75	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-11 08:47:05.222449	2025-03-23		B3هارموني 		2	07801256148	ديوانية 	حادث سير	البس 		كاربون 	سنكل 		لايوجد 	f			فيسبوك		\N	\N		past
414	عصام ذياب خضير 	57	120	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-11 12:07:51	2012-04-05	مراجع سابق منذ 2025 	قالب تحت الركبه كاربون درجه اولى مع شتل لوك		1	07700129456	بغداد /الشعله 	سكري			شتل لوك			تحت الركبه	f			فيسبوك		\N	\N		past
413	جاسم حميد كريم	46	102	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		500000	2026-02-11 12:03:56	2024-08-02	مراجع سابق منذ 2025 	طرف تحت الركبه بايونيك		1	07712789686	بغداد /العبيدي 	سكري	البس	38	فاكيوم	كاربون	26	تحت الركبه	f			فيسبوك		\N	\N		past
301	علي خالد حاتم 	42	70	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1000000	2026-02-14 13:23:18.707071	2011-01-01	طلب قديم مع شراء سيليكون 	شتل لوك 		2	07817235054	كربلاء 	انفجار 	البس 	26	كاربون 	سنكل 	26	لايوجد 	f			فيسبوك		\N	\N		new
277	عبد الحسن فرهود جودة محسن	85	75	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	نزف بالدماغ وتلف بالاعصاب 	150000	2026-02-11 15:54:32.735461	\N	استشارة اولية		تأهيل حركي 	3	07801055483	ذي قار الناصرية حي اور	جلطات سابقة 							f			طبيب	علي عواد اخصائي جراحة جملة عصبية	نزف دماغي	الرأس	\N	\N
292	عبد علي صالح محمد حسين 	50	99	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	25000	2026-02-14 06:59:16.33268	\N	استشارة اولية لدكتور سيد نظير عباس 			3	07806282176	ذي قار الناصريه مدينة الصدر 	تقدم العمر 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	\N	\N
299	محمد عبد المهدي نعمه عبد الله 	46	93	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	اصابة رياضيه للركبتان 	300000	2026-02-14 12:55:55.825504	2019-01-01	استشارة اولية			3	07813973800	ذي قار الناصريه الشموخ	حركة خاطئة بجهاز الجري 							f			فيسبوك	+ دكتور اثير عجيل حاجيله عن المركز	سوفان	الركبة	\N	\N
294	حسين يوسف عزيز سدخان 	37	105	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	125000	2026-02-14 07:39:21.294602	2026-02-04	استشارة اولية للدكتور سيد نظير عباس 			3	07800020703	ذي قار الناصريه مجمع تينه 	رفع احمال ثقيلة							f			من شخص آخر	من طرف المراجعه السابقه نوال كامل ياسر 	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
296	ايوب محسن بهلول ياسر 	21	85	187	physiotherapy	f	احادي - طرف سفلي - يمين	t	كسر اصابع + التهاب اوتار 	0	2026-02-14 09:49:04.962265	2026-02-02	استشارة اولية			3	07816130116	ذي قار الناصريه حي اريدو 	قتال 							f			من شخص آخر	من طرف منتسب داخل المستشفى الممرض صلال هاشم 	كسر	الاصابع	\N	\N
305	سارة رجب عباس رشيد	27	75	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	خلل في العصب السابع 	0	2026-02-14 13:39:15.249316	\N	استشارة اولية			3	07826180719	ذي قار الناصرية حي الامير 	ظروف عصبية 							f			من شخص آخر	من مراجع قديم 	شلل العصب الوجهي	الرأس	\N	\N
306	عبدالله مولود علي	60	65	170	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-14 14:12:03.486429	2025-01-21	تمت المعاينة من قبل استاذ سيف وتم الاتصال بالدكتور ياسر مكالمة فيديو وتمت المعاينة من قبله والطرف الصناعي لا يناسبه في الوقت الحاضر بسبب وجود جرح والم في نهاية البتر  وتم عرض مسند AFO لمعالجة سقوط القدم بمبلغ 200000 لوجود سقوط قدم بالرجل الثانية			4	07730124112	نينوى-بارطلة	انسداد شرايين							f			فيسبوك		\N	\N		new
304	منتظر صباح كاظم عبد	32	53	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	تنخر في مفصل الركبتين	100000	2026-02-14 13:34:00.142151	\N	استشارة اولية			3	07738159256	ذي قار قضاء الفجر	بسبب العلاجات							f			فيسبوك		سوفان	الركبة	\N	\N
308	احمد حبتر فارس علك	45	104	169	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان وتنخر في الورك	0	2026-02-14 14:43:57.268805	\N	استشارة اولية			3	07816187808	ذي قار الشطرة 	حادث سيارة 							f			من شخص آخر	مريض قديم في المركز	سوفان	الورك	\N	\N
303	محمود شاكر ثعيب 	68	98	198	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		3900000	2026-02-14 13:28:38.673689	2025-12-12		طرف ثابت فوق الركبة 		2	07712962069	بابل	انسداد شرايين 	شتل لوك 	40	دكم	متحركة 	27R	ثابتة	f			فيسبوك		\N	\N		new
300	حيدر رياض علاوي 	32	60	160	medical_support	f	احادي - طرف سفلي - يمين	f		400000	2026-02-14 13:19:21.72407	1994-01-01	يعاني من خلل ولادي تم تحديد مساند ايفو حسب مركز الهادي للعلاج الطبيعي			2	07729036481	بغداد	ولادي 							t	مسند AFO عدد2	كلا الجانبين 	فيسبوك		\N	\N		new
302	فاطمة علي جليل خلف	17	92	167	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق غضروفي 	250000	2026-02-14 13:24:54.010503	2025-05-10	استشارة اولية			3	07812342756	ذي قار الناصرية شارع بغداد	تعب وجهد بسبب الدراسة 							f			من شخص آخر	شخص يعمل في المستشفى	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
293	ايناس علي شعبان رمضان 	47	75	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان الركبتان 	250000	2026-02-14 07:08:15.216419	2022-01-01	استشارة اولية			3	07804230067	ذي قار قضاء الشطره طريق المعهد 	مضاعفات التهاب روماتيزي 							f			طبيب	دكتور نزار 	سوفان	الركبة	\N	\N
298	خالدة خشان عذاب غالي	55	92	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية والعنقيه 	375000	2026-02-14 12:38:26.02482	\N	استشارة اولية			3	07819855126	ذي قار الناصريه الاسكان الصناعي	حمل اشياء ثقيله على الراس 							f			من شخص آخر	من طرف مراجع سابق 	انزلاق فقرات	منطقة الظهر العلوية	[{"type":"انزلاق فقرات","area":"منطقة الظهر العلوية","side":""}]	\N
310	عباس جاسم دبيان شلب	44	80	167	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق في الفقرات العنقية 	50000	2026-02-14 15:40:19.102135	2019-01-05	استشارة اولية			3	07816599244	ذي قار الناصرية الشموخ	الجهد والتعب بسبب العمل							f			من شخص آخر	المعاون الاداري المسائي سيد يونس طلب	انزلاق فقرات	الرقبة	\N	\N
312	هديل عبد المنعم محمد جاسم	47	68	164	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق غضروفي - الكتف المتجمد	25000	2026-02-15 06:21:43.353345	2025-05-06	استشارة اولية علمًا ان المريضة مراجعة سابقة وانقطعت عن العلاج			3	0780737958313	ذي قار الشطرة	تعب شديد بسبب العمل والجهد							f			انستاغرام		انزلاق فقرات	الكتف	\N	\N
313	اياد كاظم خضير 	29		185	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-15 08:00:19.68765	2012-04-26				2	07712050886	ديالى 	انتحاري 							f			فيسبوك		\N	\N		new
314	محمد ناظم عبد الامير 	33	70	175	amputee	t	اطراف سليكونية تعويضية - اصبع - يسار	f		700000	2026-02-15 09:30:40.174488	2024-01-01				2	07700025906	كربلاء 	اثناء العمل 							f			فيسبوك		\N	\N		new
318	اقبال عبد الامير ابراهيم عبد الله 	50	94	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	انحراف العمود الفقري 	0	2026-02-15 12:58:38.568021	2023-05-30	استشارة اولية			3	07813973800	ذي قار الناصريه الشموخ 	حادث سيارة 							f			من شخص آخر	مراجع لدينا 	انزلاق فقرات	العمود الفقري	\N	\N
324	موسى علي داخل راضي	23	97	176	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق في الفقرات القطنية	250000	2026-02-15 18:25:53.762544	\N	استشارة اولية			3	07834000007	ذي قار سيد دخيل	تعب وجهد بسبب العمل ورياضة كرة القدم							f			من شخص آخر	من قبل مراجع قديم حصل نتائج جيدة 	انزلاق ديسك	منطقة الظهر السفلية	\N	\N
311	رؤى حسين علوان محسن	36	70	156	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية + الام الظهر وتضييق القناة الشوكة	610000	2026-02-14 17:23:20.734292	2019-01-05	استشارة اولية			3	07732113965	ذي قار الناصرية حي المتنزة	حمل وزن ثقيل							f			طبيب	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
276	محمد عزيز جاسم	70	80	176	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		3250000	2026-02-11 15:11:26.456417	2008-01-11	تمت المعاينة من قبل استاذ سيف وتم عرض طرف فوق الركبة بركبة مقفولة مع قدم متحرك مع سيليكون امريكي بمبلغ 3500000 وبعد الاتصال باستاذ عمر تم خصم السعر ب3250000 واخبرونا بانه بعد الاستشارة يردون لنا الجواب	طرف كاربون درجة ثانية		4	07701890800	نينوى-موصل-زيونة اليارمجة	انسداد شرايين بسبب خطأ طبي	برستل 	38	شتل لوك	قدم سنكل اكسز متحرك	26L	مفصل ثابت	f			فيسبوك		\N	\N		new
323	عاجل جبار مهدي صالح	53	90	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلطة بالدماغ 	225000	2026-02-15 14:35:49.990856	2024-11-07	استشارة اولية			3	07819591707	ذي قار حي الزهراء	بسبب الارتفاع بالضغط تسببت بجلطة بالدماغ 							f			من شخص آخر	سمعة المركز 	جلطة دماغية	الرأس	\N	\N
325	احلام كاظم يونس عليخ 	65	105	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات والام العمود الفقري 	0	2026-02-16 06:39:26.415876	2024-01-01	استشارة اولية			3	07805286823	ذي قار الناصريه ناحية الفضلية 	تقدم العمر 							f			من شخص آخر	من طرف مريضه سابقه بالمركز (امينه كاظم) 	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
289	كوثر بشير شخير عبد الله	26	94	161	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية + الام الظهر 	75000	2026-02-12 14:48:31.530871	2022-01-03	استشارة اولية		علاج طبيعي 	3	07828099256	ذي قار الغراف 	بسبب الجهد والتعب 							f			من شخص آخر	اخ المريضة طالب في جامعة العين وعلى دراية بالمركز	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
319	اياد رفيق حسون علي 	63	86	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات القطنية	50000	2026-02-15 13:18:55.60469	2026-04-02	استشارة اولية			3	07801819656	ذي قار الناصرية زديناوية	حركة خطأ وتعب شديد							f			من شخص آخر	مريض قديم في المركز	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
321	شهاب احمد علي	30	90	180	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		3000000	2026-02-15 13:54:07.386419	2017-08-10	تمت المعاينة من قبل استاذ سيف وشرح الطرف تحت الركبة الذي عليه عرض ثلاثة ملايين دينار وتم الاتصال باستاذ عمر على ان يدفع المريض مقدمة مليون دينار ومليونين دينار عند تركيب الطرف	طرف كاربون درجة ثانية		4	07721029197	نينوى-زمار	عملية ارهابية	البس امريكي 	26	فاكيوم	قدم سنكل اكسز متحرك	26R		f			فيسبوك		\N	\N		new
317	حسين خضير عباس 	30	85	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-15 12:17:30.123406	2010-01-01		شتل لوك 		2	07719594004	بابل 	اطلاق ناري 	البس شتل لوك 	26	شتل لوك 	سنكل 	25	لايوجد 	f			فيسبوك		\N	\N		past
316	جهاد عبد الزهرة سبتي 	28	85	185	amputee	t	احادي - طرف علوي - يمين	f		0	2026-02-15 11:20:17.101794	2022-10-21				2	07715010244	بصرة 	اطلاق ناري 							f			فيسبوك		\N	\N		new
315	فالح عبد الرضا مسلم 	46	65	165	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		465000	2026-02-15 09:58:40.464698	1997-01-01		3r60		2	07715954912	ميسان 	اطلاق ناري 	البس وشتل لوك 		كاربون 	كاربون 	26	3r60	f			فيسبوك		\N	\N		past
322	محمد قاسم هلال حسين	20	60	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	نزف بالدماغ وتلف بالاعصاب 	1700000	2026-02-15 14:27:52.482	2025-12-12	باشر المريض جلسته الاولى بعد الاستشارة مباشرةً ببكج مدة شهر 			3	07830541057	ذي قار الصالحية 	حادث سيارة 							f			طبيب خارجي	حسن ناجي ال شدود	نزف دماغي	الرأس	\N	\N
331	علي عادل حسين تركي 	40	68	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات وتليف بالعمو الفقري 	0	2026-02-16 09:15:02.298819	2016-01-01	استشارة اولية			3	07826877336	ذي قار الناصريه سومر الاولى 	بدون سبب يذكر 							f			فيسبوك	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
334	كاظمية جاسم محمد عبد 	62	105	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان اليدين والقدمين ومنظقة العمود الفقري السفلي 	0	2026-02-16 10:11:09.7526	2023-01-01	استشارة اولية 			3	07809563879	ذي قار الناصريه مدينة الصدر	اثر السكر والوزن الزائد 							f			فيسبوك		سوفان	العمود الفقري	\N	\N
333	سنية عبيد خلف 	52	100	160	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		4350000	2026-02-16 10:00:18.398128	2025-11-16		طرف ثابت فوق الركبة 		2	07832639543	ديوانية 	حادث سير	برغي 		دكم	متحركة 	24		f			فيسبوك		\N	\N		new
337	علي كاظم عبود 	41	80	185	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-16 12:43:41.902706	2020-01-01		قالب كاربون 		2	07727887920	بصرة 	اطلاق ناري 	حلقي 	36		متحركة 	26		f			فيسبوك		\N	\N		past
329	حسين فرحان خضير	21	65	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		450000	2026-01-27 08:44:19	2012-01-01	مراجع سابق / يحتاج تبديل غلاف قدم	3R60		2	07807594804	واسط	انفجار عبوة	اوسور 	38	فاكيوم	1C63	26	3R60	f			فيسبوك		\N	\N		new
336	حيدر  هاشم جاسم 	47	90	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-16 12:39:35.196007	2018-08-27		باسف فاكيوم 		2		بغداد	قدم سكري 	البس 		دكم	متحركة 	26	لايوجد 	f			فيسبوك		\N	\N		past
327	صلاح حسن محسن نزال 	71	108	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية 	25000	2026-02-16 08:38:14.370816	2016-01-01	استشارة اولية			3	07810920520	ذي قار الناصريه الثورة 	حمل اثقال + سقوط 							f			فيسبوك	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
326	عليه حسين محيل محمد 	76	45	180	physiotherapy	f	احادي - طرف سفلي - يمين	t	ضعف عام باجزاء الجسم جراء عملية فتح ظهر + عدم السيطره على القدم اليسرى 	75000	2026-02-16 07:08:49.201324	2025-12-01	استشارة اولية			3	07803972705	ذي قار الناصريه حي العسكري 	جلطة دماغية 							f			طبيب خارجي	حسن ناجي ال شدود	جلطة دماغية	العمود الفقري	\N	\N
332	هادي زغير حجاي ناصر 	51	95	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	25000	2026-02-16 09:33:33.386375	2026-01-01	استشارة اولية			3	07801051901	ذي قار الناصريه الشاميه 	حمل ثقل 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	\N	\N
339	حياب طالب حسين علي 	73	83	178	physiotherapy	f	احادي - طرف سفلي - يمين	t	تليف في العضلات وانزلاق في الفقرات القطنية 	45000	2026-02-16 13:58:51.106426	2023-01-05	استشارة اولية 			3	07801218129	ذي قار قرب مصفى ذي قار 	حركة وتعب مستمر 							f			من شخص آخر	من قبل المعاون الاداري المسائي سيد يونس	تشنج عضلي، انزلاق فقرات	منطقة الظهر السفلية، الكتف	\N	\N
340	مروان عباس جاسم محمد	35	82	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	جلط بالدماغ بسبب ارتفاع بالضغط 	120000	2026-02-16 14:23:07.10876	2025-11-04				3	07819034334	ذي قار الناصرية حي اريدو 								f			فيسبوك	صفحة دكتور ياسر 	جلطة دماغية	القدم، اليد	\N	\N
338	ميثم برزان عيسى عبد الله	56	125	185	physiotherapy	f	احادي - طرف سفلي - يمين	t	تلف اعصاب اليد 	45000	2026-02-16 13:40:46.294085	2025-01-04	استشارة اولية 			3	07801259113	ذي قار الناصرية حي اور	بسبب جهد							f			فيسبوك	حساب دكتور ياسر 	تشنج عضلي	الكتف	\N	\N
283	وداد جبار عجيل مارد	67	73	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	175000	2026-02-12 09:57:14.657183	2024-01-01	استشارة اولية		علاج طبيعي 	3	07803070795	ذي قار الناصريه حي الصناعي 	كثرة العمل 							f			من شخص آخر	من قبل منتسب في طوارئ المستشفى 	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
328	زينب ماجد نعمة 	23	60	165	amputee	t	احادي - طرف علوي - يمين	f		0	2026-02-16 08:42:05.457777	\N				2	0780660706	بابل 	ولادي 							f			فيسبوك		\N	\N		new
320	فائزة محمد عجيل جابر	67	64	150	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق في الفقرات القطنية وتضيق على الحبل الشوكي 	300000	2026-02-15 13:30:17.546666	2024-01-08	استشارة اولية			3	07811292494	ذي قار الاسكان الصناعي 	حادث سيارة 							f			من شخص آخر	موظفين في المستشفى 	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
330	فالح فرج سمير	61	90	180	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		300000	2026-01-12 08:51:04	2025-02-10	مراجع سابق تم شراء طرف تجت الركبة بمبلغ 1500000 والمتبقي 300000	سوفت سوكت		2	07859205301	ذي قار 	قدم سكري 	سوفت 		شتل لوك 	ساج	27		f			فيسبوك		\N	\N		past
335	منذر جابر جاسم جبر 	40	72	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	تلف اعصاب اليد 	550000	2026-02-16 12:34:37.202476	2024-01-01	استشارة اولية 			3	07811223389	ذي قار الناصريه حي اور 	كثرة الكتابه والسياقه							f			من شخص آخر		إصابة عصب محيطي	اليد	[{"type":"إصابة عصب محيطي","area":"اليد","side":""}]	\N
343	سالم وجدان حمدان محمد	37	96	191	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات القطنية وتمزق بالكاحل  الايمن 	25000	2026-02-16 16:06:02.49267	2025-02-10	استشارة اولية			3	07830918144	ذي قار الناصرية حي اور 	حمل وزن ثقيل 							f			تيك توك	حساب دكتور ياسر وبعض زملائه من العمل 	انزلاق فقرات	منطقة الظهر السفلية، الكاحل	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""},{"type":"","area":"الكاحل","side":"يمين"}]	\N
355	خالد غالب حسين جابر	45	76	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات القطنية 	50000	2026-02-17 13:49:12.957681	2019-01-04	استشارة اولية			3	07711085532	ذي قار الفهود	جهد وتعب مستمر بسبب العمل							f			فيسبوك	حساب دكتور ياسر و تحويل دكتور علي فاخر لزوجته هنا 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
345	علي محمد دخيل هليل 	62	71	150	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	175000	2026-02-17 05:24:41.000146	2026-01-02	استشارة اولية			3	07810164911	ذي قار الناصريه المنصوريه 	تقدم العمر 							f			طبيبنا	وسام مجيد 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
346	اسماء جوده دفار بني 	36	57	140	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	300000	2026-02-17 05:27:34.86933	2025-01-01	استشارة اولية			3	07807636286	ذي قار الناصريه الصالحيه 	سقوط 							f			من شخص آخر	من طرف المريضه رشا علي + امينه حيال 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
348	اسامة عبد الحر جبار 	43	75	175	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-17 11:03:15.577611	\N				2	07803580309	الديوانية 	شلل الاطفال الطرف الايمن 							t	مسند قدم 	يمين 	فيسبوك		\N	\N		new
356	نايف عبد الواحد خليف شريدة	45	73	175	physiotherapy	f	احادي - طرف سفلي - يمين	t	تليف في كفوف اليد 	0	2026-02-17 14:14:52.328173	2022-05-03	استشارة اولية			3	07801402770	ذي قار الناصرية حي اريدو 	بسبب مرض السكري 							f			فيسبوك	حساب دكتور ياسر 		اليد	[{"type":"","area":"اليد","side":""}]	\N
349	رعد عباس جواد 	66	70	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		4350000	2026-02-17 11:24:26.594207	2025-08-18		طرف ثابت فوق الركبة 		2	07827702456	بابل 	قدم سكري 	البس 		دكم 	متحركة 	26R	ميكانيكي ثابت	f			فيسبوك		\N	\N		new
353	جعفر رعد رشك	20	80	170	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-02-09 16:19:00	2015-07-11	مراجع سابق - تم شراء طرف بقيمة 7000000 مليون دينار	بايونيك		1	07715693241	بغداد / مدينه الصدر قطاع 32	انفجار	البس	38	شتل لوك	سنكل	26	بايونيك	f			فيسبوك		\N	\N		past
358	اكرم فوزي محيسن نعيمة 	36	88	178	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق غضروفي في الفقرات القطنية 	0	2026-02-17 15:04:53.055495	2021-05-07	المريض مراجع سابق لمركزنا وجدد اخر بكج له في تاريخ 12/8 من عشر جلسات حيث اخذ منه جلسه واحدة فقط 			3	07803324828	ذي قار الناصرية حي الشموخ 	حمل وزن ثقيل 							f			طبيب خارجي	تحويل من دكتور حسن ناجي 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
347	حسن عبد الحسين هادي وطبان 	27	75	176	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات الغضروفية والعنقيه 	250000	2026-02-17 08:40:06.188522	2024-01-01	استشارة اولية			3	07829503579	ذي قار الناصريه حي الشهداء 	كثرة العمل والحركه الخاطئه 							f			من شخص آخر	عن طريق منتسب / موظف بالضمان الصحي مستشفى العين	انزلاق فقرات، انزلاق فقرات	الرقبة، منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"الرقبة","side":""},{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
350	حيدر مهدي عبادي	39	77	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		1420000	2026-01-10 15:03:00	2025-10-06	مراجع سابق  تم شراء طرف فوق الركبه بقيمه 11000$ وتم دفع المبلغ بالدولار ما يعادل 15620000 والتبقي بذمته 1420000	3R60 + قدم كاربونيه 		1	07703258700	البصره قضاء المدينه	حادث سير	البس			كاربون اسبريت	27	3R60	f			فيسبوك		\N	\N		past
354	حميد كزار  فرحان	38	90	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1200000	2026-01-21 13:35:16	2008-09-16	مراجع سابق - تم شراء طرف اكيلون فاك سابقا - شراء قالب جديد بقيمه  1250000والباقي 750000	اكلون فاك		1	07723880274	بغداد	انفجار 	بلاج فور	26	فا كيوم	اكيلون فاك	26		f			فيسبوك		\N	\N		past
357	رانيه علي عباس	44	67	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-01-26 18:03:00	2024-01-01	مجاني	شتل لوك		1	07712348297	بغداد / كراده داخل	انسداد الاورده	البس	26	شتل لوك 	سنكل اكسز متحركه	25		f			فيسبوك		\N	\N		past
344	شذى مسلم عبد الكريم مبارك	49	90	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	التهاب في الاوتار وتمزق في الاربطة وسوفان 	345000	2026-02-16 17:04:23.552559	2026-06-02	استشارة اولية			3	07830106203	ذي قار الناصرية الحبوبي	حمل زون ثقيل وتعب مستمر 							f			فيسبوك	حساب المركز	تشنج عضلي	منطقة الظهر السفلية	[{"type":"تشنج عضلي","area":"منطقة الظهر السفلية","side":""}]	
363	اسماعيل رحمه عذاب	58	90	183	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-01-10 18:33:00	2024-05-06	12.750.000 دينار عراقي	طرف تحت الركبه فاكيوم 1c62		1	07709944737	بغداد-جميلة	سكري	3d 	28	فاكيوم	كاربون	27		f			فيسبوك		\N	\N		past
372	علي عباس حسن	58	89	185	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		3000000	2026-02-01 16:21:56	2025-08-09	3.000.000 دينار عراقي 	بايونيك		1	07736182704	بغداد - السيدية	سكري	البس	28	فاكيوم	كاربون بايونيك	27		f			فيسبوك		\N	\N		new
376	ليلى تعبان مانع نعمة	57	86	169	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية + الام الظهر  وإعتلال بالعصب 	50000	2026-02-17 16:35:51.508995	2025-05-09	استشارة اولية			3	07831704860	ذي قار الناصرية الحبوبي	حادث سقوط 							f			فيسبوك	حساب دكتور ياسر	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
379	وعد مختار حوشي جبر	43	100	179	physiotherapy	f	احادي - طرف سفلي - يمين	t	قطع في الغضروف الهلالي وتمزق بالرباط الصليبي الامامي 	0	2026-02-17 17:07:14.834185	2025-09-04	استشارة اولية			3	07712815048	ذي قار حي اور	بسبب اصابة اثناء لعبه لرياضة كرة القدم 							f			فيسبوك	دكتور ياسر 	إصابة اربطة	القدم	[{"type":"إصابة اربطة","area":"القدم","side":""}]	\N
368	نور باسل منير	14	55	150	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-17 16:01:26.613621	\N	تمت المعاينة من قبل استاذ سيف وتبين بان المريض عنده تحدد قوي بمفصل الركبة وقصر في الوتر ويحتاج الى تدخل جراحي 			4	07701735978	نينوى-الحمدانية	كيس مائي							t		يمين	فيسبوك		\N	\N		new
369	حسن فرحان جويد	35	84	180	amputee	t	احادي - طرف علوي - يسار	f		500000	2026-02-01 16:06:17	2025-11-13	 تم شراء طرف وقيمته 3000000 دينار عراقي وباقي في ذمته 500000 الف دينار عراقي	صيوان اذن سليكوني		1	07800815121	المثنى - الوركاء	حادث سير	تجميلي						f			فيسبوك		\N	\N		past
407	ضياء الدين لؤي كريم	8	24	90	medical_support	f	احادي - طرف سفلي - يمين	f		125000	2026-02-09 11:17:53	2018-05-02	تم زياره المركز لغرض الفحص مع اخذ قالب مسند afoبسعر 125000الف 			1	07800370381	ذي قار /الرفاعي	اثر زرق ابره 							t	afo	الطرف الايسر	فيسبوك		\N	\N		new
374	خالد هادي فرج	44	69	180	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-02 19:30:00	2024-03-11	4.000.000  دينار عراقي	شتل لوك مع قدم متحركة		1	07904208692	بغداد - كويريش	سكري	البس	26	شتل لوك	سنكل	26		f			فيسبوك		\N	\N		past
914	نجم عبجد اله جودة 	95	90	195	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-08 13:09:01.744649	\N	مراجع سابق /	شتل لوك 		2	07723837185	الكوت 	قدم سكري 	البس		شتل لوك 	سنكل 		لايوجد 	f			فيسبوك					past
375	عباس ضياء مكي	18	86	177	amputee	t	احادي - طرف علوي - يمين	f		0	2026-02-03 19:34:00	2008-06-18	600.000 دينار عراقي	اصبع سليكوني		1	07715461256	ميسان-مركز المدينه عواشة	الة حادة	تجميلي						f			فيسبوك		\N	\N		past
378	هدى سعد حمد	27	68	160	amputee	t	ثنائي - سفلي	f		0	2026-02-17 19:58:00	2019-07-16	مجاني	فوق الركبة اوريون3 والتحت الركبه اكيلون فاك		1	07701726871	صلاح الدين - بيجي -الزوية	انفجار	تحت الركبه بلاج فورد وفوق الركبه اوتو بوك	تحت الركبه 26 وفوق الركبه 40	تحت الركبه فاكيوم فوق الركبة شتل لوك	كلا القدمين اكيلون	26 كلاهما	اوريون 3	f			فيسبوك		\N	\N		past
450	عامر عباس  عبد الهادي	46	73	168	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-21 12:39:08.455679	1980-06-11	مراجع سابق منذ 2025			1	07722673636	بغداد/راشديه	شلل الاطفال الطرف الايمن 							t	kafo  الماني حديث	الطرف الايمن	فيسبوك					past
377	شيماء محمد علي	46	60	172	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-03 16:45:08	1982-06-09	بيان كلفه 28.700.000			1	07701384676	كركوك - طريق بغداد قرب المحلج	شلل اطفال اثر فايروس							t	kafo مقفول ثنائي الماني	كلا الجانبين	فيسبوك		\N	\N		new
307	منوة مرعب شفلح دهام 	53	95	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	سوفان (اجرت عملية تبديل مفصل)	610000	2026-02-14 14:14:45.782226	\N	استشارة اولية			3	07818056626	ذي قار الناصرية حي اور	تعب وجهد بسبب العمل 							f			طبيب خارجي	مصطفى جلود 	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":""}]	\N
373	شمس المنتضر حيدر	9	17		medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-01 19:26:00	2020-07-15	200.000 دينار عراقي			1	07706240936	بغداد - اللطيفية	فايروس .ونوع الاصابة ضعف عضلي في الاطراف السفلى							t	afo	كلا الجانبيين	فيسبوك		\N	\N		past
367	هيثم صبيح خضر	47	70	177	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-01 19:00:00	2024-03-05	تم شراء طرف بقيمه 2.500.000 دينار عراقي	شتل لوك مع قدم سنكل		1	07704561180	بغداد- الدوره ابو دشير	سكري	البس	32	شتل لوك	سنكل	26		f			فيسبوك		\N	\N		past
381	اقبال ناصر عبد محمد 	68	80	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق فقرات الرقبه + سوفان الركبه اليمنى والم الركبه اليسرى + سوفان اليد 	150000	2026-02-18 07:29:19.644135	2015-01-01	استشارة اولية			3	07807823295	ذي قار سوق الشيوخ حي الزهراء 	تقدم العمر 							f			طبيب خارجي	امنه داغر محمد 	سوفان، سوفان، انزلاق فقرات	الركبة، الرسغ، الرقبة	[{"type":"سوفان","area":"الركبة","side":"يمين"},{"type":"سوفان","area":"الرسغ","side":"يمين"},{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	\N
391	بشرى حسين خضير حسين	51	70	168	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	25000	2026-02-18 13:36:33.673707	2021-09-04	استشارة اولية ومن ثم المباشرة بالجلسات			3	07842760377	الناصرية مدينة المهيدية	حركة خطأ وتعب شديد							f			تيك توك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	\N
410	نجاح حسن منسي 	65	104	183	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-10 11:43:14	1994-10-06	مراجع قديم منذ 2025 	طرف تحت الركبه بايونيك		1	07707594616	بغداد /مدينه الصدر 	حادث سير	البس	26	شتل لوك	سنكل	28	تحت الركبه	f			فيسبوك		\N	\N		past
386	رعد مطشر منشد رخيص	39	93	187	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	0	2026-02-18 12:48:11.643897	2026-02-04				3	07812043643	ذي قار  الناصرية سوق الشيوخ	حمل اوزان ثقيلة							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	\N
390	سالم ابراهيم حسين	68	58	165	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-05 13:28:19	2022-01-01	مراجع سابق منذ 2023/تم مراجعه المركز لغرض شراء طرف بقيمه 3000$	فاكيوم		1	07901655153	بغداد/حي العامل 	سكري	بروتد	25	فاكيوم 	ساج	26	تحت الركبه	f			فيسبوك		\N	\N		past
383	رغد حسن عبد 	29	55	160	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		600000	2026-02-04 12:07:47	2022-01-01	مراجع سابق تم شراء طرف بقيمه 4500000/تحتاج تبديل قالب جديد	شتل لوك		1	07772068968	بغداد الباويه 	التهاب مع تليف	البس	26	شتل لوك	سنكل	24		f			فيسبوك		\N	\N		past
408	ماريا عبدالله فالح	2	8	50	medical_support	f	احادي - طرف سفلي - يمين	f		250000	2026-02-10 11:24:51	2025-08-06	 مساند afo عدد 2 مع اضافه مساند رسخ  عدد 2  بقيمه 250000 الف دينار عراقي 			1	07906498210	بغداد /محموديه	لين العضام							t	afo	كلا الجانبين	فيسبوك		\N	\N		new
265	تغريد فيصل صلال ساجت	53	73	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات العنقية 	600000	2026-02-10 13:36:16.363042	2015-05-08	استشارة اولية		علاج طبيعي 	3	07748101607	ذي قار الناصرية المنصورية 	تعب شديد بسبب العمل 							f			انستاغرام		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	
409	جعفر خلدون عباس	4	11	60	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-10 11:37:50	2020-09-04	مراجع سابق منذ 2025			1	07905338033	بغداد/المشتل 	لين العضام							t	مسند تقويمي للظهر 	انحراف العامود الفقري	فيسبوك		\N	\N		past
392	صباح مجيد حسون	54	77	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		3000000	2026-02-05 13:41:01	2014-01-01	تم مراجعه المركز لغرض الفحص مع تحديد نوع الطرف وبسعر قيمه /3000000 / والباقي 2000000	طرف تحت الركبه بايونيك		1	07713057029	بغداد /اليوسفيه	انفجار	البس	32	فاكيوم 	كاربون	26	تحت الركبه	f			فيسبوك		\N	\N		new
389	احمد جليل اسماعيل 	22	72	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-04 13:19:22	2022-02-11	مراجع سابق منذ 2025/لغرض الفحص مع شراء طرف بقيمه 10000000	طرف 3r60		1	07822714862	بغداد/الدوره 	ورم	البس	28	فاكيوم	كاربون	27	3R60	f			فيسبوك		\N	\N		past
388	سعدون جاسم علي 	60	90	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		750000	2026-02-04 13:09:55	2021-01-01	مراجع سابق بتاريخ 2023/ تم شراء طرف بقيمه 5000000/ والمتبقي 750000 	قالب تحت الركبه مع شتل لوك 		1	07801236377	ذي قار 	كارونا	البس	28	شتل لوك	سنكل	27		f			فيسبوك		\N	\N		past
387	علي كاضم عبد الرضا	45	123	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-04 12:50:36	2024-01-01	مراجع سابق بتاريخ 2025/مجاني 	قالب تحت الركبه مع شتل لوك مع غلاف قدم		1	07702740330	بغداد/المشتل 	سكري			شتل لوك				f			فيسبوك		\N	\N		past
385	قيصر داوود منصور 	28	77	173	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-04 12:43:44	2003-01-01	مراجع سابق منذ 2025/تم شراء طرف صناعي تحت الركبه بايونيك بنضام الفاكيوم بقيمه /3000000	طرف تحت الركبه بايونيك		1	07729708736	ديالى الخالص	حادث سير	البس	32	فاكيوم	كاربون	26		f			فيسبوك		\N	\N		past
384	محمد احمد محي الدين	40	70	185	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-04 12:22:16	2024-11-20	مراجع قديم تم شراء طرف بتاريخ 2025/11/22  بقيمة 7000000 / المبلغ مدفوع بالكامل 	3R78		1	07707090572	بغداد /الغدير	حادث سير 	البس	38	شتل لوك	سنكل	27	3R78	f			فيسبوك		\N	\N		past
393	جلال شريف منشد تالي	70	67	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	شلل نصفي 	99999	2026-02-18 14:34:54.376014	2025-07-09	استشارة اولية			3	07807809009	الاصرية مدينة الصدر	جلطة دماغية 							f			فيسبوك		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"كلاهما"}]	\N
342	جندية عطية اعوج محمد	52	65	159	physiotherapy	f	احادي - طرف سفلي - يمين	t	دوار دهليزي وتنشج عضلي 	45000	2026-02-16 14:36:05.201707	2025-10-04	استشارة اولية			3	07831060943	ذي قار الناصرية مجمع تينا 	الام شديدة بعد عملية ازالة تكلس على النخاع الشوكي وتبديل دسكات							f			فيسبوك	وايضا بسبب اولادها طلاب في جامعة العين ومعرفتهم بالمركز وايضًا بسبب صديقة لها تعرف المركز وكانت تعالجة هنا سابقًا	تشنج عضلي	الرقبة	\N	\N
224	 صابرين درويش محمد حسين	37	42	165	physiotherapy	f	احادي - طرف سفلي - يمين	t	ماء بيضاء على الدماغ	530000	2026-02-04 00:00:00	2023-02-14	راجعتنا المريضة سابقا حيث كانت تحت اشراف دكتور مصطفى العضاض 		علاج طبيعي 	3	07815192106	الناصرية حي الزهراء	ارتفاع درجة الحرارة الجسم							f			فيسبوك		تصلب لويحي	الرأس	\N	\N
404	ساميه جواد شهاب 	66	53	177	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1500000	2026-02-08 10:39:14	2025-11-01	مراجع سابق منذ 2025 تم شراء طرف بمبلغ 2500000 مع دفع مبلغ قدره مليون والباقي 1500000 مع اخذ قالب	طرف تحت الركبه بايونيك		1	07728334567	بغداد /حي الجهاد	سكري 	البس	36	شتل لوك	كاربون	26	تحت الركبه	f			فيسبوك		\N	\N		past
394	كرم ظافر معيوف داحس	38	95	187	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	225000	2026-02-18 15:43:38.506647	2020-07-15	تحويل من دكتور علي فاخر			3	07812021786	الناصرية الادارة المحلية	حركة خطأ وتعب شديد							f			طبيب خارجي	دكتور علي فاخر	انزلاق فقرات، انزلاق فقرات	منطقة الظهر السفلية، منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يمين"},{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يمين"}]	\N
396	رفل  مضفر صدام 	28	58	170	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين | ملاحظات: نقص الاصبع الخنصر من الولاده 	f		600000	2026-02-04 08:30:47	1998-11-01				1	07714495666	ميسان /مركز المدينه 	ولادي							f			فيسبوك		\N	\N		new
406	باسمه علي حسين 	55	59	172	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-09 10:56:52	2019-11-01	مراجع سابق منذ 2023 	شتل لوك مع قدم متحركة		1	07832575012	الانبار/فلوجه	سكري	البس	26	شتل لوك	سنكل	26	تحت الركبه	f			فيسبوك		\N	\N		past
405	حامد علي صالح 	58	80	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		700000	2026-02-08 10:49:27	2022-04-07	مراجع سابق منذ 2022 تم شراء سيلكون مع سليب اتوبوك 	فاكيوم		1	07735401140	بابل /الحله	سكري	سيليكون بروتد	38	باسف فاكيوم	ساج	26	تحت الركبه	f			فيسبوك		\N	\N		past
403	طاهر محسن طاهر 	34	80	170	amputee	t	احادي - طرف علوي - يسار	f		1000000	2026-02-08 10:21:56	2025-08-07	مراجع سابق منذ 2025 تم شراء يد سلكوني تجميليه بقيمه 6000000 والباقي مليون 	يد سلكونيه تجميليه مع عكس ميكانيكي الماني		1	07815480939	نجف /حي النصر	حادث عمل	البس	20	فاكيوم				f			فيسبوك		\N	\N		past
402	احمد عبد علي مطرود 	46	82	178	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-07 09:47:50	2023-08-05	مراجع سابق منذ 2025	طرف تحت الركبه بايونيك		1	07735387228	بابل/المسيب	حادث سير	البس	38	شتل لوك	كاربون	27	تحت الركبه	f			فيسبوك		\N	\N		past
401	عباس فاضل نجيب 	59	67	165	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-07 09:43:29	2003-09-06	مراجع سابق منذ 2025 	3R78		1	07712716767	ديالى /بعقوبه	انفجار	البس	38	شتل لوك	سنكل	25	3R78	f			فيسبوك		\N	\N		past
400	جبار زينل محمد 	52	74	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		3000000	2026-02-07 09:37:44	1990-09-01		طرف تحت الركبه بايونيك		1	07715105727	بغداد/جسر ديالى 	حادث سير	البس	36	شتل لوك	كاربون	26	تحت الركبه	f			فيسبوك		\N	\N		new
399	حسن سهيل نجم	13	38	120	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-01-20 08:59:20	2025-08-01	تم مراجعه المركز لغرض الفحص مع تحديد نوع الطرف وبعد الفحص تم تخصيص طرف صناعي نوع 1c63 فاكيوم وبسعر 9000000مع دفع المبلغ كامل مع اخذ القالب 	1c63		1	07710902447	بغداد /عويريج 	حادث سير	الماني	24	فاكيوم	1c63	24	تحت الركبه	f			فيسبوك		\N	\N		new
237	بيداء حسين متاني فزاع	48	92	163	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات العنقية 	185000	2026-02-05 00:00:00	\N	استشارة اولية		علاج طبيعي	3	07831060961	ذي قار الناصرية شارع الاخلاص 	تعب شديد بسبب العمل وكذلك المريضة متعرضة لحادث سقوط 							f			تيك توك	من قبل برامج التواصل الاجتماعي بالاضافة الى نصائح بعض الاشخاص الذين عالجوا في المركز	انزلاق فقرات	الرقبة	\N	\N
421	ياسين براء عباس	12	40	65	amputee	t	ثنائي - سفلي	f		0	2026-02-12 13:16:49	2013-06-12	مراجع سابق منذ 2025	طرفان لوك ني		1	0790816349	بغداد /حي اور	ولادي	البس	24	شتل لوك	سنكل	20	فوق الركبه	f			فيسبوك					past
429	حسين علوان مانع فيصل	38	88	175	physiotherapy	f		t	انزلاق الفقرات العنقية  + الام الظهر 	20000	2026-02-19 20:41:13.591763	\N			أجهزة علاج طبيعي	3	07808291032	ذي قار الناصرية سومر								f			من شخص آخر					\N
427	محمد عبد مريح شياع	52	75	170	physiotherapy	f		t	انزلاق غضروفي 	0	2026-02-19 18:24:37.88112	\N	استشارة اولية			3	07831003866	ذي قار الناصرية الصالحية 	بسبب الجهد والتعب والعمل المستمر 							f			فيسبوك		انزلاق فقرات	الحوض، الورك	[{"type":"انزلاق فقرات","area":"الحوض","side":"كلاهما"},{"type":"","area":"الورك","side":"كلاهما"}]	\N
424	مدلول خليف ايدام عواد	88	95	160	physiotherapy	f		t	ضمور بالعضلات 	875000	2026-02-19 17:52:52.486434	\N			تمارين تأهيلية	3	07802413261	ذي قار الناصرية سومر 	بسبب عملية بروستات مسبقة 							f			فيسبوك	صفحة المستشفى	ضمور عضلي	الفخذ	[{"type":"ضمور عضلي","area":"الفخذ","side":"كلاهما"}]	\N
423	خلود عبدالله احمد 	65	50	172	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		900000	2026-02-19 13:51:27.525161	2023-03-08	مراجع سابق منذ 2023 /	شتل لوك		1	07706320304	بغداد/البياع	سكري	البس	26	شتل لوك	سنكل	26	تحت الركبه	f			فيسبوك					past
432	خليل طاهر صلال علي 	65	75	170	physiotherapy	f		t	ضعف حركة الجه اليسرى 	0	2026-02-21 05:38:50.348912	\N	استشارة اولية النص بعد الترتيب والصياغة الرسمية:  حضر مرافق المريض فقط نظرًا لبُعد سكنهم، وذلك للاستفسار عن الجلسات وجهاز الروبوت. وبعد أن تم شرح الحالة والإجراءات له بشكل كامل، قرر إحضار والده للمعاينة، ومن ثم البدء بالخطة العلاجية حسب تعليمات الطبيب المعالج.		استشارة طبية	3	07828966870	المثنى السماوه _ حي الجامعة 	جلطة دماغية 							f			من شخص آخر	عن طريق ضرغام الحسناوي 	جلطة دماغية	العمود الفقري	[{"type":"جلطة دماغية","area":"العمود الفقري","side":"يسار"}]	\N
425	اقبال محمد دبيس حمود	55	82	155	physiotherapy	f		t	انزلاق غضروفي وخشونة واكياس على الركبتين	300000	2026-02-19 18:11:13.688573	\N			أجهزة علاج طبيعي	3	07835031502	ذي قار الغراف	تعب شديد بسبب العمل والتقدم بالعمر							f			فيسبوك		انزلاق فقرات، سوفان	منطقة الظهر السفلية، الركبة	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""},{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	\N
422	ناصر حميد فارس	39	80	170	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-02-12 13:34:22	2014-10-08		oreon3 		1	07800983693	صلاح الدين/سامراء	انفجار	اوسور حلقي	38	فاكيوم 	كاربون	26	اوريون 3	f			فيسبوك					past
420	فاروق امير شمران	53	75	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-12 13:08:13	2023-07-12	مراجع سابق منذ 2023	شتل لوك		1	07505886050	بغداد /عويريج	سكري 	البس	32	شتل لوك	سنكل	27	تحت الركبه	f			فيسبوك					past
419	فاطمه زياد طارق 	13	44	144	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-02-12 12:58:51	2025-11-12	مراجع سابق منذ 2025 			1	07801399639	البصره /الجبيله	حمل حقيبه المدرسه 							t	حزام تقويمي للظهر	انحراف العامود الفقري	فيسبوك					past
418	جاسم صالح كاظم 	57	52	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-02-11 12:51:38	2024-04-01	مجاني	لوك ني		1	07705877520	بغداد /مدينه الصدر	انسداد الشرايين   	البس	28	شتل لوك	سنكل	27	لوك ني	f			فيسبوك					new
397	رائد عزيز عوده سهر	48	72	163	physiotherapy	f	احادي - طرف سفلي - يمين	t	تليف الرقبه 	150000	2026-02-19 08:38:18.624329	2026-02-01	حضر المريض للاستشارة وباشر بعد الاستشارة مباشرا			3	07814379332	ذي قار الناصريه جي اريدو 	كثرة العمل على الكمبيوتر 							f			من شخص آخر	عن طريق مراجع (صباح )	تشنج عضلي	الرقبة	[{"type":"تشنج عضلي","area":"الرقبة","side":""}]	
416	كاظم جهاد مجباس 	70	93	177	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-02-11 12:20:15	2024-04-20	مراجع سابق منذ 2025	لوك ني		1	07700657350	بغداد /الحسينينه 	انسداد الشرايين   	البس	38	شتل لوك	سنكل	27	لوك ني	f			فيسبوك		\N	\N		past
415	منى داوود علي 	55	67	165	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1000000	2026-02-11 12:16:30	1978-06-01	في /11/2 تم شراء طرف جوبارت بمبلغ 3ملايين تم دفع مليونين  دينار عراقي والباقي مليون  مع اخذ قالب	جوبارت		1	07902134143	بغداد/الكاظميه	حادث سير 				سنكل	25	تحت الركبه	f			فيسبوك		\N	\N		past
417	مير مصطفى محمد 	4	13	70	medical_support	f		f		75000	2026-02-11 12:44:07	2022-01-13				1	07704105511	سليمانيه /راب برين	ولادي							t	حزام تدوير 	كلا الجانبين	فيسبوك					new
380	محمد محسن يونس جبر 	30	78	170	physiotherapy	f	احادي - طرف سفلي - يمين	t	(صداع عنقودي - ضغوط نفسية) حسب كلام الاطباء 	195000	2026-02-17 18:02:26.039366	2021-06-01	استشارة اولية			3	07807954844	ذي قار الناصرية سومر 	استخدام الهاتف لفترات طويلة 							f			كوكل		تشنج عضلي	الرقبة	[{"type":"تشنج عضلي","area":"الرقبة","side":""}]	\N
444	مصطفى عبد الرحمن محمد 	29	73	170	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-02-15 09:40:51	2006-07-05	مراجع سابق منذ 2025 	ميركوري		1	07814860354	بغداد/ابو غريب 	انفجار 	البس	34	شتل لوك 	اسبرت	26	مير كوري بريطاني	f			فيسبوك					past
238	حسين حمود جبار حسين	16	65	176	physiotherapy	f	احادي - طرف سفلي - يمين	t	كسر مفصل اليد اليسرى	475000	2026-02-07 00:00:00	2025-12-05	استشارة اولية 		علاج طبيعي	3	07862030522	ذي قار  قضاء الشطره	حادث دهس							f			طبيب	دكتور علي مالك	كسر	اليد	\N	\N
434	احمد راسم كريم خماط	25	85	187	physiotherapy	f		t	تمزق فقرات الرقبه مع انزلاق بسيطه 	25000	2026-02-21 07:22:35.501414	\N	استشارة اولية		استشارة طبية	3	07830749579	ذي قار الشطره الخالصه 	اصابة رياضيه نتيجة التمارين 							f			مستشفى	مستشفى الكفيل 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	\N
435	احمد ناصر حسين خليف 	32	130	172	physiotherapy	f		t	انحراف فقرات 	150000	2026-02-21 07:33:46.013063	\N	استشارة اولية		استشارة طبية	3	07825649185	ذي قار الناصريه حي الرافدين 	رفع اثقال 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
449	احمد حسن هاشم عكله	60	80	170	physiotherapy	f		t	انزلاق بالفقرات 	0	2026-02-21 11:23:16.386761	\N	استشارة اولية		استشارة طبية	3	07822647955	ذي قار سوق الشيوخ 	تقدم العمر 							f			من شخص آخر	مراجع قديم باسم سكينه كريم 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
426	محمد مهدي عبود حمود	57	85	170	physiotherapy	f		t	انزلاق بالفقرات القطنية 	275000	2026-02-19 18:17:32.660881	2026-02-12				3	07833037941	ذي قار الناصرية سومر	حمل وزن ثقيل 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
448	زينب هادي عبد الحسين 	22	65	160	amputee	t	ثنائي - سفلي	f		0	2026-02-21 11:11:00.622354	\N				2	07801145614	نجف 	ولادي 							f			فيسبوك					new
395	رشا علي جتول عوين	37	80	169	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق الفقرات القطنية + الام الظهر 	150000	2026-02-19 06:02:36.187448	\N	باشرت المريضة بعد استشارة دكتور عبد الله مرة اخرى حيث انها كانت تراجعه سابقًا واخذت فترة استراحة لمدة شهر وعاودت جلساتها الان			3	07826984155	الصالحيه	بسبب الجهد والتعب 							f			من شخص آخر	من قبل مراجع قديم حصل نتائج جيدة 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
446	سعد خلف حسن	51	73	169	amputee	t	احادي - طرف علوي - يسار	f		0	2026-02-21 10:25:35.992277	2014-03-12	مجاني 			1	07812268699	بغداد/الحريه	انفجار							f			فيسبوك					new
437	محمد اسماعيل حربي	71	85	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-21 08:38:56.258901	1998-05-13				1	07812560476	بغداد /اليوسفيه 	حادث سير							f			فيسبوك					new
447	محمد علي حسين 	53	95	173	amputee	t	احادي - طرف علوي - يمين	f		0	2026-02-16 10:39:52	1970-09-09	مراجع سابق منذ 2025	يد سلكونيه تجميليه مع عكس ميكانيكي الماني		1	07815600821	بغداد/الزعفرانيه	ولادي	البس	20	فاكيوم			يد تجميليه سيلكونيه	f			فيسبوك					past
445	ليان براء صاحب 	11	32	105	medical_support	f	اطراف سليكونية تعويضية - -	f		1250000	2026-02-16 10:09:40	2021-02-10				1	07804281011	كربلاء /حي الموظفين 								t	تقويمي للظهر 	انحراف العامود الفقري	فيسبوك					new
443	خير الله ناصر جواد 	29	60		amputee	t	ثنائي - سفلي	f		0	2026-02-14 09:34:38	2017-07-06	مراجع سابق منذ 2023 	قالب فوق الركبه عدد 2		1	07815650870	الانبار 	انفجار 	البس	38	شتل لوك	كاربون	24	هايبرد ياباني	f			جهة حكومية					past
442	علي محمد فاهم 	20	95	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-14 09:19:44	2014-09-10	مراجع سابق منذ 2025 	فاكيوم		1	07861044331	بغداد/المحموديه 	حادث سير 	بروتد	26	فاكيوم 	سنكل	26	تحت الركبه	f			فيسبوك					past
441	اونس جبار شكر 	49	95	172	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		900000	2026-02-14 09:09:57	2003-10-02	مراجعه سابقه منذ 2023 	oreon3 		1	07823853198	بغداد/البياع	ورم	اوسور حلقي	34	شتل لوك	كاربون	26	فوق الركبه	f			فيسبوك					past
440	مينا ليث عبد اللطيف 	5	8	70	medical_support	f	احادي - طرف سفلي - يمين	f		75000	2026-02-14 08:55:51	2022-07-13				1	07883541180	بغداد/الرشيد	ولادي مع الجلوس الخاطئ على شكل w							t	حزام تدوير 	كلا الجانبين	فيسبوك					new
439	محمد ستار جويعد 	29	77	176	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		8000000	2026-02-14 08:48:01	2025-01-08	تم اخذ قالب 	3R78		1	0770709072	بغداد/مدينه الصدر 	حادث سير 	البس	28		سنكل		3R78	f			فيسبوك					new
438	حامد محمد هداف 	62	100	176	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-14 08:42:57	1986-11-12		بايونيك		1	07902957537	بغداد /حي الخظراء 	انفجار							f			فيسبوك					new
436	فؤاد خالد غانم 	29	60	173	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		6000000	2026-02-05 08:28:19	2017-08-03		بايونيك مع روتيشن دوار		1	07823052181	البصره /حي الفاو	حادث سير	البس	28		سنكل	26	بايونيك	f			فيسبوك					new
453	حميد كافي عودة حسن 	62	86	170	physiotherapy	f		t	انزلاق بالفقرات القطنية 	150000	2026-02-21 16:52:16.100278	\N			أجهزة علاج طبيعي	3	07802177019	ذي قار الناصرية قرب جسر النبي ابراهيم	حمل وزن ثقيل وتعب وجهد مستمر							f			فيسبوك					\N
454	مهدي جايد عليوي زويهي 	62	70	175	physiotherapy	f		t	جلطة دماغية 	0	2026-02-21 17:15:33.281907	\N			استشارة طبية	3	07803431078	ذي قار الناصرية حي العسكري 	بسبب جلطة قديمة سببت له نزيف بالدماغ حيث ترك علاجه واثناء ذلك تعرض الى حادث سيارة ادى الى جلطة اخرى 							f			فيسبوك	حساب المركز 				\N
459	وسام محمد بجاي هدمول 	50	74	178	physiotherapy	f		t	داء النقرس وضعف بالعضلات 	0	2026-02-21 18:37:44.822394	\N			استشارة طبية	3	07840004032	ذي قار الشموخ 								f			فيسبوك	دكتور ياسر 				\N
455	احمد كاظم سلمان مهوس 	36	70	165	physiotherapy	f		t	ترنح بالمخيخ واعتلال بالعمود الفقري 	200000	2026-02-21 17:39:14.379843	\N			استشارة طبية	3	07816190682	ذي قار الفهود 								f			طبيب خارجي	يحيى عبد الرزاق 				\N
457	كفاية عجيل صالح ستار 	48	98	156	physiotherapy	f		t	تسطح بالقدم 	50000	2026-02-21 18:20:17.955367	\N			أجهزة علاج طبيعي	3	07869193375	ذي قار سيد دخيل 								f			دكتور بيرم					\N
461	علي مرتضى فرج خلف 	13	44	145	physiotherapy	f		t		25000	2026-02-21 19:22:53.142235	2026-02-19			أجهزة علاج طبيعي	3	07801303624	الناصرية منطقة الخميسات 								f			من شخص آخر		تشنج عضلي	الرقبة	[{"type":"تشنج عضلي","area":"الرقبة","side":""}]	\N
468	انعام جعفر حسين غاوي	55	80	159	physiotherapy	f		t	انزلاق بالفقرات 	225000	2026-02-22 07:26:09.020336	2024-08-07	استشارة اولية		استشارة طبية	3	07819871258	الناصرية منطقة اريدو	جهد وتعب مستمر بسبب العمل							f			فيسبوك		انزلاق فقرات	منطقة الظهر العلوية	[{"type":"انزلاق فقرات","area":"منطقة الظهر العلوية","side":"يمين"}]	\N
464	محمد عبد هداد علي 	50	73	180	physiotherapy	f		t	انزلاق بالفقرات القطنية 	0	2026-02-21 20:13:32.031371	\N	استشارة اولية		استشارة طبية	3	07830372250	ذي قار الناصرية حي اور 								f			فيسبوك	دكتور ياسر 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
466	حوراء سجاد عبد الحميد جلاب 	12	39	130	physiotherapy	f		t	ورم + كسر بالركبه 	75000	2026-02-22 05:31:38.053053	\N	استشارة اولية		استشارة طبية	3	07810838503	ذي قار الناصريه دور النفط 	سقوط على ارضية 							f			طبيب خارجي	دكتور غيث علي مطر	كسر	الركبة	[{"type":"كسر","area":"الركبة","side":""}]	\N
451	انس ابراهيم سلمان	16	72	169	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-21 13:00:44.848493	2023-12-07	مراجع سابق منذ 2025	بايونيك		1	07832100770	بغداد/الدوره	حادث سير	البس	26	فاكيوم	كاربون	26	تحت الركبه	f			فيسبوك					past
49	علي عطية مرهج 	26	84	165	amputee	t	ثنائي - سفلي	f		2000000	2026-01-17 18:21:00.616295	2025-01-17	الطرف الايمن نبتر بسنة 2015 والطرف الايسر نبتر بسمة 2025 بسبب تشوه ولادي 	باسف فاكيوم مع قدم متحركة سنكل 		1	07728881299	بغداد / جسر ديالى 	تشوه ولادي 	البس امريكي مع سليف البس امريكي	26	فاكيوم	متحركة سنكل	26	لايوجد 	f			فيسبوك		\N	\N		past
462	عفاف راضي عبد الحسين محسن	52	56	150	physiotherapy	f		t	انزلاق وتاكل بالغضاريف 	50000	2026-02-21 19:46:11.649902	\N			أجهزة علاج طبيعي	3	07807155335	ذي قار شارع بغداد 								f			دكتور بيرم		انزلاق ديسك	الرقبة	[{"type":"انزلاق ديسك","area":"الرقبة","side":""}]	\N
465	صادق محمد عبيد هداد 	47	84	180	physiotherapy	f		t	شلل نصفي 	50000	2026-02-22 05:21:00.068309	2025-06-01	باشر المريض اليوم باول جلسة من جلسات العلاج الطبيعي بعد استشارة الدكتور بيرام 		تمارين تأهيلية	3	07817884030	ذي قار الشطره 	جلطة دماغية 							f			دكتور بيرم		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":""}]	\N
463	علاء مزهر ميس جابر 	50	85	170	physiotherapy	f		t	انزلاق بالفقرات القطنية 	250000	2026-02-21 19:53:40.027975	\N			أجهزة علاج طبيعي	3	07805817715	ذي قار الصالحية 	جهد وتعب مستمر بسبب العمل							f			دكتور بيرم		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
456	عادل محمود ناصر علي 	34	80	182	physiotherapy	f		t	انزلاق بالفقرات القطنية 4،5	250000	2026-02-21 17:56:55.234761	2025-05-21	استشارة اولية		استشارة طبية	3	07823212496	ذي قار الاصلاح 	حمل وزن ثقيل 							f			من شخص آخر	توصية من صديق 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
467	حميد فهد جابر فلول	55	60	171	physiotherapy	f		t	شلل الاطراف السفلى	3100000	2026-02-22 06:48:41.146379	\N	المباشرة بعد التحويل من دكتور بيرم		أجهزة علاج طبيعي	3	07803364716	الناصرية مدينة الصدر	طلق ناري بالظهر							f			طبيبنا	دكتور بيرم	اصابة حبل شوكي	منطقة الظهر السفلية	[{"type":"اصابة حبل شوكي","area":"منطقة الظهر السفلية","side":"كلاهما"}]	\N
470	ذوالفقار يونس حسين 	1	13	75	medical_support	f		f		200000	2026-02-22 08:41:26.06504	2025-10-08				1	07764076448	بغداد/الدوره	نقص فيتامين دي							t	kafo ليلي 	كلا الجانبين	من شخص آخر					new
458	جهاد محمد حشف مجدي 	25	70	180	physiotherapy	f		t	طلق ناري 	1525000	2026-02-21 18:24:02.869659	\N			أجهزة علاج طبيعي، روبوت	3	07810920030	سيد دخيل 								f			طبيب خارجي	حسن ناجي ال شدود		الرأس	[{"type":"","area":"الرأس","side":""}]	\N
475	نور كاظم نعاس عبود	27	65	153	physiotherapy	f		t	سوفان بالفقرات	0	2026-02-22 10:07:37.84774	2026-02-22	استشارة اولية		أجهزة علاج طبيعي	3	07829503226	الناصرية الحبوبي	جهد وتعب مستمر بسبب العمل							f			من شخص آخر		سوفان	الرقبة	[{"type":"سوفان","area":"الرقبة","side":"كلاهما"}]	\N
483	كطران ابراهيم جبر ناصر 	55	60	170	physiotherapy	f		t	جلطة دماغية	25000	2026-02-22 16:49:54.806625	\N			استشارة طبية	3	07821295148	ذي قار ال ازيرج								f			فيسبوك		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":""}]	\N
473	وسام حطاب رزوقي 	45	85	177	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		250000	2026-02-22 09:45:51.941734	2005-01-26	مراجع سابق منذ 2025	قالب فوق الركبه  مع سليكون اتوبك مع شتل لوك		1	07733332273	البصره/جبيله	حادث سير	اوتوبوك	38	شتل لوك				f			فيسبوك					past
482	خالد جبار كاطع خضير 	30	63	165	physiotherapy	f		t	ورم في الدماغ سببت في مضاعات في الاعصاب والتهاب 	25000	2026-02-22 16:36:15.733361	\N	استشارة اولية		استشارة طبية	3	07812825511	ذي قار الناصرية حي الشهداء 								f			مستشفى	بسبب تواجدهم الكثير في المستشفى 		المعصم، الكتف	[{"type":"","area":"المعصم","side":""},{"type":"","area":"الكتف","side":"كلاهما"}]	\N
486	حسين لفته مطشر عجيل 	54	104	182	physiotherapy	f		t	تمزق في اربطة الكتف 	25000	2026-02-22 18:43:59.736851	\N			أجهزة علاج طبيعي	3	0783201003	ذي قار الصالحية 								f			من شخص آخر		تشنج عضلي	الكتف	[{"type":"تشنج عضلي","area":"الكتف","side":"يمين"}]	\N
274	رفل رائد معلك حنون	30	57	155	physiotherapy	f	احادي - طرف سفلي - يمين	t	قصر بالقدم وكذلك ضمور عضلي	125000	2026-02-11 10:30:08.087713	1996-06-12			علاج طبيعي 	3	07810942914	الناصرية مجمع تينة	قصر بالقدم							f			من شخص آخر		ضمور عضلي	الفخذ	\N	\N
485	رحيم صبر حسن عكيلي	55	85	170	physiotherapy	f		t	انزلاق بالفقرات القطنية 	150000	2026-02-22 18:00:59.823879	2025-11-12	استشارة اولية		استشارة طبية	3	07816012476	ذي قار الناصرية كرمط بني سعيد	تعب شديد بسبب العمل 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
484	خالد باسم محمد علي	47	126	190	physiotherapy	f		t	سوفان بالركبة والفقرات العنقية 	25000	2026-02-22 16:55:37.320338	\N	استشارة اولية		استشارة طبية	3	07831002778	ذي قار الناصرية الشموخ	بسبب العمل المستمر وبلاتين في الركبة 							f			فيسبوك					\N
481	علي السجاد عادل 	10	30	135	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-02-22 12:30:55.38112	\N		طرف تحت الركبة تيتانيوم 		2	07766961375	كربلاء 	قذيفة حرب	حلقي برغي	24	دكم	ثابتة 	20	لايوجد 	f			فيسبوك					past
480	سامي حامي عباس كسار 	59	85	170	physiotherapy	f		t	تشنج الساق اليمنى 	200000	2026-02-22 11:45:03.461384	\N	باشر المريض بعد استشارة الدكتور بيرام مع الدكتور عبد الله خان 		أجهزة علاج طبيعي	3	07801096044	ذي قار قضاء الننصر 	اصابه رياضيه 							f			دكتور بيرم		تشنج عضلي	الساق	[{"type":"تشنج عضلي","area":"الساق","side":"يمين"}]	
477	نور سفيان محمد صباح 	1	15	60	medical_support	f		f		200000	2026-02-22 10:26:01.491498	2025-02-04				1	07802130081	بغداد/اليوسفيه	ولادي							t	kafo ليلي عدد2	كلا الجانبين	طبيب خارجي					new
478	محمد قاسم علي	23	42	155	medical_support	f		f		0	2026-02-22 10:43:10.831856	2003-05-14	مراجع سابق منذ 2025 مجاني			1	07708516070	بغداد/الشعب	ولادي							t	طرف مسند مع قدم ساج فود	الجهه اليمنى	فيسبوك					past
433	اشرف مطشر عمران موسى 	42	74	169	physiotherapy	f		t	انزلاق الفقرات العنقية  + تشنج الام الظهر 	200000	2026-02-21 06:16:12.385318	2024-07-01	باشر المريض بتاريخ اليوم بعد استشارة الدكتور بيرام 		أجهزة علاج طبيعي	3	07828706920	ذي قار الناصريه حي اور	كثرة انحناءات الراس 							f			دكتور بيرم	عن طريق ضرغام الحسناوي 	انزلاق فقرات، تشنج عضلي	الرقبة، منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"الرقبة","side":""},{"type":"تشنج عضلي","area":"منطقة الظهر السفلية","side":""}]	
452	عبد الرزاق جوي منعم	61	75	176	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-21 13:22:43.082497	2025-08-13	مراجع سابق منذ 2025	طرف تحت الركبه شتل لوك مع قدم متحركه		1	07849990995	بغداد/الطالبيه	سكري	البس	32	شتل لوك	سنكل	27	لايوجد 	f			فيسبوك					past
479	رسول جاسم عطيه 	42	72	167	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-02-21 11:10:32	2006-11-08	مراجع سابق منذ 2023 علما انه جريح داخليه 			1	07703661227	ديالى 	انفجار	حلقي	36	شتل لوك	سنكل	26	لايوجد 	f			جهة حكومية					past
249	ليلى سالم زاجي دفار 	48	100	160	physiotherapy	f	احادي - طرف سفلي - يمين	t	انزلاق بالفقرات 	250000	2026-02-08 00:00:00	2022-01-01	جضرت المريضه للمراجعه عند الدكتور بيرام باغش بتاريخ 21/1/2025 وباشرت اليوم جلستها الاولى حسب الخطه العلاجيه المخصصه لها 		علاج طبيعي 	3	07711683631	ذي قار الفهود 	كثرة الانحناء واعالة مريض							f			طبيب	دكتور بيرام باغش 	انزلاق فقرات	منطقة الظهر السفلية	\N	\N
916	رعد حميد زاهي 	30	75	170	amputee	t	احادي - طرف سفلي - يمين - خلال الركبة	f		0	2026-04-08 13:14:58.302294	\N	داخلية/ مراجع سابق	اللوكس		2	07805382886	ذي قار 	انفجار صاروخ 	سوفت 		سوفت سوكت	دانيا ستي 		اللوكس	f			فيسبوك					past
487	هيثم عبد الحسن عداي سعدون 	54	75	165	physiotherapy	f		t	جلطة دماغية 	25000	2026-02-22 18:57:55.558003	\N	استشارة اولية		تمارين تأهيلية	3	07804003711	ذي قار الزديناوية 	بسبب عصبية ادت الى اصابته بجلطة دماغية 							f			فيسبوك		جلطة دماغية	الساق	[{"type":"جلطة دماغية","area":"الساق","side":"كلاهما"}]	\N
490	مرتضى خضير ياسر جبار 	29	56	170	physiotherapy	f		t	عرق النسا	25000	2026-02-22 19:58:39.284563	\N	استشارة اولية		استشارة طبية	3	07800919843	ذي قار الناصرية حي اريدو 								f			فيسبوك			منطقة الظهر السفلية	[{"type":"","area":"منطقة الظهر السفلية","side":""}]	\N
492	محمد جاسم كاظم جاسم 	48	40	170	physiotherapy	f		t	شلل نصفي للجزء الايسر 	0	2026-02-23 06:19:55.437804	2022-07-01	استشارة اولية بدون حضور المريض حضر ذوي المريض فقط مع تقارير المريض كامله للاستفسار من الطبيب 		استشارة طبية	3	07812438585	ذي قار سوق الشيوخ حي العسكري 	جلطة دماغية 							f			فيسبوك	ضرغام الحسيناوي 	جلطة دماغية، جلطة دماغية	الساق، اليد	[{"type":"جلطة دماغية","area":"الساق","side":"يسار"},{"type":"جلطة دماغية","area":"اليد","side":"يسار"}]	\N
489	عباس مالح عاجل طويرش 	27	75	160	physiotherapy	f		t	فشل كلوي واعتلال باعصاب القدم 	100000	2026-02-22 19:32:49.582523	\N			استشارة طبية	3	07827051603	ذي قار الناصرية حي اور 								f			من شخص آخر	ضرغام الحسيناوي 		منطقة الظهر السفلية	[{"type":"","area":"منطقة الظهر السفلية","side":""}]	\N
491	غنيه عنان حمزه مطر	70	80	170	physiotherapy	f		t	سوفان السفل الركبه للساقين لكن الالم بالساق اليسار اكثر 	250000	2026-02-23 06:10:10.004937	2026-02-10	استشارة اولية		استشارة طبية	3	07821562248	ذي قار الناصريه المنصوريه 	تقدم العمر 							f			من شخص آخر	من طرف مراجعه قديمه باسم زينب فليح 	سوفان	الساق	[{"type":"سوفان","area":"الساق","side":"يسار"}]	\N
494	عدويه منشد عوده جبر 	52	125	160	physiotherapy	f		t	انزلاق الفقره الرابعة والخامسة 	0	2026-02-23 08:02:03.001586	2025-02-17	استشارة اولية بدون حضور المريضه حضر ذوي المريضه فقط مع تقارير المريضه كامله للاستفسار من الطبيب 		استشارة طبية	3	07811568997	ذي قار الناصريه حي الفرات 	زيادة الوزن + قلة الحركه 							f			فيسبوك	حساب دكتور ياسر 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
500	يحيى ابراهيم طرعيل	33	70	165	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-02-23 10:59:02.046186	2016-04-12	مراجع سابق منذ 2023 مجاني 			1	07737425414	دبالى 	حادث سير	البس		شتل لوك	سنكل	26		f			فيسبوك					past
488	حسنة شرشاب خليف فنطيل 	60	75	160	physiotherapy	f		t	تشنج وضعف بالعصب 	250000	2026-02-22 19:16:11.986276	\N	استشارة اولية		أجهزة علاج طبيعي	3	07814160170	ذي قار البطحاء 	بسبب جلطة سابقة 							f			من شخص آخر		تشنج عضلي	الكتف	[{"type":"تشنج عضلي","area":"الكتف","side":""}]	\N
501	رغد حازم محمد عسكر	49	76	164	physiotherapy	f		t	انزلاق بالفقرات العنقية 	25000	2026-02-23 16:20:58.572266	\N			أجهزة علاج طبيعي	3	07827780508	ذي قار مجمع تينا 	بسبب العمل والجهد المستمر 							f			دكتور بيرم		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	\N
493	عزيز سمير جبر رومي	62	70	165	physiotherapy	f		t	انزلاق دسك	175000	2026-02-23 06:51:43.652389	2026-02-23	استشارة اولية ومن ثم باشر بالجلسة		استشارة طبية	3	07812476464	ذي قار الشطرة	جهد وتعب مستمر بسبب العمل							f			من شخص آخر		انزلاق ديسك	منطقة الظهر السفلية	[{"type":"انزلاق ديسك","area":"منطقة الظهر السفلية","side":"يسار"}]	\N
495	قاسم بزيع راضي عباس 	85	80	165	physiotherapy	f		t	ضعف حركي للساقين 	275000	2026-02-23 08:33:01.884011	2025-02-01	المراجع كان قد تمت متابعته منذ شهر 12، حيث لوحظ آنذاك تحسّن ممتاز في حالته. وقد راجعنا حالياً بعد انقطاع لفترة عن المراجعة والعلاج، ويعاني حالياً من قلة في الحركة وضعف حركي ملحوظ.		أجهزة علاج طبيعي	3	07805340405	ذي قار الناصريه الصالحيه 	تقدم العمر 							f			فيسبوك	صحفة المستشفى 	تشنج عضلي	الساق	[{"type":"تشنج عضلي","area":"الساق","side":"كلاهما"}]	\N
476	عباس بشير ضهد نويصر	22	79	171	physiotherapy	f		t	انزلاق بالفقرات 	75000	2026-02-22 10:15:30.960733	2026-02-22	استشارة اولية		استشارة طبية	3	07818136507	الناصرية منطقة التضحية	كثرة الغمل							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
498	طالب احمد هاشم كبيح 	36	79	173	physiotherapy	f		t	انزلاق الفقرات الرابعه والخامسة وتم اجراء عمليه بتاريخ 26/11/2025 	150000	2026-02-23 10:36:45.490713	\N	استشارة اولية 		استشارة طبية	3	07831917092	ذي قار الناصريه شارع 20 	كثرة العمل							f			فيسبوك	ضرغام الحسيناوي 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
499	انتصار عاشور خلف عاجل	48	79	160	physiotherapy	f		t	انحراف وانزلاق الفقرات القطنيه	100000	2026-02-23 10:51:33.688943	2017-05-01	استشارة اولية		استشارة طبية	3	07803041092	ذي قار قلعة سكر	اثر سقوط							f			فيسبوك	صحفة المستشفى 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
506	اسامة كاظم فاخر دهيش	45	85	170	physiotherapy	f		t	3 جلطات في الدماغ 	50000	2026-02-23 18:59:05.837812	\N			استشارة طبية	3	07718587888	ذي قار الفهود	عصبية مفردة 							f			طبيبنا	مريض قديم للمركز	جلطة دماغية	الساق	[{"type":"جلطة دماغية","area":"الساق","side":""}]	\N
507	غزوان عبد الامير حسين حسن	38	99	178	physiotherapy	f		t	انزلاق بالفقرات القطنية مع بداية سوفان 	250000	2026-02-23 20:36:11.341671	\N	استشارة اولية		أجهزة علاج طبيعي	3	07810505075	ذي قارلا الناصرية الشموخ	بسبب رياضة 							f			طبيبنا	مريض قديم للمركز	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
509	كرار عارف خيون جبر	28	50	169	physiotherapy	f		t	شلل الاطراف السفلية 	0	2026-02-24 07:34:47.253283	\N			استشارة طبية	3	07829317485	ذي قار قضاء سيد دخيل	سببه ابو صفار منذ الطفولة							f			فيسبوك		شلل دماغ	الرأس	[{"type":"شلل دماغ","area":"الرأس","side":"كلاهما"}]	\N
510	سيناء علي حسين عذاب	53	95	170	physiotherapy	f		t	اجراء عملية تبديل دسكات 	25000	2026-02-24 09:18:16.67943	\N			أجهزة علاج طبيعي	3	07811762857	الناصرية منطقة الادارة المحلية	حمل اوزان ثقيلة							f			من شخص آخر		انزلاق ديسك	الرقبة	[{"type":"انزلاق ديسك","area":"الرقبة","side":"كلاهما"}]	\N
515	ذو الفقار سعدون محمد ظاهر	1	13	40	physiotherapy	f		t	التواء بالرقبة واجرى عملية تحرير عصب 	200000	2026-02-24 16:15:36.972308	\N	استشارة اولية		استشارة طبية	3	07811881588	ذي قار البطحاء 	من الولادة 							f			طبيب خارجي	حسن ناجي ال شدود				\N
518	باقر مهدي غني عبد 	22			physiotherapy	f		t	مضخة اعصاب 	250000	2026-02-24 16:49:51.812446	\N	استشارة اولية		استشارة طبية	3	07831442947	ذي قار الغراف 	ضعف في الاعصاب 							f			من شخص آخر	مرضى سابقين في المركز	ضمور عصبي		[{"type":"ضمور عصبي","area":"","side":""}]	\N
514	عبد المحسن محمد يوسف 	51	80	174	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		3000000	2026-02-24 13:38:32.234898	2025-06-18	استعلام عن طرف وتمت المعاينة من قبل استاذ سيف وتم عرض طرف تحت الركبة بسعر ثلاثة ملايين 			4	07703078476	نينوى-موصل-حي الزهراء 	داء السكر							f			فيسبوك					new
504	قاسم عبد الهادي عبد الحسين رزن	65	70	170	physiotherapy	f		t	جلطة بالدماغ 	150000	2026-02-23 18:15:27.722913	\N	استشارة اولية		استشارة طبية	3	07807581566	ذي قار الناصرية الشموخ	ارتفاع بضغط 							f			فيسبوك		جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"","area":"الساق","side":"يمين"}]	\N
505	ريام لطيف سلمان نحر	37	80	160	physiotherapy	f		t	انزلاق بالفقرات القطنية وتضيق بقناة النخاع الشوكي	150000	2026-02-23 18:36:42.725826	\N			استشارة طبية	3	07831872816	ذي قار سوق الشيوخ	بسبب العمل والجهد المستمر 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
516	حطحوط مصعب علي طويرش	71	75	175	physiotherapy	f		t	جلطة بالدماغ 	50000	2026-02-24 16:31:47.315184	\N	استشارة اولية		استشارة طبية	3	07831081681	ذي قار الناصرية قرب جامعة ذي قار 	ازمة عصبية 							f			من شخص آخر	معرفتهم لمريض يعالج في المركز 	جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"","area":"الساق","side":"يمين"}]	\N
517	كريم حسين صبر عبد الله	60	100	170	physiotherapy	f		t	جلطة بالدماغ مع عملية قلب مفتوح سابقًا وكلى واحدة 	100000	2026-02-24 16:41:23.269473	2023-07-11	استشارة اولية		استشارة طبية	3	07834171776	ذي قار الناصرية الشرقية 	ازمة عصبية 							f			من شخص آخر	سمعة المركز	جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"","area":"الساق","side":"يسار"}]	\N
508	محمد جاسم ثجيل عاشور	29	72	180	physiotherapy	f		t	تمزق بالاربطة	225000	2026-02-24 06:26:05.889835	2025-10-04	استشارة اولية		أجهزة علاج طبيعي	3	07806788490	الناصرية القرية العصرية	اصابة رياضية							f			فيسبوك		إصابة اربطة	الركبة	[{"type":"إصابة اربطة","area":"الركبة","side":"يمين"}]	\N
496	ريان محمد هشام ثامر	3	11.5	90	physiotherapy	f		t	ضمور عضلات الساق 	150000	2026-02-23 08:38:51.674628	2023-03-15	استشارة اولية		استشارة طبية	3	07801125809	ذي قار الناصريه الصالحيه 	وراثي							f			طبيب خارجي	محمد خالد الزيدي 	ضمور عضلي	الساق	[{"type":"ضمور عضلي","area":"الساق","side":"كلاهما"}]	\N
502	عباس جاسم علي احمد	59	60	165	physiotherapy	f		t	جلطة بالدماغ 	50000	2026-02-23 16:40:58.986383	\N			استشارة طبية	3	07801647346	ذي قار الناصرية مدينة الصدر 	بسبب ازمة عصبية 							f			طبيب خارجي	دكتور غفران اخصائي جملة عصبية 	جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"","area":"الساق","side":"يمين"}]	\N
503	نهاد كاظم هاشم ابراهيم 	41	55	150	physiotherapy	f		t	انزلاق بالفقرات العنقية 	250000	2026-02-23 16:56:51.717542	\N			أجهزة علاج طبيعي	3	07883692942	ذي قار سومر 	بسبب الجهد والعمل المستمر 							f			دكتور بيرم		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	\N
511	امين محسن كريم 	42	80	185	medical_support	f		f		1000000	2026-02-24 10:59:14.447136	\N				2	07723793424	كربلاء 	حادث سير							t	مسند KAFO عدد 2	كلا الجانبين 	منظمة انسانية					new
512	ملاك علي سلمان 	9	6	50	medical_support	f		f		275000	2026-02-24 11:03:49.560458	\N				2	07813078364	كربلاء 	ولادي +قصر ولادي 							t	مسند AFO	يمين 	مستشفى					new
520	مشكور نهيب فرحان حسن 	69	100	185	physiotherapy	f		t	تضيق ولادي بالقناة الشوكية وعمليات قسطرة للعمود الفقري للفقرات القطنية	0	2026-02-24 17:42:00.643335	\N	استشارة اولية		استشارة طبية	3	07803876526	ذي قار الناصرية الشموخ								f			فيسبوك	حساب دكتور ياسر 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
521	علاء عبد الحسين تركي كريدي	40	68	170	physiotherapy	f		t	تليف عضلي اسفل الظهر وتشنج	0	2026-02-24 18:03:54.806393	\N	استشارة اولية		استشارة طبية	3	07826877336	ذي قار الناصرية السراي 								f			فيسبوك	حساب دكتور ياسر 		منطقة الظهر السفلية	[{"type":"","area":"منطقة الظهر السفلية","side":""}]	\N
522	احمد عدنان رزوقي حمود	32	60	170	physiotherapy	f		t		0	2026-02-24 18:05:54.841202	\N	استشارة اولية		استشارة طبية	3	07817526591	ذي قار الناصرية السراي 	اصابة كاثناء لعب كرة القدم 							f			فيسبوك	حساب دكتور ياسر 		الركبة	[{"type":"","area":"الركبة","side":""}]	\N
523	صالح عريان راضي مناحي	50	60	165	physiotherapy	f		t	جلطة دماغية 	0	2026-02-24 20:04:05.973096	\N	استشارة اولية		استشارة طبية	3	07830815666	ذي قار الناصرية مدينة الصدر	ارتفاع بالضغط وتدخين وعصبية مفرطة 							f			فيسبوك			اليد	[{"type":"","area":"اليد","side":"يمين"}]	\N
519	جمال عجة ثامر سعدون 	70	68	176	physiotherapy	f		t	جلطة دماغية 	100000	2026-02-24 16:52:52.143645	\N	استشارة اولية		استشارة طبية	3	07811656730	ذي قار الناصرية شارع بغداد	بسبب التدخين والعصبية المفرطة بالاضافة الى الضغط والسكر 							f			فيسبوك		جلطة دماغية	اليد	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"}]	\N
525	مهدي مصطفى حسن عذاب 	19	55	183	physiotherapy	f		t	شلل رباعي وفقد النطق 	0	2026-02-25 06:04:29.040622	2025-05-01	استشارة اولية		استشارة طبية	3	07801549403	ذي قار الرفاعي 	جلطة بجذع الدماغ 							f			طبيب خارجي	دكتور اوس مراد 	جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":""}]	\N
526	شلغم كحامي لفته عباس 	71	70	174	physiotherapy	f		t	شلل نصفي	50000	2026-02-25 07:11:29.072348	2021-11-10			روبوت	3	07892939574	ذي قار الناصريه حي اور 	جلطة دماغية 							f			من شخص آخر		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يمين"}]	\N
524	مصطفى رحمن سلمان عبد الحسين	33	85	181	physiotherapy	f		t	انزلاق بالفقرات القطنية 	25000	2026-02-24 20:41:54.805006	2020-09-16	استشارة اولية		استشارة طبية	3	07816883893	ذي قار الناصرية سومر	بسبب تمارين رياضية 							f			فيسبوك	حساب دكتور ياسر 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
533	كامل حيل عسكر حسين	60	60	169	physiotherapy	f		t	جلطة دماغية 	25000	2026-02-26 06:11:21.117736	2024-12-14	استشارة اولية		أجهزة علاج طبيعي، أجهزة علاج طبيعي	3	07711154504	ذي قار قضاء الفجر	جلطة دماغية 							f			فيسبوك	الموظفة سماء يعرب 	جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يسار"}]	\N
549	احمد محمد علاء الدين عطوة 	44	80	177	physiotherapy	f		t	كسر اليد اليمنى 	150000	2026-02-28 09:02:24.760954	2026-01-28	استشارة اولية		استشارة طبية	3	07876027854	ذي قار الناصريه حي اريدو 	حادث							f			مستشفى	تدريسي بجامعة العين كلية الصيدله	كسر	اليد	[{"type":"كسر","area":"اليد","side":"يمين"}]	\N
541	وجدان عزيز خضير موسى 	43	85	165	physiotherapy	f		t	التهاب بالعصب 	50000	2026-02-26 17:22:14.111684	\N	استشارة اولية		استشارة طبية	3	07822708338	ذي قار الناصرية الشرقية								f			فيسبوك		إصابة عصب محيطي	اليد، الساق	[{"type":"إصابة عصب محيطي","area":"اليد","side":"يسار"},{"type":"","area":"الساق","side":"كلاهما"}]	\N
531	زهراء مراد داوود سليمان	42	70	155	physiotherapy	f		t	لم تذهب لطبيب مسبقًا لكنها مستمرة بالشعور في الم	200000	2026-02-25 19:04:33.031125	\N	استشارة اولية		استشارة طبية	3	07800405667	ذي قار الناصرية الاسكان الصناعي 	بسبب عمل وجهد مستمر 							f			من شخص آخر	الموظفة سماء يعرب 		الركبة	[{"type":"","area":"الركبة","side":"كلاهما"}]	\N
527	روان ناصر علي 	16	30	150	medical_support	f		f		0	2026-02-25 09:58:24.493855	2026-02-24				1	07721074603	بغداد /اعضميه 	حمل حقيبه المدرسه على جنب واحد 							t	مسند تقويمي للظهر 	انحراف العامود الفقري	فيسبوك					new
548	ضياء حسين رزاق منشد 	32	68	178	physiotherapy	f		t	انزلاق الفقرات العنقية 	75000	2026-02-28 07:22:35.487682	2025-09-01	استشارة اولية		استشارة طبية	3	07824412693	ذي قار الناصريه البطحاء	كثرة العمل على الكومبيوتر 							f			فيسبوك	صفحة المركز 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	\N
550	فؤاد حمدان كاظم	29	93	178	physiotherapy	f		t	انزلاق الفقرات	50000	2026-02-28 10:09:49.650908	2025-01-02	استشارة اولية		استشارة طبية	3	07804217582	الناصرية ناحية سيد دخيل	تعب و جهد اثناء العمل							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	\N
532	جاسم طويرش راضي حميدي	43	74	170	physiotherapy	f		t	اختلاف في اراء الاطباء بين الجلطة الدماغية وال EMS	0	2026-02-25 20:54:31.77743	2022-02-15			روبوت	3	0780305587	ذي قار حي الشهداء								f			طبيبنا	مريض قديم للمركز	جلطة دماغية	الساق، اليد	[{"type":"جلطة دماغية","area":"الساق","side":"كلاهما"},{"type":"","area":"اليد","side":"يمين"}]	
530	عامر محمد يوسف خليل	54	96	160	physiotherapy	f		t	جلطة دماغية 	0	2026-02-25 18:46:16.007303	2024-05-24	استشارة اولية		استشارة طبية	3	7800001157	ذي قار الناصرية الشوفة 	ارتفاع بضغط الدم 							f			فيسبوك		جلطة دماغية	اليد، المرفق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"","area":"المرفق","side":"يسار"}]	\N
534	شريف عبد لفته بجاي	70	70	172	physiotherapy	f		t	انزلاق بالفقرات 	0	2026-02-26 06:20:25.110013	\N	استشارة اولية		استشارة طبية	3		الناصرية منطقة المنصورية	نتيجة حادث سيارة قديم في سنة 1979							f			من شخص آخر	الموظفة سماء يعرب 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":"كلاهما"}]	\N
535	ياس خضير صنات حسوني	52	71	172	physiotherapy	f		t	جلطة دماغية 	0	2026-02-26 07:25:19.216865	2025-07-10	استشارة اولية		استشارة طبية	3	07882043878	السماوة حي الجامعة	جلطة دماغية ثانية							f			فيسبوك		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"كلاهما"}]	\N
552	محمد راضي مهدي 	48	90	190	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		1375000	2026-02-28 12:30:42.890826	\N	مراجع جديد 	طرف ثابت تحت الركبة 		2	07830070532	نجف 	قدم سكري 	سوفت 		دكم	ثابتة 	27L	لايوجد 	f			فيسبوك					new
529	احمد يونس عبدالله	31	94	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		800000	2026-02-25 13:26:38.731076	2012-11-14	مراجع سابق منذ 2025	طرف تحت الركبه فاكيوم مع قدم متحركه 		1	07811056587	ديالى/بعقوبه	انفجار	البس امريكي  		فاكيوم	سنكل	26	تحت الركبه	f			فيسبوك					new
540	محسن مزهر حسن غيدان	78	80	175	physiotherapy	f		t	نزف بالدماغ وتلف بالاعصاب 	0	2026-02-26 16:52:02.623833	2026-01-20	استشارة اولية		استشارة طبية	3	07811713185	ذي قار الناصرية حي الزهراء 	ارتفاع بضغط الدم 							f			فيسبوك			اليد، الساق	[{"type":"","area":"اليد","side":"يمين"},{"type":"","area":"الساق","side":"يمين"}]	\N
543	طيبة جابر عبد علي 	27	83	163	physiotherapy	f		t	انزلاق بالفقرات 	0	2026-02-26 17:59:02.542971	2024-03-05			استشارة طبية	3	07806753728	الناصرية منطقة اور	جهد وتعب مستمر بسبب العمل بالاضافة الى سقوطها من الدرج							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":"كلاهما"}]	\N
544	راغد حميد مجيد عبادي	36	77	172	physiotherapy	f		t	انزلاق بالفقرات العنقية 	0	2026-02-26 18:02:43.751845	2026-02-19	استشارة اولية		استشارة طبية	3	07831084416	ذي قار الشطرة 	بسبب الرياضة وحمل اوزان ثقيلة 							f			فيسبوك	حساب دكتور ياسر 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	\N
547	علي نجاح كامل سهل 	18	76	166	physiotherapy	f		t	قطع رباط صليبي 	25000	2026-02-28 05:35:03.213745	2025-07-15	استشارة اولية		استشارة طبية	3	07816761181	ذي قار الناصريه شارع 30 	اصابة رياضيه 							f			فيسبوك		إصابة اربطة	الركبة	[{"type":"إصابة اربطة","area":"الركبة","side":"يمين"}]	\N
539	فاضل جلاب مهدي 	51	80	180	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-02-26 12:09:50.3081	\N		شتل لوك 		2	07829040430	الديوانية 	حادث سيارة 	شتل لوك 	28	دكم	سنكل 	26	لايوجد 	f			فيسبوك					past
551	عادل صادق عبد الحسن 	33	80	185	medical_support	f		f		50000	2026-02-28 12:15:50.822464	\N				2	07711622344	كربلاء 	حادث 							t	دبان طبي 	يمين 	فيسبوك					new
536	شياله عودة راضي لفته	66	77	169	physiotherapy	f		t	شلل الاطراف السفلى	300000	2026-02-26 08:23:25.992814	2025-12-24			استشارة طبية	3		الناصرية الصالحية	جلطة دماغية 							f			من شخص آخر		شلل دماغ	منطقة الظهر السفلية	[{"type":"شلل دماغ","area":"منطقة الظهر السفلية","side":"كلاهما"}]	\N
545	فاطمة حميد خير الله محمد	45	115	160	physiotherapy	f		t	كسر بعظم العضد	375000	2026-02-26 18:56:39.456004	2026-01-08	استشارة اولية		استشارة طبية	3	07800620299	ذي قار الناصرية حي اور 	حادث سقوط من مكان عالي 							f			طبيب خارجي	دكتور وهبي غالب 	كسر	العضد	[{"type":"كسر","area":"العضد","side":"يمين"}]	
537	حميد حسن محمد 	75	60	160	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		6250000	2026-02-26 10:28:58.393363	\N		طرف شتل لوك 		2	07816114896	كربلاء 	قدم سكري 	البس 	24	كاربون 	متحركة 	25	لايوجد 	f			فيسبوك					past
538	رياض مهدي محمد 	55	110	177	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		1500000	2026-02-26 10:38:57.885487	\N	مراجع سابق / مراجعة لغرض تصنيع قالب وشراء سيليكون	باسف 		2	07736017195	كربلاء 	قدم سكري 	سلكون تركي 	38	كاربون 	كاربون 	24	لايوجد 	f			فيسبوك					past
553	رعد ناصر حسين ثابت	32	80	175	physiotherapy	f		t	انزلاق بالفقرات القطنية 	150000	2026-02-28 16:18:18.814042	2023-11-20	استشارة اولية		استشارة طبية	3	07805777099	ذي قار الغراف	سقوط من مكان مرتفع							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
554	كامل علي يوسف محسن	60	85	170	physiotherapy	f		t	جلطتان في الدماغ 	25000	2026-02-28 17:09:57.028816	2020-11-11	استشارة اولية		استشارة طبية	3	0730912385	ذي قار الناصرية حي الامير 	بسبب ازمة عصبية 							f			فيسبوك		جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":""}]	\N
557	زهرة ذياب راشد دشر 	57	78	155	physiotherapy	f		t	سوفان في الركبتين	0	2026-02-28 18:55:37.279054	\N	استشارة اولية		استشارة طبية	3	07866432122	ذي قار الناصرية منصورية 	بسبب الامراض المزمنة سكر وضغط							f			فيسبوك		سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	\N
542	شهاب ذياب راشد دشر 	54	70	164	physiotherapy	f		t	جمود في الكتف الايسر وتمزق في العضلات والتهاب في المفصل 	25000	2026-02-26 17:34:01.095239	\N	استشارة اولية		استشارة طبية	3	07809288357	ذي رقار الناصرية المنصورية 	حركة خطأ وتعب شديد							f			من شخص آخر	من شخص يعالج في المركز		الكتف	[{"type":"","area":"الكتف","side":"يسار"}]	\N
558	احمد قاسم جبار سلطان 	26	65	186	physiotherapy	f		t	ضعف وصعوبة حركه للاطراف السفلية + خدر والام 	25000	2026-03-01 06:39:55.262603	2025-07-01	استشارة اولية		استشارة طبية	3	07718221120	نيسان قضاء العماره 	طلق ناري بالعمود الفقري 							f			فيسبوك	صفحة المستشفى	اصابة حبل شوكي	العمود الفقري	[{"type":"اصابة حبل شوكي","area":"العمود الفقري","side":""}]	\N
562	نور الزهراء عماد نعيم خضير 	9	14	80	physiotherapy	f		t	التهاب عصب محيطي 	0	2026-03-01 11:06:36.528187	2025-12-01	حضر ذوي المريضه فقط بدون المريضه مع جلب التقارير للاستشارة وللاستفسار من الطبيب 		استشارة طبية	3	07815569766	ذي قار الناصريه حي اور 	التهاب 							f			فيسبوك	حساب دكتور ياسر 	إصابة عصب محيطي، إصابة عصب محيطي	اليد، الساق	[{"type":"إصابة عصب محيطي","area":"اليد","side":"كلاهما"},{"type":"إصابة عصب محيطي","area":"الساق","side":"كلاهما"}]	\N
563	نغم شهيد حميد محمد 	40	89	165	physiotherapy	f		t	سوفان الركبتان 	125000	2026-03-01 11:16:24.5486	2025-05-01	استشارة اولية		استشارة طبية	3	07805892305	ذي قار سوق الشيوخ الفضلية 	تقدم العمر 							f			من شخص آخر	موظف بمستشفى التركي (عقيل جاسم)	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	\N
564	عدنان محسن عوفه حسين 	72	72	160	physiotherapy	f		t	شلل نصفي 	0	2026-03-01 11:28:52.61471	2025-08-01	استشارة اولية		استشارة طبية	3	07828221152	ذي قار الناصريه الزيناويه 	جلطة دماغية 							f			فيسبوك	ضرغام الحسيناوي 	جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"كلاهما"}]	\N
565	وهج مخلد علي عبد الواحد 	6	21	80	physiotherapy	f		t	ضمور الدماغ 	0	2026-03-01 12:03:21.829248	\N	حضرت المريضه للاستشارة عند الدكتور عبد الله خان وستباشر مع المسائي 		استشارة طبية	3	07802466250	ذي قار الناصريه حي اور 	ولادي							f			فيسبوك	حساب دكتور ياسر 	ضمور عصبي	الرأس	[{"type":"ضمور عصبي","area":"الرأس","side":""}]	\N
546	زهرة شعيث خلف عاجل 	49	65	160	physiotherapy	f		t	جلطة دماغية 	50000	2026-02-26 19:54:23.706864	2023-10-18	استشارة اولية		استشارة طبية	3	07813132737	ذي قار الناصرية حي العسكري 	بسبب قلق وخوف من القيام بعملية 							f			فيسبوك	من اصدقاء وكذلك الاعلانات	جلطة دماغية	اليد	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"}]	\N
560	احمد صباح عبد النبي 	25	90	172	amputee	t	احادي - طرف علوي - يسار	f		0	2026-02-28 09:43:06	2007-04-10	مراجع سابق منذ 2025	يد سلكونيه تجميليه مع عكس ميكانيكي الماني		1	07728069182	بغداد /السيديه	انفجار		20	فاكيوم				f			فيسبوك					past
513	عبد الكريم تزال عبيد جبر 	66	89	177	physiotherapy	f		t	انزلاق فقرات ضرب على عصب الساق اليسرى 	200000	2026-02-24 11:38:10.338234	2026-02-14	استشارة اولية		استشارة طبية	3	07801293572	ذي قا الناصريه سومريون 	حمل وزن ثقيل 							f			من شخص آخر	عن طريق المراجع محمد مهدي 	انزلاق فقرات، إصابة عصب محيطي	منطقة الظهر السفلية، الساق	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""},{"type":"إصابة عصب محيطي","area":"الساق","side":"يسار"}]	\N
559	ستار جابر عباس	48	70	175	amputee	t	ثنائي - علوي	f		10088000	2026-02-28 08:05:14	2025-07-15	مراجع سابق تم شراء اطراف بقيمة 23483000 والباقي 10088000 / تم تخصيص يد سيليكونية للطرف اايسر فوق المرفق 	مايو الكتريك 		2	07830892886	واسط	صعقة كهربائية							f			فيسبوك					past
561	ثامر مدخول مشعان 	58	71	174	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		350000	2026-02-28 09:46:39	2024-08-14	مراجع سابق منذ 2025  / تم  شراء طرف  بقيمه 3000000 والباقي 350000	طرف تحت الركبه بايونيك		1	07819076792	بغداد/ابو غريب	سكري				كاربون بايونيك	28		f			فيسبوك					past
566	حسن قدوري حسين برغش	23	84	174	physiotherapy	f		t	تشنج عضلي 	25000	2026-03-01 17:10:30.410848	2026-02-28	استشارة اولية		استشارة طبية	3	07812689367	ذي قار الناصرية حي الزقورة 	بسبب العمل المستمر واستخدام الحاسوب 							f			كوكل		تشنج عضلي	الرقبة	[{"type":"تشنج عضلي","area":"الرقبة","side":""}]	\N
568	احمد عبد المحسن شبرم علوان	27	68	175	physiotherapy	f		t	سوفان قديم وتشنج عضلي 	25000	2026-03-01 17:39:56.609942	2026-02-25	استشارة اولية		استشارة طبية	3	07802880964	ذي قار الناصرية حي العسكري 	النوم بطريقة خطأ							f			طبيب خارجي	دكتور  علي عواد	تشنج عضلي	الرقبة	[{"type":"تشنج عضلي","area":"الرقبة","side":""}]	\N
555	علي هاشم جابر علي 	52	109	175	physiotherapy	f		t	بداية انزلاق في الفقرات القطنية 4،5 تشنج عضلي 	25000	2026-02-28 17:30:03.368469	2025-12-12	استشارة اولية		استشارة طبية	3	07806449995	ذ يقاؤ الناصرية سومر 	حادث سيارة 							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
572	هدية جاسم عليوي لفته	56	84	175	physiotherapy	f		t	عملية انزلاق بالفقرات 	0	2026-03-01 20:10:43.275702	\N	استشارة اولية		استشارة طبية	3	07815633786	ذي قار الفهود								f			طبيب خارجي	علي فاخر الزيدي 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
556	احمد كريم سلمان غنيم 	43	114	170	physiotherapy	f		t	انزلاق بالفقرات القطنية وسوفان في الركبة اليمين	25000	2026-02-28 17:52:26.906317	2026-01-06	استشارة اولية		استشارة طبية	3	07816873478	ذي قار الناصرية مدينة الصدر 								f			من شخص آخر	اقاربه يعالجون في المركز	انزلاق فقرات، سوفان	منطقة الظهر السفلية، الركبة	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""},{"type":"سوفان","area":"الركبة","side":"يمين"}]	\N
573	هيثم خلف سلطان فارس	55	97	167	physiotherapy	f		t	سوفان بالركبة	25000	2026-03-02 08:10:32.513226	2024-06-12	حضر المريض للاستشارة، وباشر بالعلاج مباشرةً بعد الاستشارة.		أجهزة علاج طبيعي	3	07801558849	الناصرية شارع بغداد	اصابة قديمة  نتيجة حادث سير							f			فيسبوك		سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"يسار"}]	\N
574	جابر عواد 	71	77	175	physiotherapy	f		t	صعوبة وضعف حركة الجزء الايسر من الجسم 	0	2026-03-02 09:19:59.500933	2024-01-01	استشارة اولية عند الدكتور عبد الله خان وسيباشر غدا حسب الموعد 		استشارة طبية	3	000	ذي قار الناصريه حي اريدو 	جلطة دماغية 							f			فيسبوك	صفحة المستشفى	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	\N
569	احمد حسن عطر عيسى 	45	93	170	physiotherapy	f		t	انزلاق بالفقرة العجزية واالرابعة 	150000	2026-03-01 18:39:59.787428	2025-01-14	استشارة اولية		استشارة طبية	3	07805075367	ذي قار الناصرية حي الرسول 	بسبب العمل والجهد المستمر 							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
567	ساجد حمد مطلق حليان	61	80	175	physiotherapy	f		t	انسداد في احد شريايين الدماغ سببت بجلطة 	275000	2026-03-01 17:32:09.961369	2026-02-09			استشارة طبية	3	07811199449	ذي قار الناصرية الحي العسكري 	ارتفاع بالضغط 							f			من شخص آخر	موظف في المستشفى 	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	\N
578	كرار حاتم فهد درويش	36	108	189	physiotherapy	f		t	انزلاق الفقرات القطنية 	25000	2026-03-03 11:23:25.916779	2024-03-05	استشارة اولية		استشارة طبية	3	07802347478	ذي قارالناصريه حي اور 	اصابة رياضيه  							f			من شخص آخر	مراجع سابق باسم محمد فلاح 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
576	هناء سعدون عكاب صكر	65	65	155	physiotherapy	f		t	عملية تثبيت فقرات 	25000	2026-03-02 18:23:25.813597	2018-10-10	استشارة اولية		استشارة طبية	3	07811143751	ذي قار الناصرية حي المتنزه	انزلاق فقرات القطنية وانحراف 							f			من شخص آخر	مريض قديم في المركز	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
571	ساهمية جاسم عليوي لفته 	47	80	161	physiotherapy	f		t	انزلاق في الفقرات العجزية 	100000	2026-03-01 19:55:14.018578	2023-07-17	استشارة اولية		استشارة طبية	3	07808205621	ذي قار الفهود 	بسبب العمل والجهد المستمر 							f			طبيب خارجي	دكتور علي فاخر الزيدي 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
570	امال جاسم حامي كمر 	52	105	170	physiotherapy	f		t	انزلاق غضروفي 	125000	2026-03-01 19:06:48.051841	2020-10-19	استشارة اولية		استشارة طبية	3	07826987992	اريدو 	بسبب حمل اوزان ثقيلة 							f			من شخص آخر	مريض قديم في المركز	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
577	حسين علي بدر محمد 	31	68	170	physiotherapy	f		t	تليف والتهاب وسوائل مفصل اليد اليسرى 	175000	2026-03-03 07:08:38.021317	2025-08-04	استشارة اولية		استشارة طبية	3	07810198822	ذي قار الناصريه البطحاء	بلا سبب 							f			طبيب خارجي	حيدر حازم العطار	التهاب اوتار	المرفق	[{"type":"التهاب اوتار","area":"المرفق","side":"يسار"}]	\N
579	فراس فائق كاظم ابو سيلان 	44	110	165	physiotherapy	f		t	الام اسفل الظهر 	0	2026-03-03 12:02:15.181488	2026-03-02	استشارة اولية		استشارة طبية	3	07811107640	المثنى 	حركة خطأ اثناء العمل 							f			مستشفى	دكتور جامعي 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
584	حمزة صبيح عزيز علي	40	85	180	physiotherapy	f		t	انزلاق بالفقرات القطنية 4،5	25000	2026-03-03 17:29:41.954163	\N	استشارة اولية		استشارة طبية	3	07822009327	ذي قار الناصرية الامن الداخلي 	جهد وتعب مستمر بسبب العمل							f			انستاغرام		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
582	تبارك مثنى مجيد	11	10	80	medical_support	f		f		1400000	2026-03-03 13:40:41.343995	2015-04-08				1	07732294853	بغداد/محموديه	ضمور خلايا الدماغ (cp)							t	rgo بدون خوذه		فيسبوك					new
585	جمعة كريم عيسى نصار	57	90	180	physiotherapy	f		t	نتوء في القدم 	25000	2026-03-03 18:45:41.610384	\N	استشارة اولية		استشارة طبية	3	07819884666	ذي قار الناصرية حي العسكري	جهد وتعب مستمر بسبب العمل							f			من شخص آخر	ابنه يعمل في المستشفى		القدم	[{"type":"","area":"القدم","side":""}]	\N
586	فوزية حاتم جودة محمد	54	110	156	physiotherapy	f		t	انزلاق في الفقرات 	0	2026-03-03 19:14:04.991364	2020-06-16	استشارة اولية		استشارة طبية	3	07893547306	ذي قار الناصرية التضحية 	جهد وتعب مستمر بسبب العمل							f			من شخص آخر	بنتها تعمل في المستشفى 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
587	بطايه خضر عذافه جلود	66	95	170	physiotherapy	f		t	تبديل مفصل	0	2026-03-04 05:20:42.288934	2025-09-10			استشارة طبية	3	07807153041	الناصرية منطقة ال ازيرج	تبديل مفصل							f			مستشفى		تبديل مفصل	الركبة	[{"type":"تبديل مفصل","area":"الركبة","side":"يسار"}]	\N
588	ابتسام جواد كاطع سعدون 	70	68	160	physiotherapy	f		t	شلل اليد اليسرى 	0	2026-03-04 05:54:37.093324	2025-11-01	استشارة اولية		استشارة طبية	3	07876483216	ذي قار الناصريه الصخيه 	جلطة دماغية 							f			تيك توك		جلطة دماغية	اليد	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"}]	\N
591	حسين محسن حمزة	60	80	180	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		5000000	2026-03-04 10:31:55.57265	2025-09-01		طرف فوق الركبة بايونك 		2	07818466603	كربلاء 	اطلاق ناري 	هيما حلقي 	40	فاكيوم	سنكل	27L	هوائي بايونك	f			فيسبوك					new
575	حميد ذياب حنون رسن	46	76	175	physiotherapy	f		t	تشنج عضلي وسوفان سابق	225000	2026-03-02 18:19:17.469338	2026-02-11	استشارة اولية		استشارة طبية	3	07809726328	ذي قار سوق الشيوخ								f			من شخص آخر	مريض قديم في المركز	سوفان	الرقبة	[{"type":"سوفان","area":"الرقبة","side":""}]	\N
594	عبدالله سامي صدام	25	84	168	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		2500000	2026-03-04 13:01:57.326914	2008-03-18	مراجع سابق منذ 2023 تم شراء طرف 3R60 مع قدم متحركه بسعر 13000000 مليون دينار عراقي وباقي بذمته 2500000 	3R60 + قدم متحركه		1	07727173821	بغداد /الامين 	انفجار 			شتل لوك	سنكل		3R60	f			فيسبوك					past
762	حبيب كامل خضير خليف	38	70	170	physiotherapy	f		t	تشنج عضلي	25000	2026-03-25 18:50:45.969746	\N	استشارة اولية		استشارة طبية	3	07814160170	ذي قار الناصرية البطحاء								f			من شخص آخر	والدته تعالج في المركز	تشنج عضلي	الرقبة	[{"type":"تشنج عضلي","area":"الرقبة","side":""}]	new
592	انور عبداله جابر	31	75	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-03-04 10:49:37.356687	2022-06-01	مراجع سابق تم بيع طرف له سنة 2023 	فاكيوم تحت الركبة		2	07836076801	ذي قار 	اطلاق ناري 	هيما حلقي 	28	فاكيوم	سنكل 	26		f			فيسبوك					past
581	زيد حسن جاسم 	28	80	185	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين | ملاحظات: بتر الخنصر	f		0	2026-03-03 12:16:08.059147	2009-01-01				2	07829522859	كربلاء 	حادث عمل 							f			فيسبوك					new
580	مصطفى محمد راضي 	17	65	172	medical_support	f		f		4000000	2026-03-03 12:11:19.633158	2025-02-01				2	07718014495	كربلاء 	ورم في العمود الفقري 							t	KAFO /2 + حزام ظهر متحرك	كلا الجانبين 	طبيب خارجي	سليم غطاس 				new
595	تميم احمد ناجي 	3	13	55	medical_support	f		f		300000	2026-03-04 13:10:28.991467	2023-03-08				1	07822700105	بغداد/الرضوانيه	ولادي							t	kafo ليلي 	كلا الجانبين	طبيب خارجي					new
593	ازهار نوري حطاب 	52	88	165	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		4000000	2026-03-04 11:25:17.622355	2021-01-13	مراجعه سابقه منذ 2024 تم شراء طرف 3R80 مع مفصل حوض  بسعر وقدره18000000 مليون وتبقى في ذمتها 4000000 ملايين	3R80		1	07728428457	بغداد/مدينه الصدر	ورم				سنكل		3R80	f			فيسبوك					past
590	سيف غسان حسين	28	62	172	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		500000	2026-03-04 08:16:49.937986	2023-06-13	مراجع سابق منذ 2025 تم شراء قالب كاربون درجه اولى تحت الركبه مع سلكون البس بسعر مليون و600000 والباقي بذمته 500000 دينار 			1	07801464818	بغداد /الحريه 	حادث سير 	البس		فاكيوم			تحت الركبه	f			فيسبوك					past
778	سهام يوسف جدوع خضير 	61	70	160	physiotherapy	f		t	تمزق وتليف بالكتف	100000	2026-03-28 13:56:53.274855	2025-12-11	استشارة اولية		استشارة طبية	3	07802831565	ذي قار الغراف 	حادث سيارة 							f			طبيب خارجي	حيدر حازم العطار		الكتف	[{"type":"","area":"الكتف","side":"يسار"}]	new
598	ايوب شريف جلاب صغير 	57	96	175	physiotherapy	f		t	جلطة بالدماغ 	25000	2026-03-04 18:07:07.699294	\N	استشارة اولية		استشارة طبية	3	07865087236	ذي قار الناصرية الثورة 	فجأة وبدون سبب مسبق وسابقًا كان يعاني من سقوط في القدم 							f			من شخص آخر	اصدقاء لهم داخل المستشفى 	جلطة دماغية، جلطة دماغية	اليد، القدم	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"القدم","side":"يمين"}]	\N
599	حميدة راضي علوان هاشم 	58	75	156	physiotherapy	f		t	تبديل مفصل + وتليف في المفصل بعد العملية 	100000	2026-03-04 19:19:00.280552	2025-10-28	استشارة اولية		استشارة طبية	3	07821518161	ذي قار سوق الشيوخ								f			طبيب خارجي	حيدر حازم العطار	تبديل مفصل	الركبة	[{"type":"تبديل مفصل","area":"الركبة","side":"يسار"}]	\N
601	صادق عطيه ياسر ترف	42	90	175	physiotherapy	f		t	انزلاق وسوفان الفقرات القطنية 	0	2026-03-05 08:31:10.961546	2021-05-04	استشارة اولية		استشارة طبية	3	07813078740	ذي قار الناصريه حي الغدير 	سقوط على ارضية 							f			فيسبوك	حساب دكتور ياسر 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
603	عامر عبد الله ناصر علي 	56	97	166	physiotherapy	f		t	ضعف حركة اليد والساق اليمنى 	25000	2026-03-05 09:19:09.403459	2026-02-01	استشارة اولية		استشارة طبية	3	07812527775	ذي قار سوق الشيوخ 	جلطة دماغية 							f			تيك توك		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	\N
604	علي مرتضى شناع مكي	13	52	150	physiotherapy	f		t	تقوس العمود الفقري + الفقرات تضغء على العمود الفقري 	0	2026-03-05 10:39:06.833088	2020-08-03	استشارة اولية		استشارة طبية	3	07812311217	ذي قار سوق الشيوخ الحسن العسكري	عنده فتحة بالعمود الفقري ولادي 							f			طبيب خارجي	حسن ناجي ال شدود	اصابة حبل شوكي	العمود الفقري	[{"type":"اصابة حبل شوكي","area":"العمود الفقري","side":""}]	\N
936	ميار منتظر جعفر 	2	12	20	medical_support	f		f		550000	2026-04-11 07:28:52.160156	\N	مراجع جديد 			2	07800066621	كربلاء 	ولادي 							t	مسند AFO عدد2	كلا الجانبين 	فيسبوك					new
606	رواء عبد الستار عبد كريم	35	58	160	physiotherapy	f		t	انزلاق غضروفي 4،5 وأجريت عملية لها 	150000	2026-03-05 16:59:50.149268	2018-09-18	استشارة اولية		استشارة طبية	3	07805616771	ذي قار الناصرية محلة السراي	بسبب سقوط وعمليات سابقة 							f			فيسبوك	حساب دكتور ياسر 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	\N
607	حليمة كاظم بداي 	55	65	160	physiotherapy	f		t	جلطة دماغية سببت ب شلل نصفي 	0	2026-03-05 17:31:20.248235	2024-01-22	استشارة اولية		استشارة طبية	3	07822962817	ذي قار الناصرية حي البشائر 								f			طبيب خارجي	حسن ناجي ال شدود	جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":""}]	\N
605	بشرى محمد عبد الامير 	7	25	100	medical_support	f		f		495000	2026-03-05 11:46:37.958141	\N	مراجع جديد 			2	07715885812	كربلاء 	ولادي 							t	مسند AFO عدد2	كلا الجانبين 	منظمة انسانية					new
596	تغريد كامل عبدالله	33	73	160	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		4750000	2026-03-04 13:21:03.326685	2015-08-11	مراجعه سابقه منذ 2025 تم شراء طرف ميركوري بسعر 18000000 مليون دينار عراقي وباقي بذمتها 4750000 	ميركوري		1	07800625791	صلاح الدين/بلد	انفجار	البس		فاكيوم	كاربون اسبريت		مير كوري بريطاني	f			فيسبوك					past
602	ربيع عبد سليمان 	70	66	172	amputee	t	ثنائي - سفلي | يمين: تحت الركبة | يسار: تحت الركبة	f		500000	2026-03-05 08:47:55.274963	2010-03-10	مراجع سابق منذ 2023 بعدها تم شراء سلكون البس عدد 2 مع سليف اوتوبوك في سنه 2025 بقيمه مليون و850000 الف ديينار عراقي والباقي في ذمته 500000 الف دينار عراقي 	شتل لوك		1	07826170590	الانبار /الفلوجه 	انفجار 			شتل لوك	سنكل		تحت الركبه	f			فيسبوك					past
600	كامل اسماعيل جعفر 	70	69	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		750000	2026-03-04 08:09:24	2025-05-14	مراجع سابق منذ 2025 تم شراء طرف بايونيك تحت الركبه بسعر 3ملايين دينار عراقي والباقي في ذمته 750000 الف 	طرف تحت الركبه بايونيك		1	07708009126	بغداد/البياع 	سكري				كاربون		تحت الركبه	f			فيسبوك					past
589	تركي سعد سرحان عصيده	64	85	170	physiotherapy	f		t	ضعف وصعوبة حركة الجزء الايمن من الجسم 	150000	2026-03-04 06:57:37.208802	2026-02-28	استشارة اولية عند الدكتور عبد الله خان 		استشارة طبية	3	07815123555	ذي قار الناصريه مدينة الصدر 	جلطة دماغية 							f			مستشفى		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	\N
597	بتول شياع جواد حمود	60	73	156	physiotherapy	f		t	اعتلال الاعصاب المحيطي 	275000	2026-03-04 17:33:26.538674	2025-04-21	استشارة اولية		استشارة طبية	3	07801237404	ذي قار الناصرية سومر 	بسبب داء السكري 							f			طبيب خارجي	حسن ناجي ال شدود	إصابة عصب محيطي		[{"type":"إصابة عصب محيطي","area":"","side":""}]	\N
609	بدور عيسى عطار زغير	21	77	160	physiotherapy	f		t	انزلاق الفقرات القطنية 	25000	2026-03-07 06:17:55.090961	2025-07-04	استشارة اولية		استشارة طبية	3	0783836008	الناصرية مدينة الصدر	سقوط على ارضية 							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	\N
611	سعاد جابر حسين عباس 	35	98	170	physiotherapy	f		t	سوفان والتهاب الركبة اليسار 	25000	2026-03-07 07:47:27.755461	2025-07-09	استشارة اولية		استشارة طبية	3	07825558523	ذي قار الناصريه سومر	تعب وارهاق							f			من شخص آخر	مراجع سابق باسم رائد عزيز 	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"يسار"}]	\N
610	نبيل عزيز عوده سهر 	40	92	177	physiotherapy	f		t	انزلاق الفقرات العنقية 	25000	2026-03-07 07:45:16.962397	2006-02-07	استشارة اولية		استشارة طبية	3	07825558523	ذي قار الناصريه سومر 	كثرة الانحناء							f			من شخص آخر	مراجع سابق باسم رائد عزيز 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	\N
612	احمد جاسم جلوب 	39	65	168	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		190000	2026-03-07 08:49:04.26068	2004-03-10	مراجع سابق منذ 2025 تم شراء قالب مع سلكون مع قفل شتل لوك بقيمه 2مليون و900000 الف دينار عراقي وباقي في ذمته 190000 الف دينار عراقي 	قالب  كاربون  فوق الركبه مع سلكون مع شتل لوك 		1	07705587848	ميسان /مركز المدبنه	طلق ناري	البس		شتل لوك			لايوجد 	f			فيسبوك					past
615	سهام مسير نجم عبد الله 	59	70	156	physiotherapy	f		t	شلل نصفي للجزء الايمن من الجسم 	0	2026-03-07 09:51:49.827525	2019-01-01	استشارة اولية		استشارة طبية	3	07810159551	ذي قار الناصريه الخميسات 	جلطة دماغية 							f			فيسبوك	صفحة المستشفى	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	\N
614	عدنان هاشم سلمان	63	100	178	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		500000	2026-03-07 09:19:25.408069	2023-04-12	مراجع سابق منذ 2025 تم شراء طرف بقيمه 3ملايين دينار عراقي والباقي في ذمته 500000  الف دينار عراقي 	طرف تحت الركبه بايونيك		1	07715475232	بغداد/مجمع بسمايه	سكري	البس		شتل لوك	كاربون		تحت الركبه	f			فيسبوك					past
618	نرجس رائد برزان فاضل	13	56	156	physiotherapy	f		t	انحراف فقرات اسفل الظهر + الام 	0	2026-03-07 10:57:46.26563	2024-01-01	استشارة اولية		استشارة طبية	3	07805982305	ذي قار الناصريه الفضليه 	حركه خاطئه اثناء النوم 							f			من شخص آخر	موظف بمستشفى التركي (عقيل جاسم)	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
619	علي رحيم محمد 	34	80	185	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-03-07 11:22:40.70699	\N		شتل لوك 		2	07806518134	كربلاء 	حادث سير	تركي	28	دكم	سنكل 	27	لايوجد 	f			فيسبوك					past
626	كفاح شيال خنفوس عسكر	40	88	162	physiotherapy	f		t	سوفان وصدع وتقرح في الركبة 	150000	2026-03-07 17:37:34.841279	2023-05-17	استشارة اولية		استشارة طبية	3	07813078740	ذي قار الناصرية حي الغدير 	سقوط من مكان عالي 							f			من شخص آخر	زوجها كان مريض سابق للمركز	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	\N
621	محمد جبر كنيو 	72	80	178	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-03-07 11:50:42.469546	\N	مراجع سابق /	باسف 		2	07732097902	كربلاء 	قدم سكري 	البس 	28	دكم	سنكل 	26		f			فيسبوك					past
624	جواد كاظم حميد	50	75	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-03-07 13:58:46.808745	2006-06-14	مراجع سابق منذ 2024   			1	07706822886	بغداد/جسر ديالى 	انفجار 	مثقب بلاج فورد مع سليف البس 		فاكيوم			تحت الركبه	f			جهة حكومية					past
622	علي اياد علي 	16	52	165	medical_support	f		f		0	2026-03-07 13:25:15.52425	2010-08-11	مراجع سابق منذ 2025			1	07710005600	بابل /المسيب 	ولادي 							t	مسند صدر الحمام 		فيسبوك					past
623	 بهاء الدين حسين 	24	85	168	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		450000	2026-03-07 13:50:39.642992	2024-02-14	مراجع سابق منذ 2025 تم شراء طرف بقيمه 3 مليون دينار عراقي وبعدها تم شراء قالب كاربون تحت الركبه مع سليف البس بقيمه 800000 الفد ينار عراقي والمتبقي 450000 الف دينار عراقي 	طرف تحت الركبه بايونيك		1	07810458514	بغداد/التاجي 	حادث سير	البس		فاكيوم	كاربون	27	تحت الركبه	f			فيسبوك					past
617	شيماء عباس عبود 	26	78	160	amputee	t	احادي - طرف علوي - يسار	f		0	2026-03-07 10:44:09.922041	2024-10-09				1	07702779127	بغداد/حي العامل 	كانسر 							f			فيسبوك					new
616	عباس علي فرج	2	12	65	medical_support	f		f		0	2026-03-07 09:58:02.251098	2024-06-12	مجاني			1	07711843128	بغداد/الامين الثانيه 	تسطح ولادي 							t	دبان 14	كلا الجانبين	فيسبوك					new
613	محمد خضر محمد	38	110	180	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1375000	2026-03-07 08:59:09.217259	2023-08-16	مراجع سابق منذ 2024 تم شراء طرف مع قدم ثابته بقيمه 2 مليون و175000 الف دينار عراقي وباقي في ذمته مليون 375000 دينار عراقي 	سوفت سوكت مع قدم ثابت 		1	07704314702	بغداد/الاعضميه	سكري			فاكيوم	ساج		تحت الركبه	f			فيسبوك					past
628	امين داخل عبد راشد	70	80	170	physiotherapy	f		t	ضغط الفقرات على الحبل الشوكي	0	2026-03-08 06:35:05.438002	2025-10-07	استشارة اولية 		استشارة طبية	3	07801567882	الناصرية القرية العصرية	انزلاق الفقرات							f			من شخص آخر	موظف في المستشفى 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	\N
630	كريم عبد الحسين موسى جياد	60	90	164	physiotherapy	f		t	شلل نصفي	0	2026-03-08 07:30:53.685543	2025-10-13	استشارة اولية		استشارة طبية	3	07817106138	ذي قار الشطرة	جلطة دماغية 							f			فيسبوك		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يمين"}]	\N
634	زهراء عبد الحسن رشك فليح	29	64	150	physiotherapy	f		t	انحراف بالعمود الفقري	0	2026-03-08 08:21:04.803266	2025-11-06			استشارة طبية	3	07808652580	الناصرية مدينة الصدر	حمل ثقل بصورة خاطئة 							f			انستاغرام		انزلاق فقرات	منطقة الظهر العلوية	[{"type":"انزلاق فقرات","area":"منطقة الظهر العلوية","side":""}]	\N
629	طالب موسى علي مخيلف	60	68	177	physiotherapy	f		t	شلل نصفي في الجهة اليسرى	50000	2026-03-08 07:14:27.715017	2022-06-03	استشارة اولية 		استشارة طبية	3	07808214378	الناصرية منطقة السايح قرب محطة الطاقة الكهربائية 	جلطة دماغية							f			من شخص آخر		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يسار"}]	\N
631	احمد لفتة عبيس	23	75	175	amputee	t	ثنائي - علوي	f		0	2026-03-08 07:54:42.237685	\N				2	07876013290	نجف 	كهرباء							f			فيسبوك					new
639	علي احمد رشيد عويد	26	76	172	physiotherapy	f		t	اصابة حبل الشوكي	0	2026-03-08 10:59:36.854673	2025-05-01	استشارة اولية		استشارة طبية	3	07846376419	الناصرية منطقة الاسكان	حادث سير							f			طبيبنا	دكتور ياسر 	اصابة حبل شوكي	العمود الفقري	[{"type":"اصابة حبل شوكي","area":"العمود الفقري","side":""}]	\N
627	ساجد فارس عجيل سعيد	39	70	175	physiotherapy	f		t	عجز بالنخاع الشوكي 	50000	2026-03-07 20:50:55.57622	2025-03-28	استشارة اولية		استشارة طبية	3	07822239104	ذي قار الناصرية حي الشهداء 	جلطة قلبية سابقة 							f			طبيبنا	مصطفى العضاض	اصابة حبل شوكي	منطقة الظهر السفلية	[{"type":"اصابة حبل شوكي","area":"منطقة الظهر السفلية","side":""}]	\N
633	حسنين بهاء خضير 	27	80	180	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		1400000	2026-03-08 08:09:31.599395	\N	مراجع سابق تم شراء طرف سنة 2025 بسعر 4250000 والمتبقي بذمته 1400000	قدم جوبارت 		2	07739715005	بغداد	انفجار سيارة 	لايوجد 		كاربون 	تصنيع		لايوجد 	f			فيسبوك					past
640	سنية صالح منهي شمخي	69	84	168	physiotherapy	f		t	شلل نصفي 	275000	2026-03-08 11:10:33.491601	2026-01-03			استشارة طبية	3	07870484653	ذي قار قضاء الغراف	جلطة دماغية مفاجئة							f			طبيب خارجي	دكتور حسن ناجي الشدود	جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يسار"}]	\N
637	عليه حاتم جحيل 	60	70	150	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1000000	2026-03-08 08:49:45.534508	\N	مراجع جديد 			2	07819710312	ميسان 	قدم سكري 	سوفت 		دكم	ثابتة 	25	لايوجد 	f			منظمة انسانية					new
638	صبرية عبد دعيدع سويف	67	70	170	physiotherapy	f		t	تشنج العصب الوجهي	150000	2026-03-08 10:26:03.10697	2024-03-23			استشارة طبية	3	07800891245	الناصرية منطقة المحطة 	العصبية الحادة							f			فيسبوك		شلل العصب الوجهي	الرأس	[{"type":"شلل العصب الوجهي","area":"الرأس","side":"يسار"}]	\N
625	حيدر ستار كامل ثامر 	27	90	180	physiotherapy	f		t	انزلاق بالفقرات القطنية وتضييق بالقناة الشوكية 	100000	2026-03-07 17:25:15.790546	2026-01-08	استشارة اولية		استشارة طبية	3	07821623603	ذي قار الناصرية شارع السفينة								f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	\N
635	نعيمة كشاش هراطه جبر	55	68	172	physiotherapy	f		t	تشنج عضلي	100000	2026-03-08 08:23:52.346853	2026-03-01	استشارة اولية		استشارة طبية	3	07826501174	الناصرية حي التضحية	بشكل مفاجئ							f			من شخص آخر	من خلال مريضة زينب فلاح	تشنج عضلي	منطقة الظهر السفلية	[{"type":"تشنج عضلي","area":"منطقة الظهر السفلية","side":"كلاهما"}]	\N
636	مرفت هادي محمد 	31	75	160	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		2000000	2026-03-08 08:41:39.278639	2010-08-11	مراجعه سابقه منذ 2025 تم شراء طرف بقيمه 6ملايين دينار عراقي وباقي في ذمتها 2مليون دينار عراقي 	طرف تحت الركبه بايونيك مع مضخه b3 		1	07713447852	بغداد/الغزاليه 	انفجار	البس		فاكيوم	كاربون	25	تحت الركبه	f			فيسبوك					past
641	نورية رزاق عبد الحسين نجم	65	79	165	physiotherapy	f		t	شلل نصفي 	25000	2026-03-08 11:26:10.173058	2025-08-15			استشارة طبية	3	07825816465	الناصرية حي سومر	بسبب تعرضها لجلطتين دماغية							f			انستاغرام		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"كلاهما"}]	\N
642	فاطمة حسن بهلول ناصر 	1	2.5	0.5	physiotherapy	f		t	تشوه خلقي	25000	2026-03-08 11:51:18.539061	2025-08-24			استشارة طبية	3	07831706655	الناصرية الادارة المحلية	تشوه خلقي تحتاج الى زراعة عظم							f			طبيب خارجي	دكتور حسن ناجي ال شدود	تشنج عضلي		[{"type":"تشنج عضلي","area":"","side":"يمين"}]	\N
937	حسين محمدمحسن 	18	60	150	medical_support	f		f		0	2026-04-11 07:36:15.190848	\N	مراجع جديد 			2	0782830538	ذي قار 	ابرة بالخطا							t	مسند KAFO	كلا الجانبين 	فيسبوك					new
647	سعاد ناصر راضي وادي	52	112	155	physiotherapy	f		t	انزلاق وانحراف الفقرات 	25000	2026-03-09 07:03:51.238298	2024-02-01	استشارة اولية عتد الدكتور عبد الله خان 		استشارة طبية	3	07800024354	ذي قار الناصريه الشموخ	سقوط على ارضيه حاده قديما 							f			من شخص آخر	من مراجعه سابقه 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	\N
648	معصومه وليد عبد العالي حسين 	21	45	150	physiotherapy	f		t	شلل رباعي 	0	2026-03-09 07:33:22.411527	2000-02-01	استشارة اولية		استشارة طبية	3	07811708813	ذي قار الناصريه حي اور 	ولادي 							f			فيسبوك	حساب دكتور ياسر 	شلل دماغ، شلل دماغ	اليد، الساق	[{"type":"شلل دماغ","area":"اليد","side":"كلاهما"},{"type":"شلل دماغ","area":"الساق","side":"كلاهما"}]	\N
649	علي سيف قنديل عليوي	4	20	70	physiotherapy	f		t	تلاصق العمود الفقري 	25000	2026-03-09 08:11:07.720841	2022-05-01	استشارة اولية		استشارة طبية	3	07808278717	ذي قار الغراف 	ولادي							f			مستشفى	كان مراجع بالمستشفى 	اصابة حبل شوكي	العمود الفقري	[{"type":"اصابة حبل شوكي","area":"العمود الفقري","side":""}]	\N
650	رغد عداي حسين 	50	75	162	medical_support	f		f		0	2026-02-01 11:59:38	1974-09-10	تم شراء مسند كيفو الماني حديث بقيمه 14 مليون و350000 الف ينار عراقي 			1	07809173179	بغداد/الصالحيه	شلل الاطفال الطرف الايمن  ولادي 							t	kafo  الماني حديث	الطرف الايمن	فيسبوك					past
651	ربا معتز احمد	8	18	110	medical_support	f		f		0	2026-03-09 13:24:28.82104	2018-06-12	تم شراء مساند afoعدد 2 في تاريخ/ 1/1بقيمه 275000 الف دينار عراقي  مع دفع المبلغ كامل 			1	07815117354	بغداد/الرضوانيه 	دوران الاقدام الى الداخل ولادي 							t	afo عدد2 مع حزام تدوير 	كلا الجانبين	فيسبوك					new
654	حسين كريم جاسم محمد	28	80	173	physiotherapy	f		t	قطع جزء في الرباط الصليبي	0	2026-03-09 17:56:59.690688	2026-02-12	استشارة اولية		استشارة طبية	3	07801948413	ذي قار الناصرية حي الشهداء 	هبوط خاطىء							f			تيك توك		إصابة اربطة		[{"type":"إصابة اربطة","area":"","side":"يمين"}]	
58	مصطفى وليد حسين 	24	85	175	amputee	t	احادي - طرف علوي - يمين	f		0	2026-01-18 12:21:51.584859	2025-09-15	بتاريخ 26-11-2025 تم مراجعة المركز لغرض تركيب يد سليكونية تجميلية بسعر ٦ ملايين تم دفع المبلغ كاملا واخذ قالب لهوبتاريخ 5-1-2026 تم مراجعة المركز والس اليد السليكونية 	يد سليكونية تجميلية مع عكس ميكانيكي 		1	07736006258	بغداد / البياع 	حادث سير 	لايوجد	لايوجد 	حزام 	لايوجد 	لايوجد 	لايوجد 	f					\N	\N		past
653	ستار مشاي هزال صليبي	57	90	165	physiotherapy	f		t	جلطة دماغية 	25000	2026-03-09 17:50:11.904324	\N	استشارة اولية		استشارة طبية	3	07826637399	ذي قار الشطرة 	قجأة 							f			من شخص آخر	موظف داخل المستشفى 	جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"","area":"الساق","side":"يسار"}]	
652	زهرة كطيو عبد الحسن غيلان	48	53	156	physiotherapy	f		t	اعتلال الاعصاب المحيطي 	100000	2026-03-09 17:19:50.542945	\N	استشارة اولية		استشارة طبية	3	07802455291	ذي قار سيد دخيل								f			فيسبوك		إصابة عصب محيطي	الساق	[{"type":"إصابة عصب محيطي","area":"الساق","side":"كلاهما"}]	
655	عدنان مطشر صيهود عيسى 	50	59	160	physiotherapy	f		t	انزلاق والام الفقرات العنقيه 	0	2026-03-10 08:37:32.765669	2025-11-11	استشارة اولية		استشارة طبية	3	07830378891	ذي قار الشطره حي الامين 	كثرة الانحلاء							f			فيسبوك	حساب دكتور ياسر 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	
643	علي باقر حسن 	52	115	172	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		1500000	2026-03-08 13:55:05.108616	2004-07-14	مراجع سابق منذ 2025 تم شراء طرف مع قدم متحركه بسعر 5ملايين دينار عراقي وباقي في ذمته مليون و500000	طرف تحت الركبه مع قدم متحركه فاكيوم		1	07755327383	ديالى /بعقوبه 	انفجار	البس		فاكيوم	سنكل		تحت الركبه	f			فيسبوك					past
656	صباح مهدي سالم	48	96	170	medical_support	f	احادي - طرف سفلي - يمين	f		1000000	2026-03-10 09:05:59.575796	1976-03-10	مراجع سابق منذ 2025 تم شراء مسند كيفو معدني بقيمه 2 مليون دينار عراقي وباقي في ذمته مليون			1	07725027826	ديالى /خان بني سعد 	شلل الاطفال الطرف الايمن 							t	kefo معدني 	الطرف الايمن	فيسبوك					past
644	نهاية رشيد شايع صخر	45	73	156	physiotherapy	f		t	تغليف مفصل 	225000	2026-03-08 18:14:51.682298	2016-09-20	استشارة اولية		استشارة طبية	3	07807322685	ذي قار الناصرية حي اور 	التهاب في المفصل سبب روماتيزم وسوفان 							f			طبيب خارجي	حيدر حازم العطار	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"يسار"}]	\N
657	زياد خضر عباس	29	85	170	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		600000	2026-03-10 13:30:06.408469	2020-12-16	مراجع منذ 2022 تم شراء سلكون هيما حلقي ايطالي  في 2026 بسعر 700000 الف دينار عراقي وتم دفع 100000 الف والباقي 600000 الف مع استلام السلكون			1	07702723782	بغداد/الحسينيه	طلق ناري	هيما 						f			فيسبوك					past
21	علي عبد الرسول محمد 	65	71	170	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		3000000	2026-01-13 14:50:47.36486	2025-09-07	شراء طرف بقيمة 6750000 والباقي بذمته 3000000	طرف فوق الركبة bmk2 مع قدم متحركة سنكل وسليكون البس		1	078186767721	بغداد - الكاظمية 	التهاب العظم 							f			فيسبوك		\N	\N		past
938	حسن محمد محسن 	18	60	160	medical_support	f		f		0	2026-04-11 07:42:37.33145	\N	مراجع جديد 			2	0782830538	ذي قار 	ابرة بالخطا							t	مسند KAFO	كلا الجانبين 	فيسبوك					new
669	غنية هادي جبر مرزوق	54	85	165	physiotherapy	f		t	انزلاق بالفقرات القطنية 	0	2026-03-11 17:37:58.88871	2018-08-15	استشارة اولية		استشارة طبية	3	07803805289	ذي قار الناصرية الصالحية 	فجأة برون سبب واضح 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يمين"}]	
670	زينب صيوان لفتة عرمش	65	70	165	physiotherapy	f		t	تضيق بقناة الحبل الشوكي وانزلاق بالفقرات العنقية 	175000	2026-03-11 17:55:07.528883	2019-09-12	استشارة اولية		استشارة طبية	3	07811169988	ذي قار الناصرية حي اريدو 	كبر العمر وجهد الاعمال المنزلية ومرضها المزمن السكري							f			طبيب خارجي	حيدر حازم العطار	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	
664	خالد عوده شهيب حامي 	35	50	172	physiotherapy	f		t	كسر فقرات العنقيه الخامسه والسادسه والسابعه وتم اجراء عملية سابقة 	0	2026-03-11 07:15:00.785894	2024-11-14	استشارة اولية		استشارة طبية	3	07831088562	ذي قار الناصريه سوق الشيوخ كرمة بني سعيد 	حادث سير 							f			فيسبوك	ضرغام الحسيناوي 	اصابة حبل شوكي	الرقبة	[{"type":"اصابة حبل شوكي","area":"الرقبة","side":""}]	
663	لطيف فرهود عبد الحسين جبر 	62	75	169	physiotherapy	f		t	ضعف حركة اليد اليسرى + سقوط القدم اليسرى 	50000	2026-03-11 06:51:06.060666	2025-01-17	استشارة اولية		استشارة طبية	3	07734223766	ذي قار الناصريه محلة الصابئه 	جلطة دماغية 							f			فيسبوك	حساب المركز	جلطة دماغية، جلطة دماغية	اليد، القدم	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"القدم","side":"يسار"}]	
665	ازهار عبد الصاحب كاظم 	45	100	170	physiotherapy	f		t	تشنج اليد اليمنى 	25000	2026-03-11 08:22:54.548312	\N	استشارة اولية		استشارة طبية	3	07803733680	ذي قار الناصريه شارع النيل 	بدون سبب							f			مستشفى		تشنج عضلي	اليد	[{"type":"تشنج عضلي","area":"اليد","side":"يمين"}]	
662	منتظر داخل عبد الله شمخي 	30	75	178	physiotherapy	f		t	انزلاق الفقرات العنقية 	50000	2026-03-11 06:37:36.712303	2026-01-01	استشارة اولية		استشارة طبية	3	07812162500	ذي قار الناصريه سومر 	كثرة انحناءات الرأس 							f			من شخص آخر	مراجع سابق باسم علي هادي ياسر 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	
666	لمياء عبد الصاحب كاظم حسن 	55	100	165	physiotherapy	f		t	سوفان الكبه + روماتيز 	0	2026-03-11 08:47:32.237871	2025-01-01	استشارة اولية		استشارة طبية	3	07803733680	ذي قار الناصريه شارع النيل 	بدون سبب 							f			من شخص آخر		سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"يمين"}]	
659	شعاع عبد الامير اشكاحي مناحي	62	65	156	physiotherapy	f		t	جلطة دماغية 	225000	2026-03-10 16:52:12.946704	2026-02-12	استشارة اولية		استشارة طبية	3	07825283431	ذي قار الناصرية الشعلة 	بسبب ضعف في عضلة القلب							f			من شخص آخر	موظف الحسابات في المستشفى استاذ كرار حسن 	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	
668	عباس نصيف جاسم محمد	28	65	180	physiotherapy	f		t	سقوط قدم 	0	2026-03-11 17:24:19.979582	2019-11-12	استشارة اولية		استشارة طبية	3	07855867101	ذي قار الشطرة 	بسبب علاج 							f			طبيب خارجي	اكرم جودة 		الساق	[{"type":"","area":"الساق","side":"كلاهما"}]	
660	علي جويد حسين حسن	60	85	185	physiotherapy	f		t	التهاب عصب محيطي 	275000	2026-03-10 17:55:27.160193	\N	استشارة اولية		استشارة طبية	3	07803805289	ذي قار الناصرية سومر الاولى 	بسبب السكر 							f			فيسبوك		التهاب اعصاب سكري	الساق	[{"type":"التهاب اعصاب سكري","area":"الساق","side":"يسار"}]	
661	حسن علي مطير محيسن 	50	90	185	physiotherapy	f		t	قطع اوتار اليد وقد اجى عملية سابقة للاصابة 	50000	2026-03-11 06:15:44.312585	2026-02-19	استشارة اولية		استشارة طبية	3	07821549608	ذي قار الناصريه حي الروس	ضربة بقامة 							f			طبيب خارجي	حسن ناجي ال شدود	قطع اوتار	اليد	[{"type":"قطع اوتار","area":"اليد","side":"يسار"}]	
667	سامي محمود ابراهيم	51	67	168	medical_support	f		f		0	2026-03-11 12:15:22.272456	\N	تمت المعاينة من قبل استاذ سيف وتم عرض مسند طرفي بسعر ثلاثة ملايين 			4	07701796258	نينوى-موصل-حي الميثاق	ولادي							t		يمين	فيسبوك					new
658	دنيا يونس صالح	26	60	160	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-03-10 14:34:55.461148	\N	تم تعيار القالب للعلم تم عمل الطرف قبل اكثر من سنتين في مركزنا في بغداد بتكلفة 14000000	طرف كاربوني فوق الركبة درجة ثانية		4	07504142346	دهوك	cancer سرطان	اوسور 		فاكيوم	قدم كاربوني رباعي المحاور	24R	مفصل بريطاني هيدروليكية	f			فيسبوك					past
646	زهره عبد الله محمد حسين 	63	90	175	physiotherapy	f		t	شلل الجزء الايسر من الجسم 	150000	2026-03-09 06:36:13.165616	2022-01-04	استشارة اولية		استشارة طبية	3	07817027822	ذي قار سوق الشيوخ الكرمه 	جلطة دماغية 							f			فيسبوك	حساب دكتور ياسر 	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	\N
671	حيدر سعدون عبد العالي عبد الحسن 	36	87	179	physiotherapy	f		t	انزلاق في الفقرات القطنية 	25000	2026-03-11 19:28:09.081571	2021-07-22	استشارة اولية		استشارة طبية	3	07801105500	ذي قار الناصرية تقاطع الراية 	سقوط من مكان عالي 							f			من شخص آخر	مريض قديم في المركز	انزلاق فقرات، انزلاق فقرات	منطقة الظهر السفلية، الساق	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""},{"type":"انزلاق فقرات","area":"الساق","side":"يسار"}]	
684	محمد صالح عطيه	29	70	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-03-14 13:51:19.01003	2017-04-17	تم تبديل قالب فقط للمريض بتاريخ 25\\12\\2024 من قبل مركزنا بتكلفة 1500000 وتم تسليم القالب بتاريخ 16\\1\\2025 واليوم راجع المريض بخصوص تعيار الطرف			4	07739652302	نينوى-القيارة								f			فيسبوك					past
674	سهام ناهي حمود محمد	58	80	170	physiotherapy	f		t	شلل كلي	25000	2026-03-12 17:08:35.340907	2021-05-21	استشارة اولية 		استشارة طبية	3	07806568402	السماوة حي الصدر	جلطة دماغية 							f			فيسبوك		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"كلاهما"}]	
680	منتظر عباس خضير	25	85	165	amputee	t	ثنائي - سفلي | يمين: تحت الركبة | يسار: تحت الركبة	f		2500000	2026-03-14 09:42:09.764826	2023-05-10	منذ 2023 تم شراء طرفان فاكيوم تحت الركبه بقيمه 8000 الف دولار وباقي في ذمته 2 مليون و500000 الف دينار عراقي 	طرفان  تحت الركبه فاكيوم مع قدم كاربونيه ابيروس 		1	07719358166	بغداد/الشعب 	حادث سير	البس		فاكيوم	ابيروس		تحت الركبه	f			فيسبوك					past
677	حسين عباس سامي	2	10	35	medical_support	f		f		175000	2026-03-14 08:00:53.058966	2024-08-01				1	07817286046	بغداد/ناحيه الرشيد	تقوس ولادي 							t	kafo ليلي عدد2	كلا الجانبين	فيسبوك					new
678	هادي اسماعيل كرو	69	69	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		2250000	2026-03-12 08:41:33	1987-01-14		طرف تحت الركبه مع قدم متحركه فاكيوم		1	07733682383	بابل /المحاويل 	انفجار	نايش 		فاكيوم	سنكل	26	تحت الركبه	f			فيسبوك					new
686	فاطمة محمود شاكر ناصر	28	65	156	physiotherapy	f		t	انزلاق بالفقرات العنقية 	175000	2026-03-14 17:17:26.664128	2024-02-14	استشارة اولية		استشارة طبية	3	07858277677	ذي قار الناصرية مدينة الصدر	ضربة عن طريق الخطا على منطقة الرأس							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	
682	منى احمد حسن	58	80	165	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		110000	2026-03-14 10:01:28.10317	2024-03-27	منذ2025 تم شراء قالب كاربوني تحت الركبه درجه اولى بقيمه 2 مليون دينار عراقي وباقي في ذمتها 110000دينار عراقي 	قالب كاربون درجه اولى تحت الركبه مع قدم سنكل		1	07737355732	ديالى/بعقوبه	حادث سير				سنكل		تحت الركبه	f			فيسبوك					past
681	محمد مجيد محمد	67	82	168	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1034000	2026-03-14 09:51:21.549743	1985-08-14	منذ 2025 تم شراء قالب كاربوني درجه اوللى مع سليكون البس مع شتل لوك بقيمه 2 مليون و10000 الف دينار عراقي وباقي بذمته 1مليون 34000الف دينار عراقي	قالب كاربون تحت الركبه درجه اولى 		1	07702532058	بغداد/ابو دشير	انفجار	البس		شتل لوك			تحت الركبه	f			فيسبوك					past
683	قيس جلال جاسم 	57	85	190	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-03-14 12:41:50.457069	2026-03-02	مراجع سابق /	قدم اسبرت		2	07807765332	كربلاء 	قدم سكري 				اسبرت 	27	لايوجد 	f			فيسبوك					past
673	حسن عبد علي داشر غالي	30	71	175	physiotherapy	f		t	اصابة حبل شوكي + تم اجراء عملية فقرات له وبعد العمليه اصبح يعاني من ضعف الجزء الايسر من الجسم 	175000	2026-03-12 09:42:21.299138	2026-03-03	جلسة علاج لمريض راقد على طبيب اخصائي االجملة العصبية علي عواد فقد تم اجراء عملية فقرات للرقبه للمريض 		تمارين تأهيلية	3	07807316389	ذي قار الناصريه العرجه 	سقوط من مكان عالي 							f			مستشفى	مريض رقود 	اصابة حبل شوكي	الرقبة	[{"type":"اصابة حبل شوكي","area":"الرقبة","side":""}]	
676	انور صباح كاظم كسار 	35	80	165	physiotherapy	f		t	انزلاق الفقرات القطنية الفقره الرابعه والخامسة 	150000	2026-03-14 05:45:22.649146	2016-01-03	استشارة اولية 		استشارة طبية	3	07808953629	ذي قار الناصريه الشموخ 	حمل وزن ثقيل 							f			فيسبوك	صفحة المستشفى	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	
675	نبا صلاح دكيك حرجان 	26	83	165	physiotherapy	f		t	انزلاق غضروفي	300000	2026-03-12 18:28:51.833068	\N	استشارة اولية 		استشارة طبية	3	07838407564	الناصرية الاسكان القديمة	سقوط على الارض اضافة الى تعرضعا الى ضربة قوية							f			انستاغرام		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	
685	علي طالب فاخر لعيوس	33	62	169	physiotherapy	f		t	انزلاق بالفقرات القطنية ال4،5	25000	2026-03-14 17:06:48.814226	2026-01-02	استشارة اولية		استشارة طبية	3	07830195887	ذي قار الناصرية حي الشهداء 	حمل وزن ثقيل 							f			انستاغرام		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	
691	بتول علي محمد الزكي	70	70	165	physiotherapy	f		t	سوفان في الركبة اليسار 	0	2026-03-14 19:17:37.632918	\N	استشارة اولية		استشارة طبية	3	07810815638	ذي قار الناصرية الادارة المحلية 	بسبب كبر العمر وجهد الاعمال المنزلية 							f			طبيبنا	عبد الله خان	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	
687	رسل عادل عباس موازي	28	70	156	physiotherapy	f		t	تنظيف الركبة من الماء والقرحة 	50000	2026-03-14 17:54:58.665174	2025-12-11	استشارة اولية		استشارة طبية	3	07829322904	ذي قار الناصرية سومر	بسبب سقوط قديم							f			طبيب خارجي	حيدر حازم العطار		الركبة	[{"type":"","area":"الركبة","side":"يمين"}]	
688	محمد عبد ريسان عثيل	49	68	172	physiotherapy	f		t	انزلاق بالفقرات القطنية ال4،5	150000	2026-03-14 18:34:51.629825	2024-08-14	استشارة اولية		استشارة طبية	3	07801219285	ذي قار الناصرية سومر	بسبب العمل والجهد المستمر 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يمين"}]	
692	جاسمية عبود حاتم ساجت	72	70	165	physiotherapy	f		t	انزلاق غضروفي 	275000	2026-03-14 20:13:40.939943	2025-03-08	استشارة اولية		استشارة طبية	3	07800503363	ذي قار الناصرية حي الشهداء	بسبب حدوث سقوط وكذلك هشاشة بالعظام							f			انستاغرام		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	
700	شهد جاسم مجلي دوال 	60	70	155	physiotherapy	f		t	انزلاق الفقرات القطنية 	200000	2026-03-16 05:45:08.495922	2025-11-01	استشارة اولية		استشارة طبية	3	07802653564	ذي قار الغراف ال صكبان	كثرة العمل							f			طبيب خارجي	محمد خالد الزيدي 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	
693	محمد عبد الحميد لفته كشكول	24	59	181	physiotherapy	f		t	تشنج عضلي	25000	2026-03-15 07:36:35.509746	2026-02-09	استشارة اولية		استشارة طبية	3	07839220302	الناصرية الثورة شارع المحطة	بسبب عملية الدوالي							f			فيسبوك		تشنج عضلي	الحوض	[{"type":"تشنج عضلي","area":"الحوض","side":""}]	
697	ايه صباح قاسم شنان	13	45	162	physiotherapy	f		t	انزلاق غضروفي + ورم الساقين من اسفل الركبه الى نهاية القدمين 	0	2026-03-15 11:52:09.143857	2026-03-11	استشارة اولية		استشارة طبية	3	07802142074	ذي قار الناصريه حي اريدو	بدون سبب							f			فيسبوك	حساب دكتور ياسر 	انزلاق ديسك	منطقة الظهر السفلية	[{"type":"انزلاق ديسك","area":"منطقة الظهر السفلية","side":"كلاهما"}]	
696	نعيمه زيدان قاسم 	51	77	168	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		350000	2026-03-12 14:41:00	2021-07-08	منذ 2022 	طرف شتل لوك تحت الركبه		1	07716645993	بغداد	سكري			شتل لوك	سنكل		تحت الركبه	f			فيسبوك					past
694	هناء حنون صالح 	48	84	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1400000	2026-03-15 09:54:20.020449	2021-03-10	منذ 2025 تم شراء طرف بقيمه 4 ملايين و750000 الف دينار عراقي 	طرف صناعي تحت الركبه فاكيوم مع قدم متحركه		1	07713253738	بغداد/الحسينيه	انفجار			فاكيوم	سنكل		تحت الركبه	f			فيسبوك					past
698	جاسم سالم عباس محمد	60	88	175	physiotherapy	f		t	تشنج في عضلات الكتف 	25000	2026-03-15 17:50:20.021612	\N	استشارة اولية		استشارة طبية	3	07800521879	ذي قار الاناصرية دور القضاة 	بسبب النوم على وسادة عالية وبطريقة خطأ							f			من شخص آخر	زوجته مستمرة في جلساتها في المركز	تشنج عضلي	الكتف	[{"type":"تشنج عضلي","area":"الكتف","side":"يمين"}]	
699	قاسم محمد جعفر محمد	69	70	170	physiotherapy	f		t	ضعف بالعضلات	0	2026-03-15 20:20:21.714166	2020-08-19	استشارة اولية		استشارة طبية	3	07801202818	ذي قار الناصرية الموحية 	بسبب عدم تحركة لفترات طويله							f			فيسبوك	حساب دكتور ياسر 				
702	اشواق شاكر سلطان مشجل	54	84	160	physiotherapy	f		t	سوفان الركبة اليسار 	0	2026-03-16 07:00:28.392317	2022-05-03	استشارة اولية		استشارة طبية	3	07815940667	ذي قار الناصريه حي الجامعه 	بسبب حقنة بلازما 							f			من شخص آخر	مراجعه باسم بيداء حسين 	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"يسار"}]	
689	مصرية جاسم جابر سلطان	60	70	165	physiotherapy	f		t	جلطة بالدماغ	175000	2026-03-14 18:38:00.852399	2025-07-25	استشارة اولية		استشارة طبية	3	07857731033	ذي قار الشطرة حي المعلمين	بدون سبب يذكر 							f			طبيب خارجي	محمد خالد الزيدي 	جلطة دماغية	الساق، اليد	[{"type":"جلطة دماغية","area":"الساق","side":"يمين"},{"type":"","area":"اليد","side":"يمين"}]	
690	زهراء رحيم كريم محمد	42	65	156	physiotherapy	f		t	ناظور كتف	150000	2026-03-14 19:03:18.712187	2025-12-13	استشارة اولية		استشارة طبية	3	07829658710	ذي قار الناصرية حبوبي	جهد وتعب مستمر بسبب العمل							f			طبيب خارجي	حيدر حازم العطار		الكتف	[{"type":"","area":"الكتف","side":"يمين"}]	
695	جنار قلندر اكبر على 	44	120	160	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		550000	2026-03-15 11:31:29.827189	\N		شتل لوك تيتانيوم 		2	07701243012	كركوك 	قدم سكري 	البس	32	شتل لوك 	سنكل 	27L	لايوجد 	f			فيسبوك					past
703	رباب ناصر وزير مخلص 	51	90	160	physiotherapy	f		t	تليف والتهاب اعصاب الكتف الايسر 	250000	2026-03-16 08:20:50.742611	2026-03-11	استشارة اولية		استشارة طبية	3	07800400888	ذي قار الناصريه الادارة المحلية 	بدون سبب							f			طبيب خارجي	حسن ناجي ال شدود	إصابة عصب محيطي	الكتف	[{"type":"إصابة عصب محيطي","area":"الكتف","side":"يسار"}]	
706	محمد عبد الرضا مهدي 	42	70	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-03-16 10:08:57.560742	\N				2	07804796357	الديوانية 	حادث سير							f			فيسبوك					new
705	زين العابدين علي مطر ذياب	23	81	168	physiotherapy	f		t	التهاب بالعصب 	25000	2026-03-16 09:52:38.447075	2025-11-07	استشارة اولية		استشارة طبية	3	07804707190	الناصرية قرب جامعة العين حي الحسين	جهد وتعب مستمر بسبب العمل							f			طبيب خارجي	حسن ناجي ال شدود	إصابة عصب محيطي	الركبة	[{"type":"إصابة عصب محيطي","area":"الركبة","side":"يمين"}]	
707	جبار عبدالجليل جبار	58	121	177	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-03-16 13:05:36.619158	1998-02-10	تمت المعاينة من قبل استاذ سيف وتم عرض طرف نظام شتل لوك بسعر ثلاثة ملايين 			4	07701786584	نينوى-سادة بعويزة	حرب كويت							f			من شخص آخر	عن طريق استاذ سيف				new
708	خلف خضر محمد	70	75	180	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-03-16 13:13:13.882236	2025-09-04	تمت المعاينة من قبل استاذ سيف تم عرض طرف تحت الركبة ولم يتم تحديد نظام الطرف بسبب وجود جرح نهاية البتر  وبسعر ثلاثة ملايين 			4	0773983540	نينوى-موصل-حي الوحدة	داء السكر							f			فيسبوك					new
583	سجاد حسين علي	16	63	180	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-03-03 13:58:09.98908	2026-01-08	تمت المعاينة من قبل استاذ سيف وكون البتر يوجد فيها خيوط بسبب التهاب البتر تم اعطاء مهلة لحين فك الخيوط والتام الجرح وبعد ذلك يراجع لتعليمهم بخصوص لف الباندج وبعدها عمل طرف صناعي وتم عرض الاطراف الصناعية المناسبة للمريض 			4	07701875145	نينوى-تلعفر	حادث سير							f			من شخص آخر					new
528	ياسين شريف حسين	60	90	173	amputee	t	اطراف سليكونية تعويضية - كف - يسار | ملاحظات:  بتر اليد تحت المرفق وتمت المعاينة من قبل استاذ سيف وتم اخذ قياسات وقالب للطرف المبتور 	f		5000000	2026-02-25 12:15:50.242271	1988-07-04	تمت المعاينة من قبل استاذ سيف وتم عرض الاطراف العلوية من عمل مراكزنا وتم الاتفاق على مبلغ خمسة ملايين دينار وتم اخذ القالب والقياسات للمريض واعطائه مدة من شهرين الى ثلاثة اشهر لحين استلام الطرف التجميلي	سلكوني تجميلي		4	07701855444	نينوى-موصل-مزارع الحدباء	حرب القادسية							f			فيسبوك					new
83	محمد جاسم محمد	39	70	172	amputee	t	احادي - طرف سفلي - يسار	f		0	2026-01-20 15:20:08.097218	2017-07-03	تم عمل طرف فوق الركبة للمريض بتاريخ 25/9/2025 وتم تسليم الطرف بتاريخ 25/10/2025 بتكلفة مليون دينار تم تحفيض السعر من قبل الدكتور ياسر الساعدي المحترم 	طرف سلكوني مفصل ميكانيكي		4	07755008589	نينوى-موصل-حي العروبة	عملية ارهابية	البس امريكي حلقي	30	فاكيوم	قدم سنكل اكسز متحرك	25	مفصل ميكانيكي 3R20	f			فيسبوك		\N	\N		past
43	علي حسن علي	36	90	175	amputee	t	احادي - طرف سفلي - يسار	f		0	2026-01-17 15:53:01.145089	2020-03-14	تبديل قالب فقط وتم اعادة القالب مرتين المرة الاولى بسبب دخول رطوبة للقالب والمرة الثانية لسبب الاسكيال منخفض ولايوجد تحميل للعلم تكلفة تبديل  القالب 1500000 تم تسديد نصف المبلغ بتاريخ 3/12/2025 والباقي على شكل اقساط 250000 لكل شهر وحاليا المبلغ المتقبي بذمة المراجع 500000 فقط تسدد لشهرين			4	07732824850	نيوى-القيارة	عملية ارهابية							f			من شخص آخر		\N	\N		past
672	علاوي صونان نوري علي 	53	75	169	physiotherapy	f		t	شلل نصفي	50000	2026-03-12 08:42:33.281796	2024-08-29	راجع المريض بتاريخ 12/3 لغرض الاستشارة مع أخصائي العلاج الطبيعي د. عبد الله خان، وقد باشر في اليوم نفسه جلسة علاج طبيعي مفردة شملت استخدام أجهزة علاجية وتمارين تأهيلية.\nكما راجع المريض بتاريخ 15/3 لتلقي الجلسة العلاجية الثانية وبنظام جلسة مفردة.\nوفي تاريخ 17/3 حضر المريض ضمن نظام الضمان الاجتماعي كونه موظفًا في وزارة الداخلية، وبموجب بيان صادر من إدارة الضمان داخل المستشفى يفيد بتحمّل الضمان كامل تكاليف العلاج بنسبة 100٪		استشارة طبية	3	07763476784	ذي قار قضاء الرفاعي حي الامير	جلطة دماغية							f			جهة حكومية	ضمان وزارة الداخلية	جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يسار"}]	
709	علي يوسف عزيز سدخان	43	94	171	physiotherapy	f		t	سوفان الفقرات العنقيه 	25000	2026-03-17 09:41:15.829531	2024-02-08	استشارة اولية		استشارة طبية	3	07833087722	بغداد مجمع بدور السكني 	كثرة السياقه + العمل على الكومبيوتر 							f			مستشفى	اخ الدكتور احمد يوسف 	سوفان	الرقبة	[{"type":"سوفان","area":"الرقبة","side":""}]	new
710	امير احمد محمد كاطع	2			physiotherapy	f		t	ضمور بالدماغ	250000	2026-03-17 16:47:07.625813	\N	استشارة اولية		استشارة طبية	3	07832896766	ذي قار قرب محطة القطار	من الولادة							f			فيسبوك		ضمور عصبي		[{"type":"ضمور عصبي","area":"","side":""}]	new
712	زينة شاكر مطر حسن	37	66	159	physiotherapy	f		t	انزلاق بالفقرات ال 4،5، العجزية 	0	2026-03-17 18:31:08.992813	\N	استشارة اولية		استشارة طبية	3	07812900108	ذي قار سق الشيوخ	بعد الولادة الطبيعية حست بالام مفاجأة 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يمين"}]	new
723	عباس فاضل غريب 	25	70	170	amputee	t	احادي - طرف سفلي - يمين - خلال الركبة	f		0	2026-01-24 11:36:00	2019-10-29	مراجع منذ 2025 تم شراء لوكني طرف بقيمه 4 مليون دينار عراقي وتم دفع المبلغ بلكامل 	لوك ني		1	0773328213	ديالى/خانقين	انفجار	بروتد			سنكل		لوك ني	f			فيسبوك					past
720	هالة سمير رزاق عليوي	36	65	160	physiotherapy	f		t	التهاب بالوتر 	0	2026-03-18 20:03:35.934748	2026-03-07	استشارة اولية		استشارة طبية	3	07826399620	ذي قار الشموخ	حمل وزن ثقيل 							f			طبيب خارجي	حيدر حازم العطار		الكتف	[{"type":"","area":"الكتف","side":"يسار"}]	new
714	بشيرة داخل حسن مطر	65	65	156	physiotherapy	f		t	خلل في الفقرات ال4،5 والاعتقاد بفقدان المادة بين الفقرات 	150000	2026-03-17 18:57:23.096355	2021-07-14	استشارة اولية		استشارة طبية	3	07834946934	ذي قار الناصرية الشرقية 	المريضة عندها العديد من الامراض المزمنة 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	new
715	جبار سالم توحي	45	72	175	physiotherapy	f		t	انزلاق بالفقرات القطنية ال4،5	0	2026-03-17 20:46:50.45288	\N	استشارة اولية		استشارة طبية	3	07830856862	ذي قار الناصرية سيد دخيل 	بسبب العمل والجهد المستمر 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يمين"}]	new
716	حمادي عوده حمادي عوده	78	65	165	physiotherapy	f		t	قطع اربطه + سوفان الركبه + فطر بالكاحل	150000	2026-03-18 07:51:09.006476	2025-11-04	استشارة اولية		استشارة طبية	3	07802852303	ذي قار سوق الشيوخ شارع الاطباء 	سقوط 							f			فيسبوك	دكتور ياسر 	إصابة اربطة، سوفان	الركبة، الركبة	[{"type":"إصابة اربطة","area":"الركبة","side":"يمين"},{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
701	هديه سرحان شمخي علي 	60	76	163	physiotherapy	f		t	التهاب العصب + هشاشة عظام وتنخر الركبة اليسرى 	75000	2026-03-16 06:57:58.5771	\N	استشارة اولية		استشارة طبية	3	078149526806	ذي قار الناصريه حي الجامعه 	كثرة الارهاق 							f			من شخص آخر	مراجعه باسم بيداء حسين 	إصابة عصب محيطي	الركبة	[{"type":"إصابة عصب محيطي","area":"الركبة","side":"يسار"}]	
717	ابتسام حنتاو جاسم 	50	105	165	amputee	t	احادي - طرف سفلي - يسار - خلال الركبة	f		3750000	2026-03-18 12:22:27.591197	2024-10-03		لوك ني		1	07765739642	بغداد/حي اور	حادث سير	خلال الركبه			سنكل	24	لوك ني	f			فيسبوك					new
724	احمد حسن داخل عفيت	40	185	170	physiotherapy	f		t	عصب السابع	0	2026-03-19 21:08:25.94563	2026-03-17	استشارة اولية		استشارة طبية	3	0780492254	ذي قار قرب جامعة ذي قار 	بدون سبب يذكر 							f			طبيب خارجي	حازم علي جملة عصبية 	شلل العصب الوجهي		[{"type":"شلل العصب الوجهي","area":"","side":"يسار"}]	new
721	اقبال محمد خزعل فارس 	40	105	160	physiotherapy	f		t	انزلاق الفقرات القطنية 	0	2026-03-19 05:12:25.891029	2020-01-01	استشارة اولية		استشارة طبية	3	07815522275	ذي قار سوق الشيوخ الدجين الاولى 	كثرة العمل والتعب							f			فيسبوك	دكتور ياسر 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
711	عتيته عويش مايع سوادي	81	65	170	physiotherapy	f		t	شلل نصفي 	50000	2026-03-17 18:30:49.777947	2026-03-15	جلسة اولى لمريضة راقدة في الطابق الخامس		تمارين تأهيلية	3	07814962361	الناصرية حي أور	سقوط مفاجى							f			مستشفى	دكتور محمد توفيق	جلطة دماغية	الفخذ	[{"type":"جلطة دماغية","area":"الفخذ","side":"يسار"}]	new
726	زهرة جلوب جبارة 	45	95	190	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-03-24 08:14:44.890162	\N		طرف ثابت فوق الركبة 		2	07714747516	بصرة 	حادث سير	البس	40	دكم	سنكل 	24	ثابتة	f			فيسبوك					past
719	علي عبد الحسن عوض منخي	37	100	180	physiotherapy	f		t	انزلاق بالفقرات القطنية 	50000	2026-03-18 17:51:11.597282	\N	استشارة اولية		استشارة طبية	3	07829841062	ذي قار الغراف	حمل وزن ثقيل							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
725	طاهر سوادي محمد حمود	70	60	160	physiotherapy	f		t	التهاب عصب محيطي لليد والساق اليسرى	225000	2026-03-24 07:52:16.707304	\N	استشارة اولية		استشارة طبية	3	07813105621	ذي قار الشطره بني زيد 	بسبب عملية ازالة ورم من الدماغ 							f			طبيب خارجي	دكتور اكرم جوده 	إصابة عصب محيطي، إصابة عصب محيطي	اليد، الساق	[{"type":"إصابة عصب محيطي","area":"اليد","side":"يسار"},{"type":"إصابة عصب محيطي","area":"الساق","side":"يسار"}]	new
718	رزاق عبد الرضا خلف موسى	58	70		physiotherapy	f		t	جلطة دماغية 	500000	2026-03-18 17:08:54.758144	2023-07-12	استشارة اولية		استشارة طبية	3	0786594739	ذي قار الناصرية حي البشائر 	بسبب ضربات القلب غير منتظمة 							f			فيسبوك		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	new
728	حيدر كاظم عوده ابراهيم 	42	85	175	physiotherapy	f		t	انزلاق الفقرات العنقية 	0	2026-03-24 08:23:15.604605	2026-02-01	استشارة اولية		استشارة طبية	3	07806774777	ذي قار الناصريه حي الحسين 	كثرة السياقه 							f			من شخص آخر	مراجعه سابقه باسم انعام جعفر 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
727	اقبال محسن علي عمران 	62	80	160	physiotherapy	f		t	كسر الفخذ اليمين وقد تم اجراء عملية بلاتين من قبل دكتور معتز 	200000	2026-03-24 08:20:08.680485	\N	استشارة اولية		استشارة طبية	3	07830830260	ذي قار الناصريه شارع بغداد	سقوط 							f			طبيب خارجي	معتز موحان الزيدي	كسر	الفخذ	[{"type":"كسر","area":"الفخذ","side":"يمين"}]	new
731	افراح شاكر عبد الرزاق مجهول 	54	70	160	physiotherapy	f		t	انزلاق الفقرات القطنية 	0	2026-03-24 09:04:30.670828	2025-01-08	استشارة اولية		استشارة طبية	3	07813105621	ذي قار الناصريه التضحيه 	كثرة العمل 							f			من شخص آخر	دكتور اكرم جوده 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
729	نهاية محسن عليخان محيسن 	50	80	165	physiotherapy	f		t	انزلاق الفقره الخامسة 	75000	2026-03-24 08:57:08.809826	2026-02-01	استشارة اولية		استشارة طبية	3	07816180819	ذي قار الناصريه حي التضحيه 	تعب وكثرة العمل 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
732	علية زيارة عطوان 	47	75	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-03-24 09:23:00.135181	\N				2	07841303011	بصرة 	حرب 							f			فيسبوك					past
741	عقيل حتروف دايم حسين	68	70	170	physiotherapy	f		t	جلطة في الدماغ سببت شلل نصفي	25000	2026-03-24 13:52:43.508564	2024-09-15	استشارة اولية		استشارة طبية	3	07800065120	ذي قار الناصرية الحبوبي	ارتفاع بالضغط والسكر							f			فيسبوك		جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":""}]	new
734	مسره ايهاب فراس 	2	10	50	medical_support	f		f		175000	2026-03-19 11:56:21	2025-09-10				1	07711396902	بغداد/حي العامل 	ولادي تقوس 							t	مساندkefo ليلي	كلا الجانبين	طبيب خارجي					new
735	ضحى عبد الامير رحيم 	25	65	165	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين	f		0	2026-03-24 12:11:07.822453	\N				2	07703248487	كربلاء 	حادث							f			فيسبوك					past
736	رقية حسين على 	6	35	100	amputee	t	اطراف سليكونية تعويضية - كف - يسار	f		0	2026-03-24 12:14:31.003612	\N				2	07817345434	بابل 	ولادي							f			فيسبوك					past
737	محمد علي حمزه	50	105	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-03-24 13:14:08.882648	2025-12-15	بيان كلفه     	طرف تحت الركبه بنضام القفل		1	07714496243	بغداد/الشعب	سكري مع هشاشه عظام	البس		شتل لوك	سنكل		تحت الركبه	f			جهة حكومية					new
738	كرار عبد الخضر دحام كافي	39	75	180	physiotherapy	f		t	انزلاق بالفقرات العنقية وتلف في الاعصاب	125000	2026-03-24 13:33:48.283562	2026-03-20	استشارة اولية		استشارة طبية	3	07806672055	ذي قار الناصرية الشموخ	بسبب حركة خطأ اثناء النوم							f			من شخص آخر	اشخاص كانوا يعالجون في المركز	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
739	حسين باعي خضر	58	72	168	amputee	t	اطراف سليكونية تعويضية - اذن - يمين	f		2550000	2026-01-20 13:46:57	2024-12-02				1	07809317719	المثنى /مركز المدينه	حادث سير							f			فيسبوك					new
743	علي محمد موسى	16	50	165	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-03-24 14:32:56.82464	2026-02-09	تمت المعاينة من قبل الدكتور ياسر المحترم واستاذ سيف وتم عرض جميع اطراف تحت الركبة وباسعار مختلفة			4	07701857626	نينوى-تلعفر	حادث سير							f			من شخص آخر	من طرف استاذ محمد ابو زينب في مركز كربلاء				new
744	نجاة حميد سالم داوود	56	75		physiotherapy	f		t	سوفان بالركبتين	0	2026-03-24 14:40:38.638626	\N	استشارة اولية		استشارة طبية	3	07801040483	ذي قار كرمة بني سعيد	حركة كثيرة 							f			من شخص آخر		سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
730	خالد هلال عليخان محيسن 	60	80	170	physiotherapy	f		t	نتوء عظمي اسفل القدم 	50000	2026-03-24 09:02:55.661781	2024-03-04	استشارة اولية		استشارة طبية	3	07816180819	ذي قار الناصريه حي التضحيه 	كثرة الوقوف والمشي 							f			من شخص آخر		سوفان	القدم	[{"type":"سوفان","area":"القدم","side":"كلاهما"}]	new
722	رائد ساجت جخير عبد الله	30	68	168	physiotherapy	f		t	انزلاق الفقرات القطنية 	175000	2026-03-19 08:05:45.701235	2026-01-07	استشارة اولية		استشارة طبية	3	07810439011	ذي قار الرفاعي 	حمل وزن ثقيل 							f			من شخص آخر	من طرف الصيدلاني قاسم الشويلي 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
742	مصطفى كمال مجيد	33	75	170	amputee	t	ثنائي - سفلي | يمين: فوق الركبة | يسار: تحت الركبة	f		3500000	2026-03-24 13:56:11.293925	2013-11-13		قالب كاربون تحت الركبه درجه اولى مع قالب كاربون درجه اولى فوق الركبه		1	07735375332	دبالى /بعقوبه	انفجار			شتل لوك اليمنى وفاكيوم اليسرى				f			فيسبوك					new
746	ندى حسن احمد 	75	100	160	amputee	t	احادي - طرف سفلي - يسار	f		150000	2026-03-24 15:34:21.456873	2021-01-21	مراجعه منذ 2021 تم شراء طرف بقيمه 2 الف دولار و800 $ 	شتل لوك مع قدم متحركة		1	07901613413	بغداد/السيديه	تقرحات 	بروتد	38	شتل لوك	سنكل		تحت الركبه	f			فيسبوك					past
792	ايمان مشرف جلود عذافة 	60	80	160	physiotherapy	f		t	فطرين بالحوض وكسر وخلع في الكتف 	200000	2026-03-29 13:51:00.709032	2026-01-26	استشارة اولية		استشارة طبية	3	07840019955	ذي قار الناصرية السراي	حادث سيارة 							f			من شخص آخر	من قبل الموظفة سماء يعرب	كسر، كسر	الحوض، الكتف	[{"type":"كسر","area":"الحوض","side":""},{"type":"كسر","area":"الكتف","side":"يمين"}]	new
759	محمد فيصل يعقوب	23	80	172	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-03-25 16:47:50.032292	2014-06-15	استعلام عن سليكون			4	07700401008	نينوى-تلعفر	عملية ارهابية							f			فيسبوك					new
761	حسين مراد فرهود ناهي	23	82	158	physiotherapy	f		t	تمزق بالرباط الصليبي 	25000	2026-03-25 18:11:20.246082	2026-03-14	استشارة اولية		استشارة طبية	3	07853131965	ذي قار الغراف	بسبب كرة القدم 							f			طبيب خارجي	مصطفى جلود	إصابة اربطة	الساق	[{"type":"إصابة اربطة","area":"الساق","side":"يمين"}]	new
748	معن عطشان جويد محينه	68	100	170	physiotherapy	f		t	انزلاق الفقراه التاسعة والعارشة وتم اجراء عملية سابقه 	125000	2026-03-25 07:37:37.890765	2023-10-09	استشارة اولية		استشارة طبية	3	07827046877	ذي قار الناصريه الفضليه 	سقوط							f			مستشفى	كان عنده مريض راقد سابقا بالمستشفى 	انزلاق ديسك	منطقة الظهر العلوية	[{"type":"انزلاق ديسك","area":"منطقة الظهر العلوية","side":""}]	new
749	مرتضى جبار مكي كاطع 	35	55	165	physiotherapy	f		t	كسر الحوض والفخذ والساق تم اجراء عملية بلاتين ربط خارجي للحوض وبرغي داخل ونيل بالفخذ وصفائح بالساق 	50000	2026-03-25 07:42:51.802955	2026-01-19	استشارة اولية		استشارة طبية	3	07830834446	ذي قار الجبايش	حادث سير 							f			مستشفى	كان المريض راقد بالمستشفى 	كسر، كسر، كسر	الحوض، الفخذ، الساق	[{"type":"كسر","area":"الحوض","side":""},{"type":"كسر","area":"الفخذ","side":""},{"type":"كسر","area":"الساق","side":""}]	new
755	انمار رمضان عبد	36	70	166	medical_support	f	احادي - طرف سفلي - يمين	f		0	2026-03-25 13:19:42.22624	1990-04-11	مراجع سابق منذ 2024 تم شراء مسند بقيمه 5 مليون دينار عراقي  والباقي في ذمته 3 ونص مليون دينالر عراقي وتم اطفاء الديون عليه من قبل الدكتور ياسر 			1	07805023661	ذي قار / الناصريه 	ولادي							t	كيفو الماني 	الطرف الايسر 	فيسبوك					past
756	زيد يحيى بكوري خليل	36	110	174	physiotherapy	f		t	انزلاق بالفقرات ال4،5	0	2026-03-25 15:13:57.937407	2026-03-19	استشارة اولية		استشارة طبية	3	07812023269	ذي قار الناصرية حي البشائر 	حمبل وزن ثقيل وبسبب رياضة كرة القدم							f			من شخص آخر	تدريسي بجامعة العين 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
740	حميدة حنظل شخير حسن	48	70	160	physiotherapy	f		t	انزلاق بالفقرات القطنية	50000	2026-03-24 13:48:59.520477	\N	استشارة اولية		استشارة طبية	3	07808944080	ذي قار الناصرية الشموخ	حمل وزن ثقيل							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	new
758	دعاء سالم احمد	26	65	155	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-03-25 16:41:21.370187	2017-03-15	تمت المعاينة من قبل استاذ سيف وتم عرض طرف فوق الركبة بركبة هوائية بمبلغ خمسة ملايين وايضا تم عرض طرف بمفصل هيدروليكي روسي بمبلغ سبعة ملايين			4	07705965066	نينوى-بادوش	عملية ارهابية							f			فيسبوك					new
760	ريهام ناظم كريم مهلهل	31	108	170	physiotherapy	f		t	لم تحصل المريضة على تشخيص صريح لحالتها وشبه انحراف في الحوض	25000	2026-03-25 17:57:31.782714	2025-06-15	استشارة اولية		استشارة طبية	3	07732532732	ذي قار الاناصرية سومر	من بعد ولادة المريضة لطفلها							f			فيسبوك			منطقة الظهر السفلية	[{"type":"","area":"منطقة الظهر السفلية","side":"كلاهما"}]	new
757	ممدوح حبيب جعفر	52	90	170	physiotherapy	f		t	تلف بالاعصاب 	50000	2026-03-25 16:25:33.438912	\N	استشارة اولية		استشارة طبية	3	07810769311	ذي قار الناصرية الموحية (دار المسنين)	حادث قبل 3 سنوات وجلطة بالدماغ قبل سنة ونصف							f			طبيب خارجي	حيدر حازم العطار		الساق	[{"type":"","area":"الساق","side":"كلاهما"}]	new
751	اصليه جعفر صكر شبيب	67	65	160	physiotherapy	f		t	تليف اليد اليسى 	150000	2026-03-25 11:38:23.302431	2024-09-02	استشارة اولية		استشارة طبية	3	07811135256	ذي قار سوق الشيوخ كرمة بني سعيد 	بسبب انزلاق قديم قد تم علاجه وشفاءه 							f			من شخص آخر	(منتظر )منتسب في مركز بايونك 	إصابة عصب محيطي	اليد	[{"type":"إصابة عصب محيطي","area":"اليد","side":"يسار"}]	new
745	طلعت عبد العزيز علي	61	70	165	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		8500000	2026-03-24 15:18:17.637235	1987-06-10		طرف 3r78 مع قدم متحركه		1	07721985958	دبالى /بعقوبه 	انفجار 	هيما 	30	فاكيوم حلقي	سنكل	26		f			فيسبوك					new
747	سميرة قاسم محمد راهي	48	70	160	physiotherapy	f		t	جلطة دماغية نازفة 	450000	2026-03-24 16:14:37.513714	2020-01-16	استشارة اولية		استشارة طبية	3	07800072175	ذي قار الناصرية حي العسكري 	صدمة نفسية بسبب حالة وفاة 							f			فيسبوك		جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":"يسار"}]	new
750	عبد الحسن فيصل جاسم 	62	95	180	physiotherapy	f		t	انزلاق الفقرات القطنية + تم اجراء عملية سابقه 	50000	2026-03-25 11:22:20.509424	2007-04-01	استشارة اولية		استشارة طبية	3		ذي قار الناصريه الحمام	سقوط + كثرة العمل							f			مستشفى	عن طريق منتسب بالمستشفى ( ماهر عوده ) مدير الصيانة 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
733	ازهار نعيم كسار عويد	47	87	160	physiotherapy	f		t	ضعف حركة الجزء الايسر من الجسم 	150000	2026-03-24 11:32:41.024269	2023-02-01	استشارة اولية		استشارة طبية	3	07815517271	ذي قار الناصريه الطليعه 	جلطة دماغية 							f			من شخص آخر	المراجع بالمركز بأسم انور صباح 	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	new
764	سامي ناجي نجم	70	80	170	physiotherapy	f		t	جلطه دماغيه	225000	2026-03-26 14:11:44.111699	2020-08-12	تم فحص ومعاينه المريض وتم تحديد له جلسات علاج طبيعي من قبل الدكتور عباس مع 3 جلسات ريبورت		روبوت	1	07713014301	بغداد/الدوره	 ارتفاع ضغط الدم 							f			فيسبوك		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يمين"}]	new
767	زكي جبير سعدون تويلي 	74	85	175	physiotherapy	f		t	ضعف حركة للجنب الايسر من الجسم 	275000	2026-03-28 06:00:06.174857	2024-07-22	استشارة اولية		استشارة طبية	3	07800420882	ذي قار سوق الشيوخ كرمة بني سعيد 	جلطة دماغية 							f			فيسبوك		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	new
766	عدنان عبد الصمد ياسر مغامس	52	80	170	physiotherapy	f		t	خدر في كف اليد والقدم لكن لايوجد تشخيص دقيق للان 	25000	2026-03-26 16:55:59.299915	2025-09-17	استشارة اولية		استشارة طبية	3	07811006573	النجف	فجأة وبدون سبب							f			من شخص آخر	استاذ منتظر 				new
768	محمد جاسب كاظم جبر 	39	107	184	physiotherapy	f		t	انزلاق بالفقرات القطنية 	25000	2026-03-28 07:38:04.64634	2026-03-26	استشارة اولية		استشارة طبية	3	07800003503	ذي قار الناصريه حي الرافدين 	رفع احمال ثقيلة							f			مستشفى	من طرف محامي المستشفى ( مصطفى عبد المحسن)	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
769	غالب عيسى نادر طوكان 	65	80	174	physiotherapy	f		t	شلل ارتعاشي كامل الجسم يتضمن النطق 	0	2026-03-28 07:57:42.69538	2024-01-09	استشارة اولية		استشارة طبية	3	07805533404	ذي قار الناصريه حي الشهداء 	بسبب ارتجاف اساسي وراثي							f			مستشفى	من طرف صيدلانيه بالمستشفى 	نزف دماغي		[{"type":"نزف دماغي","area":"","side":"كلاهما"}]	new
770	حربيه جويد سلطان خريم 	79	100	160	physiotherapy	f		t	انزلاق بالفقرات العنقية 	125000	2026-03-28 08:02:10.71763	2024-06-06	استشارة اولية		استشارة طبية	3	07831893817	ذي قار الناصريه الموحيه 	تقدم العمر 							f			من شخص آخر	اخو مسؤول قسم بجامعة العين (رعد عجيل)	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
773	حسن نور كريم 	45	80	185	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-03-28 09:50:42.36064	\N				2	07823747638	نجف	كانسر 							f			فيسبوك					new
771	منصور عجيل بستان حشيش	53	90	175	physiotherapy	f		t	التهاب اوتار الكتف الايمن 	175000	2026-03-28 08:05:23.25284	2026-02-02	استشارة اولية		استشارة طبية	3	07829505425	ذي قار الناصريه شارع ابراهيم الخليل 	رفع احمال ثقيلة							f			من شخص آخر	اخو مسؤول بالجامعه رعد عجيل	التهاب اوتار	الكتف	[{"type":"التهاب اوتار","area":"الكتف","side":"يمين"}]	new
775	سلام عبد اللطيف جبار علي 	25	70	175	physiotherapy	f		t	شلل رباعي 	0	2026-03-28 11:28:41.297026	2025-05-03	استشارة اولية		استشارة طبية	3	07810331256	ذي قار الناصريه التل الاخضر 	حادث سيارة 							f			طبيب خارجي	حسن ناجي ال شدود	اصابة حبل شوكي		[{"type":"اصابة حبل شوكي","area":"","side":"كلاهما"}]	new
776	سكينة محمد عبد الواحد	8	35		physiotherapy	f		t	فتحة بالظهر 	25000	2026-03-28 13:15:05.856529	2019-10-09	استشارة اولية		استشارة طبية	3	07812314263	مجمع تينا الناصرية ذي قار 	من الولادة 							f			من شخص آخر	من طرف الموظف زياد 		القطن	[{"type":"","area":"القطن","side":""}]	new
774	نظيمة كاظم سكر	60	75	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		6250000	2026-03-28 09:57:31.060723	\N		شتل لوك 		2	07733741152	كربلاء 	قدم سكري 	البس 	28	كاربون 	سنكل 	23	لايوجد 	f			فيسبوك					new
765	عزيز قهو عبد عون	71	62	165	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		3750000	2026-03-26 16:13:52.597796	2026-02-14		لوك ني مع قدم متحركه 		1	07713840818	بغداد/ابودشير	انسداد شرايين مع سكري	البس	40	شتل لوك	سنكل	27	لوك ني	f			فيسبوك					new
772	خوله عكاب حسين شناوه 	60	69	155	physiotherapy	f		t	انزلاق الفقرات القطنية الفقره الرابعه والخامسة واجرت اجراء ابر في العمود الفقري في المانيا سنة 2014	200000	2026-03-28 08:58:50.725301	2014-04-16	استشارة اولية		استشارة طبية	3	07728202424	ذي قار الناصريه مجمع تينه 	حمل وزن ثقيل 							f			من شخص آخر	من طرف مسؤول الهندسة استاذ ماهر	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
777	وفاء ناصر حسين كريم	53	80	160	physiotherapy	f		t	انزلاق بالفقرات القطنية ال4،5 وسوفان بالركبة 	125000	2026-03-28 13:48:15.969796	2025-05-13	استشارة اولية		استشارة طبية	3	07809781290	ذي قار الناصرية شارع  ابراهيم الخليل	بسبب الجهد المستمر والعمل							f			طبيب خارجي	حيدر حازم 	انزلاق فقرات، سوفان	منطقة الظهر السفلية، الركبة	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يمين"},{"type":"سوفان","area":"الركبة","side":"يمين"}]	new
819	زينب عمار طالب مونس	2			physiotherapy	f		t	ضمور بالدماغ 	175000	2026-03-30 15:41:25.788914	2023-10-10	استشارة اولية		استشارة طبية	3	07817058355	الاسكان	من الولادة 							f			فيسبوك		ضمور عصبي		[{"type":"ضمور عصبي","area":"","side":""}]	past
781	نظيمة خليف حسين علي	62	70	156	physiotherapy	f		t	انزلاق بالفقرات العنقية 	25000	2026-03-28 14:19:47.046148	\N	استشارة اولية		استشارة طبية	3	07832717145	ذي قار  الناصرية سيد دخيل 								f			من شخص آخر	من مراجعين في المركز 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":"يمين"}]	new
782	ريان محمد هاشم ثامر	3	11	90	medical_support	f		f		200000	2026-03-28 18:37:46.454227	2023-03-15	اخذ قياسات للمسند 			3	07801125809	ذي قار الناصرية الصالحية 	من الولادة 							t	مسند تحت الركبة للساقين AFO	كلاهما 	طبيبنا					past
786	عمران حسين علوان 	67	80	180	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		1500000	2026-03-29 07:37:40.816437	\N		سايمز 		2	07802515277	بابل	حرب ايران 	سوفت 		دكم	جوبارت 	40L	لايوجد 	f			فيسبوك					new
793	ازهار محمد صالح راشد	60	70	156	physiotherapy	f		t	تبديل مفصل	150000	2026-03-29 14:16:41.481991	2025-07-23	استشارة اولية		استشارة طبية	3	07831433003	ذي قار الناصرية حي الحسين								f			طبيب خارجي	حيدر حازم	تبديل مفصل	الركبة	[{"type":"تبديل مفصل","area":"الركبة","side":"يسار"}]	past
787	سماهر عبد الامير  حسين	46	65	160	medical_support	f		f		500000	2026-01-20 11:05:00	2018-10-10	تم تحديد مبلغ 500000 من قبل ممثلية العتبة للطرف / تم صرف المبلغ المتبقى من قبل د ياسر 			2	07728517206	ديالى 	حادث سيارة 							t	مسند KAFO ثابت عدد2	كلا الجانبين 	فيسبوك					past
788	عباس اركان عبادي حمزه 	21	60	165	physiotherapy	f		t	ضعف حركة الجزء السفلي من الجسم 	400000	2026-03-29 09:04:01.975633	2022-08-10	استشارة اولية		استشارة طبية	3	07828996949	الديوانيه قضاء غماس 	حادث سير 							f			فيسبوك	حساب دكتور ياسر 	ضمور عصبي	الساق	[{"type":"ضمور عصبي","area":"الساق","side":"كلاهما"}]	new
784	بيداء غيثان صعيب سلمان 	48	81	176	physiotherapy	f		t	تبديل مفصل 	375000	2026-03-29 06:48:50.267757	2026-03-17	استشارة اولية		استشارة طبية	3	07817762448	ذي قار قضاء الفهود 	سوفان 							f			من شخص آخر	عن طريق منتسب بمختبر المستشفى هشام جليل 	تبديل مفصل	الركبة	[{"type":"تبديل مفصل","area":"الركبة","side":"يمين"}]	new
780	فؤاد نور صباح	10	15	65	physiotherapy	f		t	ضعف حركه بلاطراف العليا والسفلى 	1075000	2026-03-28 14:16:29.141119	2016-10-12			أجهزة علاج طبيعي	1	07869344761	بغداد / كويريش 	ولادي 							f			فيسبوك		شلل دماغ	الرأس	[{"type":"شلل دماغ","area":"الرأس","side":"كلاهما"}]	new
789	هلال عباس هلال	38	77	168	amputee	t	احادي - طرف علوي - يسار - تحت المرفق	f		4000000	2026-03-29 11:25:30.087858	2006-03-08		يد سلكونيه تجميليه  		1	07804997703	المثنى / مركز المدينه	خطأ طبي 							f			فيسبوك					new
790	مثنى عبد الهادي حنضل عوده 	31	85	174	physiotherapy	f		t	غضروف هلالي 	0	2026-03-29 12:19:38.965469	2023-06-07	استشارة اولية		استشارة طبية	3	07826440554	ذي قار الناصريه حي الامير 	كثرة الرياضه 							f			من شخص آخر	اخ منتسب بالهندسه (حسن عبد الهادي)	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"يمين"}]	new
878	محمد جاسم محمد 	62	70	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-05 07:53:30.054387	\N		Pim kilt system		2		كربلاء 	حادث سيارة 	بروتد 	28	فاكيوم	سنكل 		لايوجد 	f			فيسبوك					past
779	محمد خضر عبد الحسين 	42	85	175	physiotherapy	f		t	تمزق بالرباط الصليبي	150000	2026-03-28 14:07:30.341409	2025-08-12	استشارة اولية		استشارة طبية	3	07860135613	ذي قار الشوفة 	سقوط من مكان عالي							f			من شخص آخر	المعاون الادراي للشفت المسائي يونس طلب	إصابة اربطة	الساق	[{"type":"إصابة اربطة","area":"الساق","side":"يسار"}]	new
795	نور عزيز شناوة عنايه	35	79	155	physiotherapy	f		t	تسطح بالقدم 	25000	2026-03-29 15:15:46.088932	\N	استشارة اولية		استشارة طبية	3	07807844288	ذي قار الناصرية التضحية 	وراثي 							f			فيسبوك			القدم	[{"type":"","area":"القدم","side":"كلاهما"}]	new
794	هيام شافي حوشان عايد	40	70	156	physiotherapy	f		t	جلطة بالدماغ	125000	2026-03-29 14:33:23.726388	2026-03-09	استشارة اولية		استشارة طبية	3	07805521362	ذي قار الناصرية مدينة الصدر 	ارتفاع بالسكر  اثناء النوم							f			من شخص آخر		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	new
783	جواد حسن رزج سويلم 	60	65	160	physiotherapy	f		t	شلل رباعي + عدم النطق والبلع 	900000	2026-03-29 06:30:17.48633	2025-05-04	استشارة اولية		استشارة طبية	3	07817070695	ميسان قضاء المجر الكبير 	جلطة دماغية 							f			من شخص آخر	من طرف المريض جهاد 	جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":"كلاهما"}]	new
791	ساهلرة عجيل هادي عويد	55	85	160	physiotherapy	f		t	جلطة بالدماغ	150000	2026-03-29 13:45:59.957576	2022-08-17	استشارة اولية		استشارة طبية	3	07801356042	ذي قار سوق الشيوخ	بسبب ظرف ادى الى ازمة عصبية 							f			من شخص آخر		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	new
804	كرار حيدر بدري 	16	60	172	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		19150000	2026-03-30 10:14:09.862191	2026-01-27		اكيلون فاك بريطاني 		2	07813831662	بابل 	تخثر دم 			فاكيوم	اكيلون فاك	26R	لايوجد 	f			فيسبوك					new
798	طاهر سوادي محمد حمود	70	85	170	medical_support	f		f		0	2026-03-29 16:36:44.944598	2025-11-19	استشارة اولية			3	07813105621	ذي قار الشطرة بني زيد	سقوط قدم 							t	 للساق  AFO RAGID	يسار	طبيب خارجي					new
806	حيدر عواد كاظم رهيف	56	65	180	physiotherapy	f		t	انزلاق غضروفي بين الفقره الرابعه والخامسة + تم اجراء عملية سابقه 	150000	2026-03-30 11:43:34.778181	2024-05-08	استشارة اولية		استشارة طبية	3	07830437194	ذي قار الناصريه حي اور الثانيه 	سقوط على ارضية 							f			فيسبوك	صفحة المركز 	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
801	رحيم حسين صبر وحش	52	70	170	physiotherapy	f		t	كسر الركبة اليسرى وقد تم اجراء عملية سابقة 	25000	2026-03-30 05:32:41.171651	2025-10-21	استشارة اولية		استشارة طبية	3	07828122975	ذي قار الناصريه الصالحية 	سقوط							f			طبيب خارجي	حيدر حازم العطار	كسر	الركبة	[{"type":"كسر","area":"الركبة","side":"يسار"}]	new
809	حسين حامد جبر	24	95	175	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		1000000	2026-03-30 13:12:31.055459	\N		هايبرد		2	07717116084	كربلاء 	حادث سير	حلقي 		كارون 	سنكل		هايبرد 	f			فيسبوك					past
800	عيدة كطران كاظم	54			physiotherapy	f		t	جلطة دماغية 	50000	2026-03-29 19:20:02.58182	2026-03-21	استشارة اولية		تمارين تأهيلية	3	07832886757	ذي قار الناصرية البيضان								f			مستشفى	مستشفى العين طابق رابع د علي رشيد	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	new
803	امل عبد الكاظم ناصر طارش	47	80	165	physiotherapy	f		t	انزلاق بالفقرات القطنية 	0	2026-03-30 08:20:11.122725	2026-03-10	استشارة اولية		استشارة طبية	3	07821252600	ذي قار قضاء الشطره حي الزهراء	كثرة العمل بالبيت							f			طبيب خارجي	محمد سعود كولي	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
805	سناء هادي سلمان حمد 	67	86	155	physiotherapy	f		t	خلع+ كسر الكتف الايسر وقد اجرت عملية سابقه 	200000	2026-03-30 11:04:02.352049	2026-02-10	استشارة اولية		استشارة طبية	3	07800082929	ذي قار الناصريه حي اريدو 	سقوط							f			طبيبنا	دكتور علي فاخر	كسر	الكتف	[{"type":"كسر","area":"الكتف","side":"يسار"}]	new
763	محمد عبد عباس حمادي	70	70	175	physiotherapy	f		t	جلطه دماغيه	675000	2026-03-26 13:23:21.485756	2025-09-10	تم فحص ومعاينه المريض وتحديد 6 جلسات له 3 جلسات ريبورت و3 اجهزه علاج طبيعي  مع تمارين تاهيليه 		روبوت	1	07827125380	بغداد/اليوسفيه	ارتفاع ضغط الدم							f			فيسبوك		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يمين"}]	new
807	فؤاد نور صباح	10	15	65	medical_support	f		f	ضعف حركه بلاطراف العليا والسفلى 	0	2026-03-29 12:59:02	2016-06-15	مراجع سابق منذ 2025 تم شراء مساند كيفو مع مسند رسخ عدد 2 بقيمه 250000 الف دينار عراقي وتم تسديد المبلغ بلكامل			1	07869344761	بغداد / كويريش 	ولادي 							t	كيفو مع مسند رسخ  عدد 2	كلا الجانبين	فيسبوك					past
802	حليمه مجلي عليوي عشوان 	61	65	160	physiotherapy	f		t	تليف والتهاب الكتف الايسر وقد اجرت عملية سابقه 	75000	2026-03-30 06:17:26.544449	2025-02-06	استشارة اولية		استشارة طبية	3	07824044490	ذي قار قضاء الشطره الدوايه 	تليف الكتف 							f			طبيب خارجي	حيدر حازم العطار	التهاب اوتار	الكتف	[{"type":"التهاب اوتار","area":"الكتف","side":"يسار"}]	new
811	فضة حسن علي دنيف	4			physiotherapy	f		t	ضمور بالعضلات 	0	2026-03-30 13:48:37.77194	2021-11-09	استشارة اولية		استشارة طبية	3	07831872993	ذي قار سوق الشيوخ	من الولادة 							f			فيسبوك		ضمور عضلي		[{"type":"ضمور عضلي","area":"","side":""}]	new
799	كوثر حسن مجيد لفته 	70	115	156	physiotherapy	f		t	تليف بالكتف 	100000	2026-03-29 17:17:24.675274	2025-07-15	استشارة اولية		استشارة طبية	3	07815518543	ذي قار الناصرية الصالحية 	بسبب امراض مزمنة وكذلك بعد ادائها لمناسك الحج							f			من شخص آخر		التهاب اوتار	الكتف	[{"type":"التهاب اوتار","area":"الكتف","side":"يسار"}]	new
797	حوراء عباس ابراهيم محمد	33	95	164	physiotherapy	f		t	انزلاق بالفقرات العنقية  مع تليف وخشونة في الغضاريف	75000	2026-03-29 16:09:41.701526	2026-03-18	استشارة اولية		استشارة طبية	3	07839378811	ذي قار الناصرية حي اور	بدون سبب او غير معروف 							f			فيسبوك		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":"كلاهما"}]	new
815	محمد ناجي فياض 	49	86	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-03-30 14:23:15.166213	2004-01-14	مريض سابق منذ 2025 تم شراء طرف بقيمه 3 مليون دينار عراقي 	طرف تحت الركبه مع قدم كاربونيه 		1	07824704050	الانبار /الفلوجه	طلق ناري	البس	22	شتل لوك 	كاربون	26	تحت الركبه	f			فيسبوك					past
816	عبد المحسن عبد الرزاق ظاهر علي	71	60	180	medical_support	f		f		150000	2026-03-30 14:38:08.744059	2024-08-14	استشارة اولية			3	07806280828	ذي قار سيد دخيل الحصونة 	حادث سبب جلطة بالدماغ							t	cockup hand orthrosis	يسار	من شخص آخر					past
820	هناء عبد علي سنيف جابر	65	87	165	physiotherapy	f		t	بلاتين داخلي في اليد اليمنى واليد اليسار تكلس في العضلة والتهاب بالوتر 	100000	2026-03-30 16:57:47.117748	2025-03-12	استشارة اولية		استشارة طبية	3	07831075671	ذي قار الناصرية شارع بغداد	بسبب حادث سقوط							f			طبيب خارجي	حيدر حازم العطار	التهاب اوتار	الكتف	[{"type":"التهاب اوتار","area":"الكتف","side":"يسار"}]	new
813	ثائر عبد الرحيم مظلوم محمد	45	72	173	physiotherapy	f		t	انزلاق بالفقرات 3،4،5	150000	2026-03-30 14:14:20.699236	2023-03-14	استشارة اولية		استشارة طبية	3	07809835549	ذي قار الناصرية الاصلاح	جهد وتعب مستمر بسبب العمل							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
821	ريحانة غزوان كامل جابر 	1			physiotherapy	f		t	ضمور بالاعصاب 	0	2026-03-30 18:15:51.990009	2024-08-10	استشارة اولية		استشارة طبية	3	07814606187	ذي قار سيد دخيل 	من الولادة 							f			من شخص آخر	المعاون الاداري المسائي سيد يونس طلب	ضمور عصبي		[{"type":"ضمور عصبي","area":"","side":""}]	new
823	رقيه ضياء فليح حسن 	10	41	120	physiotherapy	f		t	ضمور عضلي ( كساح ) لكلا الساقين 	100000	2026-03-31 07:28:52.267139	2016-08-02	استشارة اولية		استشارة طبية	3	07804998856	ذي قار قضاء الشطره حي المعلمين 	ولادي 							f			فيسبوك	صفحة دكتور ياسر 	ضمور عضلي	الساق	[{"type":"ضمور عضلي","area":"الساق","side":"كلاهما"}]	new
810	علي جميل خيون محسن 	28	64	172	physiotherapy	f		t	كسر وتهشم بعظم الفخذ مع صفيحة و بلاتين دائمي بعد العملية 	350000	2026-03-30 13:15:42.40014	2026-01-15	استشارة اولية		استشارة طبية	3	07806730031	ذي قار الناصرية سوق الشيوخ	حادث سيارة 							f			طبيب خارجي	حيدر حازم العطار	كسر	الفخذ	[{"type":"كسر","area":"الفخذ","side":"يمين"}]	new
824	جود محمد جاسم حمد 	5	40	90	physiotherapy	f		t	ضمور بالدماغ + قصر اوتار الساقين 	0	2026-03-31 07:38:31.075314	2020-05-07	استشارة اولية		استشارة طبية	3	07864724098	ذي قار سوق الشيوخ حس الجوادين 	ولادي							f			طبيب خارجي	دكتور انمار علاء 	ضمور عصبي	الساق	[{"type":"ضمور عصبي","area":"الساق","side":"كلاهما"}]	new
826	منتهى حسين علي فليح 	43	120	165	physiotherapy	f		t	شلل نصفي للجزء الايمن من الجسم + فقد النطق	0	2026-03-31 08:17:26.088157	2024-01-01	استشارة اولية		استشارة طبية	3	07828940687	ذي قار الناصريه حي الخضراء 	جلطة دماغية 							f			تيك توك	صفحة دكتور ياسر 	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	new
825	سناء حسن سعيد 	40	75	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		19150000	2026-03-31 08:15:51.557169	2026-01-01		اكيلون فاك بريطاني 		2	07811182318	بغداد	قدم سكري 			اكتف فاكيوم	اكيلون فاك	24L	لايوجد 	f			فيسبوك					new
828	فندي جولو كوتي 	65	70	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-03-31 13:25:59.813753	2025-11-04	تمت المعاينة من قبل استاذ سيف تم عرض طرف تحت الركبة وبسعر ثلاثة ملايين نظاف شتل لوك			4	07824916353	نينوى-سنجار	داء السكر							f			فيسبوك					new
817	ازهار محمد عطية يونس	60	58	159	physiotherapy	f		t	جلطة دماغية 	375000	2026-03-30 14:45:25.276434	2021-11-17	استشارة اولية		استشارة طبية	3	07800812257	ذي قار الناصرية شارع بغداد	بسبب ارتفاع الضغط وازمة عصبية 							f			من شخص آخر		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	past
822	ناظم نعيم جبر عبطان 	57	100	175	physiotherapy	f		t	ضعف حركي للجزء الايمن من الجسم 	325000	2026-03-31 05:03:29.822001	2026-03-16	استشارة اولية		استشارة طبية	3	07821616630	ذي قار الناصريه الاصلاح 	جلطة دماغيه 							f			من شخص آخر	من طرف مريض تحسن 	جلطة دماغية، جلطة دماغية	اليد، اليد	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"اليد","side":"يمين"}]	new
818	كفاح محمد عطية يونس	65	78	160	physiotherapy	f		t	اللفافة الاخمسية وتليف بكفين اليد 	275000	2026-03-30 14:51:55.157395	2023-03-14	استشارة اولية		استشارة طبية	3	0556886243	ذي قار الناصرية شارع القضاة 	بسبب الجهد والعمل المستمر 							f			من شخص آخر	اختها مريضة قديمة في المركز		اليد	[{"type":"","area":"اليد","side":"كلاهما"}]	new
814	ناديه داوود سلمان 	46	62	160	physiotherapy	f		t	جلطه دماغيه	350000	2026-03-30 14:14:38.951422	2024-01-04	تم فحص ومعاينه المريضه من قبل دكتور عباس وتم تحديد 10 جلسات من العلاج الطبيعي /اجهزه		أجهزة علاج طبيعي	1	07735125155	بغداد / كويريش 	ارتفاع ضغط الدم							f			من شخص آخر		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يمين"}]	new
830	عبد الخالق مزعل حمدان غانم	38	100	165	physiotherapy	f		t	انزلاق بالفقرات العنقية 	25000	2026-03-31 14:53:23.259302	2024-02-09	استشارة اولية		استشارة طبية	3	07806672408	ذي قار الناصرية حي اريدو 	بسبب العمل المكتبي							f			فيسبوك		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
832	زينب فيصل عطشان جويد	42	85	160	physiotherapy	f		t	تنمل وخدر في اليدين 	0	2026-03-31 18:45:28.709094	2025-05-19	استشارة اولية		استشارة طبية	3	07827526177	ذي قار الفضلية 	بدون سبب يذكر لكن المريضة لديها خلل في الغدة الدرقية 							f			من شخص آخر	مريض قديم في المركز		اليد	[{"type":"","area":"اليد","side":"كلاهما"}]	new
834	صابرين سعد محسن علي 	36	70	165	physiotherapy	f		t	انزلاق بالفقرات العنقية 	0	2026-04-01 11:40:50.101522	2024-03-19	استشارة اولية		استشارة طبية	3	07812347107	ذي قار الناصريه المدينه 	كثرة العمل بالبيت 							f			انستاغرام	صفحة المركز 	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
835	باسم محمد حسين 	47	86	175	physiotherapy	f		t	انزلاق غضروفي 	500000	2026-04-01 12:11:03.501568	2026-02-15	تم فحص ومعاينه المريض من قبل دكتور عباس وتم تحديد 20 جلسات من العلاج الطبيعي /اجهزه		أجهزة علاج طبيعي	1	07700686593	بغداد/زعفرانيه	رفع ثقل 							f			من شخص آخر		انزلاق فقرات	العمود الفقري	[{"type":"انزلاق فقرات","area":"العمود الفقري","side":"يسار"}]	new
836	نعيم بجاي راضي ثامر 	77	80	174	physiotherapy	f		t	شلل نصفي 	0	2026-04-01 13:58:36.070069	\N	استشارة اولية		استشارة طبية	3	07827983538	الناصرية قضاء سوق الشيوخ	جلطة دماغية							f			فيسبوك		جلطة دماغية	منطقة الظهر السفلية	[{"type":"جلطة دماغية","area":"منطقة الظهر السفلية","side":"يسار"}]	
838	ادم رامي عبد الوهاب	9	58	115	medical_support	f		f		150000	2026-04-01 14:25:28.677714	2017-05-10				1	07712271564	بغداد/الدوره 	فلات فوت ولادي حاد 							t	انسول عدد 2	كلا الجانبين	فيسبوك					new
840	رقيه عمار فؤاد	4	14	60	amputee	t	احادي - طرف علوي - يمين - فوق المرفق	f		0	2026-04-01 14:52:12.809313	2021-03-10	مراجعه سابقه منذ 2025 تم شراء يد سلكونيه تجميليه بقيمه 3 مليون ونصف وتم دفع المبلع كامل	يد سلكونيه تجميليه  		1	07902438850	بغداد/الغزاليه 	اثر كانيولا 							f			فيسبوك					past
839	جواهر عبيد مرهج عطية 	65	80	165	physiotherapy	f		t	سوفان بالركبتين بالإضافة الى خدر مستمر 	25000	2026-04-01 14:44:35.68295	2024-09-18	استشارة اولية		استشارة طبية	3	07818564114	ذي قار الناصرية شارع بغداد	بسبب التقدم بالعمر والعمل والجهد المستمر 							f			من شخص آخر	اقاربها يعالجون في المركز	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
842	انوار محمد هادي شبيب	35	72	162	physiotherapy	f		t	تشنج عضلي في الرقبة 	0	2026-04-01 15:30:23.87896	2026-03-25	استشارة اولية		استشارة طبية	3	07837091058	ذي قار الناصرية الصالحية 	حركة خاطئة 							f			من شخص آخر		تشنج عضلي	الرقبة	[{"type":"تشنج عضلي","area":"الرقبة","side":""}]	new
837	زينب ثائر عبد الرحيم مظلوم	15	69	155	physiotherapy	f		t	الم شديد في الساقين 	25000	2026-04-01 14:16:00.570162	2026-03-29	استشارة اولية		استشارة طبية	3	07809835549	ذي قار الاصلاح	فجأة وبدون سبب							f			من شخص آخر	والدها يعالج في المركز		الساق	[{"type":"","area":"الساق","side":"كلاهما"}]	new
841	حسنة لزك ناطور 	60	70	165	physiotherapy	f		t	التصاق بالفقرات القطنية تؤثر على العصب بالإضافة الى انزلاق 	150000	2026-04-01 15:27:40.242464	2025-10-29	استشارة اولية		استشارة طبية	3	07837091058	ذي قار الناصرية الصالحية 	بسبب سوفان وإهمال للحالة 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
812	سوسن عودة ذياب عريبي	46	100	156	physiotherapy	f		t	التهاب و قطع بأعصاب الكتف ، الوتر ، وتلف 	200000	2026-03-30 14:03:01.482689	\N	استشارة اولية		استشارة طبية	3	07813649567	ذي قار الشطرة 	بسبب السكري 							f			طبيب خارجي	حيدر حازم العطار	التهاب اوتار	الكتف	[{"type":"التهاب اوتار","area":"الكتف","side":"يمين"}]	past
833	زيشان حسين غلام 	35	70	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		700000	2026-04-01 08:02:44.576861	\N		مسند +تعليه		2	07854874454	كربلاء 	حادث سير							f			فيسبوك					new
843	ايمان عبد الامير جميل صيهود	30	65	166	physiotherapy	f		t	انزلاق بالفقرات القطنية 4،5	75000	2026-04-01 18:13:46.868821	2026-02-05	استشارة اولية		استشارة طبية	3	07810992489	الناصرية حي الشهداء 	بسبب العمل والجهد المستمر 							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	new
829	زهراء جاسم سالم عباس 	28	62	167	physiotherapy	f		t	سوفان في العنقية 	100000	2026-03-31 13:58:03.181033	2024-08-13	استشارة اولية		استشارة طبية	3	07737801291	بغداد - الكرادة 	جهد وتعب مستمر بسبب العمل							f			من شخص آخر	والدتها تراجع في المركز 	سوفان	الرقبة	[{"type":"سوفان","area":"الرقبة","side":"يسار"}]	new
831	احمد عبد جبار نهيب	56	89	160	physiotherapy	f		t	انزلاق بالفقرات العنقية 	100000	2026-03-31 17:41:14.193982	2023-09-06	استشارة اولية		استشارة طبية	3	07801071375	ذي قار الناصرية شارع 20	بسبب الجهد زالعمل المستمر 							f			فيسبوك		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
844	محمد عطية ربح رديد	47	70	170	physiotherapy	f		t	جلطة بالدماغ	50000	2026-04-01 18:18:09.09122	2026-03-27	استشارة اولية		أجهزة علاج طبيعي	3	07827509436	ذي قار الغراف حي الحرية 	ارتفاع بالضغط							f			مستشفى	مستشفى العين الطابق الخامس ( د حسن ناجي)	جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":"يمين"}]	new
845	اكرم محمد عباس كطن 	44	82	173	physiotherapy	f		t	تشنج عضلي 	25000	2026-04-02 06:57:27.896051	2026-04-01	استشارة اولية		استشارة طبية	3	07808976688	ذي قار قلعة سكر 	حركة خاطئه							f			مستشفى	عن طريق منتسبي الضمان الصحي في المستشفى 	تشنج عضلي	منطقة الظهر السفلية	[{"type":"تشنج عضلي","area":"منطقة الظهر السفلية","side":""}]	new
852	رسول عبد الرضا محمد علي 	46	70	170	physiotherapy	f		t	انزلاق بالفقرات القطنية ال4،5	25000	2026-04-02 13:12:01.58346	2024-07-23	استشارة اولية		استشارة طبية	3	07805460121	ذي قار الناصرية زديناوية 	بدون سبب يذكر 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
847	برير علي عباس 	5	17	60	medical_support	f		f		1000000	2026-04-02 10:52:23.614675	2021-04-07				1	07734638118	بصره /الزبير 	زياده فقرات ولادي/ تشوه ولادي 							t	مسند ظهر  sclosiy		فيسبوك					new
848	حيدر زينهم لطيف	16	70	170	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين	f		0	2026-04-02 12:05:57.701032	\N				2	07768588843	بغداد 	كتر خشب							f			فيسبوك					past
851	محمد صكبان علي مبارك	55	103	173	physiotherapy	f		t	انزلاق بالفقرات القطنية 	0	2026-04-02 13:09:36.667912	2020-08-11	استشارة اولية		استشارة طبية	3	07803022712	ذي قار الناصرية حي اور 	حمل وزن ثقيل 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
853	حيدر كريم عبد جبر 	52	60	170	physiotherapy	f		t	بتر القدم اليمين	0	2026-04-02 13:25:00.903239	\N	استشارة اولية		استشارة طبية	3	07722644151	ذي قار الناصرية الصالحية 	بسبب السكر 							f			من شخص آخر			الساق	[{"type":"","area":"الساق","side":"يمين"}]	new
854	زهراء قاسم حميد	25	56	159	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-04-02 13:35:41.571521	2020-06-10				1	07709245383	بغداد /حي الشباب	تشوه ولادي 							f			فيسبوك					new
855	عائده حسن كامل 	78	54	165	amputee	t	احادي - طرف علوي - يسار - تحت المرفق	f		5000000	2026-01-24 13:42:20	2025-05-03	تم مراجعه المركز وتبين انها تعانيمن بتر الطرف العلوي الايسر وتم شراء يد سلكونيه تجميليه بقيمه 5 مليون دينار عراقي 	يد سلكونيه تجميليه  		1	07736137431	بغداد/الاعطيفيه 	مرض 							f			فيسبوك					new
858	طاهر سعد صبيح جوار	56	69	170	physiotherapy	f		t	انزلاق بالفقرات العنقية 	25000	2026-04-02 18:30:08.675011	2023-03-17	استشارة اولية		استشارة طبية	3	07831433003	ذي قار الناصرية حي الحسين	بسبب إنحناء الرأس لفترات طويلة 							f			من شخص آخر		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
859	محمد عبد الرضا كاظم محمد	65	70	170	physiotherapy	f		t	التهاب بالصدر	25000	2026-04-02 19:06:38.07933	2026-03-19	استشارة اولية		استشارة طبية	3	07801323364	ذي قار الناصرية الشعلة 								f			طبيب خارجي	دكتور احمد يوسف		الصدر	[{"type":"","area":"الصدر","side":""}]	new
860	زين العابدين علي عدنان 	16	70	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-04-04 07:25:08.026235	\N				2	0783195837	بابل 	كانسر 							f			فيسبوك					new
861	رسول عدنان عبد عيسى	46	87	178	physiotherapy	f		t	انزلاق بالفقرات القطنية 	0	2026-04-04 08:11:58.466671	1990-12-25	استشارة اولية		استشارة طبية	3	07811733729	الناصرية الاسكان الصناعي	انزلاق الفقرات							f			من شخص آخر		انزلاق فقرات	القطن	[{"type":"انزلاق فقرات","area":"القطن","side":"كلاهما"}]	new
785	رعد لازم سعود لفته 	70	85	170	physiotherapy	f		t	اصابة حبل شوكي + تم اجراء عملية فقرات له وبعد العمليه اصبح يعاني من ضعف الجزء السفلي من الجسم 	450000	2026-03-29 07:17:37.04906	2015-01-25	استشارة اولية		استشارة طبية	3	07830920350	ذي قار  حي الفداء	كثرة انزلاقات 							f			طبيب خارجي	حساب دكتور ياسر 	اصابة حبل شوكي	الرقبة	[{"type":"اصابة حبل شوكي","area":"الرقبة","side":""}]	new
856	جمال عبد القادر صالح 	69	80	172	physiotherapy	f		t	سوفان مفصل الركبه	0	2026-04-02 14:13:23.76778	\N	مجاني		أجهزة علاج طبيعي	1	07711843128	بغداد/جميله	ضعف عضلي							f			من شخص آخر		سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
849	يوسف حسين علي	22	65	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		60000	2026-04-02 12:13:28.328853	\N		BMK2		2	07847658138	بابل	حادث	حلقي 	36	دكم	سنكل 		bmk2	f			فيسبوك					
850	محمد عنكوش فرج 	26	85	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		50000	2026-04-02 12:19:36.736118	\N	مراجع سابق /	pr04		2	07811961390	بغداد		حلقي 	40	كاربون 	سنكل 	27	3r78	f			فيسبوك					past
846	التفات جويد زاهي سهر	60	80	160	physiotherapy	f		t	سوفان الركبه اليمين	300000	2026-04-02 07:23:47.865701	2021-07-05	استشارة اولية		استشارة طبية	3	07818030991	ذي قار الناصريه حي الشهداء	تقدم العمر							f			مستشفى		سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"يمين"}]	new
863	حسين مرتضى محمد 	15	50	150	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-04 12:01:19.275153	\N		3r78		2	0775745882	ميسان 	ولادي 	سوفت		خلال الركبة سوف سوكت 	سنكل 	23		f			فيسبوك					
864	رفيف خيون حميد 	34	80	180	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين	f		0	2026-04-04 12:04:29.600492	\N		اصابع تجميليه عدد 2		2	07706457710	بصرة 	حادث سيارة 							f			فيسبوك					new
862	انعام محمد علي صغير  جبر	63	82	165	physiotherapy	f		t	انزلاق بالفقرات القطنية الرابعه والخامسة	25000	2026-04-04 11:35:19.031455	2000-01-04	استشارة اولية		استشارة طبية	3	07809016528	ذي قار الناصريه سومر	رفع احمال ثقيلة							f			طبيب خارجي	ائد محمد حسن	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
865	باقر سعد عبد الجليل جحيل	1	7	80	physiotherapy	f		t	نسبة 40 بالميه ضمور بالدماغ 	200000	2026-04-04 12:14:42.740837	2025-10-10	استشارة اولية		استشارة طبية	3		ذي قار الناصريه الاسكان الصناعي	ولادي							f			انستاغرام	صفحة المركز 	ضمور عصبي	الرقبة	[{"type":"ضمور عصبي","area":"الرقبة","side":"كلاهما"}]	new
871	خالد عباس داوود 	64	80	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-04 15:00:54.921535	2022-10-12	مريض سابق منذ 2022 تم شراء طرف بقيمه مليون 500000 الف دينار عراقي	طرف تحت الركبه شتل لوك 		1	07705306215	بغداد/دار المسنين	القدم السكري 	البس		شتل لوك	سنكل		تحت الركبه	f			فيسبوك					past
872	محمد احمد علي ياسر 	29	88	178	physiotherapy	f		t	انزلاق بالفقرات القطنية 	0	2026-04-04 15:03:12.647796	2024-07-16	استشارة اولية		استشارة طبية	3	07801522862	ذي قار الناصرية دور النفط	بسبب كرة القدم 							f			طبيب خارجي	حسن ناجي ال شدود	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
873	لميعة ياسين حسين محمد	70	80	155	physiotherapy	f		t	سوفان بالركبتين 	0	2026-04-04 15:21:00.735197	2024-03-20	استشارة اولية		استشارة طبية	3	07807155335	ذي قار الناصرية شارع بغداد	التقدم في السن 							f			طبيبنا	دكتور بيرم 	سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
870	عليه زبيدي والي جوران	53	85	160	physiotherapy	f		t	جلطة دماغية 	25000	2026-04-04 14:58:21.649748	2022-11-16	استشارة اولية		استشارة طبية	3	07823336592	ذي قار الناصرية الحبوبي	ارتفاع بالضغط							f			فيسبوك		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	new
869	سجاد احمد نعمة مطير	16	70	160	physiotherapy	f		t	ضمور بالدماغ	100000	2026-04-04 14:44:16.011714	\N	استشارة اولية		استشارة طبية	3	07866544126	ذي قار الناصرية الاسكان الصناعي 	من الولادة 							f			انستاغرام		ضمور عصبي		[{"type":"ضمور عصبي","area":"","side":""}]	new
857	علاء حسين علي داوود	51	171	176	physiotherapy	f		t	انزلاق بالفقرات القطنية 	150000	2026-04-02 14:53:10.327305	2024-07-15	استشارة اولية		استشارة طبية	3	07802674257	ذي قار الناصرية الاسكان الصناعي 	حمل اوزان ثقيلة وبسبب الوزن الزائد وأشتد الالم عنده بسبب حركة خطأ							f			طبيب خارجي	حيدر حازم العطار	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	new
877	زين العابدين اسعد محمد جاسم 	5	13	75	physiotherapy	f		t	ضفيرة العصبيه او قطع ولادي 	0	2026-04-05 07:26:50.003001	2021-07-07	استشارة اولية		استشارة طبية	3	07827491612	ذي قار الناصريه الشرقيه 	اثناء الولاده							f			مستشفى	عن طريق الضمان الصحي 	إصابة عصب محيطي	اليد	[{"type":"إصابة عصب محيطي","area":"اليد","side":"يسار"}]	new
876	حسين عبد ياسين ياسر 	54	95	183	physiotherapy	f		t	نتوء القدم 	50000	2026-04-05 07:06:05.255083	2025-03-10	استشارة اولية		استشارة طبية	3	07824460112	ذي قار الغراف 	غير معروف 							f			مستشفى	والد منتسب في صيدلية المستشفى 	نتوء عظمي	القدم	[{"type":"نتوء عظمي","area":"القدم","side":"يسار"}]	new
875	علي جاسم سوادي خلاوي 	41	75	170	physiotherapy	f		t	انزلاق بالفقرات العنقية 	150000	2026-04-04 16:43:40.735475	2022-06-21	استشارة اولية		استشارة طبية	3	07807395933	ذي قار الناصرية حي سومر 	بسبب العمل المكتبي 							f			طبيب خارجي	علي فاخر+ غفران كاظم	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
867	هبة كاظم مجباس جاسم	33	80	160	physiotherapy	f		t	تمزق بأنسجة كعب القدم 	50000	2026-04-04 13:42:20.554121	2023-06-20	استشارة اولية		استشارة طبية	3	07808207170	ذي قار الناصرية حي اور 	بسبب الوقوف لفترات طويلة 							f			طبيب خارجي	حيدر حازم العطار		القدم	[{"type":"","area":"القدم","side":"يمين"}]	new
874	فاطمه مهند احمد 	16	70	160	physiotherapy	f		t	ورم في الدماغ مع ضعف العضلات الجهه اليسرى مع سقوط قدم	450000	2026-04-04 15:46:51.386087	2024-09-10	تم فحص ومعاينه المريضه وتم تحديد 10 جلسات علاج طبيعي من قبل الدكتور عباس بقيمه 250 الف دينار عراقي (جلستين مجانيه)		أجهزة علاج طبيعي	1	07901522847	بغداد								f			من شخص آخر		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يسار"}]	new
879	عبد الله خالد محسن 	17	96	170	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		10875000	2026-04-05 08:29:29.555275	\N		3r78 		2	07702235560	ديالى 	كانسر 	حلقي 		كاربون 	سنكل 	27R	3R78	f			فيسبوك					new
880	زهرة غانم طلاب سدخان 	69	75	169	physiotherapy	f		t	انزلاق فقرات	200000	2026-04-05 08:31:54.885904	\N			استشارة طبية	3	07847935849	ذي قار سوق الشيوخ ناحية العكيكة	اجراء عملية سابقا للفقرات وفشلت							f			من شخص آخر	استاذ جامعي عبد الرحمن البطاط 	انزلاق فقرات، تشنج عضلي	الرقبة، الكتف	[{"type":"انزلاق فقرات","area":"الرقبة","side":"كلاهما"},{"type":"تشنج عضلي","area":"الكتف","side":"يمين"}]	new
881	غازي صالح مهدي 	61	88	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		4000000	2026-04-05 13:34:05.66186	2024-08-14		3R15 + قدم متحركه		1	07829163227	صلاح الدين /بلد	سكري 	البس	42	شتل لوك	سنكل	28	3R15	f			فيسبوك					new
882	علي اسعد عبد الخالق	13	53	155	medical_support	f		f		0	2026-04-05 14:53:01.515784	2012-03-08				1	07705311432	بغداد/الراشديه	فلات فوت ولادي 							t	انسول عدد 2	كلا الجانبين	فيسبوك					new
885	مهند يوسف احمد 	27	85	177	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-05 15:25:47.136481	2014-02-05	مراجع سابق منذ 2025 تم شراء طرف بايونيك بقيمه 3 مليون دينار عراقي 	بايونيك عرض		1	07709994090	بغداد/الاعظميه	انفجار	البس		فاكيوم	R26		تحت الركبه	f			فيسبوك					past
884	خمائل عبد الكريم عويد حنشل	46	86	170	physiotherapy	f		t	انزلاق غضروفي	75000	2026-04-05 15:20:46.010694	2018-11-14	استشارة اولية		استشارة طبية	3	07814693299	ذي قار الناصرية الاسكان الصناعي	بسبب العمل والجهد المستمر  							f			من شخص آخر		انزلاق ديسك	منطقة الظهر السفلية	[{"type":"انزلاق ديسك","area":"منطقة الظهر السفلية","side":""}]	new
886	تاجية محمد ملاجي 	70	80	165	physiotherapy	f		t	جلطة دماغية 	150000	2026-04-05 15:38:18.034252	2026-03-08	استشارة اولية		استشارة طبية	3	07719533864	البصرة 	ارتفاع بالضغط							f			تيك توك		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	new
889	سحر فهد علي سهر	52	70	155	physiotherapy	f		t	انزلاق بالفقرات القطنية 	0	2026-04-06 07:23:38.269312	2023-09-06	استشارة اولية		استشارة طبية	3	07816704595	ذي قار الناصريه الحي العسكري	سقوط على ارضية 							f			مستشفى		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	past
890	شيماء عطيه سلمان مهاوش 	24	54	165	physiotherapy	f		t	تصلب اعصاب كف اليدين 	0	2026-04-06 07:49:55.345107	2019-04-15	حضرت للاستشاره سابقا اكثر من مره وباشرت اليوم اول جلسات العلاج الطبيعي الخاصه بها بتوصيه من مسؤول المنظمة الدوليه حمزه عيسى بالاتفاق مع الدكتور ياسر 		تمارين تأهيلية	3	078	ذي قار الناصريه الاسكان الصناعي	بسبب مرض ويلسن 							f			طبيبنا	د. بيرام 	ضمور عصبي	اليد	[{"type":"ضمور عصبي","area":"اليد","side":"كلاهما"}]	past
892	علاوي حسن بحاك 	67	120	180	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		1500000	2026-04-06 08:18:24.912184	2025-07-01		طرف بقدم ثابتة 		2	07804338486	نجف 	قدم سكري 	سوفت سوكت		دكم 	ساج	48L		f			فيسبوك					new
891	عبد فخري عطية 	67	100	178	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		3000000	2026-04-06 08:01:16.994606	2025-11-01	يحتاج الى علاج طبيعي 	طرف تحت الركبة الايسر 		2	07812740008	كربلاء 	قدم سكري 	البس		دكم	سنكل 		لايوجد 	f			فيسبوك					new
893	زهراء عادل حمزة 	8	20	110	medical_support	f		f		550000	2026-04-06 09:28:36.220579	\N	مراجع جديد 			2	07824648889	بابل 	وهن بالعضام 							t	مسند AFO عدد2	كلا الجانبين 	فيسبوك					new
888	باسم جياد جبر سلمان 	58	70	170	physiotherapy	f		t	جلطة دماغية 	200000	2026-04-05 16:42:23.490508	2024-07-17	استشارة اولية		استشارة طبية	3	07801314625	ذي قار الناصرية قرب محطة القطار 	بسبب اخذه لعلاج خطأ 							f			فيسبوك		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	new
887	ستار جبار كاظم طخيخ	62	73	172	physiotherapy	f		t	جلطات بالدماغ 	150000	2026-04-05 15:55:17.051413	2026-01-01	استشارة اولية		استشارة طبية	3	07855533995	ذي قار الناصرية الشموخ	ارتفاع بالضغط 							f			من شخص آخر		جلطة دماغية	الساق	[{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	new
868	كاظم مجباس جاسم بنيان 	60	85	167	physiotherapy	f		t	جلطة دماغية + انزلاق بالفقرات 4،5 القطنية 	125000	2026-04-04 13:46:21.4565	2020-11-18	استشارة اولية 		استشارة طبية	3	07832013234	ذي قار الناصرية حي سومر 	ارتفاع بالضغط 							f			من شخص آخر		جلطة دماغية، جلطة دماغية، انزلاق فقرات	اليد، الساق، منطقة الظهر السفلية	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"},{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	new
883	مدينة محمد داخل محسن	60	70	156	physiotherapy	f		t	انسداد بقناة الحبل الشوكي 	150000	2026-04-05 15:07:59.961095	2020-06-16	استشارة اولية		استشارة طبية	3	07830377053	ذي قار الناصرية الشموخ	بسبب العمل والجهد المستمر  ورعاية مريض 							f			من شخص آخر			منطقة الظهر السفلية	[{"type":"","area":"منطقة الظهر السفلية","side":"كلاهما"}]	new
896	علي داوود صكر حسن	33	70	184	physiotherapy	f		t	تمزق في الكتف 	0	2026-04-06 14:03:08.209922	2026-03-30	استشارة اولية		استشارة طبية	3	07817420190	ذي قار الناصرية مدينة البكر	بسبب تمارين رياضية 							f			فيسبوك		إصابة اربطة	الكتف	[{"type":"إصابة اربطة","area":"الكتف","side":"يمين"}]	new
894	حسن علي موسى حشيش	60	60	170	physiotherapy	f		t	انزلاق بالفقرات العنقية 	50000	2026-04-06 13:30:35.721012	2018-05-18	استشارة اولية		استشارة طبية	3	07803273510	ذي قار الشطرة حي الامين	بسبب العمل المكتبي 							f			من شخص آخر		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
897	منتظر رزاق وهاب 	16	53	160	medical_support	f		f		1250000	2026-04-06 15:04:54.090105	2009-08-05				1	07831585855	بابل /الحصوه	ولادي							t	مسند تقويمي للظهر 	انحراف العامود الفقري	طبيب خارجي	الدكتور ضرغام كامل مجيد				new
895	هديل فيصل كريم 	23	53	160	medical_support	f		f		40000	2026-04-06 13:46:15.498662	2015-04-09				1	07818377082	بغداد/الزعفرانيه	قصر قدم الطرف الايمن اثر انفجار 							t	دبان تعليه 2 سم	الطرف الايمن	فيسبوك					past
898	سعاد شلاكة ثجيل كيتب	45	75	156	physiotherapy	f		t	الام مستمرة في الكتف 	0	2026-04-06 15:43:07.134033	2025-01-20	استشارة اولية		استشارة طبية	3	07830378891	ذي قار الشطرة 	دون معرفة سبب صريح 							f			من شخص آخر			الكتف	[{"type":"","area":"الكتف","side":"يمين"}]	new
899	محمد محسن مطير عبد 	31	65	170	physiotherapy	f		t	شلل نصفي للجزء الايمن من الجسم + النطق 	25000	2026-04-07 05:54:44.367605	2024-09-18	استشارة اولية		استشارة طبية	3	07810946270	السماوه حي الرساله 	جلطة دماغيه 							f			فيسبوك	ضرغام الحسيناوي 	جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"},{"type":"جلطة دماغية","area":"الساق","side":"يمين"}]	new
900	احلام شاكر علاوي زراك 	60	85	160	physiotherapy	f		t	تبديل مفصل 	175000	2026-04-07 07:10:09.521329	2026-03-31	استشارة اولية		استشارة طبية	3	07826033370	ذي قار الناصريه حي اور 	سوفان 							f			طبيب خارجي	دكتور خليل ابراهيم 	تبديل مفصل	الركبة	[{"type":"تبديل مفصل","area":"الركبة","side":"يسار"}]	new
904	ابتسام جدوع محمد 	59	100	120	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1425000	2026-04-07 12:24:49.000219	2025-12-10		طرف ثابت تحت الركبة		2	07860241168	كربلاء 	قدم سكري 				ساج			f			فيسبوك					new
902	حسين كريم حسين 	16	60	160	amputee	t	اطراف سليكونية تعويضية - كف - يسار	f		0	2026-04-07 12:17:58.350859	\N				2	07831020798	الديوانية 	ولادي 							f			فيسبوك					past
903	حسين غازي جواد	60	75	175	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-07 12:20:36.642485	\N		سوفت سوكت 		2	07804680654	بابل 	حرب ايران 	سوفت 		دكم	سنكل 		لايوجد 	f			فيسبوك					past
905	محمد علي محسن 	15	50	160	amputee	t	احادي - طرف سفلي - يسار - خلال الركبة	f		0	2026-04-07 12:30:46.690542	\N	مراجع جديد /مجاني	طرف خلال الركبة 		2	07801273767	نجف	ولادي 	سوفت 			سنكل 		3r20	f			فيسبوك					new
906	محمود مزهر حميد	70	90	100	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-07 12:34:29.685552	\N				2	07700006166	بصرة 	قدم سكري 							f			فيسبوك					new
907	احمد محمد حسين	21	60	186	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-04-07 12:58:45.261028	2025-02-05		مسند ايفو كاربون الماني		1	07807219523	بابل /الحله	حادث سير							f			فيسبوك					new
912	عادل داخل عفيت جود الله	44	96	170	physiotherapy	f		t	انزلاق بالفقرات القطنية 	100000	2026-04-07 17:04:29.84136	2025-10-16	استشارة اولية		استشارة طبية	3	07866152090	ذي قار الناصرية حي الحكيم 	حمل وزن ثقيل 							f			طبيب خارجي	حيدر حازم العطار	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
910	محمد ياسين عبدالله	34	75	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-04-07 15:23:21.106309	2020-03-11				1	07806644644	بغداد/الفحامه 	انفجار							f			جهة حكومية					new
909	حيال جوال فهد سالم 	85	80	170	physiotherapy	f		t	بتر قدم سكري	125000	2026-04-07 13:51:34.724466	2025-04-16	استشارة اولية		استشارة طبية	3	07825586826	ذي قار الناصرية كرمة بني سعيد	بسبب مرض السكر 							f			طبيب خارجي	حيدر حازم العطار		الساق	[{"type":"","area":"الساق","side":"يمين"}]	new
901	صادق عبد جراح سرحان	75	85	165	physiotherapy	f		t	انزلاق دسك	75000	2026-04-07 10:08:10.173196	2023-04-23	استشارة اولية		استشارة طبية	3	07808007875	ذي قار الناصريه الحبيليه	انزلاق فقرات							f			طبيب خارجي	اكرم علي الموسوي	انزلاق ديسك	منطقة الظهر السفلية	[{"type":"انزلاق ديسك","area":"منطقة الظهر السفلية","side":""}]	new
913	عبدالرحمن طه شهاب 	30	72	188	medical_support	f		f		0	2026-04-08 11:50:03.123607	2015-05-13	بتر جزئي في الاذن الايسر تم المعاينه والفحص فقط			1	07824911296	بغداد/كراده مريم 	طلق ناري							t		الجهه اليسرى	فيسبوك					new
908	شهم اسماعيل شعلان	4	9	80	physiotherapy	f		t	ضمور  خلايا الدماغ (cp)	250000	2026-04-07 13:48:48.340821	2019-08-01	تمت معاينه المريض وتم تحديد جلسات علاج طبيعي مع تمارين لمده 3 اشهر 		استشارة طبية	1	07774789363	بغداد/عويريج	ضمور ولادي							f			من شخص آخر		شلل دماغ	الرأس	[{"type":"شلل دماغ","area":"الرأس","side":""}]	new
911	خيرية عبد علي عطيوي جواد	45	66	156	physiotherapy	f		t	التهاب في الكتف 	100000	2026-04-07 15:28:11.719353	2026-03-01	استشارة اولية		استشارة طبية	3	07839648440	ذي قار الناصرية سومر	بسبب الجهد والعمل المستمر 							f			من شخص آخر			الكتف	[{"type":"","area":"الكتف","side":"يسار"}]	new
928	علي عبدالله عيسى 	35	68	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		4000000	2026-04-09 14:05:11.880172	2005-07-13		طرف تحت الركبه سنكل مع قالب كاربون 		1	07809912200	بغداد/حي الجهاد 	انفجار 	البس	26	فاكيوم	سنكل	26	تحت الركبه	f			فيسبوك					new
919	جميلة محسن شنيار يوسف	77	70	170	physiotherapy	f		t	جلطة دماغية 	0	2026-04-08 14:23:57.017691	2026-03-05	استشارة اولية		استشارة طبية	3	0780190981	ذي قار الفهود	بدون سبب يذكر 							f			فيسبوك		جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":"يمين"}]	new
920	ايات غني جاسم محمد	32	60	156	medical_support	f		f	FOOT DROOP	175000	2026-04-08 16:22:53.25716	2024-05-07	استشارة اولية			3	07809955995	ذي قار الرفاعي 	تلف خلايا الدماغ بسبب وقف القلب							t	AFO ARTICULATED	كلاهما 	طبيب خارجي	عون شايع				past
921	تركي فضاله ضويف بريص	75	71	169	physiotherapy	f		t	اليد اليمنى في ثقل وقلة حركة	25000	2026-04-09 05:22:50.268936	2025-07-08	استشارة اولية		استشارة طبية	3	07839279449	الناصرية منطقة الفداء	جلطة دماغية							f			من شخص آخر		جلطة دماغية	الصدر	[{"type":"جلطة دماغية","area":"الصدر","side":"يمين"}]	new
922	عقيل صادق علي جراح 	40	100	176	physiotherapy	f		t	انزلاق بالفقرات العنقية + انزلاق دسك للفقرات القطنيه وقد اجرى عملية تثبيت سابقة 	0	2026-04-09 06:03:51.453698	2025-03-03	استشارة اولية		استشارة طبية	3	07801766723	ذي قار الناصريه الحبيليه 	انزلاق							f			من شخص آخر	من طرف مراجع باسم صادق عبد جراح 	انزلاق فقرات، انزلاق ديسك	الرقبة، منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"الرقبة","side":""},{"type":"انزلاق ديسك","area":"منطقة الظهر السفلية","side":""}]	new
923	سكينه مجباس جاسم ابنيان 	52	92	162	physiotherapy	f		t	انزلاق بالفقرات القطنية + سوفان الركبتان 	0	2026-04-09 06:10:44.636214	2023-11-07	استشارة اولية		استشارة طبية	3	07832013234	ذي قار الناصريه حي سومر 	كثرة العمل 							f			من شخص آخر	من مراجع سابق باسم كاظم مجباس 	انزلاق فقرات، سوفان	منطقة الظهر السفلية، الركبة	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""},{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
924	حيدر احمد مرزق عبد 	24	60	170	physiotherapy	f		t	شلل نصفي ضعف حركه للجزء الايمن من الجسم 	25000	2026-04-09 06:46:15.504193	2021-11-15	استشارة اولية		استشارة طبية	3	07705963371	البصره قضاء القرنه 	عملية رفع ورم بالدماغ 							f			فيسبوك	صفحة المركز 	نزف دماغي	الرأس	[{"type":"نزف دماغي","area":"الرأس","side":"يمين"}]	new
925	عباس صادق عبد الرضا 	26	60	175	amputee	t	احادي - طرف علوي - يمين - فوق المرفق	f		0	2026-04-09 09:04:12.713057	2022-02-01		يد سلكونيه تجميليه مع عكس ميكانيكي الماني		2	07819191682	صلاح الدين 	حادث عمل							f			فيسبوك					past
926	سميره زنبور ناشور 	53	62	160	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-08 10:42:15	2025-09-13	مراجع سابق منذ 2025 تم شراء طرف كاربوني بايونيك بقيمه 3 مليون دينار عراقي 	طرف تحت الركبه مع قدم كاربونيه  بايونك		1	07734426336	واسط /مركز المدينه 	سكري 			شتل لوك	كاربون بايونيك			f			فيسبوك					past
929	ياسين قيس ياسين 	34	105	186	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-04-09 14:14:27.82308	2012-05-16	مراجع سابق منذ 2022 تم شراء قالب كاربون علما انو جريح داخليه 	قالب فوق الركبه  كاربون 		1	07739070722	بغداد	انفجار 	هيما حلقي 						f			جهة حكومية					past
930	افنان صبحي حسين	25	50	150	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-09 15:29:30.288457	2026-02-10		1c62 		1	07722985300	موصل /حي الوحده	تشوه ولادي	البس	26	فاكيوم	1c62	27	تحت الركبه	f			فيسبوك					new
932	عباس رياض خالد عثمان 	19	60	159	physiotherapy	f		t	شلل رباعي	0	2026-04-11 05:56:30.183023	\N	استشارة اولية		استشارة طبية	3	07824616214	الناصرية منطقة ال ابو عظم	شلل رباعي							f			فيسبوك		شلل اطفال		[{"type":"شلل اطفال","area":"","side":"كلاهما"}]	new
934	نجودة موسى حمودي موسى 	75	60	175	physiotherapy	f		t	شلل نصفي	0	2026-04-11 06:45:42.141178	2026-02-21			استشارة طبية	3	07808455917	الناصرية حي الاسكان القديم قرب الكمارك	جلطة دماغية							f			فيسبوك		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يمين"}]	new
935	بخيته صالح ضايف مخيط	56	73	169	physiotherapy	f		t	تليف في الكتف الايسر	0	2026-04-11 07:27:29.089873	2025-06-19	استشارة اولية		استشارة طبية	3	07808449680	الناصرية حي اريدو قرب مستشفى الناصرية للقلب	جهد وتعب مستمر بسبب العمل							f			فيسبوك		التهاب اوتار	الكتف	[{"type":"التهاب اوتار","area":"الكتف","side":"يسار"}]	new
927	زينب اياد كاظم 	9	16	100	medical_support	f		f		150000	2026-04-09 12:49:24.690931	2017-03-15				1		بغداد/ قريه المسافر	شلل دماغي							t	afo	كلا الجانبين	فيسبوك					new
917	اماني ذياب عبد عيد	42	115	158	physiotherapy	f		t	عملية تبديل انزلاق غضروفي 	150000	2026-04-08 13:23:52.563706	2024-06-12	استشارة اولية		استشارة طبية	3	07827051442	ذي قار الناصرية السكك	بدون سبب يذكر والالم مستمر بعد العملية 							f			انستاغرام		انزلاق فقرات	الرقبة، الكتف	[{"type":"انزلاق فقرات","area":"الرقبة","side":""},{"type":"","area":"الكتف","side":"كلاهما"}]	new
931	علي رياض عبد الجبار محيسن 	40	80	165	physiotherapy	f		t	جلطة دماغية 	175000	2026-04-09 17:59:19.837035	2025-10-10	استشارة اولية		استشارة طبية	3	07831066842	ذي قار الغراف 	ارتفاع بالضغط							f			من شخص آخر	عن طريق قيس ضيول مسؤول العمليات في المستشفى 	جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":"يمين"}]	new
939	 افراح عبد المهدي خلف طاهر	56			physiotherapy	f		t		25000	2026-04-11 11:11:15.167702	2026-04-10			تمارين تأهيلية	3	07808979973	الناصرية منطقة اور 								f			مستشفى	دكتور محمود شهاب	تبديل مفصل	الركبة	[{"type":"تبديل مفصل","area":"الركبة","side":"كلاهما"}]	new
941	حكيمة خضر راضي حمود	52	56	170	physiotherapy	f		t	ورم  في الحبل الشوكي	0	2026-04-11 11:50:07.713469	2025-10-27	استشارة اولية		استشارة طبية	3	07812823080	ذي قار قضاء الشطرة 	ورم في الحبل الشوكي							f			تيك توك		اصابة حبل شوكي	العمود الفقري	[{"type":"اصابة حبل شوكي","area":"العمود الفقري","side":"يسار"}]	new
942	زينب عبد الحسين راضي	36	75	175	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-04-11 11:56:05.981654	\N				2	07808343868	المثنى 	حادث سقوط 							f			فيسبوك					new
943	نيران عبدالهادي عبد علي	50	89	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		150000	2026-04-11 12:12:36.636541	2008-10-15				1	07815209086	بابل /شارع 60	انسداد شرايين   							f			فيسبوك					new
944	 دنيا فالح عبد الساده كشكول	34			physiotherapy	f		t	التهاب بالركبة	25000	2026-04-11 12:14:15.629643	2026-04-02	استشارة اولية		أجهزة علاج طبيعي	3	 07737087014	ذي قار قضاء الجبايش	التهاب في الركبة							f			مستشفى		التهاب اوتار	الركبة	[{"type":"التهاب اوتار","area":"الركبة","side":"كلاهما"}]	new
945	فلاح حسن جوده عذيب 	35	108	185	physiotherapy	f		t	انزلاق فقرات	0	2026-04-11 12:27:51.12805	2025-11-06	استشارة اولية		استشارة طبية	3	07872001854	الناصرية منطقة التضحية	انزلاق فقرات							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	new
947	غرام رائد حميد 	15	42	155	medical_support	f		f		75000	2026-04-11 13:01:48.179553	2010-03-17				1	07835771258	بغداد/الدوره 	دوران الاقدام الى الداخل ولادي 							t	حزام تدوير 	كلا الجانبين	فيسبوك					new
946	نمر محمد فاضل 	10	55	120	medical_support	f		f		150000	2026-04-11 12:49:44.569795	2017-09-12				1	07709928230	بغداد/الدوره	فلات فوت ولادي 							t	انسول عدد 2	كلا الجانبين	فيسبوك					new
955	هناء جاسم محمد سرحان 	48	73	176	physiotherapy	f		t	شلل نصفي	25000	2026-04-12 05:35:15.743305	2024-04-23	استشارة اولية		استشارة طبية	3	07830831780	ذي قار قضاء الرفاعي	جلطة دماغية							f			فيسبوك		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	new
952	فوزية خضير عباس جبر 	65	70	165	physiotherapy	f		t	جلطة دماغية 	100000	2026-04-11 14:19:25.859073	2026-02-05	استشارة اولية		استشارة طبية	3	07812482526	ذي قار الشطرة حي المعلمين 	بسبب انفعال وازمة عصبية 							f			من شخص آخر		جلطة دماغية، جلطة دماغية	اليد، الساق	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	new
953	سعدية قاسم حميد جار الله	53	85	156	physiotherapy	f		t	سوفان بالرقبة 	25000	2026-04-11 15:37:36.091818	2025-01-16	استشارة اولية		استشارة طبية	3	07821382366	ذي قار الرفاعي 	بسبب حركة خطأ							f			من شخص آخر	مريض لديهم مستمر بالجلسات 	سوفان	الرقبة	[{"type":"سوفان","area":"الرقبة","side":""}]	new
954	زيد ايمن احمد 	5	18	100	medical_support	f		f		150000	2026-04-11 16:52:42.694421	2021-02-10				1	07729179303	بغداد/العامريه	ولادي							t	afo عدد2	كلا الجانبين	فيسبوك					new
950	نصيف جاسم محمد عليوي 	72	70	175	physiotherapy	f		t	جلطة دماغية 	25000	2026-04-11 14:05:00.822173	2025-02-13	استشارة اولية		استشارة طبية	3	07810737327	ذي قار الشطرة بني زيد	مضاعفات بسبب عمليات سابقة والإرتفاع بالضغط							f			من شخص آخر		جلطة دماغية	اليد	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"}]	new
940	عباس علي عبد	58	62	165	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		3000000	2026-04-11 11:47:37.799838	2025-06-05		 طرف تحت الركبه  بايونك (عرض)		1	07702999772	بغداد/حي اور 	سكري	البس	26	فاكيوم	كاربون بايونيك	26	تحت الركبه	f			فيسبوك					new
948	شمسه حمودي عداي العلي	78			physiotherapy	f		t	بسبب خلل بخلايا الدماغ	75000	2026-04-11 13:31:42.932143	\N	استشارة اولية		استشارة طبية	3	07840488506	ذي قار الناصرية حي الفداء 	بسبب امراض مزمنة 							f			فيسبوك					new
949	خلود ثجيل عبدعلي	46	67	159	physiotherapy	f		t	شلل نصفي 	650000	2026-04-11 13:57:15.29254	2024-01-01	تم فحص ومعاينه المريضه من قبل دكتور عباس وتم تحديد 10 جلسات من العلاج الطبيعي /روبوت		روبوت	1	07805053207	واسط/الصويره	جلطه دماغيه							f			من شخص آخر		جلطة دماغية	الرأس	[{"type":"جلطة دماغية","area":"الرأس","side":"يسار"}]	new
951	إنتظار ابراهيم داخل محمد	43	75	163	physiotherapy	f		t	انزلاق بالفقرات القطنية 	50000	2026-04-11 14:08:16.33986	2022-01-19	استشارة اولية		استشارة طبية	3	07832238187	ذي قار الناصرية التضحية 	بسبب حادث سقوط 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
608	عبد المحسن عبد الرزاق ظاهر 	71	57	180	physiotherapy	f		t	كسر في اليد جلطة بالدماغ	375000	2026-03-05 17:37:21.374438	2025-10-25	استشارة اولية		استشارة طبية	3	07806280828	ذي قار سيد دخيل 	حادث سيارة 							f			من شخص آخر	المعاون الاداري المسائي سيد يونس طلب	جلطة دماغية، جلطة دماغية	اليد، القدم	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"},{"type":"جلطة دماغية","area":"القدم","side":"يسار"}]	\N
956	جعفر عبد الرضا سمير دهش	53	80	178	physiotherapy	f		t	انزلاق فقرات	0	2026-04-12 07:33:58.446726	2022-09-14	استشارة اولية		استشارة طبية	3	07834077714	الناصرية منطقة الصالحية	انزلاق فقرات 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	new
962	علي طارق حسن	35	83	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		5000000	2026-04-12 12:40:33.259732	2025-03-12		طرف تحت الركبه سنكل		1	07802134908	ديالى/بلدروز	حادث سير	بروتد	30	فاكيوم	سنكل	27	تحت الركبه	f			فيسبوك					new
958	وليد برهان شناوه عبد الله 	44	103	180	physiotherapy	f		t	انزلاق بالفقرات 	0	2026-04-12 11:24:41.484549	2026-02-05	استشارة اولية		استشارة طبية	3	07801555561	ذي قار قضاء الشطرة 	انزلاق الفقرات							f			تيك توك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	new
960	رائد هلال لفته صخيط	50	93	175	physiotherapy	f		t	تشنج عضلي	0	2026-04-12 11:49:00.200507	2023-07-12	استشارة اولية		استشارة طبية	3	07801555561	ذي قار قضاء الشطرة 	جهد وتعب مستمر بسبب العمل							f			تيك توك		تشنج عضلي	الكتف	[{"type":"تشنج عضلي","area":"الكتف","side":"كلاهما"}]	new
961	سمرهن غازي مرعش	45	90	100	amputee	t	ثنائي - سفلي | يمين: تحت الركبة | يسار: تحت الركبة	f		0	2026-04-12 12:26:09.1437	\N		قالب كاربون تحت الركبة عدد2		2	07716768961	بصرة 	حادث سيارة 							f			فيسبوك					past
963	رحيم كامل عبد الحسن حماس	27			physiotherapy	f		t	شلل رباعي 	0	2026-04-12 13:45:17.082669	1999-06-15	استشارة اولية		استشارة طبية	3	07809823050	ذي قار الناصرية مدينة الصدر 	بعد الولادة بإسبوع 							f			فيسبوك		شلل دماغ		[{"type":"شلل دماغ","area":"","side":""}]	new
964	رواء علي ستار جبار	32	60	156	physiotherapy	f		t	انزلاق بالفقرات العنقية 	25000	2026-04-12 15:29:59.871565	2026-01-16	استشارة اولية		استشارة طبية	3	07812421251	ذي قار الناصرية مدينة الصدر	بدون سبب يذكر 							f			من شخص آخر	الموظف زياد	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
967	هالة عبد علي نزال خفي	46	60	170	physiotherapy	f		t	ضعف في العضلات 	0	2026-04-12 16:34:25.008937	2019-09-12	استشارة اولية		استشارة طبية	3	07776453689	ذي قار الناصرية حي اور 	حادث سقوط منمكان عالي 							f			من شخص آخر		قطع جزئي في العضلات	الساق	[{"type":"قطع جزئي في العضلات","area":"الساق","side":"كلاهما"}]	new
933	منير هاشم عويد عبود	44	75	170	physiotherapy	f		t	انزلاق الفقرات 	100000	2026-04-11 06:28:13.846151	2019-08-10	استشارة اولية		استشارة طبية	3	07813672927	الناصرية حي الشهداء 	بسبب حمل اوزان ثقيلة 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	new
918	بنين حسين علي جيجان 	10			physiotherapy	f		t	ضمور بالاعصاب 	25000	2026-04-08 13:37:42.319402	\N	استشارة اولية		استشارة طبية	3	07812749777	ذي قار الناصرية حي السبل 	منذ الولادة 							f			فيسبوك		ضمور عصبي		[{"type":"ضمور عصبي","area":"","side":""}]	new
968	عماد ثامر عبود حايج	55	70	165	physiotherapy	f		t	شلل نصفي	0	2026-04-13 07:33:32.630116	2025-02-12	استشارة اولية		استشارة طبية	3		الناصرية المدينة شارع 30	جلطة دماغية							f			فيسبوك		جلطة دماغية	اليد	[{"type":"جلطة دماغية","area":"اليد","side":"يسار"}]	new
969	حسن شاكر عبد الحسن 	38	85	190	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-04-13 08:14:27.051304	\N	مراجع جديد 			2	07725445151	نجف 	حادث سيارة 							f			فيسبوك					new
970	عدنلان فارس جاري كريمش	54	90	185	physiotherapy	f		t	خدر في الساق اليمنى واليسرى	100000	2026-04-13 08:18:21.244633	2026-03-02	استشارة اولية		استشارة طبية	3	07812626019	ذي قار قضاء الفهود	انزلاق فقرات							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	new
971	مديحة مطر حسون 	60	80	180	amputee	t	احادي - طرف سفلي - يمين - فوق الركبة	f		0	2026-04-13 08:50:30.359756	\N				2	07804006154	بصرة 	قدم سكري 							f			فيسبوك					new
972	عباس محمد تومان 	20	70	175	amputee	t	احادي - طرف علوي - يمين - تحت المرفق	f		0	2026-04-13 08:54:57.058215	\N	مراجع جديد 			2	07812308221	بابل	حادث سيارة 							f			فيسبوك					new
957	راضي جبار نصر شحتور	62	80	170	physiotherapy	f		t	انزلاق فقرات	50000	2026-04-12 09:09:49.87707	2026-04-04	استشارة اولية		استشارة طبية	3	07823311356	الناصرية الحي السكني مقابل المنصورية	انزلاق فقرات 							f			طبيب خارجي	دكتور غفران كاظم الجابري	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	new
959	 ارشد محمد علوان 	35	122	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		3000000	2026-04-12 11:31:55.35602	2025-01-06		طرف تحت  الركبه سوفت سوكت 		1	07815200899	ديالى /الخالص 	انفجار	سوفت			سنكل	27	تحت الركبه	f			فيسبوك					new
965	شاهزنان علي سعيد ريسان 	12			physiotherapy	f		t	التهاب بالعصب السابع 	50000	2026-04-12 15:40:12.49376	\N	استشارة اولية		استشارة طبية	3	07810058107	ذي قار الناصرية الاسكان الصناعي 	بسبب ازمة عصبية 							f			من شخص آخر		شلل العصب الوجهي		[{"type":"شلل العصب الوجهي","area":"","side":""}]	new
973	فاطمة عبد خلوهن حسين	43	90	185	physiotherapy	f		t	تصلب لويحي	100000	2026-04-13 09:31:53.298547	2025-03-06	استشارة اولية		استشارة طبية	3	0781161208	الناصرية منطقة الاسكان الصناعي	بالنسبة للكتف اجراء خاطئ اثناء عملية القصيرية بسبب سحبها اثناء خروجها من العمليات اما الركبة ف سوفان 							f			فيسبوك		تصلب لويحي، سوفان	الكتف، الركبة	[{"type":"تصلب لويحي","area":"الكتف","side":"يسار"},{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
975	عادل حيدر خضر	20	60	165	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-12 10:49:51	2023-12-13	مراجع سابق منذ 2025 تم شراء طرف تحت الركبه مع قدم كاربوني بايونك بقيمه 3 مليون دينار عراقي 	طرف تحت الركبه مع قدم كاربونيه  بايونك		1	07762169591	بغداد/شارع حيفا	طلق ناري 				R26		تحت الركبه	f			فيسبوك					past
974	جلال ناجي مطشر خزعل	37	67	185	physiotherapy	f		t	تشنج عضلي	25000	2026-04-13 10:31:59.456351	2026-04-11	استشارة اولية		استشارة طبية	3	07810073028	الناصرية قرب المستشفى التركي	نتيجة حمل اوزان ثقيلة							f			مستشفى	استاذ محمد يوسف	تشنج عضلي	منطقة الظهر السفلية	[{"type":"تشنج عضلي","area":"منطقة الظهر السفلية","side":"يمين"}]	new
978	علي كامل عبد الحسن حماس	36	70	170	physiotherapy	f		t	التهاب بالعصب الوجهي السابع	50000	2026-04-13 13:33:54.637961	2016-12-20	استشارة اولية		استشارة طبية	3	07814252988	ذي قار الاناصرية مدينة الصدر	بسبب تغيير الجو 							f			فيسبوك		شلل العصب الوجهي		[{"type":"شلل العصب الوجهي","area":"","side":""}]	new
982	مصطفى محسن عبود 	30	66	165	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1000000	2026-04-13 14:48:07.307493	2015-09-15	مراجع سابق منذ 2024 تم شراء قدم سنكل بقيمه 450000 دينار عراقي وفي 2026تم شراء قالب تحت الركبه درجه ثانيه  مع سليكون بقيمه 1 مليون دينار عراقي	قالب تحت الركبه درجه ثانيه 		1	07827141966	بغداد/المحموديه 	ولادي	البس		فاكيوم	سنكل		تحت الركبه	f			فيسبوك					past
1003	فاضل صغير كيوش والي 	63	80	165	physiotherapy	f		t	شلل نصفي 	50000	2026-04-15 10:00:47.950763	2022-03-09	استشارة اولية		استشارة طبية	3	07816187724	ذي قار الشطرة منطقة ابو زيد	جلطة دماغية							f			فيسبوك		جلطة دماغية	اليد	[{"type":"جلطة دماغية","area":"اليد","side":"يمين"}]	new
979	صلاح هادي علي بديوي	41	80	180	physiotherapy	f		t	اصابة بالحبل الشوكي وضرر بالظفيرة العصبية 	0	2026-04-13 14:13:44.709993	2007-04-05	استشارة اولية		استشارة طبية	3	07700152535	ذي قار الغراف	بسبب حادث إنفجار 							f			دكتور بيرم		اصابة حبل شوكي		[{"type":"اصابة حبل شوكي","area":"","side":""}]	new
981	خلف عبادة جياد حسين 	70	80	176	physiotherapy	f		t	اعتلال بالاعصاب المحيطية 	50000	2026-04-13 14:38:35.830862	2012-02-15	استشارة اولية		استشارة طبية	3	07800083623	ذي قار الناصرية قرب جامعة الصادق	بسبب مرض السكر 							f			فيسبوك		إصابة عصب محيطي	الساق	[{"type":"إصابة عصب محيطي","area":"الساق","side":"كلاهما"}]	new
983	حسن جاسم خضير زراع 	22	73	180	physiotherapy	f		t	لم يتم التثبيت على تشخيص محدد إختلفت الاراء حوله	0	2026-04-13 15:00:52.925561	2025-04-08	استشارة اولية		استشارة طبية	3	07735183663	ذي قار الناصرية الإسكان القديم								f			انستاغرام			الرقبة	[{"type":"","area":"الرقبة","side":""}]	new
980	كريمة خضير جاسم ضاحي	62	95	160	physiotherapy	f		t	جلطة دماغية سببت بشلل نصفي	25000	2026-04-13 14:35:21.094889	2024-04-23	استشارة اولية		استشارة طبية	3	07811235074	ذي قار الناصرية الاسكان الصناعي 	بسبب ازمة عصبية وارتفاع الضغط							f			انستاغرام		جلطة دماغية	الساق	[{"type":"جلطة دماغية","area":"الساق","side":"كلاهما"}]	new
977	 ضوية موسى عبد خلف 	65	80	156	physiotherapy	f		t	التهاب بالمفاصل	150000	2026-04-13 13:16:23.275746	2020-06-16	استشارة اولية		استشارة طبية	3	07830906255	ذي قار سوق الشيوخ	بسبب التقدم بالسن							f			فيسبوك			الركبة	[{"type":"","area":"الركبة","side":""}]	new
984	ولاء يحيى نعوم سماوي	34	60	155	physiotherapy	f		t	التهاب العصب الوجهي السابع	25000	2026-04-13 15:39:40.649334	\N	استشارة اولية		استشارة طبية	3	07811112611	السماوة حي المعلمين 	من الطفولة							f			من شخص آخر		شلل العصب الوجهي		[{"type":"شلل العصب الوجهي","area":"","side":""}]	new
985	عباس فاضل علي 	43	90	172	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-04-13 16:29:26.226019	2024-06-01	تمت المعاينة من قبل استاذ سيف تم عرض طرف تحت الركبة وبسعر ثلاثة ملايين نظاف شتل لوك مع طرف بستة ملايين 			4	07761855996	نينوى-بعشيقة	حادث سير							f			فيسبوك					new
986	حذيفه نجوان محمد 	24	77	170	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		500000	2026-02-16 16:32:56	2023-01-18	مراجع سابق منذ 2024 تم شراء طرف 3R78 بقيمه 6 مليون دينار والباقي في ذمته 500000 دينار عراقي	3R78		1	07812445949	بغداد / يوسفيه	ورم				سنكل		3R78	f			فيسبوك					past
645	بشيرة عجيل عبيد صغير 	54	69	155	physiotherapy	f		t	انزلاق بالفقرات العنقية 	75000	2026-03-08 19:00:15.069608	2026-01-15	استشارة اولية		استشارة طبية	3	07823653101	ذي قار قرب خطوة الامام علي 	حمل وزن ثقيل 							f			من شخص آخر		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	\N
966	ساجدة منخي ثجيل صخي	60	82	165	physiotherapy	f		t	انزلاق بالفقرات القطنية وسوفان في الركبة اليمين	175000	2026-04-12 15:43:26.635168	2023-04-12	استشارة اولية		استشارة طبية	3	07814060711	ذي قار الناصرية الصخيين 	بسبب حادث سقوط							f			من شخص آخر		انزلاق فقرات، سوفان	الركبة	[{"type":"انزلاق فقرات","area":"","side":""},{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
1000	يزن كرار حيدر عبد السادة 	2.5			physiotherapy	f		t	ضمور الدماغ	0	2026-04-15 06:31:43.500913	\N	استشارة اولية		استشارة طبية	3	07815717933	الناصرية سوق الشيوخ منطقة الدجين الثانية	ضمور بالدماغ							f			مستشفى	دكتور انمار علاء 	ضمور عصبي	الرأس	[{"type":"ضمور عصبي","area":"الرأس","side":""}]	new
988	تاجيه ياسر محسن خلف	65	70	160	physiotherapy	f		t	تشنج عضلي 	25000	2026-04-14 08:47:31.015594	2026-03-20	استشارة اولية		استشارة طبية	3	07823311356	الناصرية الحي السكني مقابل المنصورية	خلع سابقا 							f			من شخص آخر	زوج المريضة	تشنج عضلي	الكتف	[{"type":"تشنج عضلي","area":"الكتف","side":"يمين"}]	new
989	حسنة جبار حنون علك	56	70	170	physiotherapy	f		t	تشنج عضلي 	25000	2026-04-14 12:50:44.103377	2025-12-03	استشارة اولية		استشارة طبية	3	07831893866	الناصرية منطقة سومر	جهد وتعب مستمر بسبب العمل							f			من شخص آخر	اقارب المريض مراجع مركزنا	تشنج عضلي	الحوض	[{"type":"تشنج عضلي","area":"الحوض","side":"كلاهما"}]	new
990	لقاء نصار جابر شمبارة 	32	60	154	physiotherapy	f		t	تلف بالأعصاب 	0	2026-04-14 13:33:16.085572	2026-04-04	استشارة اولية		استشارة طبية	3	07819667451	ذي قار الناصرية حي اور 	بسبب حقن مادة البوتكس							f			فيسبوك					new
993	تاجية محمد ملاجي الحسينات	70	80	165	medical_support	f		f		150000	2026-04-14 14:12:52.632259	\N	استشارة اولية			3	07719533864	ذي قار  الناصرية الاسكان الصناعي 	جلطة بالدماغ ادت الى شلل بالجهة اليمين 							t	cookup	اليمين	فيسبوك					past
991	شكران حسن كريم عباس	55	69	148	physiotherapy	f		t	انزلاق بالفقرات العنقية 	25000	2026-04-14 13:54:31.805092	2026-04-10	استشارة اولية		استشارة طبية	3	07804232165	ذي قار الناصرية الاسكان 	بسبب انزلاقات سابقة بالقطنية وسوفان							f			فيسبوك		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
992	حسين علي لطيف حميدي	27	75	170	physiotherapy	f		t	شلل نصفي 	50000	2026-04-14 13:59:02.507591	\N	استشارة اولية		استشارة طبية	3	07821860413	ذي قار الناصرية الثورة 	بسبب طلق ناري 							f			من شخص آخر	من الموظف سماء 				new
994	ماهر وهاب فارس 	35	70	170	medical_support	f		f		3000000	2026-04-14 15:12:08.455299	1990-03-14				1	07831585855	بابل/الحصوه	لين العضام ولادي							t	مسند كيفو عدد 2 بلاستيك	كلا الجانبين	من شخص آخر					new
995	علي حيدر سامر	1	7		amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		1500000	2026-04-14 15:15:30.735252	2024-06-11		طرف تحت الركبه		1	07704319005	بغداد/مجمع سكني 	ولادي 						تحت الركبه	f			فيسبوك					new
997	احلام دواي يسر	64	98	170	physiotherapy	f		t	انزلاق غضروفي 	250000	2026-04-14 16:05:48.478105	2024-10-16	تم فحص ومعاينه المريضه من قبل الدكتور عباس وتم تحديد 10 جلسات اجهزه مع تمارين 		أجهزة علاج طبيعي	1	07801111839	بغداد/الكاظميه								f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
996	معتز سعد مهدي حسن 	43	70	170	physiotherapy	f		t	الام مستمرة اسفل الظهر 	100000	2026-04-14 15:26:32.365285	2025-01-22	استشارة اولية		استشارة طبية	3	07800659040	ذي قار  الناصرية حي اور 								f			طبيبنا		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	past
1001	صادق عدنان خير الله غافل	6			physiotherapy	f		t	ضمور بالدماغ	25000	2026-04-15 06:35:52.437862	2020-01-09	استشارة اولية 		استشارة طبية	3	07810771955	ذي قار قضاء الشطرة حي الزهراء	ضمور بالدماغ							f			فيسبوك		ضمور عصبي	الرأس	[{"type":"ضمور عصبي","area":"الرأس","side":""}]	new
999	ابراهيم عصواد دويشر العكيلي	72	65	180	physiotherapy	f		t	خثرة دموية على الحبل الشوكي تمت ازالتها سببت تليف 	125000	2026-04-14 17:09:05.501299	2025-11-01	استشارة اولية		استشارة طبية	3	07830107601	ذي قار الناصرية الاسكان الصناعي	فشل بالنخاع الشوكي وبعد اخذ العلاج بمدة قصيرة تم تشخيص الورم							f			فيسبوك					new
987	علي ربيح هلال عليوي	25	70	182	physiotherapy	f		t	انزلاق بالفقرات 	175000	2026-04-14 08:06:50.967562	2025-05-08	استشارة اولية		استشارة طبية	3	07825674623	الناصرية منطقة الثورة	جهد وتعب مستمر بسبب العمل							f			من شخص آخر	مريض قديم في المركز	انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	new
1002	راشد خضير عجيل عباس	54	88	179	physiotherapy	f		t	تشنج عضلي 	25000	2026-04-15 09:20:57.573693	\N	استشارة اولية		استشارة طبية	3	07801010061	الناصرية المجمع اللبناني	تشنج عضلي 							f			تيك توك		تشنج عضلي	الكتف	[{"type":"تشنج عضلي","area":"الكتف","side":"يسار"}]	new
998	علي سلمان مطشر عجيل 	76	75	168	physiotherapy	f		t	جلطة بالدماغ 	100000	2026-04-14 16:47:44.821374	2012-08-15	استشارة اولية		استشارة طبية	3	07808352438	ذي قار الناصرية حي العسكري 	إرتفاع بالضغط بسبب طعام 							f			فيسبوك		جلطة دماغية	الساق	[{"type":"جلطة دماغية","area":"الساق","side":"يسار"}]	new
1004	مصطفى خالد شهاب احمد 	34	82	178	physiotherapy	f		t	انزلاق فقرات	50000	2026-04-15 10:05:20.285354	2026-04-08	استشارة اولية		استشارة طبية	3	07804417695	الناصرية شارع الاخلاص	انزلاق فقرات							f			تيك توك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"كلاهما"}]	new
1005	بثينة عودة حسن محمد	55	85	162	physiotherapy	f		t	انزلاق غضروفي	0	2026-04-15 10:14:07.616155	\N	استشارة اولية		استشارة طبية	3	07831983686	ذي قار قضاء سوق الشيوخ	جهد وعمل متواصل في المنزل							f			فيسبوك		انزلاق ديسك	منطقة الظهر السفلية	[{"type":"انزلاق ديسك","area":"منطقة الظهر السفلية","side":"يسار"}]	new
1007	نادر شيفيد منير 	40	80	170	amputee	t	اطراف سليكونية تعويضية - اصبع - يمين	f		5000000	2026-04-15 13:00:45.726149	2024-05-15				1		بغداد	انفجار							f			فيسبوك					past
1008	محمد كامل خيون 	51	80	170	physiotherapy	f		t	تقوس في الساق كلا الجهتين 	650000	2026-04-15 13:44:46.358551	2021-06-09			أجهزة علاج طبيعي	1	07714278000	بغداد/حي الشهداء	تقوس  							f			من شخص آخر			الساق	[{"type":"","area":"الساق","side":"كلاهما"}]	new
1006	رضا عباس طلب فرهود	18	88	165	physiotherapy	f		t	ضمور عضلي ولادي	100000	2026-04-15 11:58:57.440221	\N	استشارة اولية		استشارة طبية	3	07827846070	الناصرية قرب محطة القطار	ضمور عضلي ولادي							f			فيسبوك		ضمور عصبي	الساق	[{"type":"ضمور عصبي","area":"الساق","side":"كلاهما"}]	new
1009	قحطان ياسين علوان 	47	88	170	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		200000	2026-04-15 15:13:38.001609	2025-01-15	مراجع سابق منذ 2025 تم شراء طرف بقيمه 2900000 والباقي في ذمته 200000 الف 	بايونك		1	07733812506	بغداد	سكري			شتل لوك	كاربون		تحت الركبه	f			فيسبوك					past
1011	فخريه حسن حبيب	74	42	165	physiotherapy	f		t	سوفان  	250000	2026-04-15 16:12:30.885791	2023-04-11			أجهزة علاج طبيعي	1	07712806853	بغداد/الزعفرانيه	 الهشاشه في العظم مع انسداد شرايين في الحبل الشوكي 							f			من شخص آخر		سوفان	الركبة	[{"type":"سوفان","area":"الركبة","side":"كلاهما"}]	new
1012	نور الزهراء صباح عبد الهادي هاشم	2	78	178	physiotherapy	f		t	متلازمة ريت	0	2026-04-15 16:30:39.78494	\N	استشارة اولية		استشارة طبية	3	07818902887	ذي قار الناصرية مدينة الصدر	منذ الولادة 							f			فيسبوك					new
1014	محمد دريد زكي	23	74	171	amputee	t	اطراف سليكونية تعويضية - -	f		0	2026-04-15 17:15:43.098953	2018-01-01	تمت المعاينة من قبل استاذ سيف وتم عرض اجزاء سليكونية من عمل مراكزنا بسعر ستة مئة الف دينار			4	07703072225	نينوى-موصل حي الفلاح	حادث							f			فيسبوك					new
1013	حميدة حسن محمد تبينه	52	117	160	physiotherapy	f		t	انزلاق بالفقرات القطنية 	25000	2026-04-15 16:57:10.532663	2023-03-16	استشارة اولية		استشارة طبية	3	07812277884	ذي قار الناصرية حي اور	بسبب حادث سقوط وبسبب الوزن الزائد							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
1015	مرتضى لطيف نصيف 	1	15	35	medical_support	f		f		0	2026-04-16 07:38:35.326972	\N	مراجع جديد /فحص ومعاينة 			2	07732894744	بابل	ولادي 							t	مسند AFO عدد2	كلا الجانبين 	فيسبوك					new
1016	هيه ناصر  غطان	60	90	175	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-04-16 08:15:05.732046	\N		Pim kilt system		2	07802061	كربلاء 	قدم سكري 	liner 		شتل لوك	سنكل 	25	لايوجد 	f			فيسبوك					past
1017	ياسر محسن علي 	57	68	170	medical_support	f		f		0	2026-04-15 10:48:36	1969-09-10				1	07808028918	بغداد 	ولادي							t	مسند كيفو عدد 2 الماني حديث	كلا الجانبين	فيسبوك					past
1018	علي رعد بستان نزال	17	74	160	physiotherapy	f		t	قصر بالاوتار 	0	2026-04-16 11:31:24.861415	\N	استشارة اولية		استشارة طبية	3	07808201028	الناصرية مدينة الصدر	من الولادة							f			من شخص آخر		قطع اوتار	الركبة	[{"type":"قطع اوتار","area":"الركبة","side":"كلاهما"}]	new
1019	ميسون عبد الستنار حسون علوان	60	85	160	physiotherapy	f		t	انزلاق بالفقرات 	0	2026-04-16 12:11:54.571097	\N	استشارة اولية		استشارة طبية	3	07804255791	الناصرية سومر شارع الاخلاص	جهد وتعب مستمر بسبب العمل							f			تيك توك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يسار"}]	new
1020	علي حميد عبدالله	56	75	170	amputee	t	احادي - طرف سفلي - يمين - تحت الركبة	f		0	2026-04-16 12:41:29.331662	2024-04-10		قالب تحت الركبه مع سلكون مع سليف		1	07736146968	بغداد/حي العامل 	سكري							f			فيسبوك					new
1021	يقين احمد خضير 	8	15	100	medical_support	f		f		150000	2026-04-16 12:46:44.728208	2017-01-11	مراجعه سابقه منذ 2024 تم شراء مسند afoعدد 2 بقيمه 150000 الف دينار عراقي  مع تسديد المبلغ كامل 			1	07765253990	بغداد/الدوره	سقوط القدم للطرفين ولادي 							t	afo عدد2	كلا الجانبين	فيسبوك					past
1022	حوري كاظم ميذاب صبيح	55	70	165	physiotherapy	f		t	عدم توازنن اثناء المشي بسبب مرض dbc	0	2026-04-16 13:43:11.290241	2017-01-18	استشارة اولية		استشارة طبية	3	07731372880	العمارة 								f			فيسبوك					new
1023	علي عبد الهادي مكي 	7	15	120	amputee	t	احادي - طرف سفلي - يمين - خلال الحوض	f		0	2026-04-16 15:37:07.132125	2018-03-14	مراجع سابق منذ 2023 تم شراء قالب للحوض بقيمه 700$ 	قالب خلال الحوض للاطفال		1	07725502255	بغداد	ولادي							f			فيسبوك					past
1010	رحيم حسان جاسم زاهي	51	78	178	physiotherapy	f		t	تنخر بالعظم ادى الى تبديل مفصل وانزلاقات في الفقرات القطنية 	100000	2026-04-15 15:18:20.670054	2026-04-01	استشارة اولية		استشارة طبية	3	07808607097	ذي قار الناصرية الصالحية 	بدون سبب يذكر							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
1026	نسرين عباس سعدون شباط	44	75	160	physiotherapy	f		t	روماتيزم وسوفان	0	2026-04-18 06:55:10.536448	2018-02-08	استشارة اولية		استشارة طبية	3	07821246798	الناصرية ناحية سديناوية	التهاب في المفصل سبب روماتيزم وسوفان وتبديل المفصل							f			فيسبوك		تبديل مفصل	الركبة	[{"type":"تبديل مفصل","area":"الركبة","side":"يسار"}]	new
1025	نماء خميس خماط سلمان 	27	90	164	physiotherapy	f		t	انزلاق بالفقرات 	50000	2026-04-18 06:27:15.712632	2022-02-02	استشارة اولية		استشارة طبية	3	07826227845	الناصرية قضاء الفهود	جهد وتعب مستمر بسبب العمل							f			من شخص آخر	عن طريق مراجع (صباح)	انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":"كلاهما"}]	new
976	يحيى كامل عنون خنجر	47	88	170	physiotherapy	f		t	ضعف في الحبل الشوكي 	350000	2026-04-13 13:08:49.125697	2024-03-20	استشارة اولية		استشارة طبية	3	07811997790	السماوة الخضر 	بدون سبب يذكر							f			فيسبوك		التهاب حبل شوكي	منطقة الظهر السفلية	[{"type":"التهاب حبل شوكي","area":"منطقة الظهر السفلية","side":""}]	new
1029	مهند تركي رسن موسى	44	68	170	physiotherapy	f		t	شلل نصفي	0	2026-04-18 08:40:37.582275	2023-04-18	استشارة اولية		استشارة طبية	3	07815113863	الناصرية القرية العصرية	ضمور عصبي							f			فيسبوك		ضمور عصبي	اليد	[{"type":"ضمور عصبي","area":"اليد","side":"كلاهما"}]	new
1030	سارة رائد محسن 	24	60	160	amputee	t	ثنائي - سفلي | يمين: تحت الركبة | يسار: فوق الركبة	f		0	2026-04-18 10:05:41.36996	\N		باسف /3r78		2	07771428418	بغداد	الهاب العصب المحيطي	شتل لوك +باسف 		شتل لوك 	سنكل 			f			منظمة انسانية					past
1027	لايذ لفل منصور دويج	71	75	170	physiotherapy	f		t	تبديل مفصل الورك	300000	2026-04-18 07:09:21.797899	\N	استشارة اولية		استشارة طبية	3	07829914772	السماوة حي النفط	سقوط مفاجى على الورك							f			فيسبوك		تبديل مفصل	الورك	[{"type":"تبديل مفصل","area":"الورك","side":"يمين"}]	new
1031	احمد صالح عبد عون 	47	67	165	medical_support	f		f		0	2026-04-18 14:44:00	1980-07-16	مراجع سابق منذ 2025 تم شراء مسند كيفو للطرف الايمن الماني بقيمه 9 مليون و500000 الف دينار عراقي ولا يوجد بذمته اي مبلغ متبقي 			1	07814414111	القادسيه/السنديه	شلل الاطفال الطرف الايمن  ولادي 							t	كيفو الماني 	الطرف الايمن	فيسبوك					past
1037	مصطفى احمد جبار ديوان 	2	85	175	physiotherapy	f		t	جلطة بالدماغ 	0	2026-04-18 14:13:56.108546	2023-09-13	استشارة اولية 		استشارة طبية	3	07802780439	ذي قار الغراف 	 منذ الولادة بسبب عدم إكتمال نمو  الرئتين سبب لأزمة صحية دون تداخل طبي سريع 							f			فيسبوك		جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":""}]	new
1038	احمد راتب مسعر 	33	115	175 	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		600000	2026-04-18 14:21:06.82067	2016-04-13	مراجع سابق منذ 2025 تم شراء سليكون بقيمه 850000 الف دينار عراقي /في تاريخ 2026/18/4 تم شراء سلكون بقيمه 600000 الف تم دفع 100000 الف والباقي 500000 الف دينار عراقي 			1	07810046146	النجف   		اوتوبوك						f			فيسبوك					past
1032	ضياء حسين دردوح حساوي	40	80	180	physiotherapy	f		t	انزلاق فقرات	25000	2026-04-18 12:09:10.191635	2026-01-07	استشارة اولية		استشارة طبية	3	07811133163	ذي قار قضاء النصر	جهد وتعب مستمر بسبب العمل							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":"يمين"}]	new
1039	 مريم علي كريم 	30	80	160	amputee	t	احادي - طرف سفلي - يسار - تحت الركبة	f		0	2026-04-18 14:43:17.340086	2008-01-16	مراجعه سابقه منذ 2023 تم شراء طرف بقيمه 5 مليون دينار عراقي ولا يوجد بذمتها شئ	باسف فاكيوم مع قدم متحركة سنكل 		1	07736364380	بغداد				فاكيوم	سنكل		تحت الركبه	f			فيسبوك					past
1036	حسين علي حميد حزام 	15	68	171	physiotherapy	f		t	انزلاق غضروفي في الفقرات القطنية 	150000	2026-04-18 13:53:53.204771	2026-02-11	استشارة اولية		استشارة طبية	3	07826976621	ذي قار الناصرية مجمع تينا 	بسبب كرة القدم وحمل وزن ثقيل							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
1033	رضا وميض عبد علي عبد الحسين	20	85	175	physiotherapy	f		t	شلل جزئي 	25000	2026-04-18 13:12:25.215684	\N	استشارة اولية 		استشارة طبية	3	07829396264	ذي قار الناصرية الاسكان القديم	منذ الولادة 							f			فيسبوك					new
1035	حيدر عباس محسن محمد	53	93	170	physiotherapy	f		t	تبديل مفصل الورك الايمن 	75000	2026-04-18 13:21:00.175422	2026-03-06	استشارة اولية		استشارة طبية	3	07832351447	ذي قار الناصرية حي العسكري 	بسبب خلع ولادي 							f			فيسبوك		تبديل مفصل	الورك	[{"type":"تبديل مفصل","area":"الورك","side":"يمين"}]	new
1024	ناصر حسين عمير عبد 	51	95	180	physiotherapy	f		t	انزلاق بالفقرات 	50000	2026-04-18 06:16:05.369595	2019-05-08	استشارة اولية		استشارة طبية	3	07807669035	الناصرية منطقة المنصورية	جهد وتعب مستمر بسبب العمل							f			طبيبنا		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":"كلاهما"}]	past
1028	 عبد الرسول ابراهيم عباس محمد	59	72	169	physiotherapy	f		t	شلل نصفي الجهة اليسرى	50000	2026-04-18 07:30:10.679712	2024-05-13	استشارة اولية		استشارة طبية	3	07810546134	ذي قار الشطرة	جلطة دماغية 							f			فيسبوك		جلطة دماغية	الكتف	[{"type":"جلطة دماغية","area":"الكتف","side":"يسار"}]	past
1034	رفعه مكي عبد الله سالم 	80	75	160	physiotherapy	f		t	انزلاق بالفقرات العنقية 	25000	2026-04-18 13:16:23.402759	2025-04-15	استشارة اولية		استشارة طبية	3	07811164742	ذي قار الناصرية حي الشهداء 	بسبب التقدم بالعمر							f			فيسبوك		انزلاق فقرات	الرقبة	[{"type":"انزلاق فقرات","area":"الرقبة","side":""}]	new
1041	امير ضياء عبد النبي علوان 	4			physiotherapy	f		t	ضمور بالعضلات 	0	2026-04-18 15:23:31.412041	\N	استشارة اولية		استشارة طبية	3	07802481757	ذي قار الناصرية حي سومر 	منذ الولادة 							f			فيسبوك		ضمور عضلي	الساق	[{"type":"ضمور عضلي","area":"الساق","side":"كلاهما"}]	new
1042	ريم كريم علي	40	86	160	physiotherapy	f		t	 عمليه رباط صليبي  	0	2026-04-18 15:25:17.230056	2025-12-25			استشارة طبية	1	07803799847	بغداد/كويريش	ضعف  اربطه/نقص فيتامينات 							f			من شخص آخر		إصابة اربطة	الركبة	[{"type":"إصابة اربطة","area":"الركبة","side":"يسار"}]	new
1043	سعد صالح مطر ياسين 	62	93	170	physiotherapy	f		t	تشنج عضلي حاد 	0	2026-04-18 15:43:07.174639	2026-03-29	استشارة اولية		استشارة طبية	3	07816105111	ذي قار سوق الشيوخ 	دون سبب يذكر							f			من شخص آخر		تشنج عضلي	منطقة الظهر السفلية	[{"type":"تشنج عضلي","area":"منطقة الظهر السفلية","side":""}]	new
1040	عهود خلف كشكول مناحي	55	90	156	physiotherapy	f		t	انزلاق بالفقرات القطنية 	25000	2026-04-18 14:49:03.858019	\N	استشارة اولية		استشارة طبية	3	07810108304	ذي قار الناصرية قرب مستشفى التركي	بسبب حادث سقوط وبسبب الاعمال المنزلية الشاقة 							f			فيسبوك		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
1044	رضية قاسم محمد كاطع	59	65	156	physiotherapy	f		t	جلطة بالدماغ	50000	2026-04-18 16:47:04.329019	2023-06-27	استشارة اولية		استشارة طبية	3	07824605172	ذي قار الناصرية مدينة الصدر 	ارتفاع بنسبة الدهون 							f			من شخص آخر		جلطة دماغية		[{"type":"جلطة دماغية","area":"","side":""}]	past
1046	علي بريج حمود جحيل 	62	85	170	physiotherapy	f		t	سوق القدم اليسار 	25000	2026-04-19 05:59:16.056389	2025-09-09	استشارة اولية		استشارة طبية	3	07813457038	ذي قار سوق الشيوخ 	جلطة دماغيه 							f			فيسبوك	صفحة المركز 	جلطة دماغية	القدم	[{"type":"جلطة دماغية","area":"القدم","side":"يسار"}]	new
1047	تبارك علي محمد علي	26	85	170	physiotherapy	f		t	تمزق في الكاحل 	25000	2026-04-19 07:59:15.372872	2026-03-03	استشارة اولية 		استشارة طبية	3	07802814953	الناصرية منطقة سومر	سقوط من الدرج							f			فيسبوك		تشنج عضلي	الكاحل	[{"type":"تشنج عضلي","area":"الكاحل","side":"يسار"}]	new
1048	كاظم عبد الكريم جبر جفيان	52	70	175	physiotherapy	f		t	تبديل مفصل 	150000	2026-04-19 11:12:01.525416	2026-02-24	استشارة اولية		استشارة طبية	3	07887480301	ذي قار الناصريه حي العسكري	حادث سير							f			طبيب خارجي	حيدر حازم العطار	تبديل مفصل	الركبة	[{"type":"تبديل مفصل","area":"الركبة","side":"يسار"}]	new
474	احمد نعيم حسن ساجت	39	97	176	physiotherapy	f		t	شلل نصفي 	625000	2026-02-22 10:05:27.110767	\N			تمارين تأهيلية	3	07829678060	ذي قار  قضاء الشطره	جلطة دماغية 							f			جهة حكومية		جلطة دماغية	منطقة الظهر السفلية	[{"type":"جلطة دماغية","area":"منطقة الظهر السفلية","side":"يمين"}]	\N
1049	رقيه ضياء فليح حسن 	10	41	115	medical_support	f		f		150000	2026-04-19 12:29:59.041887	2026-04-19	اخذ قياسات للمسند 			3	07804998856	ذي قار قضاء الشطره 	ولادي							t	KO	كلاهما 	طبيبنا	دكتور عبد الله خان 				past
1050	رغد عداي حسين 	51	75	165	physiotherapy	f		t	شلل الاطفال	525000	2026-04-19 13:01:13.476181	1974-06-12	تم فحص ومعاينه المريضه وتم تحديد جلسات طبيعيه لمده شهر كامل روبوت مع جلسات طبيعيه		روبوت	1	07809173179	بغداد /الصالحيه	ولادي							f			من شخص آخر		شلل اطفال	الساق	[{"type":"شلل اطفال","area":"الساق","side":"يمين"}]	new
1051	فايز عودة عجيل بجاي	16	60	165	physiotherapy	f		t	ضمو ر بالاعصاب 	0	2026-04-19 13:46:04.152682	2024-03-14	استشارة اولية		استشارة طبية	3	07802770544	ذي قار الناصرية حي اريدو 	دون سبب يذكر 							f			من شخص آخر		ضمور عصبي	الساق	[{"type":"ضمور عصبي","area":"الساق","side":"كلاهما"}]	new
1052	ناهدة عبد الحسين عبد الله ديوان 	43	91	155	physiotherapy	f		t	انزلاق بالفقرات القطنية 	75000	2026-04-19 14:03:12.126138	2026-04-05	استشارة اولية		استشارة طبية	3	07831083684	ذي قار الناصرية حي اريدو 	بسبب جهد والاعمال المنزلية الكثيفة 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
1053	حيدر خيون فليح 	40	95	170	amputee	t	احادي - طرف سفلي - يسار - فوق الركبة	f		0	2026-04-19 15:41:42.10543	1995-02-15	مراجع سابق منذ 2025 تمشراء طرف ميركوري بقيمه 13 مليون دينار عراقي	ميركوري		1	07705555132	ميسان /مركز المدينه 	انفجار	حلقي	34	شتل لوك	كاربون اسبريت	26		f			فيسبوك					past
1054	ابراهيم مصطفى احمد سمير 	1			physiotherapy	f		t	ضمور بخلايا الدماغ 	0	2026-04-19 16:24:41.534355	2025-09-22	استشارة اولية		استشارة طبية	3	07806969290	ذي قار الناصرية قرية ال ازيرج	منذ الولادة بسبب نقص الاوكسجين 							f			انستاغرام		ضمور عصبي		[{"type":"ضمور عصبي","area":"","side":""}]	new
1055	منتظر احمد موحان جويني	12			physiotherapy	f		t	تلف بخلايا الدماغ 	0	2026-04-19 16:51:11.113285	\N	استشارة اولية		استشارة طبية	3	07804682005	ذي قار الناصرية حي اريدو 	بسبب ارتفاع درجة حرارته							f			فيسبوك					new
1045	محمد شهاب حميد ميزر	36	81	176	physiotherapy	f		t	انزلاق غضروفي بالفقرات القطنية 	25000	2026-04-18 17:03:32.974765	2026-04-11	استشارة اولية		استشارة طبية	3	07822698480	ذي قار الناصرية الصابئة 	حمل وزن ثقيل مع حركة خاطئة ادت الى سقوطه 							f			من شخص آخر		انزلاق فقرات	منطقة الظهر السفلية	[{"type":"انزلاق فقرات","area":"منطقة الظهر السفلية","side":""}]	new
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payments (id, patient_id, amount, notes, date, branch_id, payment_treatment_type, session_count, is_free_sessions) FROM stdin;
7	5	600000	نقدا	2026-01-12 14:38:18.930279	4	\N	\N	f
20	22	1000000	دفعة اولى 	2026-01-14 09:35:23.178	2	\N	\N	f
22	24	250000	250000	2026-01-14 10:16:23.615071	3	\N	\N	f
23	26	50000		2026-01-14 16:55:52.790594	3	\N	\N	f
24	27	50000		2026-01-14 17:53:31.524698	3	\N	\N	f
25	21	2000000	دفع مليونين يوم ١٣-١ والباقي مليون	2026-01-14 19:00:10.75342	1	\N	\N	f
26	25	20000		2026-01-14 19:04:12.384037	3	\N	\N	f
27	19	1500000	بتاريخ ١٢-١ دفع ١٥٠ الف وبتاريخ ١٣-١ دفع مليون و ٣٥٠ الف واكتمل المبلغ	2026-01-14 19:04:16.509858	1	\N	\N	f
28	16	475000	المبلغ الكلي ٥٠٠ الف ولكن دفع ٤٧٥ الف لانه لايملك الباقي	2026-01-14 19:08:39.136393	1	\N	\N	f
31	28	150000		2026-01-15 08:04:03.652899	3	\N	\N	f
32	25	20000	جلسة علاج طبيعي مفرده كلاسك	2026-01-15 12:10:24.296698	3	\N	\N	f
33	31	35000		2026-01-15 13:24:35.997506	3	\N	\N	f
35	34	1500000		2026-01-15 13:55:29.697526	4	\N	\N	f
36	26	140000		2026-01-15 14:28:22.909055	3	\N	\N	f
38	37	35000	جلسة علاج طبيعي مفرده 	2026-01-17 08:43:12.162369	3	\N	\N	f
40	41	210000	تم دفع المبلغ لست جلسات على 35 الف حسب دكتورها في بغداد 	2026-01-17 14:10:35.249125	3	\N	\N	f
41	42	35000	جلسة علاج طبيعي مفرده كلاسك مشترك	2026-01-17 14:18:08.795351	3	\N	\N	f
42	34	1500000	نقدا 	2026-01-17 14:22:01.564894	4	\N	\N	f
45	46	3000000	تم دفع مقدمة ٣ ملايين باقي مليونين تدفع على شكل دفعات كل شعر ٢٥٠ الف 	2026-01-17 17:32:29.233621	1	\N	\N	f
48	48	200000	السعر ٩٠٠ دفع ٢٠٠ باقي ٧٠٠ عند الاستلام 	2026-01-17 18:15:25.5073	1	\N	\N	f
49	47	500000	الباقي ٤مليون ونص	2026-01-17 19:10:22.231322	1	\N	\N	f
50	31	250000	بكج جلسات علاج طبيعي بقيمة 25 الف كون المريض من مراجعينا سابقًا	2026-01-17 20:49:35.83282	3	\N	\N	f
52	53	200000	بكج لمدة 8 ايام على 25 الف 	2026-01-18 09:35:05.309989	3	\N	\N	f
53	55	35000	جلسة مفردة	2026-01-18 10:13:20.673044	3	\N	\N	f
54	56	25000	جلسة فردية	2026-01-18 10:38:39.310726	3	\N	\N	f
55	57	35000	جلسة فرديه 	2026-01-18 11:11:35.41727	3	\N	\N	f
56	59	50000	جلسة علاج طبيعي مفرده كلاسك	2026-01-18 13:53:12.033864	3	\N	\N	f
57	60	50000	جلسة علاج طبيعي مفرده كلاسك	2026-01-18 14:10:15.583681	3	\N	\N	f
58	61	20000	ابر صينية	2026-01-18 15:49:10.506002	3	\N	\N	f
59	63	20000	جلسة ابر صينية مفردة 	2026-01-18 18:42:18.381851	3	\N	\N	f
60	64	25000	جلسة مفردة بالسعر القديم كونها مستمرة معنا منذ الشهر 8 /2025	2026-01-19 08:18:07.627574	3	\N	\N	f
65	72	25000	جلسة مفردة كلاسك	2026-01-19 13:23:10.854343	3	\N	\N	f
66	73	20000	جلسة مفردة كلاسك	2026-01-19 14:08:23.844754	3	\N	\N	f
67	60	160000	بكج كلاسك مشترك	2026-01-19 15:20:41.514341	3	\N	\N	f
68	74	150000		2026-01-19 16:02:06.48725	3	\N	\N	f
69	76	1000000	تكملة مبلغ طرف بايونك حيث تم دفع مليونين بتاريخ 6-1-2026	2026-01-19 16:26:21.845528	1	\N	\N	f
70	72	25000	دفعة أولية - جلسات علاج إضافية	2026-01-20 06:03:04.225377	3	\N	\N	f
71	77	100000	بكج كلاسك سعر الجلسة 20 الف + جلسة مجانا ضمن العرض 	2026-01-20 06:43:43.198991	3	\N	\N	f
72	78	75000	3 جلسات كلاسك الجلسة 25 الف 	2026-01-20 08:13:11.447984	3	\N	\N	f
73	79	150000	بكج 6 جلسات 25 للجلسه الواحده	2026-01-20 08:29:50.957126	3	\N	\N	f
75	73	100000	بكج كلاسك 	2026-01-20 14:41:24.164108	3	\N	\N	f
77	84	20000	كلاسك مفرد	2026-01-20 18:04:46.29803	3	\N	\N	f
78	63	20000	ابر صينية	2026-01-20 18:22:14.566612	3	\N	\N	f
79	87	25000		2026-01-21 13:10:38.793749	3	\N	\N	f
80	86	25000		2026-01-21 13:10:53.850055	3	\N	\N	f
81	92	150000	بكج 6 جلسات على 25 الف 	2026-01-22 18:50:31.4297	3	\N	\N	f
82	93	20000	ابر صينية	2026-01-22 18:55:39.36831	3	\N	\N	f
83	94	20000	ابر صينية	2026-01-22 19:05:36.034721	3	\N	\N	f
85	95	150000	بكج6 جلسات , 25 للجلسة كلاسك متطور	2026-01-24 06:01:55.767602	3	\N	\N	f
86	96	25000		2026-01-24 06:56:10.197337	3	\N	\N	f
87	97	125000	بكج 5 جلسات , 25 للجلسة كلاسك متطور	2026-01-24 07:51:27.398647	3	\N	\N	f
88	101	4000000		2026-01-24 11:36:39.843561	2	\N	\N	f
89	100	550000		2026-01-24 11:37:46.771277	2	\N	\N	f
91	105	150000	بكج 6 جلسات 	2026-01-24 13:31:35.86074	3	\N	\N	f
92	106	25000	مفرد	2026-01-24 13:47:35.346159	3	\N	\N	f
93	108	210000	بكج 6 جلسات	2026-01-24 16:21:27.151219	3	\N	\N	f
94	63	20000	ابر صينية	2026-01-24 16:58:28.538622	3	\N	\N	f
95	109	3000000		2026-01-24 17:56:39.086733	5	\N	\N	f
96	110	600000		2026-01-24 18:05:02.239668	5	\N	\N	f
97	111	2000000		2026-01-24 18:11:20.357312	5	\N	\N	f
98	107	150000	بكج	2026-01-24 18:58:17.142746	3	\N	\N	f
99	102	25000		2026-01-24 19:08:33.064449	3	\N	\N	f
100	103	25000	جلسة مفردة	2026-01-24 19:20:54.248698	3	\N	\N	f
101	64	25000	دفعة للجلسة الثانية	2026-01-22 00:00:00	3	\N	\N	f
102	64	25000	دفعة جلسة ثالثة	2026-01-24 00:00:00	3	\N	\N	f
103	103	25000		2026-01-22 00:00:00	3	\N	\N	f
105	72	25000	دفعة ثالثة	2026-01-21 00:00:00	3	\N	\N	f
106	72	25000	جلسة رابعة	2026-01-22 00:00:00	3	\N	\N	f
107	72	25000	دفعة خامسة	2026-01-24 00:00:00	3	\N	\N	f
108	72	25000	دفعة ثامنة	2026-01-25 00:00:00	3	\N	\N	f
109	28	250000	بكج ١٠ جلسات	2026-01-24 00:00:00	3	\N	\N	f
110	115	3500000		2026-01-25 00:00:00	2	\N	\N	f
111	103	25000	مفرد	2026-01-25 00:00:00	3	\N	\N	f
112	102	25000	مفرد	2026-01-25 00:00:00	3	\N	\N	f
113	64	25000	مفرد	2026-01-26 00:00:00	3	\N	\N	f
114	72	25000		2026-01-26 00:00:00	3	\N	\N	f
115	118	150000	بكج ل 6 ايام	2026-01-26 00:00:00	3	\N	\N	f
116	119	4000000		2026-01-26 00:00:00	2	\N	\N	f
117	120	3000000		2026-01-26 00:00:00	2	\N	\N	f
118	55	25000	جلسة مفردة	2026-01-22 00:00:00	3	\N	\N	f
121	55	25000	مفرد	2026-01-26 09:35:18.643	3	\N	\N	f
122	122	25000	جلسة مفردة	2026-01-26 00:00:00	3	\N	\N	f
123	124	25000	جلسة مفردة	2026-01-26 00:00:00	3	\N	\N	f
124	125	250000	بكج لعشر ايام على 25 الف	2026-01-26 00:00:00	3	\N	\N	f
76	82	25000	جلسة مفردة	2026-01-20 14:52:07.239173	3	\N	\N	f
125	56	125000	بكج 5 جلسات على 25 الف	2026-01-22 00:00:00	3	\N	\N	f
126	126	150000	بكج ل 6 جلسات	2026-01-19 00:00:00	3	\N	\N	f
127	103	25000	مفرد	2026-01-26 00:00:00	3	\N	\N	f
128	81	150000	بكج ل ٦ جلسات	2026-01-20 00:00:00	3	\N	\N	f
129	55	35000	جلسة مفردة	2026-01-20 00:00:00	3	\N	\N	f
130	130	200000	بكج لمدة 8	2026-01-26 00:00:00	3	\N	\N	f
131	102	25000	دفعة أولية - جلسات علاج إضافية	2026-01-26 14:43:11.8	3	\N	\N	f
132	41	175000	دفعة أولية - جلسات علاج إضافية	2026-01-26 15:10:52.6	3	\N	\N	f
138	129	100000	بكج ل4 جلسات	2026-01-26 00:00:00	3	\N	\N	f
136	137	20000	ابر صينية	2026-01-26 00:00:00	3	\N	\N	f
135	136	25000	جلسة مفردة	2026-01-26 00:00:00	3	\N	\N	f
143	72	25000	دفعة أولية - جلسات علاج إضافية	2026-01-27 05:54:46.436	3	\N	\N	f
145	96	225000	دفعة أولية - جلسات علاج إضافية	2026-01-27 07:30:04.03	3	\N	\N	f
146	149	25000	جلسة مفردة	2026-01-27 00:00:00	3	\N	\N	f
147	119	3000000		2026-01-27 00:00:00	2	\N	\N	f
148	98	4500000		2026-01-11 00:00:00	2	\N	\N	f
149	102	25000	دفعة أولية - جلسات علاج إضافية	2026-01-27 13:14:06.742	3	\N	\N	f
150	103	25000	دفعة أولية - جلسات علاج إضافية	2026-01-27 13:14:30.02	3	\N	\N	f
151	131	200000	بكج 8 جلسات	2026-01-27 00:00:00	3	\N	\N	f
152	156	20000	ابر صينية	2026-01-27 00:00:00	3	\N	\N	f
153	157	25000	جلسة مفردة	2026-01-27 00:00:00	3	\N	\N	f
154	158	250000	بكج 10 جلسات	2026-01-27 00:00:00	3	\N	\N	f
155	155	150000	بكج 6 جلسات	2026-01-27 00:00:00	3	\N	\N	f
156	63	20000	دفعة أولية - جلسات علاج إضافية	2026-01-27 18:21:26.377	3	\N	\N	f
157	64	25000	دفعة أولية - جلسات علاج إضافية	2026-01-28 05:25:06.242	3	\N	\N	f
158	72	25000	دفعة أولية - جلسات علاج إضافية	2026-01-28 06:03:47.133	3	\N	\N	f
159	159	125000	بكج ل5 جلسات	2026-01-28 00:00:00	3	\N	\N	f
160	106	150000	بكج لستة جلسات	2026-01-28 00:00:00	3	\N	\N	f
161	55	25000	دفعة أولية - جلسات علاج إضافية	2026-01-28 09:15:30.194	3	\N	\N	f
162	161	250000	الجلسة الاولى من بكج مكون 10 جلسات كلاسك متطور الجلسه 25 الف	2026-01-28 14:46:59	3	\N	\N	f
163	162	25000	جلسة مفردة 	2026-01-28 18:19:08	3	\N	\N	f
164	137	150000	دفعة أولية - جلسات علاج إضافية	2026-01-28 16:23:01.188	3	\N	\N	f
165	157	25000	دفعة أولية - جلسات علاج إضافية	2026-01-28 16:49:09.715	3	\N	\N	f
166	164	150000	بكج لمدة 6 جلسات	2026-01-28 21:05:14	3	\N	\N	f
167	72	25000	دفعة أولية - جلسات علاج إضافية	2026-01-29 05:58:08.358	3	\N	\N	f
168	165	25000	الجلسة الاولى 	2026-01-29 10:41:13	3	\N	\N	f
169	167	1500000		2026-01-29 11:52:39	2	\N	\N	f
170	153	250000	جددت المريضه البكج ل 10 جلسات 	2026-01-29 14:26:06	3	\N	\N	f
171	171	25000	جلسة مفردة 	2026-01-29 18:13:28	3	\N	\N	f
174	156	25000	دفعة أولية - جلسات علاج إضافية	2026-01-29 17:23:35.436	3	\N	\N	f
175	157	25000	دفعة أولية - جلسات علاج إضافية	2026-01-29 17:24:12.803	3	\N	\N	f
177	137	20000	دفعة أولية - جلسات علاج إضافية	2026-01-29 18:44:11.346	3	\N	\N	f
178	64	25000	دفعة أولية - جلسات علاج إضافية	2026-01-31 05:14:53.318	3	\N	\N	f
179	95	50000	بعد اكمال البكج دفع المريض لجلستين اضافية 	2026-01-31 08:39:17	3	\N	\N	f
180	72	25000	دفعة أولية - جلسات علاج إضافية	2026-01-31 06:03:04.189	3	\N	\N	f
181	173	25000		2026-01-31 11:46:05	3	\N	\N	f
182	176	50000		2026-01-31 16:14:59	5	\N	\N	f
183	34	750000	نقدا اجور تغليف كاربون	2026-01-31 19:42:58	4	\N	\N	f
184	156	20000	دفعة أولية - جلسات علاج إضافية	2026-01-31 17:04:56.887	3	\N	\N	f
185	157	25000	دفعة أولية - جلسات علاج إضافية	2026-01-31 17:07:36.404	3	\N	\N	f
187	72	25000	دفعة أولية - جلسات علاج إضافية	2026-02-01 06:22:38.12	3	\N	\N	f
189	121	150000	بكج 150 الف, 25 للجلسة يالاضافة للجلسة المجانية من ضمن العرض ,كلاسك متطور	2026-02-01 10:33:00	3	\N	\N	f
191	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-01 08:51:10.956	3	\N	\N	f
192	55	25000	دفعة أولية - جلسات علاج إضافية	2026-02-01 09:21:38.278	3	\N	\N	f
197	185	2000000		2026-02-01 12:10:54.283	2	\N	\N	f
198	190	150000	بكج لمدة 6 ايام 	2026-02-01 14:04:25.972	3	\N	\N	f
199	188	250000	بكج لعشر جلسات	2026-02-01 14:11:29.121	3	\N	\N	f
200	189	25000	جلسة مفردة	2026-02-01 14:24:06.602	3	\N	\N	f
201	191	125000	بكج 5 جلسات 	2026-02-01 14:27:41.991	3	\N	\N	f
202	157	25000	دفعة أولية - جلسات علاج إضافية	2026-02-01 16:54:40.896	3	\N	\N	f
203	72	25000	دفعة أولية - جلسات علاج إضافية	2026-02-03 11:37:31.67	3	\N	\N	f
204	55	25000	دفعة أولية - جلسات علاج إضافية	2026-02-03 11:45:37.96	3	\N	\N	f
205	198	150000	بكج 6 جلسات بالاضافة الى جلسة العرض المجانية	2026-02-03 12:09:58.1	3	\N	\N	f
206	201	25000	جلسة مفردة	2026-02-03 12:19:28.205	3	\N	\N	f
207	204	150000	بكج 6 جلسات	2026-02-03 12:36:04.213	3	\N	\N	f
208	205	150000	بكج 6 جلسات	2026-02-03 12:43:03.858	3	\N	\N	f
210	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-03 13:21:58.709	3	\N	\N	f
211	208	150000	بكج 6 جلسات على 25 الف 	2026-02-03 15:26:43.759	3	\N	\N	f
213	207	25000	دفعة أولية - جلسات علاج إضافية	2026-02-03 15:44:56.203	3	\N	\N	f
215	107	150000	دفعة أولية - جلسات علاج إضافية	2026-02-03 16:38:46.971	3	\N	\N	f
216	210	25000	جلسة مفردة	2026-02-03 16:54:39.054	3	\N	\N	f
217	156	25000	دفعة أولية - جلسات علاج إضافية	2026-02-03 16:56:40.676	3	\N	\N	f
176	135	20000	دفعة أولية - جلسات علاج إضافية	2026-01-29 18:32:42.09	3	\N	\N	f
140	144	25000	جلسة فردية	2026-01-26 00:00:00	3	\N	\N	f
218	202	25000	دفعة أولية - جلسات علاج إضافية	2026-02-03 17:15:40.017	3	\N	\N	f
220	201	75000	دفعة أولية - جلسات علاج إضافية	2026-02-04 05:47:13.124	3	\N	\N	f
221	72	25000	دفعة أولية - جلسات علاج إضافية	2026-02-04 06:09:56.015	3	\N	\N	f
222	147	25000	دفعة أولية - جلسات علاج إضافية	2026-02-04 06:35:32.218	3	\N	\N	f
223	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-04 07:06:42.585	3	\N	\N	f
224	79	100000	دفعة أولية - جلسات علاج إضافية	2026-02-04 07:38:20.133	3	\N	\N	f
225	200	25000	جلسة مفردة 	2026-02-04 08:57:26.947	3	\N	\N	f
226	200	25000	جلسة مفردة 	2026-02-04 08:59:22.302	3	\N	\N	f
227	184	1500000		2026-02-04 10:25:05.377	2	\N	\N	f
228	56	100000	دفعة أولية - جلسات علاج إضافية	2026-02-04 11:20:13.376	3	\N	\N	f
229	185	1000000	تسديد المنبقي	2026-02-04 12:29:22.882	2	\N	\N	f
230	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-04 13:15:54.721	3	\N	\N	f
231	60	25000	دفعة أولية - جلسات علاج إضافية	2026-02-04 14:28:15.923	3	\N	\N	f
232	223	25000	دفعة أولية - جلسات علاج إضافية	2026-02-04 15:10:33.144	3	\N	\N	f
233	224	90000	بكج ل 6 جلسات على 15 الف	2026-02-04 15:36:59.154	3	\N	\N	f
234	210	25000	دفعة أولية - جلسات علاج إضافية	2026-02-04 16:39:41.151	3	\N	\N	f
235	222	25000	دفعة أولية - جلسات علاج إضافية	2026-02-04 16:59:07.325	3	\N	\N	f
236	60	100000	بكج ل 5 جلسات	2026-02-04 19:31:23.501	3	\N	\N	f
237	72	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 06:29:54.038	3	\N	\N	f
238	225	200000	بكج 8 جلسات	2026-02-05 07:17:01.95	3	\N	\N	f
239	226	100000	بكج4 جلسات	2026-02-05 07:21:35.122	3	\N	\N	f
240	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 08:02:42.078	3	\N	\N	f
241	55	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 09:33:45.206	3	\N	\N	f
242	218	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 10:06:36.255	3	\N	\N	f
243	227	250000	كامل المبلغ	2026-02-05 10:45:11.076	2	\N	\N	f
244	229	200000	دفعة عن المبلغ المتبقي 	2026-02-05 11:07:34.013	2	\N	\N	f
245	230	150000	دفعة عن المبلغ المتبقي 	2026-02-05 11:13:05.152	2	\N	\N	f
246	233	450000	شراء سيليكون هيما حلقي 	2026-02-05 11:36:59.635	2	\N	\N	f
247	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 13:10:06.161	3	\N	\N	f
248	211	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 13:22:21.63	3	\N	\N	f
249	214	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 13:54:19.885	3	\N	\N	f
250	234	20000	دفعة أولية - جلسات علاج إضافية	2026-02-05 13:55:04.684	3	\N	\N	f
251	207	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 14:28:24.463	3	\N	\N	f
252	156	25000	دفعة أولية - جلسات علاج إضافية	2026-02-05 16:42:15.84	3	\N	\N	f
253	237	20000	دفعة أولية - جلسات علاج إضافية	2026-02-05 17:41:16.495	3	\N	\N	f
254	64	25000	دفعة أولية - جلسات علاج إضافية	2026-02-07 05:21:04.157	3	\N	\N	f
255	200	25000	دفعة أولية - جلسات علاج إضافية	2026-02-07 05:53:07.075	3	\N	\N	f
256	72	25000	دفعة أولية - جلسات علاج إضافية	2026-02-07 06:15:52.751	3	\N	\N	f
257	239	150000	بكج 6 جلسات	2026-02-07 08:06:47.736	3	\N	\N	f
258	238	25000	جلسة مفردة	2026-02-07 08:21:12.824	3	\N	\N	f
259	240	500000	دفعة اولى للطرف الاصطناعي 	2026-02-07 08:37:27.789	3	\N	\N	f
260	243	25000	دفعة أولية - جلسات علاج إضافية	2026-02-07 13:24:22.845	3	\N	\N	f
261	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-07 13:31:41.429	3	\N	\N	f
262	244	20000	دفعة أولية - جلسات علاج إضافية	2026-02-07 13:51:16.433	3	\N	\N	f
263	210	25000	دفعة أولية - جلسات علاج إضافية	2026-02-07 14:12:30.687	3	\N	\N	f
264	214	25000	دفعة أولية - جلسات علاج إضافية	2026-02-07 15:50:14.358	3	\N	\N	f
265	237	20000	دفعة أولية - جلسات علاج إضافية	2026-02-07 16:35:01.905	3	\N	\N	f
266	93	20000	دفعة أولية - جلسات علاج إضافية	2026-02-07 18:33:03.195	3	\N	\N	f
267	72	25000	دفعة أولية - جلسات علاج إضافية	2026-02-08 06:12:48.941	3	\N	\N	f
268	238	225000	دفعة أولية - جلسات علاج إضافية	2026-02-08 06:15:27.828	3	\N	\N	f
269	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-08 08:07:58.42	3	\N	\N	f
270	248	500000	شراء سيليكون اليس قفل	2026-02-08 10:23:24.125	2	\N	\N	f
271	249	25000	25000	2026-02-08 12:12:50.236	3	\N	\N	f
272	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-08 13:22:32.889	3	\N	\N	f
273	158	150000	دفعة أولية - جلسات علاج إضافية	2026-02-08 14:21:04.711	3	\N	\N	f
274	243	150000	دفعة أولية - جلسات علاج إضافية	2026-02-08 14:34:34.525	3	\N	\N	f
275	243	50000	دفعة أولية - جلسات علاج إضافية	2026-02-08 14:36:11.89	3	\N	\N	f
276	223	25000	دفعة أولية - جلسات علاج إضافية	2026-02-08 14:42:15.5	3	\N	\N	f
277	250	25000	دفعة أولية - جلسات علاج إضافية	2026-02-08 19:03:16.995	3	\N	\N	f
278	64	25000	دفعة أولية - جلسات علاج إضافية	2026-02-09 05:45:51.648	3	\N	\N	f
279	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-09 08:31:10.253	3	\N	\N	f
280	251	100000	دفعة أولية - جلسات علاج إضافية	2026-02-09 11:20:04.666	3	\N	\N	f
281	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-09 13:36:14.634	3	\N	\N	f
282	129	25000	دفعة أولية - جلسات علاج إضافية	2026-02-09 14:22:13.35	3	\N	\N	f
283	237	25000	دفعة أولية - جلسات علاج إضافية	2026-02-09 16:19:35.093	3	\N	\N	f
284	244	25000	دفعة أولية - جلسات علاج إضافية	2026-02-09 16:25:51.333	3	\N	\N	f
285	84	20000	دفعة أولية - جلسات علاج إضافية	2026-02-09 17:38:22.551	3	\N	\N	f
286	257	25000	جلسة مفردة	2026-02-10 07:03:41.22	3	\N	\N	f
287	147	225000	دفعة أولية - جلسات علاج إضافية	2026-02-10 07:35:10.454	3	\N	\N	f
288	255	250000	بكج لعشر جلسات 	2026-02-10 08:29:05.803	3	\N	\N	f
289	261	50000	دفعة أولية - جلسات علاج إضافية	2026-02-10 09:52:52.796	3	\N	\N	f
290	249	25000	دفعة أولية - جلسات علاج إضافية	2026-02-10 11:30:59.47	3	\N	\N	f
291	265	20000	دفعة أولية - جلسات علاج إضافية	2026-02-10 13:59:10.134	3	\N	\N	f
292	129	25000	دفعة أولية - جلسات علاج إضافية	2026-02-10 15:16:43.958	3	\N	\N	f
293	267	25000	دفعة أولية - جلسات علاج إضافية	2026-02-10 16:25:45.063	3	\N	\N	f
294	244	25000	دفعة أولية - جلسات علاج إضافية	2026-02-10 16:26:14.531	3	\N	\N	f
295	269	20000	ابرث صينية	2026-02-10 17:37:45.522	3	\N	\N	f
296	268	25000	دفعة أولية - جلسات علاج إضافية	2026-02-10 18:14:42.989	3	\N	\N	f
297	270	20000	دفعة أولية - جلسات علاج إضافية	2026-02-10 18:31:05.882	3	\N	\N	f
298	64	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 05:23:33.021	3	\N	\N	f
299	72	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 06:09:41.841	3	\N	\N	f
300	257	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 06:40:43.043	3	\N	\N	f
302	271	250000	دفعة أولية - جلسات علاج إضافية	2026-02-11 07:55:08.452	3	\N	\N	f
303	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 08:04:18.906	3	\N	\N	f
304	149	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 08:52:26.569	3	\N	\N	f
305	55	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 09:01:30.699	3	\N	\N	f
306	260	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 09:06:17.561	3	\N	\N	f
307	274	25000	جلسة مفردة	2026-02-11 10:30:22.716	3	\N	\N	f
308	198	100000	دفعة أولية - جلسات علاج إضافية	2026-02-11 10:55:56.344	3	\N	\N	f
309	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 13:37:22.286	3	\N	\N	f
310	275	25000		2026-02-11 14:04:57.756	3	\N	\N	f
311	267	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 14:22:09.198	3	\N	\N	f
312	244	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 14:22:53.976	3	\N	\N	f
313	108	150000	دفعة أولية - جلسات علاج إضافية	2026-02-11 14:47:10.555	3	\N	\N	f
314	60	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 14:57:49.988	3	\N	\N	f
315	270	20000	دفعة أولية - جلسات علاج إضافية	2026-02-11 17:05:41.234	3	\N	\N	f
316	84	20000	دفعة أولية - جلسات علاج إضافية	2026-02-11 17:42:20.181	3	\N	\N	f
317	250	25000	دفعة أولية - جلسات علاج إضافية	2026-02-11 18:09:44.57	3	\N	\N	f
318	280	25000	جلسة مفردة	2026-02-12 08:54:16.299	3	\N	\N	f
319	282	1000000	دفعة اولى	2026-02-12 10:04:36.409	2	\N	\N	f
320	22	400000	تم تسديد المبلغ بالكامل 	2026-02-12 10:59:50.684	2	\N	\N	f
321	167	500000	كامل المبلغ	2026-02-12 11:01:22.795	2	\N	\N	f
322	286	7550000	دفعة ثانية	2026-02-12 13:04:34.141	2	\N	\N	f
323	287	25000	جلسة مفردة	2026-02-12 13:08:33.043	3	\N	\N	f
324	265	20000	دفعة أولية - جلسات علاج إضافية	2026-02-12 13:43:15.539	3	\N	\N	f
325	288	25000	دفعة أولية - جلسات علاج إضافية	2026-02-12 14:01:46.352	3	\N	\N	f
326	289	25000	دفعة أولية - جلسات علاج إضافية	2026-02-12 15:39:29.204	3	\N	\N	f
327	277	150000	دفعة أولية - جلسات علاج إضافية	2026-02-12 16:30:12.221	3	\N	\N	f
328	269	25000	دفعة أولية - جلسات علاج إضافية	2026-02-12 18:10:41.576	3	\N	\N	f
358	307	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 15:04:21.046	3	تمارين تأهيلية	\N	f
359	309	150000	دفعة أولية - جلسات علاج إضافية	2026-02-14 15:22:58.267	3	تمارين تأهيلية	6	f
360	270	20000	دفعة أولية - جلسات علاج إضافية	2026-02-14 15:32:13.716	3	تمارين تأهيلية	\N	f
361	289	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 16:02:08.053	3	أجهزة علاج طبيعي	\N	f
331	64	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 05:24:36.526	3	تمارين تأهيلية	\N	f
332	283	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 06:27:17.937	3	أجهزة علاج طبيعي	\N	f
337	292	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 07:34:47.593	3	أجهزة علاج طبيعي	\N	f
341	294	125000	دفعة أولية - جلسات علاج إضافية	2026-02-14 08:10:30.974	3	أجهزة علاج طبيعي	5	f
342	55	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 09:43:16.756	3	أجهزة علاج طبيعي	\N	f
343	250	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 11:43:58.646	3	أجهزة علاج طبيعي	\N	f
344	261	100000	دفعة أولية - جلسات علاج إضافية	2026-02-14 11:45:40.871	3	أجهزة علاج طبيعي	4	f
350	196	1500000	دفعة اولى مليون ونص والباقي مليون ونص	2026-02-14 13:38:26.179	2	\N	\N	f
353	288	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 13:45:03.796	3	تمارين تأهيلية	\N	f
354	300	300000	دفعة اخيرة بتاريخ اليوم	2026-02-14 13:45:36.429	2	\N	\N	f
368	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 07:54:15.911	3	أجهزة علاج طبيعي	\N	f
355	302	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 13:46:30.319	3	أجهزة علاج طبيعي	\N	f
356	265	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 14:22:58.966	3	أجهزة علاج طبيعي	\N	f
357	304	25000	دفعة أولية - جلسات علاج إضافية	2026-02-14 14:54:26.595	3	أجهزة علاج طبيعي	\N	f
362	300	100000	دفعة اولى يوم 1-2-2026	2026-02-01 19:26:21	2	\N	\N	f
363	84	20000	دفعة أولية - جلسات علاج إضافية	2026-02-14 17:38:57.355	3	أجهزة علاج طبيعي	\N	f
364	258	125000	دفعة أولية - جلسات علاج إضافية	2026-02-15 05:12:25.701	3	أجهزة علاج طبيعي	5	f
365	312	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 06:45:35.736	3	أجهزة علاج طبيعي	1	f
366	72	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 06:46:02.619	3	أجهزة علاج طبيعي	1	f
367	269	150000	دفعة أولية - جلسات علاج إضافية	2026-02-15 06:56:55.569	3	أجهزة علاج طبيعي	6	f
369	283	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 08:02:40.519	3	أجهزة علاج طبيعي	\N	f
370	303	2000000	دفعة اولى	2026-02-15 12:44:40	2	\N	\N	f
371	301	500000	دفعة اولى	2026-02-14 12:50:22	2	\N	\N	f
372	314	700000	تم تسديد المبلغ بالكامل 	2026-02-15 12:55:27	2	\N	\N	f
373	315	465000	تم تسديد المبلغ بالكامل 	2026-02-15 13:07:55	2	\N	\N	f
374	249	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 11:29:12.757	3	أجهزة علاج طبيعي	\N	f
375	298	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 11:42:38.149	3	أجهزة علاج طبيعي	\N	f
376	302	225000	دفعة أولية - جلسات علاج إضافية	2026-02-15 13:14:04.39	3	أجهزة علاج طبيعي	9	f
377	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 13:19:28.258	3	أجهزة علاج طبيعي	\N	f
378	319	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 13:45:39.359	3	أجهزة علاج طبيعي	\N	f
379	288	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 13:50:57.135	3	أجهزة علاج طبيعي	\N	f
380	320	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 13:56:36.488	3	أجهزة علاج طبيعي	\N	f
381	321	1000000		2026-02-15 17:07:19	4	\N	\N	f
382	322	750000	شهر مقدم	2026-02-15 17:28:34	3	تمارين تأهيلية	30	f
383	323	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 14:46:37.518	3	أجهزة علاج طبيعي	\N	f
384	276	1000000		2026-02-15 17:53:02	4	\N	\N	f
385	307	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 15:12:45.1	3	تمارين تأهيلية	\N	f
386	270	20000	دفعة أولية - جلسات علاج إضافية	2026-02-15 17:10:13.593	3	تمارين تأهيلية	\N	f
387	265	20000	دفعة أولية - جلسات علاج إضافية	2026-02-15 17:50:58.279	3	أجهزة علاج طبيعي	\N	f
388	310	25000	دفعة أولية - جلسات علاج إضافية	2026-02-15 18:17:16.279	3	أجهزة علاج طبيعي	\N	f
389	324	150000	بكج 6 جلسات	2026-02-15 21:37:16	3	أجهزة علاج طبيعي	6	f
390	93	20000	دفعة أولية - جلسات علاج إضافية	2026-02-15 19:12:54.846	3	أجهزة علاج طبيعي	\N	f
391	64	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 05:24:42.858	3	تمارين تأهيلية	\N	f
392	284	500000	تم تسديد المبلغ بالكامل 	2026-02-16 10:59:30	2	\N	\N	f
393	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 08:03:38.44	3	تمارين تأهيلية	\N	f
394	293	250000	دفعة أولية - جلسات علاج إضافية	2026-02-16 08:30:41.221	3	أجهزة علاج طبيعي	10	f
395	283	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 08:32:13.892	3	أجهزة علاج طبيعي	\N	f
396	329	450000	تم تسديد المبلغ بالكامل 	2026-01-27 11:44:55	2	\N	\N	f
397	330	300000	تم تسديد المبلغ بالكامل 	2026-01-12 11:51:28	2	\N	\N	f
398	55	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 10:13:10.515	3	أجهزة علاج طبيعي	\N	f
399	299	150000	دفعة أولية - جلسات علاج إضافية	2026-02-16 11:55:31.152	3	أجهزة علاج طبيعي	6	f
400	320	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 13:16:13.301	3	أجهزة علاج طبيعي	\N	f
401	264	60000	دفعة أولية - جلسات علاج إضافية	2026-02-16 13:21:37.059	3	تمارين تأهيلية	4	f
402	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 13:36:20.299	3	أجهزة علاج طبيعي	\N	f
403	338	20000	دفعة أولية - جلسات علاج إضافية	2026-02-16 14:00:54.614	3	أجهزة علاج طبيعي	\N	f
404	339	20000	دفعة أولية - جلسات علاج إضافية	2026-02-16 14:38:45.098	3	أجهزة علاج طبيعي	\N	f
405	340	20000	دفعة أولية - جلسات علاج إضافية	2026-02-16 14:51:13.447	3	تمارين تأهيلية	\N	f
406	342	20000	دفعة أولية - جلسات علاج إضافية	2026-02-16 15:11:41.325	3	أجهزة علاج طبيعي	\N	f
407	270	20000	دفعة أولية - جلسات علاج إضافية	2026-02-16 15:38:20.236	3	تمارين تأهيلية	\N	f
408	343	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 16:34:07.453	3	أجهزة علاج طبيعي	\N	f
409	237	20000	دفعة أولية - جلسات علاج إضافية	2026-02-16 16:42:48.396	3	أجهزة علاج طبيعي	\N	f
411	311	160000	دفعة أولية - جلسات علاج إضافية	2026-02-16 18:08:27.633	3	أجهزة علاج طبيعي	8	f
412	344	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 18:14:09.494	3	أجهزة علاج طبيعي	\N	f
413	310	25000	دفعة أولية - جلسات علاج إضافية	2026-02-16 18:30:53.578	3	أجهزة علاج طبيعي	\N	f
414	265	20000	دفعة أولية - جلسات علاج إضافية	2026-02-16 19:04:23.61	3	أجهزة علاج طبيعي	\N	f
415	346	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 05:30:32.447	3	أجهزة علاج طبيعي	\N	f
416	345	100000	دفعة أولية - جلسات علاج إضافية	2026-02-17 05:31:08.097	3	أجهزة علاج طبيعي	4	f
417	327	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 06:06:33.626	3	أجهزة علاج طبيعي	\N	f
418	283	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 07:55:54.95	3	أجهزة علاج طبيعي	\N	f
419	121	150000	دفعة أولية - جلسات علاج إضافية	2026-02-17 08:05:01.484	3	أجهزة علاج طبيعي	6	f
420	332	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 08:26:18.412	3	أجهزة علاج طبيعي	1	f
421	260	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 09:45:51.609	3	أجهزة علاج طبيعي	\N	f
422	149	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 09:49:12.8	3	أجهزة علاج طبيعي	\N	f
423	198	100000	دفعة أولية - جلسات علاج إضافية	2026-02-17 10:51:43.271	3	أجهزة علاج طبيعي	4	f
424	249	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 11:26:59.441	3	أجهزة علاج طبيعي	1	f
425	335	125000	دفعة أولية - جلسات علاج إضافية	2026-02-17 11:34:05.311	3	أجهزة علاج طبيعي	5	f
426	298	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 12:01:46.185	3	أجهزة علاج طبيعي	1	f
427	104	2900000	دفعه اولى	2026-01-24 15:31:28	1	\N	\N	f
428	104	2400000	دفعه ثانيه	2026-01-27 15:33:00	1	\N	\N	f
429	104	100000	تم تسديد المبلغ بالكامل	2026-02-16 15:34:00	1	\N	\N	f
430	349	350000	دفعة اولى	2026-02-17 15:54:59	2	\N	\N	f
431	287	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 13:18:32.125	3	أجهزة علاج طبيعي	1	f
432	304	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 13:20:40.841	3	أجهزة علاج طبيعي	1	f
433	354	750000	تم تسديد المبلغ بالكامل	2026-01-27 16:36:14	1	\N	\N	f
434	289	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 13:37:43.298	3	أجهزة علاج طبيعي	1	f
435	288	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 13:42:31.15	3	أجهزة علاج طبيعي	1	f
436	355	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 14:16:20.638	3	أجهزة علاج طبيعي	1	f
438	350	1420000	تم دفع مبلغ 1000$ اي مايعادل1420000 دينار عراقي	2026-01-10 17:39:38	1	\N	\N	f
440	340	100000	دفعة أولية - جلسات علاج إضافية	2026-02-17 14:52:09.547	3	تمارين تأهيلية	8	f
442	189	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 15:22:08.216	3	أجهزة علاج طبيعي	1	f
445	60	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 16:26:32.387	3	أجهزة علاج طبيعي	\N	f
446	376	25000	دفعة أولية - جلسات علاج إضافية	2026-02-17 17:00:07.187	3	أجهزة علاج طبيعي	\N	f
447	344	20000	دفعة أولية - جلسات علاج إضافية	2026-02-17 17:33:05.231	3	أجهزة علاج طبيعي	\N	f
448	208	150000	دفعة أولية - جلسات علاج إضافية	2026-02-17 17:56:49.559	3	أجهزة علاج طبيعي	6	f
450	380	20000	دفعة أولية - جلسات علاج إضافية	2026-02-17 18:29:38.084	3	أجهزة علاج طبيعي	\N	f
452	64	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 05:27:51.051	3	تمارين تأهيلية	\N	f
453	346	225000	دفعة أولية - جلسات علاج إضافية	2026-02-18 05:56:45.894	3	أجهزة علاج طبيعي	9	f
454	283	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 06:53:35.157	3	أجهزة علاج طبيعي	\N	f
455	381	150000	دفعة أولية - جلسات علاج إضافية	2026-02-18 07:35:11.001	3	أجهزة علاج طبيعي	6	f
456	79	100000	دفعة أولية - جلسات علاج إضافية	2026-02-18 07:38:27.619	3	أجهزة علاج طبيعي	4	f
458	347	125000	دفعة أولية - جلسات علاج إضافية	2026-02-18 08:20:00.188	3	أجهزة علاج طبيعي	5	f
459	165	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 08:23:52.573	3	تمارين تأهيلية	1	f
460	55	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 09:05:50.696	3	أجهزة علاج طبيعي	\N	f
461	347	125000		2026-02-18 12:49:29	3	أجهزة علاج طبيعي	5	f
465	383	200000	دفعه اولى	2026-02-04 15:08:40	1	\N	\N	f
466	335	125000		2026-02-18 15:40:53	3	أجهزة علاج طبيعي	5	f
467	196	1500000	تم تسديد المبلغ بالكامل 	2026-02-18 15:42:11	2	\N	\N	f
468	388	300000	دفعه تسديد اقصاد	2026-02-04 16:10:51	1	\N	\N	f
469	391	25000	جلسة مفردة	2026-02-18 16:37:12	3	أجهزة علاج طبيعي	\N	f
470	339	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 13:40:55.409	3	أجهزة علاج طبيعي	\N	f
471	304	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 13:53:44.81	3	\N	\N	f
472	394	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 16:09:27.977	3	أجهزة علاج طبيعي	\N	f
473	237	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 16:46:23.522	3	أجهزة علاج طبيعي	\N	f
474	319	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 17:07:34.255	3	أجهزة علاج طبيعي	\N	f
475	224	90000	دفعة أولية - جلسات علاج إضافية	2026-02-18 18:20:21.919	3	أجهزة علاج طبيعي	6	f
476	376	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 18:36:00.754	3	أجهزة علاج طبيعي	\N	f
477	342	25000	دفعة أولية - جلسات علاج إضافية	2026-02-18 19:00:00.212	3	أجهزة علاج طبيعي	\N	f
443	344	150000	دفعة أولية - جلسات علاج إضافية	2026-02-17 19:35:58	3	أجهزة علاج طبيعي	6	f
478	287	25000	دفعة أولية - جلسات علاج إضافية	2026-02-19 05:43:31.756	3	أجهزة علاج طبيعي	\N	f
479	395	25000	دفعة أولية - جلسات علاج إضافية	2026-02-19 06:03:13.907	3	أجهزة علاج طبيعي	\N	f
480	205	150000	دفعة أولية - جلسات علاج إضافية	2026-02-19 06:12:01.559	3	تمارين تأهيلية	6	f
481	283	25000	دفعة أولية - جلسات علاج إضافية	2026-02-19 07:34:39.238	3	تمارين تأهيلية	\N	f
482	392	1000000	دفعه اولى	2026-02-05 11:18:32	1	\N	\N	f
483	392	250000	دفعه ثانيه	2026-02-07 11:20:38	1	\N	\N	f
484	396	300000	دفعه تسديد اولى	2026-02-04 11:31:39	1	\N	\N	f
486	372	500000	دفعه اولى	2026-02-01 11:45:40	1	\N	\N	f
487	320	25000	دفعة أولية - جلسات علاج إضافية	2026-02-19 09:09:07.388	3	أجهزة علاج طبيعي	\N	f
485	397	150000	بكج 6 جلسات	2026-02-19 09:20:08	3	أجهزة علاج طبيعي	6	f
488	400	1000000	دفعه اولى	2026-02-07 12:38:23	1	\N	\N	f
489	403	1000000	تم تسدسد المبلغ بلكامل	2026-02-08 13:23:19	1	\N	\N	f
490	404	1000000	دفعه ثانيه	2026-02-08 13:41:07	1	\N	\N	f
491	405	700000		2026-02-08 13:49:46	1	\N	\N	f
492	194	25000	جلسة مفردة	2026-02-19 14:06:27	3	تمارين تأهيلية	1	f
493	298	25000	دفعة أولية - جلسات علاج إضافية	2026-02-19 11:15:40.055	3	أجهزة علاج طبيعي	\N	f
494	407	125000		2026-02-09 14:18:16	1	\N	\N	f
495	423	300000	دفعه اولى	2026-02-19 16:51:46	1	\N	\N	f
500	424	25000	باشر المريض بعد استشارة دكتور بيرم بجلسة مفردة وسيستمر بالدفع اليومي	2026-02-19 20:59:22	3	تمارين تأهيلية	1	f
501	380	150000		2026-02-19 21:05:38	3	أجهزة علاج طبيعي	6	f
502	425	150000		2026-02-19 21:21:10	3	أجهزة علاج طبيعي	6	f
507	338	25000	جلسات علاج إضافية (1 جلسة)	2026-02-19 19:41:31.052	3	أجهزة علاج طبيعي	1	f
506	270	20000	\N	2026-02-20 07:10:05	3	تمارين تأهيلية	1	f
441	270	20000	دفعة أولية - جلسات علاج إضافية	2026-02-17 07:10:15	3	تمارين تأهيلية	\N	f
508	429	20000	\N	2026-02-20 07:11:40	3	أجهزة علاج طبيعي	1	f
457	326	75000	دفعة أولية - جلسات علاج إضافية	2026-02-16 05:19:34	3	أجهزة علاج طبيعي	3	f
451	265	20000	دفعة أولية - جلسات علاج إضافية	2026-02-17 05:20:59	3	أجهزة علاج طبيعي	\N	f
449	84	20000	دفعة أولية - جلسات علاج إضافية	2026-02-17 05:21:34	3	أجهزة علاج طبيعي	\N	f
444	307	160000	دفعة أولية - جلسات علاج إضافية	2026-02-17 08:22:29	3	أجهزة علاج طبيعي	6	f
513	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-21 05:32:59.06	3	تمارين تأهيلية	1	f
514	433	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 06:18:15.717	3	أجهزة علاج طبيعي	1	f
515	395	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 06:28:03.119	3	أجهزة علاج طبيعي	1	f
516	238	225000	جلسات علاج إضافية - أجهزة علاج طبيعي (9 جلسة)	2026-02-21 06:59:21.52	3	أجهزة علاج طبيعي	9	f
517	434	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 07:24:14.736	3	أجهزة علاج طبيعي	1	f
518	283	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 07:52:34.815	3	أجهزة علاج طبيعي	1	f
519	435	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-02-21 08:11:17.846	3	أجهزة علاج طبيعي	6	f
520	298	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 08:11:56.156	3	أجهزة علاج طبيعي	1	f
521	436	1000000	دفعه اولى	2026-02-05 08:29:04	1	\N	\N	f
522	436	4000000	دفعه ثانيه	2026-02-08 08:29:45	1	\N	\N	f
523	440	50000	دفعه اولى	2026-02-14 08:56:11	1	\N	\N	f
524	440	25000		2026-02-16 08:56:27	1	\N	\N	f
525	441	900000		2026-02-14 09:11:33	1	\N	\N	f
526	55	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 09:15:35.995	3	أجهزة علاج طبيعي	1	f
527	383	200000	دفعه ثانيه	2026-02-16 09:43:12	1	\N	\N	f
528	287	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 09:49:40.065	3	أجهزة علاج طبيعي	1	f
529	445	1000000	دفعه اولى	2026-02-16 10:10:05	1	\N	\N	f
530	47	500000	دفعه ثانيه	2026-01-17 10:17:29	1	\N	\N	f
531	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 11:03:35.789	3	أجهزة علاج طبيعي	1	f
532	372	1500000	دفعة ثانية	2026-02-04 11:53:05	1	\N	\N	f
533	372	1000000	دفعة اخيرة	2026-02-11 11:53:54	1	\N	\N	f
535	49	1500000	دفعه اولى	2026-02-21 12:47:15	1	\N	\N	f
536	304	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-02-21 16:02:59.991	3	أجهزة علاج طبيعي	1	f
537	453	150000	أجهزة علاج طبيعي (6 جلسة)	2026-02-21 16:54:20	3	أجهزة علاج طبيعي	6	f
539	424	150000	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة)	2026-02-21 17:43:28.311	3	تمارين تأهيلية	6	f
540	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 18:01:20.12	3	أجهزة علاج طبيعي	1	f
541	394	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 18:01:57.657	3	أجهزة علاج طبيعي	1	f
542	323	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-21 18:13:47.093	3	روبوت	1	f
543	455	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض بعد الاستشارة بجلسة مفردة 	2026-02-21 18:47:53.046	3	تمارين تأهيلية	1	f
544	456	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض بعد استشارة دكتور بجلسة مفردة 	2026-02-21 18:58:05.868	3	أجهزة علاج طبيعي	1	f
547	457	25000	أجهزة علاج طبيعي (1 جلسة)	2026-02-21 19:05:43	3	أجهزة علاج طبيعي	1	f
550	458	500000	جلسات علاج إضافية - روبوت (10 جلسة)	2026-02-21 19:33:53.881	3	روبوت	10	f
551	461	25000	أجهزة علاج طبيعي (1 جلسة)	2026-02-21 19:37:42	3	أجهزة علاج طبيعي	1	f
552	463	25000	جلسة مفردة الاولى  - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 19:54:18	3	أجهزة علاج طبيعي	1	f
553	462	25000	جلسة مفردة الاولى  - أجهزة علاج طبيعي (1 جلسة)	2026-02-21 20:01:18	3	أجهزة علاج طبيعي	1	f
554	455	175000	أجهزة علاج طبيعي (7 جلسة)	2026-02-21 21:09:20	3	أجهزة علاج طبيعي	7	f
556	465	25000	تمارين تأهيلية (1 جلسة)	2026-02-22 05:22:41	3	تمارين تأهيلية	1	f
557	466	75000	أجهزة علاج طبيعي (3 جلسة)	2026-02-22 06:07:12	3	أجهزة علاج طبيعي	3	f
559	467	25000	جلسة مفردة - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 06:49:04	3	أجهزة علاج طبيعي	1	f
560	165	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-22 07:05:21.81	3	أجهزة علاج طبيعي	1	f
561	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-02-22 08:24:07.01	3	أجهزة علاج طبيعي	1	f
562	471	9500000	دفعه اولى	2026-02-21 08:52:12	1	\N	\N	f
563	471	3000000	دفعه ثانيه	2026-02-22 08:53:25	1	\N	\N	f
564	470	200000		2026-02-22 09:10:32	1	\N	\N	f
567	473	250000		2026-02-22 09:46:10	1	\N	\N	f
568	274	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-22 09:47:18.057	3	أجهزة علاج طبيعي	1	f
569	433	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 10:08:26.558	3	أجهزة علاج طبيعي	1	f
571	249	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 10:20:49.154	3	أجهزة علاج طبيعي	1	f
572	477	200000		2026-02-22 10:26:14	1	\N	\N	f
573	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 10:30:00.471	3	أجهزة علاج طبيعي	1	f
538	270	20000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-21 07:06:39	3	تمارين تأهيلية	1	f
575	474	125000	مشترك بالضمان الصحي 25 بالميه من السعر على المراجع وال 75 بالميه الباقيه على الضمان  - تمارين تأهيلية (20 جلسة)	2026-02-22 05:00:56	3	تمارين تأهيلية	5	f
576	480	25000	أجهزة علاج طبيعي (1 جلسة)	2026-02-22 11:54:20	3	أجهزة علاج طبيعي	1	f
577	321	2000000		2026-02-22 14:43:07	4	\N	\N	f
578	181	250000	تمارين تأهيلية (10 جلسة)	2026-02-22 16:44:49	3	تمارين تأهيلية	10	f
580	482	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 17:17:39.358	3	أجهزة علاج طبيعي	1	f
581	323	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-22 17:44:35.72	3	روبوت	1	f
582	456	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 18:26:26.682	3	أجهزة علاج طبيعي	1	f
583	486	25000	أجهزة علاج طبيعي (1 جلسة)	2026-02-22 18:49:42	3	أجهزة علاج طبيعي	1	f
584	487	25000	تمارين تأهيلية (1 جلسة)	2026-02-22 19:03:18	3	تمارين تأهيلية	1	f
585	488	25000	أجهزة علاج طبيعي (1 جلسة)	2026-02-22 19:26:10	3	أجهزة علاج طبيعي	1	f
586	224	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-22 19:37:29.063	3	روبوت	1	f
587	476	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 20:07:26.581	3	أجهزة علاج طبيعي	1	f
588	468	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 20:08:33.269	3	أجهزة علاج طبيعي	1	f
589	490	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-22 20:39:22.359	3	أجهزة علاج طبيعي	1	f
590	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-23 05:26:40.346	3	تمارين تأهيلية	1	f
591	493	25000	جلسة مفردة - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 07:12:09	3	أجهزة علاج طبيعي	1	f
592	491	250000	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) - باشرت المريضه بعد الاستشاره مباشرتا 	2026-02-23 07:56:08.8	3	أجهزة علاج طبيعي	10	f
593	165	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-23 08:02:59.765	3	تمارين تأهيلية	1	f
594	495	125000	أجهزة علاج طبيعي (5 جلسة)	2026-02-23 08:33:16	3	أجهزة علاج طبيعي	5	f
595	298	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 08:35:13.173	3	أجهزة علاج طبيعي	1	f
597	467	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 09:29:07.911	3	أجهزة علاج طبيعي	1	f
599	433	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-02-23 10:18:17.727	3	أجهزة علاج طبيعي	6	f
600	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 10:20:25.858	3	أجهزة علاج طبيعي	1	f
601	489	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اليوم بجلسة مفردة بعد الاستشارة 	2026-02-23 16:15:18.531	3	أجهزة علاج طبيعي	1	f
602	501	25000	أجهزة علاج طبيعي (1 جلسة)	2026-02-23 16:25:49	3	أجهزة علاج طبيعي	1	f
603	483	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض بجلسته المفردة اليوم بعد الاستشارة يوم امس	2026-02-23 16:26:58.987	3	أجهزة علاج طبيعي	1	f
604	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 16:50:33.989	3	أجهزة علاج طبيعي	1	f
605	503	25000	أجهزة علاج طبيعي (1 جلسة)	2026-02-23 16:59:12	3	أجهزة علاج طبيعي	1	f
606	324	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-02-23 17:13:21.559	3	أجهزة علاج طبيعي	4	f
607	485	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشر المريض ببكج من 6 جلسات بعد استشارة 	2026-02-23 17:23:29.877	3	أجهزة علاج طبيعي	6	f
608	456	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 18:28:46.732	3	أجهزة علاج طبيعي	1	f
609	496	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-02-23 18:48:38.699	3	أجهزة علاج طبيعي	5	f
610	506	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-23 19:21:40.336	3	روبوت	1	f
611	484	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 19:32:08.347	3	أجهزة علاج طبيعي	1	f
612	237	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 19:58:02.185	3	أجهزة علاج طبيعي	1	f
613	468	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-02-23 20:04:33.75	3	أجهزة علاج طبيعي	5	f
614	476	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 20:22:23.198	3	أجهزة علاج طبيعي	1	f
617	493	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 06:12:53.432	3	أجهزة علاج طبيعي	1	f
615	507	250000	أجهزة علاج طبيعي (10 جلسة)	2026-02-23 06:21:46	3	أجهزة علاج طبيعي	10	f
616	457	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-23 06:56:55	3	أجهزة علاج طبيعي	1	f
618	287	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-24 09:04:53.577	3	أجهزة علاج طبيعي	1	f
619	467	350000	جلسات علاج إضافية - روبوت (7 جلسة) - بكج لمدة سبعة جلسات 	2026-02-24 09:34:44.794	3	روبوت	7	f
620	467	175000	جلسات علاج إضافية - تمارين تأهيلية (7 جلسة) - بكج لمدة سبعة جلسات 	2026-02-24 09:34:44.844	3	تمارين تأهيلية	7	f
621	510	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-02-24 09:47:29.594	3	أجهزة علاج طبيعي	1	f
622	55	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-02-24 09:51:13.107	3	أجهزة علاج طبيعي	1	f
623	480	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 09:54:33.544	3	أجهزة علاج طبيعي	1	f
624	299	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - تجديد بكج 	2026-02-24 10:00:48.621	3	أجهزة علاج طبيعي	6	f
625	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-24 10:01:43.899	3	أجهزة علاج طبيعي	1	f
626	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-24 10:11:06.397	3	أجهزة علاج طبيعي	1	f
627	194	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-24 10:29:29.044	3	روبوت	1	f
628	249	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 10:29:54.359	3	أجهزة علاج طبيعي	1	f
629	153	100000	جلسات علاج إضافية - تمارين تأهيلية (4 جلسة)	2026-02-24 10:30:26.33	3	تمارين تأهيلية	4	f
630	423	600000	تم تسديد المبلغ بالكامل	2026-02-24 11:10:46	1	\N	\N	f
631	489	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-02-24 16:12:25.732	3	أجهزة علاج طبيعي	3	f
632	502	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 16:27:49.902	3	أجهزة علاج طبيعي	1	f
633	513	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 16:58:43.328	3	أجهزة علاج طبيعي	1	f
634	322	100000	جلسات علاج إضافية - روبوت (2 جلسة)	2026-02-24 17:07:25.952	3	روبوت	2	f
636	488	225000	جلسات علاج إضافية - أجهزة علاج طبيعي (9 جلسة)	2026-02-24 17:55:42.131	3	أجهزة علاج طبيعي	9	f
637	518	250000	جلسات علاج إضافية - تمارين تأهيلية (10 جلسة)	2026-02-24 17:59:43.443	3	تمارين تأهيلية	10	f
638	517	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-24 18:07:43.963	3	روبوت	1	f
639	504	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-02-24 18:33:40.406	3	أجهزة علاج طبيعي	6	f
640	323	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-02-24 18:58:47.98	3	أجهزة علاج طبيعي	1	f
641	505	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-02-24 19:21:06.372	3	أجهزة علاج طبيعي	6	f
642	476	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 19:52:48.244	3	أجهزة علاج طبيعي	1	f
643	508	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 19:53:47.93	3	أجهزة علاج طبيعي	1	f
644	394	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 19:54:44.635	3	أجهزة علاج طبيعي	1	f
645	519	100000	جلسات علاج إضافية - روبوت (2 جلسة)	2026-02-24 20:36:01.482	3	روبوت	2	f
646	224	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-24 20:58:28.206	3	روبوت	1	f
647	456	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 20:58:56.999	3	أجهزة علاج طبيعي	1	f
635	270	20000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-24 02:36:40	3	أجهزة علاج طبيعي	1	f
648	72	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-12 05:13:10	3	أجهزة علاج طبيعي	1	f
410	74	95000	دفعة أولية - جلسات علاج إضافية	2026-02-16 05:18:05	3	تمارين تأهيلية	5	f
649	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-25 05:23:03.574	3	تمارين تأهيلية	1	f
650	165	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-19 05:24:43	3	أجهزة علاج طبيعي	1	f
651	465	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-21 05:27:23	3	تمارين تأهيلية	1	f
652	493	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 06:07:25.172	3	أجهزة علاج طبيعي	1	f
653	345	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) - حاسب المريض بكج جديد سيباشر عليه من الغد 	2026-02-25 06:38:08.551	3	أجهزة علاج طبيعي	3	f
654	526	50000	روبوت (1 جلسة)	2026-02-25 07:23:23	3	روبوت	1	f
655	165	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-25 07:35:51.45	3	تمارين تأهيلية	1	f
656	499	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه بالجلسة الاولى للعلاج الطبيعي بعد استشارة كانت بتاريخ 23/2/2026 عند الدكتور عبد الله 	2026-02-25 08:18:22.018	3	أجهزة علاج طبيعي	1	f
657	498	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشر المريض باول جلسات العلاج الطبيعي بعد استشاره كانت بتاريخ 23/2/2026	2026-02-25 08:34:11.29	3	أجهزة علاج طبيعي	6	f
658	298	250000	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة)	2026-02-25 08:38:25.218	3	أجهزة علاج طبيعي	10	f
659	513	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 10:08:47.692	3	أجهزة علاج طبيعي	1	f
660	228	50000	جلسات علاج إضافية - روبوت (1 جلسة) - باشر المريض باول جلسات العلاج الطبيعي وجلسات الروبوت بعد استشارة الدكتور عبد الله خان بتاريخ 23/2/2026	2026-02-25 10:13:54.96	3	روبوت	1	f
661	228	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض باول جلسات العلاج الطبيعي وجلسات الروبوت بعد استشارة الدكتور عبد الله خان بتاريخ 23/2/2026	2026-02-25 10:13:55.006	3	أجهزة علاج طبيعي	1	f
662	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 10:28:15.135	3	أجهزة علاج طبيعي	1	f
663	528	2500000		2026-02-25 12:16:10	4	\N	\N	f
664	445	250000	تم تسديد المبلغ بالكامل	2026-02-25 12:18:52	1	\N	\N	f
665	276	1000000		2026-02-25 12:25:35	4	\N	\N	f
666	529	300000	دفعه اولى	2026-02-25 14:20:51	1	\N	\N	f
667	517	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-25 16:14:18.627	3	روبوت	1	f
669	456	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 18:30:01.848	3	أجهزة علاج طبيعي	1	f
670	516	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 18:40:22.447	3	أجهزة علاج طبيعي	1	f
668	270	20000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 19:49:09	3	أجهزة علاج طبيعي	1	f
671	524	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 20:02:54.789	3	أجهزة علاج طبيعي	1	f
672	508	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 20:04:06.512	3	أجهزة علاج طبيعي	1	f
673	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-25 21:03:44.841	3	أجهزة علاج طبيعي	1	f
674	493	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-26 06:05:26.667	3	أجهزة علاج طبيعي	1	f
675	395	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-26 06:14:11.636	3	أجهزة علاج طبيعي	1	f
676	395	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 06:16:40.466	3	أجهزة علاج طبيعي	1	f
677	55	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-02-26 07:13:58.638	3	أجهزة علاج طبيعي	1	f
678	165	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-26 08:03:46.544	3	أجهزة علاج طبيعي	1	f
679	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 08:46:30.057	3	أجهزة علاج طبيعي	1	f
680	205	50000	جلسات علاج إضافية - روبوت (1 جلسة) - بالاضافة الى جلسة التمارين التاهيليه من ضمن البكج 	2026-02-26 09:10:37.545	3	روبوت	1	f
681	513	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-02-26 09:25:50.501	3	أجهزة علاج طبيعي	2	f
682	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-26 09:52:34.699	3	أجهزة علاج طبيعي	1	f
683	480	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-02-26 09:54:16.94	3	أجهزة علاج طبيعي	1	f
685	249	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 10:25:47.915	3	أجهزة علاج طبيعي	1	f
686	194	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-26 10:26:31.477	3	روبوت	1	f
687	537	1000000	دفعة اولى	2026-02-26 10:34:35	2	\N	\N	f
688	538	500000	دفعة اولي / تصنيع قالب وسيليكون	2026-02-26 12:38:58	2	\N	\N	f
689	516	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 16:14:45.66	3	أجهزة علاج طبيعي	1	f
690	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-26 17:31:16.18	3	روبوت	1	f
691	323	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-26 17:54:32.42	3	روبوت	1	f
692	541	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 18:16:55.323	3	أجهزة علاج طبيعي	1	f
693	541	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 18:19:29.599	3	أجهزة علاج طبيعي	1	f
694	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 18:58:57.427	3	أجهزة علاج طبيعي	1	f
695	462	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 19:55:27.628	3	أجهزة علاج طبيعي	1	f
696	508	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-02-26 19:59:19.785	3	أجهزة علاج طبيعي	1	f
697	531	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-02-26 20:26:50.608	3	أجهزة علاج طبيعي	8	f
698	456	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-26 21:17:55.199	3	أجهزة علاج طبيعي	1	f
699	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-28 05:31:30.102	3	تمارين تأهيلية	1	f
700	493	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-28 06:03:24.722	3	أجهزة علاج طبيعي	1	f
701	533	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض اليوم باول جلسات العلاج الطبيعي مع الدكتور عبدالله خان 	2026-02-28 07:08:41.906	3	تمارين تأهيلية	1	f
702	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-02-28 08:09:59.822	3	أجهزة علاج طبيعي	1	f
703	548	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض بعد الاستشاره مباشرتا مع الدكتور عبد الله خان 	2026-02-28 08:15:09.494	3	أجهزة علاج طبيعي	1	f
704	287	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-28 09:00:22.325	3	أجهزة علاج طبيعي	1	f
705	550	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض بعد الاستشارة مباشرتا مع الدكتور عبد الله خان 	2026-02-28 10:30:01.331	3	أجهزة علاج طبيعي	1	f
706	549	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض بعد الاستشارة مباشرتا \n	2026-02-28 10:39:17.966	3	أجهزة علاج طبيعي	1	f
707	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-28 10:40:22.963	3	أجهزة علاج طبيعي	1	f
708	553	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-02-28 16:47:17.568	3	أجهزة علاج طبيعي	6	f
709	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-28 17:34:47.151	3	روبوت	1	f
710	424	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-02-28 18:04:19.063	3	أجهزة علاج طبيعي	6	f
711	323	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-02-28 18:06:48.773	3	تمارين تأهيلية	1	f
712	456	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-02-28 18:28:37.316	3	أجهزة علاج طبيعي	4	f
860	595	200000	تم تسديد المبلغ بالكامل	2026-03-08 11:21:08	1	\N	\N	f
713	554	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-28 18:29:08.073	3	أجهزة علاج طبيعي	1	f
714	542	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-28 18:56:17.148	3	أجهزة علاج طبيعي	1	f
715	545	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-28 19:07:36.956	3	أجهزة علاج طبيعي	1	f
716	394	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-28 19:18:00.511	3	أجهزة علاج طبيعي	1	f
717	508	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - بكج لستة جلسات 	2026-02-28 20:01:52.171	3	أجهزة علاج طبيعي	6	f
718	546	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-28 20:21:44.063	3	أجهزة علاج طبيعي	1	f
719	224	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-28 21:01:06.635	3	روبوت	1	f
720	131	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-02-28 21:06:07.545	3	أجهزة علاج طبيعي	8	f
721	165	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-01 07:20:40.176	3	تمارين تأهيلية	1	f
722	558	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض بعد الاستشارة مباشرة	2026-03-01 07:28:09.709	3	تمارين تأهيلية	1	f
723	548	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 07:37:38.065	3	أجهزة علاج طبيعي	1	f
724	303	1900000	تم تسديد المبلغ بالكامل 	2026-02-28 07:46:23	2	\N	\N	f
725	551	50000	تم تسديد المبلغ بالكامل 	2026-02-28 07:48:06	2	\N	\N	f
726	552	800000	دفعة اولى	2026-02-28 07:50:17	2	\N	\N	f
727	559	7088000	دفعة ثانية	2026-02-28 08:06:59	2	\N	\N	f
728	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 08:11:59.477	3	أجهزة علاج طبيعي	1	f
729	561	150000	دفعه اولى	2026-02-28 09:47:15	1	\N	\N	f
730	513	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-03-01 09:47:18.407	3	أجهزة علاج طبيعي	2	f
731	383	200000	تم تسديد المبلغ بالكامل	2026-03-01 09:49:10	1	\N	\N	f
732	480	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 09:58:07.038	3	أجهزة علاج طبيعي	1	f
733	249	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 10:21:12.605	3	أجهزة علاج طبيعي	1	f
734	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 10:31:56.775	3	أجهزة علاج طبيعي	1	f
735	563	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضة جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	2026-03-01 11:21:00.834	3	أجهزة علاج طبيعي	1	f
736	549	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 11:25:08.94	3	أجهزة علاج طبيعي	1	f
737	503	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 16:32:52.311	3	أجهزة علاج طبيعي	1	f
738	566	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 17:34:46.717	3	أجهزة علاج طبيعي	1	f
739	568	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 18:20:01.645	3	أجهزة علاج طبيعي	1	f
740	188	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-03-01 18:40:26.453	3	أجهزة علاج طبيعي	8	f
741	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 18:44:24.831	3	أجهزة علاج طبيعي	1	f
742	555	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 18:57:38.999	3	أجهزة علاج طبيعي	1	f
743	546	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 19:25:27.347	3	أجهزة علاج طبيعي	1	f
744	556	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-01 21:03:07.479	3	أجهزة علاج طبيعي	1	f
745	493	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 06:08:13.48	3	أجهزة علاج طبيعي	1	f
747	165	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-02 08:23:26.754	3	تمارين تأهيلية	1	f
746	573	25000	جلسة مفردة - أجهزة علاج طبيعي (10 جلسة)	2026-03-02 08:33:20	3	أجهزة علاج طبيعي	1	f
748	548	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 09:32:32.318	3	أجهزة علاج طبيعي	1	f
749	515	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-02 10:19:14.714	3	تمارين تأهيلية	1	f
750	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 10:25:32.759	3	أجهزة علاج طبيعي	1	f
751	549	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 11:17:58.237	3	أجهزة علاج طبيعي	1	f
752	408	175000	تم تسديد المبلغ بالكامل	2026-03-02 11:39:40	1	\N	\N	f
754	213	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-02-02 15:59:23	3	أجهزة علاج طبيعي	1	f
755	569	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-02 16:29:19.144	3	أجهزة علاج طبيعي	6	f
756	570	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 16:34:15.769	3	أجهزة علاج طبيعي	1	f
757	502	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 16:49:27.971	3	أجهزة علاج طبيعي	1	f
758	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 17:25:19.216	3	أجهزة علاج طبيعي	1	f
759	567	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-02 17:25:57.164	3	أجهزة علاج طبيعي	6	f
760	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-02 17:29:38.363	3	روبوت	1	f
753	471	1500000	دفعه ثالثة	2026-03-02 10:11:23	1	\N	\N	f
1000	135	25000	أبر صينية (1 جلسة)	2026-01-26 09:04:02	3	أبر صينية	1	f
761	571	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 18:39:37.649	3	أجهزة علاج طبيعي	1	f
762	545	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-03-02 19:13:06.9	3	أجهزة علاج طبيعي	5	f
763	307	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-02 19:36:45.852	3	أجهزة علاج طبيعي	4	f
764	576	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-02 19:42:01.913	3	أجهزة علاج طبيعي	1	f
765	550	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 07:14:59.494	3	أجهزة علاج طبيعي	1	f
766	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 07:23:40.733	3	أجهزة علاج طبيعي	1	f
767	549	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 07:24:13.362	3	أجهزة علاج طبيعي	1	f
768	577	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض بعد الاستشارة مباشرة 	2026-03-03 08:22:18.293	3	أجهزة علاج طبيعي	1	f
769	287	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 08:50:56.804	3	أجهزة علاج طبيعي	1	f
770	513	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-03-03 09:11:45.817	3	أجهزة علاج طبيعي	2	f
771	480	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 10:09:07.986	3	أجهزة علاج طبيعي	1	f
772	249	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 10:23:25.447	3	أجهزة علاج طبيعي	1	f
773	563	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 11:06:49.43	3	أجهزة علاج طبيعي	1	f
774	580	4000000	تم تسديد المبلغ بالكامل 	2026-03-03 12:11:52	2	\N	\N	f
775	575	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-03-03 16:24:53.485	3	أجهزة علاج طبيعي	8	f
776	570	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-03 16:37:31.004	3	أجهزة علاج طبيعي	4	f
777	503	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 16:40:03.07	3	أجهزة علاج طبيعي	1	f
778	222	325000	جلسات علاج إضافية - تمارين تأهيلية (13 جلسة)	2026-03-03 16:45:03.522	3	تمارين تأهيلية	13	f
779	425	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-03 17:10:17.377	3	أجهزة علاج طبيعي	6	f
780	585	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 18:48:47.765	3	أجهزة علاج طبيعي	1	f
781	571	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 19:27:57.455	3	أجهزة علاج طبيعي	1	f
782	394	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 19:28:48.819	3	أجهزة علاج طبيعي	1	f
784	224	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-03 20:40:49.853	3	روبوت	1	f
783	270	20000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-03 02:49:34	3	أجهزة علاج طبيعي	1	f
785	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-04 05:25:33.323	3	تمارين تأهيلية	1	f
786	149	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-04 05:35:25.839	3	أجهزة علاج طبيعي	1	f
787	493	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-04 06:15:49.494	3	أجهزة علاج طبيعي	1	f
788	589	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-04 07:33:52.278	3	تمارين تأهيلية	1	f
789	582	700000	دفعه اولى	2026-03-04 08:04:27	1	\N	\N	f
790	590	100000		2026-03-04 08:17:19	1	\N	\N	f
791	549	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-04 08:44:28.123	3	أجهزة علاج طبيعي	1	f
792	467	175000	جلسات علاج إضافية - أجهزة علاج طبيعي (7 جلسة) - + جلسة اليوم مجانية بعلم دكتور ياسر 	2026-03-04 08:51:45.33	3	أجهزة علاج طبيعي	7	f
793	467	350000	جلسات علاج إضافية - روبوت (7 جلسة)	2026-03-04 08:52:17.555	3	روبوت	7	f
794	515	75000	جلسات علاج إضافية - تمارين تأهيلية (3 جلسة)	2026-03-04 10:14:24.999	3	تمارين تأهيلية	3	f
795	591	5000000	تم تسديد المبلغ بالكامل 	2026-03-04 10:33:47	2	\N	\N	f
796	335	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-04 10:36:10.394	3	أجهزة علاج طبيعي	6	f
797	578	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اليوم جلسته الاولى من العلاج الطبيعي بعد استشارة البارحة 	2026-03-04 10:42:34.551	3	أجهزة علاج طبيعي	1	f
798	593	500000		2026-03-04 11:25:32	1	\N	\N	f
801	596	750000		2026-03-04 13:21:50	1	\N	\N	f
802	595	100000	دفعه اولى	2026-03-04 13:28:53	1	\N	\N	f
803	514	500000		2026-03-04 14:13:31	4	\N	\N	f
804	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-04 17:24:59.163	3	روبوت	1	f
805	598	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-04 18:57:29.073	3	أجهزة علاج طبيعي	1	f
806	599	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-04 19:37:25.56	3	أجهزة علاج طبيعي	4	f
800	594	500000	دفعة من ديون سابقة	2026-03-04 07:26:35	1	\N	\N	f
807	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-05 07:42:22.409	3	أجهزة علاج طبيعي	1	f
808	589	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-05 07:45:25.155	3	تمارين تأهيلية	1	f
810	286	27700000	تم تسديد المبلغ بالكامل 	2026-03-05 08:14:11	2	\N	\N	f
811	602	500000	تم تسديد كامل المبلغ 	2026-03-05 08:52:32	1	\N	\N	f
859	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-08 10:19:30.813	3	تمارين تأهيلية	1	f
812	603	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض بعد الاستشارة مباشرة 	2026-03-05 10:17:12.019	3	أجهزة علاج طبيعي	1	f
813	480	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-05 10:18:09.856	3	أجهزة علاج طبيعي	1	f
814	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-05 10:24:31.622	3	تمارين تأهيلية	1	f
815	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-05 10:27:13.427	3	أجهزة علاج طبيعي	1	f
816	563	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-05 11:11:15.755	3	أجهزة علاج طبيعي	1	f
817	549	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-05 11:16:11.736	3	أجهزة علاج طبيعي	1	f
818	597	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-05 16:46:31.573	3	أجهزة علاج طبيعي	6	f
819	575	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-05 16:53:13.429	3	أبر صينية	1	f
820	606	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-05 17:25:42.986	3	أجهزة علاج طبيعي	6	f
821	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-05 17:44:20.97	3	أجهزة علاج طبيعي	1	f
822	571	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-05 17:53:18.075	3	أجهزة علاج طبيعي	1	f
823	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-05 18:14:20.075	3	أجهزة علاج طبيعي	1	f
824	265	25000	جلسات علاج إضافية - أبر صينية (1 جلسة) - ابر صينية	2026-03-05 18:24:39.328	3	أبر صينية	1	f
825	395	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-07 05:23:33.817	3	أجهزة علاج طبيعي	1	f
826	395	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-07 05:24:09.488	3	أجهزة علاج طبيعي	1	f
827	346	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-03-07 05:24:27.427	3	أجهزة علاج طبيعي	2	f
828	547	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اليوم اول جلسات العلاج الطبيعي مع الدكتور عبد الله خان 	2026-03-07 05:44:54.764	3	أجهزة علاج طبيعي	1	f
829	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-07 05:51:49.095	3	تمارين تأهيلية	1	f
830	609	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - عادت المريضه وقررت المباشرة اليوم بعد استشارة دكتور عبد الله خان 	2026-03-07 07:21:21.761	3	أجهزة علاج طبيعي	1	f
831	228	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-07 07:40:09.376	3	أجهزة علاج طبيعي	1	f
832	228	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-07 07:40:09.436	3	روبوت	1	f
833	499	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-07 07:41:44.049	3	أجهزة علاج طبيعي	1	f
834	612	190000	تم تسديد المبلغ بالكامل	2026-03-07 08:49:44	1	\N	\N	f
835	611	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه بعد الاستشارة مباشرة 	2026-03-07 08:54:47.618	3	أجهزة علاج طبيعي	1	f
836	610	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض بعد الاستشارة مباشرة 	2026-03-07 08:55:10.387	3	أجهزة علاج طبيعي	1	f
837	613	100000	دفعه ثانيه	2026-03-07 09:08:28	1	\N	\N	f
838	614	250000	دفعه ثانيه	2026-03-07 09:19:45	1	\N	\N	f
839	563	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-07 10:29:57.086	3	أجهزة علاج طبيعي	1	f
840	415	1000000	تم تسديد المبلغ بالكامل	2026-03-07 11:53:26	1	\N	\N	f
841	514	1000000		2026-03-07 13:56:03	4	\N	\N	f
842	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-07 17:15:49.328	3	روبوت	1	f
843	625	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-07 17:48:41.388	3	أجهزة علاج طبيعي	1	f
844	424	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-07 18:18:23.624	3	أجهزة علاج طبيعي	6	f
845	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-07 19:00:04	3	أجهزة علاج طبيعي	1	f
846	394	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-07 19:28:19.704	3	أجهزة علاج طبيعي	1	f
847	577	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-03-08 05:46:19.449	3	أجهزة علاج طبيعي	1	f
848	537	5250000	تم تسديد المبلغ بالكامل 	2026-03-05 07:43:07	2	\N	\N	f
849	605	495000		2026-03-05 07:44:31	2	\N	\N	f
851	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-03-08 07:55:19.192	3	أجهزة علاج طبيعي	1	f
852	121	150000	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة) - اشتراك بعرض المركز بكج لستة جلسات وجلسة السابعة مجانية	2026-03-08 08:29:16.693	3	تمارين تأهيلية	6	f
853	636	500000	دفعه ثانيه	2026-03-08 08:42:08	1	\N	\N	f
854	635	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - باشرت الان بعد الاستشارة الاولية	2026-03-08 09:48:41.138	3	أجهزة علاج طبيعي	2	f
855	536	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشرت اليوم بعد ان اخذت استشارة اولية سابقا بتاريخ 26/2	2026-03-08 09:50:07.743	3	أجهزة علاج طبيعي	6	f
856	480	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-08 10:04:38.513	3	أجهزة علاج طبيعي	1	f
857	229	200000	تسديد قسط	2026-03-08 10:13:13	2	\N	\N	f
858	633	350000	تسديد قسط	2026-03-08 10:16:12	2	\N	\N	f
861	643	250000	دفعه ثانيه	2026-03-08 13:55:29	1	\N	\N	f
862	626	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-08 17:08:23.656	3	أجهزة علاج طبيعي	6	f
863	270	20000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-08 18:03:33	3	أجهزة علاج طبيعي	1	f
864	458	500000	جلسات علاج إضافية - روبوت (10 جلسة)	2026-03-08 18:09:18.085	3	روبوت	10	f
865	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-08 19:10:17.035	3	أجهزة علاج طبيعي	1	f
866	645	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-08 19:50:24.621	3	أبر صينية	1	f
867	355	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-08 19:53:36.41	3	أجهزة علاج طبيعي	1	f
868	571	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-08 19:54:35.582	3	أجهزة علاج طبيعي	1	f
869	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-08 19:55:18.496	3	أجهزة علاج طبيعي	1	f
870	625	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-08 19:56:49.246	3	أجهزة علاج طبيعي	1	f
871	468	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-03-08 20:11:39.285	3	أجهزة علاج طبيعي	3	f
872	646	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشرت المريضه بعد الاستشارة مباشرة 	2026-03-09 06:59:11.863	3	تمارين تأهيلية	1	f
873	647	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه بعد الاستشارة مباشرة 	2026-03-09 07:25:01.683	3	أجهزة علاج طبيعي	1	f
874	228	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 07:37:30.42	3	أجهزة علاج طبيعي	1	f
875	228	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-09 07:37:30.464	3	روبوت	1	f
876	499	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 07:39:18.713	3	أجهزة علاج طبيعي	1	f
877	637	1000000	تم تسديد المبلغ بالكامل 	2026-03-08 08:04:36	2	\N	\N	f
878	649	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض بعد الاستشارة مباشرة 	2026-03-09 08:50:29.689	3	تمارين تأهيلية	1	f
879	640	75000	جلسات علاج إضافية - تمارين تأهيلية (3 جلسة) - باشرت المريضه اليوم باول جلسات العلاج الطبيعي بعد استشارة البارحة مع الدكتور عبد الله خان 	2026-03-09 10:00:25.686	3	تمارين تأهيلية	3	f
880	426	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 10:30:08.03	3	أجهزة علاج طبيعي	1	f
881	563	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 11:10:35.195	3	أجهزة علاج طبيعي	1	f
882	21	1000000	تم تسديد المبلغ بالكامل	2026-01-28 11:37:36	1	\N	\N	f
883	349	1000000	دفعة ثانية	2026-02-21 11:54:17	2	\N	\N	f
884	349	3000000	تم تسديد المبلغ بالكامل 	2026-03-08 11:54:49	2	\N	\N	f
885	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 17:06:10.599	3	أجهزة علاج طبيعي	1	f
886	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 17:25:53.173	3	أجهزة علاج طبيعي	1	f
887	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-09 17:38:26.414	3	روبوت	1	f
888	652	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 18:19:07.709	3	أجهزة علاج طبيعي	1	f
889	584	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 18:25:17.047	3	أجهزة علاج طبيعي	1	f
890	653	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 18:29:46.671	3	أجهزة علاج طبيعي	1	f
891	638	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-09 19:41:57.251	3	أجهزة علاج طبيعي	6	f
892	627	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-09 20:46:34.324	3	أجهزة علاج طبيعي	1	f
893	652	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-03-09 21:20:58.669	3	أجهزة علاج طبيعي	3	f
894	577	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-03-10 06:04:17.058	3	أجهزة علاج طبيعي	1	f
895	629	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	2026-03-10 06:30:39.896	3	تمارين تأهيلية	1	f
896	149	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-10 07:34:25.274	3	أجهزة علاج طبيعي	1	f
897	320	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-10 07:36:53.957	3	أجهزة علاج طبيعي	1	f
898	408	75000	دفعة اولى	2026-02-10 08:26:20	1	\N	\N	f
899	635	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حجز لجلسة الخميس 	2026-03-10 09:02:45.052	3	أجهزة علاج طبيعي	1	f
900	656	1000000	تم تسديد المبلغ بالكامل	2026-03-10 09:06:17	1	\N	\N	f
901	471	1000000	تم تسديد المبلغ بالكامل	2026-03-10 09:29:22	1	\N	\N	f
902	480	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-03-10 10:00:39.057	3	أجهزة علاج طبيعي	1	f
903	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-10 10:22:37.235	3	تمارين تأهيلية	1	f
904	49	250000	دفعه ثانيه	2026-03-10 10:59:34	1	\N	\N	f
905	249	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-10 11:07:29.241	3	أجهزة علاج طبيعي	1	f
906	417	75000	تم تسديد المبلغ بالكامل 	2026-02-11 11:13:12	1	\N	\N	f
907	48	700000	تم تسديد المبلغ بالكامل	2026-01-22 12:54:00	1	\N	\N	f
908	657	100000	دفعه ثانيه	2026-02-17 13:30:59	1	\N	\N	f
909	657	100000	دفعه ثانيه	2026-03-10 13:31:27	1	\N	\N	f
910	276	1250000		2026-03-10 14:25:01	4	\N	\N	f
911	659	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-03-10 17:47:07.037	3	أجهزة علاج طبيعي	8	f
912	660	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-10 18:19:16.29	3	أجهزة علاج طبيعي	1	f
913	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-10 18:45:57.119	3	أجهزة علاج طبيعي	1	f
914	394	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-10 19:46:58.945	3	أجهزة علاج طبيعي	1	f
915	394	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-10 21:13:37.1	3	أبر صينية	1	f
916	646	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-11 05:59:06.914	3	تمارين تأهيلية	1	f
917	661	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	2026-03-11 06:33:10.193	3	أجهزة علاج طبيعي	1	f
918	662	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض باول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	2026-03-11 06:48:35.857	3	أجهزة علاج طبيعي	1	f
919	663	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - باشر المريض اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	2026-03-11 07:43:49.77	3	أجهزة علاج طبيعي	2	f
920	228	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-11 08:12:44.585	3	أجهزة علاج طبيعي	1	f
921	228	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-11 08:12:44.632	3	روبوت	1	f
922	499	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-11 08:13:15.968	3	أجهزة علاج طبيعي	1	f
923	665	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	2026-03-11 08:43:01.025	3	أجهزة علاج طبيعي	1	f
924	662	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حجز للجلسه القادمه المقرره السبت الساعه 10 الصبح 	2026-03-11 08:43:46.485	3	أجهزة علاج طبيعي	1	f
925	552	575000	تم تسديد المبلغ بالكامل 	2026-03-07 09:40:56	2	\N	\N	f
926	282	4250000	تسديد المبلغ كامل 	2026-03-11 10:45:52	2	\N	\N	f
927	515	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - جلسة مفردة	2026-03-11 11:14:17.069	3	تمارين تأهيلية	1	f
928	404	250000	دفعه ثانيه	2026-03-11 12:08:28	1	\N	\N	f
929	46	250000	دفعه ثانيه	2026-03-11 12:33:12	1	\N	\N	f
930	660	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-03-11 17:07:23.279	3	أجهزة علاج طبيعي	5	f
931	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-11 17:07:52.633	3	أجهزة علاج طبيعي	1	f
932	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-11 17:25:57.284	3	روبوت	1	f
933	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-11 17:29:55.561	3	أجهزة علاج طبيعي	1	f
934	670	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-11 18:43:45.928	3	أجهزة علاج طبيعي	1	f
935	671	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-11 19:52:38.245	3	أجهزة علاج طبيعي	1	f
936	629	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-12 07:43:09.208	3	تمارين تأهيلية	1	f
937	646	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-12 07:43:41.206	3	تمارين تأهيلية	1	f
938	635	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حجز جلسة ليوم السبت الساعة 10 صباحا	2026-03-12 08:37:00.639	3	أجهزة علاج طبيعي	1	f
939	672	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة	2026-03-12 09:31:22.774	3	تمارين تأهيلية	1	f
940	673	50000	جلستين  - تمارين تأهيلية (2 جلسة)	2026-03-12 09:42:42	3	تمارين تأهيلية	2	f
941	344	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - حضرت المريضه للاستشارة عند اخصائي العلاج الطبيعي عبد الله خان بخصوص تشنج باليد وباشرت باول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	2026-03-12 10:42:57.126	3	أجهزة علاج طبيعي	6	f
942	13	50000	أجهزة علاج طبيعي (20 جلسة)	2026-01-13 11:51:57	3	أجهزة علاج طبيعي	2	f
943	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-03-12 16:57:51.7	3	أجهزة علاج طبيعي	1	f
944	674	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-03-12 17:35:17.454	3	أجهزة علاج طبيعي	1	f
945	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-03-12 17:49:32.543	3	أجهزة علاج طبيعي	1	f
946	675	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة فردية	2026-03-12 19:11:43.487	3	أجهزة علاج طبيعي	1	f
947	646	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-14 05:52:47.368	3	تمارين تأهيلية	1	f
948	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-14 05:53:15.382	3	تمارين تأهيلية	1	f
949	661	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 06:21:44.297	3	أجهزة علاج طبيعي	1	f
950	677	150000	دفعه اولى	2026-03-14 08:27:34	1	\N	\N	f
951	678	770000	دفعه اولى	2026-03-12 08:42:15	1	\N	\N	f
952	678	1455000	دفعه ثانيه	2026-03-14 08:44:45	1	\N	\N	f
954	467	300000	جلسات علاج إضافية - روبوت (6 جلسة)	2026-03-14 08:56:08.017	3	روبوت	6	f
955	467	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-14 08:56:08.059	3	أجهزة علاج طبيعي	6	f
956	673	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-14 09:20:44.89	3	تمارين تأهيلية	1	f
957	680	300000	دفعه ثانيه	2026-03-14 09:42:31	1	\N	\N	f
958	681	107000	دفعه ثانيه	2026-03-14 09:52:12	1	\N	\N	f
959	682	110000	تم تسديد المبلغ بالكامل	2026-03-14 10:01:43	1	\N	\N	f
960	515	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-14 10:05:55.765	3	تمارين تأهيلية	1	f
961	545	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حضرت المراجعه بدأت المراجعة ابتداءً من جلسة اليوم مع أخصائي العلاج الطبيعي الدكتور عبد الله خان، حيث كانت المريضة تتلقى التمارين العلاجية سابقاً معه عندما كان يقوم بالإنابة عن اخصائي العلاج الطبيعي مصطفى.\n\nوبناءً على ذلك، تم تحويل المتابعة إليه بشكل رسمي لاستكمال البرنامج العلاجي والتمارين التأهيلية بصورة منتظمة وتحت إشرافه المباشر.	2026-03-14 10:40:21.162	3	أجهزة علاج طبيعي	1	f
962	600	250000	دفعه ثانيه	2026-03-14 12:30:13	1	\N	\N	f
963	685	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 17:39:15.064	3	أجهزة علاج طبيعي	1	f
964	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 17:41:53.053	3	أجهزة علاج طبيعي	1	f
965	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 17:42:35.816	3	أجهزة علاج طبيعي	1	f
966	686	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-14 17:49:03.377	3	أبر صينية	1	f
967	597	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-14 18:39:37.03	3	أجهزة علاج طبيعي	4	f
968	675	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 18:47:44.846	3	أجهزة علاج طبيعي	1	f
969	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-14 18:50:20.351	3	روبوت	1	f
970	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 19:34:53.194	3	أجهزة علاج طبيعي	1	f
971	380	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-14 19:45:50.646	3	أبر صينية	1	f
972	625	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 19:46:17.679	3	أجهزة علاج طبيعي	1	f
973	690	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 20:04:58.296	3	أجهزة علاج طبيعي	1	f
974	688	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 20:10:03.206	3	أجهزة علاج طبيعي	1	f
975	688	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-03-14 20:10:52.838	3	أجهزة علاج طبيعي	5	f
976	692	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-14 20:32:41.928	3	أجهزة علاج طبيعي	6	f
977	689	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-14 20:37:22.432	3	أجهزة علاج طبيعي	4	f
978	394	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 20:44:18.945	3	أجهزة علاج طبيعي	1	f
979	627	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-14 20:48:30.271	3	أجهزة علاج طبيعي	1	f
980	577	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-15 06:00:37.431	3	أجهزة علاج طبيعي	1	f
981	693	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-03-15 07:58:15.096	3	أجهزة علاج طبيعي	1	f
982	589	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - جلسة مفردة	2026-03-15 07:58:51.173	3	تمارين تأهيلية	1	f
598	467	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-02-23 09:33:49	3	روبوت	1	f
983	153	100000	جلسات علاج إضافية - تمارين تأهيلية (4 جلسة)	2026-03-15 10:19:23.92	3	تمارين تأهيلية	4	f
984	696	350000	تم تسديد المبلغ بالكامل	2026-03-12 12:06:42	1	\N	\N	f
985	511	1000000	تم تسديد المبلغ بالكامل 	2026-03-15 12:23:40	2	\N	\N	f
809	600	250000	دفعه ثانيه	2026-03-04 12:44:59	1	\N	\N	f
986	514	500000		2026-03-15 14:36:17	4	\N	\N	f
987	672	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-15 17:22:28.583	3	تمارين تأهيلية	1	f
988	673	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-15 17:55:13.965	3	تمارين تأهيلية	1	f
989	698	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-15 18:36:41.589	3	أجهزة علاج طبيعي	1	f
990	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-15 18:44:37.185	3	أجهزة علاج طبيعي	1	f
991	625	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-15 19:02:53.857	3	أجهزة علاج طبيعي	1	f
992	700	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشرت المريضة بعد الاستشارة مباشرة 	2026-03-16 06:01:56.973	3	أجهزة علاج طبيعي	6	f
993	646	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-16 06:04:28.166	3	تمارين تأهيلية	1	f
994	701	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج الطبيعي عبد الله بعد الاستشارة مباشرة 	2026-03-16 07:34:52.122	3	أجهزة علاج طبيعي	2	f
995	694	500000	دفعه اولى	2026-03-16 07:59:07	1	\N	\N	f
219	136	25000	دفعة أولية - جلسات علاج إضافية	2026-02-03 17:33:56.813	3	\N	\N	f
996	32	50000	تمارين تأهيلية (2 جلسة)	2026-01-15 08:38:17	3	تمارين تأهيلية	2	f
997	703	250000	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج الطبيعي عبد الله بعد الاستشارة مباشرة 	2026-03-16 08:42:41.18	3	أجهزة علاج طبيعي	10	f
999	139	50000	تمارين تأهيلية (2 جلسة)	2026-01-26 08:51:07	3	تمارين تأهيلية	2	f
1001	686	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-16 10:01:07.721	3	أجهزة علاج طبيعي	6	f
1002	705	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة 	2026-03-16 10:12:26.424	3	أجهزة علاج طبيعي	1	f
1003	545	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-03-16 10:24:59.392	3	أجهزة علاج طبيعي	2	f
1004	515	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-16 10:26:28.339	3	أجهزة علاج طبيعي	1	f
1005	673	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - مريض راقد بالطابق الخامس 	2026-03-16 10:51:01.937	3	تمارين تأهيلية	1	f
1006	677	25000	تم تسديد المبلغ بالكامل	2026-03-16 13:16:53	1	\N	\N	f
1007	582	700000	تم تسديد المبلغ بالكامل	2026-03-16 14:01:21	1	\N	\N	f
1008	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-16 16:52:52.496	3	أجهزة علاج طبيعي	1	f
1009	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-16 16:54:03	3	أجهزة علاج طبيعي	1	f
1010	675	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-16 17:56:11.919	3	أجهزة علاج طبيعي	1	f
1011	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-16 17:56:32.133	3	أجهزة علاج طبيعي	1	f
1012	424	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-16 18:05:23.008	3	أجهزة علاج طبيعي	4	f
1013	687	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-16 19:55:16.549	3	أجهزة علاج طبيعي	1	f
1014	311	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-16 20:11:12.558	3	أجهزة علاج طبيعي	6	f
1015	646	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-17 05:51:13.933	3	تمارين تأهيلية	1	f
1016	577	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-17 06:12:43.011	3	أجهزة علاج طبيعي	1	f
1017	589	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-17 07:51:26.86	3	تمارين تأهيلية	1	f
1018	709	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض باول جلسات العلاج مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة 	2026-03-17 09:55:59.632	3	أجهزة علاج طبيعي	1	f
1019	673	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة لمريض راقد بالطابق الخامس 	2026-03-17 09:57:00.121	3	أجهزة علاج طبيعي	1	f
1020	567	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-17 17:30:50.196	3	أجهزة علاج طبيعي	1	f
1021	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-17 17:50:51.868	3	روبوت	1	f
1022	675	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-17 18:11:26.433	3	أجهزة علاج طبيعي	1	f
1023	711	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-17 18:31:10.095	3	تمارين تأهيلية	1	f
1025	714	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-17 19:36:43.897	3	أجهزة علاج طبيعي	6	f
1026	645	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-17 19:45:09.992	3	أجهزة علاج طبيعي	1	f
1027	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-18 05:31:36.464	3	تمارين تأهيلية	1	f
1028	503	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - الجلسة الرابعة مع الشفت الصباحي 	2026-03-18 05:52:11.67	3	أجهزة علاج طبيعي	1	f
1029	393	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة بتاريخ 18/2	2026-03-18 08:12:41.615	3	تمارين تأهيلية	1	f
1030	716	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	2026-03-18 08:19:35.704	3	أجهزة علاج طبيعي	6	f
1031	79	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة جديدة مفردة 	2026-03-18 08:23:50.007	3	أجهزة علاج طبيعي	1	f
1032	701	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حجز للجلسة القادمه بتاريخ 22/3/2026 الساعه 11 الصبح 	2026-03-18 08:25:25.324	3	أجهزة علاج طبيعي	1	f
1033	641	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشرت المريضة اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة مسبقه بتاريخ 8/3	2026-03-18 10:33:43.725	3	تمارين تأهيلية	1	f
1034	673	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - مريض راقد بالطابق الخامس 	2026-03-18 10:34:21.027	3	تمارين تأهيلية	1	f
1035	515	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-18 10:44:14.25	3	تمارين تأهيلية	1	f
1036	717	2450000	دفعه اولى	2026-03-18 12:24:13	1	\N	\N	f
1037	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-18 16:45:58.081	3	أجهزة علاج طبيعي	1	f
1038	567	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-18 17:12:00.275	3	أجهزة علاج طبيعي	1	f
1039	675	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-18 17:48:33.269	3	أجهزة علاج طبيعي	1	f
1040	719	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-18 18:24:20.488	3	أجهزة علاج طبيعي	1	f
1041	710	250000	جلسات علاج إضافية - تمارين تأهيلية (10 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بتاريخ اليوم بعد استشارة مسبقه 	2026-03-19 06:17:21.67	3	تمارين تأهيلية	10	f
1042	711	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - مريض راقد بالطابق الخامس 	2026-03-19 09:41:29.631	3	تمارين تأهيلية	1	f
1043	722	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-19 10:01:27.137	3	أجهزة علاج طبيعي	2	f
1044	676	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة مسبقه بتاريخ 15/3 	2026-03-19 11:19:05.569	3	أجهزة علاج طبيعي	6	f
1045	463	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-19 16:45:40.964	3	أجهزة علاج طبيعي	1	f
1046	719	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-19 17:34:00.793	3	أجهزة علاج طبيعي	1	f
1047	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-19 17:57:48.668	3	روبوت	1	f
1048	690	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-03-19 20:12:28.081	3	أجهزة علاج طبيعي	5	f
1049	687	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-19 20:22:36.114	3	أجهزة علاج طبيعي	1	f
1050	503	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-24 05:09:56.732	3	أجهزة علاج طبيعي	6	f
1051	577	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-24 07:39:54.486	3	أجهزة علاج طبيعي	1	f
1052	589	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-24 07:59:41.475	3	تمارين تأهيلية	1	f
1053	727	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-24 08:50:07.171	3	أجهزة علاج طبيعي	2	f
1054	467	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-03-24 08:51:00.926	3	أجهزة علاج طبيعي	3	f
1055	467	150000	جلسات علاج إضافية - روبوت (3 جلسة)	2026-03-24 08:51:00.968	3	روبوت	3	f
1056	722	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-03-24 09:09:14.69	3	أجهزة علاج طبيعي	3	f
1057	729	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-24 09:38:26.256	3	أجهزة علاج طبيعي	1	f
1058	729	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حجز للجلسة القادمه 	2026-03-24 10:47:01.382	3	أجهزة علاج طبيعي	1	f
1059	369	500000	تم تسديد المبلغ بالكامل	2026-03-24 11:29:40	1	\N	\N	f
1060	734	100000	دفعه اولى	2026-03-19 11:57:19	1	\N	\N	f
1061	734	75000	تم تسديد المبلغ بالكامل	2026-03-24 11:59:25	1	\N	\N	f
1062	545	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-24 12:05:52.606	3	أجهزة علاج طبيعي	1	f
1063	264	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-24 13:28:32.431	3	أجهزة علاج طبيعي	1	f
1064	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-24 13:28:55.077	3	أجهزة علاج طبيعي	1	f
1066	718	250000	جلسات علاج إضافية - تمارين تأهيلية (10 جلسة) - حسب الاتفاق مع دكتور ياسر له تخفيض 15 جلسة  ب250 الف 	2026-03-24 13:31:11.887	3	تمارين تأهيلية	10	f
1067	739	2000000	دفعه اولى	2026-01-20 13:49:13	1	\N	\N	f
1068	739	500000	تم تسديد المبلغ بالكامل	2026-03-24 13:49:27	1	\N	\N	f
1069	738	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-24 13:50:33.594	3	أبر صينية	1	f
1070	739	50000	خدمة أخرى - شراء لاصق اضافي	2026-03-24 14:00:02.264	1	\N	\N	f
1079	730	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - بناءً على رغبة المريض، وبعد ملاحظته تحسّن حالة زوجته، قرر المباشرة اليوم بأولى جلسات العلاج الطبيعي لديه، حيث تم احتساب جلسة مفردة له، مع حجز موعد للجلسة القادمة \n	2026-03-25 08:57:58.154	3	أجهزة علاج طبيعي	2	f
1065	718	0	\N	2026-03-24 14:02:43	3	تمارين تأهيلية	5	f
1071	740	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-24 15:10:08.564	3	أجهزة علاج طبيعي	1	f
1072	745	2000000	دفعه اولى	2026-03-24 15:18:32	1	\N	\N	f
1073	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-24 15:34:23.671	3	أجهزة علاج طبيعي	1	f
1074	746	150000	تعديل أو ضبط - تبديل مفصل قدم سنكل	2026-03-24 15:35:43.583	1	\N	\N	f
1075	747	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-24 16:33:58.563	3	أجهزة علاج طبيعي	1	f
1076	642	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - جلسة مفردة	2026-03-25 06:51:53.123	3	تمارين تأهيلية	1	f
1077	393	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - الجلسة الثانية للمريض	2026-03-25 07:49:36.429	3	تمارين تأهيلية	1	f
1078	748	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - سيباشر المريض اول جلسلات العلاج الخاص به ابتداء من الغد بتاريخ 26/3 حسب موعده الخاص الساعه 3 مساء وقد تم الدفع لغرض حجز للجلسة القادمة	2026-03-25 08:43:24.342	3	أجهزة علاج طبيعي	1	f
1080	729	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حجز جلسة مفردة 	2026-03-25 09:01:20.264	3	أجهزة علاج طبيعي	1	f
1081	742	1500000	دفعه اولى	2026-03-25 11:28:39	1	\N	\N	f
1082	750	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي الخاصه به مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-25 11:41:13.473	3	أجهزة علاج طبيعي	1	f
1119	771	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-28 08:06:21.676	3	أجهزة علاج طبيعي	1	f
1120	467	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشر المريض بكج جديد	2026-03-28 08:48:34.277	3	أجهزة علاج طبيعي	6	f
1087	751	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضة اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-25 12:49:21.878	3	أجهزة علاج طبيعي	1	f
1088	265	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-25 13:58:23.139	3	أبر صينية	1	f
1089	237	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-25 15:26:12.696	3	أبر صينية	1	f
1090	741	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-25 15:44:25.482	3	أجهزة علاج طبيعي	1	f
1092	749	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-03-25 15:58:22.869	3	أجهزة علاج طبيعي	2	f
1093	322	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-25 16:02:13.407	3	روبوت	1	f
1094	747	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-03-25 16:27:50.849	3	أجهزة علاج طبيعي	5	f
1095	396	300000	تم تسديد المبلغ بالكامل	2026-03-25 16:35:44	1	\N	\N	f
1096	424	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-25 18:00:30.779	3	أجهزة علاج طبيعي	1	f
1097	760	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-25 18:47:17.823	3	أجهزة علاج طبيعي	1	f
1098	762	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-25 19:01:30.892	3	أبر صينية	1	f
1099	536	150000	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة) - بكج جديد يبدء من الجلسة القادمه	2026-03-26 09:04:51.2	3	تمارين تأهيلية	6	f
1100	750	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-26 11:04:31.158	3	أجهزة علاج طبيعي	1	f
1101	733	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة سابقة	2026-03-26 11:27:06.908	3	أجهزة علاج طبيعي	6	f
1102	727	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حجز للجلسة القادمة	2026-03-26 12:01:52.339	3	أجهزة علاج طبيعي	1	f
1103	748	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-26 13:12:04.905	3	أجهزة علاج طبيعي	4	f
1106	763	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-26 13:56:35.498	1	أجهزة علاج طبيعي	1	f
1107	764	150000	تم تسديد المبلغ بالكامل - روبوت (3 جلسة)	2026-03-26 14:12:10	1	روبوت	3	f
1108	764	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) - تم اضافه جلسات علاج طبيعيه	2026-03-26 14:12:52.945	1	أجهزة علاج طبيعي	3	f
1109	738	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-26 14:14:22.547	3	أبر صينية	1	f
1110	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-26 14:24:47.376	3	أجهزة علاج طبيعي	1	f
1111	745	2000000	دفعه ثانيه	2026-03-26 15:02:13	1	\N	\N	f
1112	173	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-25 15:17:32	3	أجهزة علاج طبيعي	1	f
1113	766	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-26 17:16:27.781	3	أبر صينية	1	f
1114	761	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-26 17:19:40.431	3	أجهزة علاج طبيعي	1	f
1115	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-28 05:32:05.962	3	تمارين تأهيلية	1	f
1116	768	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-28 07:41:08.711	3	أجهزة علاج طبيعي	1	f
1117	173	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 07:41:44.294	3	أجهزة علاج طبيعي	1	f
1118	770	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-28 08:02:43.43	3	أجهزة علاج طبيعي	1	f
1121	467	300000	جلسات علاج إضافية - روبوت (6 جلسة) - باشر المريض بكج جديد	2026-03-28 08:48:34.329	3	روبوت	6	f
1122	772	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 10:37:25.377	3	أجهزة علاج طبيعي	1	f
1123	79	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 11:39:12.025	3	أجهزة علاج طبيعي	1	f
1124	692	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة مع الشفت الصباحي	2026-03-28 11:43:01.757	3	أجهزة علاج طبيعي	1	f
1125	751	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 12:27:34.312	3	أجهزة علاج طبيعي	1	f
1091	458	400000	جلسات علاج إضافية - روبوت (10 جلسة)	2026-03-25 14:54:22	3	روبوت	8	f
1131	776	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 13:29:10.977	3	أجهزة علاج طبيعي	1	f
1132	777	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-03-28 13:59:29.716	3	أجهزة علاج طبيعي	5	f
1133	780	75000	تم تسديد المبلغ بالكامل - أجهزة علاج طبيعي (3 جلسة)	2026-03-28 14:17:17	1	أجهزة علاج طبيعي	3	f
1134	778	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 14:27:13.931	3	أجهزة علاج طبيعي	1	f
1135	763	100000	دفع جلستين والباقي جلسة واحدة - روبوت (2 جلسة)	2026-03-28 14:28:38	1	روبوت	2	f
1136	779	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 14:29:12.411	3	أجهزة علاج طبيعي	1	f
1137	763	50000	تم دفع جلستين إضافيتين  - أجهزة علاج طبيعي (2 جلسة)	2026-03-28 14:29:52	1	أجهزة علاج طبيعي	2	f
1138	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 15:16:32.034	3	أجهزة علاج طبيعي	1	f
1139	781	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 15:52:01.04	3	أجهزة علاج طبيعي	1	f
1140	307	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-28 16:42:07.997	3	أجهزة علاج طبيعي	6	f
1141	738	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-28 16:45:18.231	3	أجهزة علاج طبيعي	1	f
1142	424	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-28 18:04:43.169	3	أجهزة علاج طبيعي	6	f
1143	782	200000		2026-03-28 18:37:56	3	\N	\N	f
1144	608	25000	أجهزة علاج طبيعي (1 جلسة)	2026-03-28 18:55:33	3	أجهزة علاج طبيعي	1	f
1145	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - جلسة مفردة 	2026-03-29 05:47:11.889	3	تمارين تأهيلية	1	f
1146	577	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-29 06:50:42.528	3	أجهزة علاج طبيعي	1	f
1147	774	6250000	تم تسديد المبلغ بالكامل 	2026-03-28 07:33:39	2	\N	\N	f
1148	786	700000	دفعة اولى	2026-03-29 07:43:56	2	\N	\N	f
1149	538	1000000	تم تسديد المبلغ بالكامل 	2026-03-28 07:54:26	2	\N	\N	f
1150	90	750000	تم تسديد المبلغ بالكامل 	2026-03-23 07:57:04	2	\N	\N	f
1151	154	1000000	تم تسديد المبلغ بالكامل 	2026-03-23 07:58:27	2	\N	\N	f
1152	783	400000	جلسات علاج إضافية - تمارين تأهيلية (18 جلسة)	2026-03-29 09:17:03	3	تمارين تأهيلية	16	f
1153	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان 	2026-03-29 10:04:58.004	3	أجهزة علاج طبيعي	1	f
1154	788	50000	جلسات علاج إضافية - روبوت (1 جلسة) - باشر المريض اول جلسات الروبوت الخاصه به مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة 	2026-03-29 10:11:24.429	3	روبوت	1	f
1155	785	100000	جلسات علاج إضافية - روبوت (2 جلسة) - باشر المريض اول جلسات الروبوت الخاصه به مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة وحج جلسة مقدمه اخرى 	2026-03-29 10:32:50.315	3	روبوت	2	f
1156	757	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - حضر المريض للاستشارة مع اخصائي العلاج الطبيعي عبد الله خان وباشر اول جلسات العلاج الطبيعي الخاصه به 	2026-03-29 10:34:36.294	3	أجهزة علاج طبيعي	1	f
1157	727	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - حجز جلستين مقدما 	2026-03-29 10:48:15.854	3	أجهزة علاج طبيعي	2	f
1159	772	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-29 12:12:36.62	3	أجهزة علاج طبيعي	1	f
1160	771	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-29 12:57:16.199	3	أجهزة علاج طبيعي	6	f
1161	770	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-29 12:57:30.276	3	أجهزة علاج طبيعي	4	f
1162	675	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-29 13:33:53.256	3	أجهزة علاج طبيعي	1	f
1158	767	25000	جلسات علاج إضافية - تمارين تأهيلية (3 جلسة) - باشر المريض اليوم باول جلسات العلاج الطبيعي بعد تحديد الموعد 	2026-03-29 14:06:24	3	تمارين تأهيلية	1	f
1163	792	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-29 14:36:31.746	3	أبر صينية	1	f
1164	767	50000	روبوت (1 جلسة)	2026-03-29 14:39:29	3	روبوت	1	f
1165	791	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-29 15:22:17.901	3	أجهزة علاج طبيعي	6	f
1166	725	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-29 15:26:48.535	3	أجهزة علاج طبيعي	6	f
1167	794	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-03-29 15:38:11.426	3	أجهزة علاج طبيعي	3	f
1168	793	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-29 15:44:52.071	3	أجهزة علاج طبيعي	1	f
1172	779	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-03-29 16:05:54.815	3	أجهزة علاج طبيعي	5	f
1173	660	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-03-29 16:10:49.426	3	أجهزة علاج طبيعي	3	f
1174	797	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-29 16:45:40.494	3	أبر صينية	1	f
1175	799	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-29 17:21:59.219	3	أبر صينية	1	f
1368	747	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-06 16:16:50.717	3	روبوت	1	f
1176	311	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-29 17:57:39.833	3	أجهزة علاج طبيعي	6	f
1177	496	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-29 17:59:49.738	3	أجهزة علاج طبيعي	1	f
1179	800	25000	تمارين تأهيلية (1 جلسة)	2026-03-29 19:20:41	3	تمارين تأهيلية	1	f
1180	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-03-30 05:21:08.942	3	أجهزة علاج طبيعي	1	f
1182	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-03-30 05:42:54.504	3	تمارين تأهيلية	1	f
1183	801	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-30 06:13:50.531	3	أجهزة علاج طبيعي	1	f
1184	802	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة \n	2026-03-30 06:37:24.001	3	أجهزة علاج طبيعي	1	f
1185	757	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-30 07:51:34.42	3	أجهزة علاج طبيعي	1	f
1186	800	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - تمت مباشرة المريضة بجلسات العلاج الطبيعي بعد أن كانت تقتصر سابقًا على أداء التمارين فقط في الطابق الرابع (طابق الرقود).\nونظرًا لحاجتها إلى استخدام الأجهزة العلاجية بالإضافة إلى التمارين، فقد حضرت هذا اليوم وبدأت بأول جلسة علاجية باستخدام الأجهزة، وهي حاليًا راقدة في المستشفى وتحت المتابعة.\n	2026-03-30 08:00:56.376	3	تمارين تأهيلية	1	f
1187	789	4000000	تم تسديد المبلغ بالكامل	2026-03-30 11:42:19	1	\N	\N	f
1188	772	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-30 11:58:09.967	3	أجهزة علاج طبيعي	1	f
1189	805	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-30 12:03:53.702	3	أجهزة علاج طبيعي	8	f
1191	806	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-30 12:50:00.853	3	أجهزة علاج طبيعي	1	f
1192	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-30 13:18:01.327	3	أجهزة علاج طبيعي	1	f
1193	814	25000	دفعه اولى - أجهزة علاج طبيعي (1 جلسة)	2026-03-30 14:15:05	1	أجهزة علاج طبيعي	1	f
1194	816	150000	خدمة أخرى	2026-03-30 14:38:31.141	3	\N	\N	f
1195	810	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-30 15:21:01.828	3	أجهزة علاج طبيعي	6	f
1196	820	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-30 17:33:32.269	3	أجهزة علاج طبيعي	4	f
1197	795	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-30 17:42:37.196	3	أجهزة علاج طبيعي	1	f
1198	567	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-30 17:45:18.756	3	أجهزة علاج طبيعي	1	f
1199	738	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-30 17:46:02.896	3	أجهزة علاج طبيعي	1	f
1200	747	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-03-30 17:50:33.496	3	روبوت	1	f
1201	813	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-30 17:58:47.404	3	أجهزة علاج طبيعي	6	f
1202	738	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-30 19:03:34.353	3	أبر صينية	1	f
1204	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة 	2026-03-31 05:26:58.507	3	أجهزة علاج طبيعي	1	f
1205	785	50000	جلسات علاج إضافية - روبوت (1 جلسة) - حجز للجلسة القادمة 	2026-03-31 05:33:39.419	3	روبوت	1	f
1206	153	50000	جلسات علاج إضافية - تمارين تأهيلية (2 جلسة) - جلسة لليوم وحجز جلسة للجلسة القادمة 	2026-03-31 05:54:11.08	3	تمارين تأهيلية	2	f
1203	822	25000	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-03-31 06:02:11	3	تمارين تأهيلية	1	f
1207	692	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) - الجلسة الاولى من البكج 	2026-03-31 06:28:22.083	3	أجهزة علاج طبيعي	4	f
1208	787	500000	تم تسديد المبلغ بالكامل 	2026-03-23 07:28:25	2	\N	\N	f
1209	804	4000000	دفعة اولى	2026-03-30 07:32:55	2	\N	\N	f
1210	149	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 07:39:16.07	3	أجهزة علاج طبيعي	1	f
1211	823	100000	جلسات علاج إضافية - تمارين تأهيلية (4 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله بعد الاستشارة مباشرة 	2026-03-31 08:06:04.598	3	تمارين تأهيلية	4	f
1212	825	5000000	دفعة اولى	2026-03-31 08:31:15	2	\N	\N	f
1213	274	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة 	2026-03-31 08:41:03.177	3	أجهزة علاج طبيعي	1	f
1214	788	200000	جلسات علاج إضافية - روبوت (4 جلسة)	2026-03-31 09:54:31.056	3	روبوت	4	f
1178	751	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة)	2026-03-29 08:46:42	3	أجهزة علاج طبيعي	4	f
1412	920	175000	خدمة أخرى - مسند لكلا الساقين 	2026-04-08 16:23:52.929	3	\N	\N	f
1215	335	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - بكج جديد ل 6 جلسات 	2026-03-31 11:54:08.277	3	أجهزة علاج طبيعي	6	f
1216	814	25000	أجهزة علاج طبيعي (1 جلسة)	2026-03-31 12:06:39	1	أجهزة علاج طبيعي	1	f
1217	772	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 12:32:11.054	3	أجهزة علاج طبيعي	1	f
1218	780	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 13:16:35.71	1	أجهزة علاج طبيعي	1	f
1219	675	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-03-31 13:20:49.36	3	أجهزة علاج طبيعي	6	f
1220	778	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 13:23:21.224	3	أجهزة علاج طبيعي	1	f
1221	819	0	جلسات علاج إضافية - تمارين تأهيلية (7 جلسة)	2026-03-31 13:53:14	3	تمارين تأهيلية	7	f
1222	265	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-31 14:20:09.512	3	أبر صينية	1	f
1223	829	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-03-31 14:20:34.117	3	أبر صينية	1	f
1224	812	0	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-03-31 14:31:27	3	أجهزة علاج طبيعي	4	f
1225	31	0	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-03-31 14:51:05	3	أجهزة علاج طبيعي	8	f
1226	740	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 14:58:04.018	3	أجهزة علاج طبيعي	1	f
1227	818	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-03-31 15:22:50.022	3	أجهزة علاج طبيعي	3	f
1228	817	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 15:24:03.387	3	أجهزة علاج طبيعي	1	f
1229	830	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 15:54:09.205	3	أجهزة علاج طبيعي	1	f
1230	644	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 16:20:59.885	3	أجهزة علاج طبيعي	1	f
1231	793	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-03-31 16:22:06.834	3	أجهزة علاج طبيعي	2	f
1232	797	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 16:35:05.528	3	أجهزة علاج طبيعي	1	f
1233	237	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 16:37:56.789	3	أجهزة علاج طبيعي	1	f
1234	792	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 16:38:58.424	3	أجهزة علاج طبيعي	1	f
1235	799	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-03-31 17:19:26.611	3	أجهزة علاج طبيعي	1	f
1236	722	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-01 05:44:07.244	3	أجهزة علاج طبيعي	2	f
1237	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 06:25:48.832	3	أجهزة علاج طبيعي	1	f
1238	806	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 10:58:34.025	3	أجهزة علاج طبيعي	1	f
1239	772	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 11:41:55.001	3	أجهزة علاج طبيعي	1	f
1240	835	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-01 12:11:42	1	أجهزة علاج طبيعي	1	f
1241	814	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-01 12:12:43	1	أجهزة علاج طبيعي	1	f
1243	763	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 12:46:00.449	1	أجهزة علاج طبيعي	1	f
1244	659	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 13:17:13.214	3	أجهزة علاج طبيعي	1	f
1246	188	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-04-01 14:09:57.056	3	أجهزة علاج طبيعي	8	f
1247	838	150000	تم تسديد المبلغ بالكامل	2026-04-01 14:25:41	1	\N	\N	f
1248	829	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-01 15:00:37.211	3	أبر صينية	1	f
1250	745	4000000		2026-04-01 15:13:01	1	\N	\N	f
1251	839	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 15:21:52.548	3	أجهزة علاج طبيعي	1	f
1252	837	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 15:35:06.901	3	أجهزة علاج طبيعي	1	f
1254	831	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 16:33:21.6	3	أجهزة علاج طبيعي	1	f
1245	780	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-04-01 15:39:51	1	أجهزة علاج طبيعي	8	f
1253	841	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-01 16:14:52.621	3	أجهزة علاج طبيعي	6	f
1255	5	600000		2026-04-01 16:56:11	4	\N	\N	f
1256	829	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 18:14:49.835	3	أجهزة علاج طبيعي	1	f
1257	670	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 18:15:15.844	3	أجهزة علاج طبيعي	1	f
1258	844	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 18:34:47.2	3	أجهزة علاج طبيعي	1	f
1259	843	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 18:57:06.429	3	أجهزة علاج طبيعي	1	f
1260	597	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-01 19:00:30.882	3	أبر صينية	1	f
1261	792	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-01 19:01:06.694	3	أجهزة علاج طبيعي	1	f
1262	822	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-02 05:14:18.518	3	تمارين تأهيلية	1	f
1263	785	50000	جلسات علاج إضافية - روبوت (1 جلسة) - حجز للجلسة القادمه 	2026-04-02 06:03:18.427	3	روبوت	1	f
1264	802	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 06:45:45.074	3	أجهزة علاج طبيعي	1	f
1265	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 06:59:07.239	3	أجهزة علاج طبيعي	1	f
1267	845	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي الخاص به مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-04-02 07:27:34.146	3	أجهزة علاج طبيعي	1	f
1268	846	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-04-02 09:37:44.416	3	أجهزة علاج طبيعي	6	f
1269	835	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-02 11:17:57	1	أجهزة علاج طبيعي	1	f
1270	847	1000000	تم تسديد المبلغ بالكامل	2026-04-02 11:31:56	1	\N	\N	f
1271	772	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 11:48:26.542	3	أجهزة علاج طبيعي	1	f
1272	814	50000	أجهزة علاج طبيعي (2 جلسة)	2026-04-02 11:58:45	1	أجهزة علاج طبيعي	2	f
1273	763	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 12:06:50.587	1	أجهزة علاج طبيعي	1	f
1274	855	2000000	دفعه اولى	2026-01-24 13:42:57	1	\N	\N	f
1275	855	3000000	تم تسديد المبلغ بالكامل	2026-04-02 13:45:47	1	\N	\N	f
1276	19	1250000	خدمة أخرى - شراء سليكون بلاج فورد مثقب مع سليب اتوبوك 	2026-04-02 14:18:45.064	1	\N	\N	f
1277	829	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 15:50:29.912	3	أجهزة علاج طبيعي	1	f
1278	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 15:50:45.89	3	أجهزة علاج طبيعي	1	f
1279	322	300000	جلسات علاج إضافية - أجهزة علاج طبيعي (12 جلسة)	2026-04-02 17:02:54.196	3	أجهزة علاج طبيعي	12	f
1280	794	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 17:06:40.003	3	أجهزة علاج طبيعي	1	f
1281	792	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 17:09:19.956	3	أجهزة علاج طبيعي	1	f
1282	799	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 17:14:09.131	3	أجهزة علاج طبيعي	1	f
1283	831	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 17:32:06.639	3	أجهزة علاج طبيعي	1	f
1284	858	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-02 18:42:12.343	3	أجهزة علاج طبيعي	1	f
1285	859	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-02 19:06:45.291	3	تمارين تأهيلية	1	f
1286	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-04 05:31:38.096	3	تمارين تأهيلية	1	f
1287	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 05:37:57.298	3	أجهزة علاج طبيعي	1	f
1288	467	300000	جلسات علاج إضافية - روبوت (6 جلسة) - باشر المريض ببكج جديد	2026-04-04 08:40:37.732	3	روبوت	6	f
1289	467	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشر المريض ببكج جديد	2026-04-04 08:41:09.458	3	أجهزة علاج طبيعي	6	f
1290	596	750000	دفعه ثانيه	2026-04-04 11:29:42	1	\N	\N	f
1291	614	250000	تم تسديد المبلغ بالكامل	2026-04-04 11:31:32	1	\N	\N	f
1292	643	250000	دفعه ثانيه	2026-04-04 11:33:28	1	\N	\N	f
1293	772	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 12:16:41.201	3	أجهزة علاج طبيعي	1	f
1306	792	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 18:05:43.491	3	أجهزة علاج طبيعي	1	f
1302	818	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-04 16:02:10.626	3	أجهزة علاج طبيعي	3	f
1249	817	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-01 16:13:31	3	أجهزة علاج طبيعي	2	f
1295	763	250000	جلسات علاج إضافية - روبوت (5 جلسة)	2026-04-04 12:33:16.369	1	روبوت	5	f
1296	862	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-04-04 12:58:42.599	3	أجهزة علاج طبيعي	1	f
1300	874	100000	أجهزة علاج طبيعي (4 جلسة)	2026-04-04 13:17:46	1	أجهزة علاج طبيعي	4	f
1303	817	50000	روبوت (1 جلسة)	2026-04-04 16:20:02	3	روبوت	1	f
1297	856	0	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) مجاني 	2026-04-04 13:25:50	1	أجهزة علاج طبيعي	10	f
1298	867	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 14:01:45.31	3	أجهزة علاج طبيعي	1	f
1299	778	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 14:12:22.192	3	أجهزة علاج طبيعي	1	f
1301	870	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 15:54:31.358	3	أجهزة علاج طبيعي	1	f
1304	875	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 17:25:42.555	3	أجهزة علاج طبيعي	1	f
1305	857	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-04 17:56:55.422	3	أجهزة علاج طبيعي	6	f
1307	831	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 18:06:41.463	3	أجهزة علاج طبيعي	1	f
1308	670	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-04 18:12:57.342	3	أجهزة علاج طبيعي	1	f
1309	424	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-04 18:37:56.728	3	روبوت	1	f
1310	822	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-05 05:31:31.93	3	تمارين تأهيلية	1	f
1664	1050	50000	روبوت (1 جلسة)	2026-04-19 13:01:53	1	روبوت	1	f
1311	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 05:49:02.478	3	أجهزة علاج طبيعي	1	f
1312	785	50000	جلسات علاج إضافية - روبوت (1 جلسة) - حجز للجلسة القادمة 	2026-04-05 05:55:42.831	3	روبوت	1	f
1313	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-05 05:58:46.471	3	تمارين تأهيلية	1	f
1314	393	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-05 07:48:25.452	3	تمارين تأهيلية	1	f
1315	589	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-05 08:15:40.899	3	تمارين تأهيلية	1	f
1316	879	10875000	تم تسديد المبلغ بالكامل 	2026-04-05 08:37:18	2	\N	\N	f
1317	786	800000	تم تسديد المبلغ بالكامل 	2026-04-02 08:38:00	2	\N	\N	f
1318	833	150000	دفعة اولى	2026-04-01 08:39:08	2	\N	\N	f
1319	804	15150000	تم تسديد المبلغ بالكامل 	2026-03-31 08:40:01	2	\N	\N	f
1320	880	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-04-05 08:42:03.206	3	أجهزة علاج طبيعي	8	f
1321	825	14150000	تم تسديد المبلغ بالكامل 	2026-04-01 08:43:09	2	\N	\N	f
1323	512	275000	تم تسديد المبلغ بالكامل 	2026-03-31 08:47:41	2	\N	\N	f
1356	881	2000000	دفعه ثانيه	2026-04-06 11:45:07	1	\N	\N	f
1357	817	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-06 13:39:57.875	3	روبوت	1	f
1326	850	50000	صيانة الطرف الصناعي - تبديل فالف	2026-04-02 08:53:30	2	\N	\N	f
1325	849	60000	صيانة الطرف الصناعي - تبديل فالف	2026-04-02 08:54:19	2	\N	\N	f
1322	233	250000	تعديل أو ضبط - شراء تيوب مع ادابتر مع اجراء صيانة	2026-03-31 08:56:11	2	\N	\N	f
1324	809	500000	خدمة أخرى - شراء سيليكون اوزسور حلقي 	2026-04-01 08:58:09	2	\N	\N	f
1327	265	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 13:14:56.982	3	أجهزة علاج طبيعي	1	f
1328	881	1000000	دفعه اولى	2026-04-05 13:34:18	1	\N	\N	f
1329	868	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 13:47:21.974	3	أجهزة علاج طبيعي	1	f
1330	868	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-05 13:47:35.264	3	أبر صينية	1	f
1331	514	200000		2026-04-05 14:34:59	4	\N	\N	f
1332	689	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-05 15:13:55.155	3	أجهزة علاج طبيعي	3	f
1334	884	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-05 15:26:26.907	3	أجهزة علاج طبيعي	3	f
1335	883	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 16:37:26.207	3	أجهزة علاج طبيعي	1	f
1336	888	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 17:00:34.952	3	أجهزة علاج طبيعي	1	f
1337	888	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-05 17:00:54.725	3	أبر صينية	1	f
1338	797	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 17:43:50.942	3	أجهزة علاج طبيعي	1	f
1339	794	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 17:46:08.748	3	أجهزة علاج طبيعي	1	f
1340	817	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-05 17:47:32.513	3	روبوت	1	f
1341	799	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 17:48:29.304	3	أجهزة علاج طبيعي	1	f
1342	567	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 17:48:59.273	3	أجهزة علاج طبيعي	1	f
1343	793	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 17:49:21.272	3	أجهزة علاج طبيعي	1	f
1344	792	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-05 17:49:49.489	3	أجهزة علاج طبيعي	1	f
1345	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-06 05:26:44.704	3	تمارين تأهيلية	1	f
1346	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-06 05:39:35.601	3	أجهزة علاج طبيعي	1	f
1347	802	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-06 05:41:59.439	3	أجهزة علاج طبيعي	1	f
1348	892	1000000	دفعة اولى	2026-04-06 08:26:08	2	\N	\N	f
1349	891	1000000	دفعة اولى	2026-04-06 08:28:21	2	\N	\N	f
1350	495	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-06 08:35:53.938	3	أجهزة علاج طبيعي	6	f
1351	893	250000	دفعة اولى	2026-04-06 09:37:32	2	\N	\N	f
1352	874	100000	أجهزة علاج طبيعي (4 جلسة)	2026-04-06 10:55:32	1	أجهزة علاج طبيعي	4	f
1353	763	200000	جلسات علاج إضافية - روبوت (4 جلسة)	2026-04-06 11:35:22.567	1	روبوت	4	f
1354	806	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-06 11:35:33.624	3	أجهزة علاج طبيعي	1	f
1355	772	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-06 11:40:51.245	3	أجهزة علاج طبيعي	1	f
1358	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-06 13:41:00.307	3	أجهزة علاج طبيعي	1	f
1359	765	1000000	دفع اول دفعة في كربلاء	2026-04-05 13:52:52	1	\N	\N	f
1360	765	1000000	ثاني دفعة في بغداد	2026-04-06 13:53:19	1	\N	\N	f
1361	400	125000	دفعه ثانيه	2026-04-06 14:04:14	1	\N	\N	f
1362	895	40000	خدمة أخرى - دبان عدد 2 مع تعليه 4 سم 	2026-04-06 14:21:21.07	1	\N	\N	f
1363	894	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-06 14:29:53.684	3	أجهزة علاج طبيعي	1	f
1364	894	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-06 14:30:01.292	3	أبر صينية	1	f
1365	458	100000	تمارين تأهيلية (4 جلسة)	2026-03-25 14:55:24	3	تمارين تأهيلية	4	f
1366	897	1000000	دفعه اولى	2026-04-06 15:05:15	1	\N	\N	f
1367	888	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-06 15:15:10.627	3	أجهزة علاج طبيعي	6	f
1369	670	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-06 16:56:51.489	3	أجهزة علاج طبيعي	1	f
1370	886	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-06 16:57:36.331	3	أجهزة علاج طبيعي	3	f
1371	831	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-06 17:22:39.275	3	أجهزة علاج طبيعي	1	f
1372	887	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-06 17:42:25.745	3	أجهزة علاج طبيعي	6	f
1373	822	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-07 05:36:08.481	3	تمارين تأهيلية	1	f
1374	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-07 05:56:45.67	3	تمارين تأهيلية	1	f
1375	785	50000	جلسات علاج إضافية - روبوت (1 جلسة) - حجز للجلسة القادمة 	2026-04-07 06:14:28.655	3	روبوت	1	f
1376	899	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	2026-04-07 06:23:28.133	3	أجهزة علاج طبيعي	1	f
1377	700	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-07 07:01:27.747	3	أجهزة علاج طبيعي	2	f
1378	865	50000	جلسات علاج إضافية - تمارين تأهيلية (2 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة مسبقه	2026-04-07 07:40:31.884	3	تمارين تأهيلية	2	f
1379	900	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	2026-04-07 08:09:10.299	3	أجهزة علاج طبيعي	3	f
1380	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-07 08:28:21.609	3	أجهزة علاج طبيعي	1	f
1381	875	125000	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) - حضر المريض للاستشاره مع اخصائي العلاج عبد الله خان وحاسب للجلسات القادمه وسيباشر حسب موعده 	2026-04-07 09:30:19.98	3	أجهزة علاج طبيعي	5	f
1382	901	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	2026-04-07 11:11:47.614	3	أجهزة علاج طبيعي	2	f
1383	783	450000	جلسات علاج إضافية - تمارين تأهيلية (18 جلسة) - بكج جديد يبدء من تاريخ اليوم 	2026-04-07 11:28:49.956	3	تمارين تأهيلية	18	f
1384	545	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-07 12:08:27.972	3	أجهزة علاج طبيعي	1	f
1385	265	175000	جلسات علاج إضافية - أجهزة علاج طبيعي (7 جلسة)	2026-04-07 13:17:39.304	3	أجهزة علاج طبيعي	7	f
1386	778	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-07 13:18:31.382	3	أجهزة علاج طبيعي	1	f
1387	909	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-07 14:05:52.157	3	أجهزة علاج طبيعي	2	f
1388	660	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-07 15:08:53.157	3	أجهزة علاج طبيعي	2	f
1389	594	500000	دفعه ثانيه	2026-04-07 15:44:32	1	\N	\N	f
1390	911	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-07 16:28:09.599	3	أبر صينية	1	f
1391	792	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-07 16:59:23.649	3	أجهزة علاج طبيعي	1	f
1392	883	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-07 17:14:29.242	3	أجهزة علاج طبيعي	1	f
1393	912	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-07 17:25:45.721	3	أجهزة علاج طبيعي	1	f
1394	424	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-07 18:24:49.877	3	روبوت	1	f
1395	793	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-07 18:56:09.733	3	أجهزة علاج طبيعي	1	f
1396	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 05:29:04.285	3	أجهزة علاج طبيعي	1	f
1397	767	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-08 06:55:49.649	3	روبوت	1	f
1398	149	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 07:09:31.814	3	أجهزة علاج طبيعي	1	f
1399	806	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 11:08:34.724	3	أجهزة علاج طبيعي	1	f
1400	876	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 11:47:19.67	3	أجهزة علاج طبيعي	1	f
1401	908	250000	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة)	2026-04-08 12:23:51.579	1	أجهزة علاج طبيعي	10	f
1402	393	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 12:24:59.025	3	أجهزة علاج طبيعي	1	f
1403	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 13:25:41.159	3	أجهزة علاج طبيعي	1	f
1404	917	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 14:01:21.906	3	أجهزة علاج طبيعي	1	f
1405	917	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-08 14:01:28.052	3	أبر صينية	1	f
1406	867	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 14:46:40.985	3	أجهزة علاج طبيعي	1	f
1407	224	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-08 14:53:59.992	3	روبوت	1	f
1408	681	107000	دفعه ثانيه	2026-04-08 15:15:06	1	\N	\N	f
1409	912	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 15:55:43.18	3	أجهزة علاج طبيعي	1	f
1410	818	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-08 16:00:40.023	3	أجهزة علاج طبيعي	4	f
1411	747	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-08 16:18:05.464	3	روبوت	1	f
1413	843	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 17:48:00.057	3	أجهزة علاج طبيعي	1	f
1414	135	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-08 18:13:11.851	3	أجهزة علاج طبيعي	1	f
1415	921	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	2026-04-09 05:37:03.521	3	تمارين تأهيلية	1	f
1416	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-09 06:04:28.139	3	تمارين تأهيلية	1	f
1417	785	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-09 06:04:54.667	3	روبوت	1	f
1418	901	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-09 06:06:39.192	3	أجهزة علاج طبيعي	1	f
1419	865	150000	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة)	2026-04-09 07:36:47.816	3	تمارين تأهيلية	6	f
1420	924	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	2026-04-09 08:24:13.205	3	تمارين تأهيلية	1	f
1421	846	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-09 08:51:01.568	3	أجهزة علاج طبيعي	6	f
1422	636	500000	دفعه ثانيه	2026-04-08 11:13:45	1	\N	\N	f
1423	545	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-04-09 11:57:13.181	3	أجهزة علاج طبيعي	1	f
1424	613	100000	دفعه ثانيه	2026-04-09 12:01:04	1	\N	\N	f
1425	814	50000	أجهزة علاج طبيعي (2 جلسة)	2026-04-09 12:10:38	1	أجهزة علاج طبيعي	2	f
1426	264	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-09 13:17:27.948	3	أجهزة علاج طبيعي	1	f
1427	928	100000	دفعه ثانيه	2026-04-09 14:05:30	1	\N	\N	f
1428	264	500000	جلسات علاج إضافية - أجهزة علاج طبيعي (20 جلسة)	2026-04-09 14:34:44.288	3	أجهزة علاج طبيعي	20	f
1429	911	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-09 15:19:15.481	3	أجهزة علاج طبيعي	1	f
1430	912	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-09 15:40:39.514	3	أجهزة علاج طبيعي	1	f
1431	747	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-09 16:36:36.083	3	روبوت	1	f
1432	792	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-09 16:55:10.92	3	أجهزة علاج طبيعي	1	f
1433	883	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-09 17:52:42.918	3	أجهزة علاج طبيعي	1	f
1434	793	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-09 18:10:42.314	3	أجهزة علاج طبيعي	1	f
1435	424	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-09 18:12:13.37	3	أجهزة علاج طبيعي	1	f
1436	64	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-11 05:21:19.271	3	تمارين تأهيلية	1	f
1437	876	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 05:42:26.693	3	أجهزة علاج طبيعي	1	f
1438	767	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-11 05:59:48.822	3	روبوت	1	f
1439	933	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 07:54:23.544	3	أجهزة علاج طبيعي	1	f
1440	467	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-11 08:54:39.797	3	تمارين تأهيلية	1	f
1441	467	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-11 08:55:17.683	3	روبوت	1	f
1442	939	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-11 11:11:35.228	3	تمارين تأهيلية	1	f
1443	940	3000000	تم تسديد المبلغ بالكامل	2026-04-11 11:48:59	1	\N	\N	f
1444	944	25000	جلسة مفردة - أجهزة علاج طبيعي (10 جلسة)	2026-04-11 12:29:17	3	أجهزة علاج طبيعي	1	f
1445	274	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 12:31:59.431	3	أجهزة علاج طبيعي	1	f
1446	947	75000	تم تسديد المبلغ بالكامل	2026-04-11 13:02:04	1	\N	\N	f
1447	946	150000	تم تسديد المبلغ بالكامل	2026-04-11 13:05:53	1	\N	\N	f
1448	949	50000	روبوت (1 جلسة)	2026-04-11 13:57:29	1	روبوت	1	f
1449	949	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-11 13:58:11.046	1	تمارين تأهيلية	1	f
1450	943	150000	تم تسديد المبلغ بالكامل	2026-04-11 13:59:48	1	\N	\N	f
1451	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 14:12:18.926	3	أجهزة علاج طبيعي	1	f
1452	817	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-11 14:12:42.477	3	روبوت	1	f
1453	909	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-11 14:31:35.329	3	أجهزة علاج طبيعي	2	f
1454	810	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-11 14:32:11.393	3	أجهزة علاج طبيعي	4	f
1455	224	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-11 14:33:27.625	3	روبوت	1	f
1456	952	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 15:32:04.039	3	أجهزة علاج طبيعي	1	f
1457	47	1000000	دفعه ثانيه	2026-04-11 15:40:55	1	\N	\N	f
1458	953	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-11 15:41:17.176	3	أبر صينية	1	f
1459	917	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 16:03:20.776	3	أجهزة علاج طبيعي	1	f
1460	670	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 16:39:00.973	3	أجهزة علاج طبيعي	1	f
1461	954	150000	تم تسديد المبلغ بالكامل	2026-04-11 16:57:13	1	\N	\N	f
1462	567	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 17:18:17.372	3	أجهزة علاج طبيعي	1	f
1463	931	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 17:47:21.461	3	أجهزة علاج طبيعي	1	f
1464	883	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 18:02:58.015	3	أجهزة علاج طبيعي	1	f
1465	843	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-11 18:40:41.588	3	أجهزة علاج طبيعي	1	f
1466	822	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-12 05:17:32.719	3	تمارين تأهيلية	1	f
1467	785	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-12 05:47:27.037	3	روبوت	1	f
1468	933	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 05:53:08.862	3	أجهزة علاج طبيعي	1	f
1469	900	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 06:18:47.697	3	أجهزة علاج طبيعي	1	f
1470	900	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-12 06:23:54.414	3	أجهزة علاج طبيعي	3	f
1471	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-12 06:38:17.634	3	تمارين تأهيلية	1	f
1472	100	350000	خدمة أخرى - شراء قدم سنكل 	2026-04-11 09:09:00	2	\N	\N	f
1473	936	550000	تم تسديد المبلغ بالكامل 	2026-04-12 09:09:58	2	\N	\N	f
1474	695	550000	خدمة أخرى - قالب تحت الركبة ضمن الضمان 	2026-04-06 09:13:25	2	\N	\N	f
1475	788	150000	جلسات علاج إضافية - روبوت (3 جلسة)	2026-04-12 09:26:41.226	3	روبوت	3	f
1476	957	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة 	2026-04-12 10:03:01.397	3	أجهزة علاج طبيعي	1	f
1478	274	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 11:27:27.994	3	أجهزة علاج طبيعي	1	f
1479	959	1500000	دفعه اولى	2026-04-12 11:42:26	1	\N	\N	f
1480	949	50000	روبوت (1 جلسة)	2026-04-12 12:01:31	1	روبوت	1	f
1481	545	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-12 12:01:59.782	3	أجهزة علاج طبيعي	2	f
1482	949	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-12 12:02:41.943	1	تمارين تأهيلية	1	f
1483	814	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-12 12:08:00	1	أجهزة علاج طبيعي	1	f
1484	928	2900000	دفعه ثانيه	2026-04-12 12:41:31	1	\N	\N	f
1485	951	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 13:52:53.714	3	أجهزة علاج طبيعي	1	f
1486	948	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 14:25:28.653	3	أجهزة علاج طبيعي	1	f
1487	780	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 14:29:36.832	1	أجهزة علاج طبيعي	1	f
1488	812	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-12 14:43:21.865	3	أجهزة علاج طبيعي	4	f
1489	868	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 14:44:01.54	3	أجهزة علاج طبيعي	1	f
1490	725	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 14:45:14.22	3	أجهزة علاج طبيعي	1	f
1491	765	1750000	تم تسديد المبلغ بالكامل	2026-04-12 14:45:17	1	\N	\N	f
1492	912	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 14:45:55.743	3	أجهزة علاج طبيعي	1	f
1493	911	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 15:18:13.37	3	أجهزة علاج طبيعي	1	f
1494	964	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 15:58:03.592	3	أجهزة علاج طبيعي	1	f
1495	747	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-12 16:00:15.407	3	روبوت	1	f
1496	965	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 16:45:05.185	3	أجهزة علاج طبيعي	1	f
1497	918	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 16:59:49.234	3	أجهزة علاج طبيعي	1	f
1498	966	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 17:03:56.607	3	أجهزة علاج طبيعي	1	f
1499	917	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 17:43:32.265	3	أجهزة علاج طبيعي	1	f
1500	931	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-12 17:51:15.256	3	أجهزة علاج طبيعي	1	f
1501	311	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-12 18:13:25.208	3	أجهزة علاج طبيعي	6	f
1502	767	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-13 05:47:59.003	3	روبوت	1	f
1503	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 06:28:21.069	3	أجهزة علاج طبيعي	1	f
1504	970	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-13 08:19:16.906	3	أجهزة علاج طبيعي	4	f
1505	640	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-13 08:33:50.858	3	أجهزة علاج طبيعي	4	f
1506	467	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-13 09:16:17.333	3	أجهزة علاج طبيعي	4	f
1507	467	200000	جلسات علاج إضافية - روبوت (4 جلسة)	2026-04-13 09:16:26.849	3	روبوت	4	f
1508	973	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-13 09:41:04.143	3	أجهزة علاج طبيعي	4	f
1509	974	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 10:52:26.783	3	أجهزة علاج طبيعي	1	f
1510	806	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 11:30:21.746	3	أجهزة علاج طبيعي	1	f
1512	949	50000	روبوت (1 جلسة)	2026-04-13 11:59:30	1	روبوت	1	f
1513	949	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 12:00:18.711	1	أجهزة علاج طبيعي	1	f
1514	814	50000	أجهزة علاج طبيعي (2 جلسة)	2026-04-13 12:26:43	1	أجهزة علاج طبيعي	2	f
1515	780	250000	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة)	2026-04-13 13:58:44.357	1	أجهزة علاج طبيعي	10	f
1517	976	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 14:01:09.634	3	أجهزة علاج طبيعي	1	f
1518	977	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 14:05:13.033	3	أجهزة علاج طبيعي	1	f
1519	977	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-13 14:05:20.922	3	أبر صينية	1	f
1520	950	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 14:21:30.849	3	أجهزة علاج طبيعي	1	f
1521	978	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-13 14:43:01.059	3	أبر صينية	1	f
1522	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 14:44:32.392	3	أجهزة علاج طبيعي	1	f
1523	982	1000000	تم تسديد المبلغ بالكامل	2026-04-13 14:48:54	1	\N	\N	f
1524	817	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 14:49:41.701	3	أجهزة علاج طبيعي	1	f
1525	980	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 15:31:32.849	3	أجهزة علاج طبيعي	1	f
1526	981	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 15:50:32.832	3	أجهزة علاج طبيعي	1	f
1527	984	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-13 16:10:41.094	3	أبر صينية	1	f
1528	986	200000	دفعه ثانيه	2026-04-13 16:33:17	1	\N	\N	f
1529	951	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 16:46:03.522	3	أجهزة علاج طبيعي	1	f
1530	952	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 16:46:33.377	3	أجهزة علاج طبيعي	1	f
1531	868	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 16:47:35.244	3	أجهزة علاج طبيعي	1	f
1532	645	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 17:04:39.483	3	أجهزة علاج طبيعي	1	f
1533	966	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-13 17:25:11.146	3	أجهزة علاج طبيعي	6	f
1534	670	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 17:26:33.223	3	أجهزة علاج طبيعي	1	f
1535	886	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-13 17:54:37.781	3	أجهزة علاج طبيعي	3	f
1536	917	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 18:19:11.745	3	أجهزة علاج طبيعي	1	f
1537	883	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-13 18:21:53.285	3	أجهزة علاج طبيعي	1	f
1538	933	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 05:19:08.407	3	أجهزة علاج طبيعي	1	f
1539	822	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-14 05:21:54.123	3	تمارين تأهيلية	1	f
1540	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-14 05:58:46.913	3	تمارين تأهيلية	1	f
1541	904	1400000	دفعة اولى	2026-04-13 07:44:27	2	\N	\N	f
1542	987	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 09:22:16.271	3	أجهزة علاج طبيعي	1	f
1543	988	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 09:24:25.413	3	أجهزة علاج طبيعي	1	f
1544	957	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 10:17:38.275	3	أجهزة علاج طبيعي	1	f
1545	949	50000	روبوت (1 جلسة)	2026-04-14 11:44:56	1	روبوت	1	f
1546	949	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 11:45:38.544	1	أجهزة علاج طبيعي	1	f
1547	545	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 12:01:05.262	3	أجهزة علاج طبيعي	1	f
1548	657	100000	دفعه ثانيه	2026-04-14 12:51:01	1	\N	\N	f
1549	989	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-14 12:52:16.981	3	تمارين تأهيلية	1	f
1550	948	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-14 13:47:20.333	3	أجهزة علاج طبيعي	2	f
1551	868	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 14:04:32.709	3	أجهزة علاج طبيعي	1	f
1552	993	150000	طرف صناعي جديد	2026-04-14 14:22:22.581	3	\N	\N	f
1553	991	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 14:33:54.136	3	أجهزة علاج طبيعي	1	f
1554	725	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-14 14:49:40.775	3	أجهزة علاج طبيعي	2	f
1555	992	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-14 14:54:05.751	3	روبوت	1	f
1556	995	1000000	دفعه اولى	2026-04-14 15:15:46	1	\N	\N	f
1557	874	0	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - 2 جلسه مجاني 	2026-04-14 15:27:02	1	أجهزة علاج طبيعي	2	f
1558	413	250000	صيانة الطرف الصناعي - قالب تحت الركبة 	2026-04-14 15:47:56	1	\N	\N	f
1559	307	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-14 15:57:44.944	3	أجهزة علاج طبيعي	6	f
1560	917	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 16:01:56.453	3	أجهزة علاج طبيعي	1	f
1561	997	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-14 16:06:01	1	أجهزة علاج طبيعي	1	f
1562	911	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 16:55:49.541	3	أجهزة علاج طبيعي	1	f
1563	965	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 17:09:48.836	3	أجهزة علاج طبيعي	1	f
1564	996	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-14 17:23:33.623	3	أجهزة علاج طبيعي	4	f
1565	998	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-14 17:35:05.857	3	أجهزة علاج طبيعي	2	f
1566	999	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-14 18:18:29.284	3	أجهزة علاج طبيعي	3	f
1567	931	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-14 18:20:16.26	3	أجهزة علاج طبيعي	1	f
1568	767	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-15 05:21:20.851	3	روبوت	1	f
1569	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 06:00:20.489	3	أجهزة علاج طبيعي	1	f
1570	987	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-15 06:20:53.022	3	أجهزة علاج طبيعي	6	f
1571	1002	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 09:43:42.047	3	أجهزة علاج طبيعي	1	f
1572	1003	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 11:00:08.116	3	أجهزة علاج طبيعي	1	f
1573	806	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 11:13:32.06	3	أجهزة علاج طبيعي	1	f
1575	949	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 11:53:02.208	1	أجهزة علاج طبيعي	1	f
1576	1004	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - جلسة مفردة	2026-04-15 12:00:46.282	3	أجهزة علاج طبيعي	1	f
1577	1007	5000000	تم تسديد المبلغ بالكامل	2026-04-15 13:01:17	1	\N	\N	f
1578	1008	150000	دفعه اولى - أجهزة علاج طبيعي (6 جلسة)	2026-04-15 13:45:20	1	أجهزة علاج طبيعي	6	f
1579	1006	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) - اخذ المريض استشارة لدى دكتور مصطفى بعد استشارة الشفت الصباحي وقرر المباشرة يوم غد بعد ان دفع ثمن 4 جلسات مقدمة	2026-04-15 13:54:19.937	3	أجهزة علاج طبيعي	4	f
1580	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 14:09:26.658	3	أجهزة علاج طبيعي	1	f
1581	909	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 14:11:21.257	3	أجهزة علاج طبيعي	1	f
1582	976	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 14:11:43.295	3	أجهزة علاج طبيعي	1	f
1583	817	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 14:13:52.472	3	أجهزة علاج طبيعي	1	f
1584	952	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 14:16:24.252	3	أجهزة علاج طبيعي	1	f
1585	927	150000	تم تسديد المبلغ بالكامل	2026-04-15 14:19:55	1	\N	\N	f
1586	869	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-15 15:04:59.416	3	أجهزة علاج طبيعي	4	f
1587	1009	200000	تم تسديد المبلغ بالكامل	2026-04-15 15:13:52	1	\N	\N	f
1588	978	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 16:06:14.116	3	أجهزة علاج طبيعي	1	f
1589	1011	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-15 16:13:13	1	أجهزة علاج طبيعي	1	f
1590	1010	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-15 16:31:15.973	3	أجهزة علاج طبيعي	2	f
1591	747	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-15 16:33:38.273	3	روبوت	1	f
1592	981	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 16:41:19.781	3	أجهزة علاج طبيعي	1	f
1593	977	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-15 17:41:19.792	3	أجهزة علاج طبيعي	2	f
1594	931	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-15 17:42:42.806	3	روبوت	1	f
1595	1013	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 17:51:49.37	3	أجهزة علاج طبيعي	1	f
1596	883	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-15 18:26:36.466	3	أجهزة علاج طبيعي	1	f
1597	822	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-16 05:35:26.49	3	تمارين تأهيلية	1	f
1598	153	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-16 06:02:50.968	3	تمارين تأهيلية	1	f
1599	785	50000	جلسات علاج إضافية - روبوت (1 جلسة) - حجز جلسة ليوم الاثنين القادم	2026-04-16 06:04:07.104	3	روبوت	1	f
1600	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-16 06:42:51.063	3	أجهزة علاج طبيعي	1	f
1601	933	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-16 09:12:34.676	3	أجهزة علاج طبيعي	1	f
1602	1011	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-16 10:57:26	1	أجهزة علاج طبيعي	1	f
1603	727	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) - جلسة اليوم وجلسة حجز ليوم الاحد القادم	2026-04-16 11:36:17.246	3	أجهزة علاج طبيعي	2	f
1604	1004	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-16 12:18:06.073	3	أجهزة علاج طبيعي	1	f
1605	891	2000000	تم تسديد المبلغ بالكامل 	2026-04-15 12:29:34	2	\N	\N	f
1606	833	550000	تم تسديد المبلغ بالكامل 	2026-04-14 12:30:07	2	\N	\N	f
1607	1021	150000	خدمة أخرى - شراء مساند afo عدد 2 	2026-04-16 12:47:41.469	1	\N	\N	f
1608	814	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-16 13:14:13.013	1	أجهزة علاج طبيعي	2	f
1609	897	250000	تم تسديد المبلغ بالكامل	2026-04-16 13:30:31	1	\N	\N	f
1610	780	50000	روبوت (1 جلسة)	2026-04-13 15:13:01	1	روبوت	1	f
1611	780	450000	أجهزة علاج طبيعي (18 جلسة)	2026-04-16 15:13:32	1	أجهزة علاج طبيعي	18	f
1612	995	500000	تم تسديد المبلغ بالكامل	2026-04-16 16:15:33	1	\N	\N	f
1613	224	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-16 18:16:09.572	3	روبوت	1	f
1614	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 06:09:57.914	3	أجهزة علاج طبيعي	1	f
1615	1003	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 06:22:22.496	3	أجهزة علاج طبيعي	1	f
1616	1025	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 06:31:07.133	3	أجهزة علاج طبيعي	1	f
1617	955	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 07:01:03.377	3	أجهزة علاج طبيعي	1	f
1618	1028	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 08:18:33.666	3	أجهزة علاج طبيعي	1	f
1619	976	300000	جلسات علاج إضافية - أجهزة علاج طبيعي (12 جلسة)	2026-04-18 08:34:10.026	3	أجهزة علاج طبيعي	12	f
1620	1024	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-18 08:53:06.841	3	أبر صينية	1	f
1621	1027	300000	جلسات علاج إضافية - أجهزة علاج طبيعي (12 جلسة)	2026-04-18 10:52:44.188	3	أجهزة علاج طبيعي	12	f
1622	640	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-18 11:00:32.334	3	أجهزة علاج طبيعي	4	f
1623	694	500000	دفعه ثانيه	2026-04-18 11:51:33	1	\N	\N	f
1624	1038	100000	دفعه اولى	2026-04-18 14:21:23	1	\N	\N	f
1625	1032	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 14:31:44.296	3	أجهزة علاج طبيعي	1	f
1626	814	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-18 14:49:39.485	1	أجهزة علاج طبيعي	2	f
1627	1034	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-18 15:11:36.422	3	أبر صينية	1	f
1628	1036	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة)	2026-04-18 15:18:58.469	3	أجهزة علاج طبيعي	6	f
1629	1033	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 15:31:43.049	3	أجهزة علاج طبيعي	1	f
1630	1035	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-18 15:36:16.669	3	أجهزة علاج طبيعي	3	f
1631	608	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 15:54:46.245	3	أجهزة علاج طبيعي	1	f
1632	810	100000	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة)	2026-04-18 15:55:12.101	3	أجهزة علاج طبيعي	4	f
1633	952	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 15:56:11.53	3	أجهزة علاج طبيعي	1	f
1634	1010	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-18 15:57:26.319	3	أجهزة علاج طبيعي	2	f
1635	1011	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-18 16:07:11	1	أجهزة علاج طبيعي	1	f
1637	458	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 16:11:32.114	3	أجهزة علاج طبيعي	1	f
1639	874	200000	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة)	2026-04-18 16:20:57.295	1	أجهزة علاج طبيعي	8	f
1638	874	0	أجهزة علاج طبيعي (2 جلسة)	2026-04-18 16:26:09	1	أجهزة علاج طبيعي	2	f
1640	977	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 16:51:07.83	3	أجهزة علاج طبيعي	1	f
1641	1040	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 17:22:18.138	3	أجهزة علاج طبيعي	1	f
1642	1044	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-18 17:29:34.747	3	روبوت	1	f
1643	931	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-18 17:36:50.803	3	روبوت	1	f
1644	998	50000	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة)	2026-04-18 18:25:45.454	3	أجهزة علاج طبيعي	2	f
1645	670	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 18:30:30.408	3	أجهزة علاج طبيعي	1	f
1646	999	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-18 18:32:26.298	3	أجهزة علاج طبيعي	1	f
1648	1024	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-19 05:25:52.357	3	أبر صينية	1	f
1649	822	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-19 05:26:53.125	3	تمارين تأهيلية	1	f
1650	1001	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-19 06:09:17.766	3	تمارين تأهيلية	1	f
1651	1028	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 06:09:54.075	3	أجهزة علاج طبيعي	1	f
1652	1025	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 06:23:49.578	3	أجهزة علاج طبيعي	1	f
1653	784	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 06:24:27.188	3	أجهزة علاج طبيعي	1	f
1654	1046	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 07:04:11.243	3	أجهزة علاج طبيعي	1	f
1655	1047	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج مصطفى بعد الاستشارة مباشرة	2026-04-19 08:11:37.977	3	أجهزة علاج طبيعي	1	f
1656	892	500000	تم تسديد المبلغ بالكامل 	2026-04-18 09:24:44	2	\N	\N	f
1657	949	50000	روبوت (1 جلسة)	2026-04-19 11:23:31	1	روبوت	1	f
1658	949	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 11:23:51.548	1	أجهزة علاج طبيعي	1	f
1659	1048	150000	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج مصطفى العضاض بعد الاستشارة مباشرة	2026-04-19 11:34:52.868	3	أجهزة علاج طبيعي	6	f
1660	474	125000	جلسات علاج إضافية - تمارين تأهيلية (5 جلسة) - بكج جديد بالتضامن مع الضمان الصحي 	2026-04-19 11:36:02.363	3	تمارين تأهيلية	5	f
1661	413	250000	تم تسديد المبلغ بالكامل	2026-04-19 11:56:17	1	\N	\N	f
1662	727	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 12:22:59.042	3	أجهزة علاج طبيعي	1	f
1663	1049	150000	الدفعه الاولى من المبلغ الكلي 	2026-04-19 12:30:29	3	\N	\N	f
1665	1050	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 13:02:09.904	1	أجهزة علاج طبيعي	1	f
1666	817	50000	جلسات علاج إضافية - روبوت (1 جلسة)	2026-04-19 13:35:43.351	3	روبوت	1	f
1667	818	25000	جلسات علاج إضافية - أبر صينية (1 جلسة)	2026-04-19 13:36:35.155	3	أبر صينية	1	f
1668	1052	75000	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة)	2026-04-19 14:40:39.279	3	أجهزة علاج طبيعي	3	f
1669	852	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 15:28:47.952	3	أجهزة علاج طبيعي	1	f
1670	1011	25000	أجهزة علاج طبيعي (1 جلسة)	2026-04-19 15:42:27	1	أجهزة علاج طبيعي	1	f
1671	977	25000	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة)	2026-04-19 16:56:35.185	3	أجهزة علاج طبيعي	1	f
1672	1045	25000	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة)	2026-04-19 17:33:19.934	3	تمارين تأهيلية	1	f
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
cYyo-HGDBQIlq1OquzJgXQih2G1H3nrZ	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T15:40:33.562Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "683bc2a5-f250-46c8-a5b1-94e94994b00b", "exp": 1776616833, "iat": 1776613233, "iss": "https://replit.com/oidc", "sub": "52975797", "email": "yasirsabeeh@yahoo.com", "at_hash": "ghg84uqgp8s-wcEjPqc9LQ", "username": "yasirsabeeh", "last_name": "Saadi", "first_name": "Yasir", "email_verified": true}, "expires_at": 1776616833, "access_token": "7Rp9K5gWYDhFwpGT_NM10bJkCqz17QstU7WE-Wk6Iz3", "refresh_token": "k-8N45oVojQ6IVfur9uXpT8tcUf-hOQ_Z3joSTk2Iuy"}}}	2026-04-26 15:46:30
k0dVShQT5Bi8EDaBpH_5mpLjvhID4Ewo	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T09:57:53.673Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776596273, "iat": 1776592673, "iss": "https://replit.com/oidc", "sub": "52983680", "email": "hyder.hason71@gmail.com", "at_hash": "8tRPRXZr9cFYDPXZKMYqgQ", "username": "hyderhason71", "last_name": "hason", "first_name": "hyder", "email_verified": true, "profile_image_url": "https://lh3.googleusercontent.com/a/ACg8ocKeutH34OtKFMK6s0xfekX1vNJ5QEPyyvA9CsfSspXIrDRmQvf6=s96-c"}, "expires_at": 1776596273, "access_token": "EdIuUSWa35wAywRxFhPDa4X2KSRrMTtgnBBzGK3S9tO", "refresh_token": "QPmDmxUaWaXm6Guoqncr15dB6wX9tCAhrqNIU_btnyX"}}}	2026-04-26 10:51:12
UIJwaYUuW9L4xJgbXVUoXh-9CHG24ghw	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-25T12:56:19.981Z", "httpOnly": true, "originalMaxAge": 604800000}}	2026-04-25 12:56:20
2aafdZ2fTOrAioZOyfwzNUKJB-Mn3U4A	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-22T19:02:11.052Z", "httpOnly": true, "originalMaxAge": 604800000}}	2026-04-22 19:02:12
42vkBZjT9w4FVk9yyko5PV4oPEXl3B06	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T12:55:53.300Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776606953, "iat": 1776603353, "iss": "https://replit.com/oidc", "sub": "52983787", "email": "munkasm1993@gmail.com", "at_hash": "Ubs3hNPlygeWSJDSwptLDQ", "username": "munkasm1993", "last_name": null, "first_name": null, "email_verified": true, "profile_image_url": "https://lh3.googleusercontent.com/a/ACg8ocLf_XUomdV_DMrGvgVhEPnddMdZvL-EdWlab3cSjIR8gG4m-ywR=s96-c"}, "expires_at": 1776606953, "access_token": "Ecy5DXdj5x9J6dJWAsfE6ymhtMZq_SYFL7RT3moNG78", "refresh_token": "oVo2xnRKMpBgLh-J3AT6aHCss7VzQfgpU1CXye2ut16"}}}	2026-04-26 12:56:03
B1jFy3WuW2COpn2DvyIlU44JuZ3gKmEO	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T16:50:21.451Z", "httpOnly": true, "originalMaxAge": 604800000}}	2026-04-26 16:50:26
w45It8pNfueXfsQF81wjjjl33seguRQR	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-25T14:15:05.594Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776525305, "iat": 1776521705, "iss": "https://replit.com/oidc", "sub": "53821145", "email": "fadelabbas1976@gmail.com", "at_hash": "SCYFeOCoXxun0k0ALQUqQg", "username": "fadelabbas1976", "last_name": null, "first_name": null, "email_verified": true}, "expires_at": 1776525305, "access_token": "D5dtPFdS600BcAgSZ7etrmVuLg0fGEuce8dJOfSh-24", "refresh_token": "FlD9RsmiU2bxbmZUWuiXvqyw1itq3t-htUH_y3bqEVz"}}}	2026-04-25 14:15:56
-tfDQhT2Iw5xMaDtEbT4O1JXj-HCBDb7	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-25T13:31:37.869Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776522697, "iat": 1776519097, "iss": "https://replit.com/oidc", "sub": "52983680", "email": "hyder.hason71@gmail.com", "at_hash": "LDH8bDrZxel_VO55d4R06A", "username": "hyderhason71", "last_name": "hason", "first_name": "hyder", "email_verified": true, "profile_image_url": "https://lh3.googleusercontent.com/a/ACg8ocKeutH34OtKFMK6s0xfekX1vNJ5QEPyyvA9CsfSspXIrDRmQvf6=s96-c"}, "expires_at": 1776522697, "access_token": "pvfLCyNr40jmRz-1M4ovpZSHPF-mpoDcyTAsicoutVC", "refresh_token": "ymtYersHjfjkfUZc77aBn6SkR8GJwM6B6PuD1mEYVjD"}}, "branchSession": {"shift": "auto", "isAdmin": true, "branchId": 0, "permissions": {"canAddPatients": true, "canAddPayments": true, "canManageUsers": true, "canViewReports": true, "canEditPatients": true, "canEditPayments": true, "canViewPatients": true, "canViewPayments": true, "canManageSurveys": true, "canDeletePatients": true, "canDeletePayments": true, "canManageSettings": true, "canManageAccounting": true, "canManageTreatmentPlans": true}}}	2026-04-25 14:01:54
7A8PkyChh3gfQVIhu14BUERWg5JjsNKQ	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T07:21:38.733Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776586898, "iat": 1776583298, "iss": "https://replit.com/oidc", "sub": "53032577", "email": "serwanwarith@gmail.com", "at_hash": "Q_lbrlnINY4tcg1TmkOrEQ", "username": "serwanwarith", "last_name": null, "first_name": "mfl;fl;m;lfml", "email_verified": true, "profile_image_url": "https://lh3.googleusercontent.com/a/ACg8ocJQq_VwrjsqOOvNoH2gmrg_cWf1eTYs1-vmWMo2Hma0QcY6PQ=s96-c"}, "expires_at": 1776586898, "access_token": "TtfWqNh-15-SjAQRNcfzErdF5aHnH_3fG_nI-ayY_LN", "refresh_token": "xLsvR_vqwRPexTsCO6tmNjKl_OnOgmVjhxWFm-_xWGB"}}, "branchSession": {"role": "reception", "shift": "auto", "userId": 3, "isAdmin": false, "branchId": 2, "language": "ar", "displayName": "om zainab", "permissions": {"canAddPatients": true, "canAddPayments": true, "canManageUsers": false, "canViewReports": false, "canEditPatients": false, "canEditPayments": false, "canViewPatients": true, "canViewPayments": true, "canManageSurveys": false, "canDeletePatients": false, "canDeletePayments": false, "canManageSettings": false, "canManageAccounting": false, "canManageTreatmentPlans": false}}}	2026-04-26 07:21:46
HPKq4Qe172v_AC1r9pFc39ikmqa_elgx	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T17:28:14.483Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776623289, "iat": 1776619689, "iss": "https://replit.com/oidc", "sub": "52983787", "email": "munkasm1993@gmail.com", "at_hash": "RmsnDAidtDifOXeE3G69gg", "username": "munkasm1993", "last_name": null, "first_name": null, "email_verified": true, "profile_image_url": "https://lh3.googleusercontent.com/a/ACg8ocLf_XUomdV_DMrGvgVhEPnddMdZvL-EdWlab3cSjIR8gG4m-ywR=s96-c"}, "expires_at": 1776623289, "access_token": "ft33gwj2EP8FWX-TSItAHqEB2nLlKWm09sMfvDpe61Z", "refresh_token": "V8zahOMtecZAKDeNSIkiTo1AQTw7ne2UjdloYLAzMpA"}}, "branchSession": {"role": "reception", "shift": "auto", "userId": 2, "isAdmin": false, "branchId": 3, "language": "ar", "displayName": "samaa", "permissions": {"canAddPatients": true, "canAddPayments": true, "canManageUsers": false, "canViewReports": false, "canEditPatients": false, "canEditPayments": false, "canViewPatients": true, "canViewPayments": true, "canManageSurveys": false, "canDeletePatients": false, "canDeletePayments": false, "canManageSettings": false, "canManageAccounting": false, "canManageTreatmentPlans": false}}}	2026-04-26 17:44:29
gwWYoIgXa2Ice_Wq5YIxfl-rDfXxvVne	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T17:49:41.764Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776624581, "iat": 1776620981, "iss": "https://replit.com/oidc", "sub": "53700043", "email": "hindazher@gmail.com", "at_hash": "mdXVeBvxb4Oms1Ss0cszFA", "username": "hindazher", "last_name": null, "first_name": null, "email_verified": true}, "expires_at": 1776624581, "access_token": "fXedMIpMLmQX23Vtal73p-nESQFwF4kS_puvGbGcpaO", "refresh_token": "JVi_5qT5WD8PGburfWDTctbvLKiiKEVXlNaOkvIBzaA"}}, "branchSession": {"role": "reception", "shift": "auto", "userId": 9, "isAdmin": false, "branchId": 3, "language": "ar", "displayName": "montadar", "permissions": {"canAddPatients": true, "canAddPayments": true, "canManageUsers": false, "canViewReports": true, "canEditPatients": false, "canEditPayments": false, "canViewPatients": true, "canViewPayments": true, "canManageSurveys": false, "canDeletePatients": false, "canDeletePayments": false, "canManageSettings": false, "canManageAccounting": false, "canManageTreatmentPlans": false}}}	2026-04-26 18:17:48
EnoFqD6wzBOSuA4cGtiQeLyZR5jfyRk7	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-23T09:52:28.184Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "TLqKk5ROSnHaNSakP4R5W-9Zv_iDpeBD3bDLvmW5ZKU"}}	2026-04-23 09:52:29
_t9xPoSwE73lYhpfLDA0PtF1wP405Wea	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T15:48:20.877Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776617287, "iat": 1776613687, "iss": "https://replit.com/oidc", "sub": "52975797", "email": "yasirsabeeh@yahoo.com", "at_hash": "1r5-oCNr6YWg8ct-seNKGA", "username": "yasirsabeeh", "last_name": "Saadi", "first_name": "Yasir", "email_verified": true}, "expires_at": 1776617287, "access_token": "pdOKiwYvzt1Xy9h4iJgc8uSsiVxPBY3GkMWZB0pcFQF", "refresh_token": "5Hit9b5lAW-nXEKdBzE8X_9pBhspSUl507czER2ul-j"}}, "branchSession": {"shift": "auto", "isAdmin": true, "branchId": 0, "permissions": {"canAddPatients": true, "canAddPayments": true, "canManageUsers": true, "canViewReports": true, "canEditPatients": true, "canEditPayments": true, "canViewPatients": true, "canViewPayments": true, "canManageSurveys": true, "canDeletePatients": true, "canDeletePayments": true, "canManageSettings": true, "canManageAccounting": true, "canManageTreatmentPlans": true}}}	2026-04-26 15:48:27
yVsZbmk3fCtKa5dmT5ertcGKeIWt1ogS	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T13:19:31.590Z", "httpOnly": true, "originalMaxAge": 604800000}}	2026-04-26 13:19:32
KBTpxvrmj7iewtU9X_A3CzjzHK053Xg4	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-25T18:37:16.680Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "a852f926-90f6-4b61-b7a8-fa406d8bb111", "exp": 1776541030, "iat": 1776537430, "iss": "https://replit.com/oidc", "sub": "52984115", "email": "saleemgh007@gmail.com", "at_hash": "ICScbUH4I7802I9YObqlng", "username": "saleemgh007", "last_name": null, "first_name": null, "email_verified": true}, "expires_at": 1776541030, "access_token": "F-0Mm6OzQ3KSni3DLqT0VkzNkEQpfWyZuOhYmTlDLq8", "refresh_token": "UHuVhPyIaOlw2KTtud2kBtAPoT31Ni3ifQBnmsSTO_3"}}, "branchSession": {"shift": "auto", "isAdmin": true, "branchId": 0, "permissions": {"canAddPatients": true, "canAddPayments": true, "canManageUsers": true, "canViewReports": true, "canEditPatients": true, "canEditPayments": true, "canViewPatients": true, "canViewPayments": true, "canManageSurveys": true, "canDeletePatients": true, "canDeletePayments": true, "canManageSettings": true, "canManageAccounting": true, "canManageTreatmentPlans": true}}}	2026-04-25 18:38:46
rPU8LUthx6plpmIboFOOEomZ2JTKmW2q	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-23T09:52:28.393Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "eB8N766pnJ2phEGjcsxnzETov7-lljwVDwrAhjKUTBM"}}	2026-04-23 09:52:29
\.


--
-- Data for Name: survey_answers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.survey_answers (id, response_id, question_id, rating_value, text_value, bool_value) FROM stdin;
\.


--
-- Data for Name: survey_questions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.survey_questions (id, template_id, question_text, question_text_en, question_order, question_type, category) FROM stdin;
1	1	ما مدى راحتك عند استخدام الطرف الصناعي؟	How comfortable is the prosthetic device?	1	rating	comfort
2	1	هل يناسب الطرف الصناعي حجم ووزن جسمك؟	Does the prosthetic fit your body size and weight?	2	rating	comfort
3	1	ما مدى سهولة المشي أو الحركة بالطرف الصناعي؟	How easy is walking/movement with the prosthetic?	3	rating	function
4	1	هل يساعدك الطرف الصناعي على أداء أنشطتك اليومية؟	Does the prosthetic help with daily activities?	4	rating	function
5	1	ما مدى رضاك عن مظهر الطرف الصناعي؟	How satisfied are you with the prosthetic appearance?	5	rating	appearance
6	1	ما مدى متانة وجودة الطرف الصناعي؟	How durable and high-quality is the prosthetic?	6	rating	durability
7	1	ما مدى رضاك عن خدمة الفريق الطبي أثناء القياس والتركيب؟	How satisfied are you with the medical team during fitting?	7	rating	service
8	1	هل تلقيت تعليمات كافية لاستخدام الطرف الصناعي؟	Did you receive sufficient instructions for prosthetic use?	8	rating	service
9	1	هل قل مستوى الألم بعد استخدام الطرف الصناعي؟	Has pain decreased after using the prosthetic?	9	rating	pain
10	1	بشكل عام، ما مدى رضاك عن الخدمة المقدمة؟	Overall, how satisfied are you with the service?	10	rating	overall
11	2	ما مدى فعالية جلسات العلاج الطبيعي في تحسين حالتك؟	How effective were physiotherapy sessions in improving your condition?	1	rating	treatment
12	2	هل شعرت بتحسن ملموس بعد الجلسات؟	Did you feel noticeable improvement after sessions?	2	rating	treatment
13	2	ما مدى كفاءة المعالج الطبيعي؟	How competent was the physiotherapist?	3	rating	therapist
14	2	هل أوضح لك المعالج خطة العلاج وأهدافها؟	Did the therapist explain the treatment plan and goals?	4	rating	therapist
15	2	ما مدى تواصل الفريق الطبي معك أثناء العلاج؟	How well did the medical team communicate during treatment?	5	rating	communication
16	2	ما مدى رضاك عن الأجهزة والمعدات المستخدمة؟	How satisfied are you with the equipment used?	6	rating	equipment
17	2	ما مدى نظافة وتنظيم قاعة العلاج؟	How clean and organized was the treatment room?	7	rating	environment
18	2	ما مدى ملاءمة مواعيد الجلسات لجدولك؟	How suitable were session timings for your schedule?	8	rating	scheduling
19	2	هل تحققت أهداف العلاج المتوقعة؟	Were expected treatment goals achieved?	9	rating	results
20	2	بشكل عام، ما مدى رضاك عن خدمة العلاج الطبيعي؟	Overall, how satisfied are you with the physiotherapy service?	10	rating	overall
21	3	ما مدى رضاك عن استقبال الموظفين؟	How satisfied are you with staff reception?	1	rating	reception
22	3	هل كان وقت الانتظار مناسباً؟	Was the waiting time reasonable?	2	rating	waiting
23	3	ما مدى نظافة المركز؟	How clean was the center?	3	rating	cleanliness
24	3	ما مدى جودة المرافق والتجهيزات؟	How good were the facilities and equipment?	4	rating	facilities
25	3	هل تنصح الآخرين بمراجعة هذا المركز؟	Would you recommend this center to others?	5	rating	overall
\.


--
-- Data for Name: survey_responses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.survey_responses (id, template_id, patient_id, branch_id, surveyor_id, surveyor_name, total_score, max_score, percentage, notes, completed_at) FROM stdin;
\.


--
-- Data for Name: survey_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.survey_templates (id, name, description, target_type, is_active, created_at) FROM stdin;
1	تقييم خدمات الأطراف الصناعية	Prosthetics Services Assessment	prosthetics	t	2026-02-23 11:15:42.807519
2	تقييم خدمات العلاج الطبيعي	Physiotherapy Services Assessment	physiotherapy	t	2026-02-23 11:15:43.073125
3	تقييم عام للفرع	General Branch Assessment	general	t	2026-02-23 11:15:43.32768
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.system_settings (id, setting_key, setting_value, updated_at) FROM stdin;
1	admin_password_hash	$2b$10$DT9/cvu78PFBV8WwjShedeGAqDxGEehgaLv3DU5Udojy59tQq4kkG	2026-01-26 21:19:23.563569
2	admin_password		2026-01-26 21:19:23.609552
3	last_daily_backup_date	2026-02-16	2026-02-16 20:55:27.523
\.


--
-- Data for Name: system_users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.system_users (id, username, password_hash, display_name, branch_id, role, is_active, can_view_patients, can_add_patients, can_edit_patients, can_delete_patients, can_view_payments, can_add_payments, can_view_reports, can_manage_accounting, can_manage_settings, created_at, updated_at, can_edit_payments, can_delete_payments, can_manage_users, can_manage_treatment_plans, language, can_manage_surveys) FROM stdin;
1	hind	$2b$10$ywTECQFSsrYCZPyksKagr.KY/qP/yjF9NdiTdSBL3Fm8ThmJr4v7C	hind	3	reception	t	t	t	f	f	t	t	f	f	f	2026-02-03 09:34:06.58973	2026-02-03 09:34:06.58973	f	f	f	f	ar	f
2	samaa	$2b$10$MnWGwnGKytJq/6WMiQDaW.tXUJCR536lxlmKTj9D5OOupnVSbWjxu	samaa	3	reception	t	t	t	f	f	t	t	f	f	f	2026-02-03 09:34:26.938521	2026-02-03 09:34:26.938521	f	f	f	f	ar	f
3	om zainab	$2b$10$BAUqId/FraL57NbqkcsS7uvuPYjX./YvT8fpjoEoOCpgVEctIBzIS	om zainab	2	reception	t	t	t	f	f	t	t	f	f	f	2026-02-03 09:34:51.731094	2026-02-03 09:34:51.731094	f	f	f	f	ar	f
4	mustafa	$2b$10$44xSbcKdlHBcb6INZkfCAu0sPBCqNiwaNz1gKWT.I2VzLo5uaM4om	دكتور مصطفى العضاض	3	therapist	t	t	f	f	f	f	f	f	f	f	2026-02-16 20:13:58.355792	2026-02-16 20:13:58.355792	f	f	f	t	ar	f
5	abdullah	$2b$10$3KTTjHQXz5SZvhWcPZb2LeelDhyjHb4xg8geZ5npv/qkB0ZEqu37O	Dr Abdullah 	3	therapist	t	t	f	f	f	f	f	f	f	f	2026-02-16 20:14:50.346587	2026-02-16 20:14:50.346587	f	f	f	t	ar	f
6	abbas	$2b$10$681JCYpLOG/c3NLMSyPDfehUfm4XdQfEX2XekRz0SkrDtfh26PGXa	Dr Abbas	1	therapist	t	t	f	f	f	f	f	f	f	f	2026-02-16 21:26:18.866511	2026-02-16 21:26:18.866511	f	f	f	t	ar	f
7	ryiam	$2b$10$eEUiM1h.8yDgfp1IIxQ4we2Inx9ShHo4q00pWuMpC68509X9BA4fu	ربام	1	reception	t	t	t	f	f	t	t	f	f	f	2026-02-18 11:07:16.820624	2026-02-18 11:07:16.820624	f	f	f	f	ar	f
8	ist	$2b$10$4jwWU/mlxYPx0pRBDGPWMO9YpQ8ryL75D83YCYZlPmRyP1JPYCAw6	استبيان منتظر	3	surveyor	t	t	f	f	f	f	f	f	f	f	2026-02-24 05:21:31.767927	2026-02-24 05:21:31.767927	f	f	f	f	ar	t
9	montadar	$2b$10$XyG.bumOkbJKJ1pGfqhTi.W7CJsrcjuVW8Ova/8L9c2G89HYRtD2S	montadar	3	reception	t	t	t	f	f	t	t	t	f	f	2026-02-24 05:26:23.077534	2026-02-24 06:30:40.498	f	f	f	f	ar	f
\.


--
-- Data for Name: treatment_plans; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.treatment_plans (id, patient_id, branch_id, therapist_id, therapist_name, diagnosis, injury_type, injury_location, mmt_assessment, spasticity, sensation, pain_level, adl, session_count, session_frequency, device_type, goal_type, notes, created_at, updated_at, disease_history) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at) FROM stdin;
54018914	bioniccenterb@hotmail.com	\N	\N	\N	2026-01-31 17:24:54.927528	2026-01-31 17:24:54.927528
52983680	hyder.hason71@gmail.com	hyder	hason	https://lh3.googleusercontent.com/a/ACg8ocKeutH34OtKFMK6s0xfekX1vNJ5QEPyyvA9CsfSspXIrDRmQvf6=s96-c	2026-01-12 12:00:56.626588	2026-04-16 11:58:37.683
52985363	fadlali56y3y37@gmail.com	\N	\N	\N	2026-01-12 12:43:17.18066	2026-01-12 12:43:17.18066
53031753	alwarithdermanf@gmail.com	\N	\N	\N	2026-01-13 09:48:02.72299	2026-03-17 08:09:27.02
53682975	sghsghsgh12345@gmail.com	\N	\N	\N	2026-01-24 18:54:56.69106	2026-02-05 19:36:25.381
55002034	ttoon2824@gmail.com	\N	\N	\N	2026-02-19 08:42:24.326189	2026-02-24 06:06:19.534
53821145	fadelabbas1976@gmail.com	\N	\N	\N	2026-01-27 15:03:52.957839	2026-04-11 16:40:14.601
53700043	hindazher@gmail.com	\N	\N	\N	2026-01-25 06:24:04.842683	2026-04-19 10:30:02.805
52976224	yasir.s81@gmail.com	Yasir	sabeeh	https://lh3.googleusercontent.com/a/ACg8ocLN7pSYsF2B-CzZ78M80BTo9bOlkr_Jcd2aPFhJKoPBRV0FKOSA1w=s96-c	2026-01-12 12:03:56.463557	2026-04-19 10:35:46.099
53334909	yasirsaadi.tr@gmail.com	\N	\N	\N	2026-01-17 17:29:40.593466	2026-01-18 08:11:54.778
52983787	munkasm1993@gmail.com	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocLf_XUomdV_DMrGvgVhEPnddMdZvL-EdWlab3cSjIR8gG4m-ywR=s96-c	2026-01-12 12:03:50.39646	2026-04-19 13:19:36.462
52975797	yasirsabeeh@yahoo.com	Yasir	Saadi	\N	2026-01-12 11:50:51.947592	2026-04-19 15:48:07.184
52984115	saleemgh007@gmail.com	\N	\N	\N	2026-01-12 12:12:09.183821	2026-04-15 16:12:32.113
53032577	serwanwarith@gmail.com	mfl;fl;m;lfml	\N	https://lh3.googleusercontent.com/a/ACg8ocJQq_VwrjsqOOvNoH2gmrg_cWf1eTYs1-vmWMo2Hma0QcY6PQ=s96-c	2026-01-13 10:12:27.658481	2026-04-16 07:32:44.189
52995048	ahmedibo1@gmail.com	ahmed	ibo	\N	2026-01-12 16:10:04.414396	2026-01-15 17:17:56.242
54892079	s.nazirabbas51214@gmail.com	\N	\N	\N	2026-02-16 21:29:59.475709	2026-02-17 09:36:46.683
54890219	mohammedmustafa94mums@gmail.com	\N	\N	\N	2026-02-16 20:24:31.121017	2026-02-17 10:05:51.743
53054537	ruqia85ahmed@gmail.com	\N	\N	\N	2026-01-13 18:25:53.474884	2026-01-24 12:19:54.177
52986562	mahdiqasim97@gmail.com	\N	\N	\N	2026-01-12 13:14:06.963138	2026-01-31 15:43:44.554
52985491	alwarithdermano@gmail.com	\N	\N	\N	2026-01-12 12:47:11.749424	2026-03-06 09:08:06.288
52987068	fa9999del2015@gmail.com	فاضل	عباس	\N	2026-01-12 13:42:31.787518	2026-03-31 05:36:38.71
\.


--
-- Data for Name: visits; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.visits (id, patient_id, branch_id, visit_date, details, notes, treatment_type, session_count, cost, shift) FROM stdin;
1653	287	3	2026-02-28 09:00:22.306046	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
15	19	1	2026-01-13 14:43:35.190948	تم زيارة المركز لغرض لبس قالب كاربون جديد وبسعر مليون ونص وتم تسديد مبلغ مليون و350 الف تكملة مبلغ القالب 		\N	\N	\N	\N
4386	1038	1	2026-04-18 14:21:43.095339		شراء سليكون اوتوبك	\N	\N	\N	evening
4387	780	1	2026-04-18 14:24:47.18878	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4477	949	1	2026-04-19 12:43:50.850461	\N	جلسه روبوت	روبوت	\N	\N	morning
11	15	1	2026-01-13 13:24:34.51414	تم زيارة المركز لغرض التدريب 		\N	\N	\N	\N
12	16	1	2026-01-13 13:32:30.084952	تم مراجعة المركز لغرض لبس الطرف بعد تبديل القدم بقياس اكبر ودفع تكملة مبلغ الطرف 475000 بدلا من 500000 تم تخفيض 25000 له		\N	\N	\N	\N
13	5	4	2026-01-13 13:52:29.835896	اخذ قالب جديد		\N	\N	\N	\N
14	17	1	2026-01-13 14:03:24.532712	تم مراجعة المركز لغرض استلام السليكون اوتوبوك مع صيانة كسر ( فطر ) بالقالب 		\N	\N	\N	\N
16	21	1	2026-01-13 14:51:33.522286	تم مراجعة المركز لغرض التدريب ودفع مبلغ 2000000 والباقي 1000000		\N	\N	\N	\N
19	27	3	2026-01-14 18:55:07.062383	تم مراجعة المريض لمركزنا واخذ استشارة من قبل اخصائي المعالج مصطفى العضاض ومن ثم المباشرة باخذ جلسة (مشترك كلاسيك مع جهاز اخر متطور) جلسة مفردة\n		\N	\N	\N	\N
20	26	3	2026-01-14 19:03:30.388506	راجعتنا المريضة واخذ استشارة من قبل اخصائي المعالج مصطفى العضاض حيث اخبرت المعالج بانها تحتاج الى اعادة تاهيل لمدة 3 اسابيع حسب ما اخبرها طبيبها الخاص في بغداد بضرورة استمرارها بجلسات العلاج الطبيعي في مركز مختص وبسبب سمعة مركزنا من قبل مواقع التواصل تم مباشرتهم معنا بتاريخ اليوم \nجلسة (مشترك كلاسيك مع جهاز متطور اخر)		\N	\N	\N	\N
21	25	3	2026-01-14 19:11:22.463288	تم زيارة مركزنا مساءا واخذ استشارة سابقا من قبل اخصائي المعالج مصطفى العضاض واليوم جاء مرة اخرى صباحا واخذ استشارة اخرى من قبل اخصائي المعالج عبد الله خان ومن ثم المباشرة باخذ جلسة كلاسيك فردية		\N	\N	\N	\N
22	24	3	2026-01-14 19:27:32.094343	جاءت المريضة من العيادة الخاصة ب دكتور علي فاخر الزيدي وبعدها تم الاتصال بي من قبل دكتورها لغرض المتابعة واخباره بتطورات حالتها المرضية لذلك تم الاشراف عليها اليوم من قبل اخصائي المعالج عبد الله خان ووضع الخطة العلاجية المناسبة لحالتها حيث تم حساب الجلسة الواحدة على 25 الف كما اخبرها الدكتور بذلك		\N	\N	\N	\N
23	23	2	2026-01-14 19:31:08.427472	زار المركز لغرض التدريب		\N	\N	\N	\N
24	29	2	2026-01-15 10:29:46.57435	تم استلام اليد السيليكونية 	لاتوجد مشاكل 	\N	\N	\N	\N
25	25	3	2026-01-15 12:09:55.866778	جلسة علاج طبيعي ثانية 		\N	\N	\N	\N
26	28	3	2026-01-15 12:15:42.719222	حضرت بتاريخ 14/1/2026 لغرض الاستشارة لدى الدكتور عبد الله، حيث تم خلالها تحديد الأجهزة العلاجية المناسبة، وعدد الجلسات المطلوبة، وكذلك المواعيد الملائمة لإجرائها.\nوفي تاريخ اليوم 15/1/2026 حضرت لإجراء الجلسة الأولى		\N	\N	\N	\N
27	24	3	2026-01-15 12:18:53.415128	حضرت المريضة لإجراء الجلسة الثانية من جلسات العلاج الطبيعي المحددة لها من قبل الطبيب المعالج.		\N	\N	\N	\N
28	31	3	2026-01-15 13:34:37.983207	المريض تمت عمليته من قبل دكتور محمد توفيق وتمت مراجعته لدكتور حيدر محمد ونصحوه بإستمراره بالعلاج الطبيعي في مركزنا وتم اليوم اخذ استشاره له من قبل دكتور مصطفى العضاض وباشر في جلسته الاولى بتاريخ اليوم\n\n		\N	\N	\N	\N
30	34	4	2026-01-15 13:56:32.047833	اخذ قالب		\N	\N	\N	\N
31	26	3	2026-01-15 14:28:01.734118	الزيارة الثانية للمريضة حيث تم دفع مبلغ 140 الف يغطي اربع جلسات 		\N	\N	\N	\N
33	23	2	2026-01-17 07:20:46.941728	تدريب على الطرف 		\N	\N	\N	\N
34	37	3	2026-01-17 08:46:07.537107	راجع المريض د. عبد الله لغرض الاستشارة يوم الخميس الموافق 15/1/2026، وتم اعتماد الأسعار القديمة كون المريض مراجعًا قديمًا، وذلك بعد إجراء المعاينة السريرية من قبل د. عبد الله.	اليوم اول جلسة 	\N	\N	\N	\N
35	28	3	2026-01-17 08:54:21.662262	حضرت المريضة للمراجعة الثانية اليوم بتاريخ 17/1/2026 ضمن جلسات العلاج المقررة لها.		\N	\N	\N	\N
36	24	3	2026-01-17 08:54:57.834871	حضرت المريضة لإجراء الجلسة الثالثة من جلسات العلاج الطبيعي المحددة لها من قبل الطبيب المعالج		\N	\N	\N	\N
37	41	3	2026-01-17 14:13:56.514473	تم مراجعة المريضىة الى مركزنا بعد مشاهدة اعلان الفيس بوك حيث ان المريضة تراجع في بغداد وابلغها دكتورها بالعلاج الطبيعي تم الاستشارة والمباشرة بنفس اليوم من قبل اخصائي المعالج مصطفى العضاض		\N	\N	\N	\N
38	35	4	2026-01-17 14:16:20.609156	تعيار قالب بتاريخ 13/1/2026	بسبب ضعف البتر وشفاء تحدد الركبة بعد التدريب	\N	\N	\N	\N
39	42	3	2026-01-17 14:20:38.475791	بعد ان تمت مراجعته للدكتور في بغداد وشخصة بالتنخر في عظام الورك وكذلك الانزلاق في فقرات ال 4،5 نصحه بالمباشرة بجلسات العلاج الطبيعي وعند معرفة المريض بمركزنا من خلال مواقع التواصل باشر معنا اليوم بجلسته الاولى بعد ان خضع الى استشارة من قبل الدكتور مصطفى العضاض		\N	\N	\N	\N
40	31	3	2026-01-17 14:23:31.738635	بعد ان اكمل المريض جلسته الاولى الاسبوع الفات باشر معنا اليوم بجلسته الثانية والتي ستكون مستمرة لمدة عشرة ايام قابلة للزيادة 		\N	\N	\N	\N
42	43	4	2026-01-17 15:55:32.131474	تركيب القالب والتدريب عليه واستلام القالب		\N	\N	\N	\N
43	21	1	2026-01-17 16:50:47.756777	تم زيارة المركز لغرض التدريب 		\N	\N	\N	\N
44	44	1	2026-01-17 16:59:41.613795	تم زيارة المركز لوجود صوت بالقدم الكاربونية بايونك وتم تبديل الاقدام الى اقدام سنكل اكسسز  وبدون اي مقابل 		\N	\N	\N	\N
45	45	1	2026-01-17 17:08:47.514961	سبق وان تم تسليم ركبة واحد للمريض لغرض التدريب واليوم تم مراجعة المركز لغرض تركيب الركبة الثانية له 		\N	\N	\N	\N
4388	1032	3	2026-04-18 14:31:44.263782	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4446	1024	3	2026-04-19 05:26:03.171956	\N	جلسة مفردة	أبر صينية	\N	\N	morning
48	48	1	2026-01-17 18:15:54.732672	اخذ قالب مسند ظهر تقويمي جديد 		\N	\N	\N	\N
49	49	1	2026-01-17 18:25:40.335644	ركب الاطراف بتاريخ 9-9-2025 وتدرب على الاطراف الى يوم 11-9-2025 وقام بعملية تعديل للبتر وبعد اكتساب الشفاء جاء اليوم بتاريخ 17-1-2026 لغرض لبس الاطراف وتعديل مكان الادبتر 		\N	\N	\N	\N
51	50	1	2026-01-17 18:32:04.477835	راجع المركز ولديه كسر بادبتر القالب وتم استلام الطرف منه لغرض اصليح الكسر وبدون اي مقابل بعد موافقة دكتور ياسر 		\N	\N	\N	\N
52	31	3	2026-01-17 20:47:56.476541	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 250,000 د.ع)	\N	\N	\N	\N
54	53	3	2026-01-18 07:40:37.244136	راجعنا المريض واخذ استشارة من قبل اخصائي المعالج عبد الله خان وباشر بعدها 		\N	\N	\N	\N
55	39	2	2026-01-18 09:42:14.594725	تدريب على الطرف		\N	\N	\N	\N
56	23	2	2026-01-18 09:49:32.352983	التدريب على الطرف		\N	\N	\N	\N
57	55	3	2026-01-18 10:23:58.094365	المريضة مراجعة قديما لمركزنا وحاليا تاتي حسب موعدها المثبتة لدينا حيث بلغت جلساتها مع اليوم الجلسة السابعة		\N	\N	\N	\N
58	56	3	2026-01-18 10:38:02.319874	راجعتنا المريضة بتاريخ اليوم من خلال توصيات احد القارب ونصحتها بذهاب الى مركزنا حيث اخذت استشارة من قبل المعالج عبد الله خان وباشرت بعدها		\N	\N	\N	\N
59	57	3	2026-01-18 11:15:50.034184	زار المريض المركز بتاريخ 1/1/2026 بغرض الاستشارة لدى الدكتور عبدالله خان، وقد بدأ بالعلاج بعد الاستشارة. وتُعد جلسة اليوم، المصادفة 18/1/2026، الجلسة الثامنة ضمن الخطة العلاجية المتبعة.		\N	\N	\N	\N
60	49	1	2026-01-18 12:15:54.687878	تم زيارة المركز لغرض التدريب 		\N	\N	\N	\N
61	15	1	2026-01-18 12:16:41.177002	تم زيارة المركز لغرض التدريب 		\N	\N	\N	\N
62	58	1	2026-01-18 12:24:02.823698	تم مراجعة المركز لغرض صيانة في العكس الميكانيكي رخاوة بالبرغي مع تثبيت اليد السليكونية على القالب لانها كانت تفلت من القالب 		\N	\N	\N	\N
63	59	3	2026-01-18 13:55:12.29355	اليوم هي الجلسة الاولى للمريض بعد استشارته لدكتور مصطفى وبعد ان تعرف على مركزنا من خلال مواقع التواصل  حيث ان المريض يعاني من آلام مزمنة 		\N	\N	\N	\N
64	60	3	2026-01-18 14:10:00.707765	اليوم هي الجلسة الاولى للمريضة بعد ان تم تحويلها من قبل دكتور حسن ناجي جراح الجملة العصبية لمركزنا ومعاينتها من قبل دكتور مصطفى		\N	\N	\N	\N
65	61	3	2026-01-18 15:50:32.195275	بعد استشارة الدكتور مصطفى باشرت المريضة اليوم بأول جلسات الابر الصينية حيث ان المريضة تعاني من اختلاجات بالدماغ بحسب تشخيص الاطباء		\N	\N	\N	\N
66	21	1	2026-01-18 16:11:25.541467	تم مراجعة المركز لغرض التدريب 		\N	\N	\N	\N
67	62	1	2026-01-18 16:16:36.178845	تم مراجعة المركز لغرض التدريب 		\N	\N	\N	\N
68	35	4	2026-01-18 16:30:57.258607	تعيار قالب بسبب ضعف البتر		\N	\N	\N	\N
69	63	3	2026-01-18 18:45:29.141244	المريض اكمل اليوم جلسة ابر صينية بعد استشارة من قبل دكتور مصطفى حيث انه احد المرضى الذين باشروا معنا مسبقا سواء بالعلاج الطبيعي او جلسات الابر الصينية 		\N	\N	\N	\N
70	64	3	2026-01-19 08:26:23.79534	المريضة تعاني من ضمور بالدماغ، وقد راجعت مركزنا بتاريخ 23/08/2025، وتمت معاينتها وبدء العلاج تحت إشراف المعالج عبد الله خان، وهي مستمرة على الخطة العلاجية حتى تاريخه.		\N	\N	\N	\N
71	28	3	2026-01-19 08:39:15.226091	الجلسة الثالثة\n		\N	\N	\N	\N
74	24	3	2026-01-19 10:35:13.693079	الجلسة الخامسة 		\N	\N	\N	\N
77	72	3	2026-01-19 13:23:40.258652	الجلسة الثالثة 		\N	\N	\N	\N
78	73	3	2026-01-19 14:11:37.515996	باشر المريض معنا اليوم جلسته الاولى بعد ان تم تحويله من قبل طبيبه في ايران دكتور رضا اشراقي الى دكتور مصطفى وتمت الاستشارة من قبله اليوم 		\N	\N	\N	\N
79	60	3	2026-01-19 15:19:53.264451	اليوم هي الجلسة الثانية للمريضة بعد ان اشتركت معنا ببكج جلسات الكلاسك مشترك 		\N	\N	\N	\N
80	74	3	2026-01-19 16:05:47.901888	تم تجديد الدفع بجلسات كلاسك بكج 10 جلسات علمًا ان المريض من مرضانا القدماء بعد ان تم تحويلهم من قبل دكتور محمد علي فاخر		\N	\N	\N	\N
81	34	4	2026-01-19 16:07:44.884574	تدريب على القالب		\N	\N	\N	\N
82	75	4	2026-01-19 16:17:11.831833	تدريب على القالب		\N	\N	\N	\N
83	49	1	2026-01-19 16:18:04.733286	تم زيارة المركز لغرض التدريب 		\N	\N	\N	\N
84	76	1	2026-01-19 16:24:16.070171	تم مراجعة المركز لغرض لبس الطرف والتدريب عليه تم عمل تجميل للطرف وتسليم الطرف لها 		\N	\N	\N	\N
86	72	3	2026-01-20 06:03:04.204198	\N	خدمة جديدة: جلسات علاج إضافية - مفرد كلاسك متطور  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
87	23	2	2026-01-20 07:35:15.740312	تدريب على الطرف		\N	\N	\N	\N
88	77	3	2026-01-20 08:02:40.32167	الجلسة الاولى \n		\N	\N	\N	\N
89	78	3	2026-01-20 08:13:21.17367	الجلسة الاولى 		\N	\N	\N	\N
90	53	3	2026-01-20 08:18:26.506402	الجلسة الثالة 		\N	\N	\N	\N
91	79	3	2026-01-20 08:30:11.897935	الجلسة الاولى 		\N	\N	\N	\N
92	24	3	2026-01-20 08:58:38.793549	الجلسة السادسة \n		\N	\N	\N	\N
93	55	3	2026-01-20 09:33:04.606334	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 35,000 د.ع)	\N	\N	\N	\N
94	55	3	2026-01-20 09:33:36.374373	الجلسة الثامنة\n		\N	\N	\N	\N
149	28	3	2026-01-25 08:47:25.917269	الجلسة الثانية من البكج الثاني 		\N	\N	\N	\N
152	102	3	2026-01-25 13:51:56.353363	اتمت اليوم المريضة جلستها الثالثة المفردة		\N	\N	\N	\N
236	163	4	2026-01-28 16:46:51.335739	تعيار قالب		\N	\N	\N	\N
237	157	3	2026-01-28 16:49:09.689646	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
95	81	3	2026-01-20 13:45:05.981242	باشرت معنا المريضةاليوم بعد استشارة دكتور مصطفى بجلسات العلاج الطبيعي حيث تم تحويلها من قبل طبيبها الاختصاص في البصرة ووجهها لعمل علاج طبيعي 		\N	\N	\N	\N
96	73	3	2026-01-20 14:41:59.760809	باشر اليوم اليوم جلسته الثانية بعد ان دفع مبلغ 100 الف بكج 		\N	\N	\N	\N
1654	549	3	2026-02-28 09:02:34.396105	\N	استشارة اولية	استشارة طبية	\N	\N	morning
98	75	4	2026-01-20 14:54:04.224071	تدريب على القالب		\N	\N	\N	\N
99	34	4	2026-01-20 14:54:50.194668	تدريب على القالب		\N	\N	\N	\N
100	83	4	2026-01-20 15:24:49.604143	تم مراجعة المركز بسبب ضعف البتر عند المريض وتم تعديل القالب من قبل استاذ سيف ولم يستفيد المريض بسبب الضعف الزائد للبتر	يحتاج المريض لتبديل القالب السليكوني	\N	\N	\N	\N
102	63	3	2026-01-20 18:21:36.702316	جلسة ابر صينية 		\N	\N	\N	\N
103	72	3	2026-01-21 06:04:36.950643	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الخامسة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
104	64	3	2026-01-21 06:11:05.910097	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة رقم 51  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
105	78	3	2026-01-21 06:16:39.217803	الجلسة الثانية 		\N	\N	\N	\N
106	77	3	2026-01-21 06:39:20.802994	الجلسة الثانية 		\N	\N	\N	\N
107	53	3	2026-01-21 06:46:46.101305	الجلسة الرابعة 		\N	\N	\N	\N
108	23	2	2026-01-21 07:53:55.63094	تدريب على الطرف 	مراجع سابق 	\N	\N	\N	\N
109	86	3	2026-01-21 13:05:29.273639	الزياره الاولى 		\N	\N	\N	\N
110	87	3	2026-01-21 13:10:32.036781	الجلسة الاولى		\N	\N	\N	\N
111	24	3	2026-01-21 13:14:07.231104	الجلسة السابعة		\N	\N	\N	\N
112	28	3	2026-01-21 13:15:39.774191	الجلسة الرابعة		\N	\N	\N	\N
1677	425	3	2026-02-28 17:11:09.741349	\N		أجهزة علاج طبيعي	\N	\N	evening
114	88	4	2026-01-21 15:39:59.962022	استعلام		\N	\N	\N	\N
115	72	3	2026-01-22 06:07:31.659896	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة السادسة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
116	78	3	2026-01-22 07:12:45.304355	الجلسة الثالثة		\N	\N	\N	\N
117	53	3	2026-01-22 07:13:07.497568	الجلسة الخامسة		\N	\N	\N	\N
119	89	2	2026-01-22 07:41:22.787809	تم لبس الطرف والتدريب عليه 		\N	\N	\N	\N
120	93	3	2026-01-22 18:58:20.479198	باشر المريض معنا بجلسات الابر الصينية من شهر واكمل جلسته الجديدة علما ان المريض يكون ابن طبيب مشهور جدا في المحافظة وكذلك لديهم مستشفى خاص لكنه اختار مركزنا بالذات لحسن الإستقبال وكذلك النتائج التي ظهرت عليه ونسبه تشافيه على يد دكتور مصطفى  حيث إنه راجع العديد من المراكز والدول دون جدوى		\N	\N	\N	\N
121	94	3	2026-01-22 19:07:38.979699	تمت زيارة المريض ومباشرته بجلسة ابر بعد ان تم نصحه من قبل صديق له كان قد جربها سابقاً ولاحظ تحسن جد جداً 		\N	\N	\N	\N
122	64	3	2026-01-22 19:22:08.814105	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 250,000 د.ع)	\N	\N	\N	\N
124	64	3	2026-01-24 05:52:34.092734	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 53 (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
125	72	3	2026-01-24 05:56:12.058137	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة السابعة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
126	95	3	2026-01-24 06:02:07.454612	الجلسة الاولى 		\N	\N	\N	\N
127	96	3	2026-01-24 06:56:20.400603	الجلسة الاولى		\N	\N	\N	\N
128	77	3	2026-01-24 07:06:35.708502	الجلسة الرابعة		\N	\N	\N	\N
129	53	3	2026-01-24 07:25:33.398176	الجلسة السادسة 		\N	\N	\N	\N
130	97	3	2026-01-24 07:51:44.129273	الجلسة الاولى		\N	\N	\N	\N
132	23	2	2026-01-24 08:12:27.744256	تدريب على الطرف 		\N	\N	\N	\N
133	24	3	2026-01-24 08:23:53.432226	الجلسة التاسعة		\N	\N	\N	\N
134	28	3	2026-01-24 08:42:57.657862	\N	خدمة جديدة: جلسات علاج إضافية - اعادت المريضه تجديد البكج ب10 جلسات بعد اكمل ال6 جلسات \nبكج 10 جلسات الجلسة 25 الف كلاسك متطور (تكلفة: 250,000 د.ع)	\N	\N	\N	\N
135	56	3	2026-01-24 11:31:05.371129	الجلسة الثانية من بكج 5 جلسات 		\N	\N	\N	\N
137	103	3	2026-01-24 13:11:36.701164	باشر معنا بجلسات العلاج الطبيعي المفردة بعد استشارة دكتور مصطفى		\N	\N	\N	\N
138	102	3	2026-01-24 13:12:59.159146	باشرت المريضة معنا بجلسات العلاج الطبيعي بعد استشارة دكتور بيرم		\N	\N	\N	\N
139	105	3	2026-01-24 13:34:44.685055	باشر المريض اليوم بأولى جلساته بعد استشارة دكتور مصطفى حيث زادت الالام عنده بسبب عدم الالتزام بجلسات العلاج الطبيعي بعد العملية		\N	\N	\N	\N
140	106	3	2026-01-24 13:53:09.569765	المريضة اصيبت بجلطة في الدماغ بعد التعرض الى صدمة عصبية وباشرت اليوم اليوم باولى جلساتها بعد ان تعرفوا اهلها على مركزنا من خلال مواقع التواصل الاجتماعي 		\N	\N	\N	\N
141	107	3	2026-01-24 15:41:26.044912	باشر المريض بجلستة الاولى اليوم بعد استشارة دكتور مصطفى حيث ان المريض تم تحويله من قبل دكتور حسن ناجي بعد ان اجرى عمليته عنده		\N	\N	\N	\N
142	108	3	2026-01-24 16:23:27.712306	جددت المريضة جلساتها معنا علمًا انها مستمرة معنا لاكثر من شهر على نظام البكجات السابق التي تكون فيه الجلسة سعرها 35 الف 		\N	\N	\N	\N
143	63	3	2026-01-24 16:58:43.917927	جلسة اير صينية		\N	\N	\N	\N
144	95	3	2026-01-25 05:34:34.342073	الجلسة الثانية		\N	\N	\N	\N
146	72	3	2026-01-25 06:10:23.774092	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الثامنة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
147	77	3	2026-01-25 06:26:03.450956	الجلسة الخامسة والاخيرة من المدفوع للان 		\N	\N	\N	\N
148	53	3	2026-01-25 06:26:31.125343	الجلسة السابعة		\N	\N	\N	\N
151	103	3	2026-01-25 13:22:58.632093	الجلسة الثالثة المفردة للمريض 		\N	\N	\N	\N
118	90	2	2026-01-22 07:40:55.760262	تم لبس الطرف والتدريب عليه 	تم لبس الطرف والتدريب عليه 	\N	\N	\N	\N
101	84	3	2026-01-20 18:07:42.487772	المريضة قديمة ومستمرة بدفع جلسات كلاسك مفرد بسعر 20 الف بسبب انها باشرت معنا بشهر ال 12 يوم 29 بعد استشارة دكتور مصطفى وكانت الابر هي جلستها الاولى 		أجهزة علاج طبيعي	\N	\N	\N
150	90	2	2026-01-25 09:19:50.212512	تدريب على الطرف 	تدريب على الطرف 	\N	\N	\N	\N
131	98	2	2026-01-24 08:11:55.71749	تم لبس الطرف 	تم لبس الطرف والتدريب عليه 	\N	\N	\N	\N
153	64	3	2026-01-26 05:45:57.090399	المريضة ملتزمة بجلساتها حسب الجدول الزمني بين يوم ويوم حيث تعاني من ضمور بالدماغ وتحتاج الى جلسات مستمرة بالعلاج وتحت اشراف المعالج عبد الله خان		\N	\N	\N	\N
154	95	3	2026-01-26 06:07:46.150507	الجلسة الثالثة		\N	\N	\N	\N
155	72	3	2026-01-26 06:19:39.444005	الجلسة التاسعة تكلفتها 25 الف		\N	\N	\N	\N
156	53	3	2026-01-26 06:39:35.176781	الجلسة الثامنة 		\N	\N	\N	\N
1675	192	3	2026-02-28 16:59:21.940092	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
158	117	3	2026-01-26 07:33:58.830822	جاء اليوم لاخذ استشارة عند المعالج عبد الله خان كون المريض بحاجة ماسة للعلاج الطبيعي حيث يعاني المريض من ضمور بالدماغ ولادي...\nبعد اكمال الاستشارة طلب المباشرة مع الشفت المسائي كون والد الطفل منشغل لذلك تم تحديد وقت له على السابعة مساءا لكي يتلقى تمارين يدوية على يد المعالج علي جميل.		\N	\N	\N	\N
159	118	3	2026-01-26 08:28:14.232529	المريض مراجع سابق لمركزنا بتاريخ 23\\10 وتلقى الاستشارة والعلاج على يد المعالج عبد الله خان حيث اكمل سبع جلسات وتحصل على نتيجة جيدة اعادته لممارسة حياته اليومية...\nاليوم راجعنا بعد تعرضه لحادث سقط على المقعد مفاجئ مع كسر لاحد اصابع اليد حاليا  باشر بالعلاج مرة اخر بعد وضع له الخطة العلاجية المناسبة لحالته		\N	\N	\N	\N
160	28	3	2026-01-26 08:29:29.265194	الجلسة الثالثة من البكج الثاني		\N	\N	\N	\N
161	121	3	2026-01-26 09:18:13.764772	جاء اليوم لغرض الفحص والمعاينة تحت اشراف عبد الله خان حيث كان يتلقى جلسات علاج طبيعي في مستشفى المعاقين الحكومي لكن لم على اي نتيجة وبعد ملاحظة الاعلان الخاص بمركزنا من خلال التواصل الاجتماعي جاء اليوم لكي يباشر معنا بجلساته من يوم غد		\N	\N	\N	\N
162	122	3	2026-01-26 09:51:00.516797	جاءتنا المريضة اليوم لكي تكمل سلسلة من الجلسات العلاج الطبيعي مع المعالج عبد الله خان حيث كانت تعاني من انزلاق في الفقرات مع الالم في الرجل الايسر بعدها جاءت زيارة للطبيب التركي الاربعاء وتم اعطاء المريضة ابرة حقن بين الفقرات وبعد ذلك كتب لها برنامج علاجي يتم متابعته من قبل كادر مركزنا		\N	\N	\N	\N
163	55	3	2026-01-26 09:53:50.430127	الجلسة الرابعة مفردة على 25 الف		\N	\N	\N	\N
4389	1032	3	2026-04-18 14:31:58.414712	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4447	822	3	2026-04-19 05:26:53.105109	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
165	124	3	2026-01-26 11:16:49.52332	راجعتنا المريضة اليوم بعدما اخذت استشارة من قبل الطبيب التركي الذي قام بدوره بوضع خطة علاج طبيعي مكون من عدة اجهزة ولمدة شهرين واليوم باشرت باول جلساتها تحت اشراف المعالج عبد الله خان وبنظام الجلسات المفردة		\N	\N	\N	\N
166	125	3	2026-01-26 12:00:36.731669	راجعتنا بتاريخ 10\\1 لغرض اخذ جلسات علاج طبيعي بعدما اكملت عملية تبديل المفصل من قبل د. محمود شهاب ورقدت في المستشفى لمدة 4 ايام لغرض جلسات العلاج طبيعي ودفعت بكج حينها واليوم باشرت بالجلسة الاولى من البكج الثاني 		\N	\N	\N	\N
167	56	3	2026-01-26 12:27:23.865293	الجلسة الثالثة من بكج 5 جلسات		\N	\N	\N	\N
168	126	3	2026-01-26 12:44:26.304725	راجعنا المريض بتاريخ 19\\1 لغرض الفحص والمعاينة من قبل المعالج عبد الله خان كون المريض يعني من جلطة دماغية حادة لدرجة ياتي الى المركز بالسرير واليوم جلسته الرابعة من البكج		\N	\N	\N	\N
169	103	3	2026-01-26 13:41:24.971096	الجلسة الرابعة المفردة للمريض		\N	\N	\N	\N
170	130	3	2026-01-26 14:09:31.205655	باشر المريض جلسته الاولى معنا بعد استشارة دكتور مصطفى مسبقًا حيث تم تحويلة من قبل دكتور حيدر حازم الى مركزنا 		\N	\N	\N	\N
97	82	3	2026-01-20 14:52:50.950233	باشرت المريضة اليوم جلستها الاولى بعد ان شاهدت الاعلان عن المركز وبعد استشارة دكتور مصطفى		\N	\N	\N	\N
171	102	3	2026-01-26 14:43:11.779658	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
172	41	3	2026-01-26 15:10:52.884583	\N	خدمة جديدة: جلسات علاج إضافية - جلسات علاج اضافية بكج مكون من 5 جلسات  (تكلفة: 175,000 د.ع)	\N	\N	\N	\N
177	139	3	2026-01-26 18:32:25.662554	باشر المريض اليوم بجلسة جديدة بعد ان انهى معنا بكج سابقًا  وجدد جلسته ليومين اضافيات 		\N	\N	\N	\N
4458	474	3	2026-04-19 07:01:32.940647	\N	جلسة رقم 20 من البكج	تمارين تأهيلية	\N	\N	morning
176	137	3	2026-01-26 16:20:13.492581	باشرت المريضة اليوم بجلسة الابر الاولى بعد استشارة دكتور مصطفى 		\N	\N	\N	\N
174	135	3	2026-01-26 15:49:46.977333	باشرت المريضة هي واختها بجلسات العلاج الطبيعي بعد استشارة دكتور مصطفى 		\N	\N	\N	\N
178	95	3	2026-01-27 05:34:12.543019	الجلسة الرابعة 		\N	\N	\N	\N
179	147	3	2026-01-27 05:48:13.868243	الجلسة التاسعة من اصل باقة مكونة من 10 جلسات 		\N	\N	\N	\N
180	72	3	2026-01-27 05:54:46.415095	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة العاشرة كلفتها 25 الف  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
181	96	3	2026-01-27 07:30:04.010095	\N	خدمة جديدة: جلسات علاج إضافية - المريضة باشرت اليوم بالجلسة  الثانية مع دكتور عبد الله ببكج من 9 جلسات (تكلفة: 225,000 د.ع)	\N	\N	\N	\N
182	118	3	2026-01-27 07:50:10.178361	الجلسة الثانية من البكج		\N	\N	\N	\N
183	97	3	2026-01-27 07:54:05.680661	الجلسة الثالثة من البكج		\N	\N	\N	\N
4476	1049	3	2026-04-19 12:31:09.935477	\N	تم اخذ قياسات المسند للمريضه 	\N	\N	\N	morning
186	23	2	2026-01-27 08:02:28.692903	تدريب على اطرف 		\N	\N	\N	\N
187	149	3	2026-01-27 08:33:39.543299	الجلسة الاولى 		\N	\N	\N	\N
235	75	4	2026-01-28 16:40:09.684914	اعادة التجميل السابق واستلام الطرف		\N	\N	\N	\N
188	151	3	2026-01-27 09:06:53.72675	الجلسة الاولى مجانية		\N	\N	\N	\N
185	90	2	2026-01-27 08:01:54.665715	تدريب على الطرف 	تدريب على الطرف	\N	\N	\N	\N
189	153	3	2026-01-27 11:49:12.863826	حضرت المريضة للاستشارة بتاريخ 19/10/2025 تقريبًا لدى الدكتور عبد الله، وباشرت العلاج بتاريخ 26/10/2025، ولا تزال مستمرة بالجلسات حتى تاريخ اليوم. ويصادف اليوم جلستها السادسة والأخيرة من هذه الباقة (الباقة الرابعة).		\N	\N	\N	\N
190	152	3	2026-01-27 11:50:50.497217	راجعنا المريض بتاريخ 11\\1 وباشر معنا بتاريخ 13\\1 تحت اشراف المعالج عبد الله خان حيث دفع المريض بكج لعشر جلسات واليوم هي الجلسة السادسة من البكج 		\N	\N	\N	\N
191	150	3	2026-01-27 11:51:53.051364	جاء المريض للاستشارة عند الدكتور عبد الله خان بتاريخ 27/1/2026، وتم أخذ رقم هاتفه لتحديد موعد خاص له ليحضر على أساسه.		\N	\N	\N	\N
192	28	3	2026-01-27 12:22:59.560995	\tالجلسة الرابعة من البكج الثاني		\N	\N	\N	\N
193	92	3	2026-01-27 13:13:15.004281	الجلسة الخامسة من البكج		\N	\N	\N	\N
194	102	3	2026-01-27 13:14:06.732817	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
195	103	3	2026-01-27 13:14:30.009998	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
196	73	3	2026-01-27 13:20:04.704579	الجلسة السادسة من البكج		\N	\N	\N	\N
197	131	3	2026-01-27 13:30:12.151036	باشرت المريضة اليوم جلستها الاولى بعد استشارة دكتور مصطفى يوم امس 		\N	\N	\N	\N
198	129	3	2026-01-27 13:58:25.753821	اليوم الجلسة الثانية للمريض بعد استشارة دكتور مصطفى 		\N	\N	\N	\N
199	34	4	2026-01-27 15:07:09.459291	تدريب مع استلام القوالب		\N	\N	\N	\N
200	156	3	2026-01-27 15:23:47.196878	باشرت المريضة اليوم هي واختها بجلسات العلاج الطبيعي بعد استشارة دكتور مصطفى وبدات جلستها الاولى ب الابر الصينية حيث تم تحويلها من قبل دكتور حسن ناجي 		\N	\N	\N	\N
201	157	3	2026-01-27 15:25:18.615022	باشرت المريضة اليوم جلستها الاولى من العلاج الطبيعي بعد استشارة دكتور مصطفى حيث تم تحويلها هي واختها من قبل دكتور حسن ناجي 		\N	\N	\N	\N
202	158	3	2026-01-27 15:28:00.072096	باشر المريض اليوم جلسته الاولى من العلاج الطبيعي بعد استشارة دكتور مصطفى حيث تم تحويلة من قبل دكتور علي عبد الرضا واشترك معنا ببكج العشر جلسات علمًا ان المريض يعاني من جلطة بالدماغ اصابته في وقت قريب وانسداد بالشريان الوسطي 		\N	\N	\N	\N
203	155	3	2026-01-27 15:31:03.924968	باشر المريض اليوم جلسته الاولى من جلسات العلاج الطبيعي بعد استشارة دكتور مصطفى ببكج 6 جلسات حيث ان المريض تم تحويله من قبل دكتور علي عواد 		\N	\N	\N	\N
204	60	3	2026-01-27 15:32:24.880335	جلسة المريضة الاخيرة من البكج 		\N	\N	\N	\N
205	130	3	2026-01-27 15:32:53.548678	جلسة المريض الثانية 		\N	\N	\N	\N
206	107	3	2026-01-27 15:40:38.21398	الجلسة الرابعة من البكج		\N	\N	\N	\N
207	108	3	2026-01-27 17:05:29.921341	الجلسة الثالثة من البكج		\N	\N	\N	\N
4390	814	1	2026-04-18 14:49:39.460219	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
209	63	3	2026-01-27 18:21:26.358347	\N	خدمة جديدة: جلسات علاج إضافية - جلسة ابرة صينية  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
210	64	3	2026-01-28 05:25:06.225974	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة رقم 54  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
211	95	3	2026-01-28 05:31:18.85819	الجلسة الخامسة 		\N	\N	\N	\N
212	72	3	2026-01-28 06:03:47.118541	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
213	154	2	2026-01-28 07:28:44.117322	تدريب على الطرف		\N	\N	\N	\N
215	23	2	2026-01-28 07:31:29.347842	تدريب علىى الطرف 		\N	\N	\N	\N
4392	977	3	2026-04-18 15:02:33.219233	\N		أجهزة علاج طبيعي	\N	\N	evening
217	118	3	2026-01-28 08:01:50.692755	الجلسة الثالثة من البكج		\N	\N	\N	\N
218	28	3	2026-01-28 08:42:37.047279	الجلسة الخامسة من البكج الثاني		\N	\N	\N	\N
220	106	3	2026-01-28 09:10:12.083384	الجلسة الثانية لها معنا حيث اشتركت اليوم بالعرض المقدم من ادارة المركز وهو الاشتراك ب بكج ل6 ايام على ان تكون السابعة مجانية		\N	\N	\N	\N
221	55	3	2026-01-28 09:15:30.175333	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
222	161	3	2026-01-28 11:47:19.534824	راجع المريض الدكتور عبد الله للاستشارة بتاريخ 5/10/2025، وتمت مباشرة الجلسات العلاجية بعد تحديد الخطة العلاجية من قبل المعالج عبد الله خان. ولا يزال المريض مستمرًا في الجلسات العلاجية المخصصة له، حيث إن هذه الجلسة تُعد الجلسة الأولى من البكج الخامس.		\N	\N	\N	\N
223	125	3	2026-01-28 11:49:16.180517	الجلسة الثانية من البكج الثاني 		\N	\N	\N	\N
224	56	3	2026-01-28 11:50:20.989513	الجلسة الرابعة من بكج 5 جلسات		\N	\N	\N	\N
225	126	3	2026-01-28 12:07:23.024684	الجلسة الخامسة من البكج		\N	\N	\N	\N
226	73	3	2026-01-28 13:37:41.787219	الجلسة الاخيرة من البكج		\N	\N	\N	\N
227	92	3	2026-01-28 13:40:48.656763	الجلسة الاخيرة من البكج		\N	\N	\N	\N
228	130	3	2026-01-28 13:52:30.882096	جلسة المريض الثالثة 		\N	\N	\N	\N
229	129	3	2026-01-28 14:27:51.069864	الجلسة الثالثة للمريض		\N	\N	\N	\N
230	162	3	2026-01-28 15:16:28.033554	باشرت المريضة جلستها الاولى اليوم بعد استشارة دكتور مصطفى حيث تم تحويلها من قبل دكتور عمر عجيل بسبب ان المريضة تعارضت خلال هذا الشهر وصابتها اضرار في الجهاز الهضمي والتنفسي وعليه رقدت فترة في العناية المركزة ومن بعدها لم تمتلك المقدرة على الوقوف ولا على المشي 		\N	\N	\N	\N
231	41	3	2026-01-28 15:43:03.210833	الجلسة الثانية من البكج		\N	\N	\N	\N
232	105	3	2026-01-28 15:45:55.533313	الجلسة الرابعة من البكج		\N	\N	\N	\N
233	137	3	2026-01-28 16:23:00.818922	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة ببكج اليوم من 6 جلسات (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
234	155	3	2026-01-28 16:23:34.644204	الجلسة الثانية للمريض		\N	\N	\N	\N
214	90	2	2026-01-28 07:29:44.681377	تدريب على الطرف 	تدريب على الطرف	\N	\N	\N	\N
1679	322	3	2026-02-28 17:49:13.127872	\N		روبوت	\N	\N	evening
219	123	3	2026-01-28 08:54:48.128513	الجلسة الثامنة من البكج		\N	\N	\N	\N
238	74	3	2026-01-28 16:50:52.113132	الجلسة الرابعة من البكج		\N	\N	\N	\N
239	164	3	2026-01-28 18:28:49.535334	  باشر المريض اليوم بجلستة الاولى من البكج  بعد استشارة دكتور مصطفى حيث تم تحويله من قبل دكتور علي عواد بسبب مشكلة العصب السابع التي يعاني منها لاكثر من 5 سنوات بسبب عوامل نفسية 		\N	\N	\N	\N
4391	908	1	2026-04-18 14:51:43.612385	\N	جلسه علاج طبيعي تاسعه	أجهزة علاج طبيعي	\N	\N	evening
216	159	3	2026-01-28 07:56:36.693962	راجعنا المريض اليوم اجراء عملية ربط اوتار في لندن وتم توصيته بالعلاج الطبيعي والان اخذ استشارة من قبل المعالج عبد الله خان وغدا سوف يباشر رغم دفعه لبكج 5 جلسات		\N	\N	\N	\N
241	147	3	2026-01-29 05:07:51.847471	الجلسة العاشرة والاخيرة 		\N	\N	\N	\N
242	95	3	2026-01-29 05:36:01.316588	الجلسة السادسة والاخيرة من البكج 		\N	\N	\N	\N
243	72	3	2026-01-29 05:58:08.335082		 الجلسة رقم 12 كلفتها 25 الف (تكلفة: 25,000 د.ع) 	\N	\N	\N	\N
244	159	3	2026-01-29 06:53:45.311643	الجلسة الاولى من البكج 		\N	\N	\N	\N
245	154	2	2026-01-29 07:39:03.441514	تدريب على الطرف 		\N	\N	\N	\N
247	165	3	2026-01-29 07:41:26.509626	حضرت المريضة للاستشارة بتاريخ 28/1/2026 وباشرت العلاج مباشرتا بعد الاستشارة		\N	\N	\N	\N
248	122	3	2026-01-29 08:42:48.220352	الجلسة الثانية من البكج		\N	\N	\N	\N
249	28	3	2026-01-29 08:54:25.629922	الجلسة السادسة من البكج الثاني		\N	\N	\N	\N
1680	518	3	2026-02-28 17:49:31.551764	\N		تمارين تأهيلية	\N	\N	evening
251	168	3	2026-01-29 09:23:37.784516	جاء المريض للاستشارة لدى الدكتور عبد الله خان بتاريخ اليوم، وتمت إحالته إلى وحدة الرنين المغناطيسي والأشعة لغرض زيادة دقة التشخيص.\nوبناءً على التقييم الأولي، لن يتم البدء بجلسات العلاج حالياً، لكون الحالة تحتاج إلى مراجعة طبيب اختصاص مفاصل وعظام، وليس علاجاً طبيعياً في المرحلة الحالية.		\N	\N	\N	\N
252	161	3	2026-01-29 11:13:24.813881	الجلسة الثانية من البكج		\N	\N	\N	\N
253	153	3	2026-01-29 11:29:36.675513	الجلسة الاولى من البكج الجديد		\N	\N	\N	\N
254	125	3	2026-01-29 12:06:38.146518	الجلسة الثالثة من البكج		\N	\N	\N	\N
255	131	3	2026-01-29 13:16:15.001376	الجلسة الثانية للمريضة 		\N	\N	\N	\N
256	129	3	2026-01-29 14:12:06.697831	الجلسة الاخيرة من البكج		\N	\N	\N	\N
257	158	3	2026-01-29 14:40:47.15054	الجلسة الثانية للمريض		\N	\N	\N	\N
258	171	3	2026-01-29 15:17:10.280777	باشرت المريضة جلستها الاولى معنا بعد استشارة دكتور مصطفى حيث تم تحويل المريضة من قبل دكتور حسن ناجي 		\N	\N	\N	\N
259	105	3	2026-01-29 16:13:16.270756	الجلسة الخامسة من البكج		\N	\N	\N	\N
260	155	3	2026-01-29 16:13:59.837624	الجلسة الثالثة للمريض 		\N	\N	\N	\N
262	137	3	2026-01-29 17:22:45.173685	الجلسة الثانية من البكج		\N	\N	\N	\N
263	107	3	2026-01-29 17:23:11.386775	الجلسة الخامسة من البكج		\N	\N	\N	\N
264	156	3	2026-01-29 17:23:35.42554	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
265	157	3	2026-01-29 17:24:12.791887	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
266	135	3	2026-01-29 18:32:42.07165	ابر صينية	خدمة جديدة: جلسات علاج إضافية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
267	137	3	2026-01-29 18:44:11.328536	\N	خدمة جديدة: جلسات علاج إضافية - ابر صينية  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
268	164	3	2026-01-29 18:47:20.952102	الجلسة الثانية من البكج		\N	\N	\N	\N
269	92	3	2026-01-29 19:22:17.167817	جلسة مجانية من ضمن البكج حسب العرض المقدمة من ادارة المركز.		\N	\N	\N	\N
270	60	3	2026-01-29 19:22:50.419725	جلسة مجانية من ضمن البكج حسب العرض المقدمة من ادارة المركز.		\N	\N	\N	\N
271	118	3	2026-01-29 19:25:39.16686	الجلسة الرابعة من البكج		\N	\N	\N	\N
272	64	3	2026-01-31 05:14:29.184577	الجلسة رقم 55		\N	\N	\N	\N
273	64	3	2026-01-31 05:14:53.307961	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة رقم 55 (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
274	95	3	2026-01-31 05:40:08.937197	بعد اكمال البكج دفع المريض لجلستين اضافية  		\N	\N	\N	\N
275	72	3	2026-01-31 06:03:04.174242	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 13\n (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
276	97	3	2026-01-31 07:03:32.406098	الجلسة الرابعة من البكج 		\N	\N	\N	\N
277	96	3	2026-01-31 07:17:32.949695	الجلسة الثالثة من البكج		\N	\N	\N	\N
278	122	3	2026-01-31 07:26:18.073712	الجلسة الثالثة من البكج 		\N	\N	\N	\N
279	118	3	2026-01-31 07:28:46.215314	الجلسة الخامسة من البكج 		\N	\N	\N	\N
184	79	3	2026-01-27 07:56:23.207682	الجلسة الرابعة من البكج الثاني		\N	\N	\N	\N
280	79	3	2026-01-31 07:36:00.011784	الجلسة الخامسة والاخيرة من البكج الحالي 		\N	\N	\N	\N
282	28	3	2026-01-31 08:46:37.52356	الجلسة السابعة من البكج الثاني		\N	\N	\N	\N
284	159	3	2026-01-31 09:12:55.880282	الجلسة الثانية من البكج		\N	\N	\N	\N
285	166	2	2026-01-31 09:34:23.279812	تدريب على الطرف		\N	\N	\N	\N
286	23	2	2026-01-31 09:34:54.397651	تدريب على الطرف 		\N	\N	\N	\N
287	125	3	2026-01-31 11:03:33.233304	\tالجلسة الرابعة من البكج		\N	\N	\N	\N
288	161	3	2026-01-31 11:11:55.994451	الجلسة الثالثة من البكج 		\N	\N	\N	\N
289	56	3	2026-01-31 11:26:03.531445	الجلسة الخامسة من بكج 5 جلسات		\N	\N	\N	\N
281	173	3	2026-01-31 08:45:54.584564	حضر المريض للاستشارة عند الدكتور عبد الله خان بتاريخ 21/1/2026 وبدا الجلسة الاولى بعد الاستشارة مباشرتا..... وحضر اليوم بتاريخ 31/1/2026 للجلسة الثانية		\N	\N	\N	\N
290	131	3	2026-01-31 13:08:21.845318	الجلسة الثالثة 		\N	\N	\N	\N
291	73	3	2026-01-31 13:11:37.108888	الجلسة المجانية من ضمن العرض 		\N	\N	\N	\N
292	158	3	2026-01-31 13:14:41.675587	الجلسة الثالثة 		\N	\N	\N	\N
293	177	3	2026-01-31 14:07:36.7942	مريضة د.حسن ناجي جلسات مجانية سبق وان اخذنا موافقة دكتور ياسر علما ان المريضة متكفل بها دكتور حسن بعلاجها وعمليتها ومعيشتها		\N	\N	\N	\N
294	41	3	2026-01-31 15:17:22.889479	الجلسة الثالثة من البكج		\N	\N	\N	\N
295	108	3	2026-01-31 16:00:15.975222	الجلسة اارابعة من البكج		\N	\N	\N	\N
246	90	2	2026-01-29 07:39:39.261993	تدريب على الطرف 	تدريب على الطرف	\N	\N	\N	\N
296	155	3	2026-01-31 16:03:44.105938	الجلسة الرابعة من البكج		\N	\N	\N	\N
297	178	3	2026-01-31 16:13:57.685587	المريض راقد في الطابق وعلى الطبيب علي رشيد الاسماعيلي حيث تعرض الى جلطة دماغية فقد على اثرها الحركة والنطق حيث بلغنا ان المريض تكفلت المستشفى بادارة حجي رحمن  بعلاجه وتم تبليغنا من قبل  دكتور ياسر بالمباشر معه بالعلاج		\N	\N	\N	\N
299	34	4	2026-01-31 16:41:03.253484	اعادة التجميل القديم  للاطراف وتسديد اجور التغليف		\N	\N	\N	\N
300	34	4	2026-01-31 16:44:39.795588	اعادة التجميل القديم للاطراف		\N	\N	\N	\N
301	156	3	2026-01-31 17:04:56.867163	\N	خدمة جديدة: جلسات علاج إضافية - ابر صينية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
302	137	3	2026-01-31 17:06:24.460886	لجلسة الرابعة من البكج		\N	\N	\N	\N
303	157	3	2026-01-31 17:07:36.392925	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
304	107	3	2026-01-31 17:08:16.010245	لجلسة السادسة من البكج		\N	\N	\N	\N
305	109	5	2026-01-31 17:21:41.591564	تم تسليم الطرف للمريض بعد اجراء التدريب الاولي وسوف يرجع الاسبوع القادم لغرض الفحص والمتابعه 		\N	\N	\N	\N
1656	467	3	2026-02-28 09:03:30.866879	\N	الجلسة الرابعة من البكج 	روبوت	\N	\N	morning
307	180	3	2026-01-31 17:43:22.539641	جلسة مجانية		\N	\N	\N	\N
298	74	3	2026-01-31 16:22:52.900897	الجلسة الخامسة من البكج...\nكذلك تم اخذ قياسات لعمل مساند \n		\N	\N	\N	\N
308	164	3	2026-01-31 17:53:54.274241	الجلسة الثالثة من البكج		\N	\N	\N	\N
4448	822	3	2026-04-19 05:27:01.894538	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
310	95	3	2026-02-01 05:30:18.162295	الجلسة الثانية 		\N	\N	\N	\N
312	72	3	2026-02-01 06:22:38.101818	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
323	151	3	2026-02-01 09:29:44.87878	الجلسة الثالثة مجانية		\N	\N	\N	\N
311	181	3	2026-02-01 06:20:49.576729	مراجعة قديمة كانت آخر جلسة علاجية بتاريخ 25/12/2025. بعد ذلك تعرّضت المريضة إلى كسر في الساق، مما استدعى تأجيل الجلسات المتبقية من البكج. البكج الأصلي يتكوّن من 10 جلسات، تم تنفيذ 4 جلسات، ويتبقى 6 جلسات. اليوم راجعت المريضة لاستكمال الجلسات المتبقية والاستمرار في الخطة العلاجية.\nواليوم الجلسة الخامسة من البكج		\N	\N	\N	\N
313	159	3	2026-02-01 07:24:59.603418	\tالجلسة الثالثة من البكج		\N	\N	\N	\N
1657	433	3	2026-02-28 09:24:05.688553	\N	الجلسة الخامسة من البكج \n	أجهزة علاج طبيعي	\N	\N	morning
315	121	3	2026-02-01 07:34:19.089	جاء المراجع اليوم لجلسته الاولى بعد تحديد الموعد باشتراك بكج 6 جلسات بالاضافة الى الجلسة المجلنية من ضمن العرض 		\N	\N	\N	\N
317	122	3	2026-02-01 07:51:28.894	الجلسة الرابعة من البكج		\N	\N	\N	\N
318	118	3	2026-02-01 08:08:02.86	الجلسة السادسة من البكج		\N	\N	\N	\N
331	177	3	2026-02-01 13:27:59.783061	جلسة مجانية		\N	\N	\N	\N
332	189	3	2026-02-01 13:49:12.342695	زارتنا المريضة اليوم بعد التحويل من قبل الدكتور حسن ناجي المريضة تعرضت لحادث سقوط في البيت ادى الى جلوس المريضة دون اخذ جلسات علاج طبيعي الى ان وصلت الى حالة تجمد في المفصل 		\N	\N	\N	\N
1674	553	3	2026-02-28 16:49:11.193127	\N	المريض باشر اليوم بجلسته الاولى من بكج 6 جلسات حيث اجرى عملية قبل 3 اشهر من قبل دكتور حسن ناجي وتم تحويله لمركزنا لإكمال جلساته من العلاج والتأهيل	أجهزة علاج طبيعي	\N	\N	evening
319	28	3	2026-02-01 08:46:19.081	الجلسة الثامنة من البكج الثاني		\N	\N	\N	\N
320	165	3	2026-02-01 08:51:10.928	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الثانية  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
321	183	3	2026-02-01 09:16:54.430749	حضرت المريضه لاخذ القياسات المناسبة للطرف الاصطناعي تحت اشراف المهندس احمد 		\N	\N	\N	\N
322	55	3	2026-02-01 09:21:38.259712	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 11 (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1676	541	3	2026-02-28 17:05:24.387775	\N	المريضة اليوم اخذت جلستها الثانية من المبلغ المدفوع مسبقًا	أجهزة علاج طبيعي	\N	\N	evening
325	152	3	2026-02-01 11:14:44.48655	الجلسة السابعة 		\N	\N	\N	\N
326	161	3	2026-02-01 11:26:38.676912	الجلسة الرابعة من البكج		\N	\N	\N	\N
327	153	3	2026-02-01 11:26:58.92386	الجلسة الثانية من البكج 		\N	\N	\N	\N
334	83	4	2026-02-01 14:18:45.880804	اخذ قالب جديد بسبب ضعف الطرف المبتور بعد اخذ موافقة استاذ عمر		\N	\N	\N	\N
329	186	3	2026-02-01 12:40:33.877098	مريض راقد في الطابق الرابع بتاريخ 27/1/2026، تحت إشراف الدكتور علي رشيد اخصائي الجملة العصبية. تم تقديم طلب من قبل الدكتور علي رشيد لبدء جلسات العلاج الطبيعي للمريض داخل غرفته.		\N	\N	\N	\N
330	187	3	2026-02-01 12:44:38.559096	مريض راقد في الطابق الرابع بتاريخ 27/1/2026، تحت إشراف الدكتور علي رشيد اخصائي الجملة العصبية. تم تقديم طلب من قبل الدكتور علي رشيد لبدء جلسات العلاج الطبيعي للمريض داخل غرفته.		\N	\N	\N	\N
1678	322	3	2026-02-28 17:34:47.132526	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
335	191	3	2026-02-01 14:28:39.794153	المريضة اليوم هو اخر يوم لها من بكج سابق لكنها جددت بكج 5 جلسات 		\N	\N	\N	\N
336	192	3	2026-02-01 14:35:33.13547	المريضة مباشرة معنا منذ وقت سابق وهي من االعوائل المتعففة والشهداء وجلساتها مجانية بعد الإستئذان من دكتور ياسر المحترم 		\N	\N	\N	\N
337	193	4	2026-02-01 14:39:35.751119	استعلام عن محجر عين وتم عرض الاعمال السليكونية لمراكزنا وتم عرض سعر الجزء السليكوني المقدر ب3375000 وتم اخذ صور للحالة من قبل استاذ سيف		\N	\N	\N	\N
338	190	3	2026-02-01 15:25:03.042613	جددت المريضة بكج اخر بعد ان انتهت جلساتها 		\N	\N	\N	\N
339	158	3	2026-02-01 15:26:32.34968	الجلسة الرابعة 		\N	\N	\N	\N
328	185	2	2026-02-01 12:09:28.944649	تم الفحص وتحديد له طرف ثابت فوق الركبة حسب امكانيته المادية علما انه تم عرض له كافة الاطراف / تم اخذ قالب 		\N	\N	\N	\N
316	23	2	2026-02-01 07:38:47.725	تدريب على الطرف 		\N	\N	\N	\N
340	194	3	2026-02-01 15:30:32.498214	الجلسة الاخيرة من البكج للمريضة اليوم 		\N	\N	\N	\N
341	155	3	2026-02-01 16:06:27.988574	الجلسة الخامسة		\N	\N	\N	\N
342	105	3	2026-02-01 16:20:19.597555	الجلسة الاخيرة من البكج		\N	\N	\N	\N
343	108	3	2026-02-01 16:23:44.682655	الجلسة الخامسة 		\N	\N	\N	\N
344	137	3	2026-02-01 16:49:52.611783	الجلسة الخامسة من البكج		\N	\N	\N	\N
333	188	3	2026-02-01 14:09:17.352928	عند حضورها لاحد المناسبات تعرضت فجاة الى اغماء وعند اخبار اهلها وتم اخذها الى المستنشفلى اخبرهم الطبيب بوفاتها لكن احد الاطباء تدخل وعمل لها (CPR) اعاد لها الحياة لكنها بقت راقدة الفراش لذلك باشرت اليوم بالجلسة الاولى تحت اشراف المعالج مصطفى العضاض		\N	\N	\N	\N
345	157	3	2026-02-01 16:54:40.871808	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
346	164	3	2026-02-01 17:08:31.064682	الجلسة الرابعة من البكج		\N	\N	\N	\N
347	72	3	2026-02-03 11:37:31.649587	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 16  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
348	122	3	2026-02-03 11:41:09.294023	الجلسة السادسة والاخيرة من البكج 		\N	\N	\N	\N
349	96	3	2026-02-03 11:42:04.817897	الجلسة الرابعة من البكج 		\N	\N	\N	\N
350	115	2	2026-02-03 11:42:08.075264	تم لبس الطرف والتدريب عليه واستلام الطرف		\N	\N	\N	\N
351	28	3	2026-02-03 11:42:38.249184	الجلسة العاشرة والاخيرة 		\N	\N	\N	\N
353	55	3	2026-02-03 11:45:37.939388	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 12  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
354	178	3	2026-02-03 11:46:15.374242	الجلسة الثالة 		\N	\N	\N	\N
355	181	3	2026-02-03 11:46:50.431589	الجلسة السادسة من البكج 		\N	\N	\N	\N
357	196	2	2026-02-03 11:49:56.28821	مراجع جديد/تم الفحص وعرض عليه اطراف تحت الركبة / تم الاتفاق على طرف نوع شتل لوك بقيمة 3500000 وبانتظار الدفع  	لديه كتاب تخفيض 	\N	\N	\N	\N
358	197	2	2026-02-03 12:06:41.320085	مراجع جديد / تم الفحص وعرض له اطراف صناعية وتم الاتفاق مبدئيا على طرف نوع ميتز روسي بسعر 10500000 بعد التخفيض  	لديه كتاب تخفيض 	\N	\N	\N	\N
359	198	3	2026-02-03 12:10:31.631776	حضر المريض للاستشارة، وباشر بالعلاج مباشرةً بعد الاستشارة.\nالجلسة الاولى		\N	\N	\N	\N
360	199	2	2026-02-03 12:11:35.584572	تم الفحص وارسال فيديو الى د ياسر / تحويلهم الى مركز بغداد بأنتظار تحديد نوع المسند 	لديه كتاب تخفيض 	\N	\N	\N	\N
361	200	3	2026-02-03 12:13:40.64046	حضرت المريضة للاستشارة بتاريخ 27/12/2025، وباشرت بالعلاج المخصص من قبل الدكتور حيدر حازم بمعدل جلستين أسبوعيًا، حيث أكملت (7) جلسات، ثم انقطعت عن العلاج بسبب ظرف خاص، وكانت آخر جلسة لها بتاريخ 17/1/2026، وعادت اليوم لاستكمال الجلسات العلاجية، وتُعد جلسة اليوم الجلسة الثامنة.		\N	\N	\N	\N
362	201	3	2026-02-03 12:19:19.756974	حضرت المريضة للاستشارة لدى الدكتور عبد الله بتاريخ 2/2/2026، وبدأت اليوم بالجلسة العلاجية الأولى. كما راجعت الدكتور حيدر الكناني، الذي أوصى بإجراء عملية تبديل مفصل، على أن يسبقها علاج طبيعي لمدة ثلاثة أشهر.\nالجلسة الاولى 		\N	\N	\N	\N
363	202	3	2026-02-03 12:24:10.114783	استشارة اولية 		\N	\N	\N	\N
364	203	3	2026-02-03 12:29:55.287301	حضر المريض للاستشارة، وتبيّن أن حالته تحتاج إلى تدخل جراحي، ولا يُنصح بالعلاج الطبيعي في الوقت الحالي.		\N	\N	\N	\N
365	204	3	2026-02-03 12:36:14.697818	حضر المريض للاستشارة وأخذ الجلسة الأولى بتاريخ 2/2/2026 في الشفت المسائي، وتم تحويله اليوم إلى الشفت الصباحي، وباشر بالجلسة الأولى من باكج مكوّن من (6) جلسات.		\N	\N	\N	\N
366	205	3	2026-02-03 12:46:24.492763	حضر المريض للاستشارة لدى الدكتور عبد الله خان قبل أكثر من أسبوعين، وبدأ اليوم جلسات العلاج بعد تحديد الوقت المناسب له. يعاني المريض من ورم خبيث في الدماغ، وهو حاليًا بصدد تلقي جرعات علاج كيميائي.\nالجلسة الاولى من البكج 		\N	\N	\N	\N
367	206	3	2026-02-03 12:53:49.271095	حضرت المريضة للاستشارة بتاريخ 13/12/2025، وباشرت بالعلاج مباشرةً بعد الاستشارة. لاحقًا توقفت عن العلاج لفترة بسبب الامتحانات والمرض بعد انتهائها، وكانت قد وصلت إلى الجلسة السابعة من باكج مكوّن من (10) جلسات، وكانت آخر جلسة بتاريخ 25/12/2025. ثم عادت لاستكمال الجلسات بتاريخ 2/2/2026، وتُعد جلسة اليوم الجلسة التاسعة من الباكج.		\N	\N	\N	\N
1658	298	3	2026-02-28 09:30:31.442439	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
369	153	3	2026-02-03 12:56:20.202904	الجلسة الثالثة من البكج 		\N	\N	\N	\N
370	189	3	2026-02-03 13:21:58.694413	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
371	158	3	2026-02-03 13:26:52.903236	الجلسة السادسة		\N	\N	\N	\N
372	177	3	2026-02-03 13:27:28.178822	جلسة مجانية		\N	\N	\N	\N
373	188	3	2026-02-03 14:17:40.410951	الجلسة الثانية من البكج		\N	\N	\N	\N
375	207	3	2026-02-03 15:44:56.182781	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة المفردة الاولى للمريض (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
374	207	3	2026-02-03 15:18:19.507565	تعرض المريض الى حادث سير في 11/9/2023 في كربلاء والتي من خلالها تعرض الى كسر مركب حيث اجرى هناك عدة عمليات 		\N	\N	\N	\N
376	195	4	2026-02-03 15:54:22.743727	استعلام عن مسند بارشيال بتاريخ 1/2/2026		\N	\N	\N	\N
1687	456	3	2026-02-28 18:28:49.111011	\N		أجهزة علاج طبيعي	\N	\N	evening
378	107	3	2026-02-03 16:38:46.952146	\N	خدمة جديدة: جلسات علاج إضافية - البكج الثاني للمريض من 6 جلسات علمًا انه بتحويل من دكتور حسن ناجي (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
379	156	3	2026-02-03 16:56:40.662412	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
356	151	3	2026-02-03 11:47:24.963833	الجلسة الرابعة مجانية		\N	\N	\N	\N
468	240	3	2026-02-07 08:38:16.400201	حضر المريض لاخذ قياسات الطرف تحت اشراف المهندس احمد 		\N	\N	\N	\N
352	121	3	2026-02-03 11:43:25.76792	الجلسة الثانية من البكج		\N	\N	\N	\N
472	204	3	2026-02-07 10:52:40.093504	الجلسة الثالثة من البكج 		\N	\N	\N	\N
380	210	3	2026-02-03 16:59:00.403044	باشرت المريضة اليوم جلستها الاولى علمًا انها كانت قد جاءت يوم  2/2 استشارة مساءًا		\N	\N	\N	\N
381	137	3	2026-02-03 17:11:14.385677	الجلسة السادسة من البكج		\N	\N	\N	\N
382	202	3	2026-02-03 17:15:40.002199	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض اليوم جلسته الاولى المفردة حيث تم تحويله من قبل دكتور حسن ناجي (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
4393	1034	3	2026-04-18 15:11:36.390327	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
384	164	3	2026-02-03 18:30:04.656847	الجلسة السادسة		\N	\N	\N	\N
385	201	3	2026-02-04 05:47:13.107882	\N	خدمة جديدة: جلسات علاج إضافية - بكج 3 جلسات 25 الف لكل جلسة  (تكلفة: 75,000 د.ع)	\N	\N	\N	\N
386	72	3	2026-02-04 06:09:55.995975	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 17  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
387	147	3	2026-02-04 06:35:32.195525	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
388	165	3	2026-02-04 07:06:42.564451	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الرابعة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
389	122	3	2026-02-04 07:08:39.867949	الجلسة المجانية من العرض 		\N	\N	\N	\N
390	79	3	2026-02-04 07:38:20.118718	\N	خدمة جديدة: جلسات علاج إضافية - بكج 4 جلسات 25 للجلسة الواحدة  (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
391	214	3	2026-02-04 08:51:03.045091	استشارة اولية لمريض تحويل من دكتور علي رشيد		\N	\N	\N	\N
393	206	3	2026-02-04 09:02:48.406151	الجلسة العاشرة والاخيرة من البكج 		\N	\N	\N	\N
471	98	2	2026-02-07 10:36:52.197477	تم عمل صيانة 	مراجع سابق 	\N	\N	\N	\N
324	184	2	2026-02-01 11:13:05.194191	تم فحصها وتحديد يد تجميلية تحت المرفق \nاولا  عرض لها السعر بالمخفض بانتظار اخذ قياسات وتسديد مبلغ \nاو اخذ قالب لها واعطائها يد استعاره لحين اكمال الزواج واسترجاعها \nعلم يتم استقطاع مبلغ القالب كامل . علما سعر اليد 5 مليون دينار عراقي وسعر القالب الكاربوني 1600000	مراجع جديد	\N	\N	\N	\N
395	204	3	2026-02-04 10:17:22.091048	الجلسة الثانية من البكج 		\N	\N	\N	\N
396	215	3	2026-02-04 11:09:16.087677	استشارة اولية 		\N	\N	\N	\N
397	56	3	2026-02-04 11:20:13.35625	\N	خدمة جديدة: جلسات علاج إضافية - بكج لاربعة جلسات على 25 الف (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
399	198	3	2026-02-04 11:59:03.856958	الجلسة الثانية 		\N	\N	\N	\N
408	158	3	2026-02-04 13:14:22.681497	الجلسة السابعة		\N	\N	\N	\N
402	218	3	2026-02-04 12:22:32.86354	استشارة اولية 		\N	\N	\N	\N
400	216	2	2026-02-04 12:09:03.024273	مراجع جديد /تم صرف طرف مجاني شتل لوك تيتانيوم مع قدم سنكل من قبل د.ياسر / تم اخذ قالب (م محمد )	مجاني 	\N	\N	\N	\N
409	189	3	2026-02-04 13:15:54.71002	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
410	212	3	2026-02-04 13:17:22.370688	الجلسة الثانية من البكج المكون من 6 جلسات		\N	\N	\N	\N
411	192	3	2026-02-04 13:57:21.252773	جلسة مجانية 		\N	\N	\N	\N
412	73	3	2026-02-04 14:02:12.615214	الجلسة الثانية من المبلغ المدفوع يوم 2/2		\N	\N	\N	\N
403	219	2	2026-02-04 12:30:13.377065	مراجع جديد /الصيانة مجانية من قبل دكتور ياسر /صيانة قالب + سليف مجاني	مجاني 	\N	\N	\N	\N
401	217	2	2026-02-04 12:21:33.343713	مراجع جديد /تم صرف طرف صناعي نوع بايونك فوق الركبة من قبل دكتور ياسر/ تم اخذ قالب من قبل م.محمد	مجاني 	\N	\N	\N	\N
404	220	2	2026-02-04 12:42:52.004562	مراجع جديد / تم صرف طرف مسندي مجاني من قبل دكتور ياسر /تم اخذ قالب من قبل م مصطفى	مجاني 	\N	\N	\N	\N
413	60	3	2026-02-04 14:28:15.903434		خدمة جديدة: جلسات علاج إضافية - بكج ثاني للمريضة  (تكلفة: 125,000 د.ع)	\N	\N	\N	\N
406	221	2	2026-02-04 12:54:14.365716			\N	\N	\N	\N
405	221	2	2026-02-04 12:54:05.740902	مراجع جديد / تم صرف له طرف فوق الركبة بايونك من قبل دكتور ياسر / تم اخذ قالب من قبل م مصطفى 	مجاني 	\N	\N	\N	\N
407	131	3	2026-02-04 13:14:03.729941	الجلسة الخامسة		\N	\N	\N	\N
414	223	3	2026-02-04 15:10:33.125744	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الاولى للمريض من بعد الاستشارة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
415	41	3	2026-02-04 15:11:14.894862	الجلسة الخامسة من البكج		\N	\N	\N	\N
416	224	3	2026-02-04 15:33:24.584152	راجعتنا المريضة بتاريخ 4\\1 بعد ان شاهدت اعلان مركزنا من خلال تطبيق الفيس بوك واخذت حينها استشارة وجلسة تحت اشراف المعالج المختص مصطفى العضاض حيث اكملت 12 جلسة معه واليوم جاءت لتعاود جلساتها وبنفس النظام السابق حيث كان نظامها كلاسك 15 الف والان سوف تدفع بكج ل 6 جلسات على 15 الف		\N	\N	\N	\N
417	208	3	2026-02-04 15:52:19.015695	الجلسة الثانية من البكج		\N	\N	\N	\N
418	108	3	2026-02-04 16:31:59.284507	الجلسة الاخيرة من البكج		\N	\N	\N	\N
419	210	3	2026-02-04 16:39:41.128617	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة المفردة الثانية  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
420	222	3	2026-02-04 16:59:07.267452	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة المفردة الاولى للمريضة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
421	205	3	2026-02-05 05:03:00.180039	الجلسة الثانية من البكج		\N	\N	\N	\N
422	201	3	2026-02-05 06:15:54.475425	الجلسة الثانية من دفعة من البكج		\N	\N	\N	\N
423	72	3	2026-02-05 06:29:54.020849	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
470	184	2	2026-02-07 10:33:15.050574	تم استلام القالب مع اعارة اليد التجميلية	مراجع سابق 	\N	\N	\N	\N
398	161	3	2026-02-04 11:26:29.499167	الجلسة السادسة من البكج 		\N	\N	\N	\N
394	184	2	2026-02-04 09:53:23.346452	تم الاتفاق على اخذ قالب فقط حاليا بمبلغ 1500000 \nعلى يد تجميلية جاهزة * استعارة لحين تكمله الزواج 	مراجع سابق 	\N	\N	\N	\N
473	198	3	2026-02-07 10:53:41.384429	الجلسة الرابعة من البكج 		\N	\N	\N	\N
474	56	3	2026-02-07 11:07:52.454653	الجلسة الثانية من البكج 		\N	\N	\N	\N
475	161	3	2026-02-07 11:10:01.245782	الجلسة الثامنة من البكج		\N	\N	\N	\N
476	242	3	2026-02-07 11:59:37.199883	استشارة اولية 		\N	\N	\N	\N
392	123	3	2026-02-04 08:58:57.285919	الجلسة العاشرة والاخيرة من البكج 		\N	\N	\N	\N
424	225	3	2026-02-05 07:15:23.352433	راجعتنا المريضة اليوم بعد ان تعرفت على مركزنا من خلال التواصل الاجتماعي (الفيس بوك) حيث كانت تعاني من الالم حاد في الركبة مما اجبر المريضة للمراجعة الى ايران واخذ حقن جيلاتين بالركبة ومن ثم حقن بلازما في كربلاء ومن ثم علاج طبيعي في بغداد لكن دون نتيجة تذكر لذلك جاءت اليوم الى مركزنا واخذت استشارة تحت اشراف المعالج المختص عبد الله خان ومن ثم باشرت بالجلسات حيث دفعت المريضة ثمانية جلسات		\N	\N	\N	\N
426	165	3	2026-02-05 08:02:42.06035	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
427	121	3	2026-02-05 08:18:29.101148	الجلسة الثالثة من البكج\n		\N	\N	\N	\N
250	151	3	2026-01-29 09:06:15.929106	الجلسة الثانية مجانية		\N	\N	\N	\N
428	55	3	2026-02-05 09:33:45.185079	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
429	218	3	2026-02-05 10:06:36.238876	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
458	107	3	2026-02-05 17:52:45.18083	الجلسة الثانية من البكج		\N	\N	\N	\N
430	227	2	2026-02-05 10:42:57.897517	شراء سليف البس 	مراجع سابق 	\N	\N	\N	\N
431	228	3	2026-02-05 10:47:47.587597	زارنا المريض بعد ان راجع المستشفى لاجراء بعض الفحوصات وشاهد المركز عنده مروره بالطابق الثالث عندما كانت استشارات المستشفى موجودة بنفس الطابق مؤقتا علما ان المريض تعرض الى حادث سير تسبب له بشلل نصفي والان جاء لاخذ الاستشارة من المعالج المختص عبد الله خان		\N	\N	\N	\N
425	226	3	2026-02-05 07:57:38.878435	راجعنا المريض مع زوجته بعد التعرف على مركزنا من خلال التواصل الاجتماعي (الفيس بوك) حيث كان يعني من انزلاق بالفقرات من اثر سقوط قديم اثناء ممارسة رياضة كرة القدم ومع هذا تجاهل المريض الحادثة مما اصبحت ملازمه له منذ سنوات عدة وقبل فترة بدا بمراجعة العلاج الطبيعي في بغداد ولكن دون اي نتيجة تذكر واليوم جاء لاخذ الاستشارة الاولية ومن ثم بدا بالمباشرة		\N	\N	\N	\N
432	229	2	2026-02-05 11:05:29.47554	تم تسديد مبلغ قسط بقيمة 200000 والباقي 1300000	مراجع سابق	\N	\N	\N	\N
433	198	3	2026-02-05 11:06:00.178485	الجلسة الثالثة من البكج		\N	\N	\N	\N
434	232	2	2026-02-05 11:09:18.286204	لديه كتاب تخفيض 	مراجع سابق 	\N	\N	\N	\N
435	230	2	2026-02-05 11:10:22.688048	تم تسديد دفعة بقيمة 150000 والباقي 2250000		\N	\N	\N	\N
436	161	3	2026-02-05 11:16:30.440238	الجلسة السابعة من البكج		\N	\N	\N	\N
437	181	3	2026-02-05 11:25:56.484894	الجلسة السابعة من البكج		\N	\N	\N	\N
438	153	3	2026-02-05 11:26:30.930879	الجلسة الرابعة من البكج		\N	\N	\N	\N
4394	1034	3	2026-04-18 15:11:52.200084	\N	باشرت المريضة بعد الإستشارة 	أبر صينية	\N	\N	evening
441	152	3	2026-02-05 12:53:44.205183	الجلسة الثامنة		\N	\N	\N	\N
442	151	3	2026-02-05 12:54:28.145165	الجلسة الخامسة مجانية 		\N	\N	\N	\N
443	231	3	2026-02-05 12:58:08.710612	استشارة اولية ولم يباشر لانه لم يحضر تقاريره 		\N	\N	\N	\N
444	189	3	2026-02-05 13:10:06.143085	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
445	158	3	2026-02-05 13:14:13.197473	الجلسة الثامنة 		\N	\N	\N	\N
446	190	3	2026-02-05 13:15:45.768232	الجلسة الثانية من البكج		\N	\N	\N	\N
447	211	3	2026-02-05 13:22:21.612803	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة المفردة الاولى للمريضة بعد جلسة الابر الصينية يوم 2/2 (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
448	214	3	2026-02-05 13:54:19.866111	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة المفردة الاولى للمريض (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
449	234	3	2026-02-05 13:55:04.673619	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة بسعر 20 الف كونه مريض قديم (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
450	177	3	2026-02-05 13:55:33.665371	جلسة مجانية		\N	\N	\N	\N
451	188	3	2026-02-05 14:13:25.056587	الجلسة الثالثة 		\N	\N	\N	\N
452	207	3	2026-02-05 14:28:24.441914	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة المفردة الثانية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
453	208	3	2026-02-05 15:29:41.47148	الجلسة الثالثة		\N	\N	\N	\N
454	236	4	2026-02-05 16:29:42.153854	تسديد مبلغ من قبل ابنه ولم يحضر المريض 		\N	\N	\N	\N
455	156	3	2026-02-05 16:42:15.82285	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
456	235	3	2026-02-05 17:24:22.162131	أتمت المريضة اليوم استشارة لدى دكتور مصطفى حيث ان المريضة طبيبها الإختصاص في كربلاء وكانت تأخذ جلسات علاج طبيعي هناك لكنها بعد رؤيتها للنشر وكذلك بسبب معرفتها لأحد المرضى السابقين في المركز  ومدحهم فيه وعليه قررت المريضة بدء جلساتها من يوم السبت كون يوم غد يصادف عطلة 		\N	\N	\N	\N
457	237	3	2026-02-05 17:41:16.470905	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة اليوم بجلستها من الابر الصينية بعد استشارة دكتور مصطفى حيث سبق وغن قامت المريضة بزيارة دكتور عبد الله لكنهم لم يباشروا بسبب الوقت لم يكن مناسب لهم  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
459	64	3	2026-02-07 05:21:04.136547	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 57 (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
460	200	3	2026-02-07 05:53:07.047001	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
461	201	3	2026-02-07 06:13:22.445807	الجلسة الثالثة من دفعة من البكج		\N	\N	\N	\N
462	72	3	2026-02-07 06:15:52.724668	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
463	238	3	2026-02-07 06:59:48.624653	تعرض المريض الى حادث دهس بواسطة سيارة حمل تسببت بكسر بمفصل اليد حيث اجراء المريض عملية تثبت المفصل بواسطة قطعة بلاتين واليوم راجعنا بعد ان نصحه طبيبه بالعلاج في مركزنا جاء لاخذ الاستشارة الاولية عند المعالج المختص عبد الله خان		\N	\N	\N	\N
464	239	3	2026-02-07 08:07:47.660401	بكج ل 6 جلسات  		\N	\N	\N	\N
465	96	3	2026-02-07 08:08:12.281365	الجلسة الخامسة من البكج		\N	\N	\N	\N
466	226	3	2026-02-07 08:10:52.698589	الجلسة الثانية من البكج		\N	\N	\N	\N
477	212	3	2026-02-07 13:16:17.715612	الجلسة الثالثة من البكج		\N	\N	\N	\N
478	192	3	2026-02-07 13:17:18.074307	جلسة مجانية		\N	\N	\N	\N
479	243	3	2026-02-07 13:24:22.825876	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة اليوم جلستها المفردة الاولى بعد استشارة دكتور مصطفى حيث إن المريضة سبق وإن كانت راقدة في المستشفى بسبب ضعف حالتها وبعد ذلك قررت ان تباشر معنا (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
480	189	3	2026-02-07 13:31:41.406347	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
481	244	3	2026-02-07 13:51:16.413984	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة اليوم جلسة الابر الصينية الاولى بعد استشارة دكتور مصطفى علمًا ان والدة زوجها واخوه هم من مرضى المركز الذين ظهرت عليهم نتائج جيدة بالرغم من عدم إلتزامهم في الجلسات  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
482	210	3	2026-02-07 14:12:30.671472	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
483	60	3	2026-02-07 14:47:03.810539	الجلسة الثانية من البكج		\N	\N	\N	\N
484	177	3	2026-02-07 14:47:26.625152	جلسة مجانية		\N	\N	\N	\N
485	41	3	2026-02-07 15:07:57.292318	الجلسة الاخيرة من البكج		\N	\N	\N	\N
486	158	3	2026-02-07 15:24:41.25517	الجلسة التاسعة 		\N	\N	\N	\N
487	34	4	2026-02-07 15:33:35.881786	تعيار قالب فقط		\N	\N	\N	\N
488	208	3	2026-02-07 15:47:09.597264	الجلسة الرابعة		\N	\N	\N	\N
489	214	3	2026-02-07 15:50:14.341672	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
490	74	3	2026-02-07 15:58:02.05952	الجلسة السابعة		\N	\N	\N	\N
491	224	3	2026-02-07 15:59:06.5719	الجلسة الثانية من البكج		\N	\N	\N	\N
492	237	3	2026-02-07 16:35:01.885856	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الثانية من الابر  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
494	93	3	2026-02-07 18:33:03.178386	\N	خدمة جديدة: جلسات علاج إضافية - جلسة ابر صينية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
495	205	3	2026-02-08 05:28:45.69252	الجلسة الثالثة من البكج 		\N	\N	\N	\N
496	72	3	2026-02-08 06:12:48.922339	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 20  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
497	238	3	2026-02-08 06:15:27.809096	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الثانية  (تكلفة: 225,000 د.ع)	\N	\N	\N	\N
498	226	3	2026-02-08 06:47:02.167806	الجلسة الثالثة من البكج		\N	\N	\N	\N
467	225	3	2026-02-07 08:11:25.410559	الجلسة الثانية من البكج		\N	\N	\N	\N
499	225	3	2026-02-08 06:49:35.726684	الجلسة الثالثة من البكج 		\N	\N	\N	\N
469	241	2	2026-02-07 10:29:34.369701	تم لبس القدم السيليكومية وتم الاستلام ولاتوجد اي مشكلة 	مراجع سابق 	\N	\N	\N	\N
500	245	2	2026-02-08 07:34:49.506134	تم فحصه وعرض اطراف لحالته 	مراجع جديد / لديه كتاب 	\N	\N	\N	\N
501	79	3	2026-02-08 08:07:26.8612	الجلسة الثانية من البكج 		\N	\N	\N	\N
502	165	3	2026-02-08 08:07:58.409427	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
503	246	3	2026-02-08 08:11:18.88976	استشارة اولية		\N	\N	\N	\N
504	121	3	2026-02-08 08:18:20.766095	الجلسة الرابعة من البكج 		\N	\N	\N	\N
505	247	2	2026-02-08 10:11:01.806426	صيانة ادبتر +بايب+رابط /مجاني	مراجع سابق 	\N	\N	\N	\N
525	250	3	2026-02-08 19:02:09.60882	تمت زيارة المريضة من قبل دكتور مصطفى حيث انها راقدة في الطابق الخامس من المستشفى وهي من مرضى دكتور علي عواد حيث تعاني المريضة من Brain Abscess واجرت عملية في الدماغ مؤخراً وهي الان تعاني من ضعف حسي وحركي في الجزء اليسار حيث انها كانت راقدة في مستشفى التركي لمدة شهر		\N	\N	\N	\N
506	248	2	2026-02-08 10:14:19.92894	مراجعة من اجل شراء جواريب سيليكونية	مراجع سابق 	\N	\N	\N	\N
507	181	3	2026-02-08 10:52:56.388866	\tالجلسة الثامنة من البكج		\N	\N	\N	\N
508	198	3	2026-02-08 11:00:49.694931	الجلسة الخامسة من البكج		\N	\N	\N	\N
509	161	3	2026-02-08 11:12:32.707201	الجلسة التاسعة من البكج		\N	\N	\N	\N
510	153	3	2026-02-08 11:22:49.797247	الجلسة الخامسة من البكج		\N	\N	\N	\N
511	249	3	2026-02-08 11:38:00.68723	جضرت المريضه للمراجعه عند الدكتور بيرام باغش بتاريخ 21/1/2025 وباشرت اليوم جلستها الاولى حسب الخطه العلاجيه المخصصه لها		\N	\N	\N	\N
512	151	3	2026-02-08 11:51:43.044531	الجلسة السادسة مجانية 		\N	\N	\N	\N
513	152	3	2026-02-08 12:15:02.360651	الجلسة التاسعة من البكج 		\N	\N	\N	\N
515	131	3	2026-02-08 13:11:55.794702	الجلسة السادسة من البكج		\N	\N	\N	\N
516	158	3	2026-02-08 13:15:31.061727	الجلسة العاشرة من البكج		\N	\N	\N	\N
514	191	3	2026-02-08 13:11:24.891969	جلسة الاولى من بكج لخمس جلسات		\N	\N	\N	\N
517	189	3	2026-02-08 13:22:32.871022	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
518	177	3	2026-02-08 13:33:03.019623	جلسة مجانية\n		\N	\N	\N	\N
519	158	3	2026-02-08 14:21:04.6925	\N	خدمة جديدة: جلسات علاج إضافية - بكج لستة جلسات (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
520	60	3	2026-02-08 14:32:38.214772	الجلسة الثالثة من البكج		\N	\N	\N	\N
521	243	3	2026-02-08 14:34:34.505853	\N	خدمة جديدة: جلسات علاج إضافية - بكج لستة جلسات (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
522	243	3	2026-02-08 14:36:11.868151	\N	خدمة جديدة: جلسات علاج إضافية - جلسات اضافة ليصبح البكج 8 جلسات وليس 6 جلسات (تكلفة: 50,000 د.ع)	\N	\N	\N	\N
523	188	3	2026-02-08 14:39:16.003672	الجلسة الرابعة من البكج		\N	\N	\N	\N
524	223	3	2026-02-08 14:42:15.484601	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
526	250	3	2026-02-08 19:03:16.984387	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
527	64	3	2026-02-09 05:45:51.632003	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 58 (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
528	238	3	2026-02-09 05:46:13.033526	الجلسة الثالثة من البكج 		\N	\N	\N	\N
529	165	3	2026-02-09 08:31:10.236137	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
530	204	3	2026-02-09 10:46:41.41243	الجلسة الرابعة من البكج		\N	\N	\N	\N
531	251	3	2026-02-09 11:14:56.187273	استشارة اولية 		\N	\N	\N	\N
1699	74	3	2026-02-28 19:48:06.086214	\N		تمارين تأهيلية	\N	\N	morning
493	107	3	2026-02-07 17:31:08.833521	الجلسة الثالثة من البكج		\N	\N	\N	\N
533	251	3	2026-02-09 11:20:04.633645	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضه بعد الاستشارة مباشرتا ببكج 4 جلسات سعر الجلسة 25 الف \nالجلسة الاولى  (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
534	161	3	2026-02-09 11:28:45.228863	الجلسة العاشرة والاخيرة من البكج 		\N	\N	\N	\N
535	40	2	2026-02-09 11:33:50.799069	تم لبس الطرف 	مراجع سابق	\N	\N	\N	\N
581	265	3	2026-02-10 13:59:10.114733	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الاولى للمريضة من الابر الصينية بعد استشارة دكتور مصطفى (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
536	252	2	2026-02-09 11:38:12.759102	تم عرض له الاطراف فوق الركبة / امكانيته المادية محدودة / تم الاتفاق مبدئيا على طرف (3R78)	مراجع جديد	\N	\N	\N	\N
537	253	2	2026-02-09 11:48:59.091242	صيانة القدم 	مراجع سابق	\N	\N	\N	\N
538	239	3	2026-02-09 12:01:14.316784	الجلسة الثانية من البكج		\N	\N	\N	\N
539	254	3	2026-02-09 12:13:32.542688	استشارة اولية		\N	\N	\N	\N
540	255	3	2026-02-09 12:23:59.845485	استشارة اولية		\N	\N	\N	\N
541	212	3	2026-02-09 13:17:26.897176	الجلسة الرابعة		\N	\N	\N	\N
542	158	3	2026-02-09 13:17:55.885826	الجلسة الاولى من البكج الثاني		\N	\N	\N	\N
543	189	3	2026-02-09 13:36:14.616595	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
544	192	3	2026-02-09 13:36:35.76914	جلسة مجانية		\N	\N	\N	\N
545	177	3	2026-02-09 13:53:27.813065	جلسة مجانية		\N	\N	\N	\N
546	129	3	2026-02-09 14:22:13.33404	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
547	108	3	2026-02-09 15:08:24.299036	الجلسة المجانية من البكج\n		\N	\N	\N	\N
548	41	3	2026-02-09 15:10:43.211508	الجلسة المجانية من البكج		\N	\N	\N	\N
549	60	3	2026-02-09 15:18:28.02298	الجلسة الرابعة من البكج		\N	\N	\N	\N
532	198	3	2026-02-09 11:15:54.515702	الجلسة السادسة من البكج 		\N	\N	\N	\N
550	224	3	2026-02-09 15:58:11.737046	الجلسة الثالثة من البكج		\N	\N	\N	\N
551	34	4	2026-02-09 16:18:50.616249	تغيير بحجم الجزء المبتور مما ادى لعدم ثبات القالب وتمت التوصية بلف الجزء المبتور لمدة يومين بالباندج 		\N	\N	\N	\N
552	237	3	2026-02-09 16:19:35.08237	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
553	244	3	2026-02-09 16:25:51.31596	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
554	208	3	2026-02-09 16:59:33.949705	الجلسة الخامسة من البكج		\N	\N	\N	\N
555	256	4	2026-02-09 16:59:47.732579	استعلام عن طرف		\N	\N	\N	\N
556	225	3	2026-02-09 17:10:58.964832	الجلسة الرابعة من البكج		\N	\N	\N	\N
557	226	3	2026-02-09 17:15:46.384468	الجلسة الرابعة من البكج		\N	\N	\N	\N
558	107	3	2026-02-09 17:31:59.14113	الجلسة الرابعة من البكج		\N	\N	\N	\N
559	84	3	2026-02-09 17:38:22.529544	\N	خدمة جديدة: جلسات علاج إضافية - جلسة كلاسك مفرد كون المريضة قديمة و على النظام القديم (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
560	205	3	2026-02-10 05:32:29.734289	الجلسة الرابعة من البكج 		\N	\N	\N	\N
561	238	3	2026-02-10 05:32:51.420422	الجلسة الرابعة من البكج 		\N	\N	\N	\N
562	257	3	2026-02-10 07:03:50.496033	باشر المريض جلسته الاولى بعد الاستشارة مباشرتا		\N	\N	\N	\N
563	147	3	2026-02-10 07:35:10.435503	\N	خدمة جديدة: جلسات علاج إضافية - بكج 9 جلسات سعر الجلسة الواحدة 25 الف  (تكلفة: 225,000 د.ع)	\N	\N	\N	\N
564	96	3	2026-02-10 07:36:47.336428	الجلسة السادسة من البكج 		\N	\N	\N	\N
582	188	3	2026-02-10 14:16:49.064872	الجلسة الخامسة من البكج		\N	\N	\N	\N
565	259	2	2026-02-10 07:43:49.873255	تدريب على الطرف +صيانة قالب  	مراجع سابق 	\N	\N	\N	\N
566	255	3	2026-02-10 08:30:52.779768	المباشرة مع دكتور عبد الله خان بعد استشارة الامس \nالجلسة الاولى من البكج		\N	\N	\N	\N
567	258	3	2026-02-10 09:18:24.208985	استشارة اولية		\N	\N	\N	\N
568	121	3	2026-02-10 09:19:15.02307	الجلسة الخامسة من البكج		\N	\N	\N	\N
4479	1050	1	2026-04-19 13:21:14.654932	\N	جلسه روبوت 	روبوت	\N	\N	evening
570	261	3	2026-02-10 09:52:52.778202	\N	خدمة جديدة: جلسات علاج إضافية - جلستان مفردة لحين اكمال مبلغ البكج غدا (تكلفة: 50,000 د.ع)	\N	\N	\N	\N
571	263	3	2026-02-10 10:35:41.44722	جاء المريض الى مركزنا بعد تحويله من قبل الدكتور علي عزيز شلاكه اخصائي الجملة العصبية حيث كان المريض يعاني من ضمور عضلي منذ الولادة  		\N	\N	\N	\N
572	161	3	2026-02-10 10:59:31.048146	الجلسة المجانية من العرض 		\N	\N	\N	\N
573	181	3	2026-02-10 10:59:56.698125	الجلسة التاسعة من البكج 		\N	\N	\N	\N
574	260	3	2026-02-10 11:10:30.140756	استشارة اولية 		\N	\N	\N	\N
575	198	3	2026-02-10 11:28:49.68946	الجلسة المجانية من العرض		\N	\N	\N	\N
576	249	3	2026-02-10 11:30:59.458858	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الثانية مفردة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
577	153	3	2026-02-10 11:33:09.101053	الجلسة السادسة من البكج		\N	\N	\N	\N
578	131	3	2026-02-10 13:16:28.122529	الجلسة السابعة 		\N	\N	\N	\N
579	264	3	2026-02-10 13:37:51.689421	اليوم هي الجلسة الاخيرة للمريضة من البكج الخاص بهم مسبقًا 		\N	\N	\N	\N
580	222	3	2026-02-10 13:45:07.720307	الجلسة الثانية للمريضة علمًا ان مبلغ جلستها هو على حساب مؤوسسة العين		\N	\N	\N	\N
583	60	3	2026-02-10 14:41:09.236754	الجلسة الاخيرة من البكج		\N	\N	\N	\N
584	129	3	2026-02-10 15:16:43.940321	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
585	43	4	2026-02-10 15:30:56.469898	تعيار قالب مع دفع مبلغ القسط 250000 والباقي من القسط 250000 دينار		\N	\N	\N	\N
586	267	3	2026-02-10 16:25:45.04628	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريضة بجلسته الاولى بعد استشارة دكتور مصطفى حيث ان عائلته اغلبها هم من مراجعين المركز والمريض يعاني من خدر في الفخذ والساق كما انه قد اجرى عملية جراحية مسبقًا \n (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
587	244	3	2026-02-10 16:26:14.519766	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
588	107	3	2026-02-10 16:41:58.724911	الجلسة الخامسة من البكج		\N	\N	\N	\N
589	269	3	2026-02-10 17:43:06.917963	باشرت المريضة بجلسة ابر صينية بعد استشارة دكتور مصطفى		\N	\N	\N	\N
590	225	3	2026-02-10 17:47:59.349807	الجلسة الخامسة من البكج		\N	\N	\N	\N
591	268	3	2026-02-10 18:14:42.969204	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة بجلستها الاولى اليوم بعد استشارة دكتور مصطفى وبالنسبة للفرق في الوقت كون المريضة غادرت المركز بعد الاستشارة لاستشارة زوجها والان باشرت  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
592	270	3	2026-02-10 18:31:05.862851	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بجلستة الاولى اليوم بعد استشارة دكتور مصطفى حيث  تم تحويله من قبل دكتور غيث ابراهيم اختصاصي الاورام كونه يعاني من من ورم في الدماغ واجرى عملية لإستئصاله (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
593	64	3	2026-02-11 05:23:33.005084	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 59  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
594	238	3	2026-02-11 05:41:02.462003	الجلسة الخامسة من البكج 		\N	\N	\N	\N
595	271	3	2026-02-11 06:04:57.189682	استشارة اولية		\N	\N	\N	\N
596	72	3	2026-02-11 06:09:41.819908	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 21 (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
4505	1053	1	2026-04-19 16:41:46.107786	\N	تعيار	\N	\N	\N	evening
598	257	3	2026-02-11 06:40:43.019674	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الثانية مفردة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
599	23	2	2026-02-11 07:27:05.473516	تدريب على الطرف	مراجع سابق 	\N	\N	\N	\N
601	271	3	2026-02-11 07:55:08.436514	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد الاستشارة مباشرتا باول جلسة من جلسات العلاج الطبيعي المكونه من 10 جلسات  (تكلفة: 250,000 د.ع)	\N	\N	\N	\N
602	79	3	2026-02-11 07:56:00.61775	الجلسة الثالثة من البكج 		\N	\N	\N	\N
603	165	3	2026-02-11 08:04:18.88721	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
604	40	2	2026-02-11 08:37:40.612651	تدريب على الطرف 	مراجع سابق 	\N	\N	\N	\N
605	185	2	2026-02-11 08:40:20.830965	تحويل نظامه الى شتل لوك 	مراجع سابق 	\N	\N	\N	\N
606	273	2	2026-02-11 08:47:30.990676	تم لبس قالبه القديم 	مراجع سابق 	\N	\N	\N	\N
607	149	3	2026-02-11 08:52:26.550148	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
608	255	3	2026-02-11 08:52:51.243158	الجلسة الثانية من البكج 		\N	\N	\N	\N
609	55	3	2026-02-11 09:01:30.67831	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
610	260	3	2026-02-11 09:06:17.542506	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فرديه  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
611	198	3	2026-02-11 10:55:56.323683	\N	خدمة جديدة: جلسات علاج إضافية - بكج 4 جلسات  (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
612	204	3	2026-02-11 10:57:51.175702	الجلسة الخامسة من الجلسة 		\N	\N	\N	\N
613	274	3	2026-02-11 11:15:11.927987	المراجعة من الحالات القديمة، باشرت أول جلسة علاج طبيعي بتاريخ 22/11/2025. كانت تعاني من قصر في إحدى الساقين، وأجرت عملية جراحية لتصحيح الحالة، وتستخدم مسندًا للساق بعد العملية.\n\nبعد التدخل الجراحي، ظهرت لديها حالة ضمور في عضلات الساق المصابة. باشرت برنامج علاج طبيعي منتظم لدينا، حيث خضعت إلى ما يقارب 3 باكجات علاجية، وأبدت استجابة ممتازة للعلاج، مع تحسن واضح في القوة العضلية، وزيادة في مدى الحركة، وتحسن ملحوظ في الأداء الوظيفي. النتائج كانت مرضية جدًا ومبشرة.\n\nحاليًا راجعت المركز وأجرت جلسة مفردة لغرض المتابعة وتعزيز النتائج السابقة.		\N	\N	\N	\N
614	192	3	2026-02-11 13:04:35.758171	جلسة مجانية		\N	\N	\N	\N
615	212	3	2026-02-11 13:04:59.528518	الجلسة الخامسة 		\N	\N	\N	\N
616	222	3	2026-02-11 13:16:35.813194	الجلسة الثالثة		\N	\N	\N	\N
617	189	3	2026-02-11 13:37:22.266052	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
618	275	3	2026-02-11 14:08:12.205723	باشرت المريضة جلستها الاولى اليوم بعد استشارة دكتور مصطفى حيث انها راقدة في الطابق الخامس في المستشفى كونها تعرضت الى حادث يوم 2/4 واجرت العملية لدى دكتور علي عواد ومحمد توفيق كونها تمتلك كسر في اليد وكسر في فقرات الظهر 		\N	\N	\N	\N
619	267	3	2026-02-11 14:22:09.180113	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
620	244	3	2026-02-11 14:22:53.965071	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
621	108	3	2026-02-11 14:47:10.535517	\N	خدمة جديدة: جلسات علاج إضافية - بكج 6 جلسات (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
622	243	3	2026-02-11 14:53:28.678535	الجلسة الثانية من البكج		\N	\N	\N	\N
623	60	3	2026-02-11 14:57:49.969636	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
624	276	4	2026-02-11 15:11:49.011164	فحص واستعلام		\N	\N	\N	\N
625	74	3	2026-02-11 16:40:13.876429	الجلسة الثامنة		\N	\N	\N	\N
626	261	3	2026-02-11 17:03:45.000816	الجلسة الثانية بعد استشارة دكتور مصطفى حيث تم تحويل المريض من الشفت الصباحي الى المسائي		\N	\N	\N	\N
627	208	3	2026-02-11 17:04:21.867406	الجلسة الاخيرة من البكج		\N	\N	\N	\N
628	270	3	2026-02-11 17:05:41.22429	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة المفردة الثانية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
629	224	3	2026-02-11 17:07:23.351659	الجلسة الرابعة		\N	\N	\N	\N
630	277	3	2026-02-11 17:12:02.043247	قام المريض بزيارة دكتور مصطفى وإستشارته بعد تحويله من قبل دكتور علي عواد اخصائي جراحة الجملة العصبية حيث ان المريض كان متعرض لجلطات سابقة ادت الى تأزم حالته وسببت نزف بالدماغ لديه واجرى عمليته لدى دكتور علي لكن بعدها استمرت حالته بالسوء وعدم المقدرة على الحركة بسبب تلف وخلل في الاعصاب وقد تم الاتفاق معهم على حسب رغبتهم للمباشرة يوم غد		\N	\N	\N	\N
631	84	3	2026-02-11 17:42:20.163293	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
632	250	3	2026-02-11 18:09:44.553562	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
633	238	3	2026-02-12 05:45:45.554339	الجلسة السادسه من البكج		\N	\N	\N	\N
634	72	3	2026-02-12 06:15:39.277782	خدمة جديدة: جلسات علاج اضافية -جلسة رقم  22(تكلفه 25.000 د.ع)		\N	\N	\N	\N
635	121	3	2026-02-12 07:55:32.828082	الجلسة السادسة من البكج		\N	\N	\N	\N
1659	239	3	2026-02-28 09:47:56.303743	\N	الجلسة المجانية من العرض 	أجهزة علاج طبيعي	\N	\N	morning
636	22	2	2026-02-12 08:12:22.558375	تبديل سوكت 	مراجع سابق 	\N	\N	\N	\N
637	255	3	2026-02-12 08:33:18.424743	الجلسة الثالثة من البكج		\N	\N	\N	\N
638	281	3	2026-02-12 09:02:28.229964	راجعت حالة جديدة اليوم للاستشارة لدى الدكتور عبدالله، وتبين أنها تعاني من التهاب في المخيخ، وذلك بتاريخ 12/2/2026.		\N	\N	\N	\N
639	280	3	2026-02-12 09:09:57.506255	مراجع جديد حضر إلى الدكتور عبدالله للعلاج الطبيعي، ويعاني من تشنج عضلي في الرقبة بتاريخ 2026/2/12		\N	\N	\N	\N
1681	424	3	2026-02-28 18:04:19.041586	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
641	283	3	2026-02-12 09:57:37.186174	استشارة اولية 		\N	\N	\N	\N
640	282	2	2026-02-12 09:49:23.267976	تم شراء طرف تحت الركبة بقيمة 5,250,000 بالسعر المخفض / تم اخذ قالب (م محمد)	مراجع جديد / كتاب تخفيض	\N	\N	\N	\N
642	279	3	2026-02-12 10:09:19.296314	استشارة اولية 		\N	\N	\N	\N
643	22	2	2026-02-12 10:59:14.459656	\N	خدمة جديدة: تعديل أو ضبط - تبديل ادابتر بايب (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
645	198	3	2026-02-12 12:06:00.984769	الجلسة الثانية من البكج الجديد		\N	\N	\N	\N
1688	554	3	2026-02-28 18:29:08.06294	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
679	23	2	2026-02-14 07:40:39.560535	\N	تدريب على الطرف 	\N	\N	\N	\N
1173	49	1	2026-01-20 12:50:08	\N	تدريب 	\N	\N	\N	morning
646	285	2	2026-02-12 12:12:49.671149	استلام مسند 	مراجع سابق 	\N	\N	\N	\N
644	167	2	2026-02-12 11:01:07.702644	تسديد مبلغ 500000	مراجع سابق 	\N	\N	\N	\N
648	286	2	2026-02-12 13:04:09.545873	دفع مبلغ 7550000 دفعة ثانية ما يعادل 5000 دولار		\N	\N	\N	\N
649	287	3	2026-02-12 13:09:53.18318	حضر المريض للاستشارة عند دكتور عبد الله خان وباشر مباشرتا بعد الاستشارة بالشفت المسائي بسبب الوقت 		\N	\N	\N	\N
650	131	3	2026-02-12 13:17:09.136686	الجلسة الثامنة 		\N	\N	\N	\N
651	224	3	2026-02-12 13:19:49.618815	الجلسة التجريبية لجهاز الروبوت حيث قمنا نحن بالإتصال بها للقدوم 		\N	\N	\N	\N
652	161	3	2026-02-12 13:29:09.445131	تدريب مجاني على الروبوت 		\N	\N	\N	\N
653	265	3	2026-02-12 13:43:15.514955	\N	خدمة جديدة: جلسات علاج إضافية - جلسة ابر صينية  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
654	288	3	2026-02-12 14:01:46.3335	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض جلسته المفردة الاولى اليوم بعد استشارة دكتور مصطفى  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
655	264	3	2026-02-12 14:26:48.17437	الجلسة المجانية من البكج		\N	\N	\N	\N
656	188	3	2026-02-12 14:35:27.941381	الجلسة السادسة		\N	\N	\N	\N
657	289	3	2026-02-12 15:39:29.186997	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة بجلستها الاولى بعد استشارة دكتور مصطفى    (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
659	107	3	2026-02-12 17:36:25.55173	الجلسة الاخيرة من البكج		\N	\N	\N	\N
660	269	3	2026-02-12 18:10:41.554954	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
661	222	3	2026-02-12 18:54:09.667387	الجلسة الرابعة		\N	\N	\N	\N
663	64	3	2026-02-14 05:24:36.505218	جلسة رقم 60 	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
664	238	3	2026-02-14 05:25:49.756063	الجلسة السابعة من البكج		\N	\N	\N	\N
665	271	3	2026-02-14 05:26:14.825426	الجلسة الثانية من البكج 		\N	\N	\N	\N
666	283	3	2026-02-14 06:27:17.918346	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة الاولى مفردة  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
675	292	3	2026-02-14 07:34:47.581341		خدمة جديدة: جلسات علاج إضافية - بدا المريض بعد الاستشارة مباشرتا تحت اشراف الدكتور نظير عباس \nيعاني المريض من الم شديد اسفل الظهر ينتشر الى الساق اليمنى مصحوبا بخدر وتنمل  (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	3	\N	\N
670	292	3	2026-02-14 06:59:56.661648	حضر المريض للاستشارة الاولية عند الدكتور سيد نظير عباس 		\N	\N	\N	\N
683	96	3	2026-02-14 08:00:21.426025	\N	الجلسة السابعة من البكج 	تمارين تأهيلية	\N	\N	\N
688	255	3	2026-02-14 08:05:21.490734	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	\N
689	294	3	2026-02-14 08:10:30.95323	\N	خدمة جديدة: جلسات علاج إضافية - حضر المريض للاستشارة عند الدكتور السيد نظير عباس \nيعاني المريض من انزلاق الفقرات القطنيه والام تمتد الى الساق اليسرى  (5 جلسة) (تكلفة: 125,000 د.ع)	\N	\N	\N	\N
690	258	3	2026-02-14 08:39:54.291075	\N	حضر المريض للاستشارة مره ثانية لان دكتور عبد الله خان طلب من عنده اشعه بالمره السابقه واليوم حضر للاستشاره عند الدكتور سيد نظير عباس 	أجهزة علاج طبيعي	\N	\N	\N
743	101	2	2026-02-15 07:55:57.968578	\N	لبس المسند kFO	\N	\N	\N	morning
672	293	3	2026-02-14 07:08:31.858735	استشارة اولية		أجهزة علاج طبيعي	\N	\N	\N
696	55	3	2026-02-14 09:43:16.73916	جلسة رقم 14 	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 14 (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
697	296	3	2026-02-14 09:50:36.340612	\N	استشارة اولية فقط المريض بحاجة الى اخصائي كسور 	\N	\N	\N	\N
698	269	3	2026-02-14 10:01:00.94798	\N	حضرت المريضه للاستشارة عند الدكتور عبد الله خان وستبدا العلاج اعتبارا من الغد 	\N	\N	\N	\N
658	277	3	2026-02-12 16:30:12.204753		خدمة جديدة: جلسات علاج إضافية - باشر المريض ببكج عدده 6 جلسات (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1175	49	1	2026-01-25 12:50:57	\N	تدريب	\N	\N	\N	morning
647	284	2	2026-02-12 12:26:04.204029	لبس الركبة اوريون الجديدة بعد وصولها من الشركة +برمجة	لبس الركبة اوريون الجديدة بعد وصولها من الشركة +برمجة	\N	\N	\N	\N
1177	49	1	2026-01-28 12:51:25	\N	تدريب	\N	\N	\N	morning
1178	49	1	2026-01-29 12:51:39	\N	تدريب	\N	\N	\N	morning
1373	485	3	2026-02-23 17:24:07.961035	\N		أجهزة علاج طبيعي	\N	\N	evening
699	198	3	2026-02-14 10:49:45.301582	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	\N
700	250	3	2026-02-14 11:43:58.62578	مريض راقد 	خدمة جديدة: جلسات علاج إضافية - مريض راقد  (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
701	261	3	2026-02-14 11:45:40.860928	حاسب المريض ولم يباشر اليوم ستعد المباشرة من الغد 	خدمة جديدة: جلسات علاج إضافية - حاسب المريض ولم يباشر اليوم ستعد المباشره بالبكج الجديد من الغد  (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
673	147	3	2026-02-14 07:09:27.384449	الجلسة الثانية من البكج 	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	\N
702	239	3	2026-02-14 12:18:36.126542	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	\N
1660	147	3	2026-02-28 09:57:25.204401	\N	الجلسة الثامنة من البكج 	تمارين تأهيلية	\N	\N	morning
704	298	3	2026-02-14 12:38:47.991093	\N	استشارة اولية	\N	\N	\N	\N
692	39	2	2026-02-14 08:51:51.878386	تعيار الطرف 	تدريب على الطرف 	\N	\N	\N	\N
693	196	2	2026-02-14 08:52:48.90445	تم بيع له طرف تحت الركبة بسعر 3 مليون واصل مليون ونصف باقي مليون ونصف	تم اخذ قالب 	\N	\N	\N	\N
705	299	3	2026-02-14 12:56:01.468141	\N	استشارة اولية	\N	\N	\N	\N
706	212	3	2026-02-14 13:18:17.749859	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	\N
707	158	3	2026-02-14 13:19:13.779762	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	\N
708	300	2	2026-02-14 13:19:37.865151		تم استلام المساند 	\N	\N	\N	\N
709	288	3	2026-02-14 13:45:03.784086	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
710	302	3	2026-02-14 13:46:30.2984	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة اليوم جلستها اليوم بعد استشارة دكتور مصطفى (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
711	222	3	2026-02-14 14:00:59.89502	\N	جلسة مدفوعة من مؤوسسة العين	تمارين تأهيلية	\N	\N	\N
731	258	3	2026-02-15 05:12:25.678184	الجلسة الاولى من البكج 	خدمة جديدة: جلسات علاج إضافية - بكج 5 جلسات سعر الجلسة 25 الف\nالجلسة الاولى من البكج  (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	5	\N	\N
712	306	4	2026-02-14 14:12:17.963478	الطرف الصناعي لا يناسب حالة المريض الصحية لوجود جرح والم نهاية البتر وتم عرض مسندAFO بمبلغ 200000 لوجود سقوط قدم بالرجل الثانية	استعلام 	\N	\N	\N	\N
713	265	3	2026-02-14 14:22:58.952965	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
714	177	3	2026-02-14 14:23:25.583489	\N	جلسة مجانية	تمارين تأهيلية	\N	\N	\N
715	304	3	2026-02-14 14:54:26.573504	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض جلسته الاولى بعد استشارة دكتور مصطفى  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
716	307	3	2026-02-14 15:04:21.027953	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة بجلستها المفردة الاولى بعد استشارة دكتور مصطفى حيث ان المريضة اجرت عملية تبديل مفصل وقام بتحويلها دكتور مصطفى جلود (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
718	270	3	2026-02-14 15:32:13.698988	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
719	310	3	2026-02-14 15:47:21.020396	\N	تم اخذ المريض لإستشارة وسوف يباشر في جلسته ببكج في وقت اخر اقصاه بعد يومين	\N	\N	\N	\N
720	305	3	2026-02-14 15:59:43.429283	\N	المريضة اخذت استشارة لدى دكتور مصطفى لكنها اختارت ان تأخذ استشارة اخرى عند دكتور عبد الله	\N	\N	\N	\N
721	192	3	2026-02-14 16:01:25.932932	\N	جلسة مجانية	تمارين تأهيلية	\N	\N	\N
722	289	3	2026-02-14 16:02:08.041921	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
723	308	3	2026-02-14 16:02:55.938694	\N	باشر المريض جلسته الاولى من بكج قديم بعد استشارة دكتور مصطفى 	أجهزة علاج طبيعي	\N	\N	\N
724	108	3	2026-02-14 16:03:36.135544	\N	الجلسة الثانية من البكج	تمارين تأهيلية	\N	\N	\N
725	225	3	2026-02-14 16:41:04.921189	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	\N
726	131	3	2026-02-14 17:36:44.864317	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	\N
728	224	3	2026-02-14 17:40:27.896601	\N	الجلسة الاخيرة من البكج	تمارين تأهيلية	\N	\N	\N
730	208	3	2026-02-14 18:02:15.690467	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	\N
732	205	3	2026-02-15 05:14:11.554599	\N	الجلسة الخامسة من البكج 	تمارين تأهيلية	\N	\N	\N
733	271	3	2026-02-15 05:20:00.836749	\N	الجلسة الثالثة من البكج 	تمارين تأهيلية	\N	\N	\N
734	238	3	2026-02-15 06:11:22.679424	\N	الجلسة السابعة من البكج	أجهزة علاج طبيعي	\N	\N	\N
735	312	3	2026-02-15 06:45:35.71582	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
736	72	3	2026-02-15 06:46:02.608039	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
737	269	3	2026-02-15 06:56:55.547129	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة ببكج من 6 جلسات بعد استشارة دكتور عبد الله خان (6 جلسة) (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
727	84	3	2026-02-14 17:38:57.342922		خدمة جديدة: جلسات علاج إضافية (تكلفة: 20,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
717	309	3	2026-02-14 15:22:58.253942		خدمة جديدة: جلسات علاج إضافية - باشر المريض جلسته الاولى من البكج بعد استشارة دكتور مصطفى (6 جلسة) (تكلفة: 150,000 د.ع)	تمارين تأهيلية	6	\N	\N
739	79	3	2026-02-15 07:40:28.749439		الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
740	255	3	2026-02-15 07:50:44.852296	\N	الجلسة الخامسة 	أجهزة علاج طبيعي	\N	\N	morning
741	121	3	2026-02-15 07:52:42.426239	\N	الجلسة الاخيرة من البكج	\N	\N	\N	morning
738	23	2	2026-02-15 07:31:08.12986		تطويل الاطراف 	\N	\N	\N	morning
742	165	3	2026-02-15 07:54:15.899955	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
744	313	2	2026-02-15 08:01:17.334577	\N	تم عرض له الاطراف السفلية تم تحديد له طرف بسعر 3000000بانتظار الدفع	\N	\N	\N	morning
745	283	3	2026-02-15 08:02:40.508377	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
746	294	3	2026-02-15 08:21:42.704764	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
747	303	2	2026-02-15 09:43:58.365821	\N	تم تسديد مبلغ وقدره 2000000 كدفعة اولى	\N	\N	\N	morning
748	314	2	2026-02-15 09:54:56.41688	\N	تم اخذ القياسات والقالب / تم دفع المبلغ بالكامل 	\N	\N	\N	morning
749	315	2	2026-02-15 10:07:33.358837		خدمة جديدة: صيانة الطرف الصناعي شراء سيليكون (تكلفة: 465,000 د.ع)	\N	\N	\N	\N
750	181	3	2026-02-15 10:36:47.034202	\N	الجلسة العاشرة والاخيرة 	تمارين تأهيلية	\N	\N	morning
751	198	3	2026-02-15 10:59:49.644184	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
752	249	3	2026-02-15 11:29:12.737596	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
753	153	3	2026-02-15 11:29:43.532516	\N	الجلسة السابعة من البكج	تمارين تأهيلية	\N	\N	morning
754	298	3	2026-02-15 11:42:38.126152	باشره المريض بالجلسة الاولى مفردة 	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
755	316	2	2026-02-15 12:08:44.643961	\N	تم عرض له الايدي السلكونية 	\N	\N	\N	morning
758	305	3	2026-02-15 12:34:49.988452	\N	حضرت المريضه للاستشارة عند الدكتور عبد الله خان ولم تباشر 	\N	\N	\N	morning
759	318	3	2026-02-15 12:58:47.478183	\N	استشارة اولية\n\n	\N	\N	\N	morning
760	302	3	2026-02-15 13:14:04.370145		خدمة جديدة: جلسات علاج إضافية - باشرت المريضة ببكج من 9 جلسات بعد جلستها المفردة يوم امس عند دكتور مصطفى (9 جلسة) (تكلفة: 225,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
761	189	3	2026-02-15 13:19:28.243573		خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
762	319	3	2026-02-15 13:45:39.33591	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بجلسته الاولى بعد استشارة دكتور مصطفى حيث كان المريض يعاني من الام مستمرة وكذلك كان ابن المريض يراجع في المركز عند دكتور عبد الله (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
763	288	3	2026-02-15 13:50:57.115623	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
764	222	3	2026-02-15 13:52:02.686472	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	morning
775	243	3	2026-02-15 15:36:52.654896	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
765	191	3	2026-02-15 13:54:07.195762		الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
766	320	3	2026-02-15 13:56:36.475895	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة جلستها الاولى بعد استشارة دكتور مصطفى (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
767	177	3	2026-02-15 14:06:38.699396	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	morning
768	277	3	2026-02-15 14:07:25.41537	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
769	321	4	2026-02-15 14:07:57.758613	تم الاتفاق على طرف تحت الركبة بمبلغ ثلاثة ملايين دينار وتم اخذ قالب للمريض	استعلام مع شراء طرف مع اخذ قالب	\N	\N	\N	morning
770	322	3	2026-02-15 14:28:50.521507	\N	الجلسة الاولى	تمارين تأهيلية	\N	\N	morning
771	323	3	2026-02-15 14:46:37.498049		خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد الاستشارة عند دكتور مصطفى حيث انه يعاني من شلل في الجانب الايمن من جسمة بسبب جلطة في الدماغ اصابته (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	1	\N	\N
772	276	4	2026-02-15 14:54:24.581388	تم اخذ قياس السيليكون وتم تسديد مبلغ 1000000 كمقدمة وباقي المبلغ عند اخذ القالب وتركيب الطرف	شراء طرف 	\N	\N	\N	morning
773	188	3	2026-02-15 15:10:17.425542		الجلسة السابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
774	307	3	2026-02-15 15:12:45.08205	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
776	308	3	2026-02-15 17:08:47.414364	\N	الجلسة الثانية	أجهزة علاج طبيعي	\N	\N	evening
777	309	3	2026-02-15 17:09:09.992544	\N		تمارين تأهيلية	\N	\N	evening
778	270	3	2026-02-15 17:10:13.583141	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
779	265	3	2026-02-15 17:50:58.256753	\N	خدمة جديدة: جلسات علاج إضافية - جلسة ابر صينية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
780	310	3	2026-02-15 18:17:16.260704	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
781	324	3	2026-02-15 18:37:40.622776	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	evening
782	93	3	2026-02-15 19:12:54.827278	\N	خدمة جديدة: جلسات علاج إضافية - ابر صينية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
783	261	3	2026-02-16 05:15:10.305254	\N	باشر المريض اليوم بالجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
784	64	3	2026-02-16 05:24:42.836246	جلسة رقم 61 	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
785	238	3	2026-02-16 05:48:35.286023	\N	الجلسة الثامنه من البكج	أجهزة علاج طبيعي	\N	\N	morning
786	269	3	2026-02-16 06:12:24.728927	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
787	147	3	2026-02-16 06:35:47.043166	\N	الجلسة الثالثة من البكج 	تمارين تأهيلية	\N	\N	morning
788	325	3	2026-02-16 06:40:38.408153	\N	استشارة اولية	\N	\N	\N	morning
789	326	3	2026-02-16 07:09:08.094652	\N	استشارة اولية	\N	\N	\N	morning
790	255	3	2026-02-16 07:46:42.096013	\N	الجلسة السادسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1663	513	3	2026-02-28 10:27:10.360475	\N	الجلسة الثانية والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
756	284	2	2026-02-15 12:09:38.853232		تعيارمفصل الركبة 	\N	\N	\N	morning
757	317	2	2026-02-15 10:06:53		اضافة سوفت للقالب 	\N	\N	\N	morning
791	284	2	2026-02-16 07:58:45.781082		خدمة جديدة: صيانة مفصل الركبة اوريون3  (تكلفة: 500,000 د.ع)	\N	\N	\N	\N
792	165	3	2026-02-16 08:03:38.418566		خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
793	293	3	2026-02-16 08:30:41.201408	الجلسة الثانية من البكج\n	خدمة جديدة: جلسات علاج إضافية (10 جلسة) (تكلفة: 250,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
794	283	3	2026-02-16 08:32:13.882064	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
795	327	3	2026-02-16 08:38:23.763133	\N	استشارة اولية	\N	\N	\N	morning
796	331	3	2026-02-16 09:15:10.293675	\N	استشارة اولية	\N	\N	\N	morning
797	332	3	2026-02-16 09:33:50.328304	\N	استشارة اولية	\N	\N	\N	morning
798	328	2	2026-02-16 09:52:33.378756	\N	تم الاتفاق على تركيب اصابع عدد7بانتظار الدفع 	\N	\N	\N	morning
799	333	2	2026-02-16 10:01:36.82258	\N	تم الاتفاق على تركيب طرف تحت الركبة انها غير جاهزة للتركيب حاليا	\N	\N	\N	morning
800	334	3	2026-02-16 10:11:18.388619	\N	استشارة اولية	\N	\N	\N	morning
829	322	3	2026-02-16 17:10:46.457079	\N		تمارين تأهيلية	\N	\N	evening
801	55	3	2026-02-16 10:13:10.505227	جلسة رقم 15	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
802	198	3	2026-02-16 10:53:21.836273	\N	الجلسة الرابعة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
803	299	3	2026-02-16 11:55:31.132217	\N	خدمة جديدة: جلسات علاج إضافية - 6 جلسات بالاضافة الى الجلسة المجانية من العرض  (6 جلسة) (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
804	239	3	2026-02-16 12:08:57.705084	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
805	335	3	2026-02-16 12:34:55.962481	\N	استشارة اولية\n\n	\N	\N	\N	morning
806	336	2	2026-02-16 12:40:03.044608	\N	صيانة ادبتر +تعييار 	\N	\N	\N	morning
807	337	2	2026-02-16 12:44:00.113151	\N	تم اخذ قالب 	\N	\N	\N	morning
808	320	3	2026-02-16 13:16:13.277351	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
809	158	3	2026-02-16 13:17:21.763585	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
810	131	3	2026-02-16 13:18:20.761753	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
811	212	3	2026-02-16 13:18:52.041501	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
812	192	3	2026-02-16 13:19:38.811946	\N	جلسة مجانية	تمارين تأهيلية	\N	\N	morning
813	264	3	2026-02-16 13:21:37.0314		خدمة جديدة: جلسات علاج إضافية - المريضة جددت بكج 4 جلسات بسعر ال 60 الف كونهم من المراجعين القديمين للمركز حيث كان البكج الخاص بهم 15 الف (4 جلسة) (تكلفة: 60,000 د.ع)	تمارين تأهيلية	\N	\N	\N
814	302	3	2026-02-16 13:24:39.039088	\N		أجهزة علاج طبيعي	\N	\N	morning
815	189	3	2026-02-16 13:36:20.279693	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
816	338	3	2026-02-16 14:00:54.598669	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض مباشرة بعد استشارة دكتور مصطفى بجلسته الاولى من الابر الصينية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
817	339	3	2026-02-16 14:38:45.081057	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد الاستشارة عند دكتور مصطفى مباشرة بأول جلسة ابر صينية  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
818	340	3	2026-02-16 14:51:13.426804		خدمة جديدة: جلسات علاج إضافية - المريض مراجع قديم جدد جلسة  (تكلفة: 20,000 د.ع)	تمارين تأهيلية	\N	\N	\N
819	342	3	2026-02-16 15:11:41.303101	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة مباشرة بعد استشارة دكتور مصطفى بجلستها الاولى من الابر الصينية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
820	177	3	2026-02-16 15:20:19.837677	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	morning
821	270	3	2026-02-16 15:38:20.217103	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
822	294	3	2026-02-16 15:50:32.768352	\N	الجلسة الثالثة	أجهزة علاج طبيعي	\N	\N	morning
823	224	3	2026-02-16 15:57:20.643244	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
824	266	4	2026-02-16 16:25:06.743582	\N	استلام مسند	\N	\N	\N	evening
825	309	3	2026-02-16 16:25:41.024205	\N		تمارين تأهيلية	\N	\N	evening
826	343	3	2026-02-16 16:34:07.43256	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض مباشرة بعد استشارة دكتور مصطفى  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
827	237	3	2026-02-16 16:42:48.375365	\N	خدمة جديدة: جلسات علاج إضافية - جلسة ابر صينية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
828	74	3	2026-02-16 16:46:06.524408	\N	خدمة جديدة: جلسات علاج إضافية - تجديد بكج مسبق (5 جلسة) (تكلفة: 75,000 د.ع)	\N	\N	\N	\N
830	311	3	2026-02-16 18:08:27.613599		خدمة جديدة: جلسات علاج إضافية - باشرت ببكج من 8 جلسات بمبلغ 160 الف كونها من المراجعين القديمين للمركز (8 جلسة) (تكلفة: 160,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
729	311	3	2026-02-14 18:01:50.646569		إستشارت المريضة دكتور مصطفى وقررت البدء في وقت لاحق اقصاه يوم غد	أجهزة علاج طبيعي	\N	\N	\N
831	344	3	2026-02-16 18:14:09.475027	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة مباشرة بعد استشارة دكتور مصطفى  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
832	310	3	2026-02-16 18:30:53.555733	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
833	265	3	2026-02-16 19:04:23.588353	\N	خدمة جديدة: جلسات علاج إضافية - ابر صينية  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
834	108	3	2026-02-16 19:17:32.527318	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	evening
835	324	3	2026-02-16 19:26:44.987968	\N		أجهزة علاج طبيعي	\N	\N	evening
836	261	3	2026-02-17 05:20:24.593778	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
837	258	3	2026-02-17 05:22:56.092281	\N	الجلسة الثانية 	أجهزة علاج طبيعي	\N	\N	morning
838	345	3	2026-02-17 05:24:49.813872	\N	استشارة اولية	\N	\N	\N	morning
839	346	3	2026-02-17 05:30:32.43141	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضه بعد الاستشارة مباشرتا   (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
840	345	3	2026-02-17 05:31:08.0845	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد الاستشاره مباشرتا  (4 جلسة) (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
841	205	3	2026-02-17 05:33:06.327844	\N	الجلسة السادسة من البكج 	\N	\N	\N	morning
842	327	3	2026-02-17 06:06:33.606705	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
843	258	3	2026-02-17 07:37:57.925164	\N		أجهزة علاج طبيعي	\N	\N	morning
844	271	3	2026-02-17 07:48:19.480863	\N	الجلسة الرابعة من البكج 	تمارين تأهيلية	\N	\N	morning
845	238	3	2026-02-17 07:48:55.287976	\N	الجلسة التاسعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
846	283	3	2026-02-17 07:55:54.930746	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
847	269	3	2026-02-17 07:56:35.731684	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
848	121	3	2026-02-17 08:05:01.464391	\N	خدمة جديدة: جلسات علاج إضافية - بكج جديد 6 جلسات + الجلسة المجانسة من العرض (6 جلسة) (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
849	332	3	2026-02-17 08:26:18.393188	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض اليوم بعد استشارة البارحة وتقديم الاشعه للدكتور  (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
850	347	3	2026-02-17 08:40:14.954398	\N	استشارة اولية	\N	\N	\N	morning
851	255	3	2026-02-17 08:40:50.760428	\N	الجلسة السابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
852	260	3	2026-02-17 09:45:51.586431	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
853	149	3	2026-02-17 09:49:12.788685	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
854	90	2	2026-02-17 10:09:12.577476	\N	تعييار +موعد للتجميل 	\N	\N	\N	morning
855	98	2	2026-02-17 10:10:13.352491	\N	لبس الطرف +قالب جديد 	\N	\N	\N	morning
856	334	3	2026-02-17 10:49:38.490558	\N	حضرت للاستشارة مره ثانية بعد جلب الاشعه 	\N	\N	\N	morning
857	198	3	2026-02-17 10:51:43.24897	\N	خدمة جديدة: جلسات علاج إضافية (4 جلسة) (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
858	181	3	2026-02-17 10:57:58.288645	\N	جلسة مجانية من ضمن العرض 	تمارين تأهيلية	\N	\N	morning
859	348	2	2026-02-17 11:04:30.37273	\N	استفسار بخصوص مسند القدم وتم اعطاء ملاحضات تخص مسنده القديم ولاتوجد مشكلة 	\N	\N	\N	morning
860	153	3	2026-02-17 11:25:50.725764	\N	الجلسة الثامنه من البكج 	تمارين تأهيلية	\N	\N	morning
861	249	3	2026-02-17 11:26:59.429782	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
862	152	3	2026-02-17 11:33:27.989274	\N	الجلسة العاشرة والاخيره من البكج 	تمارين تأهيلية	\N	\N	morning
1682	555	3	2026-02-28 18:05:42.445685	\N	اخذ المريض استشارة حيث تم تحويله من قبل دكتور حسن ناجي ويباشر من يوم غد	استشارة طبية	\N	\N	evening
864	299	3	2026-02-17 11:52:21.54622	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
865	298	3	2026-02-17 12:01:46.155212	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
4395	1036	3	2026-04-18 15:18:58.440656	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
867	284	2	2026-02-17 12:42:15.243726	\N	صيانة شتل لوك 	\N	\N	\N	morning
868	349	2	2026-02-17 12:42:36.012409		تم شراء طرف فوق الركبة ميكانيكي ثابت بقيمة 4350000	\N	\N	\N	morning
157	90	2	2026-01-26 07:25:17.329827	تدريب على الطرف 	تدريب على الطرف 	\N	\N	\N	\N
869	287	3	2026-02-17 13:18:32.108259	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
870	302	3	2026-02-17 13:18:56.772158	\N		أجهزة علاج طبيعي	\N	\N	morning
871	304	3	2026-02-17 13:20:40.829863	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
872	289	3	2026-02-17 13:37:43.282428	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
873	288	3	2026-02-17 13:42:31.128752	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
874	355	3	2026-02-17 14:16:20.622626	\N	خدمة جديدة: جلسات علاج إضافية - باش المريض بعد الإستشارة مباشرةً عند دكتور مصطفى  (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
875	350	1	2026-01-27 14:25:29	\N	التدريب على الطرف	\N	\N	\N	morning
876	340	3	2026-02-17 14:52:09.529103	\N	خدمة جديدة: جلسات علاج إضافية (8 جلسة) (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
877	356	3	2026-02-17 15:00:47.853811	\N	باشر المريض بجلسة ابر صينية  مباشرةً بعد استشارة دكتور مصطفى وكانت جلسته مجانية بأمر من دكتور ياسر حسب تبيلغ دكتور مصطفى 	\N	\N	\N	morning
878	358	3	2026-02-17 15:05:35.941728	\N	باشر المريض بتكملة علاجه والبكج المدفوع مسبقًا له بتاريخ 12/8 	أجهزة علاج طبيعي	\N	\N	morning
879	270	3	2026-02-17 15:20:30.598129	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
880	222	3	2026-02-17 15:21:49.110585	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	morning
881	189	3	2026-02-17 15:22:08.203865	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
882	188	3	2026-02-17 15:22:38.249102	\N	الجلسة الثامنة من البكج	تمارين تأهيلية	\N	\N	morning
883	243	3	2026-02-17 15:23:20.455869	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
884	191	3	2026-02-17 15:26:43.702037	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
885	368	4	2026-02-17 16:02:29.4255	تم الفحص والمعاينة وتبين ان المريض بحاجة الى تدخل جراحي	استعلام 	\N	\N	\N	evening
887	307	3	2026-02-17 16:08:20.953342		خدمة جديدة: جلسات علاج إضافية - باشرت المريضة ببكج من 6 جلسات بعد جلستين مفردات  (6 جلسة) (تكلفة: 160,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
888	60	3	2026-02-17 16:26:32.37229	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
889	309	3	2026-02-17 16:38:44.840385	\N		تمارين تأهيلية	\N	\N	evening
890	294	3	2026-02-17 16:55:57.263014	\N		أجهزة علاج طبيعي	\N	\N	evening
891	378	1	2026-02-17 16:58:49.161168	\N	صيانة قوالب لكلا الطرفين	\N	\N	\N	evening
892	376	3	2026-02-17 17:00:07.176439	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضة مباشرة بعد استشارة دكتور مصطفى بجلسة مفردة حيث انها اجرت عملية بسبب اصابتها بإنزلاق الفقرات القطنية كونها تعرضت الى حادث سقوط  (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
893	344	3	2026-02-17 17:33:05.214387	\N	خدمة جديدة: جلسات علاج إضافية - جلسة ابر صينية  (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
894	208	3	2026-02-17 17:56:49.539812	\N	خدمة جديدة: جلسات علاج إضافية - جددت المريضة بكج من 6 جلسات (6 جلسة) (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
895	84	3	2026-02-17 18:19:02.554849	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
896	380	3	2026-02-17 18:29:38.062366	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض مباشرةً بعد استشارة دكتور مصطفى بجلسة ابر صينية (تكلفة: 20,000 د.ع)	\N	\N	\N	\N
897	265	3	2026-02-17 19:12:06.887113	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
898	311	3	2026-02-17 19:12:21.030838	\N		أجهزة علاج طبيعي	\N	\N	evening
899	322	3	2026-02-17 19:12:52.593517	\N		تمارين تأهيلية	\N	\N	evening
900	345	3	2026-02-18 05:14:34.118892	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
901	64	3	2026-02-18 05:27:51.03258	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 62 (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
902	346	3	2026-02-18 05:56:45.872911	\N	خدمة جديدة: جلسات علاج إضافية (9 جلسة) (تكلفة: 225,000 د.ع)	\N	\N	\N	\N
903	261	3	2026-02-18 06:01:29.410389	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
904	147	3	2026-02-18 06:47:32.228237	\N	الجلسة الرابعة م البكج 	تمارين تأهيلية	\N	\N	morning
905	283	3	2026-02-18 06:53:35.136488	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
906	381	3	2026-02-18 07:35:10.983469	\N	خدمة جديدة: جلسات علاج إضافية - باشرت المريضه بعد الاستشارة مباشرتا مع الدكتور عبد الله  (6 جلسة) (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
907	79	3	2026-02-18 07:38:27.599444	\N	خدمة جديدة: جلسات علاج إضافية (4 جلسة) (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
908	326	3	2026-02-18 08:16:28.075532	\N	خدمة جديدة: جلسات علاج إضافية (3 جلسة) (تكلفة: 75,000 د.ع)	\N	\N	\N	\N
910	165	3	2026-02-18 08:23:52.553136	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
911	55	3	2026-02-18 09:05:50.67515	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
912	255	3	2026-02-18 09:45:36.525326	\N	الجلسة الثامنة من البكج	أجهزة علاج طبيعي	\N	\N	morning
913	299	3	2026-02-18 09:47:10.141169	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1704	508	3	2026-02-28 20:38:47.067793	\N		أجهزة علاج طبيعي	\N	\N	morning
915	198	3	2026-02-18 11:59:11.340507		الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
4396	1036	3	2026-04-18 15:19:16.192318	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
917	384	1	2026-02-04 12:23:12	\N	تدريب على الطرف	\N	\N	\N	morning
918	335	3	2026-02-18 12:40:39.219931	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
919	196	2	2026-02-18 12:43:00.899713	\N	تم لبس الطرف والتدريب عليه والاستلام ( لاتوجد مشاكل )	\N	\N	\N	morning
920	385	1	2026-02-04 12:44:08	\N	تجميل الطرف 	\N	\N	\N	morning
922	293	3	2026-02-18 13:06:41.790354	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
924	386	3	2026-02-18 13:13:58.049473	\N	استشارة اولية 	\N	\N	\N	morning
925	389	1	2026-02-04 13:20:01	\N	تدريب مع استلام الطرف	\N	\N	\N	morning
4397	1042	1	2026-04-18 15:26:02.380404	\N	فحص ومعاينه مع طلب اشعه ورنين للمريضه 	استشارة طبية	\N	\N	evening
909	347	3	2026-02-18 08:20:00.167084		خدمة جديدة: جلسات علاج إضافية - الجلسة الاولى من البكج  (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
928	339	3	2026-02-18 13:40:55.397582	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
863	335	3	2026-02-17 11:34:05.2981		خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد استشارة البارحه  (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
929	392	1	2026-02-05 13:53:03	\N	استلام الطرف 	\N	\N	\N	morning
930	304	3	2026-02-18 13:53:44.797728	\N	خدمة جديدة: جلسات علاج إضافية - جلسة فردية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
4491	780	1	2026-04-19 14:40:59.186437	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
932	393	3	2026-02-18 14:38:48.813091	\N	زارنا المريض بعدما شاهد اعلان المركز من خلال الفيس بوك حيث يعاني المريض من جلطة دماغية ومع صعوبة الحركة والمشي حيث تم عرض المريض على الطبيب المعالج مصطفى العضاض	\N	\N	\N	morning
927	391	3	2026-02-18 13:38:26.107196	زارتنا المريضة بعد مشاهدة منشورات المركز من خلال تطبيق التيوك توك واليوم جاءت لمركزنا لغرض الفحص والمعاينة من قبل الطبيب المعالج مصطفى العضاض حيث كانت تعاني من انزلاق بالفقرات 		أجهزة علاج طبيعي	\N	\N	morning
933	394	3	2026-02-18 15:44:49.575918	\N	تم زيارة المريض بعد التحويل من قبل الدكتور علي فاخر 	أجهزة علاج طبيعي	\N	\N	morning
934	340	3	2026-02-18 15:57:04.789985	\N	جلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
935	394	3	2026-02-18 16:09:27.957947	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
921	387	1	2026-02-04 12:51:10		صيانه قالب    	\N	\N	\N	morning
923	388	1	2026-02-04 13:12:19		تسديد مبلغ 300000 الف دينار عراقي  مع صيانه قالب	\N	\N	\N	morning
936	344	3	2026-02-18 16:15:21.649524	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	evening
937	309	3	2026-02-18 16:18:59.584608	\N	1	أجهزة علاج طبيعي	\N	\N	evening
938	237	3	2026-02-18 16:46:23.502722	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
939	319	3	2026-02-18 17:07:34.232351	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
940	224	3	2026-02-18 18:20:21.904609	\N	خدمة جديدة: جلسات علاج إضافية - المريضة جددت بكج من 6 جلسات  (6 جلسة) (تكلفة: 90,000 د.ع)	\N	\N	\N	\N
941	324	3	2026-02-18 18:21:23.488259	\N		أجهزة علاج طبيعي	\N	\N	evening
942	376	3	2026-02-18 18:36:00.734753	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
943	342	3	2026-02-18 19:00:00.193127	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
944	356	3	2026-02-18 19:36:36.087552	\N	جلسة ابر صينية مجانية 	\N	\N	\N	evening
945	308	3	2026-02-18 19:38:34.671344	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	evening
946	322	3	2026-02-18 19:39:03.813545	\N		تمارين تأهيلية	\N	\N	evening
947	225	3	2026-02-18 19:40:39.255375	\N	الجلسة السابعة من البكج	أجهزة علاج طبيعي	\N	\N	evening
948	108	3	2026-02-18 19:41:41.673193	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	evening
949	177	3	2026-02-18 20:00:45.021652	\N	جلسة مجانية	\N	\N	\N	evening
950	158	3	2026-02-18 20:01:10.911544	\N	الجلسة الخامسة	أجهزة علاج طبيعي	\N	\N	evening
951	302	3	2026-02-18 20:02:03.218287	\N		أجهزة علاج طبيعي	\N	\N	evening
1706	224	3	2026-02-28 21:01:16.014118	\N		روبوت	\N	\N	morning
952	345	3	2026-02-19 05:09:45.638746	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
953	205	3	2026-02-19 05:10:25.381485	\N	الجلسة المجانية من العرض 	تمارين تأهيلية	\N	\N	morning
954	271	3	2026-02-19 05:11:01.114131	\N	الجلسة الخامسة نم البكج 	تمارين تأهيلية	\N	\N	morning
955	287	3	2026-02-19 05:43:31.732719	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
956	395	3	2026-02-19 06:03:13.893109	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
957	205	3	2026-02-19 06:12:01.539443	\N	خدمة جديدة: جلسات علاج إضافية - جدد المريض بكج من 6 جلسات  (6 جلسة) (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
958	269	3	2026-02-19 06:24:04.008646	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
959	346	3	2026-02-19 06:25:28.538414	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
960	121	3	2026-02-19 07:32:42.262092	\N	الجلسة الاولى من البكج الجديد	أجهزة علاج طبيعي	\N	\N	morning
961	283	3	2026-02-19 07:34:39.225487	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
962	255	3	2026-02-19 08:10:13.737498	\N	الجلسة التاسعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4498	1011	1	2026-04-19 15:42:43.941192	\N	جلسه رابعه	أجهزة علاج طبيعي	\N	\N	evening
964	396	1	2026-02-04 08:32:24	\N	تم فحص المريض وشراء اصبع سلكوني 	\N	\N	\N	morning
965	15	1	2026-02-18 08:37:02	\N	تم زياره المركز لغرض التدريب	\N	\N	\N	morning
967	372	1	2026-02-01 08:48:02	\N	زياره لغرض الفحص وتم دفع مبلغ 500000 الف والباقي 2500000 مع اخذ قالب 	\N	\N	\N	morning
968	372	1	2026-02-04 08:49:47	\N	دفع مبلغ قدره 1500000 والباقي مليون دينار 	\N	\N	\N	morning
969	372	1	2026-02-11 08:51:11	\N	فحص القالب test مع تسديد مبلغ 1000000 	\N	\N	\N	morning
970	372	1	2026-02-12 08:51:53	\N	لغرض التدريب 	\N	\N	\N	morning
971	372	1	2026-02-14 08:52:10	\N	لغرض التدريب	\N	\N	\N	morning
973	372	1	2026-02-16 08:52:26	\N	لغرض التدريب	\N	\N	\N	morning
976	399	1	2026-02-11 09:00:33	\N	تدريب	\N	\N	\N	morning
974	372	1	2026-02-18 08:52:45	\N	لغرض التدريب	\N	\N	\N	morning
977	399	1	2026-02-12 09:00:56	\N	تدريب مع استلام الطرف تيست	\N	\N	\N	morning
978	399	1	2026-02-14 09:01:06	\N	تدريب	\N	\N	\N	morning
975	399	1	2026-02-10 09:00:22	\N	تدريب على الطرف	\N	\N	\N	morning
972	397	3	2026-02-19 08:52:14.195402		تم زيارة مركزنا لهذا اليوم بعد ان سمعه من احد الاشخاص عن مركزنا لذلك تم اخذ الاستشارة من قبل الطبيب المعالج عبد الله خان ومن ثم المباشرة باخذ بكج من 6 جلسات حيث كان المريض يعاني من تشنج عضلي بسبب كثرة العمل على الكمبيوتر	أجهزة علاج طبيعي	6	\N	morning
979	399	1	2026-02-15 09:01:16	\N	تدريب	\N	\N	\N	morning
980	399	1	2026-02-16 09:01:30	\N	تدريب	\N	\N	\N	morning
981	399	1	2026-02-18 09:01:41	\N	تدريب	\N	\N	\N	morning
982	320	3	2026-02-19 09:09:07.369074	\N	خدمة جديدة: جلسات علاج إضافية - مريضة تحولت من الشفت المسائي الى الشفت الصباحي بسبب الوقت (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
983	364	1	2026-01-31 09:12:48	\N	اخذ قالب 	\N	\N	\N	morning
984	364	1	2026-02-09 09:13:03	\N	لغرض التدريب	\N	\N	\N	morning
985	364	1	2026-02-11 09:13:16	\N	تدريب	\N	\N	\N	morning
986	364	1	2026-02-14 09:13:28	\N	تدريب	\N	\N	\N	morning
988	357	1	2026-01-26 09:21:41	\N	فحص القالب مع التدريب والاستلام	\N	\N	\N	morning
989	357	1	2026-01-28 09:22:26	\N	صيانه قالب	\N	\N	\N	morning
990	357	1	2026-01-29 09:22:41	\N	صيانه	\N	\N	\N	morning
991	357	1	2026-01-31 09:22:55	\N	صيانه	\N	\N	\N	morning
992	357	1	2026-02-05 09:23:11	\N	لغرض التعيار	\N	\N	\N	morning
993	357	1	2026-02-12 09:23:26	\N	صيانه قالب	\N	\N	\N	morning
994	15	1	2026-02-07 09:26:38	\N	لغرض التدريب داخل المركز وتم استرجاع الطرف 	\N	\N	\N	morning
995	15	1	2026-02-08 09:26:52	\N	تدريب	\N	\N	\N	morning
996	15	1	2026-02-10 09:27:03	\N	تدريب	\N	\N	\N	morning
997	15	1	2026-02-15 09:27:16	\N	تدريب	\N	\N	\N	morning
998	400	1	2026-02-07 09:39:00	\N	اخذ قالب 	\N	\N	\N	morning
1174	49	1	2026-01-24 12:50:37	\N	تدريب	\N	\N	\N	morning
1176	49	1	2026-01-26 12:51:10	\N	تدريب	\N	\N	\N	morning
999	401	1	2026-02-07 09:43:52	\N	لغرض التدريب مع التعيار	\N	\N	\N	morning
1000	401	1	2026-02-14 09:44:16	\N	صيانه قالب مع تجميل الطرف 	\N	\N	\N	morning
1001	402	1	2026-02-07 09:48:17	\N	زياره لغرض تجميل الطرف	\N	\N	\N	morning
963	392	1	2026-02-07 08:20:03	دفعه ثانيه مع صيانه قدم	دفعه ثانيه 	\N	\N	\N	morning
4398	1033	3	2026-04-18 15:31:43.019417	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4400	1035	3	2026-04-18 15:36:16.642738	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4402	608	3	2026-04-18 15:54:46.214907	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4403	608	3	2026-04-18 15:54:50.483386	\N		أجهزة علاج طبيعي	\N	\N	evening
4449	1001	3	2026-04-15 06:00:32	\N	استشاره اوليه سيباشر حسب الوقت المخصص له 	استشارة طبية	\N	\N	morning
4459	1046	3	2026-04-19 07:04:00.964716	\N	باشر المريض بعد ان اتم الاستشارة الاولية من قبل الطبيب المعالج مصطفى العضاض	استشارة طبية	\N	\N	morning
1009	363	1	2026-01-10 09:54:08	\N	تم مراجعه المركز لصيانه القالب مع شد باندج ودفع مبلغ 250000 الف والباقي 250000 الف 	\N	\N	\N	morning
1010	363	1	2026-01-31 09:54:34	\N	صيانه قالب 	\N	\N	\N	morning
1011	363	1	2026-02-02 09:55:04	صيانه قالب مع شراء سلكون 3D بقيمه 800000 الف 	صيانه قالب مع شراء سلكون 3d	\N	\N	\N	morning
1012	363	1	2026-02-07 09:57:32	\N	صيانه قالب مع اخذ قالب جديد درجه ثانيه بسعر 750000 الف 	\N	\N	\N	morning
1013	363	1	2026-02-08 09:58:34	\N	تم تحويل مبلغ قدره 1500000 والباقي 250000 على الحساب الكلي 	\N	\N	\N	morning
1014	363	1	2026-02-14 09:58:48	\N	صيانه قالب 	\N	\N	\N	morning
1015	299	3	2026-02-19 09:59:25.402258	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1016	390	1	2026-02-08 10:00:52	\N	صيانه قالب 	\N	\N	\N	morning
1017	390	1	2026-02-09 10:01:11	\N	صيانه قالب 	\N	\N	\N	morning
1018	390	1	2026-02-12 10:01:33	\N	تبديل سليكون بحجم اكبر 	\N	\N	\N	morning
1019	390	1	2026-02-14 10:01:51	\N	تبديل سليكون 	\N	\N	\N	morning
1707	424	3	2026-02-28 21:02:43.028084	\N		أجهزة علاج طبيعي	\N	\N	morning
1021	15	1	2026-02-19 10:03:29.324453	\N	تدريب	\N	\N	\N	morning
1022	153	3	2026-02-19 10:22:14.711971		الجلسة التاسعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1024	403	1	2026-02-14 10:24:40	\N	tast	\N	\N	\N	morning
1025	76	1	2026-02-08 10:28:37	\N	صيانه قالب 	\N	\N	\N	morning
1028	389	1	2026-02-08 10:31:29	\N	تدريب	\N	\N	\N	morning
1023	403	1	2026-02-08 10:22:41		اخذ قالب مع دفع مبلغ 1000000 	\N	\N	\N	morning
1029	404	1	2026-02-08 10:40:24	\N	تدريب مع استلام الطرف مع دفع مبلغ مليون والباقي 500000	\N	\N	\N	morning
1030	335	3	2026-02-19 10:40:33.770212	\N	الجلسة الثالثة من البكج 	تمارين تأهيلية	\N	\N	morning
1032	405	1	2026-02-10 10:51:00	\N	لغرض تبديل السيليكون ولم يستبدل لحين وصول قياسي	\N	\N	\N	morning
1033	198	3	2026-02-19 10:51:06.490392	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1034	353	1	2026-02-09 10:52:40	\N	تجميل الطرف	\N	\N	\N	morning
1035	406	1	2026-02-09 10:57:18	\N	لغرض صيانه شتل لوك	\N	\N	\N	morning
1036	298	3	2026-02-19 11:15:40.032594	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1040	409	1	2026-02-10 11:38:12	\N	لغرض فحص المسند 	\N	\N	\N	morning
1041	410	1	2026-02-10 11:43:34	\N	صيانه قالب	\N	\N	\N	morning
1045	412	1	2026-02-11 12:00:49	\N	لغرض تجميل الطرف	\N	\N	\N	morning
1046	196	2	2026-02-19 12:02:36.51399	\N	تدريب على الطرف +تجميل للطرف	\N	\N	\N	morning
1047	413	1	2026-02-11 12:04:16	\N	صيانه قالب	\N	\N	\N	morning
1031	405	1	2026-02-08 10:50:10		لغرض شراء سيليكون بروتد مع سليف اوتوبك	\N	\N	\N	morning
1049	414	1	2026-02-11 12:08:19	\N	صيانه شتل لوك مع تعيار	\N	\N	\N	morning
1050	415	1	2026-02-11 12:16:51	\N	اخذ قالب 	\N	\N	\N	morning
1051	416	1	2026-02-11 12:20:49	\N	صيانه قالب مع التدريب	\N	\N	\N	morning
1052	417	1	2026-02-11 12:45:08	\N	تم فحص المريض وتم شراء حزام تدوير بقيمه 75000 وتم دفع المبلغ كامل	\N	\N	\N	morning
1053	384	1	2026-02-11 12:46:23	\N	تدريب	\N	\N	\N	morning
1054	418	1	2026-02-11 12:52:20	\N	تم فحص المريض وتم تخصيص طرف له مع اخذ قالب علما ان الطرف مجاني	\N	\N	\N	morning
1056	363	1	2026-02-11 12:54:57	\N	فحص القالب مع التدريب والاستلام 	\N	\N	\N	morning
1058	420	1	2026-02-12 13:08:35	\N	صيانه	\N	\N	\N	morning
1059	372	1	2026-02-19 13:09:30.191028	\N	تدريب	\N	\N	\N	morning
1060	421	1	2026-02-12 13:17:11	\N	تعيار مع تدريب	\N	\N	\N	morning
1061	422	1	2026-02-12 13:35:33	\N	صيانه قالب	\N	\N	\N	morning
1062	363	1	2026-02-19 13:39:12.427993	صيانه قالب مع تعيار 		\N	\N	\N	morning
1037	407	1	2026-02-09 11:19:05		 تم فحص ومعاينه المريض مع اخذ قالب وشراء مسند	\N	\N	\N	morning
1064	423	1	2026-02-19 13:52:56.52591	\N	شراء قالب جديد درجه ثانيه بسعر 900000الف تم اخذ القالب مع دفع مبلغ 300000 	\N	\N	\N	morning
1065	424	3	2026-02-19 18:00:25.11971	\N	باشر المريض بعد استشارة دكتور بيرم بجلسة مفردة 	تمارين تأهيلية	\N	\N	evening
1066	380	3	2026-02-19 18:07:39.556173	\N	باشر المريض ببكج من 6 جلسات بعد قيامة بجلسة ابر صينية 	أجهزة علاج طبيعي	\N	\N	evening
1115	440	1	2026-02-14 08:57:01	\N	فحص مع تخصيص حزام تدوير مع اخذ القياسات 	\N	\N	\N	morning
1038	408	1	2026-02-10 11:26:10		سبب الزياره مراجعه مع شراء مسند afo مع مساند عدد 2 للكف	\N	\N	\N	morning
1057	419	1	2026-02-12 12:59:31		تمت المراجعه لغرض فحص المسند والصيانه	\N	\N	\N	morning
1055	418	1	2026-02-16 12:52:36		فحص القالب 	\N	\N	\N	morning
1067	425	3	2026-02-19 18:20:47.985863	\N	باشرت المريضة بالجلسة الاولى بعد استشارة دكتور بيرم ببكج 6 جلسات 	أجهزة علاج طبيعي	\N	\N	evening
1068	426	3	2026-02-19 18:32:07.124047	\N	اخذ المريض استشارة عند دكتور مصطفى ويباشر في وقت لاحق 	استشارة طبية	\N	\N	evening
1069	208	3	2026-02-19 18:32:41.101421	\N		أجهزة علاج طبيعي	\N	\N	evening
1070	192	3	2026-02-19 18:56:36.121918	\N		أجهزة علاج طبيعي	\N	\N	evening
1071	356	3	2026-02-19 18:57:47.606531	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	evening
1072	222	3	2026-02-19 18:58:33.872959	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	evening
1073	340	3	2026-02-19 18:58:55.391554	\N		تمارين تأهيلية	\N	\N	evening
1074	344	3	2026-02-19 18:59:16.779886	\N		أجهزة علاج طبيعي	\N	\N	evening
1661	550	3	2026-02-28 10:21:09.756851	\N	زارنا المريض بعد ما تعرف على مركزنا من خلال الفيس بوك علما ان المريض يعاني من انزلاق بالفقرات الظهر السفلية نتيجة العمل والجهد اثناء العمل 	استشارة طبية	\N	\N	morning
1076	322	3	2026-02-19 18:59:35.442224	\N		تمارين تأهيلية	\N	\N	evening
1077	264	3	2026-02-19 18:59:55.835708	\N		تمارين تأهيلية	\N	\N	evening
1078	324	3	2026-02-19 19:00:12.425709	\N		أجهزة علاج طبيعي	\N	\N	evening
1079	309	3	2026-02-19 19:00:46.226001	\N		تمارين تأهيلية	\N	\N	evening
1080	188	3	2026-02-19 19:01:38.142716	\N	الجلسة التاسعة 	تمارين تأهيلية	\N	\N	evening
1081	270	3	2026-02-19 19:03:29.790922	\N		تمارين تأهيلية	\N	\N	evening
1082	427	3	2026-02-19 19:14:24.78291	\N	اخذ المريض استشارة عند دكتور مصطفى وقرر المباشرة في وقت لاحق	\N	\N	\N	evening
1083	427	3	2026-02-19 19:15:10.79212	\N	اخذ المريض استشارة عند دكتور مصطفى وقرر المباشرة في وقت لاحق	استشارة طبية	\N	\N	evening
1084	338	3	2026-02-19 19:41:31.035691	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1085	429	3	2026-02-19 20:44:23.021748	\N	اخذ المريض جلسة ابر صينية عند دكتور مصطفى يوم امس بتاريخ 18/2 وتم تسديد مبلغها 20 الف اليوم بعد ان تم الاتفاق المسبق مع الاستاذ اكرم كما انه في النظام لايمكن دفع 20 الف لذلك سجلت بمبلغ 25 ولايوجد ايضًا اختيار لجلسات الابر الصينية	أجهزة علاج طبيعي	\N	\N	evening
1086	307	3	2026-02-19 20:49:52.124675	\N		أجهزة علاج طبيعي	\N	\N	evening
1664	550	3	2026-02-28 10:30:01.310546	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بعد الاستشارة مباشرتا مع الدكتور عبد الله خان 	أجهزة علاج طبيعي	\N	\N	\N
4399	1033	3	2026-04-18 15:32:01.461212	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4401	1035	3	2026-04-18 15:36:36.519974	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
1093	258	3	2026-02-21 05:05:26.889568	\N	الجلسة الثالثة 	أجهزة علاج طبيعي	\N	\N	morning
1094	64	3	2026-02-21 05:32:59.042726	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 63 (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1095	432	3	2026-02-21 05:39:04.044126	\N	استشارة اولية النص بعد الترتيب والصياغة الرسمية: حضر مرافق المريض فقط نظرًا لبُعد سكنهم، وذلك للاستفسار عن الجلسات وجهاز الروبوت. وبعد أن تم شرح الحالة والإجراءات له بشكل كامل، قرر إحضار والده للمعاينة، ومن ثم البدء بالخطة العلاجية حسب تعليمات الطبيب المعالج.	استشارة طبية	\N	\N	morning
1096	238	3	2026-02-21 05:41:18.078955	\N	الجلسة العاشرة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1097	397	3	2026-02-21 05:53:38.108281	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1098	433	3	2026-02-21 06:18:15.698219	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بالجلسة الاولى بتاريخ اليوم بعد استشارة الدكتور بيرام  (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1100	346	3	2026-02-21 06:31:07.905063	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1101	293	3	2026-02-21 06:43:43.064377	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1102	238	3	2026-02-21 06:59:21.501005	\N	خدمة جديدة: جلسات علاج إضافية (9 جلسة) (تكلفة: 225,000 د.ع)	\N	\N	\N	\N
1103	122	3	2026-02-21 07:04:05.570387	\N	حضرت المريضة لأخذ الإبرة الثانية عند الدكتور بيرام، وقد طُلب منها الحضور لتلقي الإرشادات الخاصة بالتمارين المنزلية. حضرت اليوم وتم تدريبها على التمارين التي يتوجب عليها أداؤها في المنزل.	تمارين تأهيلية	\N	\N	morning
1104	434	3	2026-02-21 07:24:14.717532	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد الاستشاره مباشرتا  (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1105	283	3	2026-02-21 07:52:34.796772	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1106	255	3	2026-02-21 07:58:25.312326	\N	الجلسة العاشرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1107	435	3	2026-02-21 08:11:17.825895	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد الاستشارة مباشرتا  (6 جلسة) (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
1108	298	3	2026-02-21 08:11:56.145205	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1110	436	1	2026-02-08 08:31:48	\N	تم تحويل مبلغ قدره 4000000 والباقي مليون 	\N	\N	\N	morning
1111	436	1	2026-02-14 08:33:21	\N	لغرض التدريب مع تجميل الطرف والاستلام 	\N	\N	\N	morning
1112	437	1	2026-02-21 08:39:12.670188	\N	تم فحص المريض ومعاينته 	\N	\N	\N	morning
1113	438	1	2026-02-14 08:43:24	\N	فحص المريض مع المعاينه 	\N	\N	\N	morning
1114	439	1	2026-02-14 08:49:20	\N	تم زياره المركز لغرض الفحص والمعاينه مع تحديد نوع الطرف 3r78مع قدم متحركه وبسعر 8000000 مع اخذ القالب 	\N	\N	\N	morning
1116	440	1	2026-02-16 08:57:31	\N	تم استلام الحزام مع دفع المبلغ كامل 	\N	\N	\N	morning
1117	441	1	2026-02-14 09:12:31	\N	تم شراء سيليكون حلقي اوسور بقيمه 900000 الف وتم استلام السليكون 	\N	\N	\N	morning
1118	441	1	2026-02-19 09:13:25	\N	لغرض تبديل السليكون هيما حلقي بدل من اوسون مع تعيار الطرف 	\N	\N	\N	morning
1119	55	3	2026-02-21 09:15:35.969262	\N	خدمة جديدة: جلسات علاج إضافية - جلسة رقم 17 (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1120	442	1	2026-01-25 09:20:02	\N	تجميل الطرف 	\N	\N	\N	morning
1121	442	1	2026-02-14 09:20:14	\N	صيانه قالب 	\N	\N	\N	morning
1122	45	1	2026-01-14 09:24:15	\N	لغرض التعيار 	\N	\N	\N	morning
1123	45	1	2026-01-26 09:24:34	\N	لغرض التعيار 	\N	\N	\N	morning
1124	45	1	2026-01-31 09:25:15	\N	لغرض صيانه القالب 	\N	\N	\N	morning
1126	432	3	2026-02-21 09:29:14.150238	\N	حضر مرافق المريض من جديد برفقة والده لغرض الاستشارة وإجراء المعاينة السريرية. وبعد التقييم، تبيّن أنه لا يمكن البدء حاليًا بجلسات جهاز الروبوت، وذلك بسبب وجود تشنج في الساقين وضعف شديد في إحدى الرجلين.\n\nوعليه، سيباشر المريض اعتبارًا من يوم غدٍ بجلسات العلاج الطبيعي بهدف تقوية العضلات وتحسين القدرة الحركية، تمهيدًا للتمكن من استخدام جهاز الروبوت لاحقًا.	استشارة طبية	\N	\N	morning
1127	443	1	2026-02-14 09:35:09	\N	لغرض فحص القوالب tast	\N	\N	\N	morning
1128	299	3	2026-02-21 09:40:49.151566	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1129	444	1	2026-02-15 09:41:08	\N	صيانه قالب	\N	\N	\N	morning
1130	444	1	2026-01-04 09:41:38	\N	لغرض التدريب 	\N	\N	\N	morning
1131	383	1	2026-02-16 09:43:41	\N	استلام القالب مع التدريب ودفع مبلغ قدره 200000	\N	\N	\N	morning
1132	350	1	2026-01-24 09:45:59	\N	التدريب 	\N	\N	\N	morning
1133	350	1	2026-01-25 09:46:16	\N	التدريب	\N	\N	\N	morning
1134	350	1	2026-01-26 09:47:00	\N	لغرض التدريب  على الطرف 	\N	\N	\N	morning
1135	350	1	2026-01-28 09:47:26	\N	لغرض التدريب على الطرف 	\N	\N	\N	morning
1136	350	1	2026-01-29 09:47:47	\N	لغرض التدريب على الطرف 	\N	\N	\N	morning
1137	350	1	2026-01-31 09:48:10	\N	لغرض التدريب على الطرف 	\N	\N	\N	morning
1138	350	1	2026-02-01 09:48:29	\N	لغرض التدريب على الطرف 	\N	\N	\N	morning
1140	287	3	2026-02-21 09:49:40.053779	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1139	350	1	2026-02-02 09:48:46	مع شراء روتيشن دوار بسعر مليون و250000 الف مع دفع المبلغ كامل مع استلام الطرف 	لغرض التدريب على الطرف 	\N	\N	\N	morning
4469	1048	3	2026-04-19 11:35:01.870743	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1142	15	1	2026-02-21 10:05:31.285053	\N	لغرض التدريب على الطرف	\N	\N	\N	morning
1144	198	3	2026-02-21 10:09:47.873358	\N	الجلسة الرابعة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1145	239	3	2026-02-21 10:10:18.115322	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1146	445	1	2026-02-16 10:10:59	\N	تم فحص ومعاينه المريضه مع تخصيص مسند تقويمي للظهر بسعر مليون وربع مع اخذ قالب	\N	\N	\N	morning
1147	418	1	2026-02-21 10:12:26.611196	\N	لغرض التدريب على الطرف	\N	\N	\N	morning
1148	47	1	2026-01-17 10:14:56	مع دفع مبلغ وقدره 500000 الف والباقي اربع ملايين 	اخذ قالب 	\N	\N	\N	morning
1149	47	1	2026-02-16 10:16:32	\N	لغرض دفع مبلغ قدره 500000 	\N	\N	\N	morning
1662	299	3	2026-02-28 10:22:14.719456	\N	الجلسة الثالثة من البكج الجديد	أجهزة علاج طبيعي	\N	\N	morning
1151	447	1	2026-02-16 10:41:14	\N	استلام طرف يد \nسلكونيه تجميليه مع عكس ميكانيكي الماني 	\N	\N	\N	morning
1153	390	1	2026-02-19 10:46:45	\N	صيانه قالب	\N	\N	\N	morning
1154	426	3	2026-02-21 11:03:35.774123	\N	خدمة جديدة: جلسات علاج إضافية - حضر المريض للاستشارة مجددا عند الدكتور عبد الله خان وباشر بعد الاستشارة مباشرتا  (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1155	185	2	2026-02-21 11:05:09.042883	\N	تم لبس الطرف بنظام الشتل لوك 	\N	\N	\N	morning
1156	354	1	2026-01-27 11:21:29	مع دفع مبلغ قدره 750000	تدريب مع استلام القالب	\N	\N	\N	morning
1157	354	1	2026-01-28 11:22:11	\N	صيانه قالب 	\N	\N	\N	morning
1158	384	1	2026-01-24 11:23:41	\N	تدريب 	\N	\N	\N	morning
1159	384	1	2026-01-25 11:24:03	\N	تدريب على الطرف	\N	\N	\N	morning
1160	384	1	2026-01-27 11:24:23	\N	تدريب على الطرف	\N	\N	\N	morning
1161	384	1	2026-01-28 11:24:43	\N	تدريب على الطرف 	\N	\N	\N	morning
1162	449	3	2026-02-21 11:24:47.742265	\N	حضر المريض للاستشاره عند دكتور عبد الله وسيباشر مع الشفت المسائي بسبب الوقت 	استشارة طبية	\N	\N	morning
1163	384	1	2026-01-29 11:24:59	\N	تدريب على الطرف	\N	\N	\N	morning
1164	384	1	2026-01-31 11:25:33	\N	تدريب على الطرف مع الاستلام	\N	\N	\N	morning
1165	384	1	2026-02-04 11:25:47	\N	تدريب على الطرف	\N	\N	\N	morning
1166	361	1	2026-01-28 11:31:32	\N	تم مراجعه المركز لغرض استلام المسند afo عدد 2	\N	\N	\N	morning
1152	372	1	2026-02-21 10:42:37.514876	مع الاستلام	لغرض التدريب على الطرف	\N	\N	\N	morning
1168	448	2	2026-02-21 12:00:35.598539	\N	تم الفحص من قبل الدكتور واعطائها موعد للبس الطرف حين تتوفر مواد الزراعة (اطراف زراعة)مجاني 	\N	\N	\N	morning
1170	450	1	2026-02-21 12:39:28.453075	\N	اخذ قالب للطرف الايمن مسند كيفو 	\N	\N	\N	morning
1171	47	1	2026-02-21 12:40:08.712691	\N	لغرض التدريب 	\N	\N	\N	morning
1172	49	1	2026-02-21 12:49:46.324438	\N	صيانه القالب الطرف الايسر 	\N	\N	\N	morning
1169	372	1	2026-02-21 12:15:11.937121		test	\N	\N	\N	\N
1143	347	3	2026-02-21 10:06:13.156716		الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1167	385	1	2026-01-29 11:33:37		تدريب على الطرف والاستلام 	\N	\N	\N	morning
1125	45	1	2026-02-14 09:28:43		تغيير مكان اللادبتر مع التعيار 	\N	\N	\N	morning
1179	49	1	2026-01-31 12:52:00	\N	تدرب مع استلام الاطراف 	\N	\N	\N	morning
1180	451	1	2026-02-21 13:02:29.636593		اخذ قالب جديد 	\N	\N	\N	evening
1150	446	1	2026-02-21 10:28:04.591192		لغرض الفحص واخذ قياسات	\N	\N	\N	morning
1182	399	1	2026-02-21 13:59:20.387023	\N	تدريب	\N	\N	\N	evening
1183	304	3	2026-02-21 16:02:59.975617	\N	خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1184	304	3	2026-02-21 16:03:09.952946	\N		أجهزة علاج طبيعي	\N	\N	evening
1185	340	3	2026-02-21 16:03:40.958809	\N		تمارين تأهيلية	\N	\N	evening
1099	395	3	2026-02-21 06:28:03.102466		خدمة جديدة: جلسات علاج إضافية - جلسة مفردة (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1186	158	3	2026-02-21 16:36:02.644956	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
1187	356	3	2026-02-21 16:36:47.656811	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	evening
1188	222	3	2026-02-21 16:37:36.154878	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	evening
1189	177	3	2026-02-21 16:38:15.968298	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1190	453	3	2026-02-21 16:54:57.008134	\N	باشر المريض ببكج من 6 جلسات بعد استشارة دكتور بيرم 	أجهزة علاج طبيعي	\N	\N	evening
1191	270	3	2026-02-21 17:07:40.41284	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1192	270	3	2026-02-21 17:08:00.414759	\N		تمارين تأهيلية	\N	\N	evening
1193	425	3	2026-02-21 17:18:49.497167	\N		أجهزة علاج طبيعي	\N	\N	evening
1194	322	3	2026-02-21 17:19:20.854825	\N		تمارين تأهيلية	\N	\N	evening
1195	424	3	2026-02-21 17:43:28.292373	\N	خدمة جديدة: جلسات علاج إضافية (6 جلسة) (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
1196	424	3	2026-02-21 17:43:40.139517	\N		تمارين تأهيلية	\N	\N	evening
1197	265	3	2026-02-21 18:01:20.101181	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1198	265	3	2026-02-21 18:01:26.287166	\N		أجهزة علاج طبيعي	\N	\N	evening
1199	394	3	2026-02-21 18:01:57.645833	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1200	394	3	2026-02-21 18:02:04.364159	\N		أجهزة علاج طبيعي	\N	\N	evening
1201	323	3	2026-02-21 18:13:47.075291	\N	خدمة جديدة: جلسات علاج إضافية (1 جلسة) (تكلفة: 50,000 د.ع)	\N	\N	\N	\N
1202	323	3	2026-02-21 18:13:56.435438	\N		روبوت	\N	\N	evening
1203	455	3	2026-02-21 18:47:53.026742	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد الاستشارة بجلسة مفردة  (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1204	455	3	2026-02-21 18:47:58.913466	\N		تمارين تأهيلية	\N	\N	evening
1205	455	3	2026-02-21 18:51:18.553835	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 175,000 د.ع)	\N	\N	\N	\N
1206	456	3	2026-02-21 18:58:05.852955	\N	خدمة جديدة: جلسات علاج إضافية - باشر المريض بعد استشارة دكتور بجلسة مفردة  (1 جلسة) (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
1207	456	3	2026-02-21 18:58:14.851517	\N		أجهزة علاج طبيعي	\N	\N	evening
1665	549	3	2026-02-28 10:39:17.949387	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بعد الاستشارة مباشرتا \n	أجهزة علاج طبيعي	\N	\N	\N
1209	457	3	2026-02-21 19:05:47.057221	\N		أجهزة علاج طبيعي	\N	\N	morning
1683	323	3	2026-02-28 18:06:48.762165	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1689	554	3	2026-02-28 18:29:48.028963	\N	اخذ المريض استشارة وباشر بجلسته الاولى 	أجهزة علاج طبيعي	\N	\N	evening
1691	542	3	2026-02-28 18:59:39.977138	\N	المريض اخذ جلسته المفردة الاولى بعد استشارة سابقة 	أجهزة علاج طبيعي	\N	\N	evening
1693	545	3	2026-02-28 19:07:56.700699	\N	باشرت المريضة بجلسة مفردة بعد استشارة سابقة 	أجهزة علاج طبيعي	\N	\N	morning
1700	508	3	2026-02-28 20:01:52.148077	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - بكج لستة جلسات 	أجهزة علاج طبيعي	\N	\N	\N
1701	546	3	2026-02-28 20:21:44.042958	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1702	546	3	2026-02-28 20:27:37.013621	\N	اخذت المريضة جلستها الاولى بعد استشارة مسبقة 	أجهزة علاج طبيعي	\N	\N	morning
1219	458	3	2026-02-21 19:33:53.861025	خدمة جديدة	جلسات علاج إضافية - روبوت (10 جلسة) (تكلفة: 500,000 د.ع)	روبوت	\N	\N	\N
1220	461	3	2026-02-21 19:38:28.095285	\N	باشر المريض بجلسة مفردة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	morning
1221	463	3	2026-02-21 19:54:21.113392	\N		أجهزة علاج طبيعي	\N	\N	morning
1222	462	3	2026-02-21 20:01:21.022732	\N		أجهزة علاج طبيعي	\N	\N	morning
1223	464	3	2026-02-21 20:14:43.558128	\N	اخذ المريض استشارة وقرر انتظار دكتور بيرم 	استشارة طبية	\N	\N	morning
1224	454	3	2026-02-21 21:09:01.936915	\N	المريض اخذ استشارة وقرر المباشرة في وقت لاحق	استشارة طبية	\N	\N	morning
1225	344	3	2026-02-21 21:09:22.886043	\N		أجهزة علاج طبيعي	\N	\N	morning
1226	302	3	2026-02-21 21:09:42.950333	\N		أجهزة علاج طبيعي	\N	\N	morning
1227	324	3	2026-02-21 21:14:19.698901	\N		أجهزة علاج طبيعي	\N	\N	morning
1228	208	3	2026-02-21 21:15:31.010681	\N		أجهزة علاج طبيعي	\N	\N	morning
1229	224	3	2026-02-21 21:15:44.948624	\N		أجهزة علاج طبيعي	\N	\N	morning
1230	74	3	2026-02-21 21:16:11.917784	\N		تمارين تأهيلية	\N	\N	morning
1231	459	3	2026-02-21 21:17:41.295087	\N	المريض سجل معلوماته للإستشارة لكنه خرج قبل ان يأخذها واجلها لوقت اخر	استشارة طبية	\N	\N	morning
1232	380	3	2026-02-21 21:18:05.438769	\N		أجهزة علاج طبيعي	\N	\N	morning
1233	307	3	2026-02-21 21:18:51.149877	\N		أجهزة علاج طبيعي	\N	\N	morning
1234	308	3	2026-02-21 21:19:52.207317	\N		أجهزة علاج طبيعي	\N	\N	morning
1181	452	1	2026-02-21 13:23:06.468781		تسليم الطرف لغرض السحب الثانوي كاربون	\N	\N	\N	evening
1461	488	3	2026-02-24 17:55:46.77594	\N		أجهزة علاج طبيعي	\N	\N	evening
1241	205	3	2026-02-22 05:16:09.359742	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
1242	271	3	2026-02-22 05:16:40.845709	\N	الجلسة السادسة من البكج 	تمارين تأهيلية	\N	\N	morning
1243	465	3	2026-02-22 05:22:52.80631	\N	باشر المريض اليوم باول جلسة من جلسات العلاج الطبيعي بعد استشارة الدكتور بيرام	تمارين تأهيلية	\N	\N	morning
1244	466	3	2026-02-22 06:10:45.529758	\N	راجعتنا المريضة اليوم بتحويل من دكتور غيث حيث تعاني المريضة من كسر قديم من الشهر التاسع مع ورم بالركبة حيث اخذت الاستشارة الاولية من قبل الطبيب المعالج عبد الله خان ومن ثم المباشرة بالعلاج بعدها حيث دفعت المريضة 3 جلسات مع بعض	أجهزة علاج طبيعي	\N	\N	morning
1245	397	3	2026-02-22 06:12:16.891267	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1246	269	3	2026-02-22 06:18:43.855707	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1666	426	3	2026-02-28 10:40:22.952581	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1684	323	3	2026-02-28 18:06:53.193371	\N		تمارين تأهيلية	\N	\N	evening
1249	467	3	2026-02-22 06:54:53.236709	\N	راجعنا المريض بعد تحويل من دكتور بيرم حيث يعاني المريض من اصابة بالحبل الشوكي نتيجة طلق ناري فقد على اثرها الحركة في الاطراف السفلى تم وضع خطة علاجية من قبل الطبيب التركي تشمل الروبوت واجهزة علاج طبيعي واليوم باشرة باول جلسة علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
1250	165	3	2026-02-22 07:05:21.793709	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1251	468	3	2026-02-22 07:29:45.160049	\N	جاءت المريضة اليوم لاخذ استشارة الاولية من قبل الطبيب المعالج عبد الله خان حيث ان المريضة تعاني من انزلاق بالفقرات نتيجة العمل والجهد المستمر اثناء العمل 	استشارة طبية	\N	\N	morning
1252	121	3	2026-02-22 07:39:58.660953	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
1253	147	3	2026-02-22 07:42:09.028593	\N	الجلسة الخامسة من البكج	تمارين تأهيلية	\N	\N	morning
1254	320	3	2026-02-22 08:24:06.988241	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
1255	435	3	2026-02-22 08:25:22.814368	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
1694	307	3	2026-02-28 19:10:27.705524	\N		أجهزة علاج طبيعي	\N	\N	morning
4404	810	3	2026-04-18 15:55:12.075219	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4499	874	1	2026-04-19 15:44:53.138235	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
1260	274	3	2026-02-22 09:47:18.042208	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1262	471	1	2026-02-21 09:50:31	\N	تم تحديد نوع ميركوري الطرف ودفع مبلغ وقدره 9500000  	\N	\N	\N	morning
1263	471	1	2026-02-22 09:51:05.21804	\N	تم تحويل مبلغ قدره 3000000	\N	\N	\N	morning
1264	470	1	2026-02-22 09:53:25.293456	\N	تم فحص ومعاينه المريض وتم تخصيص مساند كيفو ليلي بسعر 200000 الف تم دفع المبلغ كامل 	\N	\N	\N	morning
1265	469	1	2026-02-22 10:01:09.316164	\N	تم فحص ومعاينه المريض وتم تخصيص قالب كاربون درجه اولى بسعر مليون و500000الف 	\N	\N	\N	morning
1266	433	3	2026-02-22 10:08:26.545479	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1268	249	3	2026-02-22 10:20:49.142573	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1269	153	3	2026-02-22 10:21:57.017175	\N	الجلسة العاشرة من البكج 	تمارين تأهيلية	\N	\N	morning
1270	477	1	2026-02-22 10:27:20.113682		تم فحص ومعاينه المريضه وتحديد مسند كيفو ليلي عدد 2 كلا الجانبين بمبلغ قدره 200000 الف تم دفعه كامل مع اخذ القالب 	\N	\N	\N	morning
1271	426	3	2026-02-22 10:30:00.456378	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1272	335	3	2026-02-22 10:40:54.527763	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1273	478	1	2026-02-22 10:43:52.048582	\N	تم مراجعه المركز لغرض تعيار الطرف	\N	\N	\N	morning
1274	299	3	2026-02-22 10:46:15.262646	\N	الجلسة السادسة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1020	347	3	2026-02-19 10:03:07.804492		الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
1275	347	3	2026-02-22 10:47:14.406494	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1276	198	3	2026-02-22 10:49:42.556936	\N	الجلسة المجانية من العرض	أجهزة علاج طبيعي	\N	\N	morning
1277	282	2	2026-02-22 10:52:21.614243	\N	تم لبس الطرف والتدريب عليه 	\N	\N	\N	morning
1278	181	3	2026-02-22 10:53:58.789402	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (12 جلسة) (تكلفة: 300,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1279	381	3	2026-02-22 10:57:34.306393	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1280	479	1	2026-02-21 11:11:19	\N	تم مراجعه المركز لغرض استلام قدم الذي كان يطلب سابقا ولا يوجد اي شي بذمه المركز 	\N	\N	\N	morning
1330	326	3	2026-02-23 05:53:04.398369	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
1331	492	3	2026-02-23 06:30:54.823805	\N	استشارة اولية بدون حضور المريض حضر ذوي المريض فقط مع تقارير المريض كامله للاستفسار من الطبيب	استشارة طبية	\N	\N	morning
1596	539	2	2026-02-26 12:11:19		تغليف حافة القالب 	\N	\N	\N	morning
1282	474	3	2026-02-22 11:29:17.867336	\N	المريض المذكور يراجع مركزنا منذ شهر تشرين الأول، وقد خضع لعدة بكجات علاجية، يتكوّن كل بكج منها من (20–25) جلسة علاجية، وذلك وفق الخطة العلاجية المعتمدة لحالته الصحية.\n\nالمريض مشمول بنظام الضمان الصحي كونه منتسباً إلى وزارة الداخلية، حيث يتحمل نسبة (25%) من أجور العلاج، فيما تتحمل جهة الضمان النسبة المتبقية وفق السياقات المعمول بها.	تمارين تأهيلية	\N	\N	morning
1283	480	3	2026-02-22 11:57:59.272191	\N	باشر المريض بعد استشارة الدكتور بيرام مع الدكتور عبد الله خان	أجهزة علاج طبيعي	\N	\N	morning
1285	481	2	2026-02-22 12:31:13.453286	\N	صيانة قالب +تعييار 	\N	\N	\N	morning
1286	194	3	2026-02-22 12:32:32.915355	\N	حضرت المريضه للاستشاره لغرض الروبوت 	استشارة طبية	\N	\N	morning
1287	284	2	2026-02-22 12:45:43.358372	\N	لديه خلل في قالبه الحكومي خلل في الادبتر تم ضبطه مؤقت لحين معالجته من قبل المركز  الحكومي 	\N	\N	\N	morning
1667	335	3	2026-02-28 10:41:45.073488	\N	الجلسة التاسعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1289	399	1	2026-02-22 13:31:12.409962	\N	لغرض التدريب وتغيير مكان للادفتر 	\N	\N	\N	evening
1290	321	4	2026-02-22 14:34:40.108605	\N	تدريب على الطرف مع استلام الطرف 	\N	\N	\N	evening
1291	380	3	2026-02-22 16:07:00.039163	\N		أجهزة علاج طبيعي	\N	\N	evening
1292	340	3	2026-02-22 16:07:17.559962	\N		تمارين تأهيلية	\N	\N	evening
1293	458	3	2026-02-22 16:20:15.354531	\N		روبوت	\N	\N	evening
1294	177	3	2026-02-22 16:36:50.189771	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1295	222	3	2026-02-22 16:40:30.79556	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	evening
1296	181	3	2026-02-22 16:45:08.40272	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (2 جلسة) (تكلفة: 50,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1297	324	3	2026-02-22 17:10:31.637042	\N		أجهزة علاج طبيعي	\N	\N	evening
1298	482	3	2026-02-22 17:17:39.331006	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1299	482	3	2026-02-22 17:18:14.646373	\N	باشر المريض بعد الاستشارة بجلسة مفردة 	أجهزة علاج طبيعي	\N	\N	evening
1300	322	3	2026-02-22 17:19:03.227966	\N		تمارين تأهيلية	\N	\N	evening
1301	356	3	2026-02-22 17:21:57.900179	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1302	277	3	2026-02-22 17:28:29.232523	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	evening
1303	309	3	2026-02-22 17:33:18.75085	\N	الجلسة المجانية من البكج	تمارين تأهيلية	\N	\N	evening
1304	323	3	2026-02-22 17:44:35.699076	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1305	323	3	2026-02-22 17:44:57.049099	\N		روبوت	\N	\N	evening
1306	424	3	2026-02-22 17:50:59.202202	\N		تمارين تأهيلية	\N	\N	evening
1307	483	3	2026-02-22 17:57:30.162107	\N	احذ المريض استشارة ويباشر يوم غد	استشارة طبية	\N	\N	evening
1308	188	3	2026-02-22 18:15:41.442185	\N	الجلسة الاخيرة من البكج	تمارين تأهيلية	\N	\N	evening
1309	456	3	2026-02-22 18:26:26.662295	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1310	484	3	2026-02-22 18:30:08.226164	\N	اخذ المريض استشارة ويباشر غدأ	استشارة طبية	\N	\N	evening
1311	486	3	2026-02-22 18:51:19.580405	\N	المريض اخذ استشارة وباشر بجلسة مفردة 	أجهزة علاج طبيعي	\N	\N	evening
1312	487	3	2026-02-22 19:04:14.977284	\N	باشر المريض بجلسة مفردة بعد استشارة الدكتور 	تمارين تأهيلية	\N	\N	morning
1313	489	3	2026-02-22 19:36:13.469867	\N	اخذ المريض استشارة ويباشر يوم غد 	استشارة طبية	\N	\N	morning
1314	224	3	2026-02-22 19:37:29.050083	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1315	224	3	2026-02-22 19:37:48.100213	\N	الجلسة الاولى من الروبوت	روبوت	\N	\N	morning
1316	302	3	2026-02-22 20:01:51.547266	\N		أجهزة علاج طبيعي	\N	\N	morning
1317	476	3	2026-02-22 20:07:26.563288	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1318	476	3	2026-02-22 20:08:10.850939	\N	باشر المريض بجلسته الاولى بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	morning
1319	468	3	2026-02-22 20:08:33.258556	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1320	468	3	2026-02-22 20:09:13.804937	\N	باشرت المريضة بجلستها الاولى بعد الاستشارة حيث تم تحويلها من قبل دكتور حسن ناجي	أجهزة علاج طبيعي	\N	\N	morning
1321	490	3	2026-02-22 20:39:22.341276	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1322	490	3	2026-02-22 20:40:47.82532	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	morning
1323	488	3	2026-02-22 21:07:44.99864	\N	المريضة باشرت بجلسة مفردة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	morning
1324	485	3	2026-02-22 21:11:06.760478	\N	المريض اخذ استشارة وقرر المباشرة في يوم غد	استشارة طبية	\N	\N	morning
1325	466	3	2026-02-23 05:14:04.741044	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1326	258	3	2026-02-23 05:25:27.758381	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1327	64	3	2026-02-23 05:26:40.333309	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1328	238	3	2026-02-23 05:31:00.625968	\N	الجلسة الاولى من البكج الجديد	أجهزة علاج طبيعي	\N	\N	morning
1329	397	3	2026-02-23 05:52:13.457617	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1284	47	1	2026-02-22 12:16:30.419654		لغرض التدريب على الطرف وتغيير  مكان للادبتر	\N	\N	\N	morning
1332	493	3	2026-02-23 06:59:38.240844	\N	جاء المريض الى مركزنا بعد ان سمع من احد الاشخاص الذين جاءو لاخذ الاستشارة حيث ان المريض يعاني من انزلاق في الدسك رغم ان المريض اجراء عملية للدسك لكن دون فائدة مسببا له الام شديد في الجهة اليسرى يمتد الى اسفل الرجل اليسرى	استشارة طبية	\N	\N	morning
1333	293	3	2026-02-23 07:00:10.570267	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1334	491	3	2026-02-23 07:56:08.780088	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) (تكلفة: 250,000 د.ع) - باشرت المريضه بعد الاستشاره مباشرتا 	أجهزة علاج طبيعي	\N	\N	\N
1335	494	3	2026-02-23 08:02:33.107439	\N	استشارة اولية بدون حضور المريضه حضر ذوي المريضه فقط مع تقارير المريضه كامله للاستفسار من الطبيب	استشارة طبية	\N	\N	morning
1336	165	3	2026-02-23 08:02:59.75318	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1288	452	1	2026-02-22 13:06:16.454015		استلام الطرف بعد السحب الثانوي كاربون مع تجميل الطرف	\N	\N	\N	evening
1337	495	3	2026-02-23 08:33:32.171558	\N	المراجع كان قد تمت متابعته منذ شهر 12، حيث لوحظ آنذاك تحسّن ممتاز في حالته. وقد راجعنا حالياً بعد انقطاع لفترة عن المراجعة والعلاج، ويعاني حالياً من قلة في الحركة وضعف حركي ملحوظ	أجهزة علاج طبيعي	\N	\N	morning
1338	298	3	2026-02-23 08:35:13.160668	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1668	293	3	2026-02-28 12:01:20.899745	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1340	496	3	2026-02-23 08:56:10.660697	\N	استشارة اوليه مع دكتور عبد الله وستباشر المريضه بالشفت المسائي لما يناسبهم من الوقت 	استشارة طبية	\N	\N	morning
1341	79	3	2026-02-23 09:09:30.836421	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1669	551	2	2026-02-28 12:16:17.626689	\N	تم احذ قياس 	\N	\N	\N	morning
1342	467	3	2026-02-23 09:29:07.890203	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4405	810	3	2026-04-18 15:55:15.573462	\N		أجهزة علاج طبيعي	\N	\N	evening
1344	299	3	2026-02-23 09:50:25.76976	\N	الجلسة المجانية من العرض 	أجهزة علاج طبيعي	\N	\N	morning
1345	347	3	2026-02-23 10:01:31.974497	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1346	239	3	2026-02-23 10:02:30.119794	\N	الجلسه السادسة والاخيرة 	أجهزة علاج طبيعي	\N	\N	morning
1347	433	3	2026-02-23 10:18:17.707626	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1348	426	3	2026-02-23 10:20:25.838348	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1349	335	3	2026-02-23 10:43:50.28885	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1351	498	3	2026-02-23 11:03:59.517473	\N	استشارة اولية	استشارة طبية	\N	\N	morning
1350	500	1	2026-02-23 10:59:23.551031		لغرض استفسار على سعر السيلكون البس  مع استفسار على سعر الطرف العرض فوق الركبه 	\N	\N	\N	morning
4480	1050	1	2026-04-19 13:21:33.838836	\N	جلسه اجهزه علالج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
1353	228	3	2026-02-23 11:31:30.275456	\N	حضر المريض للاستشاره لجهاز الروبوت وسيباشر يوم الاربعاء 	استشارة طبية	\N	\N	morning
1354	499	3	2026-02-23 11:31:56.346503	\N	استشارة اوليه عند دكتور عبد الله ستباشر يوم الاربعاء 	استشارة طبية	\N	\N	morning
1670	552	2	2026-02-28 12:34:32.933134	\N	تم اخذ قياسات اولية وتسديد مبلغ قدره 800000 د باقي 575000 	\N	\N	\N	morning
1356	45	1	2026-02-23 12:49:28.187143	\N	تم مراجعه المركز لغرض التعيار 	\N	\N	\N	morning
1357	389	1	2026-02-23 13:29:26.778928	\N	صيانه قالب مع التعيار	\N	\N	\N	evening
1359	489	3	2026-02-23 16:15:18.511942	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اليوم بجلسة مفردة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	\N
1360	277	3	2026-02-23 16:16:26.600963	\N	الجلسة الرابعة	أجهزة علاج طبيعي	\N	\N	evening
1361	501	3	2026-02-23 16:26:12.10772	\N	باشرت المريضة بجلستها الاولى بعد استشارة دكتور بيرم 	أجهزة علاج طبيعي	\N	\N	evening
1362	483	3	2026-02-23 16:26:58.977583	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بجلسته المفردة اليوم بعد الاستشارة يوم امس	أجهزة علاج طبيعي	\N	\N	\N
1363	463	3	2026-02-23 16:50:33.9735	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1364	340	3	2026-02-23 16:51:23.50891	\N		تمارين تأهيلية	\N	\N	evening
1365	380	3	2026-02-23 16:51:50.576182	\N		أجهزة علاج طبيعي	\N	\N	evening
1366	177	3	2026-02-23 16:52:49.885574	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	evening
1367	458	3	2026-02-23 16:53:51.456933	\N		روبوت	\N	\N	evening
1368	222	3	2026-02-23 16:54:38.067855	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	evening
1369	503	3	2026-02-23 16:59:51.729443	\N	باشرت المريضة بعد استشارة دكتور بيرم 	أجهزة علاج طبيعي	\N	\N	evening
1370	324	3	2026-02-23 17:13:21.540901	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1371	324	3	2026-02-23 17:13:40.086879	\N	جدد المريض بكج من 4 جلسات 	أجهزة علاج طبيعي	\N	\N	evening
1372	485	3	2026-02-23 17:23:29.84129	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشر المريض ببكج من 6 جلسات بعد استشارة 	أجهزة علاج طبيعي	\N	\N	\N
1374	502	3	2026-02-23 17:39:13.746176	\N	اخذ المريض استشارة لكنه لم يجلب تقاريره الخاصة معه لذلك يأتي يوم غد في الصباح	استشارة طبية	\N	\N	evening
1376	424	3	2026-02-23 18:05:33.015773	\N		تمارين تأهيلية	\N	\N	evening
1375	322	3	2026-02-23 17:43:24.310254			تمارين تأهيلية	\N	\N	evening
1377	504	3	2026-02-23 18:17:45.972607	\N	اخذ المريض استشارة ويباشر يوم غد	استشارة طبية	\N	\N	evening
1378	456	3	2026-02-23 18:28:36.926464	\N		أجهزة علاج طبيعي	\N	\N	evening
1379	456	3	2026-02-23 18:28:46.721856	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1380	456	3	2026-02-23 18:28:51.468355	\N		أجهزة علاج طبيعي	\N	\N	evening
1381	496	3	2026-02-23 18:48:38.680723	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1382	208	3	2026-02-23 18:51:03.831187	\N		أجهزة علاج طبيعي	\N	\N	evening
1383	506	3	2026-02-23 19:02:22.909445	\N	اخذ اليوم جلسته الاخيرة من بكج قديم حيث كانت اخر جلسة له يوم 1/18 ويباشر غدًا بجلسة روبوت	أجهزة علاج طبيعي	\N	\N	morning
1384	506	3	2026-02-23 19:21:40.313779	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1385	506	3	2026-02-23 19:22:28.96513	\N	المريض قرر ان يأخذ جلسة الروبوت الاولى اليوم	روبوت	\N	\N	morning
1386	484	3	2026-02-23 19:32:08.188596	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1387	484	3	2026-02-23 19:33:53.221875	\N	باشر المريض بجلسته الاولى بعد استشارة يوم امس	أجهزة علاج طبيعي	\N	\N	morning
1388	307	3	2026-02-23 19:45:38.410082	\N		أجهزة علاج طبيعي	\N	\N	morning
1389	496	3	2026-02-23 19:55:58.180149	\N	باشرت المريضة بجلستها الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
1390	224	3	2026-02-23 19:57:14.162898	\N		أجهزة علاج طبيعي	\N	\N	morning
1391	237	3	2026-02-23 19:58:02.173942	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1392	237	3	2026-02-23 19:58:10.47588	\N		أجهزة علاج طبيعي	\N	\N	morning
1393	505	3	2026-02-23 19:59:29.919049	\N	المريضة اخذت استشارة تباشر غدًا 	استشارة طبية	\N	\N	morning
1394	264	3	2026-02-23 20:01:00.868957	\N		تمارين تأهيلية	\N	\N	morning
1395	356	3	2026-02-23 20:02:41.475448	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	morning
1396	468	3	2026-02-23 20:04:33.738815	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1397	468	3	2026-02-23 20:06:36.260707	\N	المريضة جددت بكج من 5 جلسات	أجهزة علاج طبيعي	\N	\N	morning
1398	455	3	2026-02-23 20:10:00.448036	\N		أجهزة علاج طبيعي	\N	\N	morning
1399	463	3	2026-02-23 20:10:40.395721	\N		أجهزة علاج طبيعي	\N	\N	morning
1400	489	3	2026-02-23 20:13:26.438886	\N		أجهزة علاج طبيعي	\N	\N	morning
1401	476	3	2026-02-23 20:22:23.177268	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1402	476	3	2026-02-23 20:22:26.608896	\N		أجهزة علاج طبيعي	\N	\N	morning
1403	507	3	2026-02-23 20:49:18.900253	\N	جدد المريض بكج من 10 جلسات حيث انه مريض سابق للمركز	أجهزة علاج طبيعي	\N	\N	morning
1404	271	3	2026-02-24 05:06:18.646764	\N	الجلسة السابعة من البكج	تمارين تأهيلية	\N	\N	morning
1405	205	3	2026-02-24 05:07:10.27924	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
1406	466	3	2026-02-24 05:16:47.064826		الجلسة الثالثة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1407	457	3	2026-02-24 05:36:08.196992	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1408	457	3	2026-02-24 05:38:19.182578	\N	المريضة اخذت جلسة يوم امس 23/2 دفعت ووصلها موجود ومذكورة في النظام الورقي والحسابات الخاصة بيوم امس وكان من المفروض انها مكتوبة في هذا النظام ايضًا لكن الصفحة الاخاصة بها لم تتحدث ولم انتبه لذلك في لحظتها 	أجهزة علاج طبيعي	\N	\N	morning
1409	346	3	2026-02-24 06:01:39.418204	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1410	493	3	2026-02-24 06:12:53.414994	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1411	508	3	2026-02-24 06:28:49.894153	\N	زارنا المريض اليوم بعد ان شاهد منشور خاص بدكتور ياسر على الفيس بوك حيث كان المريض يعاني من تمزق بالربط الركبة اليمنى نتيجة اصابة رياضة اثناء ممارسة كرة القدم واليوم اخذ استشارة اولية وسوف يباشر اليوم مع الشفت المسائي	أجهزة علاج طبيعي	\N	\N	morning
1412	474	3	2026-02-24 07:14:28.656718	\N	الجلسة الثانية من البكج	تمارين تأهيلية	\N	\N	morning
1413	509	3	2026-02-24 07:41:00.93311	\N	زارنا المريض اليوم لغرض البدا بجلسات العلاج الطبيعي بعد ان حصله موافقة من قبل دكتور ياسر على ان تكون جلساته مجانية حيث تعرض المريض بعد الولادة الى مرض ابو صفار ونتيجة قلة معرفة الاهل بالمرض تازمت حال المريض الى ان اصيب بشلل بالاطراف السفلى واليوم جاءه لاخذ الاستشارة على يد المعالج المختص عبد الله خان	استشارة طبية	\N	\N	morning
1414	147	3	2026-02-24 07:44:48.27318	\N	الجلسة السادسة من البكج	تمارين تأهيلية	\N	\N	morning
1358	363	1	2026-02-23 13:57:40.99426		لغرض الصيانه والتعيار	\N	\N	\N	evening
1355	399	1	2026-02-23 11:38:25.633574		لغرض تغيير مكان اللادفتر وتدريب على الطرف	\N	\N	\N	morning
1415	121	3	2026-02-24 08:19:30.606739	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1416	495	3	2026-02-24 08:29:37.343937	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
1417	287	3	2026-02-24 09:04:53.560877	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1418	433	3	2026-02-24 09:07:24.077359	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
1419	397	3	2026-02-24 09:15:54.914491	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1420	510	3	2026-02-24 09:25:13.122454	\N	راجعتنا المريضة اليوم لغرض العلاج الطبيعي حيث كانت تعاني من انزلاق في دسكات الرقبة نتيجة رفع احمال ثقيلة في المنزل مما ادى ذلك الى اجرى عملية تبديل دسكات الرقبة و بعد 19 يوم من اجراء العملية في بغداد جاءت لكي تباشر بجلساتها في مركزنا بعد ان تاخذ الاستشارة الاولية من قبل المعالج المختص عبد الله خان	استشارة طبية	\N	\N	morning
1421	467	3	2026-02-24 09:34:44.773586	خدمة جديدة	جلسات علاج إضافية - روبوت (7 جلسة) (تكلفة: 350,000 د.ع) - بكج لمدة سبعة جلسات 	روبوت	\N	\N	\N
4406	952	3	2026-04-18 15:56:11.51004	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1423	510	3	2026-02-24 09:47:29.57449	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
1424	55	3	2026-02-24 09:51:13.08009	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
1425	480	3	2026-02-24 09:54:33.531494	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1426	15	1	2026-02-24 09:57:26.755569	\N	لغرض التدريب على الطرف 	\N	\N	\N	morning
1427	299	3	2026-02-24 10:00:48.60174	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - تجديد بكج 	أجهزة علاج طبيعي	\N	\N	\N
1428	320	3	2026-02-24 10:01:43.887877	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1429	426	3	2026-02-24 10:11:06.378604	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1430	194	3	2026-02-24 10:29:29.026012	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1431	249	3	2026-02-24 10:29:54.348624	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1432	153	3	2026-02-24 10:30:26.318511	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (4 جلسة) (تكلفة: 100,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1433	389	1	2026-02-24 10:32:50.005383	\N	تم تسليم الطرف للمركز لغرض السحب الثانوي كاربون 	\N	\N	\N	morning
1434	335	3	2026-02-24 10:39:52.844159	\N	الجلسة السادسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1435	511	2	2026-02-24 11:00:30.409336	\N	تم اخذ قالب مسند kafo عدد2 ثابت بسعر 1000000 مليون بانتظار الدفع من مؤسسة الشهداء	\N	\N	\N	morning
1436	451	1	2026-02-24 11:02:46.560143	\N	فحص القالب مع التدريب والاستلام 	\N	\N	\N	morning
1437	512	2	2026-02-24 11:04:50.084659	\N	تم تحديد مسند afo +تعلية بانتظار الدفع بمبلغ 275000د	\N	\N	\N	morning
1438	423	1	2026-02-24 11:35:41.142746	\N	تم فحص القالب مع التدريب والاستلام مع دفع المبلغ كامل 	\N	\N	\N	morning
1439	513	3	2026-02-24 11:41:16.057606	\N	استشارة اولية	استشارة طبية	\N	\N	morning
1440	181	3	2026-02-24 11:41:59.590038	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
1671	276	4	2026-02-28 14:39:17.608896	\N	اخذ قالب للبتر	\N	\N	\N	evening
1442	489	3	2026-02-24 16:12:25.712606	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1443	340	3	2026-02-24 16:12:40.976881	\N		تمارين تأهيلية	\N	\N	evening
1444	502	3	2026-02-24 16:27:49.881866	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1445	502	3	2026-02-24 16:28:09.396987	\N	باشر المريض بعد الاستشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
1446	356	3	2026-02-24 16:35:49.442023	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1447	489	3	2026-02-24 16:36:10.79552	\N		أجهزة علاج طبيعي	\N	\N	evening
1448	513	3	2026-02-24 16:58:43.306705	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1449	513	3	2026-02-24 17:00:58.928671	\N		أجهزة علاج طبيعي	\N	\N	evening
1450	322	3	2026-02-24 17:07:25.93316	خدمة جديدة	جلسات علاج إضافية - روبوت (2 جلسة) (تكلفة: 100,000 د.ع)	روبوت	\N	\N	\N
1451	322	3	2026-02-24 17:07:33.400207	\N		روبوت	\N	\N	evening
1452	324	3	2026-02-24 17:20:02.605356	\N		أجهزة علاج طبيعي	\N	\N	evening
1453	222	3	2026-02-24 17:22:07.818185	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	evening
1454	458	3	2026-02-24 17:23:15.464554	\N		روبوت	\N	\N	evening
1455	270	3	2026-02-24 17:45:09.44929	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1456	270	3	2026-02-24 17:45:26.349543	\N		أجهزة علاج طبيعي	\N	\N	evening
1457	515	3	2026-02-24 17:46:37.84956	\N	اخذ المريض استشارة لكن الوقت المسائي غير ملائم له لذلك سوف يتواصل مع الشفت الصباحي	استشارة طبية	\N	\N	evening
1458	516	3	2026-02-24 17:47:37.622254	\N	اخذ المريض استشارة وقرر البدء يوم غد 	استشارة طبية	\N	\N	evening
1459	424	3	2026-02-24 17:50:48.91029	\N		تمارين تأهيلية	\N	\N	evening
1460	488	3	2026-02-24 17:55:42.112654	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (9 جلسة) (تكلفة: 225,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1685	458	3	2026-02-28 18:27:36.151777	\N		روبوت	\N	\N	evening
1462	518	3	2026-02-24 17:59:43.422742	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (10 جلسة) (تكلفة: 250,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1463	517	3	2026-02-24 18:07:43.948759	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1464	518	3	2026-02-24 18:26:54.120243	\N		تمارين تأهيلية	\N	\N	evening
1465	517	3	2026-02-24 18:31:24.327224	\N		روبوت	\N	\N	evening
1466	504	3	2026-02-24 18:33:40.386582	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1467	504	3	2026-02-24 18:33:45.427347	\N		أجهزة علاج طبيعي	\N	\N	evening
1468	323	3	2026-02-24 18:58:47.958151	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
1469	323	3	2026-02-24 19:12:41.650134	\N		أجهزة علاج طبيعي	\N	\N	morning
1470	505	3	2026-02-24 19:21:06.353982	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1471	505	3	2026-02-24 19:21:10.096793	\N		أجهزة علاج طبيعي	\N	\N	morning
1472	476	3	2026-02-24 19:52:48.225973	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1473	476	3	2026-02-24 19:52:54.067014	\N		أجهزة علاج طبيعي	\N	\N	morning
1474	508	3	2026-02-24 19:53:47.917986	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1475	508	3	2026-02-24 19:53:52.590771	\N		أجهزة علاج طبيعي	\N	\N	morning
1476	394	3	2026-02-24 19:54:44.623438	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1477	394	3	2026-02-24 19:54:48.730364	\N		أجهزة علاج طبيعي	\N	\N	morning
1478	302	3	2026-02-24 19:56:16.273241	\N		أجهزة علاج طبيعي	\N	\N	morning
1479	523	3	2026-02-24 20:23:49.708737	\N	اخذ المريض استشارة للروبوت ويباشر يوم غد	استشارة طبية	\N	\N	morning
1480	522	3	2026-02-24 20:25:05.60608	\N	المريض اخذ استشارة ويباشر يوم غد	استشارة طبية	\N	\N	morning
1481	521	3	2026-02-24 20:25:31.325234	\N	المريض اخذ استشارة ويباشر يوم غد	استشارة طبية	\N	\N	morning
1482	520	3	2026-02-24 20:27:38.581168	\N	اخذ المريض استشارة ويباشر يوم غد	استشارة طبية	\N	\N	morning
1483	519	3	2026-02-24 20:36:01.46622	خدمة جديدة	جلسات علاج إضافية - روبوت (2 جلسة) (تكلفة: 100,000 د.ع)	روبوت	\N	\N	\N
1484	224	3	2026-02-24 20:58:28.189884	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1485	224	3	2026-02-24 20:58:32.746176	\N		روبوت	\N	\N	morning
1486	456	3	2026-02-24 20:58:56.989292	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1487	456	3	2026-02-24 20:59:00.897988	\N		أجهزة علاج طبيعي	\N	\N	morning
1488	496	3	2026-02-24 21:38:50.612673	\N		أجهزة علاج طبيعي	\N	\N	morning
1489	524	3	2026-02-24 21:40:07.319989	\N	اخذ المريض استشارة ويباشر يوم غد	استشارة طبية	\N	\N	morning
1490	507	3	2026-02-24 21:40:25.000771	\N		أجهزة علاج طبيعي	\N	\N	morning
1491	72	3	2026-02-25 05:12:54.084728	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1492	345	3	2026-02-25 05:20:26.770816	\N	الجلسة الرابعة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1493	64	3	2026-02-25 05:23:03.563825	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1494	165	3	2026-02-25 05:24:37.040514	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1495	465	3	2026-02-25 05:27:14.621326	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1496	238	3	2026-02-25 05:32:33.162747	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1497	381	3	2026-02-25 05:47:58.646677	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1498	525	3	2026-02-25 06:05:42.440537	\N	استشارة طبيه اولية مع دكتور عبد الله خان ولم يستطع المباشره بسبب تاخر مدة علاجها ولانمتلك الوقت الكافي بسبب زخم المواعيد 	استشارة طبية	\N	\N	morning
1499	493	3	2026-02-25 06:07:25.160642	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1500	346	3	2026-02-25 06:13:23.608057	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1501	345	3	2026-02-25 06:38:08.534397	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع) - حاسب المريض بكج جديد سيباشر عليه من الغد 	أجهزة علاج طبيعي	\N	\N	\N
1502	491	3	2026-02-25 06:43:42.888465	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1504	526	3	2026-02-25 07:25:03.621969	\N	باشر المريض باول جلسة روبوت بعد استشارة دكتور عبد الله خان 	روبوت	\N	\N	morning
1505	433	3	2026-02-25 07:33:58.130081	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1506	165	3	2026-02-25 07:35:51.439909	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1507	165	3	2026-02-25 07:35:51.487215	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (0 جلسة) (تكلفة: 0 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1441	47	1	2026-02-24 12:44:27.313848		لغرض التدريب على الطرف	\N	\N	\N	morning
1503	293	3	2026-02-25 07:13:51.097095		الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1556	532	3	2026-02-25 21:03:10.82699	\N	اخذ المريض استشارة بخصوص جهاز الروبوت ويباشر يوم غد إن شاء الله	استشارة طبية	\N	\N	morning
1508	499	3	2026-02-25 08:18:21.997388	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه بالجلسة الاولى للعلاج الطبيعي بعد استشارة كانت بتاريخ 23/2/2026 عند الدكتور عبد الله 	أجهزة علاج طبيعي	\N	\N	\N
987	364	1	2026-02-18 09:14:10		تم مراجعه المركز لغرض التدريب واستلام الطرف 	\N	\N	\N	morning
1509	498	3	2026-02-25 08:34:11.271577	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشر المريض باول جلسات العلاج الطبيعي بعد استشاره كانت بتاريخ 23/2/2026	أجهزة علاج طبيعي	\N	\N	\N
1510	298	3	2026-02-25 08:38:25.197653	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) (تكلفة: 250,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1512	467	3	2026-02-25 09:19:17.75093	\N	الجلسة الثانية من بكج الروبوت 	روبوت	\N	\N	morning
1513	397	3	2026-02-25 09:24:45.617656	\N	الجلسة السادسة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1540	424	3	2026-02-25 17:56:51.083974	\N		تمارين تأهيلية	\N	\N	evening
1516	513	3	2026-02-25 10:08:47.673782	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1518	228	3	2026-02-25 10:13:54.94816	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع) - باشر المريض باول جلسات العلاج الطبيعي وجلسات الروبوت بعد استشارة الدكتور عبد الله خان بتاريخ 23/2/2026	روبوت	\N	\N	\N
1519	228	3	2026-02-25 10:13:54.995574	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض باول جلسات العلاج الطبيعي وجلسات الروبوت بعد استشارة الدكتور عبد الله خان بتاريخ 23/2/2026	أجهزة علاج طبيعي	\N	\N	\N
1520	426	3	2026-02-25 10:28:15.084713	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1541	456	3	2026-02-25 18:30:01.833355	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1542	456	3	2026-02-25 18:30:07.460509	\N		أجهزة علاج طبيعي	\N	\N	evening
1521	335	3	2026-02-25 10:37:26.741669	\N	الجلسة السابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1543	208	3	2026-02-25 18:30:28.001775	\N		أجهزة علاج طبيعي	\N	\N	evening
4407	952	3	2026-04-18 15:56:14.830735	\N		أجهزة علاج طبيعي	\N	\N	evening
1523	445	1	2026-02-25 12:03:56.11586	\N	استلام مسند تقويمي للضهر  	\N	\N	\N	morning
1524	528	4	2026-02-25 12:17:30.272183	تمت المعاينة وتم اخذ القياسات والقالب لعمل طرف علوي تجميلي 	تمت المعاينة وتم اخذ القياسات والقالب لعمل طرف علوي تجميلي واستلام مقدمة من المريض مبلغ 2500000 والباقي عند استلام الطرف	\N	\N	\N	morning
1525	276	4	2026-02-25 12:31:31.687586	\N	تسديد مبلغ مع استلام السيليكون لتاهيل الجزء المبتور لاخذ القالب	\N	\N	\N	morning
1511	467	3	2026-02-25 09:19:02.976943		الجلسة الثانية من بكج العلاج الطبيعي 	تمارين تأهيلية	\N	\N	morning
1515	527	1	2026-02-25 10:02:32.846971		فحص ومعاينه 	\N	\N	\N	morning
1514	418	1	2026-02-25 09:59:10.758962		لغرض التدريب على الطرف مع استلام الطرف 	\N	\N	\N	morning
1544	224	3	2026-02-25 18:30:47.131316	\N		أجهزة علاج طبيعي	\N	\N	evening
1517	364	1	2026-02-25 10:08:49.950058		صيانه   شتل لوك مع التدريب 	\N	\N	\N	morning
1594	147	3	2026-02-26 11:06:29.416653	\N	الجلسة السابعة من البكج 	تمارين تأهيلية	\N	\N	morning
1527	517	3	2026-02-25 16:14:18.610572	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1528	517	3	2026-02-25 16:14:23.009735	\N		روبوت	\N	\N	evening
1529	340	3	2026-02-25 16:19:03.040309	\N		تمارين تأهيلية	\N	\N	evening
1530	356	3	2026-02-25 16:19:45.4538	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	evening
1531	489	3	2026-02-25 16:20:03.712561	\N		أجهزة علاج طبيعي	\N	\N	evening
1532	458	3	2026-02-25 16:53:53.720275	\N		روبوت	\N	\N	evening
1533	505	3	2026-02-25 16:54:07.836154	\N		أجهزة علاج طبيعي	\N	\N	evening
1534	504	3	2026-02-25 17:06:09.595389	\N		أجهزة علاج طبيعي	\N	\N	evening
1535	324	3	2026-02-25 17:06:22.97897	\N		أجهزة علاج طبيعي	\N	\N	evening
1536	322	3	2026-02-25 17:21:08.293806	\N		روبوت	\N	\N	evening
1537	322	3	2026-02-25 17:21:27.040093	\N		تمارين تأهيلية	\N	\N	evening
1538	270	3	2026-02-25 17:36:10.655356	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1539	485	3	2026-02-25 17:37:03.49681	\N		أجهزة علاج طبيعي	\N	\N	evening
1545	516	3	2026-02-25 18:40:22.427213	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1546	516	3	2026-02-25 18:47:26.767711	\N		أجهزة علاج طبيعي	\N	\N	evening
1547	518	3	2026-02-25 19:08:17.107494	\N		تمارين تأهيلية	\N	\N	morning
1548	308	3	2026-02-25 19:34:11.28109	\N		أجهزة علاج طبيعي	\N	\N	morning
1549	524	3	2026-02-25 20:02:54.76976	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1550	524	3	2026-02-25 20:03:00.465083	\N		أجهزة علاج طبيعي	\N	\N	morning
1551	270	3	2026-02-25 20:03:18.36273	\N		أجهزة علاج طبيعي	\N	\N	morning
1552	508	3	2026-02-25 20:04:06.499541	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1553	508	3	2026-02-25 20:04:11.264668	\N		أجهزة علاج طبيعي	\N	\N	morning
1554	507	3	2026-02-25 20:15:18.342113	\N		أجهزة علاج طبيعي	\N	\N	morning
1555	468	3	2026-02-25 20:20:08.486037	\N		أجهزة علاج طبيعي	\N	\N	morning
4481	718	3	2026-04-19 13:34:16.073766	\N		تمارين تأهيلية	\N	\N	evening
1598	489	3	2026-02-26 16:14:07.724856	\N		أجهزة علاج طبيعي	\N	\N	evening
1557	265	3	2026-02-25 21:03:44.831065	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1558	265	3	2026-02-25 21:04:19.02338	\N		أجهزة علاج طبيعي	\N	\N	morning
1559	531	3	2026-02-25 21:05:40.329887	\N	اخذت المريضة استشارة وتباشر يوم غد	استشارة طبية	\N	\N	morning
1560	530	3	2026-02-25 21:06:17.968791	\N	اخذ المريض استشارة لكنه متحير بسبب الاوقت لذلك يباشر في وقت لاحق	استشارة طبية	\N	\N	morning
1561	271	3	2026-02-26 05:25:22.97859	\N	الجلسة الثامنة من البكج 	تمارين تأهيلية	\N	\N	morning
1562	345	3	2026-02-26 05:30:27.263353	\N	الجلسة الاولى من البكج الجديد	أجهزة علاج طبيعي	\N	\N	morning
1563	493	3	2026-02-26 06:05:26.648832	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1564	533	3	2026-02-26 06:13:20.691122	\N	زارنا المريض بعد ان تعرف عللى مركزنا من خلال التواصل الاجتماعي الفيس بوك واليوم جاء لغرض الاستشارة الاولية من قبل الطبيب المعالج عبد الله خان حيث كان المريض يعاني من جلطة دماغية في 2024 في الجهة اليسرى	أجهزة علاج طبيعي	\N	\N	morning
1565	395	3	2026-02-26 06:14:11.624784	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1566	395	3	2026-02-26 06:16:40.455322	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1567	534	3	2026-02-26 06:22:40.438259	\N	زارنا المريض بعد ان تعرف على مركزنا من خلال احد الاشخاص وجاء لغرض الفحص والمعاينة من قبل الطبيب المعالج عبد الله خان حيث يعاني المريض من حادث سيارة قديم سنة 1979 وتم تشخيصه بوجود انزلاق بالفقرات	استشارة طبية	\N	\N	morning
1568	346	3	2026-02-26 06:39:29.067003	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1569	55	3	2026-02-26 07:13:58.619996	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
1570	509	3	2026-02-26 07:15:40.783678	\N	الجلسة الاولى المجانية	أجهزة علاج طبيعي	\N	\N	morning
1571	535	3	2026-02-26 07:29:09.082601	\N	جاء المريض بعد ما تعرف على مركزنا من خلال التواصل الاجتماعي الفيس بوك حيث يعاني المريض من جلطة دماغية تعرض لها مرتين مما اثرت على الجهة اليسرى واليمنى من جسمه واليوم جاء لغرض الفحص والمعاينة من قبل الطبيب المعالج عبد الله خان	استشارة طبية	\N	\N	morning
1572	474	3	2026-02-26 07:30:02.04973	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
1573	205	3	2026-02-26 07:31:49.213103	\N	الجلسة الرابعة من البكج	تمارين تأهيلية	\N	\N	morning
1526	529	1	2026-02-25 13:35:27.501357		تم زياره المركز لغرض  الصيانه وشراء المواد المدرجه ادناه 1.ولف تحت الركبه سعره 1500002. تجميل تحت الركبه 1500003. سليف اوتوبك 500000	\N	\N	\N	evening
1574	165	3	2026-02-26 08:03:46.526697	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1575	495	3	2026-02-26 08:08:47.697707	\N	\tالجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1576	121	3	2026-02-26 08:11:55.310691	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1577	536	3	2026-02-26 08:28:50.038047	\N	جاءت المريضة لغرض الفحص والمعاينة من قبل دكتور عبد الله حيث تعاني المريض من شلل بالاطراف السفلى نتيجة جلطة دماغية	استشارة طبية	\N	\N	morning
1578	433	3	2026-02-26 08:30:40.694197	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1579	320	3	2026-02-26 08:46:30.038528	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4408	264	3	2026-04-18 15:56:32.399627	\N		أجهزة علاج طبيعي	\N	\N	evening
1581	467	3	2026-02-26 08:58:43.382985	\N	الجلسة الثالثة من البكج 	روبوت	\N	\N	morning
1582	205	3	2026-02-26 09:10:37.526195	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع) - بالاضافة الى جلسة التمارين التاهيليه من ضمن البكج 	روبوت	\N	\N	\N
1583	513	3	2026-02-26 09:25:50.4827	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1584	426	3	2026-02-26 09:52:34.678975	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1585	480	3	2026-02-26 09:54:16.928908	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
1672	356	3	2026-02-28 16:31:52.775782	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1587	299	3	2026-02-26 10:18:06.369486	\N	الجلسة الثانية من البكج الجديد	أجهزة علاج طبيعي	\N	\N	morning
1588	153	3	2026-02-26 10:21:27.1679	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
1589	249	3	2026-02-26 10:25:47.895106	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1590	194	3	2026-02-26 10:26:31.466115	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1591	537	2	2026-02-26 10:33:51		تم بيع له طرف بسعر 6250000 شتل لوك تحت الركبة  واصل 1000000 باقي 5250000 د وتم اخذ له قالب ( مصطفى)	\N	\N	\N	morning
1592	538	2	2026-02-26 10:39:24.040931	\N	تم اخذ قالب مع سلكون تركي 	\N	\N	\N	morning
1593	335	3	2026-02-26 10:49:04.113899	\N	الجلسة الثامنة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1696	394	3	2026-02-28 19:28:01.173144	\N		أجهزة علاج طبيعي	\N	\N	morning
1599	516	3	2026-02-26 16:14:45.648094	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1600	516	3	2026-02-26 16:14:57.474202	\N		أجهزة علاج طبيعي	\N	\N	evening
1601	340	3	2026-02-26 16:15:30.133163	\N		أجهزة علاج طبيعي	\N	\N	evening
1602	356	3	2026-02-26 16:15:48.795582	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1603	340	3	2026-02-26 16:29:49.868324	\N	الجلسة المجانية من البكج	تمارين تأهيلية	\N	\N	evening
1604	177	3	2026-02-26 16:44:49.186934	\N	جلسة مجانية	تمارين تأهيلية	\N	\N	evening
1605	425	3	2026-02-26 17:23:57.529917	\N		أجهزة علاج طبيعي	\N	\N	evening
1606	453	3	2026-02-26 17:26:54.222102	\N		أجهزة علاج طبيعي	\N	\N	evening
1607	322	3	2026-02-26 17:31:16.161492	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1608	322	3	2026-02-26 17:31:45.944354	\N		روبوت	\N	\N	evening
1609	540	3	2026-02-26 17:35:41.167709	\N	اخذ المريض استشارة لكنه متردد في موعد البدء 	استشارة طبية	\N	\N	evening
1610	323	3	2026-02-26 17:54:32.40403	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1611	485	3	2026-02-26 17:59:58.64581	\N		أجهزة علاج طبيعي	\N	\N	evening
1612	323	3	2026-02-26 18:10:49.204037	\N		روبوت	\N	\N	evening
1613	541	3	2026-02-26 18:16:55.305108	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1614	519	3	2026-02-26 18:18:28.269545	\N	اخذ المريض اليوم الجلسة الاولى من الروبوت حيث قام بدفع مبلغها مسبقًا 	روبوت	\N	\N	evening
1615	541	3	2026-02-26 18:19:29.588334	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1616	541	3	2026-02-26 18:20:08.720153	\N	المريضة باشرت اليوم بجلستها الاولى بعد الاستشارة ودفعت مقدمًا لجلستها الاخرى	أجهزة علاج طبيعي	\N	\N	evening
1617	424	3	2026-02-26 18:24:23.041815	\N		تمارين تأهيلية	\N	\N	evening
1618	188	3	2026-02-26 18:25:06.788225	\N	الجلسة المجانية من البكج	تمارين تأهيلية	\N	\N	evening
1619	542	3	2026-02-26 18:30:41.15123	\N	المريض اخذ استشارة ويباشر يوم السبت	استشارة طبية	\N	\N	evening
1620	192	3	2026-02-26 18:58:35.345748	\N	جلسة مجانية	تمارين تأهيلية	\N	\N	evening
1621	463	3	2026-02-26 18:58:57.415998	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1622	463	3	2026-02-26 18:59:02.968516	\N		أجهزة علاج طبيعي	\N	\N	evening
1623	543	3	2026-02-26 19:01:00.01488	\N	المريضة تم تحويلها من قبل دكتور حسن ناجي واخذت استشارة وتباشر من الاسبوع القادم 	استشارة طبية	\N	\N	morning
1624	544	3	2026-02-26 19:30:49.16202	\N		استشارة طبية	\N	\N	morning
1625	545	3	2026-02-26 19:50:05.846136	\N	المريضة اخذت استشارة وتباشر الاسبوع القادم	استشارة طبية	\N	\N	morning
1626	462	3	2026-02-26 19:55:27.613674	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1627	462	3	2026-02-26 19:55:31.876054	\N		أجهزة علاج طبيعي	\N	\N	morning
1628	302	3	2026-02-26 19:55:56.270807	\N		أجهزة علاج طبيعي	\N	\N	morning
1629	508	3	2026-02-26 19:59:19.765452	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
1630	508	3	2026-02-26 20:04:08.012677	\N		أجهزة علاج طبيعي	\N	\N	morning
1631	531	3	2026-02-26 20:26:50.588545	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1632	531	3	2026-02-26 20:26:58.116543	\N		أجهزة علاج طبيعي	\N	\N	morning
1633	507	3	2026-02-26 21:00:09.613309	\N		أجهزة علاج طبيعي	\N	\N	morning
1634	347	3	2026-02-26 21:00:46.64063	\N	المريض حول جدوله من الصباحي الى المسائي 	أجهزة علاج طبيعي	\N	\N	morning
1635	541	3	2026-02-26 21:13:45.92974	\N		أجهزة علاج طبيعي	\N	\N	morning
1636	456	3	2026-02-26 21:17:55.176712	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1637	456	3	2026-02-26 21:18:01.228888	\N		أجهزة علاج طبيعي	\N	\N	morning
1638	546	3	2026-02-26 21:18:51.099563	\N	المريضة اخذت استشارة وتباشر الاسبوع القادم	استشارة طبية	\N	\N	morning
1639	258	3	2026-02-28 05:11:21.691318	\N	الجلسة الخامسة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1640	238	3	2026-02-28 05:17:25.433289	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1641	64	3	2026-02-28 05:31:30.084906	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1642	493	3	2026-02-28 06:03:24.703131	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1643	346	3	2026-02-28 06:10:37.396968	\N	الجلسة السابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1644	395	3	2026-02-28 06:10:56.157572	\N	الجلسة الثانية 	أجهزة علاج طبيعي	\N	\N	morning
1645	533	3	2026-02-28 07:08:41.890183	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اليوم باول جلسات العلاج الطبيعي مع الدكتور عبدالله خان 	تمارين تأهيلية	\N	\N	\N
1646	547	3	2026-02-28 07:29:56.410905	\N	استشارة اولية عند دكتور عبد الله سيباشر من الغد 	استشارة طبية	\N	\N	morning
1647	515	3	2026-02-28 07:39:04.857467	\N	حضر المريض للاستشارة الثانية عند الدكتور عبد الله خان وسيباشر يوم الاثنين حسب موعده الخاص 	استشارة طبية	\N	\N	morning
1648	320	3	2026-02-28 08:09:59.804656	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
1649	548	3	2026-02-28 08:15:09.472803	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بعد الاستشاره مباشرتا مع الدكتور عبد الله خان 	أجهزة علاج طبيعي	\N	\N	\N
1650	303	2	2026-02-28 08:19:11.066974	\N	تم اخذ قالب +تسديد المبلغ المتبقي 1900000د	\N	\N	\N	morning
1651	435	3	2026-02-28 08:30:37.785833	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1652	498	3	2026-02-28 08:30:56.840364	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1673	553	3	2026-02-28 16:47:17.548375	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1686	456	3	2026-02-28 18:28:37.304924	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1690	542	3	2026-02-28 18:56:17.133951	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1692	545	3	2026-02-28 19:07:36.937128	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1695	394	3	2026-02-28 19:18:00.492653	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1697	208	3	2026-02-28 19:32:47.401188	\N		أجهزة علاج طبيعي	\N	\N	morning
1698	302	3	2026-02-28 19:47:38.674624	\N		أجهزة علاج طبيعي	\N	\N	morning
1703	557	3	2026-02-28 20:30:45.461919	\N	المريضة اخذت استشارة وتباشر في وقت لاحق	استشارة طبية	\N	\N	morning
1705	224	3	2026-02-28 21:01:06.618397	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1708	556	3	2026-02-28 21:03:28.67197	\N	المريض اخذ استشارة ويباشر في وقت لاحق 	استشارة طبية	\N	\N	morning
1709	453	3	2026-02-28 21:03:43.179736	\N		أجهزة علاج طبيعي	\N	\N	morning
1710	531	3	2026-02-28 21:04:52.752059	\N		أجهزة علاج طبيعي	\N	\N	morning
1711	131	3	2026-02-28 21:06:07.534148	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1712	131	3	2026-02-28 21:06:12.187466	\N		أجهزة علاج طبيعي	\N	\N	morning
1713	205	3	2026-03-01 05:26:03.495081	\N	الجلسة الرابعة من البكج 	تمارين تأهيلية	\N	\N	morning
1714	553	3	2026-03-01 05:32:11.485737	\N	الجلسة الثانية من البكج مع الشفت الصباحي 	أجهزة علاج طبيعي	\N	\N	morning
1715	271	3	2026-03-01 05:44:14.591691	\N	الجلسة التاسعة من البكج 	تمارين تأهيلية	\N	\N	morning
1716	453	3	2026-03-01 05:57:57.919209	\N	الجلسة الرابعة من البكج مع الشفت الصباحي 	أجهزة علاج طبيعي	\N	\N	morning
1717	381	3	2026-03-01 06:10:00.1625	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1718	165	3	2026-03-01 07:20:40.152002	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1719	474	3	2026-03-01 07:22:15.731032	\N	الجلسة الرابعة من البكج 	تمارين تأهيلية	\N	\N	morning
1720	558	3	2026-03-01 07:28:09.688142	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بعد الاستشارة مباشرة	تمارين تأهيلية	\N	\N	\N
1721	548	3	2026-03-01 07:37:38.043659	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1722	559	2	2026-02-28 08:06:28	\N	تم تسديد دفعة ثانية 7088000 والباقي 3000000 مساعدة من المرجعية حسب كتاب التخفيض 	\N	\N	\N	morning
1723	320	3	2026-03-01 08:11:59.456338	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1724	121	3	2026-03-01 08:29:55.10095	\N	الجلسة الخامسة من البكج 	تمارين تأهيلية	\N	\N	morning
1725	433	3	2026-03-01 08:41:33.006757	\N	الجلسة السادسة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
4482	812	3	2026-04-19 13:34:37.007228	\N		أجهزة علاج طبيعي	\N	\N	evening
1727	467	3	2026-03-01 08:58:53.67961	\N	الجلسة الخامسة من البكج	روبوت	\N	\N	morning
1728	363	1	2026-02-28 09:38:40	\N	لغرض التعيار	\N	\N	\N	morning
1729	451	1	2026-02-28 09:39:12	\N	تطويل الطرف مع تعيار	\N	\N	\N	morning
1730	15	1	2026-02-28 09:39:43	\N	لغرض التدريب على الطرف	\N	\N	\N	morning
1731	560	1	2026-02-28 09:43:23	\N	صيانه قالب	\N	\N	\N	morning
1732	513	3	2026-03-01 09:47:18.393499	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1733	561	1	2026-02-28 09:48:02	\N	تم زياره المركز دفع مبلغ وقدره 150000 الف دينار عراقي 	\N	\N	\N	morning
1734	383	1	2026-03-01 09:49:43.733946	\N	تم تحويل مبلغ وقدره 200000 الف دينار عراقي 	\N	\N	\N	morning
1735	480	3	2026-03-01 09:58:07.01806	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1736	249	3	2026-03-01 10:21:12.585677	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1737	153	3	2026-03-01 10:22:45.600417	\N	الجلسة الثالثة من البكج 	تمارين تأهيلية	\N	\N	morning
1738	426	3	2026-03-01 10:31:56.763419	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1739	335	3	2026-03-01 10:44:20.097478	\N	الجلسة العاشرة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1740	562	3	2026-03-01 11:06:45.828112	\N	حضر ذوي المريضه فقط بدون المريضه مع جلب التقارير للاستشارة وللاستفسار من الطبيب	استشارة طبية	\N	\N	morning
1743	564	3	2026-03-01 11:29:06.380181	\N	استشارة اولية	استشارة طبية	\N	\N	morning
1747	425	3	2026-03-01 16:13:07.006457	\N		أجهزة علاج طبيعي	\N	\N	evening
1741	563	3	2026-03-01 11:21:00.81132	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضة جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
1742	549	3	2026-03-01 11:25:08.922227	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4409	1010	3	2026-04-18 15:57:26.298611	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4410	1010	3	2026-04-18 15:57:29.778344	\N		أجهزة علاج طبيعي	\N	\N	evening
4411	869	3	2026-04-18 15:57:48.561076	\N		أجهزة علاج طبيعي	\N	\N	evening
4450	1001	3	2026-04-19 06:09:17.734125	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
4460	1046	3	2026-04-19 07:04:11.222071	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4470	474	3	2026-04-19 11:36:02.352309	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (5 جلسة) (تكلفة: 125,000 د.ع) - بكج جديد بالتضامن مع الضمان الصحي 	تمارين تأهيلية	\N	\N	\N
4478	1050	1	2026-04-19 13:02:09.880636	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4483	817	3	2026-04-19 13:35:43.330983	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4492	1052	3	2026-04-19 14:41:06.651823	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4500	1054	3	2026-04-19 16:32:57.321063	\N	تم نصحهم بالقيام بتمارين معينة للطفل كون عمره 7 اشهر فقط والاجهزةبالوقت الحالي لاتناسبه كثيرًا	استشارة طبية	\N	\N	evening
4501	243	3	2026-04-19 16:36:51.474286	\N	الجلسة الخامسة من البكج حيث المريضة توقفت عن العلاج لفترة بسبب ظروف صحية وإستثنت جلساتها الان	أجهزة علاج طبيعي	\N	\N	evening
4506	21	1	2026-04-19 16:42:26.390094	\N	صيانه قالب مع تعيار 	\N	\N	\N	evening
4412	1011	1	2026-04-18 16:07:27.823187	\N	جلسه ثالثه	أجهزة علاج طبيعي	\N	\N	evening
1745	562	3	2026-03-01 12:00:27.707683	\N	حضرت المريضه للاستشارة والمعاينة السريرية وستباشر مع المسائي 	استشارة طبية	\N	\N	morning
1746	565	3	2026-03-01 12:03:32.22488	\N	حضرت المريضه للاستشارة عند الدكتور عبد الله خان وستباشر مع المسائي	استشارة طبية	\N	\N	morning
1748	222	3	2026-03-01 16:22:16.173087	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	evening
1749	503	3	2026-03-01 16:32:52.291626	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4414	458	3	2026-04-18 16:11:32.084025	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4415	656	1	2026-04-18 16:18:50.454787	\N	تدريب مع استلام المسند كيفو معدني	\N	\N	\N	evening
4413	874	1	2026-04-18 16:09:37.673827		جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4417	44	1	2026-04-18 16:50:44.784893	\N	تعيار	\N	\N	\N	evening
4451	1001	3	2026-04-19 06:09:26.522022	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
4461	1047	3	2026-04-19 08:11:37.944963	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج مصطفى بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	\N
4462	1047	3	2026-04-19 08:13:57.435383	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4471	474	3	2026-04-19 11:36:13.583693	\N	الجلسة الاولى من البكج 	تمارين تأهيلية	\N	\N	morning
4484	817	3	2026-04-19 13:35:53.587242	\N		روبوت	\N	\N	evening
4493	908	1	2026-04-19 15:04:26.003932	\N	جلسه علاج طبيعي العاشره	أجهزة علاج طبيعي	\N	\N	evening
4495	888	3	2026-04-19 15:26:43.741879	\N		أجهزة علاج طبيعي	\N	\N	evening
4496	852	3	2026-04-19 15:28:47.929615	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4502	358	3	2026-04-19 16:37:39.539805	\N		أجهزة علاج طبيعي	\N	\N	evening
4507	1036	3	2026-04-19 16:54:40.628811	\N		أجهزة علاج طبيعي	\N	\N	evening
4509	1027	3	2026-04-19 17:05:07.368283	\N	الجلسة الثانية اليوم الثاني الشفت المسائي 	أجهزة علاج طبيعي	\N	\N	evening
4510	1055	3	2026-04-19 17:08:56.494905	\N	يباشرون في وقت لاحق	استشارة طبية	\N	\N	evening
4511	1045	3	2026-04-19 17:33:19.913617	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1750	503	3	2026-03-01 16:38:44.932513	\N		أجهزة علاج طبيعي	\N	\N	evening
1751	356	3	2026-03-01 16:39:25.562444	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1752	177	3	2026-03-01 16:39:49.599937	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	evening
1753	324	3	2026-03-01 16:59:49.588056	\N		أجهزة علاج طبيعي	\N	\N	evening
1754	566	3	2026-03-01 17:34:46.698355	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1755	566	3	2026-03-01 17:35:11.852291	\N	بعد الاستشارة اخذ المريض جلسة مفردة	أجهزة علاج طبيعي	\N	\N	evening
1756	567	3	2026-03-01 17:54:38.014014	\N	اخذ المرريض استشارة وقرر المباشرة من يوم غد	استشارة طبية	\N	\N	evening
1757	322	3	2026-03-01 17:54:58.546527	\N		تمارين تأهيلية	\N	\N	evening
1758	424	3	2026-03-01 18:02:09.647415	\N		أجهزة علاج طبيعي	\N	\N	evening
1759	568	3	2026-03-01 18:20:01.629157	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1760	568	3	2026-03-01 18:24:29.842658	\N	المريض باشر بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
1761	456	3	2026-03-01 18:25:28.594513	\N		أجهزة علاج طبيعي	\N	\N	evening
1762	488	3	2026-03-01 18:30:09.008252	\N		أجهزة علاج طبيعي	\N	\N	evening
1763	188	3	2026-03-01 18:40:26.440131	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1764	188	3	2026-03-01 18:40:38.378921	\N		أجهزة علاج طبيعي	\N	\N	evening
1765	265	3	2026-03-01 18:44:24.797596	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1766	265	3	2026-03-01 18:44:31.250327	\N		أجهزة علاج طبيعي	\N	\N	evening
1767	555	3	2026-03-01 18:57:38.981139	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1768	555	3	2026-03-01 18:58:00.840294	\N	اخذ المريض جلسته الاولى بعد استشارة مسابقة يوم امس 	أجهزة علاج طبيعي	\N	\N	evening
1769	569	3	2026-03-01 19:09:41.633869	\N	اخذ المريض استشارة وقرر المباشرة في وقت اخر 	استشارة طبية	\N	\N	morning
1770	518	3	2026-03-01 19:09:54.582113	\N		تمارين تأهيلية	\N	\N	morning
1771	546	3	2026-03-01 19:25:27.328577	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1772	546	3	2026-03-01 19:25:32.511097	\N		أجهزة علاج طبيعي	\N	\N	morning
1773	496	3	2026-03-01 19:25:47.802134	\N		أجهزة علاج طبيعي	\N	\N	morning
1774	572	3	2026-03-01 20:27:26.93039	\N		استشارة طبية	\N	\N	morning
1775	571	3	2026-03-01 20:27:40.243279	\N		استشارة طبية	\N	\N	morning
1776	468	3	2026-03-01 20:28:31.124136	\N		أجهزة علاج طبيعي	\N	\N	morning
1777	570	3	2026-03-01 20:53:22.786815	\N		استشارة طبية	\N	\N	morning
1778	556	3	2026-03-01 21:03:07.467361	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1779	556	3	2026-03-01 21:07:57.433388	\N	باشر المريض بعد الاستشارة بجلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
1780	493	3	2026-03-02 06:08:13.461063	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1781	491	3	2026-03-02 06:55:47.158604	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1782	293	3	2026-03-02 07:04:44.332689	\N	الجلسة السابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1783	45	1	2026-03-01 08:03:21	\N	لغرض التعيار	\N	\N	\N	morning
1784	573	3	2026-03-02 08:22:06.946148	\N	زارنا المريض بعد مشاهدة اعلان عن طريق الفيس بوك حيث كان يعاني من اصابة قديمة نتيجة حادث سير على اثرها اصيب بسوفان بالركبة واليوم جاء لاخذ الاستشارة والمباشرة باخذ بكج من عشر جلسات 	أجهزة علاج طبيعي	\N	\N	morning
1785	498	3	2026-03-02 08:22:58.596398	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
1786	165	3	2026-03-02 08:23:26.743822	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1787	298	3	2026-03-02 08:29:37.198451	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1788	574	3	2026-03-02 09:20:33.000217	\N	استشارة اولية عند الدكتور عبد الله خان وسيباشر غدا حسب الموعد	استشارة طبية	\N	\N	morning
1789	548	3	2026-03-02 09:32:32.301621	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1790	515	3	2026-03-02 10:19:14.694095	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1791	299	3	2026-03-02 10:24:09.320347	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1792	426	3	2026-03-02 10:25:32.749132	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1793	513	3	2026-03-02 10:38:15.482746	\N	الجلسة الثانية والاخيرة 	أجهزة علاج طبيعي	\N	\N	morning
1794	549	3	2026-03-02 11:17:58.22013	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1795	321	4	2026-03-02 11:33:22.386586	\N	تجميل الطرف	\N	\N	\N	morning
1796	408	1	2026-03-02 11:41:04.504006	\N	استلام مساند afo مع مساند للكف	\N	\N	\N	morning
1797	477	1	2026-03-02 11:41:54.089595	\N	استلام مساند kafo	\N	\N	\N	morning
1799	467	3	2026-03-02 11:46:20.307071	\N	الجلسة السادسة من البكج 	روبوت	\N	\N	morning
1800	471	1	2026-03-02 11:47:06.497638	\N	تم تحويل مبلغ وقدره مليون و500000 الف دينار عراقي	\N	\N	\N	morning
1798	467	3	2026-03-02 11:46:11.033157		الجلسة السادسة من البكج 	تمارين تأهيلية	\N	\N	morning
4418	1039	1	2026-04-18 16:51:06.391527	\N	صيانه قالب 	\N	\N	\N	evening
1802	213	3	2026-03-02 15:58:56.450159	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1803	569	3	2026-03-02 16:29:19.125585	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1804	569	3	2026-03-02 16:29:41.638681	\N	باشر المريض بعد الاستشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
1805	570	3	2026-03-02 16:34:15.754208	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1806	570	3	2026-03-02 16:34:41.645836	\N	باشرت المريضة بعد الاستشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
1807	502	3	2026-03-02 16:49:27.950578	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1808	502	3	2026-03-02 16:49:31.602565	\N		أجهزة علاج طبيعي	\N	\N	evening
1809	222	3	2026-03-02 16:53:18.810344	\N	جلسة مدفوعة من مؤسسة العين	تمارين تأهيلية	\N	\N	evening
1810	356	3	2026-03-02 16:54:06.313965	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1811	425	3	2026-03-02 16:54:18.453889	\N		أجهزة علاج طبيعي	\N	\N	evening
1812	553	3	2026-03-02 16:54:55.895879	\N	الجلسة الثالثة من البكج مع الشفت المسائي	أجهزة علاج طبيعي	\N	\N	evening
1813	458	3	2026-03-02 16:55:19.621079	\N		روبوت	\N	\N	evening
1814	131	3	2026-03-02 16:55:33.993541	\N		أجهزة علاج طبيعي	\N	\N	evening
1815	324	3	2026-03-02 16:57:34.125801	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
1816	505	3	2026-03-02 16:58:30.11563	\N		أجهزة علاج طبيعي	\N	\N	evening
1817	192	3	2026-03-02 17:03:09.304845	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	evening
1818	463	3	2026-03-02 17:25:19.198024	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1819	463	3	2026-03-02 17:25:24.699752	\N		أجهزة علاج طبيعي	\N	\N	evening
1820	485	3	2026-03-02 17:25:36.867766	\N		أجهزة علاج طبيعي	\N	\N	evening
1821	567	3	2026-03-02 17:25:57.153828	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1822	567	3	2026-03-02 17:26:17.300835	\N	باشر المريض بعد الاستشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
1823	322	3	2026-03-02 17:29:38.345233	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1824	322	3	2026-03-02 17:33:56.625598	\N		روبوت	\N	\N	evening
1825	424	3	2026-03-02 18:05:24.590022	\N		أجهزة علاج طبيعي	\N	\N	evening
1826	74	3	2026-03-02 18:24:14.454299	\N		تمارين تأهيلية	\N	\N	evening
1827	571	3	2026-03-02 18:39:37.632357	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1828	571	3	2026-03-02 18:40:12.081433	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
1829	504	3	2026-03-02 19:10:20.443295	\N		أجهزة علاج طبيعي	\N	\N	morning
1830	545	3	2026-03-02 19:13:06.881392	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1831	545	3	2026-03-02 19:13:11.175955	\N		أجهزة علاج طبيعي	\N	\N	morning
1832	308	3	2026-03-02 19:16:47.559381	\N		أجهزة علاج طبيعي	\N	\N	morning
1833	307	3	2026-03-02 19:36:45.831951	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1834	576	3	2026-03-02 19:42:01.895481	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1835	576	3	2026-03-02 19:42:35.589958	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	morning
1836	307	3	2026-03-02 19:43:18.761746	\N		أجهزة علاج طبيعي	\N	\N	morning
1837	508	3	2026-03-02 20:04:10.485531	\N		أجهزة علاج طبيعي	\N	\N	morning
1838	575	3	2026-03-02 20:55:17.712457	\N	المريض اخذ استشارة ويباشر بوقت اخر	استشارة طبية	\N	\N	morning
1839	456	3	2026-03-02 20:55:58.136524	\N		أجهزة علاج طبيعي	\N	\N	morning
1840	224	3	2026-03-02 20:56:47.129879	\N		أجهزة علاج طبيعي	\N	\N	morning
1841	531	3	2026-03-02 20:57:46.491686	\N		أجهزة علاج طبيعي	\N	\N	morning
1842	507	3	2026-03-02 20:58:11.969078	\N		أجهزة علاج طبيعي	\N	\N	morning
1843	468	3	2026-03-02 20:58:33.840591	\N		أجهزة علاج طبيعي	\N	\N	morning
1844	205	3	2026-03-03 05:15:52.968368	\N	الجلسة الخامسة من البكج 	تمارين تأهيلية	\N	\N	morning
1845	271	3	2026-03-03 05:48:42.28109	\N	الجلسة الاخيرة من البكج 	تمارين تأهيلية	\N	\N	morning
1846	346	3	2026-03-03 05:58:14.308844	\N	الجلسة الثامنة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1847	509	3	2026-03-03 06:11:45.503124	\N	الجلسة الثانية مجانية 	أجهزة علاج طبيعي	\N	\N	morning
1848	474	3	2026-03-03 06:46:22.161904	\N	الجلسة الخامسة من البكج 	تمارين تأهيلية	\N	\N	morning
1849	550	3	2026-03-03 07:14:59.47623	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1850	320	3	2026-03-03 07:23:40.714196	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1851	549	3	2026-03-03 07:24:13.351533	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1852	79	3	2026-03-03 07:27:46.736233	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1853	147	3	2026-03-03 07:43:38.695428	\N	الجلسة التاسعة من البكج 	تمارين تأهيلية	\N	\N	morning
1854	389	1	2026-03-02 07:59:09	\N	لغرض تثبيت الادبتر واستلام الطرف 	\N	\N	\N	morning
1855	577	3	2026-03-03 08:22:18.275237	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
1856	287	3	2026-03-03 08:50:56.785355	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1857	513	3	2026-03-03 09:11:45.800193	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1859	467	3	2026-03-03 09:19:50.266432	\N	الجلسة السابعة والاخيرة من البكج 	روبوت	\N	\N	morning
1860	470	1	2026-03-03 09:37:52.467438	\N	لغرض استلام مساند كيفو الليلي 	\N	\N	\N	morning
1861	299	3	2026-03-03 09:53:45.031695	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1862	480	3	2026-03-03 10:09:07.96855	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1863	249	3	2026-03-03 10:23:25.428891	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1864	153	3	2026-03-03 10:25:10.367186	\N	الجلسة الرابعة والاخيرة من البكج 	تمارين تأهيلية	\N	\N	morning
1865	563	3	2026-03-03 11:06:49.413288	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1866	578	3	2026-03-03 11:43:28.050344	\N	استشارة اوليه عند الدكتور عبد الله خان وسيباشر المريض حسب موعده المخصص له 	استشارة طبية	\N	\N	morning
1867	579	3	2026-03-03 12:02:50.949646	\N	استشارو طبيه مع الدكتور عبد الله خان مع hot pack لمدة 10 دقائق فقط 	استشارة طبية	\N	\N	morning
1868	580	2	2026-03-03 12:12:40.014641	\N	تم تحويل المريض من قبل سليم غطاس وتحديد نوع المسند / تم اخذ قوالب 	\N	\N	\N	morning
1869	581	2	2026-03-03 12:17:12.353532	\N	تم فحص المصاب وعرض عليه نماذج مع تحديد سعر 700000 للاصبع / بانتظار الدفع / 	\N	\N	\N	morning
1870	582	1	2026-03-03 13:53:24.165743	\N	تم مراجعه المركز لغرض الفحص وتبين انها تعاني من ضمور خلايا الدماغ cp وبعد الفحص تم تخصيص لها مسند rgo بدون خوذه لكون لديها انحراف العامود الفقري وبسعر مليون و400000 الف دينار عراقي 	\N	\N	\N	evening
1871	583	4	2026-03-03 13:58:40.618847	تمت المعاينة من قبل استاذ سيف وكون البتر يوجد فيها خيوط بسبب التهاب البتر تم اعطاء مهلة لحين فك الخيوط والتام الجرح وبعد ذلك يراجع لتعليمهم بخصوص لف الباندج وبعدها عمل طرف صناعي وتم عرض الاطراف الصناعية المناسبة للمريض 	استعلام	\N	\N	\N	evening
1872	425	3	2026-03-03 16:17:56.320387	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
1873	575	3	2026-03-03 16:24:53.465909	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1874	575	3	2026-03-03 16:25:11.274122	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
1875	569	3	2026-03-03 16:36:44.017639	\N		أجهزة علاج طبيعي	\N	\N	evening
1876	570	3	2026-03-03 16:37:30.993309	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1877	570	3	2026-03-03 16:37:35.918868	\N		أجهزة علاج طبيعي	\N	\N	evening
1878	503	3	2026-03-03 16:40:03.051821	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1879	503	3	2026-03-03 16:40:07.23873	\N		أجهزة علاج طبيعي	\N	\N	evening
4494	977	3	2026-04-19 15:05:13.33393	\N		أجهزة علاج طبيعي	\N	\N	evening
1881	458	3	2026-03-03 16:43:25.969826	\N		روبوت	\N	\N	evening
1882	222	3	2026-03-03 16:45:03.511345	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (13 جلسة) (تكلفة: 325,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1883	222	3	2026-03-03 16:45:07.666823	\N		تمارين تأهيلية	\N	\N	evening
1884	553	3	2026-03-03 17:01:58.333968	\N		أجهزة علاج طبيعي	\N	\N	evening
1885	425	3	2026-03-03 17:10:17.361509	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1886	177	3	2026-03-03 17:30:26.204165	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1887	505	3	2026-03-03 17:35:54.190439	\N		أجهزة علاج طبيعي	\N	\N	evening
1888	322	3	2026-03-03 17:42:04.003486	\N		تمارين تأهيلية	\N	\N	evening
1889	264	3	2026-03-03 17:53:08.375604	\N		تمارين تأهيلية	\N	\N	evening
1890	567	3	2026-03-03 17:55:30.21969	\N		أجهزة علاج طبيعي	\N	\N	evening
1891	518	3	2026-03-03 17:56:12.795533	\N		تمارين تأهيلية	\N	\N	evening
1892	424	3	2026-03-03 18:07:01.282294	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
1893	504	3	2026-03-03 18:14:41.617759	\N	الجلسة الثانية من البكج\n	أجهزة علاج طبيعي	\N	\N	evening
1894	585	3	2026-03-03 18:48:47.742947	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1895	585	3	2026-03-03 18:57:52.238807	\N		أجهزة علاج طبيعي	\N	\N	evening
1896	456	3	2026-03-03 19:26:15.847437	\N		أجهزة علاج طبيعي	\N	\N	morning
1897	571	3	2026-03-03 19:27:57.443019	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1898	571	3	2026-03-03 19:28:02.315019	\N		أجهزة علاج طبيعي	\N	\N	morning
1899	394	3	2026-03-03 19:28:48.807749	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1900	394	3	2026-03-03 19:28:53.301582	\N		أجهزة علاج طبيعي	\N	\N	morning
1901	496	3	2026-03-03 19:32:02.823767	\N		أجهزة علاج طبيعي	\N	\N	morning
1902	270	3	2026-03-03 20:10:03.172811	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1903	270	3	2026-03-03 20:10:07.569632	\N		أجهزة علاج طبيعي	\N	\N	morning
2001	322	3	2026-03-05 17:46:46.861378	\N		تمارين تأهيلية	\N	\N	evening
2003	531	3	2026-03-05 17:47:41.1465	\N		أجهزة علاج طبيعي	\N	\N	evening
1904	584	3	2026-03-03 20:11:48.953896	\N	اخذ المريض استشارة اولية تكتمل بعد ان يجلب تقاريره الخاصة وفحوصاته	استشارة طبية	\N	\N	morning
1905	586	3	2026-03-03 20:13:00.09112	\N	اخذت المريضة استشارة وتكتمل بعد ان تجلب فحوصاتها الخاصة بحالتها	استشارة طبية	\N	\N	morning
1906	224	3	2026-03-03 20:40:49.83517	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1907	64	3	2026-03-04 05:25:33.306754	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1908	238	3	2026-03-04 05:26:15.590309	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1909	149	3	2026-03-04 05:35:25.820772	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1910	345	3	2026-03-04 05:38:35.76084	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1911	381	3	2026-03-04 05:43:11.866125	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1912	346	3	2026-03-04 05:54:55.979554	\N	الجلسة التاسعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1913	493	3	2026-03-04 06:15:49.47667	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1914	587	3	2026-03-04 06:19:51.940446	\N	استشارة طبية جديدة عند الدكتور عبد الله. لم تباشر برغبة من المربضه ( تفكر)	استشارة طبية	\N	\N	morning
1915	491	3	2026-03-04 06:59:52.648134	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1916	588	3	2026-03-04 07:10:52.889456	\N	استشارة اولية ستباشر حسب الموعد المخصص لها يوم السبت 	استشارة طبية	\N	\N	morning
1917	293	3	2026-03-04 07:11:15.200649	\N	الجلسة الثامنة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1918	589	3	2026-03-04 07:33:52.255615	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1919	509	3	2026-03-04 07:48:07.391673	\N	الجلسة الثالثة مجانية 	أجهزة علاج طبيعي	\N	\N	morning
1920	582	1	2026-03-04 08:05:40.461449	\N	تم تحويل مبلغ دفعه اولى 700000 الف دينار عراقي والمتبقي 700000 الف 	\N	\N	\N	morning
1921	590	1	2026-03-04 08:17:52.76902	\N	تم تحويل مبلغ وقدره 100000 الف دينار عراقي 	\N	\N	\N	morning
1922	298	3	2026-03-04 08:22:53.761161	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1923	498	3	2026-03-04 08:29:27.052841	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1924	549	3	2026-03-04 08:44:28.104836	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1925	467	3	2026-03-04 08:51:45.307671	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (7 جلسة) (تكلفة: 175,000 د.ع) - + جلسة اليوم مجانية بعلم دكتور ياسر 	أجهزة علاج طبيعي	\N	\N	\N
1926	467	3	2026-03-04 08:52:17.544343	خدمة جديدة	جلسات علاج إضافية - روبوت (7 جلسة) (تكلفة: 350,000 د.ع)	روبوت	\N	\N	\N
1927	513	3	2026-03-04 09:40:02.165147	\N	الجلسة الثانية والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1928	515	3	2026-03-04 10:14:24.978139	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (3 جلسة) (تكلفة: 75,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1929	299	3	2026-03-04 10:18:06.05003	\N	الجلسة السادسة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1930	591	2	2026-03-04 10:33:36.306479	\N	تم اخذ القياسات الاولية لغرض استيراد المواد بعد الاتفاق على طرف فوق الركبة نوع بايونك / تم دفع المبلغ بالكامل 	\N	\N	\N	morning
1931	335	3	2026-03-04 10:36:10.381972	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1932	578	3	2026-03-04 10:42:34.531707	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اليوم جلسته الاولى من العلاج الطبيعي بعد استشارة البارحة 	أجهزة علاج طبيعي	\N	\N	\N
1934	593	1	2026-03-04 11:26:06.524439	\N	تم تحويل مبلغ وقدره 500000 الف دينار عراقي 	\N	\N	\N	morning
1936	45	1	2026-03-04 12:53:49.3214	\N	تغيير مكان الادبتر مع التعيار 	\N	\N	\N	morning
1937	594	1	2026-03-04 13:02:49.562251	\N	تم تحويل مبلغ وقدره 500000 الف دينار عراقي والباقي 2000000	\N	\N	\N	evening
1938	596	1	2026-03-04 13:23:11.755535	\N	تم تحويل مبلغ قدره 750000 الف دبنار عراقي وباقي 4000000	\N	\N	\N	evening
1939	595	1	2026-03-04 13:30:45.494272	\N	تم الفحص والمعاينه وتم تحديد نوع المسند kafo ليلي عدد 2 	\N	\N	\N	evening
1940	389	1	2026-03-04 13:50:25.360323	\N	لغرض تجميل الطرف 	\N	\N	\N	evening
1941	514	4	2026-03-04 14:12:47.627825	\N	شراء طرف	\N	\N	\N	evening
1942	75	4	2026-03-04 14:14:19.980101	\N	تعديل على القالب	\N	\N	\N	evening
1943	425	3	2026-03-04 16:44:36.951472	\N		أجهزة علاج طبيعي	\N	\N	evening
1944	575	3	2026-03-04 16:46:03.518786	\N		أجهزة علاج طبيعي	\N	\N	evening
1945	177	3	2026-03-04 16:47:35.881368	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1946	504	3	2026-03-04 17:14:47.168954	\N		أجهزة علاج طبيعي	\N	\N	evening
1947	131	3	2026-03-04 17:16:38.196233	\N		أجهزة علاج طبيعي	\N	\N	evening
1948	567	3	2026-03-04 17:16:54.476028	\N		أجهزة علاج طبيعي	\N	\N	evening
1949	505	3	2026-03-04 17:22:03.792415	\N		أجهزة علاج طبيعي	\N	\N	evening
1950	322	3	2026-03-04 17:24:59.144095	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
1951	322	3	2026-03-04 17:30:01.579845	\N		روبوت	\N	\N	evening
1952	485	3	2026-03-04 17:36:25.241383	\N		أجهزة علاج طبيعي	\N	\N	evening
2002	458	3	2026-03-05 17:47:20.305009	\N		روبوت	\N	\N	evening
2144	625	3	2026-03-08 19:56:53.223171	\N		أجهزة علاج طبيعي	\N	\N	morning
2427	131	3	2026-03-14 18:45:30.880798	\N		أجهزة علاج طبيعي	\N	\N	evening
2552	458	3	2026-03-16 18:42:04.635694	\N		روبوت	\N	\N	evening
1953	192	3	2026-03-04 17:36:54.765982	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
1954	453	3	2026-03-04 17:52:38.385257	\N	الجلسة الخامسة مع الشفت المسائي	أجهزة علاج طبيعي	\N	\N	evening
1955	597	3	2026-03-04 17:53:29.747179	\N	اخذت المريضة استشارة وتباشر يوم غد	استشارة طبية	\N	\N	evening
1956	424	3	2026-03-04 17:57:36.366735	\N		أجهزة علاج طبيعي	\N	\N	evening
1957	488	3	2026-03-04 18:19:56.857172	\N		أجهزة علاج طبيعي	\N	\N	evening
1958	598	3	2026-03-04 18:57:29.053087	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1959	545	3	2026-03-04 19:03:33.182398	\N		أجهزة علاج طبيعي	\N	\N	morning
1960	598	3	2026-03-04 19:29:08.353349	\N	باشر المريض بعد الاستشارة	أجهزة علاج طبيعي	\N	\N	morning
1961	599	3	2026-03-04 19:37:25.543247	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1962	599	3	2026-03-04 19:38:37.912456	\N	المريضة جددت اشتراك لها اخر بعد ان اجرت عملية اخرى في مفصل الركبة حيث تم تحويلها من قبل دكتور حيدر حازم	أجهزة علاج طبيعي	\N	\N	morning
1963	224	3	2026-03-04 19:53:09.694583	\N		أجهزة علاج طبيعي	\N	\N	morning
1964	508	3	2026-03-04 19:53:27.687478	\N		أجهزة علاج طبيعي	\N	\N	morning
1965	468	3	2026-03-04 20:26:47.540976	\N		أجهزة علاج طبيعي	\N	\N	morning
1966	345	3	2026-03-05 05:05:02.49449	\N	الجلسة الثالثة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1967	205	3	2026-03-05 05:05:27.647109	\N	الجلسة السادسة من البكج 	تمارين تأهيلية	\N	\N	morning
1968	346	3	2026-03-05 05:27:34.542152	\N	الجلسة المجانية من العرض 	أجهزة علاج طبيعي	\N	\N	morning
1969	271	3	2026-03-05 05:37:19.83114	\N	الجلسة المجانية من البكج 	تمارين تأهيلية	\N	\N	morning
1970	320	3	2026-03-05 07:42:22.389117	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1971	474	3	2026-03-05 07:43:41.154696	\N	الجلسة السادسة من البكج 	تمارين تأهيلية	\N	\N	morning
1972	589	3	2026-03-05 07:45:25.143293	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1973	147	3	2026-03-05 07:52:31.173681	\N	الجلسة المجانية من العرض	تمارين تأهيلية	\N	\N	morning
1974	185	2	2026-03-05 08:04:46.60226	\N	تبديل ركبة ثابتة بسب كسر الركبة القديمة	\N	\N	\N	morning
1975	600	1	2026-03-04 08:10:51	\N	تم مراجعه المركز لغرض التعيار ودفع مبلغ وقدره 250000 الف دينار 	\N	\N	\N	morning
1976	121	3	2026-03-05 08:36:12.797331	\N	الجلسة السادسة والاخيرة من البكج 	تمارين تأهيلية	\N	\N	morning
1977	602	1	2026-03-05 08:48:48.228046	\N	تم تحويل مابذمته 500000 الف دينار عراقي 	\N	\N	\N	morning
1978	601	3	2026-03-05 09:02:29.212461	\N	استشارة طبيه اولية مع الدكتور عبد الله خان لم يباشر لان حالة المريض تستوجب عملية 	استشارة طبية	\N	\N	morning
1979	467	3	2026-03-05 09:04:16.724848	\N	اول جلسة من بكج الاجهزه 	أجهزة علاج طبيعي	\N	\N	morning
1980	467	3	2026-03-05 09:04:28.679836	\N	الجلسة الثانية للروبوت 	روبوت	\N	\N	morning
1933	592	2	2026-03-04 09:06:41		صيانة القالب بدون اجور 	\N	\N	\N	morning
1981	603	3	2026-03-05 10:17:11.99634	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
1982	480	3	2026-03-05 10:18:09.844837	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1983	299	3	2026-03-05 10:21:25.505348	\N	الجلسة المجانية من العرض 	أجهزة علاج طبيعي	\N	\N	morning
1984	153	3	2026-03-05 10:24:31.602372	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
1985	426	3	2026-03-05 10:27:13.408645	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1986	563	3	2026-03-05 11:11:15.734863	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1987	549	3	2026-03-05 11:16:11.716961	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1988	605	2	2026-03-05 11:48:08.120667	\N	تحديد مسند afo عدد2 مع تسديد مبلغ 495000 د	\N	\N	\N	morning
1989	444	1	2026-03-05 13:19:32.079076		لغرض صيانه قالب و التعيار	\N	\N	\N	evening
1990	425	3	2026-03-05 16:44:22.749456	\N		أجهزة علاج طبيعي	\N	\N	evening
1991	553	3	2026-03-05 16:45:18.188492	\N		أجهزة علاج طبيعي	\N	\N	evening
1992	575	3	2026-03-05 16:45:57.007805	\N		أجهزة علاج طبيعي	\N	\N	evening
1993	597	3	2026-03-05 16:46:31.562678	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1994	597	3	2026-03-05 16:47:06.27668	\N	باشرت المريضة بجلستها الاولى بعد الاستشارة حيث تم تحويلها من قبل دكتور حسن ناجي 	أجهزة علاج طبيعي	\N	\N	evening
1995	575	3	2026-03-05 16:53:13.409863	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
1996	606	3	2026-03-05 17:25:42.968009	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1997	606	3	2026-03-05 17:26:28.531362	\N	باشرت المريضة بعد الاستشارة مباشرةً	أجهزة علاج طبيعي	\N	\N	evening
1998	463	3	2026-03-05 17:44:20.953211	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
1999	463	3	2026-03-05 17:44:29.070687	\N		أجهزة علاج طبيعي	\N	\N	evening
2000	570	3	2026-03-05 17:45:09.603489	\N		أجهزة علاج طبيعي	\N	\N	evening
2004	571	3	2026-03-05 17:53:18.055423	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2005	571	3	2026-03-05 17:53:21.643559	\N		أجهزة علاج طبيعي	\N	\N	evening
2006	424	3	2026-03-05 17:57:05.863881	\N		أجهزة علاج طبيعي	\N	\N	evening
2007	608	3	2026-03-05 18:14:20.059637	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2008	608	3	2026-03-05 18:14:38.282036	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
2009	265	3	2026-03-05 18:24:39.309842	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع) - ابر صينية	أبر صينية	\N	\N	\N
2010	188	3	2026-03-05 18:43:25.193314	\N		أجهزة علاج طبيعي	\N	\N	evening
2011	265	3	2026-03-05 18:43:46.447827	\N		أبر صينية	\N	\N	evening
2012	496	3	2026-03-05 19:22:15.053078	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2013	507	3	2026-03-05 20:26:25.164759	\N		أجهزة علاج طبيعي	\N	\N	morning
2014	575	3	2026-03-05 20:38:45.802803	\N		أبر صينية	\N	\N	morning
2015	395	3	2026-03-07 05:23:33.797982	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2016	395	3	2026-03-07 05:24:09.477415	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2017	346	3	2026-03-07 05:24:27.413324	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2018	547	3	2026-03-07 05:44:54.744959	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اليوم اول جلسات العلاج الطبيعي مع الدكتور عبد الله خان 	أجهزة علاج طبيعي	\N	\N	\N
2019	64	3	2026-03-07 05:51:49.076383	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2020	609	3	2026-03-07 07:12:21.933923	\N	استشارة اولية مبدئيا لم بناسبهم السعر في حال قرروا المباشره يتواصلون على ارقامنه لحجز موعد خاص بيهم والمباشره على اساسه 	استشارة طبية	\N	\N	morning
2021	609	3	2026-03-07 07:21:21.739634	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - عادت المريضه وقررت المباشرة اليوم بعد استشارة دكتور عبد الله خان 	أجهزة علاج طبيعي	\N	\N	\N
2022	491	3	2026-03-07 07:28:25.151015	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2023	228	3	2026-03-07 07:40:09.356353	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2024	228	3	2026-03-07 07:40:09.417767	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2025	499	3	2026-03-07 07:41:44.038078	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2026	298	3	2026-03-07 08:20:25.824309	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2027	498	3	2026-03-07 08:33:49.348601	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2028	612	1	2026-03-07 08:49:30.587589	\N	تم  تحويل المبلغ 190000  الف دينار 	\N	\N	\N	morning
2029	611	3	2026-03-07 08:54:47.598343	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2030	610	3	2026-03-07 08:55:10.37728	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2031	467	3	2026-03-07 09:02:16.907163	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2032	467	3	2026-03-07 09:02:28.085399	\N	الجلسة الثالثة من البكج 	روبوت	\N	\N	morning
2033	613	1	2026-03-07 09:12:35.609525	\N	تم تحويل مبلغ وقدره 100000 الف دينار عراقي 	\N	\N	\N	morning
2034	614	1	2026-03-07 09:20:11.025102	\N	تم تحويل مبلغ 250000 الف دينار عراقي 	\N	\N	\N	morning
2035	616	1	2026-03-07 10:05:57.041819	\N	تم فحص ومعاينه المريض مع تخصيص دبان 14 عدد 2 	\N	\N	\N	morning
2036	615	3	2026-03-07 10:17:00.343455	\N	استشارة اولية عند الدكتور عبد الله خان ستباشر بعد تحديد موعد مناسب لها	استشارة طبية	\N	\N	morning
2037	515	3	2026-03-07 10:17:47.167817	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
2038	45	1	2026-03-07 10:21:09.718225	\N	لغرض التعيار 	\N	\N	\N	morning
2039	563	3	2026-03-07 10:29:57.066961	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2041	335	3	2026-03-07 10:37:07.208415	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2042	293	3	2026-03-07 10:49:54.927316	\N	الجلسة التاسعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2043	617	1	2026-03-07 10:51:55.143357	\N	فحص ومعاينه المريضه فقط	\N	\N	\N	morning
2044	537	2	2026-03-07 11:04:59.19751	\N	تم لبس الطرف والتدريب عليه وتم الاستلام 	\N	\N	\N	morning
2045	605	2	2026-03-07 11:05:36.085909	\N	تم اخذ قالب مساند عدد2	\N	\N	\N	morning
2046	618	3	2026-03-07 11:18:09.113362	\N	استشارة اولية مع الدكتور عبد الله خان ولم تباشر المريضه بارادة شخصيه منها 	استشارة طبية	\N	\N	morning
2047	619	2	2026-03-07 11:23:41.697864	\N	اظافة سوفت للقالب	\N	\N	\N	morning
2050	621	2	2026-03-07 11:51:36.990989	\N	تدريب على الطرف 	\N	\N	\N	morning
2145	599	3	2026-03-08 19:57:42.290246	\N		أجهزة علاج طبيعي	\N	\N	morning
2428	660	3	2026-03-14 18:46:51.25768	\N		أجهزة علاج طبيعي	\N	\N	evening
2551	188	3	2026-03-16 18:27:04.756197	\N		أجهزة علاج طبيعي	\N	\N	evening
2602	645	3	2026-03-17 19:45:13.552862	\N		أجهزة علاج طبيعي	\N	\N	morning
2052	415	1	2026-03-07 12:06:29.166092	\N	test	\N	\N	\N	morning
2053	622	1	2026-03-07 13:26:26.872519	\N	لغرض صيانه المسند صدر الحمام 	\N	\N	\N	evening
2054	514	4	2026-03-07 13:55:43.031016	\N	اخذ قالب	\N	\N	\N	evening
2055	570	3	2026-03-07 16:38:58.270039	\N		أجهزة علاج طبيعي	\N	\N	evening
2056	425	3	2026-03-07 16:39:18.140766	\N		أجهزة علاج طبيعي	\N	\N	evening
2057	597	3	2026-03-07 16:39:39.466107	\N		أجهزة علاج طبيعي	\N	\N	evening
2058	458	3	2026-03-07 16:42:32.672678	\N		روبوت	\N	\N	evening
2059	575	3	2026-03-07 16:48:02.413545	\N		أجهزة علاج طبيعي	\N	\N	evening
2060	131	3	2026-03-07 16:54:04.839007	\N		أجهزة علاج طبيعي	\N	\N	evening
2061	177	3	2026-03-07 16:54:24.463849	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
2062	518	3	2026-03-07 17:15:19.883929	\N		أجهزة علاج طبيعي	\N	\N	evening
2063	322	3	2026-03-07 17:15:49.316792	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2064	553	3	2026-03-07 17:17:20.316789	\N		أجهزة علاج طبيعي	\N	\N	evening
2065	322	3	2026-03-07 17:26:11.660379	\N		روبوت	\N	\N	evening
2066	485	3	2026-03-07 17:38:00.422559	\N		أجهزة علاج طبيعي	\N	\N	evening
2067	625	3	2026-03-07 17:48:41.370995	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2068	625	3	2026-03-07 18:10:52.142792	\N	باشر المريض بعد الاستشارة مباشرةً 	أجهزة علاج طبيعي	\N	\N	evening
2069	626	3	2026-03-07 18:15:21.88309	\N	اخذت المريضة استشارة وتباشر يوم غد 	استشارة طبية	\N	\N	evening
2070	531	3	2026-03-07 18:15:40.626028	\N		أجهزة علاج طبيعي	\N	\N	evening
2071	424	3	2026-03-07 18:18:23.607257	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2072	424	3	2026-03-07 18:18:28.387437	\N		أجهزة علاج طبيعي	\N	\N	evening
2073	488	3	2026-03-07 18:18:40.801351	\N		أجهزة علاج طبيعي	\N	\N	evening
2074	606	3	2026-03-07 18:54:30.195951	\N		أجهزة علاج طبيعي	\N	\N	evening
2075	265	3	2026-03-07 19:00:03.981469	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2076	265	3	2026-03-07 19:00:08.120943	\N		أجهزة علاج طبيعي	\N	\N	morning
2077	545	3	2026-03-07 19:03:55.734035	\N		أجهزة علاج طبيعي	\N	\N	morning
2078	394	3	2026-03-07 19:28:19.68827	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2079	508	3	2026-03-07 20:22:17.211645	\N		أجهزة علاج طبيعي	\N	\N	morning
2080	311	3	2026-03-07 20:39:01.031413	\N		أجهزة علاج طبيعي	\N	\N	morning
2081	627	3	2026-03-06 21:27:00	\N	المريض يباشر بوقت لاحق بعد ان يتم جلب ورقة من طبيبه تسمح بجلسات العلاج الطبيعي	استشارة طبية	\N	\N	morning
2082	205	3	2026-03-08 05:24:24.304681	\N	الجلسة المجانية من العرض	تمارين تأهيلية	\N	\N	morning
2083	577	3	2026-03-08 05:46:19.431254	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
2084	238	3	2026-03-08 05:50:03.407626	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2085	381	3	2026-03-08 05:53:37.284542	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2086	628	3	2026-03-08 06:41:38.712415	\N	جاء المريض اليوم بعد اصطحابه من قبل احد اقاربه موظف في المستشفى حيث كان يعني من انزلاق في الفقرات منذ 2025 مما ادى الى ضغط الفقرات على الحبل الشوكي واليوم جاء لاخذ استشارة اولية من قبل المعالج المختص عبد الله خان	استشارة طبية	\N	\N	morning
2087	629	3	2026-03-08 07:22:13.030591	\N	جاء المريض بعد ان سمع عن مركزنا من خلال بعض المراجعين بان هناك اجهزة حديثة تناسب حالته حيث ان المريض يعاني من جلطة دماغية قد تعرض لها في 2022 في الجهة اليسرى واليوم جاء لاخذ الاستشارة 	استشارة طبية	\N	\N	morning
2088	474	3	2026-03-08 07:31:32.463317	\N	الجلسة السابعة من البكج	تمارين تأهيلية	\N	\N	morning
4416	874	1	2026-04-18 16:20:57.275365	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2089	623	1	2026-03-07 07:52:08	\N	صيانه قالب 	\N	\N	\N	morning
2090	624	1	2026-03-07 07:52:55	\N	صيانه قدم	\N	\N	\N	morning
2091	631	2	2026-03-08 07:54:55.101725	\N	مراجعة من اجل كتاب 	\N	\N	\N	morning
2092	320	3	2026-03-08 07:55:19.18069	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
2094	630	3	2026-03-08 07:57:53.886903	\N	زارنا المريض اليوم بعد التعرف على مركزنا من خلال التواصل الاجتماعي الفيس بوك حيث تعرض المريض الى جلطة دماغية تسبب له بشلل نصفي بالجهة اليمنى واخذ استشارة اولية من قبل المعالج المختص عبد الله خان ولكون المريض من سكنة الشطرة سوف يباشر معنا في وقت لاحق بعدما يتم تحدد موعد له	استشارة طبية	\N	\N	morning
2095	633	2	2026-03-08 08:13:07.169287	\N	تم تسديد قسط من المبلغ قدره 350000 د باقي 1050000د	\N	\N	\N	morning
2096	121	3	2026-03-08 08:29:16.672512	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة) (تكلفة: 150,000 د.ع) - اشتراك بعرض المركز بكج لستة جلسات وجلسة السابعة مجانية	تمارين تأهيلية	\N	\N	\N
2097	636	1	2026-03-08 08:42:40.142092	\N	تم تحويل مبلغ وقدره 500000 الف دينار عراقي 	\N	\N	\N	morning
2098	635	3	2026-03-08 08:44:31.788534	\N	جاءت المريضة بعد ان ابلغتها اقاربها التي كانت احد مراجعين مركزنا حيث تعاني من تشنج عضلي مفاجئ تعرض له قبل 8 ايام وقد اخذت استشارة اولية من قبل المعالج المختص عبد الله خان حتى ارسلها لاجراء فحص الرنين	استشارة طبية	\N	\N	morning
2051	34	4	2026-03-07 12:02:57.475563		تعديل على القالب بسبب تضخم الجزء المبتور	\N	\N	\N	morning
2099	467	3	2026-03-08 08:58:38.826251	\N	الجلسة الرابعة من البكج	روبوت	\N	\N	morning
2100	467	3	2026-03-08 08:59:13.284075	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2101	635	3	2026-03-08 09:48:41.120569	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - باشرت الان بعد الاستشارة الاولية	أجهزة علاج طبيعي	\N	\N	\N
2102	536	3	2026-03-08 09:50:07.732434	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشرت اليوم بعد ان اخذت استشارة اولية سابقا بتاريخ 26/2	أجهزة علاج طبيعي	\N	\N	\N
2103	480	3	2026-03-08 10:04:38.496126	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2104	229	2	2026-03-08 10:12:52.491613	\N	تسديد قسط بقيمة 200000 والباقي 1100000	\N	\N	\N	morning
2105	153	3	2026-03-08 10:19:30.795193	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2106	637	2	2026-03-08 10:34:29.093154	\N	تم اخذ قالب وتم تسديد مبلغ 1000000د	\N	\N	\N	morning
2107	537	2	2026-03-08 10:34:57.800119	\N	تدريب على الطرف 	\N	\N	\N	morning
2108	185	2	2026-03-08 10:35:57.755531	\N	تغيير ادبتر 	\N	\N	\N	morning
2109	639	3	2026-03-08 11:18:03.718281	\N	جاءنا المريض اليوم بعدما تواصل سابقا مع دكتور ياسر حيث تعرض المريض الى حادث سير فقد على اثره الحركة في الاطراف السفلى وحاليا اخذ استشارة اولية وسوف يححد له موعد غدا بسبب قدومه الى مركز بوقت متاخر ووجود مرضى نفسه حالته	استشارة طبية	\N	\N	morning
2110	595	1	2026-03-08 11:20:52.327166	\N	تم استلام المسند kafo عدد 2 ليلي مع تسديد المبلغ كامل	\N	\N	\N	morning
2111	642	3	2026-03-08 11:54:12.653877	\N	طفلة تعاني من تشوه ولادي تحتاج الى زراعة عظم حيث جاءت بعد تحويل من قبل دكتور حسن ناجي الشدود اخذت استشارة طبية من قبل المعالج المختص دكتور عبد الله خان	استشارة طبية	\N	\N	morning
2112	640	3	2026-03-08 11:58:00.292553	\N	تم تحويل المريضة من قبل دكتور حسن ناجي الشدود حيث تعاني المريضة من شلل نصفي نتيجة تعرضها الى جلطة دماغية اخذت اليوم استشارة طبية وسوف تيم تحديد موعد لها لاحقا	استشارة طبية	\N	\N	morning
2113	641	3	2026-03-08 12:06:14.52287	\N	جاءت المريضة بعد تعرفها على مركزنا من خلال الانستا غرام حيث تعاني المريضة من جلطة دماغية اخذت استشارة طبية من قبل المعالج المختص عبد الله خان وسوف يتم تحديد موعد لها لاحقا	استشارة طبية	\N	\N	morning
2114	638	3	2026-03-08 12:11:03.634057	\N	جاءت الى مركزنا من خلال نشر على الفيس بوك حيث تعاني من التهاب العصب الوجهي منذ سنتين حيث اتمت الاستشارة الاولية وقالت سوف ابحث الموضوع مع زوجي لكي اباشر لاحقا	استشارة طبية	\N	\N	morning
2115	349	2	2026-03-08 12:33:18.19512	\N	تم اخذ قالب وتسديد مبلغ قدره 3000000	\N	\N	\N	morning
2116	378	1	2026-03-08 12:38:21.283141		تم تسليم الطرف للمركز لغرض  تثبيت الادبتر 	\N	\N	\N	morning
2117	643	1	2026-03-08 13:55:57.715762	\N	تم تحويل مبلغ 250000 الف دينار عراقي 	\N	\N	\N	evening
2118	425	3	2026-03-08 16:45:37.423154	\N		أجهزة علاج طبيعي	\N	\N	evening
2119	222	3	2026-03-08 16:45:51.489657	\N		تمارين تأهيلية	\N	\N	evening
2120	597	3	2026-03-08 16:46:16.200192	\N		أجهزة علاج طبيعي	\N	\N	evening
2121	575	3	2026-03-08 16:58:44.483574	\N		أجهزة علاج طبيعي	\N	\N	evening
2122	518	3	2026-03-08 17:00:46.434595	\N		تمارين تأهيلية	\N	\N	evening
2123	626	3	2026-03-08 17:08:23.64016	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2124	626	3	2026-03-08 17:08:43.954365	\N	باشرت المريضة بعد استشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
2125	505	3	2026-03-08 17:10:39.644445	\N		أجهزة علاج طبيعي	\N	\N	evening
2126	567	3	2026-03-08 17:21:22.41816	\N		أجهزة علاج طبيعي	\N	\N	evening
2127	270	3	2026-03-08 17:30:56.149884	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2128	270	3	2026-03-08 17:36:13.22197	\N		أجهزة علاج طبيعي	\N	\N	evening
2129	322	3	2026-03-08 17:49:28.799748	\N		تمارين تأهيلية	\N	\N	evening
2130	458	3	2026-03-08 18:09:18.06616	خدمة جديدة	جلسات علاج إضافية - روبوت (10 جلسة) (تكلفة: 500,000 د.ع)	روبوت	\N	\N	\N
2131	188	3	2026-03-08 18:46:05.907707	\N		أجهزة علاج طبيعي	\N	\N	evening
2132	644	3	2026-03-08 19:10:17.017176	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2133	531	3	2026-03-08 19:21:17.859115	\N		أجهزة علاج طبيعي	\N	\N	morning
2134	645	3	2026-03-08 19:50:24.600822	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2135	645	3	2026-03-08 19:50:44.070088	\N	باشرت المريضة بجلسة ابر صينية اولى بعد الاستشارة 	أبر صينية	\N	\N	morning
2136	355	3	2026-03-08 19:53:36.38877	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2137	355	3	2026-03-08 19:53:43.512777	\N		أجهزة علاج طبيعي	\N	\N	morning
2138	355	3	2026-03-08 19:54:04.85474	\N		أجهزة علاج طبيعي	\N	\N	morning
2139	571	3	2026-03-08 19:54:35.571828	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2140	571	3	2026-03-08 19:54:39.882814	\N		أجهزة علاج طبيعي	\N	\N	morning
2141	608	3	2026-03-08 19:55:18.48728	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2142	608	3	2026-03-08 19:55:22.204182	\N		أجهزة علاج طبيعي	\N	\N	morning
2143	625	3	2026-03-08 19:56:49.235771	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2146	31	3	2026-03-08 20:01:17.760955	\N	المريض دافع بكج من 10 جلسات الا انه لم يتممها بسبب ظروف واجهته وقرر الإستمرار بها الان وتعتبر اليوم جلسته الثالثة من البكج المدفوع مسبقًا  حيث كانت اخر جلسه له في تاريخ 19/1	أجهزة علاج طبيعي	\N	\N	morning
2147	458	3	2026-03-08 20:04:30.328567	\N		روبوت	\N	\N	morning
2148	468	3	2026-03-08 20:09:52.710848	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
2149	468	3	2026-03-08 20:11:39.276519	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2150	307	3	2026-03-08 20:16:37.331176	\N		أجهزة علاج طبيعي	\N	\N	morning
2151	507	3	2026-03-08 20:30:07.363067	\N		أجهزة علاج طبيعي	\N	\N	morning
2152	646	3	2026-03-09 06:59:11.842807	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه بعد الاستشارة مباشرة 	تمارين تأهيلية	\N	\N	\N
2153	647	3	2026-03-09 07:25:01.665905	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2154	228	3	2026-03-09 07:37:30.402581	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2155	228	3	2026-03-09 07:37:30.455572	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2156	499	3	2026-03-09 07:39:18.702404	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2157	648	3	2026-03-09 07:48:17.320559	\N	استشارة اولية ولم تباشر المريضه بسبب السعر 	استشارة طبية	\N	\N	morning
2158	298	3	2026-03-09 08:21:02.437428	\N	الجلسة السادسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2159	435	3	2026-03-09 08:30:11.738067	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
1141	350	1	2026-02-16 09:50:30		لغرض صيانه القالب وتغيرر مكان الادبتر	\N	\N	\N	morning
2160	498	3	2026-03-09 08:33:06.501023	\N	الجلسة السادسة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2161	649	3	2026-03-09 08:50:29.675082	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض بعد الاستشارة مباشرة 	تمارين تأهيلية	\N	\N	\N
2162	467	3	2026-03-09 08:56:14.907735	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2163	467	3	2026-03-09 08:56:41.773113	\N	الجلسة الخامسة من البكج 	روبوت	\N	\N	morning
2164	369	1	2026-02-01 09:25:37	\N	تم زياره المركز للفحص والمعاينه واخذ قالب  مع القياسات ودفع مبلغ وقدره2500000 والباقي 500000	\N	\N	\N	morning
2165	537	2	2026-03-09 10:00:23.782122	\N	تدريب على الطرف 	\N	\N	\N	morning
2166	640	3	2026-03-09 10:00:25.673737	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (3 جلسة) (تكلفة: 75,000 د.ع) - باشرت المريضه اليوم باول جلسات العلاج الطبيعي بعد استشارة البارحة مع الدكتور عبد الله خان 	تمارين تأهيلية	\N	\N	\N
2167	426	3	2026-03-09 10:30:07.981974	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2168	563	3	2026-03-09 11:10:35.172645	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2169	515	3	2026-03-09 11:30:03.918057	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
2170	21	1	2026-01-20 11:32:26	\N	لغرض التدريب 	\N	\N	\N	morning
2171	21	1	2026-01-21 11:33:03	\N	لغرض التدريب 	\N	\N	\N	morning
2172	21	1	2026-01-24 11:33:25	\N	لغرض التدريب	\N	\N	\N	morning
2173	21	1	2026-01-26 11:33:44	\N	لغرض التدريب	\N	\N	\N	morning
2175	21	1	2026-02-07 11:34:49	\N	لغرض التدريب	\N	\N	\N	morning
2174	21	1	2026-01-28 11:34:05		لغرض التدريب مع دفع المبلغ كامل 1000000 دينار عراقي 	\N	\N	\N	morning
2176	21	1	2026-02-08 11:38:11		تدريب على الطرف	\N	\N	\N	morning
2177	21	1	2026-02-10 11:38:47	\N	تدريب على الطرف	\N	\N	\N	morning
2178	21	1	2026-02-12 11:39:13	\N	تدريب على الطرف	\N	\N	\N	morning
2179	21	1	2026-02-14 11:39:39	\N	تدريب على الطرف	\N	\N	\N	morning
2180	21	1	2026-02-15 11:40:03	\N	تدريب على الطرف	\N	\N	\N	morning
2181	21	1	2026-02-16 11:40:29	\N	تدريب على الطرف	\N	\N	\N	morning
4472	413	1	2026-04-19 11:56:36.762292		لغرض استلام القالب مع تسديد المبلغ كامل	\N	\N	\N	morning
2183	21	1	2026-02-18 11:41:31	\N	تدريب على الطرف	\N	\N	\N	morning
2184	21	1	2026-02-19 11:42:01	\N	تدريب على الطرف	\N	\N	\N	morning
2185	21	1	2026-02-22 11:42:25	\N	تدريب على الطرف	\N	\N	\N	morning
2186	21	1	2026-02-23 11:42:46	\N	تدريب على الطرف	\N	\N	\N	morning
2187	21	1	2026-02-25 11:43:07	\N	تدريب على الطرف	\N	\N	\N	morning
2188	21	1	2026-02-26 11:43:28	\N	تدريب على الطرف	\N	\N	\N	morning
2189	21	1	2026-03-01 11:43:53	\N	تدريب على الطرف	\N	\N	\N	morning
2190	21	1	2026-03-02 11:44:13	\N	تدريب على الطرف	\N	\N	\N	morning
2191	21	1	2026-03-04 11:44:41	\N	تدريب على الطرف	\N	\N	\N	morning
2192	21	1	2026-03-07 11:45:02	\N	تدريب على الطرف	\N	\N	\N	morning
2193	303	2	2026-03-09 11:46:28.319236	\N	تم لبس الطرف والتدريب عليه وتم الاستلام 	\N	\N	\N	morning
2194	367	1	2026-02-01 11:48:44	\N	تم مراجعه المركز لغرض صيانه القالب	\N	\N	\N	morning
2195	349	2	2026-02-21 11:53:47	\N	تسديد مبلغ 1000000	\N	\N	\N	morning
2196	650	1	2026-02-01 12:00:18	\N	تم مراجعه المركز لغرض فحص المسند test	\N	\N	\N	morning
2197	373	1	2026-02-01 12:02:57	\N	استلام مساند afo عدد 2 	\N	\N	\N	morning
2198	374	1	2026-02-02 12:04:26	\N	لغرض تعيار الطرف	\N	\N	\N	morning
2199	21	1	2026-03-09 12:05:39.398374	\N	لغرض التدريب على الطرف	\N	\N	\N	morning
2200	359	1	2026-02-03 12:10:51	\N	فحص القوالب مع التدريب والاستلام 	\N	\N	\N	morning
2201	375	1	2026-02-03 12:12:05		استلام اصبع سلكوني  تجميلي	\N	\N	\N	morning
2202	377	1	2026-02-03 12:16:35	\N	فحص ومعاينه مع بيان كلفه	\N	\N	\N	morning
916	383	1	2026-02-04 12:10:14		تم اخذ قالب جديد مع دفع مبلغ وقدره 200000 الف والباقي 400000 	\N	\N	\N	morning
926	390	1	2026-02-05 13:31:04		مراجعات لغرض التدريب واستلام  الطرف الصناعي مع دفع مبلغ قدره مليون و500000 الف دينار عراقي مع تجميل الطرف	\N	\N	\N	morning
1109	436	1	2026-02-05 08:31:14		تم زيار المركز لغرض الفحص وتحديد نوع الطرف وتم تخصيص له طرف صناعي فوق الركبه بايونيك عرض بسعر 5000000 مع اضافه روتيشن دوار بسعر مليون مع اخذ قالب ودفع مليون دينار عراقي 	\N	\N	\N	morning
2203	651	1	2026-01-22 13:25:06	\N	تم مراجعه المركز تسليم المساند للتبطين 	\N	\N	\N	evening
4419	977	3	2026-04-18 16:51:07.80833	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2205	644	3	2026-03-09 16:45:56.53748	\N	اخذت المريضة اليوم جلسة مفردة اولى اليوم بعد ان دفعت سعرها مسبقًا يوم امس من بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
2206	222	3	2026-03-09 16:48:48.97563	\N		تمارين تأهيلية	\N	\N	evening
2207	575	3	2026-03-09 16:56:39.812897	\N		أجهزة علاج طبيعي	\N	\N	evening
2208	597	3	2026-03-09 16:59:28.157636	\N		أجهزة علاج طبيعي	\N	\N	evening
2209	131	3	2026-03-09 16:59:41.167925	\N		أجهزة علاج طبيعي	\N	\N	evening
2210	265	3	2026-03-09 17:06:10.579279	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2211	626	3	2026-03-09 17:07:35.944886	\N		أجهزة علاج طبيعي	\N	\N	evening
2212	265	3	2026-03-09 17:10:11.213702	\N		أجهزة علاج طبيعي	\N	\N	evening
2213	463	3	2026-03-09 17:25:53.153719	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2214	458	3	2026-03-09 17:28:39.883365	\N		روبوت	\N	\N	evening
2215	463	3	2026-03-09 17:37:59.676307	\N		أجهزة علاج طبيعي	\N	\N	evening
2216	322	3	2026-03-09 17:38:26.402254	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2217	322	3	2026-03-09 17:38:33.240743	\N		روبوت	\N	\N	evening
2218	504	3	2026-03-09 17:42:06.690202	\N		أجهزة علاج طبيعي	\N	\N	evening
2219	74	3	2026-03-09 17:42:18.85534	\N		تمارين تأهيلية	\N	\N	evening
2220	652	3	2026-03-09 18:19:07.690146	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2221	652	3	2026-03-09 18:20:30.571304	\N		أجهزة علاج طبيعي	\N	\N	evening
2222	584	3	2026-03-09 18:25:17.028583	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2223	584	3	2026-03-09 18:25:38.553413	\N	باشر المريض بجلسة مفردة اولى بعد استشارة 	أجهزة علاج طبيعي	\N	\N	evening
2224	653	3	2026-03-09 18:29:46.651065	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2225	653	3	2026-03-09 18:30:11.952071	\N	باشر المريض بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	evening
2226	606	3	2026-03-09 18:38:43.002516	\N		أجهزة علاج طبيعي	\N	\N	evening
2227	424	3	2026-03-09 18:46:28.305001	\N		أجهزة علاج طبيعي	\N	\N	evening
2228	424	3	2026-03-09 18:47:38.642284	\N		أجهزة علاج طبيعي	\N	\N	evening
2229	531	3	2026-03-09 18:47:55.202081	\N		أجهزة علاج طبيعي	\N	\N	evening
2230	654	3	2026-03-09 18:55:13.106243	\N	اخذ المريض استشارة ويباشر في وقت اخر ممكن حيث قال انه يريد التفكير بالموضوع	استشارة طبية	\N	\N	evening
2231	599	3	2026-03-09 19:11:13.91494	\N		أجهزة علاج طبيعي	\N	\N	morning
2232	638	3	2026-03-09 19:41:57.233673	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2233	638	3	2026-03-09 19:45:29.124515	\N	اخذت المريضة استشارة اخرى عند دكتور مصطفى ودفعت بكج 6 جلسات وقررت البدء من يوم غد	استشارة طبية	\N	\N	morning
2234	545	3	2026-03-09 19:46:57.452627	\N		أجهزة علاج طبيعي	\N	\N	morning
2235	508	3	2026-03-09 20:00:18.026936	\N		أجهزة علاج طبيعي	\N	\N	morning
2236	311	3	2026-03-09 20:04:55.755528	\N		أجهزة علاج طبيعي	\N	\N	morning
2237	468	3	2026-03-09 20:14:38.443173	\N		أجهزة علاج طبيعي	\N	\N	morning
2238	507	3	2026-03-09 20:33:49.232496	\N		أجهزة علاج طبيعي	\N	\N	morning
2239	627	3	2026-03-09 20:46:34.30384	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2240	627	3	2026-03-09 20:54:53.223649	\N	باشر المريض بجلسته المفردة  الاولى بعد ان جلب ورقة موافقة من دكتور عزت المياحي إختصاص امراض القلب 	أجهزة علاج طبيعي	\N	\N	morning
2241	652	3	2026-03-09 21:20:58.649623	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2242	577	3	2026-03-10 06:04:17.039094	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
2243	629	3	2026-03-10 06:30:39.87475	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	تمارين تأهيلية	\N	\N	\N
2244	474	3	2026-03-10 06:46:57.167894	\N	الجلسة الثامنة من البكج 	تمارين تأهيلية	\N	\N	morning
2245	635	3	2026-03-10 07:33:00.524086	\N	الجلسة الثانية والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2246	149	3	2026-03-10 07:34:25.262847	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2247	320	3	2026-03-10 07:36:53.939675	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2248	495	3	2026-03-10 08:15:32.059516	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2249	40	2	2026-03-10 08:16:25.992905	\N	لبس القالب الجديد (كاربون )	\N	\N	\N	morning
2204	651	1	2026-02-10 08:22:36		لغرض استلام المساند بعد الصيانه والتبطين	\N	\N	\N	evening
2250	121	3	2026-03-10 08:27:01.281631	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
2251	655	3	2026-03-10 08:54:10.245789	\N	استشارة اولية مع الدكتور عبد الله خان ولم يباشر بارادة المريض لم يعجبه السعر 	استشارة طبية	\N	\N	morning
2252	467	3	2026-03-10 08:57:14.663852	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2253	467	3	2026-03-10 08:57:36.421902	\N	الجلسة السادسة من البكج 	روبوت	\N	\N	morning
2254	635	3	2026-03-10 09:02:45.031798	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حجز لجلسة الخميس 	أجهزة علاج طبيعي	\N	\N	\N
2255	536	3	2026-03-10 09:14:44.676267	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
2256	471	1	2026-03-10 09:29:47.9057	\N	تم تحويل مبلغ وقدره  مليون دينار عراقي 	\N	\N	\N	morning
2257	656	1	2026-03-10 09:48:46.117079	\N	فحص المسند مع دفع مبلغ وقدره 1000000 دينار عراقي	\N	\N	\N	morning
2258	480	3	2026-03-10 10:00:39.038934	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
2259	153	3	2026-03-10 10:22:37.216272	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2260	335	3	2026-03-10 10:35:57.582811	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2261	49	1	2026-03-10 10:57:21.336039		صيانه قالب تحت الركبه مع دفع مبلغ وقدره 250000 الف دينار عراقي	\N	\N	\N	morning
2262	249	3	2026-03-10 11:07:29.229575	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2263	303	2	2026-03-10 11:59:00.240988	\N	تدريب على الطرف	\N	\N	\N	morning
2264	48	1	2026-01-22 12:53:37	\N	استلام المسند مع دفع المبلغ كامل 	\N	\N	\N	morning
2265	657	1	2026-01-10 13:32:18	\N	تم مراجعه المركض لغرض شراء سليكون هيما حلقي ايطالي 	\N	\N	\N	evening
2266	657	1	2026-02-17 13:32:58	\N	تم تحويل مبلغ وقدره 100000 الف دينار عراقي 	\N	\N	\N	evening
2267	657	1	2026-03-10 13:33:26.361472	\N	تم تحويل مبلغ 100000 الف دينار عراقي 	\N	\N	\N	evening
2268	47	1	2026-03-10 13:50:35.302917	\N	صيانه شتل لوك مجاني	\N	\N	\N	evening
2269	378	1	2026-03-10 13:51:26.697971	\N	تم صيانه الطرف واستلامه	\N	\N	\N	evening
2270	276	4	2026-03-10 14:25:38.525982	\N	تدريب على الطرف	\N	\N	\N	evening
2271	658	4	2026-03-10 14:35:14.197248	\N	تعيار الطرف	\N	\N	\N	evening
2272	177	3	2026-03-10 16:45:30.944296	\N	جلسة مجانية 	أجهزة علاج طبيعي	\N	\N	evening
2273	575	3	2026-03-10 16:45:44.525671	\N		أجهزة علاج طبيعي	\N	\N	evening
2274	597	3	2026-03-10 16:54:14.196084	\N		أجهزة علاج طبيعي	\N	\N	evening
2275	222	3	2026-03-10 17:02:12.170106	\N		تمارين تأهيلية	\N	\N	evening
2276	626	3	2026-03-10 17:07:41.489533	\N		أجهزة علاج طبيعي	\N	\N	evening
2277	531	3	2026-03-10 17:29:16.053125	\N		أجهزة علاج طبيعي	\N	\N	evening
2278	322	3	2026-03-10 17:33:04.742838	\N		تمارين تأهيلية	\N	\N	evening
2279	567	3	2026-03-10 17:33:26.736306	\N		أجهزة علاج طبيعي	\N	\N	evening
2280	458	3	2026-03-10 17:36:22.204579	\N		روبوت	\N	\N	evening
2281	659	3	2026-03-10 17:47:07.019158	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2282	659	3	2026-03-10 17:48:05.445778	\N	باشرت المريضة بعد الاستشارة مباشرة ببكج من 8 جلسات 	أجهزة علاج طبيعي	\N	\N	evening
2283	453	3	2026-03-10 17:56:52.642924	\N		أجهزة علاج طبيعي	\N	\N	evening
2284	424	3	2026-03-10 17:59:25.951394	\N		أجهزة علاج طبيعي	\N	\N	evening
2285	660	3	2026-03-10 18:19:16.272251	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2286	660	3	2026-03-10 18:19:39.139452	\N	باشر المريض بعد الاستشارة مباشرة بجلسة مفردة اولى	أجهزة علاج طبيعي	\N	\N	evening
2287	518	3	2026-03-10 18:42:28.828978	\N		تمارين تأهيلية	\N	\N	evening
4420	1045	3	2026-04-18 17:21:46.752381	\N	يباشر يوم غد	استشارة طبية	\N	\N	evening
2289	608	3	2026-03-10 18:45:57.099196	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2290	608	3	2026-03-10 18:46:07.366973	\N		أجهزة علاج طبيعي	\N	\N	evening
2291	652	3	2026-03-10 18:55:58.514648	\N		أجهزة علاج طبيعي	\N	\N	evening
2292	394	3	2026-03-10 19:46:59.134908	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2293	394	3	2026-03-10 19:47:03.489575	\N		أجهزة علاج طبيعي	\N	\N	morning
2294	311	3	2026-03-10 20:09:40.017329	\N		أجهزة علاج طبيعي	\N	\N	morning
2295	394	3	2026-03-10 21:13:37.525407	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2296	394	3	2026-03-10 21:13:41.7845	\N		أبر صينية	\N	\N	morning
2297	646	3	2026-03-11 05:59:06.53007	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2298	661	3	2026-03-11 06:33:09.917056	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2346	668	3	2026-03-11 20:01:39.897553	\N	باشر المريض بعد الاستشارة وهو مجاني بأمر من دكتور ياسر 	أجهزة علاج طبيعي	\N	\N	morning
2299	662	3	2026-03-11 06:48:36.322419	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض باول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2300	663	3	2026-03-11 07:43:49.67588	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2301	79	3	2026-03-11 07:44:27.674879	\N	الجلسة الرابعة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2302	664	3	2026-03-11 07:54:58.866534	\N	استشارة اولية ولم يباشر بسبب المواعيد سيتم تحديد موعد مناسب له والمباشرة على اساسه 	استشارة طبية	\N	\N	morning
2303	228	3	2026-03-11 08:12:44.639568	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2304	228	3	2026-03-11 08:12:44.697198	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2305	499	3	2026-03-11 08:13:16.031258	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2306	298	3	2026-03-11 08:23:35.110562	\N	الجلسة السابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2307	665	3	2026-03-11 08:43:00.548158	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2308	662	3	2026-03-11 08:43:46.015405	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حجز للجلسه القادمه المقرره السبت الساعه 10 الصبح 	أجهزة علاج طبيعي	\N	\N	\N
2309	467	3	2026-03-11 08:51:58.033438	\N	الجلسة السادسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2310	467	3	2026-03-11 08:52:18.146104	\N	الجلسة السابعة والاخيرة من البكج	روبوت	\N	\N	morning
2311	639	3	2026-03-11 08:58:21.420515	\N	باشر المريض اليوم اول جلسات العلاج الطبيعي مجانا	تمارين تأهيلية	\N	\N	morning
2312	666	3	2026-03-11 09:04:56.394472	\N	استشارة اولية ولم ترغب المراجعه بالمباشرة 	استشارة طبية	\N	\N	morning
2313	552	2	2026-03-07 09:40:20	\N	تم اخذ قالب / مع تسديد المتبقي 	\N	\N	\N	morning
2314	640	3	2026-03-11 10:15:25.307106	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
2315	537	2	2026-03-11 10:47:05.209261	\N	تدريب على الطرف 	\N	\N	\N	morning
2316	515	3	2026-03-11 11:14:16.632548	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	تمارين تأهيلية	\N	\N	\N
2317	15	1	2026-03-11 12:09:47.46582	\N	تم مراجعه المركز لغرض التدريب مع استلام الطرف نهائي	\N	\N	\N	morning
46	46	1	2026-01-17 17:24:41.23258	 مراجعة المركز وتحديد طرف نوع هيدروليكي هوائي بايونك (عرض) بسعر 5 ملايين وتم اخذ قالب له 		\N	\N	\N	\N
2318	667	4	2026-03-11 12:15:42.415984	\N	استعلام	\N	\N	\N	morning
2319	46	1	2026-03-11 12:33:30.031995	\N	تدريب على الطرف	\N	\N	\N	morning
2320	404	1	2026-03-11 12:34:14.182073	\N	لغرض تعيار الطرف	\N	\N	\N	morning
2321	552	2	2026-03-11 12:45:41.569532	\N	تم لبس الطرف والتدريب عليه وتم الاستلام 	\N	\N	\N	morning
2322	276	4	2026-03-11 13:01:00.548382	\N	تدريب على الطرف مع استلام الطرف	\N	\N	\N	evening
2323	131	3	2026-03-11 16:49:36.381885	\N		أجهزة علاج طبيعي	\N	\N	evening
2324	458	3	2026-03-11 16:49:52.524132	\N		روبوت	\N	\N	evening
2325	660	3	2026-03-11 17:07:22.898088	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2326	660	3	2026-03-11 17:07:30.877625	\N		أجهزة علاج طبيعي	\N	\N	evening
2327	644	3	2026-03-11 17:07:52.260398	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2328	644	3	2026-03-11 17:08:00.949492	\N		أجهزة علاج طبيعي	\N	\N	evening
2329	505	3	2026-03-11 17:20:53.427883	\N	جلسة مجانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
2330	322	3	2026-03-11 17:25:57.559946	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2331	322	3	2026-03-11 17:28:44.19188	\N		روبوت	\N	\N	evening
2332	265	3	2026-03-11 17:29:55.846656	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2333	265	3	2026-03-11 17:29:59.16732	\N		أجهزة علاج طبيعي	\N	\N	evening
2334	567	3	2026-03-11 17:31:33.63829	\N		أجهزة علاج طبيعي	\N	\N	evening
2335	504	3	2026-03-11 17:33:13.164591	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
2336	652	3	2026-03-11 17:38:55.507231	\N		أجهزة علاج طبيعي	\N	\N	evening
2337	669	3	2026-03-11 18:24:38.990616	\N	المريضة اخذت استشارة وتباشر في وقت لاحق كونها تريد التفكير قبل البدأ	استشارة طبية	\N	\N	evening
2338	424	3	2026-03-11 18:24:52.093759	\N		أجهزة علاج طبيعي	\N	\N	evening
4473	742	1	2026-04-19 12:10:11.063623	\N	تدريب على الاطراف 	\N	\N	\N	morning
2340	188	3	2026-03-11 18:29:56.217204	\N		أجهزة علاج طبيعي	\N	\N	evening
2341	670	3	2026-03-11 18:43:45.90792	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2342	670	3	2026-03-11 18:46:12.151325	\N	باشرت المريضة بعد الاستشارة حيث تم تحويلها من قبل دكتور حيدر حازم 	أجهزة علاج طبيعي	\N	\N	evening
2343	545	3	2026-03-11 19:08:29.041728	\N		أجهزة علاج طبيعي	\N	\N	morning
2344	671	3	2026-03-11 19:52:38.223586	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2345	671	3	2026-03-11 19:56:32.245832	\N		أجهزة علاج طبيعي	\N	\N	morning
2347	468	3	2026-03-11 20:16:16.644458	\N		أجهزة علاج طبيعي	\N	\N	morning
2348	509	3	2026-03-12 06:03:24.611876	\N	الجلسة الرابعة مجانية	تمارين تأهيلية	\N	\N	morning
2349	635	3	2026-03-12 06:24:55.388712	\N	جلسة مفردة محجوزة مسبقا 	أجهزة علاج طبيعي	\N	\N	morning
2350	474	3	2026-03-12 06:43:44.762703	\N	الجلسة التاسعة من البكج	تمارين تأهيلية	\N	\N	morning
2351	629	3	2026-03-12 07:43:09.192275	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2352	646	3	2026-03-12 07:43:41.195573	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2353	121	3	2026-03-12 08:32:55.672591	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
2354	635	3	2026-03-12 08:37:00.619805	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حجز جلسة ليوم السبت الساعة 10 صباحا	أجهزة علاج طبيعي	\N	\N	\N
2355	672	3	2026-03-12 08:56:00.971159	\N	زارنا المريض بعد تحويله من قبل قائد شرطة ذي قار كون المريض منتسب في وزارة الداخلية وضمان تكفل بعلاجه حيث تم اخذ استشارة طبية تحت اشراف المعالج المختص عبد الله خان كون المريض يعاني من جلطة دماغية ادت الى شلل نصفي في الجهة اليسرى منذ سنتين 	استشارة طبية	\N	\N	morning
2356	536	3	2026-03-12 09:23:08.335636	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
2357	467	3	2026-03-12 09:26:04.384277	\N	الجلسة السابعة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2358	672	3	2026-03-12 09:31:22.763647	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي بعد الاستشارة مباشرة	تمارين تأهيلية	\N	\N	\N
2359	673	3	2026-03-12 09:43:04.07176	\N	جلسة علاج لمريض راقد على طبيب اخصائي االجملة العصبية علي عواد فقد تم اجراء عملية فقرات للرقبه للمريض	تمارين تأهيلية	\N	\N	morning
2360	344	3	2026-03-12 10:42:57.105212	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - حضرت المريضه للاستشارة عند اخصائي العلاج الطبيعي عبد الله خان بخصوص تشنج باليد وباشرت باول جلسات العلاج الطبيعي بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2361	335	3	2026-03-12 10:46:05.419535	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2362	405	1	2026-03-12 11:23:54.189234	\N	تم زياره المركز لغرض استلام السيلكون من المركز 	\N	\N	\N	morning
886	344	3	2026-02-17 11:37:58		خدمة جديدة: جلسات علاج إضافية - جددت المريضة بكج من 6 جلسات بعد جلستها المفردة يوم امس (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2363	659	3	2026-03-12 16:44:49.116763	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
2364	660	3	2026-03-12 16:54:05.335461	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	evening
4423	1044	3	2026-04-18 17:29:34.714228	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2366	463	3	2026-03-12 16:57:51.683051	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
2367	311	3	2026-03-12 17:07:26.769733	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
2368	597	3	2026-03-12 17:08:07.930778	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
2369	674	3	2026-03-12 17:11:58.373517	\N	تم زيارة المريضة لمركزنا بعد التعرف عليه من التواصل الاجتماعي الفيس بوك حيث تعاني المريضة من جلطة دماغية منذ 5 سنوات ادى ذلك الى شلل كلي تم عرضها اليوم على الطبيب المعالج المختص عبد الله خان لغرض الفحص والمعاينة 	استشارة طبية	\N	\N	evening
2370	674	3	2026-03-12 17:35:17.434096	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
2371	608	3	2026-03-12 17:49:32.523783	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
2372	322	3	2026-03-12 17:54:17.061542	\N		تمارين تأهيلية	\N	\N	evening
2373	458	3	2026-03-12 17:54:47.535657	\N		روبوت	\N	\N	evening
2374	424	3	2026-03-12 17:59:15.388412	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
2375	531	3	2026-03-12 18:04:47.304111	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
2376	606	3	2026-03-12 18:14:46.211435	\N		أجهزة علاج طبيعي	\N	\N	evening
2377	675	3	2026-03-12 19:11:11.458812	\N	زارتنا المريضة بعد التعرف على مركزنا من خلال التواصل الاجتماعي الانستا غرام تعاني من انزلاق غضروفي نتيجة سقوط على الارض وتعرضها الى ضربة قوية في نفس المكان الان اخذت استشارة طبية اولية تحت اشراف الطبيب المعالج عبد الله خان وبعدها باشرت المريضة باخذ اول جلسة لها بنظام المفرد.	أجهزة علاج طبيعي	\N	\N	morning
2378	675	3	2026-03-12 19:11:43.476772	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة فردية	أجهزة علاج طبيعي	\N	\N	\N
2379	31	3	2026-03-12 19:17:29.803056	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2380	307	3	2026-03-12 19:21:28.471293	\N	الجلسة الثالثة من بكج اربع جلسات	أجهزة علاج طبيعي	\N	\N	morning
2381	668	3	2026-03-12 19:31:15.374797	\N	الجلسة الثانية مجانية مريض من طرف دكتور اكرم	أجهزة علاج طبيعي	\N	\N	morning
2382	508	3	2026-03-12 20:27:32.777976	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2383	346	3	2026-03-14 05:30:03.404717	\N	الجلسة الثانية والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2426	659	3	2026-03-14 18:44:50.073463	\N		أجهزة علاج طبيعي	\N	\N	evening
2384	395	3	2026-03-14 05:30:19.911845	\N	الجلسة الثانية والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2385	646	3	2026-03-14 05:52:47.347086	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2386	64	3	2026-03-14 05:53:15.370715	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2387	676	3	2026-03-14 06:03:42.221333	\N	تمت الاستشارة الأولية مع أخصائي العلاج الطبيعي عبد الله خان. وبعد إجراء التقييم الأولي، تقرر تحويل المريض لإجراء فحص الرنين المغناطيسي لاستكمال التشخيص.\nونظراً لكون جهاز الرنين المغناطيسي في المستشفى حالياً تحت الصيانة، سيتم إجراء الفحص في مركز خارجي، على أن يعود المريض بعد إتمام الفحص لمراجعة أخصائي العلاج الطبيعي واستكمال المعاينة ووضع الخطة العلاجية المناسبة بشكل دقيق.	استشارة طبية	\N	\N	morning
2388	661	3	2026-03-14 06:21:44.279453	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2389	663	3	2026-03-14 08:00:59.702846	\N	الجلسة الثانية والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2390	298	3	2026-03-14 08:07:15.154059	\N	الجلسة الثامنة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2391	495	3	2026-03-14 08:09:18.524571	\N	الجلسة الخامسة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2392	677	1	2026-03-14 08:25:01.335249	\N	تم فحص ومعاينه المريض وتم تخصيص مساند kafo ليلي عدد 2 	\N	\N	\N	morning
2393	435	3	2026-03-14 08:33:25.423586	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2394	639	3	2026-03-14 08:36:25.187866	\N	الجلسة الثانية مجانا	تمارين تأهيلية	\N	\N	morning
2395	678	1	2026-03-12 08:43:25	\N	تم فحص ومعاينه المريض مع اخذ قالب 	\N	\N	\N	morning
2396	678	1	2026-03-14 08:44:11.353915	\N	تم تحويل مبلغ وقدره مليون و455000 الف دينار عراقي 	\N	\N	\N	morning
4421	1040	3	2026-04-18 17:22:18.116299	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2398	467	3	2026-03-14 08:56:08.006576	خدمة جديدة	جلسات علاج إضافية - روبوت (6 جلسة) (تكلفة: 300,000 د.ع)	روبوت	\N	\N	\N
2399	467	3	2026-03-14 08:56:08.050293	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2400	536	3	2026-03-14 09:04:52.149157	\N	الجلسة الرابعة من البكج 	تمارين تأهيلية	\N	\N	morning
2401	673	3	2026-03-14 09:20:44.872886	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2402	680	1	2026-03-14 09:43:08.69023	\N	تم تحويل مبلغ مالي قدره 300000 الف دينار عراقي 	\N	\N	\N	morning
2404	682	1	2026-03-14 10:02:03.975217	\N	تم تحويل مبلغ وقدره 110000 الف دينار عراقي	\N	\N	\N	morning
2405	515	3	2026-03-14 10:05:55.747226	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2406	640	3	2026-03-14 10:12:51.072568	\N	الجلسة الثالثة والاخيرة من البكج 	تمارين تأهيلية	\N	\N	morning
2407	344	3	2026-03-14 10:14:51.197384	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2403	681	1	2026-03-14 09:55:57.576933		تم تحويل مبلغ مالي قدره 107 الف دينار عراقي 	\N	\N	\N	morning
2408	335	3	2026-03-14 10:32:23.264458	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2409	545	3	2026-03-14 10:40:21.143307	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حضرت المراجعه بدأت المراجعة ابتداءً من جلسة اليوم مع أخصائي العلاج الطبيعي الدكتور عبد الله خان، حيث كانت المريضة تتلقى التمارين العلاجية سابقاً معه عندما كان يقوم بالإنابة عن اخصائي العلاج الطبيعي مصطفى.\n\nوبناءً على ذلك، تم تحويل المتابعة إليه بشكل رسمي لاستكمال البرنامج العلاجي والتمارين التأهيلية بصورة منتظمة وتحت إشرافه المباشر.	أجهزة علاج طبيعي	\N	\N	\N
2410	21	1	2026-03-14 11:48:13.347901	\N	تدريب على الطرف	\N	\N	\N	morning
2411	600	1	2026-03-14 12:03:58.891879	\N	لغرض تجميل الطرف	\N	\N	\N	morning
2412	621	2	2026-03-14 12:34:06.49475	\N	تدريب على الطرف 	\N	\N	\N	morning
2413	683	2	2026-03-14 12:42:52.881275	\N	اظافة سوفت للقالب 	\N	\N	\N	morning
2414	684	4	2026-03-14 13:51:38.870749	\N	تعيار الطرف	\N	\N	\N	evening
2415	685	3	2026-03-14 17:39:15.048221	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2416	685	3	2026-03-14 17:39:37.353393	\N	باشر المريض بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	evening
2417	463	3	2026-03-14 17:41:53.033432	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4424	1044	3	2026-04-18 17:29:39.692279	\N		روبوت	\N	\N	evening
2419	644	3	2026-03-14 17:42:35.80588	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2420	644	3	2026-03-14 17:42:40.166002	\N		أجهزة علاج طبيعي	\N	\N	evening
2421	686	3	2026-03-14 17:49:03.357918	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2422	686	3	2026-03-14 17:49:45.037087	\N	باشرت المريضة بجلسة ابر صينية بعد الاستشارة حيث تم تحويلها من قبل دكتور حسن ناجي	أبر صينية	\N	\N	evening
2423	597	3	2026-03-14 18:39:37.015067	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2424	597	3	2026-03-14 18:39:42.043705	\N		أجهزة علاج طبيعي	\N	\N	evening
2425	425	3	2026-03-14 18:43:43.955568	\N		أجهزة علاج طبيعي	\N	\N	evening
2429	675	3	2026-03-14 18:47:44.836169	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2430	322	3	2026-03-14 18:50:20.331148	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2431	463	3	2026-03-14 19:26:43.015906	\N		أجهزة علاج طبيعي	\N	\N	morning
2432	675	3	2026-03-14 19:28:09.697262	\N		أجهزة علاج طبيعي	\N	\N	morning
2433	322	3	2026-03-14 19:29:10.556535	\N		روبوت	\N	\N	morning
2434	488	3	2026-03-14 19:33:43.57891	\N		أجهزة علاج طبيعي	\N	\N	morning
2435	608	3	2026-03-14 19:34:53.183319	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2437	608	3	2026-03-14 19:35:02.197178	\N		أجهزة علاج طبيعي	\N	\N	morning
2438	687	3	2026-03-14 19:39:39.565161	\N	اخذت المريضة استشارة وتباشر يوم غد حيث تم تحويلها من قبل دكتور حيدر حازم واوصى ان تكون جلسلاتها يومين في الاسبوع	استشارة طبية	\N	\N	morning
2439	518	3	2026-03-14 19:39:53.120928	\N		تمارين تأهيلية	\N	\N	morning
2440	424	3	2026-03-14 19:41:28.18767	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
2436	608	3	2026-03-14 19:34:57.925688	الزيارة كانت ب 12 بالشهر		أجهزة علاج طبيعي	\N	\N	morning
2418	463	3	2026-03-14 17:41:57.190352	الزيارة كانت ب 12 بالشهر 		أجهزة علاج طبيعي	\N	\N	evening
2441	380	3	2026-03-14 19:45:50.625947	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2442	380	3	2026-03-14 19:45:54.56431	\N		أبر صينية	\N	\N	morning
2443	625	3	2026-03-14 19:46:17.667174	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2444	625	3	2026-03-14 19:46:21.293212	\N		أجهزة علاج طبيعي	\N	\N	morning
2445	691	3	2026-03-14 19:47:22.04121	\N	المريضة اجلست استشارتها ليوم غد كونها تريد جلب فحوصاتها معها	استشارة طبية	\N	\N	morning
2446	690	3	2026-03-14 20:04:58.277717	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2447	690	3	2026-03-14 20:05:50.480951	\N	باشرت المريضة بعد الاستشارة حيث تم تحويلها من قبل دكتور حيدر حازم واوصى ان تكون جلساتها مرتين في الاسبوع	أجهزة علاج طبيعي	\N	\N	morning
2448	688	3	2026-03-14 20:10:03.18823	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2449	688	3	2026-03-14 20:10:39.958023	\N	باشر المريض بعد الاستشارة  	أجهزة علاج طبيعي	\N	\N	morning
2450	688	3	2026-03-14 20:10:52.826259	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2451	508	3	2026-03-14 20:15:35.922048	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
2452	507	3	2026-03-14 20:18:27.141059	\N		أجهزة علاج طبيعي	\N	\N	morning
2453	311	3	2026-03-14 20:30:22.982607	\N		أجهزة علاج طبيعي	\N	\N	morning
2454	692	3	2026-03-14 20:32:41.916371	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2455	692	3	2026-03-14 20:33:09.642902	\N	باشرت المريضة بعد الاستشارة ببكج من 6 جلسات	أجهزة علاج طبيعي	\N	\N	morning
2456	689	3	2026-03-14 20:37:22.412097	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2457	689	3	2026-03-14 20:38:06.656732	\N	باشرت المريضة بعد الاستشارة ببكج من 4 جلسات	أجهزة علاج طبيعي	\N	\N	morning
2458	599	3	2026-03-14 20:43:35.21348	\N		أجهزة علاج طبيعي	\N	\N	morning
2459	394	3	2026-03-14 20:44:18.934851	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2460	394	3	2026-03-14 20:44:24.30807	\N		أجهزة علاج طبيعي	\N	\N	morning
2461	307	3	2026-03-14 20:45:38.253347	\N		أجهزة علاج طبيعي	\N	\N	morning
2462	627	3	2026-03-14 20:48:30.260216	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2463	627	3	2026-03-14 20:48:33.427998	\N		أجهزة علاج طبيعي	\N	\N	morning
2464	358	3	2026-03-14 21:17:13.805028	\N		أجهزة علاج طبيعي	\N	\N	morning
2465	577	3	2026-03-15 06:00:37.413103	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2466	474	3	2026-03-15 07:09:02.524976	\N	الجلسة العاشرة من البكج	تمارين تأهيلية	\N	\N	morning
2467	635	3	2026-03-15 07:20:00.124492	\N	جلسة محجوزة مسبقا	أجهزة علاج طبيعي	\N	\N	morning
2468	693	3	2026-03-15 07:57:51.547804	\N	تم مراجعة المريض اليوم الى مركزنا بعد التعرف علينا من خلال التواصل الاجتماعي الفيس بوك حيث اجراء المريض عملية دوالي في الشهر الثاني وبعد فترة عانى المريض من تشنجات عضلية في الحوض تسببت له ب سلس بولي تم اخذ الاستشارة اليوم من قبل المعالج المختص عبد الله خان وباشر بعدها باول جلسة	أجهزة علاج طبيعي	\N	\N	morning
2469	693	3	2026-03-15 07:58:15.085987	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
2470	589	3	2026-03-15 07:58:51.163588	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	تمارين تأهيلية	\N	\N	\N
2471	121	3	2026-03-15 08:03:06.214734	\N	الجلسة الرابعة من البكج	تمارين تأهيلية	\N	\N	morning
4422	1040	3	2026-04-18 17:22:41.632391	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
2473	467	3	2026-03-15 08:53:25.62687	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
2474	467	3	2026-03-15 08:53:46.324156	\N	الجلسة الاولى من البكج	روبوت	\N	\N	morning
1343	467	3	2026-02-23 09:29:07.953682	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2475	467	3	2026-02-23 09:34:56		جلسة روبوت 	روبوت	\N	\N	morning
2476	467	3	2026-02-24 09:37:26		الجلسة الاولى من بكج الروبوت	روبوت	\N	\N	morning
2477	467	3	2026-03-04 09:39:24	\N	الجلسة الاولى للروبوت	روبوت	\N	\N	morning
2478	467	3	2026-02-23 09:44:54	\N	جلسة علاج طبيعي 	أجهزة علاج طبيعي	\N	\N	morning
1422	467	3	2026-02-24 09:34:44.834057	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (7 جلسة) (تكلفة: 175,000 د.ع) - بكج لمدة سبعة جلسات 	تمارين تأهيلية	\N	\N	\N
2479	467	3	2026-02-24 09:47:37		الجلسة الاولى من بكج العلاج الطبيعي 	تمارين تأهيلية	\N	\N	morning
1580	467	3	2026-02-26 08:58:32.49379		الجلسة الثالثة من البكج 	تمارين تأهيلية	\N	\N	morning
1655	467	3	2026-02-28 09:03:21.665241		الجلسة الرابعة من البكج 	تمارين تأهيلية	\N	\N	morning
1726	467	3	2026-03-01 08:58:46.079965		الجلسة الخامسة من البكج	تمارين تأهيلية	\N	\N	morning
1858	467	3	2026-03-03 09:19:46.353337		الجلسة السابعة والاخيرة من البكج 	تمارين تأهيلية	\N	\N	morning
2506	311	3	2026-03-15 20:05:55.391527	\N		أجهزة علاج طبيعي	\N	\N	morning
2472	638	3	2026-03-15 08:06:22.384089		الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2339	638	3	2026-03-11 18:25:09.063056		الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
2288	638	3	2026-03-10 18:42:58.543346		الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	evening
2480	694	1	2026-03-15 09:55:16.852638		تم شراء قالب كاربوني تحت الركبه درجة اولى / مع اخذ قالب(عناد)	\N	\N	\N	morning
2481	153	3	2026-03-15 10:19:23.903685	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (4 جلسة) (تكلفة: 100,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2482	537	2	2026-03-15 11:24:03.353002	\N	تدريب على الطرف	\N	\N	\N	morning
2483	676	3	2026-03-15 11:30:30.043445	\N	استشارة ثانية بعد جلب الرنين المطلوب من الدكتور وسيباشر بعد تحديد موعد خاص بي 	استشارة طبية	\N	\N	morning
2484	695	2	2026-03-15 11:32:02.447352	\N	اظافة سوفت للقالب +تطويل للطرف	\N	\N	\N	morning
2486	697	3	2026-03-15 11:52:35.113047	\N	استشارة اولية وستباشر المريضه حسب الموعد المخصص اله	استشارة طبية	\N	\N	morning
2485	696	1	2026-03-12 12:06:34		تم مراجعه المركز لغرض شراء سيليكون بقيمه 350000 الف دينار عراقي 	\N	\N	\N	morning
2487	514	4	2026-03-15 14:36:46.566612	\N	تدريب على الطرف	\N	\N	\N	evening
2488	177	3	2026-03-15 16:43:46.305081	\N	جلسة مجانية	أجهزة علاج طبيعي	\N	\N	evening
2489	425	3	2026-03-15 16:44:21.164585	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
2490	688	3	2026-03-15 16:49:39.540529	\N		أجهزة علاج طبيعي	\N	\N	evening
2491	672	3	2026-03-15 17:22:28.559562	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2492	672	3	2026-03-15 17:22:32.617467	\N		تمارين تأهيلية	\N	\N	evening
2493	458	3	2026-03-15 17:24:18.342269	\N		روبوت	\N	\N	evening
2494	222	3	2026-03-15 17:33:22.112434	\N		تمارين تأهيلية	\N	\N	evening
2495	322	3	2026-03-15 17:41:47.156386	\N		تمارين تأهيلية	\N	\N	evening
2496	673	3	2026-03-15 17:55:13.944562	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2497	692	3	2026-03-15 17:58:02.789138	\N		أجهزة علاج طبيعي	\N	\N	evening
2498	673	3	2026-03-15 18:00:01.162359	\N		تمارين تأهيلية	\N	\N	evening
2499	698	3	2026-03-15 18:36:41.568518	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2500	698	3	2026-03-15 18:44:12.784141	\N	باشر المريض بعد الاستشارة مباشرة حيث ان زوجته من مراجعين المركز المستمرين 	أجهزة علاج طبيعي	\N	\N	evening
2501	265	3	2026-03-15 18:44:37.173279	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2502	265	3	2026-03-15 18:44:44.952994	\N		أجهزة علاج طبيعي	\N	\N	evening
2503	625	3	2026-03-15 19:02:53.838561	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2504	625	3	2026-03-15 19:02:58.506295	\N		أجهزة علاج طبيعي	\N	\N	morning
2505	31	3	2026-03-15 19:22:39.452534	\N		أجهزة علاج طبيعي	\N	\N	morning
2507	699	3	2026-03-15 20:50:37.870075	\N	اخذ المريض استشارة ويباشر بعد اخذ استشارة من طبيب اختصاص جملة عصبية 	استشارة طبية	\N	\N	morning
2508	700	3	2026-03-16 06:01:56.952838	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشرت المريضة بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2509	646	3	2026-03-16 06:04:28.146446	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2510	701	3	2026-03-16 07:34:52.100509	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج الطبيعي عبد الله بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2511	702	3	2026-03-16 07:44:23.667078	\N	جلسة اولية مع اخصائي العلاج الطبيعي عبد الله خان ولم تباشر برغبة المريضه 	استشارة طبية	\N	\N	morning
4425	1044	3	2026-04-18 17:34:06.429353	\N	المريضة من المشتركين القدماء للمركز وتوقفت فترة عن العلاج وعادت الان لإكمال جلسات الروبوت	استشارة طبية	\N	\N	evening
4452	1028	3	2026-04-19 06:09:54.055964	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4503	222	3	2026-04-19 16:39:39.130395	\N		تمارين تأهيلية	\N	\N	evening
2512	298	3	2026-03-16 08:15:21.211228	\N	الجلسة التاسعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2531	677	1	2026-03-16 13:15:12.170751		تم مراجعه المركز لغرض  استلام مساند كيفو عدد 2 ليلي 	\N	\N	\N	evening
2513	694	1	2026-03-16 08:19:24.349107	\N	تم تحويل مبلغ مالي قدره 500000 الف دينار عراقي	\N	\N	\N	morning
164	123	3	2026-01-26 10:59:57.604657	المريض راجعنا بتاريخ12 \\1 لغرض اخذ استشارة من قبل المعالج عبد الله خان حيث كان يعاني من جلطة دماغية وبعدها باشر المريض واليوم اكمل الجلسة السابعة معنا حيث دفع بكج لمدة 10 ايام على 25 الف (250) الف\n		\N	\N	\N	\N
283	123	3	2026-01-31 09:08:32.76847	الجلسة التاسعة من البكج		\N	\N	\N	\N
29	32	3	2026-01-15 13:47:56.559159	المريض تمت مراجعته الى مركزنا بتاريخ اليوم بعد ان تمت توصيته بمراجعتنا من قبل الاصدقاء حيث تم تعرضه الى جهد و الم مفاجئ  وعليه باشر معنا بتاريخ اليوم بالجلسة الاولى 		\N	\N	\N	\N
2514	703	3	2026-03-16 08:42:41.126397	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) (تكلفة: 250,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج الطبيعي عبد الله بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2515	467	3	2026-03-16 08:45:11.794243	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2516	467	3	2026-03-16 08:45:17.928947	\N	الجلسة الثالثة من البكج 	روبوت	\N	\N	morning
208	139	3	2026-01-27 18:04:12.790705	الجلسة الاخيرة للمريض من البكج حيث انه جدد يوم امس جلستين اخريات		\N	\N	\N	\N
240	139	3	2026-01-28 18:29:40.244274	جلسة مفردة مدفوعة سابقًا للمريض		\N	\N	\N	\N
309	139	3	2026-01-31 19:18:59.542399	جلسة اخيرة		\N	\N	\N	\N
2532	582	1	2026-03-16 14:00:57.98463	\N	لغرض استلام مسندrgo وتسديد المبلغ كامل	\N	\N	\N	evening
2533	463	3	2026-03-16 16:52:52.475547	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
175	136	3	2026-01-26 15:53:26.331246	باشرت المريضة هي واختها نسرين اليوم باول جلساتها بعد استشارة دكتور مصطفى 		\N	\N	\N	\N
383	136	3	2026-02-03 17:33:56.7962	\N	خدمة جديدة: جلسات علاج إضافية - الجلسة المفردة الثانية للمريضة (تكلفة: 25,000 د.ع)	\N	\N	\N	\N
2517	40	2	2026-03-16 09:01:08.540178	\N	تعييار للطرف +تطويل حافة القالب 	\N	\N	\N	morning
2518	639	3	2026-03-16 09:17:36.227972	\N	الجلسة الثالثة مجانا	تمارين تأهيلية	\N	\N	morning
2519	703	3	2026-03-16 09:32:19.777686	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
4426	322	3	2026-04-18 17:36:31.485009	\N		أجهزة علاج طبيعي	\N	\N	evening
2521	678	1	2026-03-16 09:55:12.573369	\N	لغرض فحص القالب testمع اعاده اخذ القالب 	\N	\N	\N	morning
2522	686	3	2026-03-16 10:01:07.387812	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2523	706	2	2026-03-16 10:10:04.562393	\N	لديه كتاب بيان كلفة وتم تحديد له نوع طرف بقيمة 5000000 د بسب قصر البتر 	\N	\N	\N	morning
2524	705	3	2026-03-16 10:12:26.41235	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2525	545	3	2026-03-16 10:24:59.338448	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2526	515	3	2026-03-16 10:26:28.325266	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2527	686	3	2026-03-16 10:30:02.399583	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2528	673	3	2026-03-16 10:51:01.880613	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - مريض راقد بالطابق الخامس 	تمارين تأهيلية	\N	\N	\N
2529	335	3	2026-03-16 11:06:58.157475	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2530	707	4	2026-03-16 13:05:48.197839	\N	استعلام	\N	\N	\N	evening
2534	463	3	2026-03-16 16:52:57.756669	\N		أجهزة علاج طبيعي	\N	\N	evening
2535	644	3	2026-03-16 16:54:02.988249	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2536	644	3	2026-03-16 16:54:06.487249	\N		أجهزة علاج طبيعي	\N	\N	evening
2537	659	3	2026-03-16 16:54:17.2207	\N		أجهزة علاج طبيعي	\N	\N	evening
2538	131	3	2026-03-16 16:57:41.732862	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
2539	597	3	2026-03-16 17:11:00.083413	\N		أجهزة علاج طبيعي	\N	\N	evening
2540	660	3	2026-03-16 17:19:37.053616	\N		أجهزة علاج طبيعي	\N	\N	evening
2541	689	3	2026-03-16 17:31:27.819514	\N		أجهزة علاج طبيعي	\N	\N	evening
2542	222	3	2026-03-16 17:35:27.083994	\N		تمارين تأهيلية	\N	\N	evening
2543	322	3	2026-03-16 17:38:30.413996	\N		تمارين تأهيلية	\N	\N	evening
2544	692	3	2026-03-16 17:45:21.722559	\N		أجهزة علاج طبيعي	\N	\N	evening
2545	675	3	2026-03-16 17:56:11.899523	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2546	675	3	2026-03-16 17:56:15.69409	\N		أجهزة علاج طبيعي	\N	\N	evening
2547	608	3	2026-03-16 17:56:32.123062	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2548	608	3	2026-03-16 17:56:40.359822	\N		أجهزة علاج طبيعي	\N	\N	evening
2549	424	3	2026-03-16 18:05:22.985464	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2550	424	3	2026-03-16 18:05:28.394335	\N		أجهزة علاج طبيعي	\N	\N	evening
4429	267	3	2026-04-18 17:54:15.47274	\N		استشارة طبية	\N	\N	evening
2553	687	3	2026-03-16 19:55:16.530553	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2554	687	3	2026-03-16 19:56:56.983506	\N	باشرت المريضة بعد استشارة مسبقة 	أجهزة علاج طبيعي	\N	\N	morning
2555	311	3	2026-03-16 20:11:12.538507	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2556	311	3	2026-03-16 20:11:16.538346	\N		أجهزة علاج طبيعي	\N	\N	morning
2557	468	3	2026-03-16 20:18:23.601613	\N	الجلسة الاخيرة	أجهزة علاج طبيعي	\N	\N	morning
2558	646	3	2026-03-17 05:51:13.888584	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2559	577	3	2026-03-17 06:12:42.994017	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2560	509	3	2026-03-17 06:14:34.77263	\N	الجلسة الخامسة مجانية	تمارين تأهيلية	\N	\N	morning
2561	474	3	2026-03-17 07:08:43.306331	\N	جلسة رقم 11 من البكج 	تمارين تأهيلية	\N	\N	morning
2562	703	3	2026-03-17 07:09:37.620193	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2563	589	3	2026-03-17 07:51:26.838217	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2564	638	3	2026-03-17 07:58:14.2061	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2565	121	3	2026-03-17 08:10:54.879062	\N	الجلسة الخامسة من البكج 	تمارين تأهيلية	\N	\N	morning
2566	467	3	2026-03-17 08:46:46.100695	\N	الجلسة الرابعة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2567	467	3	2026-03-17 08:46:52.173362	\N	الجلسة الرابعة من البكج 	روبوت	\N	\N	morning
2568	536	3	2026-03-17 08:49:05.959165	\N	الجلسة الخامسة من البكج 	تمارين تأهيلية	\N	\N	morning
2569	672	3	2026-03-17 09:05:03.792786	\N	الجلسة الاولى للمريض ضمن الضمان الاجتماعي	تمارين تأهيلية	\N	\N	morning
2570	709	3	2026-03-17 09:55:59.609439	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض باول جلسات العلاج مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2571	673	3	2026-03-17 09:57:00.109541	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة لمريض راقد بالطابق الخامس 	أجهزة علاج طبيعي	\N	\N	\N
2572	153	3	2026-03-17 10:21:24.555844	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
2573	344	3	2026-03-17 10:34:28.70684	\N	الجلسة الثالثة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2574	606	3	2026-03-17 11:25:13.85238	\N	الجلسة السادسة والاخيرة من البكج مع الشفت الصباحي 	أجهزة علاج طبيعي	\N	\N	morning
2575	303	2	2026-03-17 12:39:24.637049	\N	تدريب على الطرف +اظافة سوفت للقالب 	\N	\N	\N	morning
2576	552	2	2026-03-17 12:40:15.195295	\N	عمل له سوفت اظافي 	\N	\N	\N	morning
2577	21	1	2026-03-17 12:56:08.5169	\N	لغرض التدريب على الطرف مع الاستلام 	\N	\N	\N	morning
2578	514	4	2026-03-17 14:34:26.804094	\N	تدريب مع استلام الطرف	\N	\N	\N	evening
2579	710	3	2026-03-17 16:57:21.767521	\N	قرر اهل الطفل اخذ استشارة عند دكتور عبد الله في الشفت الصباحي	استشارة طبية	\N	\N	evening
2580	597	3	2026-03-17 17:06:53.328835	\N		أجهزة علاج طبيعي	\N	\N	evening
2581	222	3	2026-03-17 17:15:30.157724	\N		تمارين تأهيلية	\N	\N	evening
2582	458	3	2026-03-17 17:17:53.807205	\N		روبوت	\N	\N	evening
2583	688	3	2026-03-17 17:25:39.000457	\N		أجهزة علاج طبيعي	\N	\N	evening
2584	567	3	2026-03-17 17:30:50.174133	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2585	689	3	2026-03-17 17:31:05.056448	\N		أجهزة علاج طبيعي	\N	\N	evening
2586	660	3	2026-03-17 17:34:35.529014	\N		أجهزة علاج طبيعي	\N	\N	evening
2587	567	3	2026-03-17 17:39:51.882279	\N		أجهزة علاج طبيعي	\N	\N	evening
2588	322	3	2026-03-17 17:50:51.848673	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2589	322	3	2026-03-17 17:56:04.849014	\N		روبوت	\N	\N	evening
2590	424	3	2026-03-17 18:11:04.566422	\N		أجهزة علاج طبيعي	\N	\N	evening
2591	675	3	2026-03-17 18:11:26.421537	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2592	675	3	2026-03-17 18:26:15.163176	\N		أجهزة علاج طبيعي	\N	\N	evening
2593	31	3	2026-03-17 18:26:33.888176	\N		أجهزة علاج طبيعي	\N	\N	evening
2594	711	3	2026-03-17 18:31:10.082525	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
4427	931	3	2026-04-18 17:36:50.781915	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4430	1041	3	2026-04-18 17:55:12.999178	\N	يباشر في وقت اخر	استشارة طبية	\N	\N	evening
2597	488	3	2026-03-17 18:42:04.439977	\N		أجهزة علاج طبيعي	\N	\N	evening
2598	714	3	2026-03-17 19:36:43.875045	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2599	714	3	2026-03-17 19:37:45.872221	\N	باشرت المريضة بجلستها الاولى بعد الاستشارة ببكج 6 جلسات	أجهزة علاج طبيعي	\N	\N	morning
2600	712	3	2026-03-17 19:39:01.920421	\N	المريضة اخذت استشارة وقررت اخذ استشارة اخرى عند دكتور عبد الله خان	استشارة طبية	\N	\N	morning
2601	645	3	2026-03-17 19:45:09.972932	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4432	998	3	2026-04-18 18:25:45.42467	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2603	307	3	2026-03-17 19:54:17.68274	\N		أجهزة علاج طبيعي	\N	\N	morning
2604	311	3	2026-03-17 20:08:17.217399	\N		أجهزة علاج طبيعي	\N	\N	morning
2605	715	3	2026-03-16 21:02:32	\N	اخذ المريض استشارة ويباشر في وقت لاحق كونه لديه عمل خارج المحافظة ولايستطيع الاستمرار بالجلسات الا بعد عودته	استشارة طبية	\N	\N	morning
2606	64	3	2026-03-18 05:31:36.446371	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2607	503	3	2026-03-18 05:52:11.645505	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - الجلسة الرابعة مع الشفت الصباحي 	أجهزة علاج طبيعي	\N	\N	\N
2608	703	3	2026-03-18 06:56:52.431283	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2609	701	3	2026-03-18 07:03:35.200809	\N	الجلسة الثانية والاخيره من البكج	أجهزة علاج طبيعي	\N	\N	morning
2610	393	3	2026-03-18 08:12:41.596429	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة بتاريخ 18/2	تمارين تأهيلية	\N	\N	\N
2611	716	3	2026-03-18 08:19:35.683391	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	\N
2612	298	3	2026-03-18 08:21:34.176448	\N	الجلسة العاشرة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2613	79	3	2026-03-18 08:23:49.987232	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة جديدة مفردة 	أجهزة علاج طبيعي	\N	\N	\N
2614	701	3	2026-03-18 08:25:25.312434	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حجز للجلسة القادمه بتاريخ 22/3/2026 الساعه 11 الصبح 	أجهزة علاج طبيعي	\N	\N	\N
2615	435	3	2026-03-18 08:33:57.113154	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2616	467	3	2026-03-18 08:40:00.999149	\N	الجلسة الخامسة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2617	467	3	2026-03-18 08:40:08.261538	\N	الجلسة الخامسة من البكج	روبوت	\N	\N	morning
2618	639	3	2026-03-18 08:46:44.002036	\N	الجلسة الرابعة مجانا 	تمارين تأهيلية	\N	\N	morning
2619	710	3	2026-03-18 08:52:55.978988	\N	استشارة اوليه مع اخصائي العلاج الطبيعي عبد الله وسيباشر المريض غدا حسب موعده الساعه 09:30 صباحا 	استشارة طبية	\N	\N	morning
2620	413	1	2026-03-18 09:31:22.024632	\N	لغرض تجميل الطرف	\N	\N	\N	morning
2621	686	3	2026-03-18 10:10:36.051424	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2622	545	3	2026-03-18 10:30:56.020409	\N	الجلسة الثانية والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2623	641	3	2026-03-18 10:33:43.71246	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضة اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة مسبقه بتاريخ 8/3	تمارين تأهيلية	\N	\N	\N
2624	673	3	2026-03-18 10:34:21.013617	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - مريض راقد بالطابق الخامس 	تمارين تأهيلية	\N	\N	\N
2625	515	3	2026-03-18 10:44:14.228782	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2626	694	1	2026-03-18 12:16:32.255874	\N	لغرض استلام القالب 	\N	\N	\N	morning
2628	717	1	2026-03-18 12:24:43.917698	\N	لغرض اخذ قالب 	\N	\N	\N	morning
2627	678	1	2026-03-18 12:17:46.967668		تدريب مع استلام الطرف كامل 	\N	\N	\N	morning
2629	349	2	2026-03-18 12:39:32.578711	\N	لبس الطرف والتدريب عليه 	\N	\N	\N	morning
2630	423	1	2026-03-18 13:47:15.13038	\N	لغرض التعيار 	\N	\N	\N	evening
2631	44	1	2026-03-18 13:53:38.502563	\N	لغرض تعيار الطرف	\N	\N	\N	evening
2632	644	3	2026-03-18 16:45:58.062658	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2633	644	3	2026-03-18 16:46:02.391842	\N		أجهزة علاج طبيعي	\N	\N	evening
2634	659	3	2026-03-18 16:46:48.298386	\N		أجهزة علاج طبيعي	\N	\N	evening
2635	567	3	2026-03-18 17:12:00.215642	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2636	567	3	2026-03-18 17:12:03.973885	\N		أجهزة علاج طبيعي	\N	\N	evening
2637	311	3	2026-03-18 17:12:16.133819	\N		أجهزة علاج طبيعي	\N	\N	evening
2638	322	3	2026-03-18 17:24:28.489955	\N		تمارين تأهيلية	\N	\N	evening
2639	714	3	2026-03-18 17:25:51.741142	\N		أجهزة علاج طبيعي	\N	\N	evening
2640	518	3	2026-03-18 17:35:04.067444	\N		تمارين تأهيلية	\N	\N	evening
2641	718	3	2026-03-18 17:37:45.063565	\N	المريض اخذ استشارة عند دكتور مصطفى حيث كان متفق مسبقا مع استاذ منتظر وهو الذي استقبله واتفق معه حول البدء او لا 	استشارة طبية	\N	\N	evening
2642	626	3	2026-03-18 17:42:38.046604	\N		أجهزة علاج طبيعي	\N	\N	evening
2643	675	3	2026-03-18 17:48:33.249468	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2644	675	3	2026-03-18 17:48:37.359597	\N		أجهزة علاج طبيعي	\N	\N	evening
2365	626	3	2026-03-12 16:55:09.983787		الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	evening
2645	689	3	2026-03-18 18:08:43.430432	\N		أجهزة علاج طبيعي	\N	\N	evening
2646	458	3	2026-03-18 18:20:31.527778	\N		روبوت	\N	\N	evening
2647	424	3	2026-03-18 18:20:48.221094	\N		أجهزة علاج طبيعي	\N	\N	evening
2648	719	3	2026-03-18 18:24:20.469345	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2649	719	3	2026-03-18 18:25:03.643298	\N	اخذ المريض جلسته الاولى بعد الاستشارة	أجهزة علاج طبيعي	\N	\N	evening
2650	322	3	2026-03-18 18:26:00.545765	\N	بتاريخ 24/2	تمارين تأهيلية	\N	\N	evening
2651	322	3	2026-03-18 18:26:17.418294	\N	بتاريخ 26/2	تمارين تأهيلية	\N	\N	evening
2652	322	3	2026-03-18 18:26:27.889695	\N	بتاريخ 2/3	تمارين تأهيلية	\N	\N	evening
2653	322	3	2026-03-18 18:26:41.116229	\N	بتاريخ 4/2	تمارين تأهيلية	\N	\N	evening
2654	322	3	2026-03-18 18:26:56.78282	\N	بتاريخ 7/2	تمارين تأهيلية	\N	\N	evening
2655	322	3	2026-03-18 18:27:18.071923	\N	بتاريخ 9/2	تمارين تأهيلية	\N	\N	evening
2656	322	3	2026-03-18 18:27:34.756968	\N	بتاريخ 11/2	تمارين تأهيلية	\N	\N	evening
2657	322	3	2026-03-18 18:27:55.972132	\N	بتاريخ 14/3	تمارين تأهيلية	\N	\N	evening
2658	322	3	2026-03-18 18:28:09.983308	\N	بتاريخ 17/3	تمارين تأهيلية	\N	\N	evening
2659	188	3	2026-03-18 18:28:35.20313	\N		أجهزة علاج طبيعي	\N	\N	evening
2660	458	3	2026-03-18 18:33:05.071384	\N	يوم 23/2 تمارين وجهاز Megnatik	أجهزة علاج طبيعي	\N	\N	evening
2661	458	3	2026-03-18 18:35:32.066112	\N	24/2 	أجهزة علاج طبيعي	\N	\N	evening
2662	458	3	2026-03-18 18:36:11.130381	\N	26/2	أجهزة علاج طبيعي	\N	\N	evening
2663	458	3	2026-03-18 18:36:19.527737	\N	28/2	أجهزة علاج طبيعي	\N	\N	evening
2664	458	3	2026-03-18 18:36:27.085983	\N	2/3	أجهزة علاج طبيعي	\N	\N	evening
2665	458	3	2026-03-18 18:36:35.400603	\N	3/3	أجهزة علاج طبيعي	\N	\N	evening
2666	458	3	2026-03-18 18:36:43.432126	\N	8/3	أجهزة علاج طبيعي	\N	\N	evening
2667	458	3	2026-03-18 18:36:53.551159	\N	9/3	أجهزة علاج طبيعي	\N	\N	evening
2668	458	3	2026-03-18 18:37:01.789074	\N	11/3	أجهزة علاج طبيعي	\N	\N	evening
2669	458	3	2026-03-18 18:37:09.568904	\N	12/3	أجهزة علاج طبيعي	\N	\N	evening
2670	458	3	2026-03-18 18:37:23.507778	\N	16/3	أجهزة علاج طبيعي	\N	\N	evening
2671	458	3	2026-03-18 18:38:41.668352	\N	17/3	أجهزة علاج طبيعي	\N	\N	evening
2672	458	3	2026-03-18 18:38:53.218678	\N	18/3	أجهزة علاج طبيعي	\N	\N	evening
2673	692	3	2026-03-18 19:30:52.159131	\N		أجهزة علاج طبيعي	\N	\N	morning
2674	672	3	2026-03-19 05:06:43.344351	\N	الجلسة الاولى للمريض ضمن الضمان الصحي	تمارين تأهيلية	\N	\N	morning
2675	721	3	2026-03-19 06:10:17.491259	\N	استشارة اولية مع اخصائي العلاج الطبيعي عبد الله خان ولم تباشر المريضه بارادتهه بسبب بعد المسافه (سوق الشيوخ)	استشارة طبية	\N	\N	morning
2676	710	3	2026-03-19 06:17:21.651278	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (10 جلسة) (تكلفة: 250,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بتاريخ اليوم بعد استشارة مسبقه 	تمارين تأهيلية	\N	\N	\N
2677	474	3	2026-03-19 06:43:03.690585	\N	جلسة رقم 12 من البكج	تمارين تأهيلية	\N	\N	morning
2678	703	3	2026-03-19 06:55:07.449998	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2679	349	2	2026-03-19 07:32:05.828184	\N	تدريب على الطرف	\N	\N	\N	morning
2680	580	2	2026-03-19 07:39:07.018302	\N	تم لبس المساند وتم الاستلام 	\N	\N	\N	morning
2681	638	3	2026-03-19 07:46:38.665946	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2682	121	3	2026-03-19 08:34:02.707785	\N	الجلسة السادسة والاخيرة من البكج	تمارين تأهيلية	\N	\N	morning
2683	467	3	2026-03-19 09:11:38.839179	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2684	467	3	2026-03-19 09:11:58.738378	\N	الجلسة السادسة والاخيرة من البكج	روبوت	\N	\N	morning
2685	536	3	2026-03-19 09:14:58.593325	\N	الجلسة السادسة والاخيرة من البكج	تمارين تأهيلية	\N	\N	morning
2686	677	1	2026-03-19 09:32:21.10033	\N	صيانه مسند	\N	\N	\N	morning
2687	711	3	2026-03-19 09:41:29.612631	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - مريض راقد بالطابق الخامس 	تمارين تأهيلية	\N	\N	\N
2688	686	3	2026-03-19 09:43:29.472337	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2689	723	1	2026-01-24 09:51:31	\N	صيانه قالب	\N	\N	\N	morning
2690	723	1	2026-03-19 09:52:00.837643	\N	صيانه قالب مع تجميل الطرف 	\N	\N	\N	morning
2691	722	3	2026-03-19 10:01:27.121617	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2692	153	3	2026-03-19 10:09:49.779035	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
2693	676	3	2026-03-19 11:19:05.549997	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة مسبقه بتاريخ 15/3 	أجهزة علاج طبيعي	\N	\N	\N
2694	463	3	2026-03-19 16:45:40.949243	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2695	463	3	2026-03-19 16:49:31.603289	\N		أجهزة علاج طبيعي	\N	\N	evening
2696	692	3	2026-03-19 16:50:58.455779	\N		أجهزة علاج طبيعي	\N	\N	evening
2697	458	3	2026-03-19 17:06:01.244883	\N		روبوت	\N	\N	evening
2698	688	3	2026-03-19 17:16:49.041566	\N		أجهزة علاج طبيعي	\N	\N	evening
2699	719	3	2026-03-19 17:34:00.777519	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2700	719	3	2026-03-19 17:40:25.482552	\N		أجهزة علاج طبيعي	\N	\N	evening
2701	322	3	2026-03-19 17:57:48.650443	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2702	322	3	2026-03-19 17:57:55.447011	\N		روبوت	\N	\N	evening
2703	322	3	2026-03-19 17:57:59.849775	\N		تمارين تأهيلية	\N	\N	evening
2704	358	3	2026-03-19 18:12:03.686385	\N		أجهزة علاج طبيعي	\N	\N	evening
3323	119	2	2026-04-02 10:16:47.129217	\N	تم اخذ قالب	\N	\N	\N	morning
2705	424	3	2026-03-19 18:12:28.554943	\N	الجلسة الاخيرة من بكج ال4 جلسات	أجهزة علاج طبيعي	\N	\N	evening
2706	690	3	2026-03-19 20:12:28.060107	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2707	690	3	2026-03-19 20:12:32.640254	\N		أجهزة علاج طبيعي	\N	\N	morning
2708	687	3	2026-03-19 20:22:36.096243	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2709	687	3	2026-03-19 20:24:15.240153	\N		أجهزة علاج طبيعي	\N	\N	morning
2710	307	3	2026-03-19 20:32:39.625235	\N		أجهزة علاج طبيعي	\N	\N	morning
2711	724	3	2026-03-19 21:21:39.089938	\N	المريض يعاني من خلل في عصب الوجه اخذ استشارة ويباشر بعد العيد بعد الاتفاق مع دكتور مصطفى	استشارة طبية	\N	\N	morning
2712	503	3	2026-03-24 05:09:56.71713	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2713	672	3	2026-03-24 05:10:58.096351	\N	الجلسة الثالثة للمريض ضمن الضمان الصحي	تمارين تأهيلية	\N	\N	morning
2714	700	3	2026-03-24 05:49:15.461389	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2715	703	3	2026-03-24 06:49:22.037957	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2716	509	3	2026-03-24 06:49:39.793847	\N	الجلسة السادسة مجانية	تمارين تأهيلية	\N	\N	morning
2717	710	3	2026-03-24 06:52:06.479467	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
2718	474	3	2026-03-24 07:16:37.559949	\N	جلسة رقم 13 من البكج	تمارين تأهيلية	\N	\N	morning
2719	722	3	2026-03-24 07:35:05.750705	\N	الجلسة الثانية والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2720	577	3	2026-03-24 07:39:54.464446	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2721	589	3	2026-03-24 07:59:41.453415	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2722	725	3	2026-03-24 08:03:16.6414	\N	حضر ذوي المريض فقط بدون المريض شخصيا وسياتي للاستشارة يوم السبت مع المريض لغرض المعاينة السريريه من قبل اخصائي العلاج عبد الله خان 	استشارة طبية	\N	\N	morning
2723	726	2	2026-03-24 08:15:33.092839	\N	صيانة للقالب 	\N	\N	\N	morning
2724	727	3	2026-03-24 08:50:07.151002	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2725	467	3	2026-03-24 08:51:00.915722	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2726	467	3	2026-03-24 08:51:00.95859	خدمة جديدة	جلسات علاج إضافية - روبوت (3 جلسة) (تكلفة: 150,000 د.ع)	روبوت	\N	\N	\N
2727	722	3	2026-03-24 09:09:14.671442	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2728	732	2	2026-03-24 09:24:39.050726	\N	لديها كتاب تخفيض من محافظ البصرة وتم تحديد لها طرف 3R78	\N	\N	\N	morning
2729	729	3	2026-03-24 09:38:26.235576	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2730	730	3	2026-03-24 09:39:13.492532	\N	لم ولن يباشر المريض جلسات العلاج الطبيعي لان بحاجة الى جراحة وليس علاج 	استشارة طبية	\N	\N	morning
2731	728	3	2026-03-24 09:40:49.066888	\N	شيباشر المريض غدا حسب الموعد المخصص له 	استشارة طبية	\N	\N	morning
2732	731	3	2026-03-24 09:41:16.085975	\N	لم ولن تباشر المريضه جلسات العلاج الطبيعي لانها بحاجة الى جراحة وليس علاج 	استشارة طبية	\N	\N	morning
2733	729	3	2026-03-24 10:47:01.367217	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حجز للجلسة القادمه 	أجهزة علاج طبيعي	\N	\N	\N
2734	369	1	2026-03-24 11:30:51.677251	\N	لغرض تسليم صيوان اذن سلكونيه 	\N	\N	\N	morning
2735	676	3	2026-03-24 11:33:47.047137	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2736	733	3	2026-03-24 11:52:47.175615	\N	ستباشر المريضه ابتداء من الخميس حسب الموعد المخصص لها 	استشارة طبية	\N	\N	morning
2737	734	1	2026-03-19 11:58:37		تم مراجعه المركز لغرض اخذ قالب لمساند كيفو وتم دفع 100000 الف دينار عراقي 	\N	\N	\N	morning
2738	734	1	2026-03-24 11:59:13.182541	\N	تم تحويل مبلغ وقدره 75000 الف دينار عراقي 	\N	\N	\N	morning
2739	545	3	2026-03-24 12:05:52.585642	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2740	735	2	2026-03-24 12:12:22.362746	\N	تم لبس الاصبع وتم الاستلام 	\N	\N	\N	morning
2741	153	3	2026-03-24 12:12:55.94994	\N	الجلسة الرابعة والاخيرة من البكج	تمارين تأهيلية	\N	\N	morning
2742	736	2	2026-03-24 12:15:17.486996	\N	تم لبس الكف وتم الاستلام	\N	\N	\N	morning
2743	737	1	2026-03-24 13:14:59.90511	\N	تم مراجعه المركز لغرض الفحص وتحديد نوع طرف	\N	\N	\N	evening
2744	264	3	2026-03-24 13:28:32.412733	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2745	264	3	2026-03-24 13:28:36.559801	\N		أجهزة علاج طبيعي	\N	\N	evening
2746	608	3	2026-03-24 13:28:55.067989	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2747	608	3	2026-03-24 13:28:58.549755	\N		أجهزة علاج طبيعي	\N	\N	evening
2792	742	1	2026-03-25 11:29:20.477282	\N	تم تحويل مبلغ وقدره مليون و500000 الف دينار عراقي	\N	\N	\N	morning
2748	718	3	2026-03-24 13:29:26.129501	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) (تكلفة: 250,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2749	718	3	2026-03-24 13:31:11.864889	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (10 جلسة) (تكلفة: 250,000 د.ع) - حسب الاتفاق مع دكتور ياسر له تخفيض 15 جلسة  ب250 الف 	تمارين تأهيلية	\N	\N	\N
2750	718	3	2026-03-24 13:31:33.0103	\N	الجلسة الاولى من البكج	تمارين تأهيلية	\N	\N	evening
2751	739	1	2026-01-20 13:48:11	\N	فحص ومعاينه مع دفع مبلغ قدره 2 مليوم دينار عراقي والباقي 500000 الف مع احذ قياسات ودرجه اللون	\N	\N	\N	evening
2752	739	1	2026-03-24 13:48:51.922046	\N	تم مراجعه المركز لغرض استلام صيوان اذن تجميلي مع دفع المبلغ كامل	\N	\N	\N	evening
2753	738	3	2026-03-24 13:50:33.58425	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2754	659	3	2026-03-24 13:55:11.750513	\N		أجهزة علاج طبيعي	\N	\N	evening
2755	742	1	2026-03-24 13:56:39.397405	\N	فحص ومعاينه مع اخذ قوالب 	\N	\N	\N	evening
2756	739	1	2026-03-24 14:00:02.252174	خدمة جديدة	خدمة أخرى (تكلفة: 50,000 د.ع) - شراء لاصق اضافي	\N	\N	\N	\N
2757	46	1	2026-03-24 14:05:51.151547	\N	تدريب على الطرف	\N	\N	\N	evening
2758	743	4	2026-03-24 14:33:06.95096	\N	استعلام	\N	\N	\N	evening
2759	514	4	2026-03-24 14:34:40.260786	\N	قص السليكون مع تعيار الطرف	\N	\N	\N	evening
2760	740	3	2026-03-24 15:10:08.543334	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2761	740	3	2026-03-24 15:10:46.36805	\N	اخذت المريضة استشارة بعد تحويلها من قبل دكتور حسن ناجي وباشرت بجلستها الاولى	أجهزة علاج طبيعي	\N	\N	evening
2762	738	3	2026-03-24 15:17:28.540903	\N	باشر المريض بعد الاستشارة بجلسة ابر صينية اولى	أبر صينية	\N	\N	evening
2763	741	3	2026-03-24 15:23:06.348105	\N	اخذ المريض استشارة ويباشر يوم غد	استشارة طبية	\N	\N	evening
2764	31	3	2026-03-24 15:24:21.589719	\N		أجهزة علاج طبيعي	\N	\N	evening
2765	458	3	2026-03-24 15:24:46.683623	\N		روبوت	\N	\N	evening
2766	745	1	2026-03-24 15:24:59.629403	\N	فحص ومعاينه مع اخذ قالب 	\N	\N	\N	evening
2767	744	3	2026-03-24 15:29:31.803384	\N	المريضة اخذت استشارة لكن قررت المباشرة بعد مراجعة طبيب اختصاص عظام ومفاصل	استشارة طبية	\N	\N	evening
2768	644	3	2026-03-24 15:34:23.65657	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2769	644	3	2026-03-24 15:34:27.65291	\N		أجهزة علاج طبيعي	\N	\N	evening
2770	746	1	2026-03-24 15:34:39.715387	\N	تبديل مفصل قدم سنكل 	\N	\N	\N	evening
2771	746	1	2026-03-24 15:35:43.572024	خدمة جديدة	تعديل أو ضبط (تكلفة: 150,000 د.ع) - تبديل مفصل قدم سنكل	\N	\N	\N	\N
2772	747	3	2026-03-24 16:33:58.544347	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2773	747	3	2026-03-24 16:47:07.037191	\N	باشرت المريضة بعد الاستشارة	أجهزة علاج طبيعي	\N	\N	evening
2774	311	3	2026-03-24 17:15:38.660241	\N		أجهزة علاج طبيعي	\N	\N	evening
2775	688	3	2026-03-24 18:03:50.224635	\N		أجهزة علاج طبيعي	\N	\N	evening
2776	322	3	2026-03-24 18:05:46.855288	\N		تمارين تأهيلية	\N	\N	evening
2777	503	3	2026-03-25 06:33:48.870138	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2778	642	3	2026-03-25 06:51:53.102499	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	تمارين تأهيلية	\N	\N	\N
2779	710	3	2026-03-25 07:04:07.909291	\N		تمارين تأهيلية	\N	\N	morning
2780	703	3	2026-03-25 07:38:27.999652	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2781	749	3	2026-03-25 07:47:58.65881	\N	لم يدخل المريض للاستشارة حتى لانه يرغب بمراجعة دكتورة ( حيدر حازم) فقد اجرى له عملية سابقة وذلك بناءً على رغبته، لغرض تقييم حالته الصحية ووضع خطة علاجية مناسبة من قبله، مع التفضل بإصدار التحويل اللازم وفق الأصول.\n	استشارة طبية	\N	\N	morning
2782	393	3	2026-03-25 07:49:36.417906	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - الجلسة الثانية للمريض	تمارين تأهيلية	\N	\N	\N
2783	701	3	2026-03-25 07:50:19.28042	\N	جلسة محجوزه مسبقا 	أجهزة علاج طبيعي	\N	\N	morning
2784	716	3	2026-03-25 07:57:10.603045	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2785	748	3	2026-03-25 08:43:24.324088	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - سيباشر المريض اول جلسلات العلاج الخاص به ابتداء من الغد بتاريخ 26/3 حسب موعده الخاص الساعه 3 مساء وقد تم الدفع لغرض حجز للجلسة القادمة	أجهزة علاج طبيعي	\N	\N	\N
2786	639	3	2026-03-25 08:46:07.14838	\N	الجلسة الخامسة مجانا	تمارين تأهيلية	\N	\N	morning
2787	467	3	2026-03-25 08:46:59.250486	\N	الجلسة الثانية من البكج 	روبوت	\N	\N	morning
2788	467	3	2026-03-25 08:47:14.888313	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
2789	729	3	2026-03-25 08:52:10.510847	\N	جلسة محجوزة مسبقا 	أجهزة علاج طبيعي	\N	\N	morning
2790	730	3	2026-03-25 08:57:58.134678	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - بناءً على رغبة المريض، وبعد ملاحظته تحسّن حالة زوجته، قرر المباشرة اليوم بأولى جلسات العلاج الطبيعي لديه، حيث تم احتساب جلسة مفردة له، مع حجز موعد للجلسة القادمة \n	أجهزة علاج طبيعي	\N	\N	\N
2791	729	3	2026-03-25 09:01:20.253931	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حجز جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	\N
2903	467	3	2026-03-28 08:49:01.348705	\N	الجلسة الاولى من البكج 	روبوت	\N	\N	morning
2793	750	3	2026-03-25 11:41:13.453144	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي الخاصه به مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2794	173	3	2026-03-25 11:50:56.582785	\N	حضر المريض للاستشارة بتاريخ اليوم مع اخصائي العلاج الطبيعي عبد الله خان لمشكلة في الرقبه 	استشارة طبية	\N	\N	morning
4428	931	3	2026-04-18 17:37:34.438025	\N		روبوت	\N	\N	evening
4431	1037	3	2026-04-18 17:55:30.796825	\N		استشارة طبية	\N	\N	evening
2831	361	1	2026-03-25 16:22:39.258125		صيانه مسند  تبديل شريط	\N	\N	\N	evening
2838	311	3	2026-03-25 17:33:52.499059	\N		أجهزة علاج طبيعي	\N	\N	evening
2809	389	1	2026-03-25 12:32:02.882992	\N	لغرض التعيار	\N	\N	\N	morning
2810	751	3	2026-03-25 12:49:21.858508	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضة اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2811	718	3	2026-03-25 13:18:59.435446	\N		أجهزة علاج طبيعي	\N	\N	evening
2812	718	3	2026-03-25 13:19:05.262416	\N		تمارين تأهيلية	\N	\N	evening
2813	188	3	2026-03-25 13:51:42.833137	\N		أجهزة علاج طبيعي	\N	\N	evening
2814	755	1	2026-03-25 13:58:10.898602	\N	تسليم المسند الى المركز لغرض الصيانه 	\N	\N	\N	evening
2815	265	3	2026-03-25 13:58:23.128097	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2816	265	3	2026-03-25 14:34:10.407201	\N		أبر صينية	\N	\N	evening
2817	237	3	2026-03-25 15:26:12.675672	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2818	237	3	2026-03-25 15:26:16.190947	\N		أبر صينية	\N	\N	evening
2819	741	3	2026-03-25 15:44:25.465534	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2820	741	3	2026-03-25 15:44:29.145131	\N		أجهزة علاج طبيعي	\N	\N	evening
2821	458	3	2026-03-25 15:46:44.975934	خدمة جديدة	جلسات علاج إضافية - روبوت (10 جلسة) (تكلفة: 500,000 د.ع)	روبوت	\N	\N	\N
2822	458	3	2026-03-25 15:46:50.362221	\N		روبوت	\N	\N	evening
2823	756	3	2026-03-25 15:52:56.157247	\N	المريض اخذ استشارة  وقرر البدء من يوم السبت كونه لديه عمل 	استشارة طبية	\N	\N	evening
2824	749	3	2026-03-25 15:58:22.851123	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2825	749	3	2026-03-25 15:58:52.119829	\N	اخذ المريض استشارة في الشفت المسائي وباشر بجلسته الاولى 	أجهزة علاج طبيعي	\N	\N	evening
2826	690	3	2026-03-25 16:00:37.813022	\N		أجهزة علاج طبيعي	\N	\N	evening
2827	322	3	2026-03-25 16:02:13.395382	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
2828	322	3	2026-03-25 16:02:16.374698	\N		روبوت	\N	\N	evening
2829	74	3	2026-03-25 16:08:57.330584	\N		تمارين تأهيلية	\N	\N	evening
2832	747	3	2026-03-25 16:27:50.827739	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2833	747	3	2026-03-25 16:27:56.411767	\N		أجهزة علاج طبيعي	\N	\N	evening
2834	396	1	2026-03-25 16:36:27.166145	\N	تم تحويل مبلغ مالي قدره 300000 الف دينار عراقي تم تسديد المبلغ بلكامل	\N	\N	\N	evening
2835	757	3	2026-03-25 16:37:43.853176	\N		استشارة طبية	\N	\N	evening
2836	758	4	2026-03-25 16:41:32.940966	\N	استعلام	\N	\N	\N	evening
2837	759	4	2026-03-25 16:48:04.290127	\N	استعلام عن سليكون	\N	\N	\N	evening
2839	626	3	2026-03-25 17:34:06.129295	\N		أجهزة علاج طبيعي	\N	\N	evening
2840	488	3	2026-03-25 17:45:03.055613	\N		أجهزة علاج طبيعي	\N	\N	evening
2841	714	3	2026-03-25 17:45:25.88758	\N		أجهزة علاج طبيعي	\N	\N	evening
2842	424	3	2026-03-25 18:00:30.761084	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2843	424	3	2026-03-25 18:03:26.0855	\N		أجهزة علاج طبيعي	\N	\N	evening
2844	692	3	2026-03-25 18:12:15.319168	\N		أجهزة علاج طبيعي	\N	\N	evening
2845	760	3	2026-03-25 18:47:17.804574	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2846	760	3	2026-03-25 18:47:32.43564	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
2847	762	3	2026-03-25 19:01:30.877935	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2848	762	3	2026-03-25 19:01:44.95472	\N	باشر المريض بعد الاستشارة 	أبر صينية	\N	\N	morning
2849	710	3	2026-03-26 06:53:18.690027	\N	الجلسة الثالثة من البكج 	تمارين تأهيلية	\N	\N	morning
2850	467	3	2026-03-26 08:51:04.323078	\N	الجلسة الثالثة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2851	467	3	2026-03-26 08:51:09.330145	\N	الجلسة الثالثة والاخيرة من البكج	روبوت	\N	\N	morning
2852	536	3	2026-03-26 09:04:28.968237	\N	جلسة مجانية من العرض	تمارين تأهيلية	\N	\N	morning
2853	536	3	2026-03-26 09:04:51.188601	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة) (تكلفة: 150,000 د.ع) - بكج جديد يبدء من الجلسة القادمه	تمارين تأهيلية	\N	\N	\N
2854	722	3	2026-03-26 10:33:47.224005	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2855	750	3	2026-03-26 11:04:31.139819	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2856	727	3	2026-03-26 11:22:30.05213	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2902	467	3	2026-03-28 08:48:56.931612	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2904	185	2	2026-03-28 09:48:45.203044	\N	تجييك براغي 	\N	\N	\N	morning
2857	733	3	2026-03-26 11:27:06.889111	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة سابقة	أجهزة علاج طبيعي	\N	\N	\N
2858	748	3	2026-03-26 11:29:09.698042	\N	جلسة محجوزه مسبقا	أجهزة علاج طبيعي	\N	\N	morning
2859	676	3	2026-03-26 11:42:34.584965	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2860	727	3	2026-03-26 12:01:52.320426	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حجز للجلسة القادمة	أجهزة علاج طبيعي	\N	\N	\N
2861	748	3	2026-03-26 13:12:04.891213	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2862	471	1	2026-03-26 13:12:06.886807	\N	لغرض اخذ قالب 	\N	\N	\N	evening
2864	718	3	2026-03-26 13:37:26.260053	\N		تمارين تأهيلية	\N	\N	evening
2865	659	3	2026-03-26 13:40:54.505762	\N		أجهزة علاج طبيعي	\N	\N	evening
2896	716	3	2026-03-28 08:17:37.043616	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2867	763	1	2026-03-26 13:56:35.480027	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2868	763	1	2026-03-26 14:00:54.476493	\N	جلسه علاج 	أجهزة علاج طبيعي	\N	\N	evening
2869	764	1	2026-03-26 14:12:52.931061	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع) - تم اضافه جلسات علاج طبيعيه	أجهزة علاج طبيعي	\N	\N	\N
2870	764	1	2026-03-26 14:13:18.315649	\N	جلسه علاج طبيعي اولى	أجهزة علاج طبيعي	\N	\N	evening
2871	738	3	2026-03-26 14:14:22.534891	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2872	31	3	2026-03-26 14:20:23.175736	\N		أجهزة علاج طبيعي	\N	\N	evening
2873	738	3	2026-03-26 14:20:41.908037	\N		أبر صينية	\N	\N	evening
2874	644	3	2026-03-26 14:24:47.356592	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2875	644	3	2026-03-26 14:24:50.756442	\N		أجهزة علاج طبيعي	\N	\N	evening
2876	745	1	2026-03-26 15:02:00.965916	\N	تم تحويل مبلغ وقدره 2 مليون  دينار عراقي 	\N	\N	\N	evening
2877	173	3	2026-03-26 15:17:05.279131	الجلسة بتاريخ 25/3	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2878	765	1	2026-03-26 16:14:23.019711	\N	تم فحص ومعاينه المريض مع تحديد نوع الطرف	\N	\N	\N	evening
2879	322	3	2026-03-26 17:05:06.301643	\N		تمارين تأهيلية	\N	\N	evening
2880	766	3	2026-03-26 17:16:27.764113	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
2881	766	3	2026-03-26 17:17:31.707443	\N	المريض من النجف لكن ولده من حي الشهداء في الناصرية وجاءوا للمركز بعد التواصل مع استاذ منتظر وباشر بجلسة ابر صينية بعد الاستشارة 	أبر صينية	\N	\N	evening
2882	761	3	2026-03-26 17:19:40.421674	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2883	761	3	2026-03-26 17:20:06.48085	\N	باشر المريض بعد استشارة يوم امس بجلسة مفردة اولى 	أجهزة علاج طبيعي	\N	\N	evening
2884	714	3	2026-03-26 17:37:53.875869	\N		أجهزة علاج طبيعي	\N	\N	evening
2885	311	3	2026-03-26 17:46:26.79276	\N		أجهزة علاج طبيعي	\N	\N	evening
2886	358	3	2026-03-26 18:20:31.264388	\N		أجهزة علاج طبيعي	\N	\N	evening
2887	64	3	2026-03-28 05:32:05.944045	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2888	700	3	2026-03-28 05:39:56.894091	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2889	503	3	2026-03-28 05:46:23.603907	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2890	722	3	2026-03-28 06:24:21.487309	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
2891	768	3	2026-03-28 07:41:08.683184	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2892	173	3	2026-03-28 07:41:44.283173	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2893	769	3	2026-03-28 07:58:08.605214	\N	المريض بحاجة الى اخصائي لن يباشر العلاج بالوقت الحالي 	استشارة طبية	\N	\N	morning
2894	770	3	2026-03-28 08:02:43.408184	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2895	771	3	2026-03-28 08:06:21.664849	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
2897	730	3	2026-03-28 08:19:45.945067	\N	الجلسة الثانية محجوزه	أجهزة علاج طبيعي	\N	\N	morning
2898	729	3	2026-03-28 08:20:09.956088	\N	جلسة مفردة محجوزه مسبقا 	أجهزة علاج طبيعي	\N	\N	morning
2899	639	3	2026-03-28 08:47:52.347117	\N	الجلسة السادسة مجانا	تمارين تأهيلية	\N	\N	morning
2900	467	3	2026-03-28 08:48:34.266327	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشر المريض بكج جديد	أجهزة علاج طبيعي	\N	\N	\N
2901	467	3	2026-03-28 08:48:34.318956	خدمة جديدة	جلسات علاج إضافية - روبوت (6 جلسة) (تكلفة: 300,000 د.ع) - باشر المريض بكج جديد	روبوت	\N	\N	\N
2905	773	2	2026-03-28 09:54:06.117704	\N	لديه كتاب تخفيض وتم عرض له اطراففوق الركبة ثابت +ميكانيكي مع طرف هايدروليكي هوائي بسعر 4350000 و6500000 و10875000 وبما انه لديه كتاب الاتفاق على السعر المخفض تماما	\N	\N	\N	morning
2906	774	2	2026-03-28 09:58:51.559478	\N	تم الفحص بحاجه الى طرف تحت الركبة تيتانيوم شتل لوك وتم اخذ قالب 	\N	\N	\N	morning
2907	511	2	2026-03-28 09:59:41.268335	\N	تم استلام المساند وتم لبس المساند	\N	\N	\N	morning
2908	772	3	2026-03-28 10:37:25.361049	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2909	764	1	2026-03-28 11:29:23.657357	\N	جلسه علاج طبيعي ثانيه 	أجهزة علاج طبيعي	\N	\N	morning
2910	725	3	2026-03-28 11:33:34.449	\N	حضر المريض للاستشارة برفقة المريض وسيباشر مع الشفت المسائي بتفضيل المريض لانشغاله بدوام رسمي في اوقات الشفت الصباحي 	استشارة طبية	\N	\N	morning
2911	767	3	2026-03-28 11:37:58.857427	\N	حضر للاستشاره وسيباشر حسب موعده 	استشارة طبية	\N	\N	morning
2912	79	3	2026-03-28 11:39:12.014901	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2913	692	3	2026-03-28 11:43:01.739268	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة مع الشفت الصباحي	أجهزة علاج طبيعي	\N	\N	\N
2914	775	3	2026-03-28 11:53:50.356652	\N	حضر المريض للاستشاره عند اخصائي العلاج الطبيعي عبد الله خان وسيباشر مع الشفت المسائي بتفضيل المريض بسبب انشغاله لدوام رسمي باوقات الصباحي	استشارة طبية	\N	\N	morning
2915	751	3	2026-03-28 12:27:34.293338	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4433	998	3	2026-04-18 18:25:49.891368	\N		أجهزة علاج طبيعي	\N	\N	evening
2921	776	3	2026-03-28 13:29:10.959586	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2922	776	3	2026-03-28 13:29:26.183484	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
2923	749	3	2026-03-28 13:29:47.292	\N		أجهزة علاج طبيعي	\N	\N	evening
2924	734	1	2026-03-28 13:37:25.385045	\N	استلام مساند كيفو ليلي 	\N	\N	\N	evening
2925	777	3	2026-03-28 13:59:29.703048	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2927	778	3	2026-03-28 14:27:13.913574	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2928	778	3	2026-03-28 14:27:41.120075	\N	باشرت المريضة بعد الاستشارة بجلسة مفردة 	أجهزة علاج طبيعي	\N	\N	evening
2929	779	3	2026-03-28 14:29:12.400926	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2930	779	3	2026-03-28 14:29:31.579718	\N	باشر المريض بعد الاستشارة بجلسة مفردة اولى 	أجهزة علاج طبيعي	\N	\N	evening
2931	763	1	2026-03-28 14:30:50.04126	\N	الجلسة الثانية من العلاج الطبيعي 	أجهزة علاج طبيعي	\N	\N	evening
2933	188	3	2026-03-28 15:00:10.330926	\N	اخر جلسة من البكج	أجهزة علاج طبيعي	\N	\N	evening
2932	415	1	2026-03-28 14:51:12.085861		تدريب مع استلام الطرف  	\N	\N	\N	evening
2934	690	3	2026-03-28 15:16:14.517655	\N		أجهزة علاج طبيعي	\N	\N	evening
2935	644	3	2026-03-28 15:16:32.022626	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2936	644	3	2026-03-28 15:16:36.693144	\N		أجهزة علاج طبيعي	\N	\N	evening
2937	458	3	2026-03-28 15:16:53.887355	\N		روبوت	\N	\N	evening
2938	659	3	2026-03-28 15:17:33.715491	\N		أجهزة علاج طبيعي	\N	\N	evening
2939	777	3	2026-03-28 15:17:50.171727	\N		أجهزة علاج طبيعي	\N	\N	evening
2940	34	4	2026-03-28 15:26:34.792986	\N	تعيار الاطراف 	\N	\N	\N	evening
2941	781	3	2026-03-28 15:52:01.021078	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2942	781	3	2026-03-28 15:52:16.375383	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
2944	747	3	2026-03-28 16:17:40.724037	\N		أجهزة علاج طبيعي	\N	\N	evening
2945	307	3	2026-03-28 16:42:07.977892	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2946	738	3	2026-03-28 16:45:18.21339	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2947	738	3	2026-03-28 16:45:23.514158	\N		أجهزة علاج طبيعي	\N	\N	evening
2948	307	3	2026-03-28 16:48:16.894063	\N		أجهزة علاج طبيعي	\N	\N	evening
2949	714	3	2026-03-28 17:35:49.044079	\N		أجهزة علاج طبيعي	\N	\N	evening
2950	424	3	2026-03-28 18:04:43.146941	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2951	424	3	2026-03-28 18:10:39.523629	\N		أجهزة علاج طبيعي	\N	\N	evening
2952	782	3	2026-03-28 18:38:13.177461	\N	تم اخذ قياس للمريضة 	\N	\N	\N	evening
2953	608	3	2026-03-28 18:54:06.585779	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 0 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
2954	608	3	2026-03-28 18:56:46.224614	\N		أجهزة علاج طبيعي	\N	\N	evening
2955	672	3	2026-03-29 05:19:28.525675	\N	الجلسة الرابعة للمريض ضمن الضمان الصحي	تمارين تأهيلية	\N	\N	morning
2916	763	1	2026-03-28 12:58:57.530115		جلسه اولى روبوت	روبوت	\N	\N	morning
2919	764	1	2026-03-28 13:03:29.117114		جلسه ريبوت اولى	روبوت	\N	\N	evening
2926	780	1	2026-03-28 18:56:15		جلس علاج طبيعي اولى من اصل 3 جلسات 	أجهزة علاج طبيعي	\N	\N	evening
2956	770	3	2026-03-29 05:22:15.963166	\N	لم تتمن من المباشرة بجلسة يوم أمس بالرغم من الدفع والموافقة، نظرًا لعدم تمكن الجهة المعنية من الانتظار بسبب ارتباطهم بأعمال أخرى، وعليه تم تأجيل الجلسة إلى هذا اليوم.\n	أجهزة علاج طبيعي	\N	\N	morning
2957	771	3	2026-03-29 05:22:33.916371	\N	لم تتمن من المباشرة بجلسة يوم أمس بالرغم من الدفع والموافقة، نظرًا لعدم تمكن الجهة المعنية من الانتظار بسبب ارتباطهم بأعمال أخرى، وعليه تم تأجيل الجلسة إلى هذا اليوم.\n	أجهزة علاج طبيعي	\N	\N	morning
2958	153	3	2026-03-29 05:47:11.864815	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة 	تمارين تأهيلية	\N	\N	\N
2959	503	3	2026-03-29 05:47:48.270637	\N	الجلسة الرابعه من البكج	أجهزة علاج طبيعي	\N	\N	morning
2960	703	3	2026-03-29 06:49:16.271573	\N	الجلسة السابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
2961	577	3	2026-03-29 06:50:42.516432	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2962	474	3	2026-03-29 07:04:31.910506	\N	جلسة رقم 14 من البكج	تمارين تأهيلية	\N	\N	morning
2963	786	2	2026-03-29 07:39:19.727109	\N	تم شراء طرف وتسديد جزء من المبلغ 700000 د والباقي 800000د وتم اخذ قالب 	\N	\N	\N	morning
2964	787	2	2026-01-20 08:12:33	\N	تم صيانة المسند 	\N	\N	\N	morning
2965	783	3	2026-03-29 08:18:09.707104	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (18 جلسة) (تكلفة: 450,000 د.ع)	تمارين تأهيلية	\N	\N	\N
2966	783	3	2026-03-29 10:01:19.12739	\N	خضع المريض لبرنامج علاج مكثف يتضمن (16) جلسة علاجية، بالإضافة إلى إقامة داخل المستشفى لمدة (10) ليالٍ. وقد تلقى المريض الجلسة الأولى في اليوم الأول من بدء البرنامج العلاجي خلال الفترة الصباحية.\n	تمارين تأهيلية	\N	\N	morning
2967	784	3	2026-03-29 10:04:57.984606	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان 	أجهزة علاج طبيعي	\N	\N	\N
2968	788	3	2026-03-29 10:11:24.409404	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع) - باشر المريض اول جلسات الروبوت الخاصه به مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة 	روبوت	\N	\N	\N
2969	788	3	2026-03-29 10:11:29.130985	\N	باشر المريض اول جلسات الروبوت الخاصه به مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة 	روبوت	\N	\N	morning
2970	785	3	2026-03-29 10:32:50.298149	خدمة جديدة	جلسات علاج إضافية - روبوت (2 جلسة) (تكلفة: 100,000 د.ع) - باشر المريض اول جلسات الروبوت الخاصه به مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة وحج جلسة مقدمه اخرى 	روبوت	\N	\N	\N
2971	785	3	2026-03-29 10:32:54.23149	\N	باشر المريض اول جلسات الروبوت الخاصه به مع اخصائي العلاج الطبيعي عبد الله خان بعد الاستشارة مباشرة وحج جلسة مقدمه اخرى 	روبوت	\N	\N	morning
2972	757	3	2026-03-29 10:34:36.283858	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - حضر المريض للاستشارة مع اخصائي العلاج الطبيعي عبد الله خان وباشر اول جلسات العلاج الطبيعي الخاصه به 	أجهزة علاج طبيعي	\N	\N	\N
2973	757	3	2026-03-29 10:34:50.915223	\N	حضر المريض للاستشارة مع اخصائي العلاج الطبيعي عبد الله خان وباشر اول جلسات العلاج الطبيعي الخاصه به	أجهزة علاج طبيعي	\N	\N	morning
2974	536	3	2026-03-29 10:40:03.503149	\N	باشرت المريضه بالجلسة الاولى من البكج 	تمارين تأهيلية	\N	\N	morning
2975	467	3	2026-03-29 10:40:27.010617	\N	الجلسة الثانية من البكج 	روبوت	\N	\N	morning
2976	467	3	2026-03-29 10:40:35.568661	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2943	613	1	2026-03-28 16:09:54.399996		سحب القالب لغرض الصيانه 	\N	\N	\N	evening
2977	727	3	2026-03-29 10:46:06.407406	\N	جلسة محجوزة مسبقا 	أجهزة علاج طبيعي	\N	\N	morning
2978	21	1	2026-03-28 10:46:37	\N	صيانه قالب 	\N	\N	\N	morning
2979	403	1	2026-03-28 10:47:15	\N	اخذ قالب وسحب وتسليم 	\N	\N	\N	morning
2980	727	3	2026-03-29 10:48:15.844752	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - حجز جلستين مقدما 	أجهزة علاج طبيعي	\N	\N	\N
2981	767	3	2026-03-29 11:02:35.254464	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (3 جلسة) (تكلفة: 75,000 د.ع) - باشر المريض اليوم باول جلسات العلاج الطبيعي بعد تحديد الموعد 	تمارين تأهيلية	\N	\N	\N
2983	733	3	2026-03-29 11:30:20.06554	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2984	676	3	2026-03-29 11:30:45.300951	\N	الجلسة الرابعه من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2985	748	3	2026-03-29 11:37:26.806962	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
2986	389	1	2026-03-29 11:58:55.277251	\N	تسليم الطرف لغرض السحب الثانوي كاربون 	\N	\N	\N	morning
2987	764	1	2026-03-29 12:06:59.653487		جلسه ثانيه ريبورت	روبوت	\N	\N	morning
2991	790	3	2026-03-29 12:53:28.225004	\N	يحتاج المريض الى الرنين ويباشر حسب موعده 	استشارة طبية	\N	\N	morning
2989	772	3	2026-03-29 12:12:36.601324	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2990	763	1	2026-03-29 12:36:45.918247	\N	الجلسه الثالثه من العلاج الطبيعي	أجهزة علاج طبيعي	\N	\N	morning
2988	764	1	2026-03-29 12:08:10.505588		جلسه ثالثه اجهزه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
3175	675	3	2026-03-31 13:21:00.756903	\N		أجهزة علاج طبيعي	\N	\N	evening
2992	771	3	2026-03-29 12:57:16.181917	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2993	770	3	2026-03-29 12:57:30.265006	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2996	718	3	2026-03-29 13:26:36.967457	\N		تمارين تأهيلية	\N	\N	evening
2997	675	3	2026-03-29 13:33:53.230297	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
2998	675	3	2026-03-29 13:35:27.821265	\N		أجهزة علاج طبيعي	\N	\N	evening
2999	780	1	2026-03-29 13:43:54.972481	\N	جلسه علاج طبيعي ثانيه	أجهزة علاج طبيعي	\N	\N	evening
3000	767	3	2026-03-29 14:25:04.072311	\N	المريض اصر على استخدام جهاز الروبوت على مسؤوليته رافضًا قرار دكتور عبد الله في الإنتظار فترة تحت العلاج وعليه اخذ جلسة روبوت اولى في الشفت الصباحي بعد ان وقع على تحمله للسؤوليه	روبوت	\N	\N	evening
2995	767	3	2026-03-29 13:25:13.378109			تمارين تأهيلية	\N	\N	evening
3001	792	3	2026-03-29 14:36:31.726227	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3002	792	3	2026-03-29 14:37:56.037949	\N	باشرت المريضة بعد الاستشارة حيث انها تم تحويلها ايضا من دكتور علي فاخر بالإضافة الى درايتها المسبقة بالمركز من قبل الموظفة سماء	أبر صينية	\N	\N	evening
3003	791	3	2026-03-29 15:22:17.883842	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3004	791	3	2026-03-29 15:22:40.127714	\N	باشرت المريضة بعد الاستشارة ببكج من 6 جلسات 	أجهزة علاج طبيعي	\N	\N	evening
3005	725	3	2026-03-29 15:26:48.514015	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3006	725	3	2026-03-29 15:27:26.403556	\N	باشر المريض بجلستة الاولى بعد الاستشارة في الشفت المسائي ببكج من 6 جلسات 	أجهزة علاج طبيعي	\N	\N	evening
3007	794	3	2026-03-29 15:38:11.405663	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3008	794	3	2026-03-29 15:38:51.577863	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3009	793	3	2026-03-29 15:44:52.05666	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3010	793	3	2026-03-29 15:45:21.436234	\N	باشرت المريضة بعد الاستشارة بعد ان تم تحويلها من قبل دكتور حيدر حازم	أجهزة علاج طبيعي	\N	\N	evening
4434	645	3	2026-04-18 18:26:57.839586	\N	المريضة اخذت الجلسة التي قامت بدفعها مسبقًا لكنها اجلتها بتاريخ 13/4/2026	استشارة طبية	\N	\N	evening
2994	763	1	2026-03-29 12:59:47.262158		جلسه روبوت  ثانيه 	روبوت	\N	\N	morning
4453	1028	3	2026-04-19 06:10:09.448023	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
4463	1027	3	2026-04-19 08:17:16.372077	\N	الجلسة الاولى لليوم الثاني الشفت الصباحي 	أجهزة علاج طبيعي	\N	\N	morning
3015	779	3	2026-03-29 16:05:54.795079	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3016	779	3	2026-03-29 16:06:00.129357	\N		أجهزة علاج طبيعي	\N	\N	evening
3017	660	3	2026-03-29 16:10:49.413238	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3018	660	3	2026-03-29 16:10:54.415586	\N		أجهزة علاج طبيعي	\N	\N	evening
3019	31	3	2026-03-29 16:11:15.610444	\N		أجهزة علاج طبيعي	\N	\N	evening
3020	795	3	2026-03-29 16:13:10.793673	\N	اخذت المريضة استشارة وتباشر يوم غد	استشارة طبية	\N	\N	evening
3021	222	3	2026-03-29 16:13:31.998228	\N		تمارين تأهيلية	\N	\N	evening
3022	575	3	2026-03-29 16:29:43.409198	\N		أجهزة علاج طبيعي	\N	\N	evening
3023	798	3	2026-03-29 16:37:26.561346	\N	تم اخذ قياسات للمسند 	\N	\N	\N	evening
3024	45	1	2026-03-29 16:42:57.191471	\N	لغرض التعيار	\N	\N	\N	evening
3025	797	3	2026-03-29 16:45:40.470663	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3026	488	3	2026-03-29 16:46:13.945966	\N		أجهزة علاج طبيعي	\N	\N	evening
3027	797	3	2026-03-29 16:46:49.365354	\N		أبر صينية	\N	\N	evening
3028	799	3	2026-03-29 17:21:59.195919	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3029	799	3	2026-03-29 17:22:13.386209	\N	باشرت المريضة بعد الاستشارة 	أبر صينية	\N	\N	evening
3030	311	3	2026-03-29 17:57:39.799426	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3031	311	3	2026-03-29 17:57:51.105144	\N		أجهزة علاج طبيعي	\N	\N	evening
3032	424	3	2026-03-29 17:58:58.385463	\N		أجهزة علاج طبيعي	\N	\N	evening
3033	496	3	2026-03-29 17:59:49.727771	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3035	751	3	2026-03-29 18:23:47.68709	\N		أجهزة علاج طبيعي	\N	\N	evening
3036	783	3	2026-03-29 18:56:34.917015	\N	الجلسة الثانية اليوم الاول الشفت المسائي	تمارين تأهيلية	\N	\N	evening
3037	800	3	2026-03-29 19:21:17.310986	\N	المريضة رااقدة في الطابق الرابع اثر تعرضها لجلطة دماغية على اسم دكتور علي رشيد 	تمارين تأهيلية	\N	\N	morning
3038	784	3	2026-03-30 05:21:08.92179	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
3039	770	3	2026-03-30 05:29:19.130813	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3034	751	3	2026-03-29 08:46:29	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	5	\N	\N
3040	771	3	2026-03-30 05:29:35.256415	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
4464	788	3	2026-04-19 10:05:14.498839	\N	الجلسة الثانية من البكج	روبوت	\N	\N	morning
3042	503	3	2026-03-30 05:42:38.49903	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3043	64	3	2026-03-30 05:42:54.493502	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3044	801	3	2026-03-30 06:13:50.509264	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
3045	801	3	2026-03-30 06:14:05.709312	\N	باشر المريض اول جلسات العلاج الطبيعي اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	morning
3046	802	3	2026-03-30 06:37:23.980428	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة \n	أجهزة علاج طبيعي	\N	\N	\N
3047	802	3	2026-03-30 06:54:55.901669	\N	باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	morning
3048	703	3	2026-03-30 07:19:37.753158	\N	الجلسة الثامنة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3049	757	3	2026-03-30 07:51:34.39171	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3050	757	3	2026-03-30 07:51:45.963159	\N	الجلسة الثانية مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3051	716	3	2026-03-30 07:53:09.520019	\N	الجلسة الرابعه من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3052	783	3	2026-03-30 07:58:52.092633	\N	الجلسة الاولى لليوم الثاني للشفت الصباحي 	تمارين تأهيلية	\N	\N	morning
3053	800	3	2026-03-30 08:00:56.746037	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - تمت مباشرة المريضة بجلسات العلاج الطبيعي بعد أن كانت تقتصر سابقًا على أداء التمارين فقط في الطابق الرابع (طابق الرقود).\nونظرًا لحاجتها إلى استخدام الأجهزة العلاجية بالإضافة إلى التمارين، فقد حضرت هذا اليوم وبدأت بأول جلسة علاجية باستخدام الأجهزة، وهي حاليًا راقدة في المستشفى وتحت المتابعة.\n	تمارين تأهيلية	\N	\N	\N
3054	800	3	2026-03-30 08:01:01.748611	\N	تمت مباشرة المريضة بجلسات العلاج الطبيعي بعد أن كانت تقتصر سابقًا على أداء التمارين فقط في الطابق الرابع (طابق الرقود).\nونظرًا لحاجتها إلى استخدام الأجهزة العلاجية بالإضافة إلى التمارين، فقد حضرت هذا اليوم وبدأت بأول جلسة علاجية باستخدام الأجهزة، وهي حاليًا راقدة في المستشفى وتحت المتابعة.\n	تمارين تأهيلية	\N	\N	morning
3055	722	3	2026-03-30 08:17:17.719397	\N	الجلسة الثالثة والاخيرة من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3056	467	3	2026-03-30 08:54:44.745572	\N	الجلسة الثالثة من البكج	روبوت	\N	\N	morning
3057	467	3	2026-03-30 08:54:49.684939	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3058	639	3	2026-03-30 08:58:56.075813	\N	الجلسة السابعة مجانا	تمارين تأهيلية	\N	\N	morning
2982	789	1	2026-03-29 11:26:51.799056		فحص ومعاينه المريض مع اخذ قالب 	\N	\N	\N	morning
3059	803	3	2026-03-30 11:07:50.136098	\N	حضرت المريضه للاستشاره ولم تباشر لحاجتها الى جراحه 	استشارة طبية	\N	\N	morning
3060	301	2	2026-02-04 11:21:28	\N	تم تسديد مبلغ	\N	\N	\N	morning
3061	301	2	2026-03-30 11:41:05.018204	\N	اظافة سوفت للقالب 	\N	\N	\N	morning
3062	789	1	2026-03-30 11:43:10.733805	\N	تم تحويل مبلغ وقدره 4 مليون دينار عراقي وتم تسديد المبلغ كامل 	\N	\N	\N	morning
3063	751	3	2026-03-30 11:49:08.878896	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3064	764	1	2026-03-30 11:56:46.21303	\N		روبوت	\N	\N	morning
3065	772	3	2026-03-30 11:58:09.944857	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3066	805	3	2026-03-30 12:03:53.681798	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
3067	805	3	2026-03-30 12:14:13.411025	\N	باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	morning
3069	806	3	2026-03-30 12:50:00.834289	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
3070	806	3	2026-03-30 12:50:11.577627	\N	باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	morning
3071	807	1	2026-03-29 12:59:50		تم مراجعه المركض لغرض صيانه مسند رسخ	\N	\N	\N	morning
3072	809	2	2026-03-30 13:12:55.345427	\N	شراء سلكون بانتظار الدفع	\N	\N	\N	evening
3073	575	3	2026-03-30 13:17:25.301554	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
3074	608	3	2026-03-30 13:18:01.317504	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3075	608	3	2026-03-30 13:18:05.311998	\N		أجهزة علاج طبيعي	\N	\N	evening
3076	780	1	2026-03-30 13:19:11.627938	\N	جلسه علاج طبيعي ثالثه	أجهزة علاج طبيعي	\N	\N	evening
3077	814	1	2026-03-30 14:15:35.776215	\N	جلسه اجهزه علاج طبيعي اولى	أجهزة علاج طبيعي	\N	\N	evening
3078	815	1	2026-03-30 14:23:43.618601	\N	تبديل سلكون لكونه ضمان 	\N	\N	\N	evening
3079	816	3	2026-03-30 14:38:31.119558	خدمة جديدة	خدمة أخرى (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
3080	810	3	2026-03-30 15:21:01.808165	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3081	810	3	2026-03-30 15:21:33.912015	\N	باشر المريض بعد الاستشارة بعد ان تم تحويله من قبل دكتور حيدر حازم	أجهزة علاج طبيعي	\N	\N	evening
4435	670	3	2026-04-18 18:30:30.38795	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3083	811	3	2026-03-30 16:22:18.268743	\N	المريضة اخذت استشارة وقرروا اخذ استشارة اخرى مع الشفت الصباحي كون وقت المسائي لايناسبهم	استشارة طبية	\N	\N	evening
3084	820	3	2026-03-30 17:33:32.244682	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3085	820	3	2026-03-30 17:34:24.079656	\N	باشرت المريضة بعد الاستشارة بعد التحويل من قبل حيدر حازم	أجهزة علاج طبيعي	\N	\N	evening
4454	1025	3	2026-04-19 06:23:49.545431	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3087	795	3	2026-03-30 17:42:37.168719	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3088	795	3	2026-03-30 17:42:41.560061	\N		أجهزة علاج طبيعي	\N	\N	evening
3089	567	3	2026-03-30 17:45:18.728122	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3090	567	3	2026-03-30 17:45:24.660601	\N		أجهزة علاج طبيعي	\N	\N	evening
3091	738	3	2026-03-30 17:46:02.883331	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3092	738	3	2026-03-30 17:46:05.954507	\N		أجهزة علاج طبيعي	\N	\N	evening
3093	747	3	2026-03-30 17:50:25.524373	\N		أجهزة علاج طبيعي	\N	\N	evening
3094	747	3	2026-03-30 17:50:33.474156	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3095	794	3	2026-03-30 17:51:42.678582	\N		أجهزة علاج طبيعي	\N	\N	evening
3096	818	3	2026-03-30 17:56:39.58765	\N	اخذت المريضة استشارة وتباشر يوم غد	استشارة طبية	\N	\N	evening
3097	817	3	2026-03-30 17:57:11.182808	\N	اخذ المريضة استشارة وتباشر يوم غد	استشارة طبية	\N	\N	evening
3098	813	3	2026-03-30 17:58:47.393211	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3099	813	3	2026-03-30 17:59:01.067374	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3100	424	3	2026-03-30 18:01:10.107999	\N		أجهزة علاج طبيعي	\N	\N	evening
3101	659	3	2026-03-30 18:03:35.143087	\N	الجلسة المجانية من البكج	أجهزة علاج طبيعي	\N	\N	evening
3102	821	3	2026-03-30 18:46:29.630311	\N	تباشر غدا	استشارة طبية	\N	\N	evening
3103	738	3	2026-03-30 19:03:34.328908	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3104	738	3	2026-03-30 19:03:37.864499	\N		أبر صينية	\N	\N	morning
3105	822	3	2026-03-31 05:24:27.94716	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة) (تكلفة: 150,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	تمارين تأهيلية	\N	\N	\N
3106	822	3	2026-03-31 05:24:40.196062	\N	الجلسة الاولى من البكج 	تمارين تأهيلية	\N	\N	morning
3107	785	3	2026-03-31 05:25:38.152141	\N	الجلسة الثانية من البكج محجوزة مسبقا	روبوت	\N	\N	morning
4465	727	3	2026-04-19 10:56:49.907306	\N	جلسة محجوزه مسبقا 	أجهزة علاج طبيعي	\N	\N	morning
3109	784	3	2026-03-30 05:26:45	\N	الجلسة الثانية مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3110	784	3	2026-03-31 05:26:58.496898	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	\N
3111	784	3	2026-03-31 05:27:27.623837	\N	الجلسة الثالثة مفرده	أجهزة علاج طبيعي	\N	\N	morning
3112	503	3	2026-03-31 05:28:36.212688	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3113	503	3	2026-03-24 05:29:50	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3114	503	3	2026-03-18 05:30:20	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3115	785	3	2026-03-31 05:33:39.397863	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع) - حجز للجلسة القادمة 	روبوت	\N	\N	\N
3116	153	3	2026-03-29 05:52:21	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3117	153	3	2026-03-15 05:52:42	\N	الجلسة الاولى من البكج 	تمارين تأهيلية	\N	\N	morning
3118	153	3	2026-03-10 05:53:30	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3119	153	3	2026-03-31 05:54:11.067994	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (2 جلسة) (تكلفة: 50,000 د.ع) - جلسة لليوم وحجز جلسة للجلسة القادمة 	تمارين تأهيلية	\N	\N	\N
3120	153	3	2026-03-31 05:54:26.897014	\N	الجلسة الاولى مفردة 	تمارين تأهيلية	\N	\N	morning
3121	700	3	2026-03-31 06:11:37.12035	\N	الجلسة الرابعه من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3122	700	3	2026-03-16 06:12:14	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3123	692	3	2026-03-28 06:27:42	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3124	692	3	2026-03-31 06:28:22.071583	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع) - الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	\N
3125	692	3	2026-03-31 06:28:28.715442	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3126	757	3	2026-03-31 06:30:23.686759	\N	الجلسة الثالثة مجانية 	أجهزة علاج طبيعي	\N	\N	morning
3127	509	3	2026-03-31 06:59:15.197171	\N	الجلسة السابعة مجانية	تمارين تأهيلية	\N	\N	morning
3128	474	3	2026-03-31 07:10:50.367829	\N	جلسة رقم 15 من البكج	تمارين تأهيلية	\N	\N	morning
3129	804	2	2026-03-30 07:32:42	\N	تم فحص المصاف وتحديد نوع الطرف ( اكيلون فاك ), وتسديد 4000000 ملايين من قيمة الطرف 	\N	\N	\N	morning
3130	149	3	2026-03-31 07:39:16.047381	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3131	823	3	2026-03-31 08:06:04.569515	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (4 جلسة) (تكلفة: 100,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله بعد الاستشارة مباشرة 	تمارين تأهيلية	\N	\N	\N
3132	823	3	2026-03-31 08:06:17.970513	\N	الجلسة الاولى من البكج 	تمارين تأهيلية	\N	\N	morning
3133	149	3	2026-02-17 08:07:12	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3134	149	3	2026-03-04 08:07:28	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3135	149	3	2026-03-10 08:07:38	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3136	149	3	2026-03-31 08:08:07.556996	\N	جلسة مفرده 	أجهزة علاج طبيعي	\N	\N	morning
3137	512	2	2026-03-31 08:10:33.603711	\N	تم اخذ قالب م/مصطفى 	\N	\N	\N	morning
3138	825	2	2026-03-31 08:30:56		تم فحص الحالة وتم بيع لها طرف اكيلون فاك / تم دفع مبلغ 5000000	\N	\N	\N	morning
3139	824	3	2026-03-31 08:39:29.409457	\N	حضر المريض للاستشارة مع اخصائي العلاج الطبيعي عبد الله خان ونظرًا لاكتظاظ المواعيد في الوقت الحالي، سيتم الانتظار من جانبنا لحين تحديد موعد مناسب له، ليتم على أساسه المباشرة بجلساته.\n 	استشارة طبية	\N	\N	morning
3140	274	3	2026-02-22 08:40:34	\N	جلسة مفردة \n	أجهزة علاج طبيعي	\N	\N	morning
3141	274	3	2026-03-31 08:41:03.157017	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	\N
3142	274	3	2026-03-31 08:41:13.812209	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3143	751	3	2026-03-25 08:50:52		جلسة علاج طبيعي 	أجهزة علاج طبيعي	\N	\N	morning
3144	467	3	2026-03-31 08:56:24.862898	\N	الجلسة الرابعة من البكج	روبوت	\N	\N	morning
3145	467	3	2026-03-31 08:56:37.272795	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3146	467	3	2026-03-24 08:57:18	\N	الجلسة الاولى من البكج	روبوت	\N	\N	morning
3147	467	3	2026-03-24 08:57:39	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
3148	538	2	2026-03-31 08:59:44.721123	\N	تم لبس القالب الجديد وتم استلام القالب 	\N	\N	\N	morning
3149	536	3	2026-03-31 09:00:53.845466	\N	الجلسة الثانية من البكج 	تمارين تأهيلية	\N	\N	morning
3150	538	2	2026-03-31 09:05:37.135603	\N	تم لبس القالب الجديد 	\N	\N	\N	morning
3151	804	2	2026-03-31 09:06:29.483419	\N	تسديد مبلغ	\N	\N	\N	morning
3152	783	3	2026-03-31 09:13:36.018686	\N	الجلسة الاولى لليوم الثالث للشفت الصباحي	تمارين تأهيلية	\N	\N	morning
3153	788	3	2026-03-31 09:54:31.025564	خدمة جديدة	جلسات علاج إضافية - روبوت (4 جلسة) (تكلفة: 200,000 د.ع)	روبوت	\N	\N	\N
3154	788	3	2026-03-31 09:54:54.110395	\N	الجلسة الاولى من البكج 	روبوت	\N	\N	morning
3155	826	3	2026-03-31 10:46:20.10146	\N	حضرت المريضه للاستشارة مع اخصائي العلاج الطبيعي عبد الله خان ونظرًا لارتفاع التكلفة بالنسبة لهم، فقد تعذّر المضي قدمًا في الجلسات في الوقت الحالي.\n	استشارة طبية	\N	\N	morning
4436	670	3	2026-04-18 18:30:34.341788	\N		أجهزة علاج طبيعي	\N	\N	evening
3157	49	1	2026-03-31 11:48:36.74481	\N	تسليم الطرف الايمن للمركز لغرض تغيير مكان الادبتر 	\N	\N	\N	morning
3158	748	3	2026-03-31 11:51:59.656419	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3159	335	3	2026-03-31 11:54:08.254895	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - بكج جديد ل 6 جلسات 	أجهزة علاج طبيعي	\N	\N	\N
3160	335	3	2026-03-31 11:54:31.140329	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3161	335	3	2026-03-04 11:55:07	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3162	335	3	2026-02-17 11:56:31	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
3163	814	1	2026-03-31 12:07:11.821607	\N	جلسه اجهزه علاج طبيعي ثانيه	أجهزة علاج طبيعي	\N	\N	morning
3164	772	3	2026-03-31 12:32:11.01955	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3165	772	3	2026-03-28 12:32:29	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3166	772	3	2026-03-29 12:32:37	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3167	772	3	2026-03-31 12:32:44.445092	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3168	772	3	2026-03-30 12:32:56	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3170	780	1	2026-03-31 13:16:35.677342	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3169	650	1	2026-03-31 12:47:01.85308		تدريب على المسند 	\N	\N	\N	morning
3171	780	1	2026-03-31 13:17:00.177815	\N	جلسه علاج طبيعي رابعه	أجهزة علاج طبيعي	\N	\N	evening
3172	718	3	2026-03-31 13:19:37.571636	\N		تمارين تأهيلية	\N	\N	evening
3173	458	3	2026-03-31 13:20:25.216198	\N		روبوت	\N	\N	evening
3174	675	3	2026-03-31 13:20:49.341302	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3176	778	3	2026-03-31 13:23:21.204946	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3177	778	3	2026-03-31 13:23:30.000728	\N		أجهزة علاج طبيعي	\N	\N	evening
3178	828	4	2026-03-31 13:26:17.722006	\N	استعلام	\N	\N	\N	evening
3179	819	3	2026-03-31 13:47:32.973657	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (7 جلسة) (تكلفة: 175,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3180	819	3	2026-03-31 13:47:48.354323	\N		تمارين تأهيلية	\N	\N	evening
3181	725	3	2026-03-31 13:51:04.16122	\N		أجهزة علاج طبيعي	\N	\N	evening
3082	819	3	2026-03-30 16:12:14.154656		المريضة من مشتركين القديمين للمركز  وكانت مشتركة ببكج من 10 جلسات واخذت منهم إثنان فقط والان باشرت بالتكملة حيث كانت اخر جلسة لها بتاريخ 2026/2/5 وعليه اليوم تعتبر جلستها الثالثة	تمارين تأهيلية	\N	\N	evening
3182	660	3	2026-03-31 14:00:19.408723	\N		أجهزة علاج طبيعي	\N	\N	evening
3183	5	4	2026-03-31 14:10:29.67564	\N	تجربة الاصابع السليكونية	\N	\N	\N	evening
3184	265	3	2026-03-31 14:20:09.481743	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3185	265	3	2026-03-31 14:20:14.374231	\N		أبر صينية	\N	\N	evening
3186	829	3	2026-03-31 14:20:34.105817	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3187	829	3	2026-03-31 14:21:38.621113	\N	باشرت المريضة بعد الاستشارة حيث ان والدتها من المراجعين القدماء والمستمرين بالجلسات 	أبر صينية	\N	\N	evening
3188	31	3	2026-03-31 14:24:13.41374	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
3189	812	3	2026-03-31 14:27:26.98758	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3190	812	3	2026-03-31 14:28:56.455523	\N	المريضة من مراجعين المركز االقدماء وقد توقفت عن جلساتها بسبب قيامها لعملية بكتفها بعد ان دفعت بكج من 8 جلسات وقد قامت بإستثناء هذه الجلسات الان	أجهزة علاج طبيعي	\N	\N	evening
3191	31	3	2026-03-31 14:35:54.461207	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3192	740	3	2026-03-31 14:58:03.999312	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3193	740	3	2026-03-31 14:58:07.337913	\N		أجهزة علاج طبيعي	\N	\N	evening
3194	783	3	2026-03-31 15:05:15.432057	\N	اليوم الثالث جلسة في الشفت المسائي	تمارين تأهيلية	\N	\N	evening
3195	818	3	2026-03-31 15:22:50.00068	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3196	818	3	2026-03-31 15:23:09.910211	\N	باشرت المريضة اليوم بعد استشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
3197	817	3	2026-03-31 15:24:03.367763	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3198	817	3	2026-03-31 15:24:44.307297	\N	المريضة من المراجعين القدامى للمركز وقد استثنت جلساتها اليوم للمباشرة فيما بعد بجاهز الروبوت	أجهزة علاج طبيعي	\N	\N	evening
3199	813	3	2026-03-31 15:25:05.486075	\N		أجهزة علاج طبيعي	\N	\N	evening
3200	830	3	2026-03-31 15:54:09.188631	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3201	830	3	2026-03-31 15:57:25.069732	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3202	644	3	2026-03-31 16:20:59.866432	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3203	644	3	2026-03-31 16:21:03.57555	\N		أجهزة علاج طبيعي	\N	\N	evening
3204	793	3	2026-03-31 16:22:06.812052	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3205	793	3	2026-03-31 16:22:10.069282	\N		أجهزة علاج طبيعي	\N	\N	evening
3206	222	3	2026-03-31 16:31:57.302668	\N		تمارين تأهيلية	\N	\N	evening
3207	797	3	2026-03-31 16:35:05.506941	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3208	797	3	2026-03-31 16:35:09.477593	\N		أجهزة علاج طبيعي	\N	\N	evening
3209	237	3	2026-03-31 16:37:56.762141	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3210	237	3	2026-03-31 16:37:59.846779	\N		أجهزة علاج طبيعي	\N	\N	evening
3211	792	3	2026-03-31 16:38:58.40555	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3212	792	3	2026-03-31 16:39:01.94961	\N		أجهزة علاج طبيعي	\N	\N	evening
3213	794	3	2026-03-31 16:46:23.545695	\N		أجهزة علاج طبيعي	\N	\N	evening
3214	799	3	2026-03-31 17:19:26.589607	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3215	799	3	2026-03-31 17:19:30.716703	\N		أجهزة علاج طبيعي	\N	\N	evening
3216	311	3	2026-03-31 17:47:18.737436	\N		أجهزة علاج طبيعي	\N	\N	evening
3217	783	3	2026-03-31 17:58:48.90439	\N	الجلسة لليوم الثالث الثالثة في الشفت المسائي كون المريض لم يأخذ جلسة يوم امس وعليه تم تعويضهم اليوم 	تمارين تأهيلية	\N	\N	evening
3218	831	3	2026-03-31 18:07:03.777922	\N	المريض اخذ استشارة ويباشر يوم غد	استشارة طبية	\N	\N	evening
3219	424	3	2026-03-31 18:14:52.627768	\N		أجهزة علاج طبيعي	\N	\N	evening
3220	722	3	2026-04-01 05:44:07.220167	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3221	722	3	2026-04-01 05:46:49.718506	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3222	722	3	2026-03-24 05:47:15	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3223	770	3	2026-04-01 05:58:20.770003	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3224	771	3	2026-04-01 05:59:34.726804	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3225	509	3	2026-04-01 06:02:02.201092	\N	الجلسة الثامنه مجانية	تمارين تأهيلية	\N	\N	morning
3226	788	3	2026-04-01 06:21:30.617881	\N	الجلسة الثانية من البكج	روبوت	\N	\N	morning
3227	784	3	2026-04-01 06:25:48.812296	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3228	784	3	2026-04-01 06:26:02.432367	\N	الجلسة الرابعة مفرده	أجهزة علاج طبيعي	\N	\N	morning
4437	996	3	2026-04-18 18:30:50.221088	\N		أجهزة علاج طبيعي	\N	\N	evening
3230	703	3	2026-04-01 07:11:15.045672	\N	الجلسة التاسعه من البكج	أجهزة علاج طبيعي	\N	\N	morning
3231	467	3	2026-04-01 08:43:46.992793	\N	الجلسة الخامسة من البكج	روبوت	\N	\N	morning
3232	467	3	2026-04-01 08:43:51.876307	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3233	686	3	2026-04-01 09:23:37.080121	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3234	639	3	2026-04-01 09:32:42.184333	\N	الجلسة الثامنة مجانا	تمارين تأهيلية	\N	\N	morning
3235	806	3	2026-04-01 10:58:34.001917	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3236	806	3	2026-04-01 10:58:47.902648	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3237	783	3	2026-04-01 11:04:31.729286	\N	الجلسة الاولى لليوم الرابع للشفت الصباحي	تمارين تأهيلية	\N	\N	morning
3238	751	3	2026-04-01 11:23:04.380993	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3239	772	3	2026-04-01 11:41:54.985604	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3240	772	3	2026-04-01 11:42:05.015917	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3241	805	3	2026-04-01 11:55:08.542863	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3242	196	2	2026-04-01 12:09:01.368855	\N	تعييار	\N	\N	\N	morning
3243	833	2	2026-04-01 12:09:43.781183	\N	شراء مسند طرفي +تعليه	\N	\N	\N	morning
4455	1025	3	2026-04-19 06:23:57.295452	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3246	834	3	2026-04-01 12:14:05.32246	\N	حضرت المريضه للاستشارة مع اخصائي العلاج عبد الله خان وستباشر حسب موعدها المخصص 	استشارة طبية	\N	\N	morning
3247	814	1	2026-04-01 12:20:54.265667	\N	جلسه اجهزه علاج طبيعي ثالثه	أجهزة علاج طبيعي	\N	\N	morning
3248	763	1	2026-04-01 12:46:00.376048	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3249	763	1	2026-04-01 12:46:34.427231	\N	جلسة علاج طبيعي 	أجهزة علاج طبيعي	\N	\N	morning
3250	777	3	2026-04-01 13:12:33.175092	\N		أجهزة علاج طبيعي	\N	\N	evening
3251	675	3	2026-04-01 13:13:56.309413	\N		أجهزة علاج طبيعي	\N	\N	evening
3252	659	3	2026-04-01 13:17:13.195464	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3253	659	3	2026-04-01 13:17:22.685748	\N		أجهزة علاج طبيعي	\N	\N	evening
4466	949	1	2026-04-19 11:23:51.533242	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4467	949	1	2026-04-19 11:27:28.099214	\N	جلسه اجهزه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
3256	188	3	2026-04-01 14:09:57.036421	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3257	188	3	2026-04-01 14:10:01.440701	\N		أجهزة علاج طبيعي	\N	\N	evening
3258	813	3	2026-04-01 14:17:33.926647	\N		أجهزة علاج طبيعي	\N	\N	evening
4474	1008	1	2026-04-19 12:12:38.863921	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
3261	836	3	2026-04-01 14:57:34.259855	\N	اخذ المريض استشارة ويباشر يوم الإثنين القادم	استشارة طبية	\N	\N	evening
3262	818	3	2026-04-01 14:58:03.002881	\N		أجهزة علاج طبيعي	\N	\N	evening
3263	829	3	2026-04-01 15:00:37.189933	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3264	829	3	2026-04-01 15:00:41.323372	\N		أبر صينية	\N	\N	evening
3265	817	3	2026-04-01 15:03:41.048613	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3266	817	3	2026-04-01 15:03:46.323102	\N		أجهزة علاج طبيعي	\N	\N	evening
3267	745	1	2026-04-01 15:14:19.947822	\N	تم تحويل مبلغ 4 مليون دينار عراقي والباقي 500000 الف دينار في ذمته وتم تخفيض 500000 الف دينار عراقي من قبل الدكتور ياسر 	\N	\N	\N	evening
3268	839	3	2026-04-01 15:21:52.525689	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3269	839	3	2026-04-01 15:22:16.65752	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3270	837	3	2026-04-01 15:35:06.881805	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3271	307	3	2026-04-01 15:35:31.493829	\N		أجهزة علاج طبيعي	\N	\N	evening
3272	837	3	2026-04-01 15:39:05.913873	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3273	780	1	2026-04-01 15:48:49.777828	\N	جلسه علاج طبيعي خامسه	أجهزة علاج طبيعي	\N	\N	evening
3274	593	1	2026-04-01 16:08:24.886247	\N	تم مراجعه المركز لغرض صيانه قالب مع تبديل اشرطه	\N	\N	\N	evening
3275	389	1	2026-04-01 16:08:59.02982	\N	لغرض استلام الطرف بعد السحب الثانوي كاربون 	\N	\N	\N	evening
3244	835	1	2026-04-01 12:11:28.542844		جلسه اولى	أجهزة علاج طبيعي	\N	\N	morning
3260	840	1	2026-04-01 14:55:11.010979		صيانه  على القالب مع تثبيت السلكون 	\N	\N	\N	evening
3259	838	1	2026-04-01 14:26:58.220385		تم فحص ومعاينه المريض وتم تحديد له مساند انسول عدد2 مع تسديد المبلغ كامل مع اخذ قالب	\N	\N	\N	evening
3276	841	3	2026-04-01 16:14:52.598227	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3277	841	3	2026-04-01 16:15:11.035887	\N	باشرت المريضة بعد الاستشارة	أجهزة علاج طبيعي	\N	\N	evening
3278	222	3	2026-04-01 16:20:59.795898	\N		تمارين تأهيلية	\N	\N	evening
3279	831	3	2026-04-01 16:33:21.577197	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3280	831	3	2026-04-01 16:37:23.503062	\N	باشر المريض بعد استشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
3281	5	4	2026-04-01 16:55:57.962986	\N	استلام الاصابع	\N	\N	\N	evening
3282	597	3	2026-04-01 16:56:49.216037	\N		أجهزة علاج طبيعي	\N	\N	evening
3283	831	3	2026-04-01 17:29:17.788558	\N	جلسة ابر صينية	استشارة طبية	\N	\N	evening
3284	818	3	2026-04-01 17:29:47.533339	\N	جلسة ابر	استشارة طبية	\N	\N	evening
3285	424	3	2026-04-01 17:55:41.81705	\N		أجهزة علاج طبيعي	\N	\N	evening
3286	829	3	2026-04-01 18:14:49.822697	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3287	829	3	2026-04-01 18:14:55.507005	\N		أجهزة علاج طبيعي	\N	\N	evening
3288	670	3	2026-04-01 18:15:15.833514	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3289	670	3	2026-04-01 18:15:22.243135	\N		أجهزة علاج طبيعي	\N	\N	evening
3290	844	3	2026-04-01 18:34:47.1805	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3291	844	3	2026-04-01 18:34:51.691626	\N		أجهزة علاج طبيعي	\N	\N	evening
3292	843	3	2026-04-01 18:57:06.403054	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3293	843	3	2026-04-01 18:57:22.135704	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3294	842	3	2026-04-01 18:59:52.783195	\N		استشارة طبية	\N	\N	evening
3295	597	3	2026-04-01 19:00:30.861643	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3296	792	3	2026-04-01 19:01:06.675389	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3297	792	3	2026-04-01 19:01:10.750737	\N		أجهزة علاج طبيعي	\N	\N	morning
3298	783	3	2026-04-01 19:02:02.658068	\N	الجلسة الثانية لليوم الرابع الشفت المسائي 	تمارين تأهيلية	\N	\N	morning
3299	822	3	2026-04-02 05:14:18.491572	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3300	822	3	2026-04-02 05:14:32.50115	\N	الجلسة الثانية مفردة 	تمارين تأهيلية	\N	\N	morning
3301	785	3	2026-04-02 05:35:54.858287	\N	جلسة محجوزة مسبقا 	روبوت	\N	\N	morning
3302	153	3	2026-04-02 05:46:49.946477	\N	الجلسة الثانية مفردة 	تمارين تأهيلية	\N	\N	morning
3303	785	3	2026-04-02 06:03:18.408957	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع) - حجز للجلسة القادمه 	روبوت	\N	\N	\N
3304	802	3	2026-04-02 06:45:45.056284	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3305	802	3	2026-04-02 06:45:58.445628	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3306	784	3	2026-04-02 06:59:07.214781	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3308	784	3	2026-04-02 07:00:18.609433	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3309	722	3	2026-04-02 07:11:37.686977	\N	الجلسة الثانية	أجهزة علاج طبيعي	\N	\N	morning
3310	703	3	2026-04-02 07:15:00.783951	\N	الجلسة العاشرة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3311	845	3	2026-04-02 07:27:34.132944	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي الخاص به مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
3312	845	3	2026-04-02 07:28:30.946361	\N	باشر المريض اول جلسات العلاج الطبيعي الخاص به مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	morning
3313	474	3	2026-04-02 07:38:16.155008	\N	جلسة رقم 16 من البكج	تمارين تأهيلية	\N	\N	morning
3314	686	3	2026-04-02 07:47:24.738604	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3315	692	3	2026-04-02 07:59:50.517127	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3316	783	3	2026-04-02 08:14:36.110872	\N	الجلسة الاولى لليوم الخامس للشفت الصباحي	تمارين تأهيلية	\N	\N	morning
3317	757	3	2026-04-02 08:38:37.607135	\N	الجلسة الرابعة مجانية	أجهزة علاج طبيعي	\N	\N	morning
3318	467	3	2026-04-02 09:25:32.572651	\N	الجلسة السادسة والاخيرة من البكج	روبوت	\N	\N	morning
3319	467	3	2026-04-02 09:25:37.404141	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3320	536	3	2026-04-02 09:31:58.172888	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
3321	846	3	2026-04-02 09:37:44.38642	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
3322	846	3	2026-04-02 09:38:01.947017	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3324	733	3	2026-04-02 10:53:33.072196	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3325	676	3	2026-04-02 10:54:51.753847	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4485	818	3	2026-04-19 13:36:35.135612	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3327	835	1	2026-04-02 11:18:15.547429	\N	جلسه ثانيه	أجهزة علاج طبيعي	\N	\N	morning
3328	748	3	2026-04-02 11:28:40.424626	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3343	855	1	2026-04-02 13:46:23.74368		لغرض اخذ القالب مع استلام اليد السلكونيه التجميله في نفس اليوم مع تسديد المبلغ بلكامل	\N	\N	\N	evening
3329	335	3	2026-04-02 11:48:09.629118	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3330	772	3	2026-04-02 11:48:26.524037	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3331	772	3	2026-04-02 11:48:36.382009	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3332	814	1	2026-04-02 11:59:15.258693	\N	جلسه اجهزه علاج طبيعي رابعه	أجهزة علاج طبيعي	\N	\N	morning
3333	848	2	2026-04-02 12:06:19.098964	\N	تم لبس الاصابع عدد 2 وتم الاستلام 	\N	\N	\N	morning
3334	763	1	2026-04-02 12:06:50.56772	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3335	763	1	2026-04-02 12:07:07.425482	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
3336	284	2	2026-04-02 12:08:39.19749	\N	صيانة قدم 	\N	\N	\N	morning
3337	849	2	2026-04-02 12:13:44.327592	\N	تبديل فالف 	\N	\N	\N	morning
3338	850	2	2026-04-02 12:19:46.148536	\N	تبديل فالف 	\N	\N	\N	morning
3339	242	3	2026-04-02 12:33:49.781255	\N	حضرت المريضه للاستشارة مع اخصائي العلاج الطبيعي عبد الله خان لغرض الروبوت ولن تباشر بالوقت الحالي نتيجة لكثرة التشنجات وسقوط القدم , وستباشر المريضه جلسات علاج طبيعي منتظم بالبداية حسب مواعيد خاصه لها 	استشارة طبية	\N	\N	morning
3340	784	3	2026-03-29 12:58:52	\N	الجلسة الاولى	أجهزة علاج طبيعي	\N	\N	morning
3341	855	1	2026-01-24 13:44:27	\N	تم مراجعه المركز لغرض شراء يد سلكونيه تجميليه وتم دفع 2 مليون دينار عراقي 	\N	\N	\N	evening
3342	855	1	2026-01-26 13:45:22	\N	تم مراجعه المركز لغرض اخذ القياسات ودرجه اللون 	\N	\N	\N	evening
3344	854	1	2026-04-02 14:03:14.023036	\N	تم فحص ومعاينه المريضه فقط 	\N	\N	\N	evening
3345	49	1	2026-04-02 14:05:07.790926	\N	استلام الطرف مع تغيير مكان الادبتر 	\N	\N	\N	evening
3346	856	1	2026-04-02 14:13:43.288351	\N	جلسه علاج طبيعي مجاني 	أجهزة علاج طبيعي	\N	\N	evening
3348	19	1	2026-04-02 14:18:45.053669	خدمة جديدة	خدمة أخرى (تكلفة: 1,250,000 د.ع) - شراء سليكون بلاج فورد مثقب مع سليب اتوبوك 	\N	\N	\N	\N
3349	718	3	2026-04-02 15:44:55.964858	\N		تمارين تأهيلية	\N	\N	evening
3350	810	3	2026-04-02 15:45:55.216326	\N	المريض اليوم اخذ جلسته الاولى كونه في المرة السابقة لم يأخذها لسبب دكتور حيدر حازم لم يحدد نوع العلاج الخاص به	استشارة طبية	\N	\N	evening
3351	852	3	2026-04-02 15:46:29.724658	\N	اخذ المريض استشارة ويباشر يوم السبت	استشارة طبية	\N	\N	evening
3352	812	3	2026-04-02 15:47:28.800477	\N		أجهزة علاج طبيعي	\N	\N	evening
3353	242	3	2026-04-02 15:48:52.230105	\N	المريضة اخذت استشارة في الشفت المسائي لكنها لم تباشر كونهم يريدون التأكد من وقتهم لحضور الجلسات	استشارة طبية	\N	\N	evening
3354	597	3	2026-04-02 15:49:14.451091	\N		أبر صينية	\N	\N	evening
3355	853	3	2026-04-02 15:49:44.790027	\N	المريض اخذ استشارة ويباشر يوم السبت	استشارة طبية	\N	\N	evening
3356	725	3	2026-04-02 15:50:13.503272	\N		أجهزة علاج طبيعي	\N	\N	evening
3357	829	3	2026-04-02 15:50:29.901617	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3358	829	3	2026-04-02 15:50:33.470244	\N		أجهزة علاج طبيعي	\N	\N	evening
3359	265	3	2026-04-02 15:50:45.879686	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3360	265	3	2026-04-02 15:50:53.299904	\N		أجهزة علاج طبيعي	\N	\N	evening
3361	779	3	2026-04-02 15:51:47.249892	\N		أجهزة علاج طبيعي	\N	\N	evening
3362	841	3	2026-04-02 15:52:03.085287	\N		أجهزة علاج طبيعي	\N	\N	evening
3363	675	3	2026-04-02 15:52:15.083653	\N		أجهزة علاج طبيعي	\N	\N	evening
3364	660	3	2026-04-02 15:52:29.426484	\N		أجهزة علاج طبيعي	\N	\N	evening
3365	307	3	2026-04-02 15:52:43.871831	\N		أجهزة علاج طبيعي	\N	\N	evening
3366	820	3	2026-04-02 15:53:06.479159	\N		أجهزة علاج طبيعي	\N	\N	evening
3367	783	3	2026-04-02 16:57:09.866708	\N	الجلسة الثانية لليوم الخامس الشفت المسائي	تمارين تأهيلية	\N	\N	evening
3368	747	3	2026-04-02 16:59:14.700344	\N		روبوت	\N	\N	evening
3369	817	3	2026-04-02 16:59:39.318792	\N		أجهزة علاج طبيعي	\N	\N	evening
3370	322	3	2026-04-02 17:02:54.169717	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (12 جلسة) (تكلفة: 300,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3371	818	3	2026-04-02 17:06:21.123242	\N		أجهزة علاج طبيعي	\N	\N	evening
3372	794	3	2026-04-02 17:06:39.99232	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3373	794	3	2026-04-02 17:06:43.512171	\N		أجهزة علاج طبيعي	\N	\N	evening
3374	792	3	2026-04-02 17:09:19.936316	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3375	792	3	2026-04-02 17:09:24.852826	\N		أجهزة علاج طبيعي	\N	\N	evening
3376	322	3	2026-04-02 17:13:50.366592	\N		أجهزة علاج طبيعي	\N	\N	evening
3532	689	3	2026-04-05 15:14:41.540216	\N		أجهزة علاج طبيعي	\N	\N	evening
4095	818	3	2026-04-13 14:54:54.422652	\N		أجهزة علاج طبيعي	\N	\N	evening
3377	799	3	2026-04-02 17:14:09.117927	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3378	799	3	2026-04-02 17:31:46.827559	\N		أجهزة علاج طبيعي	\N	\N	evening
3379	831	3	2026-04-02 17:32:06.628111	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3380	831	3	2026-04-02 17:32:23.133164	\N		أجهزة علاج طبيعي	\N	\N	evening
3381	793	3	2026-04-02 17:43:52.266766	\N		أجهزة علاج طبيعي	\N	\N	evening
3382	358	3	2026-04-02 17:45:59.678214	\N		أجهزة علاج طبيعي	\N	\N	evening
3383	424	3	2026-04-02 18:06:54.901308	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
3384	858	3	2026-04-02 18:42:12.319485	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3385	858	3	2026-04-02 18:42:50.685569	\N	المريض اخذ جلسة ابر صينية 	أجهزة علاج طبيعي	\N	\N	evening
3386	859	3	2026-04-02 19:06:45.274198	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3387	859	3	2026-04-02 19:07:51.43466	\N	المريض راقد في الطابق الرابع وطلب دكتور احمد يوسف استشارة له وعلاج طبيعي في الطابق فقط كون المريض لايستطيع التحرك نهائياً بسبب نسبة الاوكسجين لديه	تمارين تأهيلية	\N	\N	morning
3388	64	3	2026-04-04 05:31:38.069651	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3389	64	3	2026-04-04 05:31:47.813664	\N	جلسة مفردة 	تمارين تأهيلية	\N	\N	morning
3390	64	3	2026-01-31 05:32:59	\N	جلسة مفردة 	تمارين تأهيلية	\N	\N	morning
3391	64	3	2026-02-07 05:33:20	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3392	64	3	2026-02-14 05:34:06	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3393	64	3	2026-02-16 05:34:42	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3394	64	3	2026-02-18 05:35:03	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3395	64	3	2026-02-21 05:35:25	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3396	64	3	2026-02-23 05:35:44	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3397	64	3	2026-02-25 05:36:01	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3398	784	3	2026-04-04 05:37:57.28001	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3399	784	3	2026-04-04 05:38:02.314729	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3400	64	3	2026-03-28 05:43:04	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3401	64	3	2026-03-30 05:43:40	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3402	700	3	2026-04-04 05:50:53.063555	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3403	770	3	2026-04-04 05:53:15.327485	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3404	771	3	2026-04-04 05:54:11.118469	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3405	662	3	2026-04-04 07:20:19.418533	\N	جلسة مفردة محجوزة مسبقا	أجهزة علاج طبيعي	\N	\N	morning
3406	774	2	2026-04-04 07:20:25.295022	\N	تم لبس الطرف وتم الاستلام	\N	\N	\N	morning
3407	860	2	2026-04-04 07:55:47.324704	\N	تم الفحص وتحديد له طرف 3r78 سعره 10875000 د او طرف ميركوري سعره1915000د 	\N	\N	\N	morning
3408	716	3	2026-04-04 08:03:45.065815	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3409	861	3	2026-04-04 08:34:42.807034	\N	زارنا المريض بعدما ان نصحه احد اقاربه الذي يعمل في المستشفى حيث كان يعاني المريض من انزلاق بالفقرات القطنية منذ نهاية التسعينات لكن المريض غير ملتزم بوضعه الصحية	استشارة طبية	\N	\N	morning
3410	686	3	2026-04-04 08:36:36.906873	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3411	467	3	2026-04-04 08:40:37.710182	خدمة جديدة	جلسات علاج إضافية - روبوت (6 جلسة) (تكلفة: 300,000 د.ع) - باشر المريض ببكج جديد	روبوت	\N	\N	\N
3412	467	3	2026-04-04 08:41:09.448507	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشر المريض ببكج جديد	أجهزة علاج طبيعي	\N	\N	\N
3413	467	3	2026-04-04 08:41:47.243383	\N	الجلسة الاولى من البكج	روبوت	\N	\N	morning
3414	467	3	2026-04-04 08:42:09.566607	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
3326	847	1	2026-04-02 10:56:27.45696		تم فحص ومعاينه المريض وتم تحديد مسند ظهر sclosiy مع اخذ قالب  مع استلام المسند في نفس اليوم	\N	\N	\N	morning
3415	400	1	2026-04-02 10:43:07	\N	فحص القالب مع التدريب واستلام الطرف	\N	\N	\N	morning
3416	354	1	2026-04-02 10:43:56	\N	فحص القالب test بعد الاعاده 	\N	\N	\N	morning
3347	19	1	2026-04-02 14:16:42.972128		تم مراجعه المركز لشراء سليكون بلاج فورد مثقب مع سليب اتوبوك بسعر مليون 250000 مع صيانه قالب	\N	\N	\N	evening
3417	788	3	2026-04-04 11:13:51.126256	\N	الجلسة الثانية من البكج	روبوت	\N	\N	morning
3418	823	3	2026-04-04 11:14:11.949466	\N	الجلسة الثانية من البكج	تمارين تأهيلية	\N	\N	morning
3419	596	1	2026-04-04 11:29:24.754099	\N	تم تحويل مبلغ قدره 750000 الف دينار عراقي	\N	\N	\N	morning
3420	614	1	2026-04-04 11:32:10.506393	\N	تم تحويل مبلغ مالي قدره 250000 الف دينار عراقي وتم تسديد المبلغ كامل	\N	\N	\N	morning
3421	643	1	2026-04-04 11:33:11.588298	\N	تم تحويل مبلغ وقدره 250000 الف دينار عراقي 	\N	\N	\N	morning
3422	863	2	2026-04-04 12:01:36.769199	\N	تم اخذ له قالب بانتظار الدفع 	\N	\N	\N	morning
3423	751	3	2026-04-04 12:02:41.615612	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3424	864	2	2026-04-04 12:05:05.224727	\N	يحتاج الى عملية وبعدها يتم تركيب الاصابع التجميلية 	\N	\N	\N	morning
3643	857	3	2026-04-06 18:07:41.181744	\N		أجهزة علاج طبيعي	\N	\N	evening
3425	805	3	2026-04-04 12:08:28.464528	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3426	772	3	2026-04-04 12:16:41.188014	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3427	772	3	2026-04-04 12:16:50.194441	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3428	814	1	2026-04-04 12:21:48.417986	\N	جلسه اجهزه علاج طبيعي خامسه	أجهزة علاج طبيعي	\N	\N	morning
3429	763	1	2026-04-04 12:33:16.347544	خدمة جديدة	جلسات علاج إضافية - روبوت (5 جلسة) (تكلفة: 250,000 د.ع)	روبوت	\N	\N	\N
3430	763	1	2026-04-04 12:33:54.167565	\N	جلسه روبوت 	روبوت	\N	\N	morning
4486	818	3	2026-04-19 13:36:41.483848	\N		أبر صينية	\N	\N	evening
3432	862	3	2026-04-04 12:58:42.517922	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشرت المريضه اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
3434	856	1	2026-04-04 13:19:55.838394	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (9 جلسة) (تكلفة: 225,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3435	856	1	2026-04-04 13:20:36.749688	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	evening
3436	867	3	2026-04-04 14:01:45.291989	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3437	867	3	2026-04-04 14:04:09.083861	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3438	778	3	2026-04-04 14:12:22.175424	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3439	778	3	2026-04-04 14:12:27.729955	\N		أجهزة علاج طبيعي	\N	\N	evening
3440	718	3	2026-04-04 14:12:55.071066	\N		تمارين تأهيلية	\N	\N	evening
3441	777	3	2026-04-04 14:13:10.491313	\N		أجهزة علاج طبيعي	\N	\N	evening
3442	810	3	2026-04-04 14:18:18.291152	\N		أجهزة علاج طبيعي	\N	\N	evening
3443	458	3	2026-04-04 14:19:03.873881	\N		روبوت	\N	\N	evening
3444	783	3	2026-04-04 14:24:20.25852	\N	الجلسة الثانية لليوم السادس في الشفت المسائي	تمارين تأهيلية	\N	\N	evening
3445	783	3	2026-04-04 14:25:29.147673	\N	الجلسة الاولى لليوم السادس في الشفت الصباحي	تمارين تأهيلية	\N	\N	evening
3446	188	3	2026-04-04 14:25:57.344137	\N		أجهزة علاج طبيعي	\N	\N	evening
3447	813	3	2026-04-04 14:48:22.756069	\N		أجهزة علاج طبيعي	\N	\N	evening
3448	660	3	2026-04-04 15:15:18.715967	\N	الجلسة مجانية من البكج	استشارة طبية	\N	\N	evening
3449	874	1	2026-04-04 15:52:12.741574	\N	جلسه علاج طبيعي اولى 	أجهزة علاج طبيعي	\N	\N	evening
3450	870	3	2026-04-04 15:54:31.337938	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3451	870	3	2026-04-04 15:55:00.407402	\N	باشرت المريضة بعد الإستشارة	أجهزة علاج طبيعي	\N	\N	evening
3452	818	3	2026-04-04 16:02:10.603999	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3453	818	3	2026-04-04 16:02:14.958504	\N		أجهزة علاج طبيعي	\N	\N	evening
3454	817	3	2026-04-04 16:03:54.09375	\N		روبوت	\N	\N	evening
3455	854	1	2026-04-04 17:02:15.019537	\N	تغيير مكان الادبتر 	\N	\N	\N	evening
3456	21	1	2026-04-04 17:02:36.651422	\N	صيانه قالب	\N	\N	\N	evening
3457	399	1	2026-04-04 17:02:59.334408	\N	تعيار	\N	\N	\N	evening
3458	871	1	2026-04-04 17:03:21.916213	\N	صيانه قالب	\N	\N	\N	evening
3459	678	1	2026-04-04 17:03:40.482374	\N	صيانه 	\N	\N	\N	evening
3460	322	3	2026-04-04 17:05:56.343808	\N		أجهزة علاج طبيعي	\N	\N	evening
3461	875	3	2026-04-04 17:25:42.533631	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3462	875	3	2026-04-04 17:25:46.523811	\N		أجهزة علاج طبيعي	\N	\N	evening
3463	875	3	2026-04-04 17:26:12.082457	\N	باشر المريض بعد الاستشارة 	استشارة طبية	\N	\N	evening
3464	875	3	2026-04-04 17:56:30.874362	\N	جلسة ابر صينية	استشارة طبية	\N	\N	evening
3465	857	3	2026-04-04 17:56:55.411272	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3466	857	3	2026-04-04 18:04:01.652596	\N	باشر المريض بعد استشارة سابقة	أجهزة علاج طبيعي	\N	\N	evening
3467	792	3	2026-04-04 18:05:43.474497	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3468	792	3	2026-04-04 18:05:47.005878	\N		أجهزة علاج طبيعي	\N	\N	evening
3469	831	3	2026-04-04 18:06:41.45213	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3470	831	3	2026-04-04 18:06:44.308925	\N		أجهزة علاج طبيعي	\N	\N	evening
3471	644	3	2026-04-04 18:08:50.443157	\N	المريضة اخذت اليوم الجلسة بعد ان دفعت سعر الجلسة مسبقاً	استشارة طبية	\N	\N	evening
3472	670	3	2026-04-04 18:12:57.32121	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3473	670	3	2026-04-04 18:13:01.256025	\N		أجهزة علاج طبيعي	\N	\N	evening
3474	873	3	2026-04-04 18:15:12.294918	\N	المريضة اخذت استشارة وتباشر يوم غد	استشارة طبية	\N	\N	evening
3475	872	3	2026-04-04 18:15:36.487999	\N	المريض اخذ استشارة ويباشر يوم غد	استشارة طبية	\N	\N	evening
3476	869	3	2026-04-04 18:16:03.640239	\N	المريض اخذ استشارة ويباشر بعد مدة	استشارة طبية	\N	\N	evening
3477	868	3	2026-04-04 18:16:33.193092	\N	المريض سجل معلوماته فقط ويأخذ الاستشارة يوم غد	استشارة طبية	\N	\N	evening
3478	424	3	2026-04-04 18:37:56.710265	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3479	424	3	2026-04-04 18:38:07.626663	\N		روبوت	\N	\N	evening
3480	822	3	2026-04-05 05:31:31.905344	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3481	692	3	2026-04-05 05:32:13.663719	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3482	785	3	2026-04-05 05:35:03.99831	\N	جلسة محجوزة مسبقا	روبوت	\N	\N	morning
3483	784	3	2026-04-05 05:49:02.451947	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3484	784	3	2026-04-05 05:49:10.534742	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3485	822	3	2026-04-05 05:49:58.365281	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3486	503	3	2026-04-05 05:51:19.227028	\N	الجلسة المجانية من العرض 	أجهزة علاج طبيعي	\N	\N	morning
3487	785	3	2026-04-05 05:55:42.807147	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع) - حجز للجلسة القادمة 	روبوت	\N	\N	\N
3488	153	3	2026-04-05 05:58:46.451013	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3489	153	3	2026-04-05 05:58:58.655626	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3490	474	3	2026-04-05 06:44:55.142253	\N	جلسة رقم 17 من البكج	تمارين تأهيلية	\N	\N	morning
3491	393	3	2026-04-05 07:48:25.42154	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3492	393	3	2026-04-05 07:48:40.424143	\N	جلسة مفردة 	تمارين تأهيلية	\N	\N	morning
3493	878	2	2026-04-05 07:55:44.715755	\N	تم اعطاءه سليف مجاني 	\N	\N	\N	morning
3494	589	3	2026-04-05 08:15:40.872304	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3495	879	2	2026-04-05 08:32:14.557473	\N	تم شراء طرف 3r78بسعر 10875000 د	\N	\N	\N	morning
3496	880	3	2026-04-05 08:41:46.797403	\N	باشرت المريض بعدما اكملت استشارة عند دكتور عبد الله خان حيث كانت تعاني من انزلاق بالفقرات بالرقبة وعملت عملية جراحية لكنها فشلت لذلك جاءت لعمل جلسات علاج طبيعي.	أجهزة علاج طبيعي	\N	\N	morning
3497	880	3	2026-04-05 08:42:03.194957	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (8 جلسة) (تكلفة: 200,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3498	880	3	2026-04-05 08:43:22.211495	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
440	233	2	2026-02-05 08:44:49	شراء سيليكون هيما حلقي بقيمة 450000	مراجع سابق	\N	\N	\N	\N
3501	846	3	2026-04-05 08:49:25.310392	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3503	850	2	2026-04-02 08:52:23	خدمة جديدة	صيانة الطرف الصناعي (تكلفة: 50,000 د.ع) - تبديل فالف	\N	\N	\N	\N
3502	849	2	2026-04-02 08:54:08	خدمة جديدة	صيانة الطرف الصناعي (تكلفة: 60,000 د.ع) - تبديل فالف	\N	\N	\N	\N
3499	233	2	2026-03-31 08:55:42	خدمة جديدة	تعديل أو ضبط (تكلفة: 250,000 د.ع) - شراء تيوب مع ادابتر مع اجراء صيانة	\N	\N	\N	\N
3156	233	2	2026-03-31 08:56:00		شراء ادابتر مع تيوب 	\N	\N	\N	morning
3500	809	2	2026-04-01 08:58:01	خدمة جديدة	خدمة أخرى (تكلفة: 1,000,000 د.ع) - شراء سيليكون اوزسور حلقي 	\N	\N	\N	\N
3504	467	3	2026-04-05 08:58:59.046351	\N	جلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3505	467	3	2026-04-05 08:59:07.979167	\N	جلسة الثانية من البكج	روبوت	\N	\N	morning
3506	536	3	2026-04-05 09:18:56.42169	\N	الجلسة الرابعة من البكج	تمارين تأهيلية	\N	\N	morning
3507	733	3	2026-04-05 11:51:39.435977	\N	الجلسة الرابعه من البكج	أجهزة علاج طبيعي	\N	\N	morning
3508	676	3	2026-04-05 11:52:21.968664	\N	الجلسة السادسة والاخيره من البكج	أجهزة علاج طبيعي	\N	\N	morning
3509	335	3	2026-04-05 11:54:57.145753	\N	الجلسة الثالثه من البكج	أجهزة علاج طبيعي	\N	\N	morning
3510	589	3	2026-04-05 12:04:01.3332	\N	جلسة مفردة 	تمارين تأهيلية	\N	\N	morning
3511	748	3	2026-04-05 13:11:38.709002	\N	الجلسة الاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	evening
3512	458	3	2026-04-05 13:12:27.691284	\N		روبوت	\N	\N	evening
3513	265	3	2026-04-05 13:14:37.711578	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	evening
3514	265	3	2026-04-05 13:14:56.971106	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3515	810	3	2026-04-05 13:17:17.057508	\N		أجهزة علاج طبيعي	\N	\N	evening
3516	819	3	2026-04-05 13:28:17.439448	\N		تمارين تأهيلية	\N	\N	evening
3517	868	3	2026-04-05 13:32:04.038467	\N	جاء المريض لاخذ الاستشارة 	استشارة طبية	\N	\N	evening
3518	881	1	2026-04-05 13:35:23.015863	\N	فحص ومعاينه مع اخذ قالب 	\N	\N	\N	evening
3520	868	3	2026-04-05 13:47:21.951657	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3521	868	3	2026-04-05 13:47:35.254248	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3522	812	3	2026-04-05 13:48:26.99702	\N		أجهزة علاج طبيعي	\N	\N	evening
3523	856	1	2026-04-05 13:51:53.158407	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	evening
3524	868	3	2026-04-05 14:29:14.068943	\N		أجهزة علاج طبيعي	\N	\N	evening
3525	868	3	2026-04-05 14:29:23.352538	\N		أبر صينية	\N	\N	evening
3526	514	4	2026-04-05 14:34:48.420955	\N	تسديد قسط	\N	\N	\N	evening
4487	725	3	2026-04-19 13:54:04.532822	\N		أجهزة علاج طبيعي	\N	\N	evening
3528	725	3	2026-04-05 14:42:40.892013	\N		أجهزة علاج طبيعي	\N	\N	evening
3529	882	1	2026-04-05 14:55:36.830833	\N	تعديل على انسول عدد كلا الجهتين	\N	\N	\N	evening
3530	689	3	2026-04-05 15:13:55.128734	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3519	780	1	2026-04-05 13:35:52.152276		جلسه علاج طبيعي ثامنه	أجهزة علاج طبيعي	\N	\N	evening
3533	884	3	2026-04-05 15:26:26.892383	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3534	885	1	2026-04-05 15:27:53.365647	\N	صيانه قالب	\N	\N	\N	evening
3535	884	3	2026-04-05 15:33:50.787143	\N		أجهزة علاج طبيعي	\N	\N	evening
3536	838	1	2026-04-05 15:56:27.952554	\N	استلام مساند انسول عدد 2	\N	\N	\N	evening
3537	650	1	2026-04-05 16:12:57.730864	\N	استلام مسند كيفو الماني	\N	\N	\N	evening
3538	883	3	2026-04-05 16:37:26.187306	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3539	883	3	2026-04-05 16:37:48.335789	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3540	888	3	2026-04-05 17:00:34.76674	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3541	888	3	2026-04-05 17:00:54.706786	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3542	888	3	2026-04-05 17:00:58.612476	\N		أجهزة علاج طبيعي	\N	\N	evening
3543	888	3	2026-04-05 17:01:02.53125	\N		أبر صينية	\N	\N	evening
3544	886	3	2026-04-05 17:35:37.048799	\N	استشارة وتباشر غدا	استشارة طبية	\N	\N	evening
3545	887	3	2026-04-05 17:36:10.542053	\N	استشارة ويباشر غدا	استشارة طبية	\N	\N	evening
3546	797	3	2026-04-05 17:43:50.913813	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3547	797	3	2026-04-05 17:43:56.925275	\N		أجهزة علاج طبيعي	\N	\N	evening
3548	794	3	2026-04-05 17:46:08.721326	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3549	794	3	2026-04-05 17:46:13.777899	\N		أجهزة علاج طبيعي	\N	\N	evening
3550	222	3	2026-04-05 17:46:32.985449	\N		تمارين تأهيلية	\N	\N	evening
3551	817	3	2026-04-05 17:47:32.491502	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3552	817	3	2026-04-05 17:47:37.50637	\N		روبوت	\N	\N	evening
3553	818	3	2026-04-05 17:48:13.445515	\N		أجهزة علاج طبيعي	\N	\N	evening
3554	799	3	2026-04-05 17:48:29.283203	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3555	799	3	2026-04-05 17:48:32.726173	\N		أجهزة علاج طبيعي	\N	\N	evening
3556	311	3	2026-04-05 17:48:43.721556	\N		أجهزة علاج طبيعي	\N	\N	evening
3557	567	3	2026-04-05 17:48:59.261941	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3558	567	3	2026-04-05 17:49:02.441004	\N		أجهزة علاج طبيعي	\N	\N	evening
3559	793	3	2026-04-05 17:49:21.253311	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3560	793	3	2026-04-05 17:49:31.359069	\N		أجهزة علاج طبيعي	\N	\N	evening
3561	792	3	2026-04-05 17:49:49.479029	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3562	792	3	2026-04-05 17:49:53.242934	\N		أجهزة علاج طبيعي	\N	\N	evening
3563	857	3	2026-04-05 17:58:38.936461	\N		أجهزة علاج طبيعي	\N	\N	evening
3564	424	3	2026-04-05 18:25:42.202955	\N	المريض الجلسة السابقة لم يستطع اكمال جلسته الروبوت بسبب خلل فني في الجهاز وعليه المريض اليوم اكمل الجلسة	استشارة طبية	\N	\N	evening
3565	783	3	2026-04-05 19:06:06.022776	\N	الجلسة الثانية اليوم السادس الشفت المسائي	تمارين تأهيلية	\N	\N	morning
3566	770	3	2026-04-06 05:23:13.361806	\N	الجلسة الرابعة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3567	771	3	2026-04-06 05:23:38.554304	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3568	64	3	2026-04-06 05:26:44.684117	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3569	64	3	2026-04-06 05:26:53.128929	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3570	784	3	2026-04-06 05:39:35.581993	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3571	784	3	2026-04-06 05:39:45.568618	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3572	802	3	2026-04-06 05:41:59.428329	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3573	802	3	2026-04-06 05:42:06.684532	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3574	846	3	2026-04-06 06:51:56.630123	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3575	889	3	2026-04-06 07:25:10.418018	\N	حضرت المريضة لغرض الاستشارة، إلا أنها لم تباشر الجلسة، وذلك لرغبتها في مراجعة الطبيب الذي أجرى لها العملية سابقًا واستشارته أولًا	استشارة طبية	\N	\N	morning
3579	880	3	2026-04-06 08:25:27.371161	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3578	892	2	2026-04-06 08:25:55		تم اخذ قالب ( م مصطفى )	\N	\N	\N	morning
3577	891	2	2026-04-06 08:28:11		تم اخذ قالب ( م مصطفى )	\N	\N	\N	morning
3580	495	3	2026-04-06 08:35:53.916381	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3581	495	3	2026-04-06 08:36:37.506968	\N	حضر المريض للاستشارة من جديد وبدء اول جلسات العلاج الطبيعي الخاصه بهذا الكورس مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	morning
3582	783	3	2026-04-06 08:39:50.110937	\N	الجلسة الاولى لليوم الشابع في الشفت الصباحي	تمارين تأهيلية	\N	\N	morning
3583	467	3	2026-04-06 08:48:30.699139	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3584	467	3	2026-04-06 08:48:34.320084	\N	الجلسة الثالثة من البكج	روبوت	\N	\N	morning
3585	893	2	2026-04-06 09:37:45		تم اخذ قالب ( م مصطفى )	\N	\N	\N	morning
3586	823	3	2026-04-06 11:34:29.213765	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
3587	763	1	2026-04-06 11:35:22.556764	خدمة جديدة	جلسات علاج إضافية - روبوت (4 جلسة) (تكلفة: 200,000 د.ع)	روبوت	\N	\N	\N
3588	806	3	2026-04-06 11:35:33.613487	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3589	763	1	2026-04-06 11:35:41.864554	\N	جلسه روبوت	روبوت	\N	\N	morning
3590	806	3	2026-04-06 11:35:56.210309	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3591	772	3	2026-04-06 11:40:51.224538	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3592	772	3	2026-04-06 11:41:00.02105	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4438	999	3	2026-04-18 18:32:26.276765	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3594	881	1	2026-04-06 11:44:49.14571	\N	تم تحويل مبلغ وقدره 2 مليون دينار عراقي	\N	\N	\N	morning
3595	865	3	2026-04-05 12:07:28	\N	حضر المريض للاستشارة مع اخصائي العلاج الطبيعي عبد الله خان وسيباشر بعد تحديد موعد خاص به 	استشارة طبية	\N	\N	morning
3596	125	3	2026-04-06 12:18:20.357959	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3597	890	3	2026-04-06 12:48:19.174784	\N	حضرت المريضه لاجراء جلسة علاج طبيعي تتضمن تمارين تاهيليه 	تمارين تأهيلية	\N	\N	morning
3599	874	1	2026-04-06 13:11:10.446918	\N		أجهزة علاج طبيعي	\N	\N	evening
3601	44	1	2026-04-06 13:15:02.185164	\N	لغرض التعيار	\N	\N	\N	evening
3602	856	1	2026-04-06 13:33:51.556208	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	evening
3603	718	3	2026-04-06 13:37:47.797184	\N		تمارين تأهيلية	\N	\N	evening
3604	458	3	2026-04-06 13:38:26.4734	\N		روبوت	\N	\N	evening
3605	810	3	2026-04-06 13:39:37.277561	\N		أجهزة علاج طبيعي	\N	\N	evening
3606	817	3	2026-04-06 13:39:57.864826	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3607	817	3	2026-04-06 13:40:02.625204	\N		روبوت	\N	\N	evening
3608	818	3	2026-04-06 13:40:16.341361	\N		أجهزة علاج طبيعي	\N	\N	evening
3609	608	3	2026-04-06 13:41:00.297376	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3610	608	3	2026-04-06 13:41:06.160947	\N		أجهزة علاج طبيعي	\N	\N	evening
3611	819	3	2026-04-06 13:44:17.499691	\N		تمارين تأهيلية	\N	\N	evening
3612	400	1	2026-04-06 14:04:58.992468	\N	تم تحويل مبلغ مالي قدره 125000 الف دينار عراقي 	\N	\N	\N	evening
3613	765	1	2026-04-06 14:07:13.708517	\N	اخذ قالب 	\N	\N	\N	evening
3614	779	3	2026-04-06 14:17:42.126589	\N		أجهزة علاج طبيعي	\N	\N	evening
3615	895	1	2026-04-06 14:21:21.047433	خدمة جديدة	خدمة أخرى (تكلفة: 40,000 د.ع) - دبان عدد 2 مع تعليه 4 سم 	\N	\N	\N	\N
3616	894	3	2026-04-06 14:29:53.66262	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3617	894	3	2026-04-06 14:30:01.281065	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3618	894	3	2026-04-06 14:32:05.213545	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
3619	894	3	2026-04-06 14:32:08.921323	\N		أبر صينية	\N	\N	evening
3620	841	3	2026-04-06 14:40:35.759425	\N		أجهزة علاج طبيعي	\N	\N	evening
3621	813	3	2026-04-06 14:55:00.066401	\N		أجهزة علاج طبيعي	\N	\N	evening
3622	897	1	2026-04-06 15:05:44.318968	\N	فحص ومعاينه المريض مع اخذ قياسات للمسند	\N	\N	\N	evening
3623	874	1	2026-04-06 15:10:45.08226	\N	جلسه علاج طبيعي 	أجهزة علاج طبيعي	\N	\N	evening
3624	888	3	2026-04-06 15:15:10.610884	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3625	888	3	2026-04-06 15:15:19.489847	\N		أجهزة علاج طبيعي	\N	\N	evening
3626	458	3	2026-04-06 15:16:12.034681	\N	تاريخ 4/4	تمارين تأهيلية	\N	\N	evening
3627	458	3	2026-04-06 15:16:26.483251	\N	تاريخ 4/5	تمارين تأهيلية	\N	\N	evening
3628	458	3	2026-04-06 15:17:32.759545	\N	تاريخ 4/6\nالمريض اخذ هذه الجلسات من المبلغ المدفوع للروبوت	تمارين تأهيلية	\N	\N	evening
3629	307	3	2026-04-06 15:39:58.149704	\N		أجهزة علاج طبيعي	\N	\N	evening
3630	747	3	2026-04-06 16:16:50.695712	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3631	747	3	2026-04-06 16:25:25.826598	\N		روبوت	\N	\N	evening
3632	670	3	2026-04-06 16:56:51.459129	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3633	670	3	2026-04-06 16:56:55.084204	\N		أجهزة علاج طبيعي	\N	\N	evening
3634	886	3	2026-04-06 16:57:36.310524	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3635	886	3	2026-04-06 17:03:25.993948	\N		أجهزة علاج طبيعي	\N	\N	evening
3636	820	3	2026-04-06 17:05:10.182771	\N		أجهزة علاج طبيعي	\N	\N	evening
3637	322	3	2026-04-06 17:18:23.0018	\N		أجهزة علاج طبيعي	\N	\N	evening
3638	831	3	2026-04-06 17:22:39.255419	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3639	831	3	2026-04-06 17:22:42.864472	\N		أجهزة علاج طبيعي	\N	\N	evening
3640	783	3	2026-04-06 17:24:49.942208	\N	الجلسة الثانية لليوم السابع شفت مسائي	تمارين تأهيلية	\N	\N	evening
3641	887	3	2026-04-06 17:42:25.719398	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3642	887	3	2026-04-06 17:42:29.360533	\N		أجهزة علاج طبيعي	\N	\N	evening
3600	780	1	2026-04-06 13:14:03.531379		جلسه علاج طبيعي تاسعه	أجهزة علاج طبيعي	\N	\N	evening
3644	822	3	2026-04-07 05:36:08.464197	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3645	822	3	2026-04-07 05:36:15.600993	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3646	785	3	2026-04-07 05:36:45.403162	\N	جلسة محجوزة مسبقا	روبوت	\N	\N	morning
3647	700	3	2026-04-07 05:41:03.528538	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3648	153	3	2026-04-07 05:56:45.652269	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3649	153	3	2026-04-07 05:56:53.252443	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3650	785	3	2026-04-07 06:14:28.63354	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع) - حجز للجلسة القادمة 	روبوت	\N	\N	\N
3651	899	3	2026-04-07 06:23:28.112317	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة 	أجهزة علاج طبيعي	\N	\N	\N
3652	899	3	2026-04-07 06:23:37.3265	\N	باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	morning
3653	509	3	2026-04-07 06:35:56.376267	\N	الجلسة التاسعه مجانية	تمارين تأهيلية	\N	\N	morning
3654	700	3	2026-04-07 07:01:27.725563	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3655	474	3	2026-04-07 07:27:07.00277	\N	جلسة رقم 18 من البكج	تمارين تأهيلية	\N	\N	morning
3656	757	3	2026-04-07 07:27:23.992229	\N	الجلسة الخامسة مجانية	أجهزة علاج طبيعي	\N	\N	morning
3657	865	3	2026-04-07 07:40:31.86688	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (2 جلسة) (تكلفة: 50,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد استشارة مسبقه	تمارين تأهيلية	\N	\N	\N
3658	865	3	2026-04-07 07:40:58.032415	\N	الجلسة الاولى 	تمارين تأهيلية	\N	\N	morning
3659	880	3	2026-04-07 07:45:05.579327	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3660	692	3	2026-04-07 07:46:35.909937	\N	الجلسة الرابعه والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3661	495	3	2026-04-07 07:51:53.221841	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3662	900	3	2026-04-07 08:09:10.274128	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	\N
3663	900	3	2026-04-07 08:09:18.366933	\N	الجلسة الاولى 	أجهزة علاج طبيعي	\N	\N	morning
3664	784	3	2026-04-07 08:28:21.589747	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3665	784	3	2026-04-07 08:28:28.689994	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3666	467	3	2026-04-07 08:52:52.563749	\N	الجلسة الرابعة من البكج	روبوت	\N	\N	morning
3667	467	3	2026-04-07 08:52:56.416271	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3668	846	3	2026-04-07 09:06:13.598165	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3669	875	3	2026-04-07 09:30:19.962283	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (5 جلسة) (تكلفة: 125,000 د.ع) - حضر المريض للاستشاره مع اخصائي العلاج عبد الله خان وحاسب للجلسات القادمه وسيباشر حسب موعده 	أجهزة علاج طبيعي	\N	\N	\N
3670	901	3	2026-04-07 11:11:47.591998	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	\N
3671	901	3	2026-04-07 11:11:55.415033	\N	الجلسه الاولى 	أجهزة علاج طبيعي	\N	\N	morning
3672	783	3	2026-04-07 11:28:49.931482	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (18 جلسة) (تكلفة: 450,000 د.ع) - بكج جديد يبدء من تاريخ اليوم 	تمارين تأهيلية	\N	\N	\N
3673	783	3	2026-04-07 11:29:10.471816	\N	الجلسه الاولى لليوم الاول للصباحي 	تمارين تأهيلية	\N	\N	morning
3674	545	3	2026-04-07 12:08:27.950829	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3675	545	3	2026-04-07 12:08:35.905865	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3676	733	3	2026-04-07 12:10:33.507624	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3677	902	2	2026-04-07 12:18:19.435828	\N	تم لبس اليد وتم الاستلام 	\N	\N	\N	morning
3678	903	2	2026-04-07 12:21:03.380098	\N	صيانة ادبتر قدم 	\N	\N	\N	morning
3679	904	2	2026-04-07 12:26:13.319363	\N	تم عرض لها طرف تحت الركبة ثابت بانتظار الدفع	\N	\N	\N	morning
3680	905	2	2026-04-07 12:31:19.105095	\N	تم اخذ قالب /مجاني 	\N	\N	\N	morning
3681	906	2	2026-04-07 12:36:50.823349	\N	تم الفحص له كافة الاطراف ولديه كتاب حسب طلبه تم رفع له الى مجلس محافظة البصرة بانتظار الجواب 	\N	\N	\N	morning
3593	871	1	2026-04-06 11:41:23.176168		تم مراجعه المركز لغرض اخذ قالب مجاني مع استلام  	\N	\N	\N	morning
3682	907	1	2026-04-07 12:58:57.440268	\N	فحص ومعاينه 	\N	\N	\N	morning
3683	856	1	2026-04-07 12:59:48.420082	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	morning
4488	1010	3	2026-04-19 14:11:33.19608	\N		أجهزة علاج طبيعي	\N	\N	evening
3685	265	3	2026-04-07 13:17:39.288339	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (7 جلسة) (تكلفة: 175,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3686	265	3	2026-04-07 13:17:53.601652	\N		أجهزة علاج طبيعي	\N	\N	evening
3687	778	3	2026-04-07 13:18:31.367451	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3688	778	3	2026-04-07 13:18:35.842578	\N		أجهزة علاج طبيعي	\N	\N	evening
3689	458	3	2026-04-07 13:19:25.130333	\N		روبوت	\N	\N	evening
3690	458	3	2026-04-07 13:19:41.336871	\N		تمارين تأهيلية	\N	\N	evening
3691	675	3	2026-04-07 13:20:43.046079	\N		أجهزة علاج طبيعي	\N	\N	evening
3692	908	1	2026-04-07 13:49:25.569849	\N	فحص ومعاينه فقط 	استشارة طبية	\N	\N	evening
3693	909	3	2026-04-07 14:05:52.13099	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3694	909	3	2026-04-07 14:07:06.146566	\N	باشر المريض بعد الاستشارة التي اجراها دكتور مصطفى العضاض لهم	أجهزة علاج طبيعي	\N	\N	evening
3695	812	3	2026-04-07 14:16:13.383719	\N		أجهزة علاج طبيعي	\N	\N	evening
3696	819	3	2026-04-07 14:16:32.453726	\N		تمارين تأهيلية	\N	\N	evening
3697	725	3	2026-04-07 14:16:51.39933	\N		أجهزة علاج طبيعي	\N	\N	evening
3698	660	3	2026-04-07 15:08:53.137189	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3699	660	3	2026-04-07 15:08:59.465283	\N		أجهزة علاج طبيعي	\N	\N	evening
3700	910	1	2026-04-07 15:23:32.839871	\N	فحص ومعاينه	\N	\N	\N	evening
3701	884	3	2026-04-07 15:36:45.002691	\N		أجهزة علاج طبيعي	\N	\N	evening
3702	888	3	2026-04-07 15:40:09.112045	\N		أجهزة علاج طبيعي	\N	\N	evening
3703	594	1	2026-04-07 15:44:59.610541	\N	تم تحويل مبلغ مالي وقدره 500000 الف دينار عراقي	\N	\N	\N	evening
3704	874	1	2026-04-07 15:49:25.64979	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
3705	911	3	2026-04-07 16:28:09.575037	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3706	911	3	2026-04-07 16:28:28.464654	\N	باشرت المريضة بعد استشارة دكتور مصطفى 	أبر صينية	\N	\N	evening
3707	222	3	2026-04-07 16:28:53.37702	\N		تمارين تأهيلية	\N	\N	evening
3708	350	1	2026-04-07 16:58:15.260141	\N	سحب ثانوي كاربون 	\N	\N	\N	evening
3709	792	3	2026-04-07 16:59:23.637706	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3710	792	3	2026-04-07 16:59:26.880893	\N		أجهزة علاج طبيعي	\N	\N	evening
3711	883	3	2026-04-07 17:14:29.223567	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3712	883	3	2026-04-07 17:14:36.017428	\N		أجهزة علاج طبيعي	\N	\N	evening
3713	912	3	2026-04-07 17:25:45.696274	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3714	311	3	2026-04-07 17:26:13.888874	\N		أجهزة علاج طبيعي	\N	\N	evening
3715	912	3	2026-04-07 17:28:16.636011	\N	باشر المريض بعد استشارة دكتور مصطفى	أجهزة علاج طبيعي	\N	\N	evening
3716	783	3	2026-04-07 18:19:44.38667	\N	الجلسة الاولى اليوم الاول الشفت المسائي	تمارين تأهيلية	\N	\N	evening
3717	887	3	2026-04-07 18:20:11.200418	\N		أجهزة علاج طبيعي	\N	\N	evening
3718	424	3	2026-04-07 18:24:49.848301	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3719	424	3	2026-04-07 18:24:53.502658	\N		روبوت	\N	\N	evening
3720	793	3	2026-04-07 18:56:09.708385	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3721	793	3	2026-04-07 18:56:12.766219	\N		أجهزة علاج طبيعي	\N	\N	evening
3722	784	3	2026-04-08 05:29:04.255176	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3723	784	3	2026-04-08 05:29:32.52857	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3724	901	3	2026-04-08 05:34:28.987462	\N	الجلسة الثانية والاخيرة 	أجهزة علاج طبيعي	\N	\N	morning
3725	509	3	2026-04-08 05:37:22.259574	\N	الجلسة 10 مجانية	تمارين تأهيلية	\N	\N	morning
3726	771	3	2026-04-08 05:51:51.384062	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3727	900	3	2026-04-08 06:29:15.665134	\N	الجلسة الثانية 	أجهزة علاج طبيعي	\N	\N	morning
3728	890	3	2026-04-08 06:54:23.795756	\N		تمارين تأهيلية	\N	\N	morning
3729	767	3	2026-04-08 06:55:49.639211	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3730	149	3	2026-04-08 07:09:31.79722	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3731	495	3	2026-04-08 07:46:32.828636	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3732	880	3	2026-04-08 07:47:18.850332	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3733	467	3	2026-04-08 08:55:07.96699	\N	الجلسة الخامسة من البكج	روبوت	\N	\N	morning
3734	467	3	2026-04-08 08:55:17.988156	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3735	846	3	2026-04-08 08:57:12.008615	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3736	44	1	2026-04-07 10:32:59	\N	صيانه قالب	\N	\N	\N	morning
3737	806	3	2026-04-08 11:08:34.697294	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3738	806	3	2026-04-08 11:08:42.41611	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3739	876	3	2026-04-08 11:47:19.649737	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3740	876	3	2026-04-08 11:48:09.433044	\N	جلسه مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3741	805	3	2026-04-08 11:49:07.628753	\N	الجلسة الرابعه من البكج	أجهزة علاج طبيعي	\N	\N	morning
3742	913	1	2026-04-08 11:50:29.250237	\N	فحص ومعاينه المريض فقط	\N	\N	\N	morning
3743	876	3	2026-04-05 11:50:34	\N	حضر المريض للاستشاره مع اخصائي العلاج الطبيعي عبد الله خان وسيباشر حسب موعده 	استشارة طبية	\N	\N	morning
3744	875	3	2026-04-08 11:57:35.002439	\N	الجلسة الاولى من البكج 	أجهزة علاج طبيعي	\N	\N	morning
3745	763	1	2026-04-08 12:11:14.6551	\N	جلسه روبوت	روبوت	\N	\N	morning
3746	856	1	2026-04-08 12:12:14.670409	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	morning
3747	908	1	2026-04-08 12:23:51.559117	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) (تكلفة: 250,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3748	908	1	2026-04-08 12:24:11.879985	\N	جلسه علاج طبيعي اولى	أجهزة علاج طبيعي	\N	\N	morning
3749	393	3	2026-04-08 12:24:59.015071	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3750	393	3	2026-04-08 12:25:11.861407	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3751	914	2	2026-04-08 13:09:22.962964	\N	صيانة للطرف /صيانة قالب 	\N	\N	\N	evening
3752	915	2	2026-04-08 13:12:39.803837	\N	صيانة للطرف / سوفت 	\N	\N	\N	evening
3753	916	2	2026-04-08 13:15:10.985229	\N	تم اخذ قالب جديد 	\N	\N	\N	evening
4489	1051	3	2026-04-19 14:20:55.419095	\N	طلب منهم دكتور مصطفى استشارة طبيب اختصاص 	استشارة طبية	\N	\N	evening
3755	718	3	2026-04-08 13:24:57.992912	\N		تمارين تأهيلية	\N	\N	evening
3756	458	3	2026-04-08 13:25:22.685507	\N		روبوت	\N	\N	evening
3757	608	3	2026-04-08 13:25:41.14935	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3758	608	3	2026-04-08 13:25:44.584559	\N		أجهزة علاج طبيعي	\N	\N	evening
3759	675	3	2026-04-08 13:25:57.494778	\N		أجهزة علاج طبيعي	\N	\N	evening
3760	909	3	2026-04-08 13:26:09.661537	\N		أجهزة علاج طبيعي	\N	\N	evening
3761	810	3	2026-04-08 13:26:28.31685	\N		أجهزة علاج طبيعي	\N	\N	evening
3762	777	3	2026-04-08 13:39:47.070482	\N		أجهزة علاج طبيعي	\N	\N	evening
3763	817	3	2026-04-08 13:43:19.71523	\N		أجهزة علاج طبيعي	\N	\N	evening
3764	818	3	2026-04-08 13:48:20.690993	\N	الجلسة المجانية من البكج كون المريضة مستمرة في العلاج وكذلك على دراية بهذا العرض سابقًا كون اختها مراجعة قديمة معنا ومستمرة 	استشارة طبية	\N	\N	evening
3765	841	3	2026-04-08 13:53:21.436715	\N		أجهزة علاج طبيعي	\N	\N	evening
3766	917	3	2026-04-08 14:01:21.888519	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3767	917	3	2026-04-08 14:01:28.040175	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3768	917	3	2026-04-08 14:02:11.560757	\N	باشرت المريضة بعد الإستشارة مباشرة عند دكتور مصطفى 	أبر صينية	\N	\N	evening
3769	917	3	2026-04-08 14:02:15.073115	\N		أجهزة علاج طبيعي	\N	\N	evening
3770	867	3	2026-04-08 14:46:40.955273	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3771	867	3	2026-04-08 14:46:44.868493	\N		أجهزة علاج طبيعي	\N	\N	evening
3772	188	3	2026-04-08 14:47:59.027837	\N		أجهزة علاج طبيعي	\N	\N	evening
3773	224	3	2026-04-08 14:53:59.973336	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3774	919	3	2026-04-08 15:00:10.448425	\N	المريضة اخذت استشارة وتباشر يوم اخر 	استشارة طبية	\N	\N	evening
3775	224	3	2026-04-08 15:00:48.780782	\N		روبوت	\N	\N	evening
3776	813	3	2026-04-08 15:04:32.887371	\N		أجهزة علاج طبيعي	\N	\N	evening
3777	918	3	2026-04-08 15:07:35.834012	\N	تمت الاستشارة من قبل دكتور مصطفى ويباشرون يوم الاحد	استشارة طبية	\N	\N	evening
3778	44	1	2026-04-08 15:14:17.010957	\N	صيانه شتل لوك مع تعيار	\N	\N	\N	evening
3779	681	1	2026-04-08 15:15:41.049841	\N	تم تحويل مبلغ وقدره 107 الف دينار عراقي	\N	\N	\N	evening
3780	755	1	2026-04-06 15:19:57	\N	تم تسليم المسند بعد الصيانه	\N	\N	\N	evening
2830	46	1	2026-03-25 16:18:44.094888		تدريب على الطرف 	\N	\N	\N	evening
3781	46	1	2026-04-08 15:39:03.82652	\N	تم مراجعه المركز لغرض التدريب مع تفيير المفصل من هايدروليكي بايونك الى طرف لوكني 	\N	\N	\N	evening
3782	874	1	2026-04-08 15:42:23.422015	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
3783	912	3	2026-04-08 15:55:43.159428	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3784	912	3	2026-04-08 15:55:59.877755	\N		أجهزة علاج طبيعي	\N	\N	evening
3785	818	3	2026-04-08 16:00:40.004775	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3786	747	3	2026-04-08 16:18:05.443738	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3787	747	3	2026-04-08 16:18:09.437792	\N		روبوت	\N	\N	evening
3788	920	3	2026-04-08 16:23:52.913559	خدمة جديدة	خدمة أخرى (تكلفة: 175,000 د.ع) - مسند لكلا الساقين 	\N	\N	\N	\N
3789	222	3	2026-04-08 16:28:11.101538	\N	الجلسة الاخيرة من المبلغ المدفوع مسبقًا	تمارين تأهيلية	\N	\N	evening
3790	322	3	2026-04-08 17:04:03.474506	\N		أجهزة علاج طبيعي	\N	\N	evening
3791	886	3	2026-04-08 17:04:16.590579	\N		أجهزة علاج طبيعي	\N	\N	evening
3792	783	3	2026-04-08 17:19:20.763477	\N		تمارين تأهيلية	\N	\N	evening
3793	843	3	2026-04-08 17:48:00.036048	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3794	843	3	2026-04-08 17:48:03.261305	\N		أجهزة علاج طبيعي	\N	\N	evening
3795	887	3	2026-04-08 18:02:16.770051	\N		أجهزة علاج طبيعي	\N	\N	evening
3796	135	3	2026-04-08 18:13:11.819548	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3797	135	3	2026-04-08 18:13:16.139908	\N		أجهزة علاج طبيعي	\N	\N	evening
3798	785	3	2026-04-09 05:28:32.956005	\N	جلسة محجوزة مسبقا	روبوت	\N	\N	morning
3799	921	3	2026-04-09 05:37:03.506281	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	تمارين تأهيلية	\N	\N	\N
3800	921	3	2026-04-09 05:37:17.482485	\N	جلسة مفرده 	تمارين تأهيلية	\N	\N	morning
3801	153	3	2026-04-09 06:04:28.125583	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3802	153	3	2026-04-09 06:04:35.247369	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
3803	785	3	2026-04-09 06:04:54.656333	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3804	901	3	2026-04-09 06:06:39.182149	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3805	901	3	2026-04-09 06:06:48.803534	\N	جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	morning
3806	900	3	2026-04-09 06:17:53.283408	\N	الجلسة الثالثة والاخيرة م البكج 	أجهزة علاج طبيعي	\N	\N	morning
3807	922	3	2026-04-09 06:43:08.534932	\N	حضر المريض لغرض الاستشارة، إلا أنه لم يباشر بالعلاج في الوقت الحالي نظرًا لوجود سفر إلى بغداد. وقد أفاد بأنه سيتواصل معنا بعد عودته في حال رغبته بالبدء بالعلاج.\n	استشارة طبية	\N	\N	morning
3808	865	3	2026-04-09 07:36:47.785617	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (6 جلسة) (تكلفة: 150,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3809	880	3	2026-04-09 07:51:24.859226	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3810	865	3	2026-04-09 07:54:10.460421	\N	الجلسة الثانية 	تمارين تأهيلية	\N	\N	morning
3811	923	3	2026-04-09 08:00:01.949595	\N	حضرت المريضة لغرض الاستشارة، وقد قام الطبيب بتحديد خطة علاجية يومية لها. ونظرًا لبُعد مكان سكنها، ستقوم بترتيب أوضاعها والتواصل معنا لاحقًا لمباشرة العلاج.\n	استشارة طبية	\N	\N	morning
3812	757	3	2026-04-09 08:18:16.565597	\N	الجلسة السادسة مجانية	أجهزة علاج طبيعي	\N	\N	morning
3813	924	3	2026-04-09 08:24:13.174615	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج عبد الله خان بعد الاستشارة مباشرة	تمارين تأهيلية	\N	\N	\N
3814	924	3	2026-04-09 08:24:21.19647	\N	جلسه مفردة 	تمارين تأهيلية	\N	\N	morning
3815	846	3	2026-04-09 08:49:33.807379	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3816	846	3	2026-04-09 08:51:01.547511	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3817	467	3	2026-04-09 08:57:24.422714	\N	الجلسة السادسة والاخيرة من البكج	روبوت	\N	\N	morning
3818	467	3	2026-04-09 08:57:28.986882	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3819	536	3	2026-04-09 08:57:49.101864	\N	الجلسة الخامسة من البكج	تمارين تأهيلية	\N	\N	morning
3820	695	2	2026-04-09 08:58:18.532551	\N	تم اخذ قالب ( م مصطفى )	\N	\N	\N	morning
3821	512	2	2026-04-09 08:58:55.65508	\N	استلام المسند	\N	\N	\N	morning
3822	925	2	2026-04-09 09:06:41.909842	\N	صيانة قالب اليد 	\N	\N	\N	morning
3823	926	1	2026-04-08 10:42:37	\N	لغرض التعيار 	\N	\N	\N	morning
3824	636	1	2026-04-08 11:14:13	\N	تم تحويل مبلغ مالي قدره 500000 الف دينار عراقي	\N	\N	\N	morning
3825	783	3	2026-04-09 11:30:57.180099	\N	الجلسه الاولى لليوم الثاني للصباحي	تمارين تأهيلية	\N	\N	morning
3826	335	3	2026-04-09 11:38:51.0677	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3827	875	3	2026-04-09 11:55:16.990822	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
3828	545	3	2026-04-09 11:57:13.169691	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
3829	613	1	2026-04-09 12:01:30.401267	\N	تم تحويل مبلغ وقدره 100000 الف دينار عراقي	\N	\N	\N	morning
3830	814	1	2026-04-09 12:11:09.84563	\N	جلسه اجهزه علاج طبيعي سادسه	أجهزة علاج طبيعي	\N	\N	morning
3831	908	1	2026-04-09 12:15:47.158115	\N	جلسه علاج طبيعي ثانيه	أجهزة علاج طبيعي	\N	\N	morning
3832	19	1	2026-04-09 13:09:52.03141		لغرض استرجاع السليكون لكونه صغير يحتاح الى حجم اكبر لحي توفره	\N	\N	\N	evening
3833	264	3	2026-04-09 13:17:27.914616	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3835	264	3	2026-04-09 13:25:23.608825	\N		أجهزة علاج طبيعي	\N	\N	evening
3836	810	3	2026-04-09 13:25:38.599004	\N		أجهزة علاج طبيعي	\N	\N	evening
3837	812	3	2026-04-09 13:26:50.469573	\N	الجلسة الاخيرة 	استشارة طبية	\N	\N	evening
3838	718	3	2026-04-09 13:27:06.679026	\N		تمارين تأهيلية	\N	\N	evening
3839	856	1	2026-04-09 13:32:37.950897	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	evening
3840	265	3	2026-04-09 13:34:54.089345	\N	جلسة ابر صينية	أجهزة علاج طبيعي	\N	\N	evening
3841	819	3	2026-04-09 13:35:13.508072	\N		تمارين تأهيلية	\N	\N	evening
3842	928	1	2026-04-09 14:06:01.017086	\N	فحص ومعاينه مع اخذ قالب 	\N	\N	\N	evening
3843	725	3	2026-04-09 14:09:41.636455	\N		أجهزة علاج طبيعي	\N	\N	evening
3844	841	3	2026-04-09 14:09:54.608429	\N		أجهزة علاج طبيعي	\N	\N	evening
3845	818	3	2026-04-09 14:10:05.208031	\N		أجهزة علاج طبيعي	\N	\N	evening
3846	929	1	2026-04-09 14:15:06.588352	\N	لغرض استلام سيلكون هيما حلقي طلب سابق 	\N	\N	\N	evening
3952	322	3	2026-04-11 17:18:42.747704	\N		أجهزة علاج طبيعي	\N	\N	evening
4456	784	3	2026-04-19 06:24:27.167559	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3847	264	3	2026-04-09 14:34:44.259371	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (20 جلسة) (تكلفة: 500,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3849	745	1	2026-04-09 15:00:59.41006	\N	تدريب على الطرف 	\N	\N	\N	evening
3850	689	3	2026-04-09 15:11:15.572658	\N		أجهزة علاج طبيعي	\N	\N	evening
3851	307	3	2026-04-09 15:11:26.443934	\N		أجهزة علاج طبيعي	\N	\N	evening
3852	660	3	2026-04-09 15:11:40.681653	\N		أجهزة علاج طبيعي	\N	\N	evening
3853	911	3	2026-04-09 15:19:15.450988	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3854	911	3	2026-04-09 15:19:19.150428	\N		أجهزة علاج طبيعي	\N	\N	evening
3855	930	1	2026-04-09 15:29:48.358709		فحص ومعاينه وتحديد نوع طرف	\N	\N	\N	evening
3848	354	1	2026-04-09 15:00:23.015555		سحب ثانوي كاربون مع التسليم	\N	\N	\N	evening
3856	912	3	2026-04-09 15:40:39.486634	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3857	912	3	2026-04-09 15:40:43.311047	\N		أجهزة علاج طبيعي	\N	\N	evening
3858	884	3	2026-04-09 15:42:12.410306	\N		أجهزة علاج طبيعي	\N	\N	evening
3859	820	3	2026-04-09 16:05:15.52226	\N		أجهزة علاج طبيعي	\N	\N	evening
3860	747	3	2026-04-09 16:36:36.053715	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3861	747	3	2026-04-09 16:36:39.74191	\N		روبوت	\N	\N	evening
3862	792	3	2026-04-09 16:55:10.901545	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3863	792	3	2026-04-09 16:55:15.054627	\N		أجهزة علاج طبيعي	\N	\N	evening
3864	311	3	2026-04-09 17:29:12.97917	\N		أجهزة علاج طبيعي	\N	\N	evening
3865	883	3	2026-04-09 17:52:42.889281	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3866	883	3	2026-04-09 17:52:46.625262	\N		أجهزة علاج طبيعي	\N	\N	evening
3867	783	3	2026-04-09 17:57:12.392139	\N	الجلسة الثانية اليوم الثاني المسائي 	تمارين تأهيلية	\N	\N	evening
3868	793	3	2026-04-09 18:10:42.285135	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3869	793	3	2026-04-09 18:10:58.237438	\N		أجهزة علاج طبيعي	\N	\N	evening
3870	424	3	2026-04-09 18:12:13.349569	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3871	424	3	2026-04-09 18:12:17.357622	\N		أجهزة علاج طبيعي	\N	\N	evening
3872	887	3	2026-04-09 18:13:06.380342	\N		أجهزة علاج طبيعي	\N	\N	evening
3873	931	3	2026-04-09 18:27:31.665763	\N	المريض يباشر يوم السبت 	استشارة طبية	\N	\N	evening
3874	64	3	2026-04-11 05:21:19.254139	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3875	876	3	2026-04-11 05:42:26.675582	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3876	876	3	2026-04-11 05:44:12.680239	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3877	64	3	2026-04-11 05:44:52.31288	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
3878	783	3	2026-04-11 05:50:21.569131	\N	الجلسه الثالثة لليوم الثالث للصباحي	تمارين تأهيلية	\N	\N	morning
3879	767	3	2026-04-11 05:59:48.800665	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3880	700	3	2026-04-11 06:35:14.896717	\N	الجلسة الاولى	أجهزة علاج طبيعي	\N	\N	morning
3881	936	2	2026-04-11 07:29:13.616061	\N	تم اخ قالب عدد 2	\N	\N	\N	morning
3882	937	2	2026-04-11 07:37:31.0579	\N	يحتاج الى مساند kAFO عدد2 ثابت +مسند يد /لديه كتاب 	\N	\N	\N	morning
3883	938	2	2026-04-11 07:48:07.753934	\N	يحتاج الى مسند AFO عدد2 /لديه كتاب 	\N	\N	\N	morning
3884	933	3	2026-04-11 07:54:23.521771	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3885	933	3	2026-04-11 07:58:10.172499	\N	باشر المريض بعد ان اتم الاستشارة الاولية عن طريق دكتور عبد الله خان حيث كان المريض يعاني من انزلاق مسبق لكن بسبب حمل اوزان ثقيلة داخل البيت تفاقمة حالته لذلك راجعنا اليوم وبدا باول جلسته معنا\n	أجهزة علاج طبيعي	\N	\N	morning
3886	880	3	2026-04-11 08:01:30.241634	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3887	935	3	2026-04-11 08:18:58.886796	\N	اخذت المريضة استشارة فقط على دكتور عبد الله خان وسوف تباشر لاحقا	استشارة طبية	\N	\N	morning
3888	100	2	2026-04-11 08:47:02.587477	\N	تم شراء قدم بسعر 350000 د	\N	\N	\N	morning
3889	467	3	2026-04-11 08:54:39.777533	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3890	467	3	2026-04-11 08:54:58.906325	\N		تمارين تأهيلية	\N	\N	morning
3891	467	3	2026-04-11 08:55:17.671256	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3892	467	3	2026-04-11 08:55:24.09898	\N		روبوت	\N	\N	morning
3893	939	3	2026-04-11 11:11:35.206061	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
4440	999	3	2026-04-18 18:33:31.665587	\N		أجهزة علاج طبيعي	\N	\N	evening
3895	745	1	2026-04-11 11:49:20.528579	\N	تدريب على الطرف	\N	\N	\N	morning
3896	875	3	2026-04-11 11:50:55.408006	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3897	823	3	2026-04-11 11:51:32.634077	\N	الجلسة الرابعة من البكج والاخيرة	تمارين تأهيلية	\N	\N	morning
3898	805	3	2026-04-11 11:52:10.659628	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3899	942	2	2026-04-11 11:56:29.715372	\N	تم عرض لها طرف ثابت 	\N	\N	\N	morning
3900	943	1	2026-04-11 12:13:24.914958	\N	صيانه قالب 	\N	\N	\N	morning
3901	944	3	2026-04-11 12:17:58.863222	\N	المريضة راقدة في الطابق الرابعة على دكتور محمد توفيق تعاني من التهاب حاد بالركبة صاحبه انخفاض بالدم مما ادى الى عدم الحركة لذلك تحتاج المريضة الى جلسات مستمرة لذلك تم اخذ الاستشارة والمباشرة فورا	أجهزة علاج طبيعي	\N	\N	morning
3902	763	1	2026-04-11 12:21:34.102015	\N	جلسه روبوت	روبوت	\N	\N	morning
3894	940	1	2026-04-11 11:48:14.151287		فحص ومعاينه  مع اخذ قالب 	\N	\N	\N	morning
3903	274	3	2026-04-11 12:31:59.410039	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3904	946	1	2026-04-11 12:50:08.440531		اخذ قالب 	\N	\N	\N	morning
3906	945	3	2026-04-11 13:06:02.722736	\N	تم اخذ الاستشارة والمباشرة غدا لحين ما يرتب المريض موعد دوامه	استشارة طبية	\N	\N	evening
3907	932	3	2026-04-11 13:07:31.919712	\N	سوف يراجع الشفت المسائي بسبب التزام والد المريض بالعمل صباحا	استشارة طبية	\N	\N	evening
3908	814	1	2026-04-11 13:13:18.392636		جلسه اجهزه علاج طبيعي سابعه	أجهزة علاج طبيعي	\N	\N	evening
3909	949	1	2026-04-11 13:57:49.901923	\N	جلسه ربورت	روبوت	\N	\N	evening
3910	949	1	2026-04-11 13:58:11.034372	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3911	949	1	2026-04-11 13:58:22.728333	\N		تمارين تأهيلية	\N	\N	evening
3912	908	1	2026-04-11 14:00:25.8419	\N	جلسه علاج طبيعي ثالثه	أجهزة علاج طبيعي	\N	\N	evening
3913	856	1	2026-04-11 14:01:30.770242	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	evening
3914	932	3	2026-04-11 14:02:50.569009	\N	اخذ استشارة اخرى عند الشفت المسائي ويباشر يوم اخر	استشارة طبية	\N	\N	evening
3905	947	1	2026-04-11 13:03:31.166176		اخذ قياسات مع الاستلام	\N	\N	\N	evening
3915	874	1	2026-04-11 14:10:53.879966	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
3916	608	3	2026-04-11 14:12:18.914707	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3917	608	3	2026-04-11 14:12:22.791219	\N		أجهزة علاج طبيعي	\N	\N	evening
3918	817	3	2026-04-11 14:12:42.465556	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3919	817	3	2026-04-11 14:12:46.190344	\N		روبوت	\N	\N	evening
3920	742	1	2026-04-11 14:24:44.413892	\N	لغرض التدريب على الاطراف	\N	\N	\N	evening
3921	818	3	2026-04-11 14:30:18.952541	\N		أجهزة علاج طبيعي	\N	\N	evening
3922	948	3	2026-04-11 14:31:12.627313	\N	اخذت المريضة استشارة وتباشر يوم غد	استشارة طبية	\N	\N	evening
3923	909	3	2026-04-11 14:31:35.315628	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3924	909	3	2026-04-11 14:31:38.710171	\N		أجهزة علاج طبيعي	\N	\N	evening
3925	810	3	2026-04-11 14:32:11.381109	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3926	810	3	2026-04-11 14:32:15.303413	\N		أجهزة علاج طبيعي	\N	\N	evening
3927	265	3	2026-04-11 14:33:02.156887	\N		أجهزة علاج طبيعي	\N	\N	evening
3928	224	3	2026-04-11 14:33:27.612371	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3929	224	3	2026-04-11 14:33:31.901945	\N		روبوت	\N	\N	evening
3930	950	3	2026-04-11 14:34:27.947745	\N	اخذ المريض استشارة ويباشر يوم غد	استشارة طبية	\N	\N	evening
3931	951	3	2026-04-11 14:34:56.512259	\N	اخذت المريضة استشارة وتباشر يوم غد	استشارة طبية	\N	\N	evening
3932	188	3	2026-04-11 14:35:11.758579	\N		أجهزة علاج طبيعي	\N	\N	evening
3933	350	1	2026-04-11 14:40:55.187424	\N	صيانه قالب مع تعيار 	\N	\N	\N	evening
3934	354	1	2026-04-11 14:41:14.7231	\N	لغرض التعيار 	\N	\N	\N	evening
3935	952	3	2026-04-11 15:32:04.014272	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3936	952	3	2026-04-11 15:32:25.164629	\N	باشرت المريضة بعد استشارة دكتور مصطفى	أجهزة علاج طبيعي	\N	\N	evening
3937	953	3	2026-04-11 15:41:17.161602	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
3938	47	1	2026-04-11 15:41:20.541166	\N	تم تحويل مبلغ وقدره 1 مليون دينار عراقي	\N	\N	\N	evening
3939	953	3	2026-04-11 15:41:36.815527	\N	باشرت المريضة بعد الاستشارة عند دكتور مصطفى	أبر صينية	\N	\N	evening
3940	181	3	2026-04-11 16:03:00.034916	\N	المريضة اخذت استشارة عند الشفت المسائي بخصوص المباشرة بسبب عدم توفر وقت في الصباح لكن في المسائي الوقت الذي تريده لايوجد فيه موعد فارغ	استشارة طبية	\N	\N	evening
3941	917	3	2026-04-11 16:03:20.753677	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3942	917	3	2026-04-11 16:03:24.088123	\N		أجهزة علاج طبيعي	\N	\N	evening
3943	888	3	2026-04-11 16:03:35.959872	\N		أجهزة علاج طبيعي	\N	\N	evening
3944	670	3	2026-04-11 16:39:00.943071	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3945	670	3	2026-04-11 16:39:04.904817	\N		أجهزة علاج طبيعي	\N	\N	evening
3946	583	4	2026-04-11 16:41:18.659913	\N	استعلام عن سعر الااطراف الزراعية والصناعية	\N	\N	\N	evening
3947	49	1	2026-04-11 16:46:00.515935		اعاده قالب  للطرف الايمن 	\N	\N	\N	evening
3948	954	1	2026-04-11 16:53:22.084731	\N	فحص ومعاينه مع اخذ قالب 	\N	\N	\N	evening
3949	886	3	2026-04-11 17:06:50.096505	\N		أجهزة علاج طبيعي	\N	\N	evening
3950	567	3	2026-04-11 17:18:17.339298	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3951	567	3	2026-04-11 17:18:21.532594	\N		أجهزة علاج طبيعي	\N	\N	evening
3953	931	3	2026-04-11 17:47:21.429872	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3954	931	3	2026-04-11 17:59:17.862371	\N	باشر المريض بعد استشارة سابقة	أجهزة علاج طبيعي	\N	\N	evening
3955	883	3	2026-04-11 18:02:57.987231	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3956	883	3	2026-04-11 18:03:01.720656	\N		أجهزة علاج طبيعي	\N	\N	evening
3957	783	3	2026-04-11 18:03:40.062649	\N	الجلسة الثالثة اليوم الثالث للمسائي 	تمارين تأهيلية	\N	\N	evening
3958	887	3	2026-04-11 18:18:24.881052	\N		أجهزة علاج طبيعي	\N	\N	evening
3959	843	3	2026-04-11 18:40:41.558012	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3960	843	3	2026-04-11 18:40:44.851654	\N		أجهزة علاج طبيعي	\N	\N	evening
3961	822	3	2026-04-12 05:17:32.701909	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3962	955	3	2026-04-12 05:40:06.312793	\N	المريضة اخذت استشارة عند دكتور عبد الله خان وتم الاتفاق على تحديد موعد لها في اقرب وقت حسب قرار دكتور عبد الله 	استشارة طبية	\N	\N	morning
3963	785	3	2026-04-12 05:46:30.154515	\N	جلسة محجوزة مسبقا	روبوت	\N	\N	morning
3964	785	3	2026-04-12 05:47:27.024118	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
3965	933	3	2026-04-12 05:53:08.840263	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3966	771	3	2026-04-12 05:59:30.429962	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
3967	900	3	2026-04-12 06:18:47.677468	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3968	900	3	2026-04-12 06:23:54.391126	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3969	153	3	2026-04-12 06:38:17.613776	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3970	757	3	2026-04-12 07:12:32.616894	\N	الجلسة السابعة مجانية 	أجهزة علاج طبيعي	\N	\N	morning
3971	474	3	2026-04-12 07:20:51.213176	\N	جلسة رقم 19 من البكج	تمارين تأهيلية	\N	\N	morning
3972	783	3	2026-04-12 07:23:45.351309	\N	الجلسة الرابعة لليوم الرابع للصباحي	تمارين تأهيلية	\N	\N	morning
3973	865	3	2026-04-12 07:34:32.127781	\N	الجلسة الثالثة من البكج	تمارين تأهيلية	\N	\N	morning
3974	956	3	2026-04-12 08:09:29.11506	\N	المريض اخذ استشارة اليوم عند الطبيب المعالج عبد الله خان حيث كان المريض يعاني من انزلاق بالفقرات وبعد الفحص ابلغه الطبيب بان يحتاج الى جلسات لمدة 25 يوم متتالية لذلك اخبرنا بان سوف يرتب عمله كون عمله يتطلب جهد بدني لذلك عليه ترك العمل مؤقتا لحين اكمال الجلسات لذلك سوف يباشر معنا في وقت لاحق	استشارة طبية	\N	\N	morning
3975	846	3	2026-04-12 08:38:38.971886	\N	الجلسة الاوللى من البكج	أجهزة علاج طبيعي	\N	\N	morning
3976	536	3	2026-04-12 08:39:38.538618	\N	الجلسة السادسة والاخيرة من البكج	تمارين تأهيلية	\N	\N	morning
3977	936	2	2026-04-12 08:47:10.476396	\N	تسديد مبلغ 	\N	\N	\N	morning
3978	100	2	2026-04-11 09:08:43	خدمة جديدة	خدمة أخرى (تكلفة: 350,000 د.ع) - شراء قدم سنكل 	\N	\N	\N	\N
3979	695	2	2026-04-06 09:13:15	خدمة جديدة	خدمة أخرى (تكلفة: 550,000 د.ع) - قالب تحت الركبة ضمن الضمان 	\N	\N	\N	\N
3980	786	2	2026-04-12 09:21:58.892473	\N	تم لبس الطرف وتم الاستلام	\N	\N	\N	morning
3981	788	3	2026-04-12 09:25:54.224399	\N	الجلسة الاخيرة من البكج	روبوت	\N	\N	morning
3982	788	3	2026-04-12 09:26:41.206048	خدمة جديدة	جلسات علاج إضافية - روبوت (3 جلسة) (تكلفة: 150,000 د.ع)	روبوت	\N	\N	\N
3983	957	3	2026-04-12 10:03:01.36936	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة 	أجهزة علاج طبيعي	\N	\N	\N
3984	957	3	2026-04-12 10:05:05.704652	\N	باشر المريض بعد ان اتم اخذ استشارة من قبل الطبيب المعالج عبد الله خان حيث كان يعاني من انزلاقات متعددة راجع دكتور غفران الجابري والاخير ارساله للعلاج الطبيعي	استشارة طبية	\N	\N	morning
3985	47	1	2026-04-11 10:17:54	خدمة جديدة	خدمة أخرى (تكلفة: 2,500,000 د.ع) - تبديل مفصل الركبة من مفصل بايونك الى مفصل هوائي الماني 3R78	\N	\N	\N	\N
3986	727	3	2026-04-12 11:26:39.111584	\N	جلسة محجوزة مسبقا	أجهزة علاج طبيعي	\N	\N	morning
3987	274	3	2026-04-12 11:27:27.973473	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3988	959	1	2026-04-12 11:42:41.762016	\N	اخذ قالب	\N	\N	\N	morning
3989	960	3	2026-04-12 11:49:43.46832	\N	المريض اخذ استشارة فقط وقال ناتي في وقت اخر للمباشرة	استشارة طبية	\N	\N	morning
3990	958	3	2026-04-12 11:50:00.46449	\N	المريض اخذ استشارة فقط وقال ناتي في وقت اخر للمباشرة	استشارة طبية	\N	\N	morning
3991	545	3	2026-04-12 12:01:59.758414	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
3992	949	1	2026-04-12 12:02:10.9446	\N	جلسه روبوت	روبوت	\N	\N	morning
3993	949	1	2026-04-12 12:02:41.920801	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
3994	949	1	2026-04-12 12:02:54.26516	\N		تمارين تأهيلية	\N	\N	morning
3995	814	1	2026-04-12 12:08:30.464535	\N	جلسه اجهزه علاج طبيعي الثامنه	أجهزة علاج طبيعي	\N	\N	morning
3996	961	2	2026-04-12 12:30:22.650599	\N	تعييار 	\N	\N	\N	morning
4094	982	1	2026-04-13 14:51:33.212095	\N	اخذ قالب 	\N	\N	\N	evening
3997	928	1	2026-04-12 12:41:59.000237	\N	تم تحويل مبلغ وقدره 2900000 الفلا دينار عراقي	\N	\N	\N	morning
3999	908	1	2026-04-12 13:05:36.377691	\N	جلسه علاج طبيعي رابعه	أجهزة علاج طبيعي	\N	\N	evening
4000	856	1	2026-04-12 13:11:59.560796	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	evening
4001	264	3	2026-04-12 13:20:05.427951	\N		أجهزة علاج طبيعي	\N	\N	evening
4002	742	1	2026-04-12 13:21:12.898678	\N	تدريب على الاطراف	\N	\N	\N	evening
4003	963	3	2026-04-12 13:52:26.41709	\N	بإنتظار عرضه على طبيب جملة عصبية مختص	استشارة طبية	\N	\N	evening
4004	951	3	2026-04-12 13:52:53.700726	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4005	951	3	2026-04-12 13:54:42.335761	\N	باشرت المريضة بعد استشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
4006	880	3	2026-04-12 14:10:34.97833	\N	الجلسة السابعة في الشفت المسائي 	أجهزة علاج طبيعي	\N	\N	evening
4008	948	3	2026-04-12 14:25:28.641208	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4007	780	1	2026-04-02 14:24:24		جلسه سادسه	أجهزة علاج طبيعي	\N	\N	evening
4009	948	3	2026-04-12 14:25:48.460182	\N	باشرت المريضة بعد استشارة يوم امس	أجهزة علاج طبيعي	\N	\N	evening
3433	780	1	2026-04-04 13:16:46.505144		جلسه علاج طبيعي سابعه	أجهزة علاج طبيعي	\N	\N	evening
3684	780	1	2026-04-07 13:13:39.059182		جلسه علاج طبيعي العاشره	أجهزة علاج طبيعي	\N	\N	evening
3754	780	1	2026-04-08 13:23:16.832185		جلسه علاج طبيعي الحادي عشر	أجهزة علاج طبيعي	\N	\N	evening
3834	780	1	2026-04-09 13:20:08.243199		جلسه علاج طبيعي الثاني عشر	أجهزة علاج طبيعي	\N	\N	evening
4010	780	1	2026-04-12 14:29:36.80911	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4011	780	1	2026-04-12 14:29:56.610747		جلسه الثالث عشر	أجهزة علاج طبيعي	\N	\N	evening
3998	962	1	2026-04-12 12:43:47.946087		فحص ومعاينه مع تحديد نوع الطرف مع اخذ قالب	\N	\N	\N	morning
4012	718	3	2026-04-12 14:41:11.313491	\N		تمارين تأهيلية	\N	\N	evening
4013	810	3	2026-04-12 14:41:42.223718	\N		أجهزة علاج طبيعي	\N	\N	evening
4014	812	3	2026-04-12 14:43:21.852756	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4015	812	3	2026-04-12 14:43:27.021949	\N		أجهزة علاج طبيعي	\N	\N	evening
4016	868	3	2026-04-12 14:44:01.528762	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4017	868	3	2026-04-12 14:44:06.700487	\N		أجهزة علاج طبيعي	\N	\N	evening
4018	725	3	2026-04-12 14:45:14.208134	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4019	725	3	2026-04-12 14:45:17.49477	\N		أجهزة علاج طبيعي	\N	\N	evening
4020	912	3	2026-04-12 14:45:55.730244	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4021	912	3	2026-04-12 14:45:58.900098	\N		أجهزة علاج طبيعي	\N	\N	evening
4022	307	3	2026-04-12 15:06:57.273914	\N		أجهزة علاج طبيعي	\N	\N	evening
4023	911	3	2026-04-12 15:18:13.34915	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4024	911	3	2026-04-12 15:18:16.420652	\N		أجهزة علاج طبيعي	\N	\N	evening
4025	964	3	2026-04-12 15:58:03.571438	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4026	964	3	2026-04-12 15:58:17.15511	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4027	747	3	2026-04-12 16:00:15.395664	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4028	747	3	2026-04-12 16:00:19.410598	\N		روبوت	\N	\N	evening
4029	874	1	2026-04-12 16:06:06.006904	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4030	222	3	2026-04-12 16:12:33.77729	\N		تمارين تأهيلية	\N	\N	evening
4031	965	3	2026-04-12 16:45:05.163886	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4032	965	3	2026-04-12 16:45:22.282208	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4033	593	1	2026-04-12 16:51:31.716553	\N	تبديل اشرطه	\N	\N	\N	evening
4034	354	1	2026-04-12 16:55:22.162841		تبديل غلاف قدم  اكلون فاك	\N	\N	\N	evening
4035	918	3	2026-04-12 16:59:49.221892	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4036	918	3	2026-04-12 17:00:07.698981	\N	باشرت المريضة بعد استشارة مسبقة	أجهزة علاج طبيعي	\N	\N	evening
4037	966	3	2026-04-12 17:03:56.593759	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4038	966	3	2026-04-12 17:04:12.554989	\N	باشرت المريضة بعد استشارة دكتور مصطفى	أجهزة علاج طبيعي	\N	\N	evening
4039	747	3	2026-04-12 17:05:24.131962	\N		أجهزة علاج طبيعي	\N	\N	evening
4040	917	3	2026-04-12 17:43:32.234764	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4041	917	3	2026-04-12 17:43:36.300031	\N		أجهزة علاج طبيعي	\N	\N	evening
4042	311	3	2026-04-12 17:46:51.550262	\N		أجهزة علاج طبيعي	\N	\N	evening
4043	931	3	2026-04-12 17:51:15.224536	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4044	931	3	2026-04-12 17:51:19.039148	\N		أجهزة علاج طبيعي	\N	\N	evening
4045	311	3	2026-04-12 18:13:25.176034	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4046	767	3	2026-04-13 05:47:58.971777	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4047	784	3	2026-04-13 06:28:21.03841	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4048	904	2	2026-04-13 08:10:53.492263	\N	تم اخذ قالب 	\N	\N	\N	morning
4049	970	3	2026-04-13 08:19:16.880787	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4050	846	3	2026-04-13 08:33:28.935004	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
4051	640	3	2026-04-13 08:33:50.836308	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4052	969	2	2026-04-13 08:46:44.952311	\N	تم عرض له طرف ثابت فوق الركبة /لديه كتاب 	\N	\N	\N	morning
4053	637	2	2026-04-13 08:48:00.804287	\N	تم لبس الطرف والتدريب عليه وتم الاستلام 	\N	\N	\N	morning
4054	971	2	2026-04-13 08:51:07.673738	\N	تم عرض لها طرف ثابت فوق الركبة /لديها كتاب 	\N	\N	\N	morning
4055	467	3	2026-04-13 09:16:17.299881	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4056	467	3	2026-04-13 09:16:26.827318	خدمة جديدة	جلسات علاج إضافية - روبوت (4 جلسة) (تكلفة: 200,000 د.ع)	روبوت	\N	\N	\N
4057	968	3	2026-04-13 09:21:58.105097	\N	اخذ المريض استشارة عند دكتور عبد الله خان لكن المريض لم يباشر بسبب عدم مقدرته على سعر الجلسة 	استشارة طبية	\N	\N	morning
4058	973	3	2026-04-13 09:32:45.983511	\N	اخذت استشارة عند دكتور عبد الله خان وباشرت مباشرة	استشارة طبية	\N	\N	morning
4059	973	3	2026-04-13 09:41:04.111467	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4441	886	3	2026-04-18 18:38:47.172823	\N		أجهزة علاج طبيعي	\N	\N	evening
4061	974	3	2026-04-13 10:52:14.568195	\N	باشر المريض بعد ان اتم الاستشارة عند دكتور عبد الله خان	أجهزة علاج طبيعي	\N	\N	morning
4062	974	3	2026-04-13 10:52:26.77048	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4063	806	3	2026-04-13 11:30:21.724385	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4064	354	1	2026-04-13 11:41:20.445326	خدمة جديدة	صيانة الطرف الصناعي (تكلفة: 450,000 د.ع) - تبديل غلاف قدم نوع اكيلون فاك	\N	\N	\N	\N
4065	763	1	2026-04-13 11:58:02.874304	\N	جلسه روبوت	روبوت	\N	\N	morning
4066	742	1	2026-04-13 11:59:00.579919	\N	تدريب على الاطراف	\N	\N	\N	morning
4067	949	1	2026-04-13 11:59:45.640148	\N	جلسه روبوت	روبوت	\N	\N	morning
4068	949	1	2026-04-13 12:00:18.699928	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4069	949	1	2026-04-13 12:00:43.874519	\N	جلسه اجهزه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
4070	875	3	2026-04-13 12:02:01.337055	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4071	908	1	2026-04-13 12:05:40.103655	\N	جلسه علاج طبيعي خامسه	أجهزة علاج طبيعي	\N	\N	morning
4072	814	1	2026-04-13 12:27:44.566771	\N	جلسه اجهزه علاج طبيعي التاسعه	أجهزة علاج طبيعي	\N	\N	morning
4073	972	2	2026-04-13 13:20:45.134138	\N	تم تحديد يد متحركة بسعر 23925000 د/لديه كتاب 	\N	\N	\N	evening
4074	874	1	2026-04-13 13:51:01.079551	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4075	745	1	2026-04-13 13:53:07.359788	\N	تدريب على الطرف	\N	\N	\N	evening
4076	780	1	2026-04-13 13:58:44.334056	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (10 جلسة) (تكلفة: 250,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4077	780	1	2026-04-13 13:59:22.146134	خدمة جديدة	جلسات علاج إضافية - روبوت (10 جلسة) (تكلفة: 500,000 د.ع)	روبوت	\N	\N	\N
4078	780	1	2026-04-13 14:00:11.289347	\N	جلسه الرابع عشر 	أجهزة علاج طبيعي	\N	\N	evening
4079	780	1	2026-04-13 14:00:27.579344	\N	جلسه روبوت	روبوت	\N	\N	evening
4080	976	3	2026-04-13 14:01:09.621308	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4081	976	3	2026-04-13 14:01:44.672488	\N	باشر المريض بعد الإستشارة عند دكتور مصطفى	أجهزة علاج طبيعي	\N	\N	evening
4082	977	3	2026-04-13 14:05:13.011217	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4083	977	3	2026-04-13 14:05:20.910429	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
4084	977	3	2026-04-13 14:05:54.207914	\N	باشرت المريضة بعد الإستشارة عند دكتور مصطفى بجلستين عادية وابر 	أجهزة علاج طبيعي	\N	\N	evening
4085	977	3	2026-04-13 14:05:58.595795	\N		أبر صينية	\N	\N	evening
4086	950	3	2026-04-13 14:21:30.827652	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4087	950	3	2026-04-13 14:21:49.449367	\N	باشر المريض بعد استشارة سابقة 	أجهزة علاج طبيعي	\N	\N	evening
4088	978	3	2026-04-13 14:43:01.041048	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
4089	978	3	2026-04-13 14:43:21.506829	\N	باشر المريض بعد الاستشارة 	أبر صينية	\N	\N	evening
4090	608	3	2026-04-13 14:44:32.378351	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4091	608	3	2026-04-13 14:44:36.31255	\N		أجهزة علاج طبيعي	\N	\N	evening
4092	817	3	2026-04-13 14:49:41.682975	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4093	817	3	2026-04-13 14:49:46.781962	\N		أجهزة علاج طبيعي	\N	\N	evening
4096	980	3	2026-04-13 15:31:32.828902	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4097	980	3	2026-04-13 15:32:29.159695	\N	باشرت المريضة بعد الاستشارة عند دكتور مصطفى 	أجهزة علاج طبيعي	\N	\N	evening
4098	981	3	2026-04-13 15:50:32.813096	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4099	981	3	2026-04-13 15:50:47.162045	\N	باشر المريض بعد الاستشارة	أجهزة علاج طبيعي	\N	\N	evening
4100	984	3	2026-04-13 16:10:41.077737	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
4101	984	3	2026-04-13 16:11:02.524046	\N	باشرت المريضة بعد الاستشارة 	أبر صينية	\N	\N	evening
4144	987	3	2026-04-14 09:22:06.41831	\N	باشر المريض بعدما اتم الاستشارة تحت اشراف الطبيب المعالج عبد الله خان مباشرة	استشارة طبية	\N	\N	morning
4060	975	1	2026-04-12 16:21:35		صيانه مع تجميل الطرف 	\N	\N	\N	morning
4102	985	4	2026-04-13 16:29:40.286038	\N	استعلام	\N	\N	\N	evening
4103	986	1	2026-04-13 16:39:13.471147	\N	صيانه قالب 	\N	\N	\N	evening
4104	909	3	2026-04-13 16:41:55.185718	\N		أجهزة علاج طبيعي	\N	\N	evening
4105	880	3	2026-04-13 16:44:47.235859	\N	الجلسة الاخيرة من البكج	استشارة طبية	\N	\N	evening
4106	951	3	2026-04-13 16:46:03.510058	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4107	951	3	2026-04-13 16:46:07.462334	\N		أجهزة علاج طبيعي	\N	\N	evening
4108	952	3	2026-04-13 16:46:33.364967	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4109	952	3	2026-04-13 16:46:36.772684	\N		أجهزة علاج طبيعي	\N	\N	evening
4110	868	3	2026-04-13 16:47:35.231722	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4111	868	3	2026-04-13 16:47:38.930435	\N		أجهزة علاج طبيعي	\N	\N	evening
4112	979	3	2026-04-13 16:47:55.904942	\N		استشارة طبية	\N	\N	evening
4113	888	3	2026-04-13 16:48:24.251497	\N		أجهزة علاج طبيعي	\N	\N	evening
4114	841	3	2026-04-13 17:00:35.188116	\N		أجهزة علاج طبيعي	\N	\N	evening
4115	777	3	2026-04-13 17:00:50.358975	\N		أجهزة علاج طبيعي	\N	\N	evening
4116	645	3	2026-04-13 17:04:39.462574	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4117	645	3	2026-04-13 17:04:44.330899	\N		أجهزة علاج طبيعي	\N	\N	evening
4118	966	3	2026-04-13 17:25:11.1135	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4119	966	3	2026-04-13 17:25:16.21535	\N		أجهزة علاج طبيعي	\N	\N	evening
4120	983	3	2026-04-13 17:26:09.87791	\N	يباشر يوم غد	استشارة طبية	\N	\N	evening
4121	670	3	2026-04-13 17:26:33.202032	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4122	670	3	2026-04-13 17:26:37.483353	\N		أجهزة علاج طبيعي	\N	\N	evening
4123	322	3	2026-04-13 17:27:16.861079	\N		أجهزة علاج طبيعي	\N	\N	evening
4124	886	3	2026-04-13 17:54:37.75058	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4125	886	3	2026-04-13 18:07:27.343361	\N		أجهزة علاج طبيعي	\N	\N	evening
4126	311	3	2026-04-13 18:16:53.46625	\N		أجهزة علاج طبيعي	\N	\N	evening
4127	917	3	2026-04-13 18:19:11.713105	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4128	917	3	2026-04-13 18:19:15.113628	\N		أجهزة علاج طبيعي	\N	\N	evening
4129	883	3	2026-04-13 18:21:53.256457	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4130	883	3	2026-04-13 18:21:56.811003	\N		أجهزة علاج طبيعي	\N	\N	evening
4131	933	3	2026-04-14 05:19:08.390936	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4132	822	3	2026-04-14 05:21:54.111131	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
4133	822	3	2026-04-14 05:22:27.055293	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
4134	700	3	2026-04-14 05:56:28.226274	\N	الجلسة الثانية والاخيرة	أجهزة علاج طبيعي	\N	\N	morning
4135	153	3	2026-04-14 05:58:46.893989	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
4136	509	3	2026-04-14 06:43:49.89583	\N	الجلسة 11 مجانية	تمارين تأهيلية	\N	\N	morning
4137	900	3	2026-04-14 06:56:21.660572	\N	الجلسة الثانية 	أجهزة علاج طبيعي	\N	\N	morning
4138	865	3	2026-04-14 07:23:37.676414	\N	الجلسة الرابعة من البكج	تمارين تأهيلية	\N	\N	morning
4139	846	3	2026-04-14 08:31:09.532698	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4140	467	3	2026-04-14 08:48:21.164991	\N	الجلسة الثانية من البكج	روبوت	\N	\N	morning
4141	467	3	2026-04-14 08:49:06.994027	\N	الجلسة الثانية من البكج 	أجهزة علاج طبيعي	\N	\N	morning
4142	467	3	2026-04-14 08:49:28.701773	\N	الجلسة الثالثة من البكج	روبوت	\N	\N	morning
4143	467	3	2026-04-14 08:49:42.466994	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4145	987	3	2026-04-14 09:22:16.257614	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4146	987	3	2026-04-14 09:22:33.436206	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4147	495	3	2026-04-14 09:23:10.73777	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4302	153	3	2026-04-16 06:03:08.685578	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
4148	988	3	2026-04-14 09:23:57.957637	\N	باشرت المريضة بعدما اتمت الاستشارة تحت اشراف الطبيب المعالج عبد الله خان مباشرة	استشارة طبية	\N	\N	morning
4149	988	3	2026-04-14 09:24:25.400808	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4150	988	3	2026-04-14 09:24:39.519594	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4151	957	3	2026-04-14 10:17:38.244288	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4152	957	3	2026-04-14 10:18:00.202498	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4153	957	3	2026-04-12 10:18:34	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4154	727	3	2026-04-14 11:41:18.768396	\N	جلسة محجوزة مسبقا	أجهزة علاج طبيعي	\N	\N	morning
4155	973	3	2026-04-13 11:42:05	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
4156	973	3	2026-04-14 11:42:24.362616	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
4157	970	3	2026-04-13 11:43:21	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
4158	970	3	2026-04-14 11:43:41.088429	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
4159	640	3	2026-04-13 11:44:36	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
4160	640	3	2026-04-14 11:44:59.263624	\N	الجلسة الثانية من البكج	أجهزة علاج طبيعي	\N	\N	morning
4161	949	1	2026-04-14 11:45:16.603286	\N	جلسه روبوت	روبوت	\N	\N	morning
4162	949	1	2026-04-14 11:45:38.52244	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4163	949	1	2026-04-14 11:45:55.434407	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
4164	833	2	2026-04-14 11:53:51.822892	\N	تم استلام المسند وتسديد مبلغ 550000 د	\N	\N	\N	morning
4165	545	3	2026-04-12 12:00:10	\N		أجهزة علاج طبيعي	\N	\N	morning
4166	545	3	2026-04-14 12:00:37.181516	\N		أجهزة علاج طبيعي	\N	\N	morning
4167	545	3	2026-04-14 12:01:05.239901	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4168	657	1	2026-04-14 12:51:23.706792	\N	تم تحويل مبلغ قدره 100000 الف دينار عراقي 	\N	\N	\N	morning
4169	989	3	2026-04-14 12:51:59.345926	\N	باشرت المريضة بعد ان اخذت استشارة اولية تحت اشراف دكتور عبد الله خان 	استشارة طبية	\N	\N	morning
4170	989	3	2026-04-14 12:52:16.959014	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
4171	989	3	2026-04-14 12:55:31.402447	\N	جلسة مفردة	تمارين تأهيلية	\N	\N	morning
4172	908	1	2026-04-14 13:03:09.648855	\N	جلسه علاج طبيعي سادسه	أجهزة علاج طبيعي	\N	\N	evening
4173	814	1	2026-04-14 13:04:47.525175	\N	جلسه علاج طبيعي العاشره	أجهزة علاج طبيعي	\N	\N	evening
4442	311	3	2026-04-18 18:39:03.66823	\N		أجهزة علاج طبيعي	\N	\N	evening
4175	780	1	2026-04-14 13:35:24.465064	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4176	948	3	2026-04-14 13:47:20.306444	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4177	948	3	2026-04-14 13:47:24.222782	\N		أجهزة علاج طبيعي	\N	\N	evening
4178	718	3	2026-04-14 13:51:49.023593	\N		تمارين تأهيلية	\N	\N	evening
4179	810	3	2026-04-14 13:52:02.08123	\N		أجهزة علاج طبيعي	\N	\N	evening
4180	868	3	2026-04-14 14:04:32.67843	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4181	868	3	2026-04-14 14:04:36.12204	\N		أجهزة علاج طبيعي	\N	\N	evening
4182	990	3	2026-04-14 14:05:57.554427	\N	بإنتظار إحضارها ورقة تحويل من طبيبها الإختصاص كون المريضة قامت بحقن مادة بوتكس قبل 10 ايام وادى الى تلف بأعصابها 	استشارة طبية	\N	\N	evening
4183	993	3	2026-04-14 14:22:22.552752	خدمة جديدة	طرف صناعي جديد (تكلفة: 150,000 د.ع)	\N	\N	\N	\N
4184	991	3	2026-04-14 14:33:54.106562	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4185	991	3	2026-04-14 14:34:17.234065	\N	باشرت المريضة بعد الإستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4186	725	3	2026-04-14 14:49:40.743515	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4187	725	3	2026-04-14 14:49:44.262223	\N		أجهزة علاج طبيعي	\N	\N	evening
4188	265	3	2026-04-14 14:50:23.523835	\N		أجهزة علاج طبيعي	\N	\N	evening
4189	992	3	2026-04-14 14:54:05.71552	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4190	992	3	2026-04-14 14:54:40.723237	\N	باشر المريض بعد الإستشارة 	روبوت	\N	\N	evening
4191	413	1	2026-04-14 15:05:07.488312	\N	اخذ قالب جديد تحت الركبه	\N	\N	\N	evening
4192	994	1	2026-04-14 15:12:36.987223	\N	فحص ومعاينه مع تحديد نوع مسند	\N	\N	\N	evening
4193	995	1	2026-04-14 15:16:06.524139	\N	فحص ومعاينه 	\N	\N	\N	evening
4194	874	1	2026-04-14 15:21:50.034958	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - 2 جلسه مجاني 	أجهزة علاج طبيعي	\N	\N	\N
4195	874	1	2026-04-14 15:22:46.719153	\N	جلسه علاج مجاني	أجهزة علاج طبيعي	\N	\N	evening
4196	413	1	2026-04-14 15:47:39.083751	خدمة جديدة	صيانة الطرف الصناعي (تكلفة: 500,000 د.ع) - قالب تحت الركبة 	\N	\N	\N	\N
4197	307	3	2026-04-14 15:57:44.912732	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4198	307	3	2026-04-14 15:57:48.506417	\N		أجهزة علاج طبيعي	\N	\N	evening
4199	689	3	2026-04-14 15:58:36.274369	\N		أجهزة علاج طبيعي	\N	\N	evening
4444	1024	3	2026-04-18 05:23:54	\N	جلسة مفردة 	أبر صينية	\N	\N	morning
4200	917	3	2026-04-14 16:01:56.420419	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4201	917	3	2026-04-14 16:02:00.58751	\N		أجهزة علاج طبيعي	\N	\N	evening
4202	997	1	2026-04-14 16:06:26.130534	\N	جلسه اجهزه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4203	875	3	2026-04-14 16:14:35.923243	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	evening
4204	911	3	2026-04-14 16:55:49.510626	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4205	911	3	2026-04-14 16:55:54.301266	\N		أجهزة علاج طبيعي	\N	\N	evening
4206	965	3	2026-04-14 17:09:48.812499	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4207	965	3	2026-04-14 17:09:52.651991	\N		أجهزة علاج طبيعي	\N	\N	evening
4208	996	3	2026-04-14 17:23:33.59306	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4209	996	3	2026-04-14 17:25:54.645772	\N	المريض من المراجعين القديمين للمركز انقطع فترة وعاود للعلاج الان	أجهزة علاج طبيعي	\N	\N	evening
4210	222	3	2026-04-14 17:34:08.998609	\N		تمارين تأهيلية	\N	\N	evening
4211	998	3	2026-04-14 17:35:05.83639	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4212	998	3	2026-04-14 17:35:28.509904	\N	باشر المريض بعد الإستشارة عند دكتور مصطفى	أجهزة علاج طبيعي	\N	\N	evening
4213	999	3	2026-04-14 18:18:29.252074	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4214	999	3	2026-04-14 18:18:57.749863	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4215	931	3	2026-04-14 18:20:16.237909	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4216	931	3	2026-04-14 18:20:24.93903	\N		أجهزة علاج طبيعي	\N	\N	evening
4217	311	3	2026-04-14 18:21:23.058572	\N		أجهزة علاج طبيعي	\N	\N	evening
4218	887	3	2026-04-14 18:21:43.698044	\N		أجهزة علاج طبيعي	\N	\N	evening
4219	181	3	2026-04-15 05:20:24.607272	\N	الجلسة الثالثة البكج	تمارين تأهيلية	\N	\N	morning
4220	767	3	2026-04-15 05:21:20.837477	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4221	767	3	2026-04-08 05:21:47	\N		روبوت	\N	\N	morning
4222	784	3	2026-04-15 06:00:20.465104	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4223	784	3	2026-04-15 06:00:33.644512	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4224	987	3	2026-04-15 06:20:53.000941	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4225	987	3	2026-04-15 06:21:15.594246	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
4226	509	3	2026-04-15 06:41:56.833269	\N	الجلسة 12 مجانية	تمارين تأهيلية	\N	\N	morning
4227	1000	3	2026-04-15 06:50:02.218638	\N	تم اخذ الاستشارة من قبل الطبيب المعالج عبد الله خان وسوف يباشر بالجلسات من الاسبوع القادم	استشارة طبية	\N	\N	morning
4228	467	3	2026-04-15 07:46:47.506724	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4229	467	3	2026-04-15 07:46:59.078618	\N	الجلسة الرابعة من البكج	روبوت	\N	\N	morning
4230	891	2	2026-04-15 08:53:12.846603	\N	تم لبس الطرف وتم الاستلام والتدريب عليه	\N	\N	\N	morning
4231	970	3	2026-04-15 09:27:39.54448	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4232	1002	3	2026-04-15 09:43:32.637316	\N	باشر المريض بعد ان اخذ استشارة اولية عند الطبيب المعالج عبد الله خان حيث ابلغه بانه يحتاج الى 6 جلسات لكن المريض لديه سفر في وقت قريب لذلك باشر بجلسات فردية 	استشارة طبية	\N	\N	morning
4233	1002	3	2026-04-15 09:43:42.034054	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4234	1002	3	2026-04-15 09:43:57.15238	\N	جلسة فردية	أجهزة علاج طبيعي	\N	\N	morning
4235	1005	3	2026-04-15 10:15:04.853383	\N	اخذت استشارة وسوف تباشر غدا	استشارة طبية	\N	\N	morning
4236	1003	3	2026-04-15 10:59:57.994314	\N	باشر المريض بعد ان اتم الاستشارة الاولية تحت اشراف الطبيب المعالج عبد الله خان 	استشارة طبية	\N	\N	morning
4237	1003	3	2026-04-15 11:00:08.104773	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4238	745	1	2026-04-15 11:08:51.862664	\N	تدريب على الطرف	\N	\N	\N	morning
4239	806	3	2026-04-15 11:13:32.038365	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4240	806	3	2026-04-15 11:13:45.553172	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4241	125	3	2026-04-15 11:14:57.407784	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4242	742	1	2026-04-15 11:48:22.032336	\N	تدريب على الاطراف\n	\N	\N	\N	morning
4443	1027	3	2026-04-18 18:39:51.189778	\N	الجلسة الثانية لليوم الاول الشفت المسائي	أجهزة علاج طبيعي	\N	\N	evening
4244	949	1	2026-04-15 11:53:02.196733	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4245	949	1	2026-04-15 11:53:20.836552	\N	جلسه اجهزه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
4246	763	1	2026-04-15 11:56:26.583825	\N	جلسه روبوت	روبوت	\N	\N	morning
4247	1004	3	2026-04-15 12:00:26.364287	\N	باشر المريض بعد ان اتم الاستشارة الاولية من قبل الطبيب المعالج عبد الله خان	استشارة طبية	\N	\N	morning
4248	1004	3	2026-04-15 12:00:46.269414	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع) - جلسة مفردة	أجهزة علاج طبيعي	\N	\N	\N
4249	805	3	2026-04-15 12:07:33.243837	\N	الجلسة السادسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4250	471	1	2026-04-15 12:12:04.776885		test	\N	\N	\N	morning
4251	908	1	2026-04-15 13:07:58.354779	\N	جلسه علاج طبيعي سابعه	أجهزة علاج طبيعي	\N	\N	evening
4252	1007	1	2026-04-15 13:26:27.649674	\N	تم تسديد المبلغ كامل 	\N	\N	\N	evening
4253	1008	1	2026-04-15 13:45:42.328372	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4254	780	1	2026-04-15 13:51:31.619565	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4255	1006	3	2026-04-15 13:54:19.925289	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع) - اخذ المريض استشارة لدى دكتور مصطفى بعد استشارة الشفت الصباحي وقرر المباشرة يوم غد بعد ان دفع ثمن 4 جلسات مقدمة	أجهزة علاج طبيعي	\N	\N	\N
4256	608	3	2026-04-15 14:09:26.638107	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4257	608	3	2026-04-15 14:09:29.782987	\N		أجهزة علاج طبيعي	\N	\N	evening
4258	909	3	2026-04-15 14:11:21.244121	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4259	909	3	2026-04-15 14:11:26.013505	\N		أجهزة علاج طبيعي	\N	\N	evening
4260	976	3	2026-04-15 14:11:43.283303	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4261	976	3	2026-04-15 14:11:49.244354	\N		أجهزة علاج طبيعي	\N	\N	evening
4262	817	3	2026-04-15 14:13:52.459814	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4263	817	3	2026-04-15 14:13:56.08277	\N		أجهزة علاج طبيعي	\N	\N	evening
4264	818	3	2026-04-15 14:14:12.909118	\N		أجهزة علاج طبيعي	\N	\N	evening
4265	810	3	2026-04-15 14:14:47.887724	\N		أجهزة علاج طبيعي	\N	\N	evening
4266	952	3	2026-04-15 14:16:24.24012	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4267	952	3	2026-04-15 14:16:28.66035	\N		أجهزة علاج طبيعي	\N	\N	evening
4268	188	3	2026-04-15 14:33:02.235164	\N		أجهزة علاج طبيعي	\N	\N	evening
4269	927	1	2026-04-15 14:36:34.448866	\N	اخذ قياسات 	\N	\N	\N	evening
4270	869	3	2026-04-15 15:04:59.395573	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4271	869	3	2026-04-15 15:05:15.576731	\N	باشر المريض بعد استشارة مسبقة 	أجهزة علاج طبيعي	\N	\N	evening
4272	1009	1	2026-04-15 15:14:40.9692	\N	صيانه شتل لوك مع تجميل الطرف 	\N	\N	\N	evening
4273	874	1	2026-04-15 15:17:59.135021	\N	جلسه علاج طبيعي مجاني	أجهزة علاج طبيعي	\N	\N	evening
4274	978	3	2026-04-15 16:06:14.097586	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4275	978	3	2026-04-15 16:06:17.701911	\N		أجهزة علاج طبيعي	\N	\N	evening
4276	1011	1	2026-04-15 16:13:37.385563	\N	جلسه اولى	أجهزة علاج طبيعي	\N	\N	evening
4277	1010	3	2026-04-15 16:31:15.958814	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4278	1010	3	2026-04-15 16:31:31.355007	\N	باشر المريض بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4279	747	3	2026-04-15 16:33:38.260641	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4280	747	3	2026-04-15 16:33:41.643465	\N		روبوت	\N	\N	evening
4281	996	3	2026-04-15 16:34:03.371505	\N		أجهزة علاج طبيعي	\N	\N	evening
4282	981	3	2026-04-15 16:41:19.762178	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4283	981	3	2026-04-15 16:41:23.366094	\N		أجهزة علاج طبيعي	\N	\N	evening
4284	999	3	2026-04-15 16:47:36.795253	\N		أجهزة علاج طبيعي	\N	\N	evening
4285	886	3	2026-04-15 16:47:52.382751	\N		أجهزة علاج طبيعي	\N	\N	evening
4286	1014	4	2026-04-15 17:16:10.659388	\N	استعلام عن اصبع	\N	\N	\N	evening
4287	966	3	2026-04-15 17:40:29.084838	\N		أجهزة علاج طبيعي	\N	\N	evening
4288	977	3	2026-04-15 17:41:19.780152	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4289	977	3	2026-04-15 17:41:23.993385	\N		أجهزة علاج طبيعي	\N	\N	evening
4290	322	3	2026-04-15 17:41:43.028688	\N		أجهزة علاج طبيعي	\N	\N	evening
4291	931	3	2026-04-15 17:42:42.793425	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4292	931	3	2026-04-15 17:49:11.286451	\N		روبوت	\N	\N	evening
4293	1013	3	2026-04-15 17:51:49.351411	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4294	1013	3	2026-04-15 17:52:13.426506	\N	باشرت المريضة بعد الاستشارة 	أجهزة علاج طبيعي	\N	\N	evening
4295	883	3	2026-04-15 18:26:36.439039	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4296	883	3	2026-04-15 18:26:40.125122	\N		أجهزة علاج طبيعي	\N	\N	evening
4297	358	3	2026-04-15 18:27:00.699213	\N		أجهزة علاج طبيعي	\N	\N	evening
4298	822	3	2026-04-16 05:35:26.471285	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
4299	822	3	2026-04-16 05:35:35.456685	\N		تمارين تأهيلية	\N	\N	morning
4300	785	3	2026-04-16 05:38:14.365049	\N	جلسة محجوزة مسبقا	روبوت	\N	\N	morning
4301	153	3	2026-04-16 06:02:50.948268	خدمة جديدة	جلسات علاج إضافية - تمارين تأهيلية (1 جلسة) (تكلفة: 25,000 د.ع)	تمارين تأهيلية	\N	\N	\N
4303	785	3	2026-04-16 06:04:07.090609	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع) - حجز جلسة ليوم الاثنين القادم	روبوت	\N	\N	\N
4304	509	3	2026-04-16 06:05:44.728854	\N	الجلسة 13 مجانية	تمارين تأهيلية	\N	\N	morning
4305	784	3	2026-04-16 06:42:51.044944	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4306	900	3	2026-04-16 06:43:17.457498	\N	الجلسة الثالثة	أجهزة علاج طبيعي	\N	\N	morning
4307	1015	2	2026-04-16 07:39:23.59309	\N	تم عرض له مساند عدد2 AFO	\N	\N	\N	morning
4308	695	2	2026-04-16 07:48:04.598237	\N	استلام القالب 	\N	\N	\N	morning
4309	865	3	2026-04-16 08:54:03.196051	\N	الجلسة الرابعة من البكج	تمارين تأهيلية	\N	\N	morning
4310	933	3	2026-04-16 09:12:34.648886	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4311	933	3	2026-04-16 09:12:41.759208	\N		أجهزة علاج طبيعي	\N	\N	morning
4312	467	3	2026-04-16 09:13:43.433047	\N	الجلسة الخامسة من البكج	روبوت	\N	\N	morning
4313	467	3	2026-04-16 09:13:55.537957	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4314	788	3	2026-04-16 09:14:41.008703	\N	الجلسة الاولى من البكج	روبوت	\N	\N	morning
4315	495	3	2026-04-16 09:15:13.508026	\N	الجلسة الخامسة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4316	591	2	2026-04-16 09:15:55.553851	\N	تم اخذ قالب م/محمد باقر 	\N	\N	\N	morning
4317	1017	1	2026-04-15 10:50:13	\N	فحص ومعاينه 	\N	\N	\N	morning
4318	1011	1	2026-04-16 10:57:41.628692	\N	جلسه ثانيه	أجهزة علاج طبيعي	\N	\N	morning
4319	970	3	2026-04-16 11:26:37.271694	\N	الجلسة الرابعة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4320	640	3	2026-04-16 11:27:25.311568	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4321	973	3	2026-04-16 11:28:09.537384	\N	الجلسة الثالثة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4322	727	3	2026-04-16 11:36:17.214762	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع) - جلسة اليوم وجلسة حجز ليوم الاحد القادم	أجهزة علاج طبيعي	\N	\N	\N
4323	727	3	2026-04-16 11:36:25.974099	\N		أجهزة علاج طبيعي	\N	\N	morning
4324	1008	1	2026-04-16 11:49:08.195343	\N	جلسه علاج طبيعي 	أجهزة علاج طبيعي	\N	\N	morning
4325	1004	3	2026-04-16 12:18:06.042978	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4326	1021	1	2026-04-16 12:47:41.445061	خدمة جديدة	خدمة أخرى (تكلفة: 150,000 د.ع) - شراء مساند afo عدد 2 	\N	\N	\N	\N
4327	1021	1	2026-04-16 12:47:56.869558	\N	اخذ قالب 	\N	\N	\N	morning
4328	1020	1	2026-04-16 12:48:50.361421	\N	فحص ومعاينه مع تحديد نوع القالب 	\N	\N	\N	morning
4329	908	1	2026-04-16 12:50:15.242989	\N	جلسه علاج طبيعي ثامنه	أجهزة علاج طبيعي	\N	\N	morning
4330	814	1	2026-04-16 13:14:12.98476	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (2 جلسة) (تكلفة: 50,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4331	812	3	2026-04-16 13:14:30.842467	\N		أجهزة علاج طبيعي	\N	\N	evening
4332	814	1	2026-04-16 13:14:53.897101	\N	جلسه اجهزه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4333	718	3	2026-04-16 13:15:23.484287	\N		تمارين تأهيلية	\N	\N	evening
4334	940	1	2026-04-16 13:24:17.678774	\N	فحص القالب مع التدريب	\N	\N	\N	evening
4335	897	1	2026-04-16 13:31:16.151015	\N	لغرض استلام مسند تقويمي للظهر	\N	\N	\N	evening
4337	948	3	2026-04-16 13:44:49.156186	\N		أجهزة علاج طبيعي	\N	\N	evening
4338	745	1	2026-04-16 14:13:42.494222	\N	تدريب على الطرف 	\N	\N	\N	evening
4339	1010	3	2026-04-16 14:16:32.308164	\N		أجهزة علاج طبيعي	\N	\N	evening
4341	307	3	2026-04-16 14:53:41.252459	\N		أجهزة علاج طبيعي	\N	\N	evening
4342	888	3	2026-04-16 15:01:55.558364	\N		أجهزة علاج طبيعي	\N	\N	evening
4344	780	1	2026-04-16 15:21:10.333426	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	evening
4345	998	3	2026-04-16 15:41:27.068733	\N		أجهزة علاج طبيعي	\N	\N	evening
4346	995	1	2026-04-16 16:15:49.147235	\N	اخذ قالب	\N	\N	\N	evening
4347	999	3	2026-04-16 16:44:39.772628	\N		أجهزة علاج طبيعي	\N	\N	evening
4348	1023	1	2026-04-16 17:05:11.812687	\N	تعيار\n	\N	\N	\N	evening
4349	996	3	2026-04-16 17:18:31.141099	\N		أجهزة علاج طبيعي	\N	\N	evening
4350	224	3	2026-04-16 18:16:09.553071	خدمة جديدة	جلسات علاج إضافية - روبوت (1 جلسة) (تكلفة: 50,000 د.ع)	روبوت	\N	\N	\N
4351	224	3	2026-04-16 18:16:14.084531	\N		روبوت	\N	\N	evening
4352	784	3	2026-04-18 06:09:57.889011	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4353	1003	3	2026-04-18 06:22:22.473269	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4354	1025	3	2026-04-18 06:31:07.111354	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4355	900	3	2026-04-18 06:42:12.966466	\N	الجلسة الرابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4356	955	3	2026-04-18 07:01:03.355327	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4357	955	3	2026-04-18 07:02:03.67239	\N	باشرت المريض اليوم بعد ان اتمت الاستشارة الثانية من قبل الطبيب المعالبج مصطفى العضاض 	أجهزة علاج طبيعي	\N	\N	morning
4358	1025	3	2026-04-18 07:03:08.267192	\N	باشرت المريضة بعد ان اتمت الاستشارة الاولية من قبل الطبيب المعالج مصطفى العضاض	استشارة طبية	\N	\N	morning
4359	1028	3	2026-04-18 08:06:07.733828	\N	المريض قديم اخر جلسة كانت له في الشهر 12 ونطع المريض بسبب ظروف خاصة واليوم جاء واخذ استشارة عند الطبيب المعالج مصطفى العضاض وباشره بعدها	استشارة طبية	\N	\N	morning
4360	1028	3	2026-04-18 08:18:33.638488	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4361	976	3	2026-04-18 08:34:09.996787	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (12 جلسة) (تكلفة: 300,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4362	976	3	2026-04-18 08:34:28.492094	\N	الجلسة الاولى من البكج	أجهزة علاج طبيعي	\N	\N	morning
4363	495	3	2026-04-18 08:48:21.535641	\N	الجلسة السادسة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4364	1024	3	2026-04-18 08:52:51.219405	\N	المريض قديم وكان ياخذ جلساته عند الطبيب المعالج عبد الله خان واخر جلسة له كان في الشهر 12 واليوم جاء واخذ استشارة اولية عند الطبيب المعالج مصطفى العضاض وباشر بعدها مباشرة 	استشارة طبية	\N	\N	morning
4365	1024	3	2026-04-18 08:53:06.820823	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
4366	1026	3	2026-04-18 09:22:23.029366	\N	اخذت استشارة المريضة عند الطبيب المعالج مصطفى العضاض ولم تباشر لانها تحتاج الى عملية جراحية حسب ما اخبرها دكتور مصطفى	استشارة طبية	\N	\N	morning
4367	1029	3	2026-04-18 09:25:48.3598	\N	اخذ الاستشارة الاولية عند دكتور مصطفى العضاض وسوف يباشر يوم الخميس كون المريض لديه مراجعة 	استشارة طبية	\N	\N	morning
4368	892	2	2026-04-18 09:59:50.329749	\N	تم لبس الطرف والتدريب عليه +تجميل وتم الاستلام/تسديد مبلغ 	\N	\N	\N	morning
4369	1027	3	2026-04-18 10:52:22.346949	\N	تم اخذ استشارة طبية على الطبيب المعالج مصطفى العضاض وبعدها باشر المريض باول جلسته وكذلك تم ترقديه في المستشفى لمدة 6 ايام	استشارة طبية	\N	\N	morning
4370	1027	3	2026-04-18 10:52:44.168825	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (12 جلسة) (تكلفة: 300,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4371	1027	3	2026-04-18 10:53:14.304514	\N	الجلسة الاولى صباحا	أجهزة علاج طبيعي	\N	\N	morning
4372	640	3	2026-04-18 10:59:11.500099	\N	الجلسة الرابعة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4373	973	3	2026-04-18 10:59:51.13439	\N	الجلسة الرابعة والاخيرة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4374	640	3	2026-04-18 11:00:32.314036	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (4 جلسة) (تكلفة: 100,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4376	940	1	2026-04-18 11:47:11.867561	\N	تدريب على الطرف 	\N	\N	\N	morning
4377	694	1	2026-04-18 11:52:09.697115	\N	تم تحويل مبلغ وقدره 500000 الف دينار عراقي	\N	\N	\N	morning
4378	1008	1	2026-04-18 12:12:27.155897	\N	جلسه علاج طبيعي	أجهزة علاج طبيعي	\N	\N	morning
4379	805	3	2026-04-18 12:12:32.207934	\N	الجلسة السابعة من البكج	أجهزة علاج طبيعي	\N	\N	morning
4380	745	1	2026-04-18 12:17:55.945281	\N	تدريب على الطرف	\N	\N	\N	morning
4381	946	1	2026-04-18 12:46:28.133835	\N	لغرض استلام انسول عدد 2	\N	\N	\N	morning
4382	763	1	2026-04-18 12:49:49.321946	\N	جلسه روبوت	روبوت	\N	\N	morning
4383	814	1	2026-04-18 13:01:46.999297	\N	جلسه  اجهزه علاج طبيعي 	أجهزة علاج طبيعي	\N	\N	evening
4384	1030	2	2026-04-18 13:08:01.450923	\N	تم لبس الاطراف  والتدريب وتم الاستلام 	\N	\N	\N	evening
4445	1024	3	2026-04-19 05:25:52.323673	خدمة جديدة	جلسات علاج إضافية - أبر صينية (1 جلسة) (تكلفة: 25,000 د.ع)	أبر صينية	\N	\N	\N
4457	784	3	2026-04-19 06:24:34.1	\N	جلسة مفردة	أجهزة علاج طبيعي	\N	\N	morning
4375	1031	1	2026-04-18 13:50:26		صيانه المسند لديه بعض الملاضات عليه وتم استلام المسند من قبل المراجع مع تثبيت الادبتر مع فحص المسند test	\N	\N	\N	morning
4385	658	4	2026-04-18 14:15:54.772599	\N	تعيار الطرف	\N	\N	\N	evening
4468	1048	3	2026-04-19 11:34:52.843592	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (6 جلسة) (تكلفة: 150,000 د.ع) - باشر المريض اول جلسات العلاج الطبيعي مع اخصائي العلاج مصطفى العضاض بعد الاستشارة مباشرة	أجهزة علاج طبيعي	\N	\N	\N
4475	727	3	2026-04-19 12:22:59.014786	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4490	1052	3	2026-04-19 14:40:39.252198	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (3 جلسة) (تكلفة: 75,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4497	852	3	2026-04-19 15:29:09.973961	\N	باشر المريض بعد استشارة قديمة 	أجهزة علاج طبيعي	\N	\N	evening
4504	650	1	2026-04-19 16:41:22.868408	\N	تسليم المسند الى المركز لغرض تبديل اشرطه	\N	\N	\N	evening
4508	977	3	2026-04-19 16:56:35.17245	خدمة جديدة	جلسات علاج إضافية - أجهزة علاج طبيعي (1 جلسة) (تكلفة: 25,000 د.ع)	أجهزة علاج طبيعي	\N	\N	\N
4512	1045	3	2026-04-19 17:33:59.975116	\N	باشر المريض بعد استشارة قديمة 	تمارين تأهيلية	\N	\N	evening
\.


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE SET; Schema: _system; Owner: neondb_owner
--

SELECT pg_catalog.setval('_system.replit_database_migrations_v1_id_seq', 20, true);


--
-- Name: branch_passwords_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.branch_passwords_id_seq', 6, true);


--
-- Name: branch_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.branch_settings_id_seq', 2, true);


--
-- Name: branches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.branches_id_seq', 6, true);


--
-- Name: custom_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.custom_stats_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.documents_id_seq', 6, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);


--
-- Name: installment_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.installment_plans_id_seq', 1, false);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.invoice_items_id_seq', 1, false);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.invoices_id_seq', 1, false);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.patients_id_seq', 14, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.payments_id_seq', 20, true);


--
-- Name: survey_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.survey_answers_id_seq', 10, true);


--
-- Name: survey_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.survey_questions_id_seq', 25, true);


--
-- Name: survey_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.survey_responses_id_seq', 3, true);


--
-- Name: survey_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.survey_templates_id_seq', 3, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 4, true);


--
-- Name: system_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.system_users_id_seq', 6, true);


--
-- Name: treatment_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.treatment_plans_id_seq', 1, true);


--
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.visits_id_seq', 22, true);


--
-- Name: replit_database_migrations_v1 replit_database_migrations_v1_pkey; Type: CONSTRAINT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1
    ADD CONSTRAINT replit_database_migrations_v1_pkey PRIMARY KEY (id);


--
-- Name: branch_passwords branch_passwords_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_passwords
    ADD CONSTRAINT branch_passwords_branch_id_key UNIQUE (branch_id);


--
-- Name: branch_passwords branch_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_passwords
    ADD CONSTRAINT branch_passwords_pkey PRIMARY KEY (id);


--
-- Name: branch_settings branch_settings_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_settings
    ADD CONSTRAINT branch_settings_branch_id_key UNIQUE (branch_id);


--
-- Name: branch_settings branch_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_settings
    ADD CONSTRAINT branch_settings_pkey PRIMARY KEY (id);


--
-- Name: branches branches_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_name_key UNIQUE (name);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: custom_stats custom_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_stats
    ADD CONSTRAINT custom_stats_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: installment_plans installment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.installment_plans
    ADD CONSTRAINT installment_plans_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: survey_answers survey_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_pkey PRIMARY KEY (id);


--
-- Name: survey_questions survey_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_questions
    ADD CONSTRAINT survey_questions_pkey PRIMARY KEY (id);


--
-- Name: survey_responses survey_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (id);


--
-- Name: survey_templates survey_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_templates
    ADD CONSTRAINT survey_templates_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: system_users system_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_username_key UNIQUE (username);


--
-- Name: treatment_plans treatment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: idx_replit_database_migrations_v1_build_id; Type: INDEX; Schema: _system; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_replit_database_migrations_v1_build_id ON _system.replit_database_migrations_v1 USING btree (build_id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: branch_passwords branch_passwords_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_passwords
    ADD CONSTRAINT branch_passwords_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: branch_settings branch_settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_settings
    ADD CONSTRAINT branch_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: custom_stats custom_stats_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_stats
    ADD CONSTRAINT custom_stats_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: documents documents_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: installment_plans installment_plans_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.installment_plans
    ADD CONSTRAINT installment_plans_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: installment_plans installment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.installment_plans
    ADD CONSTRAINT installment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoices invoices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: invoices invoices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patients patients_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: payments payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: payments payments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: survey_answers survey_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.survey_questions(id);


--
-- Name: survey_answers survey_answers_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.survey_responses(id);


--
-- Name: survey_questions survey_questions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_questions
    ADD CONSTRAINT survey_questions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.survey_templates(id);


--
-- Name: survey_responses survey_responses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: survey_responses survey_responses_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: survey_responses survey_responses_surveyor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_surveyor_id_fkey FOREIGN KEY (surveyor_id) REFERENCES public.system_users(id);


--
-- Name: survey_responses survey_responses_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.survey_templates(id);


--
-- Name: system_users system_users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: treatment_plans treatment_plans_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: treatment_plans treatment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: treatment_plans treatment_plans_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.system_users(id);


--
-- Name: visits visits_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: visits visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict wOURtwfVHocIadMR1wZmfV2g0Fri16zviM8yLyO5KBKsbREJevu5pYaybhdXpo6

