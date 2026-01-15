-- Migration: Add notification_preferences table
-- Date: 2024

-- Create notification_preferences table
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
