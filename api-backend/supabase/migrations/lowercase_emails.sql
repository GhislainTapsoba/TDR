-- Lowercase all existing emails in the users table
UPDATE public.users
SET email = LOWER(email)
WHERE email != LOWER(email);
