-- Extension pour UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------
-- USERS
-- -----------------------
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  name character varying,
  role character varying DEFAULT 'EMPLOYEE'::character varying CHECK (role::text = ANY (ARRAY['ADMIN'::character varying, 'PROJECT_MANAGER'::character varying, 'EMPLOYEE'::character varying, 'VIEWER'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  password character varying,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- -----------------------
-- PROJECTS
-- -----------------------
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  due_date timestamp with time zone,
  status character varying DEFAULT 'PLANNING'::character varying CHECK (status::text = ANY (ARRAY['PLANNING'::character varying, 'IN_PROGRESS'::character varying, 'ON_HOLD'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying]::text[])),
  created_by_id uuid,
  manager_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id),
  CONSTRAINT projects_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id)
);

-- -----------------------
-- STAGES
-- -----------------------
CREATE TABLE public.stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  duration integer,
  status character varying DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'BLOCKED'::character varying]::text[])),
  project_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by_id uuid,
  CONSTRAINT stages_pkey PRIMARY KEY (id),
  CONSTRAINT stages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT stages_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id)
);

-- -----------------------
-- TASKS
-- -----------------------
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  status character varying DEFAULT 'TODO'::character varying CHECK (status::text = ANY (ARRAY['TODO'::character varying, 'IN_PROGRESS'::character varying, 'IN_REVIEW'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying]::text[])),
  priority character varying DEFAULT 'MEDIUM'::character varying CHECK (priority::text = ANY (ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'URGENT'::character varying]::text[])),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  assigned_to_id uuid,
  project_id uuid NOT NULL,
  stage_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by_id uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.users(id),
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT tasks_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(id),
  CONSTRAINT tasks_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id)
);

-- -----------------------
-- DOCUMENTS
-- -----------------------
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  file_url text NOT NULL,
  file_type character varying,
  file_size bigint,
  description text,
  project_id uuid,
  task_id uuid,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT documents_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);

-- -----------------------
-- COMMENTS
-- -----------------------
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text NOT NULL,
  task_id uuid NOT NULL,
  author_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- -----------------------
-- ACTIVITY LOGS
-- -----------------------
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action character varying NOT NULL,
  entity_type character varying NOT NULL,
  entity_id uuid NOT NULL,
  details text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- -----------------------
-- USER SETTINGS
-- -----------------------
CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  language character varying DEFAULT 'fr'::character varying,
  timezone character varying DEFAULT 'Europe/Paris'::character varying,
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  theme character varying DEFAULT 'light'::character varying CHECK (theme::text = ANY (ARRAY['light'::character varying, 'dark'::character varying, 'auto'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  date_format character varying DEFAULT 'DD/MM/YYYY'::character varying,
  items_per_page integer DEFAULT 20 CHECK (items_per_page = ANY (ARRAY[10, 20, 50, 100])),
  font_size character varying DEFAULT 'medium'::character varying CHECK (font_size::text = ANY (ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying]::text[])),
  compact_mode boolean DEFAULT false,
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- -----------------------
-- NOTIFICATIONS & PREFERENCES
-- -----------------------
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_task_assigned boolean DEFAULT true,
  email_task_updated boolean DEFAULT true,
  email_task_due boolean DEFAULT true,
  email_stage_completed boolean DEFAULT false,
  email_project_created boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  daily_summary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL DEFAULT 'INFO'::character varying CHECK (type::text = ANY (ARRAY['INFO'::character varying, 'SUCCESS'::character varying, 'WARNING'::character varying, 'ERROR'::character varying, 'TASK_ASSIGNED'::character varying, 'TASK_UPDATED'::character varying, 'TASK_COMPLETED'::character varying, 'STAGE_COMPLETED'::character varying, 'PROJECT_DEADLINE'::character varying, 'MENTION'::character varying, 'COMMENT'::character varying]::text[])),
  title character varying NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- -----------------------
-- EMAILS
-- -----------------------
CREATE TABLE public.email_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token character varying NOT NULL UNIQUE,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['TASK_ASSIGNMENT'::character varying, 'TASK_STATUS_CHANGE'::character varying, 'STAGE_STATUS_CHANGE'::character varying, 'PROJECT_CREATED'::character varying]::text[])),
  user_id uuid NOT NULL,
  entity_type character varying NOT NULL,
  entity_id uuid NOT NULL,
  metadata jsonb,
  confirmed boolean DEFAULT false,
  confirmed_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_confirmations_pkey PRIMARY KEY (id),
  CONSTRAINT email_confirmations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid,
  recipient character varying NOT NULL,
  subject character varying NOT NULL,
  body text NOT NULL,
  status character varying DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'SENT'::character varying, 'DELIVERED'::character varying, 'OPENED'::character varying, 'CLICKED'::character varying, 'FAILED'::character varying, 'BOUNCED'::character varying]::text[])),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  error_message text,
  retry_count integer DEFAULT 0,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id)
);

-- -----------------------
-- PROJECT MEMBERS
-- -----------------------
CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying DEFAULT 'member'::character varying,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_members_pkey PRIMARY KEY (id),
  CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
