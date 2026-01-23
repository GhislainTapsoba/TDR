-- Add refusal_reason column to tasks table
ALTER TABLE public.tasks
ADD COLUMN refusal_reason text;

-- Update status CHECK constraint to include 'REFUSED'
ALTER TABLE public.tasks
DROP CONSTRAINT tasks_status_check;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('TODO','IN_PROGRESS','IN_REVIEW','COMPLETED','CANCELLED','REFUSED'));
