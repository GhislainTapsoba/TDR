-- =======================
-- EXTENSIONS
-- =======================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =======================
-- ROLES
-- =======================
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

-- =======================
-- PERMISSIONS
-- =======================
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  resource character varying NOT NULL,
  action character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

-- =======================
-- ROLE PERMISSIONS
-- =======================
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_id_fkey
    FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

-- =======================
-- USERS
-- =======================
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  name character varying,
  role_id uuid,
  role character varying,
  password character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.roles(id)
);

-- =======================
-- PROJECTS
-- =======================
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  due_date timestamp with time zone,
  status character varying DEFAULT 'PLANNING'
    CHECK (status IN ('PLANNING','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED')),
  created_by_id uuid,
  manager_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_created_by_id_fkey
    FOREIGN KEY (created_by_id) REFERENCES public.users(id),
  CONSTRAINT projects_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES public.users(id)
);

-- =======================
-- STAGES
-- =======================
CREATE TABLE public.stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  duration integer,
  status character varying DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','BLOCKED')),
  project_id uuid NOT NULL,
  created_by_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stages_pkey PRIMARY KEY (id),
  CONSTRAINT stages_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT stages_created_by_id_fkey
    FOREIGN KEY (created_by_id) REFERENCES public.users(id)
);

-- =======================
-- TASKS
-- =======================
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  status character varying DEFAULT 'TODO'
    CHECK (status IN ('TODO','IN_PROGRESS','IN_REVIEW','COMPLETED','CANCELLED')),
  priority character varying DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  assigned_to_id uuid,
  project_id uuid NOT NULL,
  stage_id uuid,
  created_by_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assigned_to_id_fkey
    FOREIGN KEY (assigned_to_id) REFERENCES public.users(id),
  CONSTRAINT tasks_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT tasks_stage_id_fkey
    FOREIGN KEY (stage_id) REFERENCES public.stages(id),
  CONSTRAINT tasks_created_by_id_fkey
    FOREIGN KEY (created_by_id) REFERENCES public.users(id)
);

-- =======================
-- DOCUMENTS
-- =======================
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
  CONSTRAINT documents_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT documents_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);

-- =======================
-- COMMENTS
-- =======================
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text NOT NULL,
  task_id uuid NOT NULL,
  author_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT comments_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- =======================
-- ACTIVITY LOGS
-- =======================
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
  CONSTRAINT activity_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- =======================
-- USER SETTINGS
-- =======================
CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  language character varying DEFAULT 'fr',
  timezone character varying DEFAULT 'Europe/Paris',
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  theme character varying DEFAULT 'light'
    CHECK (theme IN ('light','dark','auto')),
  date_format character varying DEFAULT 'DD/MM/YYYY',
  items_per_page integer DEFAULT 20
    CHECK (items_per_page IN (10,20,50,100)),
  font_size character varying DEFAULT 'medium'
    CHECK (font_size IN ('small','medium','large')),
  compact_mode boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- =======================
-- NOTIFICATION PREFERENCES
-- =======================
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
  CONSTRAINT notification_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- =======================
-- NOTIFICATIONS
-- =======================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL DEFAULT 'INFO',
  title character varying NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- =======================
-- EMAIL LOGS
-- =======================
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid,
  recipient character varying NOT NULL,
  subject character varying NOT NULL,
  body text NOT NULL,
  status character varying DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','FAILED')),
  sent_at timestamp with time zone,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_recipient_id_fkey
    FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =======================
-- EMAIL CONFIRMATIONS
-- =======================
CREATE TABLE public.email_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token character varying NOT NULL UNIQUE,
  type character varying NOT NULL,
  user_id uuid NOT NULL,
  entity_type character varying NOT NULL,
  entity_id character varying NOT NULL,
  metadata jsonb,
  confirmed boolean DEFAULT false,
  confirmed_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_confirmations_pkey PRIMARY KEY (id),
  CONSTRAINT email_confirmations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
