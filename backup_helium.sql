--
-- PostgreSQL database dump
--

\restrict QxBp0qXALzCYXGyh92e9yIDKVpjVTY2HOdfMufXvwTrj7aAl82oWJMy3Z6qQK6Q

-- Dumped from database version 16.10
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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branch_passwords; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branch_passwords (
    id integer NOT NULL,
    branch_id integer NOT NULL,
    password text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.branch_passwords OWNER TO postgres;

--
-- Name: branch_passwords_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branch_passwords_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branch_passwords_id_seq OWNER TO postgres;

--
-- Name: branch_passwords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branch_passwords_id_seq OWNED BY public.branch_passwords.id;


--
-- Name: branch_settings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.branch_settings OWNER TO postgres;

--
-- Name: branch_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branch_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branch_settings_id_seq OWNER TO postgres;

--
-- Name: branch_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branch_settings_id_seq OWNED BY public.branch_settings.id;


--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    name text NOT NULL,
    location text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branches_id_seq OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: custom_stats; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.custom_stats OWNER TO postgres;

--
-- Name: custom_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.custom_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_stats_id_seq OWNER TO postgres;

--
-- Name: custom_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.custom_stats_id_seq OWNED BY public.custom_stats.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    document_type text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: installment_plans; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.installment_plans OWNER TO postgres;

--
-- Name: installment_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.installment_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.installment_plans_id_seq OWNER TO postgres;

--
-- Name: installment_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.installment_plans_id_seq OWNED BY public.installment_plans.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_items_id_seq OWNER TO postgres;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO postgres;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: survey_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.survey_answers (
    id integer NOT NULL,
    response_id integer NOT NULL,
    question_id integer NOT NULL,
    rating_value integer,
    text_value text,
    bool_value boolean
);


ALTER TABLE public.survey_answers OWNER TO postgres;

--
-- Name: survey_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.survey_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.survey_answers_id_seq OWNER TO postgres;

--
-- Name: survey_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.survey_answers_id_seq OWNED BY public.survey_answers.id;


--
-- Name: survey_questions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.survey_questions OWNER TO postgres;

--
-- Name: survey_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.survey_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.survey_questions_id_seq OWNER TO postgres;

--
-- Name: survey_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.survey_questions_id_seq OWNED BY public.survey_questions.id;


--
-- Name: survey_responses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.survey_responses OWNER TO postgres;

--
-- Name: survey_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.survey_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.survey_responses_id_seq OWNER TO postgres;

--
-- Name: survey_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.survey_responses_id_seq OWNED BY public.survey_responses.id;


--
-- Name: survey_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.survey_templates (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    target_type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.survey_templates OWNER TO postgres;

--
-- Name: survey_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.survey_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.survey_templates_id_seq OWNER TO postgres;

--
-- Name: survey_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.survey_templates_id_seq OWNED BY public.survey_templates.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO postgres;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: system_users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.system_users OWNER TO postgres;

--
-- Name: system_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_users_id_seq OWNER TO postgres;

--
-- Name: system_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_users_id_seq OWNED BY public.system_users.id;


--
-- Name: treatment_plans; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.treatment_plans OWNER TO postgres;

--
-- Name: treatment_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.treatment_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.treatment_plans_id_seq OWNER TO postgres;

--
-- Name: treatment_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.treatment_plans_id_seq OWNED BY public.treatment_plans.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: visits; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.visits OWNER TO postgres;

--
-- Name: visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.visits_id_seq OWNER TO postgres;

--
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.visits_id_seq OWNED BY public.visits.id;


--
-- Name: branch_passwords id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_passwords ALTER COLUMN id SET DEFAULT nextval('public.branch_passwords_id_seq'::regclass);


--
-- Name: branch_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_settings ALTER COLUMN id SET DEFAULT nextval('public.branch_settings_id_seq'::regclass);


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: custom_stats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_stats ALTER COLUMN id SET DEFAULT nextval('public.custom_stats_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: installment_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_plans ALTER COLUMN id SET DEFAULT nextval('public.installment_plans_id_seq'::regclass);


--
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: survey_answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_answers ALTER COLUMN id SET DEFAULT nextval('public.survey_answers_id_seq'::regclass);


--
-- Name: survey_questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_questions ALTER COLUMN id SET DEFAULT nextval('public.survey_questions_id_seq'::regclass);


--
-- Name: survey_responses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_responses ALTER COLUMN id SET DEFAULT nextval('public.survey_responses_id_seq'::regclass);


--
-- Name: survey_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_templates ALTER COLUMN id SET DEFAULT nextval('public.survey_templates_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: system_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_users ALTER COLUMN id SET DEFAULT nextval('public.system_users_id_seq'::regclass);


--
-- Name: treatment_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans ALTER COLUMN id SET DEFAULT nextval('public.treatment_plans_id_seq'::regclass);


--
-- Name: visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits ALTER COLUMN id SET DEFAULT nextval('public.visits_id_seq'::regclass);


--
-- Data for Name: branch_passwords; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branch_passwords (id, branch_id, password, updated_at) FROM stdin;
1	1	$2b$10$95yhc0nmor.ycbX0GBvGmu.Esct2SgO87kMEdW7vim7KVOne1fcBi	2026-02-02 10:39:28.926
3	2	$2b$10$QDbpIvMkM5Puc4TzOPOu7OjzK/dwEtE5V8sb3XcnkNemiBAom7gfm	2026-02-02 10:42:13.157
5	4	$2b$10$k0bXc19/SgpYzH7vDQ0yQ.wxPp4xoLjmyl2Y/lecsl6K6XLAf4v4K	2026-02-02 10:49:15.638623
6	5	$2b$10$WP6VN6qGOrl7RWK7rlsLm.gx.zSzJN0.c/V3gtnjAIeNlolZoQc6u	2026-02-02 10:49:26.813953
4	3	$2b$10$7RyxCpVJZHESKtahnpvDR.v6ZYuTg.RG1feeeIJsOXv6dSabX3Gcm	2026-02-23 11:12:24.838
\.


--
-- Data for Name: branch_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branch_settings (id, branch_id, show_patients, show_visits, show_payments, show_documents, show_statistics, show_accounting, show_expenses, updated_at, show_dashboard) FROM stdin;
1	1	t	t	t	t	t	t	t	2026-01-26 17:42:21.024	t
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (id, name, location, created_at) FROM stdin;
1	بايونك بغداد	بغداد	2026-01-12 08:59:55.820134
2	الوارث كربلاء	كربلاء	2026-01-12 08:59:55.820134
3	بايونك ذي قار	ذي قار	2026-01-12 08:59:55.820134
4	بايونك الموصل	الموصل	2026-01-12 08:59:55.820134
5	بايونك كركوك	كركوك	2026-01-12 08:59:55.820134
\.


--
-- Data for Name: custom_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_stats (id, name, description, stat_type, category, filter_field, filter_value, branch_id, is_global, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, patient_id, document_type, file_name, file_url, uploaded_at) FROM stdin;
1	3	report	B461830B-F596-4B92-91E0-4A7759C308A8.jpeg	/uploads/file-1768207406450-485464521.jpeg	2026-01-12 08:43:27.304199
2	4	report	IMG_1194.jpeg	/uploads/file-1768207545698-792093955.jpeg	2026-01-12 08:45:47.454893
3	8	report	4FC76915-5FFF-4F99-8488-67977FF862E4_1_105_c.jpeg	/uploads/file-1768419534754-223836851.jpeg	2026-01-14 19:38:55.164958
5	9	report	4FC76915-5FFF-4F99-8488-67977FF862E4_1_105_c.jpeg	/uploads/file-1768422834563-861134503.jpeg	2026-01-14 20:33:54.788046
6	9	report	100_DOPAMINE_RESOURCES.pdf	/uploads/file-1768422985771-64707084.pdf	2026-01-14 20:36:28.587705
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, branch_id, category, subcategory, description, amount, expense_date, payment_method, vendor, invoice_number, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: installment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.installment_plans (id, patient_id, branch_id, total_amount, installment_amount, number_of_installments, start_date, interval_days, status, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_items (id, invoice_id, description, service_type, quantity, unit_price, total) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, invoice_number, patient_id, branch_id, invoice_date, due_date, subtotal, discount, total, paid_amount, status, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id, name, age, weight, height, medical_condition, is_amputee, amputation_site, is_physiotherapy, disease_type, total_cost, created_at, injury_date, general_notes, prosthetic_type, treatment_type, branch_id, phone, address, injury_cause, silicon_type, silicon_size, suspension_system, foot_type, foot_size, knee_joint_type, is_medical_support, support_type, injury_side, referral_source, referral_notes, injury_type, injury_area, injuries, patient_classification) FROM stdin;
1	أحمد محمد	45	75kg	175cm	بتر تحت الركبة	t	ساق يمنى	f	\N	5000	2026-01-12 08:37:07.116303	\N	\N	\N	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N		\N	\N	\N	\N	\N
2	سارة علي	32	60kg	165cm	إصابة في العمود الفقري	f	\N	t	انزلاق غضروفي	1500	2026-01-12 08:37:07.148779	\N	\N	\N	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N		\N	\N	\N	\N	\N
3	تيست اول	30	70	180	amputee	t	الطرف الايمن تحت الركبة	f		3000000	2026-01-12 08:42:18.816103	\N	\N	\N	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N		\N	\N	\N	\N	\N
5	تيست ثاني	16	٦٠	١٦٤	amputee	t	اليمين تحت الركبة	f		3000000	2026-01-12 09:50:58.282909	2024-02-16		عرضر خاص		1	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N		\N	\N	\N	\N	\N
4	Test physical	70	80	160	physiotherapy	f		t	Knee joint replacement	225000	2026-01-12 08:44:54.3208	\N	\N	\N	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N		\N	\N	\N	\N	\N
8	تيست رابع	27	88	190	amputee	t	فوق الركبة ايسر	f		11000000	2026-01-12 10:50:19.862139	2026-01-01		هيدروليكي الماني		2				\N	\N	\N	\N	\N	\N	f	\N	\N		\N	\N	\N	\N	\N
9	تيست طباعة	45	77	180	amputee	t	تحت الركبة ايسر	f		0	2026-01-14 19:43:13.77706	2026-01-07		طرف بالعرض		1	١٢٣٤٥٦٧٨٩١	بغداد	طلق ناري	شتل لوك	٢٤	شتل لوك	سنكل	٢٦	لايوجد	f	\N	\N		\N	\N	\N	\N	\N
7	تيست ثالث	44	66	177	physiotherapy	f		t	Pcl	400000	2026-01-12 10:24:48.576114	2024-01-12			training	3										f				\N	\N	\N	\N	\N
11	مريض اختبار الجلسات_1771054894901	35	\N	\N	علاج طبيعي	f	\N	t	\N	150000	2026-02-14 07:41:34.902299	\N	\N	\N	\N	3	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N		\N	وثي، باركنسون	منطقة الظهر العلوية، منطقة الظهر السفلية	[{"type":"وثي","area":"منطقة الظهر العلوية","side":"كلاهما"},{"type":"باركنسون","area":"منطقة الظهر السفلية","side":"يسار"}]	\N
12	تيست كربلاء مسند	43	78	173	medical_support	f		f		100000	2026-02-22 10:14:31.470122	2026-02-22				2	1234567890	العنوان	اطلاق ناري 							t	مساند كاربونية 	يمين 	فيسبوك					new
13	تيست تصنيفي	44	77	167	amputee	t	احادي - طرف سفلي - يمين - جوبارت	f		-2	2026-03-16 10:27:10.310988	2026-03-09	مةبموةبوة	كمبةمةبةمب		1	1234567890	طكةبلنمكبةنمكةبنم	مةلممة	مبةمةبقفم	32	طميبومينم	ننب	43	نةةنمقب	f			طبيب خارجي					past
14	تيست تصنيف مع جفع جديد	55	77	167	amputee	t	احادي - طرف سفلي - يمين - خلال الركبة	f		997	2026-03-16 10:29:15.42507	2026-03-07	موةموة	ن يىنىةني		1	1234567890	نمةامنةالةنمةل	خهةثنمىة	نىةنيب	نيب	نةبنمة	نقةن	45	نةبقمة	f			تيك توك					new
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, patient_id, amount, notes, date, branch_id, payment_treatment_type, session_count, is_free_sessions) FROM stdin;
1	1	2000	دفعة أولى	2026-01-12 08:37:07.139972	\N	\N	\N	f
2	2	500	جلسة أولى	2026-01-12 08:37:07.153836	\N	\N	\N	f
7	4	25000	1st pay	2026-01-12 18:59:39.384024	1	\N	\N	f
9	8	10000000		2026-01-12 19:13:57.372348	2	\N	\N	f
10	8	500000		2026-01-12 19:32:16.382749	2	\N	\N	f
11	7	350000		2026-01-26 00:00:00	3	\N	\N	f
12	7	50000	دفعة أولية - جلسات علاج إضافية	2026-01-26 14:38:54.858	3	\N	\N	f
13	8	50000	اخر دفعة	2026-02-01 09:47:27.557	2	\N	\N	f
14	7	5000	test payment	2026-02-02 11:55:16.058	3	\N	\N	f
16	7	50000	kkkkk	2026-02-13 21:19:30.448	3	روبوت	3	f
17	7	45000	jjhhhgggggggggg	2026-02-14 07:24:26.834	3	روبوت	2	f
18	11	100000	دفعة اختبار 5 جلسات	2026-02-14 07:41:56.229358	3	روبوت	5	f
19	11	50000	دفعة إضافية 3 جلسات	2026-02-14 07:42:34.769375	3	روبوت	3	f
20	11	150000	جلسات علاج إضافية - روبوت (3 جلسة)	2026-02-21 18:41:48.211	3	روبوت	3	f
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire) FROM stdin;
cYyo-HGDBQIlq1OquzJgXQih2G1H3nrZ	{"cookie": {"path": "/", "secure": true, "expires": "2026-04-26T15:40:33.562Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "683bc2a5-f250-46c8-a5b1-94e94994b00b", "exp": 1776616833, "iat": 1776613233, "iss": "https://replit.com/oidc", "sub": "52975797", "email": "yasirsabeeh@yahoo.com", "at_hash": "ghg84uqgp8s-wcEjPqc9LQ", "username": "yasirsabeeh", "last_name": "Saadi", "first_name": "Yasir", "email_verified": true}, "expires_at": 1776616833, "access_token": "7Rp9K5gWYDhFwpGT_NM10bJkCqz17QstU7WE-Wk6Iz3", "refresh_token": "k-8N45oVojQ6IVfur9uXpT8tcUf-hOQ_Z3joSTk2Iuy"}}}	2026-04-26 15:46:30
\.


--
-- Data for Name: survey_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.survey_answers (id, response_id, question_id, rating_value, text_value, bool_value) FROM stdin;
1	3	1	7	\N	\N
2	3	2	8	\N	\N
3	3	3	10	\N	\N
4	3	4	5	\N	\N
5	3	5	3	\N	\N
6	3	6	7	\N	\N
7	3	7	8	\N	\N
8	3	8	9	\N	\N
9	3	9	9	\N	\N
10	3	10	7	\N	\N
\.


--
-- Data for Name: survey_questions; Type: TABLE DATA; Schema: public; Owner: postgres
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
-- Data for Name: survey_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.survey_responses (id, template_id, patient_id, branch_id, surveyor_id, surveyor_name, total_score, max_score, percentage, notes, completed_at) FROM stdin;
3	1	8	2	\N	\N	73	100	73	\N	2026-02-22 22:33:14.323391
\.


--
-- Data for Name: survey_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.survey_templates (id, name, description, target_type, is_active, created_at) FROM stdin;
1	تقييم خدمات الأطراف الصناعية	Prosthetics Services Assessment	prosthetics	t	2026-02-22 20:43:26.918802
2	تقييم خدمات العلاج الطبيعي	Physiotherapy Services Assessment	physiotherapy	t	2026-02-22 20:43:27.010826
3	تقييم عام للفرع	General Branch Assessment	general	t	2026-02-22 20:43:27.059817
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, setting_key, setting_value, updated_at) FROM stdin;
1	admin_password_hash	$2b$10$tDf63AphW.sIPO8UfmNxZed/6piXwq4kBgnigOnlIIrz9mPexNClG	2026-01-26 16:46:20.117694
2	admin_password		2026-01-26 16:46:20.122488
3	backup_email	yasirsabeeh@yahoo.com	2026-01-26 16:47:04.602338
4	last_daily_backup_date	2026-02-14	2026-02-14 20:55:02.608
\.


--
-- Data for Name: system_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_users (id, username, password_hash, display_name, branch_id, role, is_active, can_view_patients, can_add_patients, can_edit_patients, can_delete_patients, can_view_payments, can_add_payments, can_view_reports, can_manage_accounting, can_manage_settings, created_at, updated_at, can_edit_payments, can_delete_payments, can_manage_users, can_manage_treatment_plans, language, can_manage_surveys) FROM stdin;
1	hind	$2b$10$w9cd7hg8qn2l77dVa8J5EueqkL.MomPtpkl4NcvePlpXkOHL8ErNe	hind bionic	3	reception	t	t	t	f	f	t	t	f	f	f	2026-02-02 11:53:45.946142	2026-02-02 11:53:45.946142	f	f	f	f	ar	f
2	samaa	$2b$10$G5nOHd9iNP6tlCz0xEyvhuCVqNEd7VZdCt5QNW5NP2LsAhM07cP/6	samaa bionic	3	reception	t	t	t	f	f	t	t	f	f	f	2026-02-02 12:06:00.706677	2026-02-02 12:06:00.706677	f	f	f	f	ar	f
3	om zainab	$2b$10$GljvPOVcvZZuGXIDX2x02.oznY/aAiufLTbTK5e9jJyHkbtOV8dIu	om zainab warith	2	reception	t	t	t	f	f	t	t	f	f	f	2026-02-02 12:08:33.99721	2026-02-02 12:08:33.99721	f	f	f	f	ar	f
4	mustafa	$2b$10$bEH4FDUFbAfWJWuzaJnFn.M2/8Kd/6wuJSnxpASUK3ngGxstvM2B2	دكتور مصطفى العضاض	3	therapist	t	t	f	f	f	f	f	f	f	f	2026-02-16 18:46:01.166672	2026-02-16 18:46:01.166672	f	f	f	t	ar	f
5	abdullah	$2b$10$ZKQk3Vpm12org7pHhHkFJuvKsnNBn3LQqjLvehX0afADII/DlBj4a	dr abdullah	3	therapist	t	t	f	f	f	f	f	f	f	f	2026-02-17 03:15:49.199143	2026-02-17 03:15:49.199143	f	f	f	t	en	f
6	ist	$2b$10$HfY6lSXLH6ncwx0uysk.Te7ePYPor5G/Xz/4NBHgPYOSySez/uvK2	استبيان	3	surveyor	t	t	f	f	f	f	f	f	f	f	2026-02-22 21:43:22.345061	2026-02-22 21:43:22.345061	f	f	f	f	ar	t
\.


--
-- Data for Name: treatment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.treatment_plans (id, patient_id, branch_id, therapist_id, therapist_name, diagnosis, injury_type, injury_location, mmt_assessment, spasticity, sensation, pain_level, adl, session_count, session_frequency, device_type, goal_type, notes, created_at, updated_at, disease_history) FROM stdin;
1	11	3	4	دكتور مصطفى العضاض		[{"type":"وثي","area":"منطقة الظهر العلوية","side":"كلاهما"},{"type":"باركنسون","area":"منطقة الظهر السفلية","side":"يسار"}]	منطقة الظهر العلوية، منطقة الظهر السفلية	منتتنمنمن	ممننن	ممننن	ننمككك.	كمكمكمكم	5	iokl.	kl;.lk,	short_term	llkkj;;;;	2026-02-16 19:28:56.930682	2026-02-16 19:28:56.930682	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at) FROM stdin;
L6UrP4	L6UrP4@example.com	John	Doe	\N	2026-02-17 04:01:58.758447	2026-02-17 04:01:58.758447
52976224	yasir.s81@gmail.com	\N	\N	\N	2026-01-12 08:40:20.837692	2026-01-12 11:39:26.319
v0q3-w	v0q3-w@example.com	John	Doe	\N	2026-02-17 14:04:08.497371	2026-02-17 14:04:08.497371
test-multi-treat-admin	admin-test@example.com	Admin	Test	\N	2026-02-20 10:22:41.121547	2026-02-20 10:22:41.121547
e1I_Xe	e1I_Xe@example.com	Branch	Staff	\N	2026-02-22 09:31:50.070288	2026-02-22 09:31:50.070288
53032577	serwanwarith@gmail.com	mfl;fl;m;lfml	\N	\N	2026-02-22 10:11:41.831056	2026-02-22 10:11:41.831056
admin-survey-test	admin-survey@test.com	Admin	Survey	\N	2026-02-22 20:46:11.02351	2026-02-22 20:46:11.02351
FlSuhm	FlSuhm@example.com	John	Doe	\N	2026-01-25 23:04:09.063078	2026-01-25 23:04:09.063078
KW4zzZ	KW4zzZ@example.com	John	Doe	\N	2026-01-25 23:31:57.509275	2026-01-25 23:31:57.509275
admin_test_1	admin@test.com	Admin	Test	\N	2026-01-26 05:11:38.144964	2026-02-23 11:41:07.444
52983680	hyder.hason71@gmail.com	hyder	hason	\N	2026-02-22 10:37:10.849845	2026-03-09 10:17:51.81
PE7Rvs	PE7Rvs@example.com	Admin	User	\N	2026-01-26 16:56:02.007039	2026-01-26 16:56:02.007039
52975797	yasirsabeeh@yahoo.com	Yasir	Saadi	\N	2026-01-12 09:39:30.284266	2026-04-19 15:40:33.541
ojHHqB	ojHHqB@example.com	Test	User	\N	2026-02-14 05:41:24.749139	2026-02-14 05:41:24.749139
w4Mzt7	w4Mzt7@example.com	Test	User	\N	2026-02-14 07:40:12.12929	2026-02-14 07:40:12.12929
VkuPXG	VkuPXG@example.com	John	Doe	\N	2026-02-14 12:56:57.093393	2026-02-14 12:56:57.093393
\.


--
-- Data for Name: visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visits (id, patient_id, branch_id, visit_date, details, notes, treatment_type, session_count, cost, shift) FROM stdin;
1	4	1	2026-01-12 19:00:19.672751	\N	خدمة جديدة: جلسات علاج إضافية - came after 2 mnths (تكلفة: 100,000 د.ع)	\N	\N	\N	\N
4	8	2	2026-01-12 19:31:55.415237	\N	خدمة جديدة: صيانة الطرف الصناعي (تكلفة: 1,000,000 د.ع)	\N	\N	\N	\N
5	7	3	2026-01-25 09:04:11.740474	م٧٨فعغغاتاففففففف		\N	\N	\N	\N
6	7	3	2026-01-26 14:38:33.657019	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 5 د.ع)	\N	\N	\N	\N
7	7	3	2026-01-26 14:38:54.854568	\N	خدمة جديدة: جلسات علاج إضافية (تكلفة: 50,000 د.ع)	\N	\N	\N	\N
8	9	1	2026-01-31 14:49:40.072831	تعديل طرف وتقصيره	ملاحظات اضافية	\N	\N	\N	\N
9	7	3	2026-02-02 11:54:55.363688	test for new user		\N	\N	\N	\N
10	11	3	2026-02-14 07:42:09.815395	\N	زيارة اختبار أولى	روبوت	\N	\N	\N
11	11	3	2026-02-14 07:42:17.996834	\N	زيارة اختبار ثانية	تمارين تأهيلية	\N	\N	\N
12	11	3	2026-02-14 07:42:19.000261	\N	زيارة ثالثة	أجهات علية	\N	\N	\N
13	11	3	2026-02-14 07:42:51.756872	\N	زيارة حسابية 4	جهاز علاج طبيعي	\N	\N	\N
14	11	3	2026-02-14 07:42:52.761453	\N	زيارة حسابية 5	جهاز علاج طبيعي	\N	\N	\N
15	11	3	2026-02-14 07:42:53.78182	\N	زيارة حسابية 6	جهاز علاج طبيعي	\N	\N	\N
16	11	3	2026-02-14 07:42:54.785726	\N	زيارة حسابية 7	جهاز علاج طبيعي	\N	\N	\N
17	11	3	2026-02-14 07:42:55.791036	\N	زيارة حسابية 8	جهاز علاج طبيعي	\N	\N	\N
18	11	3	2026-02-14 07:43:06.074423	\N	زيارة تاسعة	أجهزة علاج طبيعي	\N	\N	\N
19	11	3	2026-01-10 14:05:06	\N	backdated-test-visit-GGnlT8	روبوت	\N	\N	morning
20	11	3	2026-02-17 14:05:14.503623	\N	today-test-visit-TNjTUq	تمارين تأهيلية	\N	\N	morning
21	11	3	2026-02-21 18:41:48.120008	خدمة جديدة	جلسات علاج إضافية - روبوت (3 جلسة) (تكلفة: 150,000 د.ع)	روبوت	\N	\N	\N
22	11	3	2026-02-21 18:48:19.885913	\N		روبوت	\N	\N	evening
\.


--
-- Name: branch_passwords_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branch_passwords_id_seq', 6, true);


--
-- Name: branch_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branch_settings_id_seq', 2, true);


--
-- Name: branches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branches_id_seq', 6, true);


--
-- Name: custom_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.custom_stats_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 6, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);


--
-- Name: installment_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.installment_plans_id_seq', 1, false);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_items_id_seq', 1, false);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 1, false);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patients_id_seq', 14, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 20, true);


--
-- Name: survey_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.survey_answers_id_seq', 10, true);


--
-- Name: survey_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.survey_questions_id_seq', 25, true);


--
-- Name: survey_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.survey_responses_id_seq', 3, true);


--
-- Name: survey_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.survey_templates_id_seq', 3, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 4, true);


--
-- Name: system_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_users_id_seq', 6, true);


--
-- Name: treatment_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.treatment_plans_id_seq', 1, true);


--
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.visits_id_seq', 22, true);


--
-- Name: branch_passwords branch_passwords_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_passwords
    ADD CONSTRAINT branch_passwords_branch_id_key UNIQUE (branch_id);


--
-- Name: branch_passwords branch_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_passwords
    ADD CONSTRAINT branch_passwords_pkey PRIMARY KEY (id);


--
-- Name: branch_settings branch_settings_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_settings
    ADD CONSTRAINT branch_settings_branch_id_key UNIQUE (branch_id);


--
-- Name: branch_settings branch_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_settings
    ADD CONSTRAINT branch_settings_pkey PRIMARY KEY (id);


--
-- Name: branches branches_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_name_key UNIQUE (name);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: custom_stats custom_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_stats
    ADD CONSTRAINT custom_stats_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: installment_plans installment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_plans
    ADD CONSTRAINT installment_plans_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: survey_answers survey_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_pkey PRIMARY KEY (id);


--
-- Name: survey_questions survey_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_questions
    ADD CONSTRAINT survey_questions_pkey PRIMARY KEY (id);


--
-- Name: survey_responses survey_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (id);


--
-- Name: survey_templates survey_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_templates
    ADD CONSTRAINT survey_templates_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: system_users system_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_username_key UNIQUE (username);


--
-- Name: treatment_plans treatment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: branch_passwords branch_passwords_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_passwords
    ADD CONSTRAINT branch_passwords_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: branch_settings branch_settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_settings
    ADD CONSTRAINT branch_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: custom_stats custom_stats_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_stats
    ADD CONSTRAINT custom_stats_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: documents documents_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: installment_plans installment_plans_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_plans
    ADD CONSTRAINT installment_plans_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: installment_plans installment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_plans
    ADD CONSTRAINT installment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoices invoices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: invoices invoices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patients patients_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: payments payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: payments payments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: survey_answers survey_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.survey_questions(id);


--
-- Name: survey_answers survey_answers_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.survey_responses(id);


--
-- Name: survey_questions survey_questions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_questions
    ADD CONSTRAINT survey_questions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.survey_templates(id);


--
-- Name: survey_responses survey_responses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: survey_responses survey_responses_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: survey_responses survey_responses_surveyor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_surveyor_id_fkey FOREIGN KEY (surveyor_id) REFERENCES public.system_users(id);


--
-- Name: survey_responses survey_responses_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.survey_templates(id);


--
-- Name: system_users system_users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: treatment_plans treatment_plans_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: treatment_plans treatment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: treatment_plans treatment_plans_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.system_users(id);


--
-- Name: visits visits_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: visits visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- PostgreSQL database dump complete
--

\unrestrict QxBp0qXALzCYXGyh92e9yIDKVpjVTY2HOdfMufXvwTrj7aAl82oWJMy3Z6qQK6Q

