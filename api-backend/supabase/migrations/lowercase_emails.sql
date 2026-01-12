-- Migration to normalize all user emails to lowercase
-- This ensures case-insensitive email matching for login

-- First, handle potential duplicates by keeping the first user (by created_at)
-- and deleting duplicates with the same lowercase email

WITH duplicates AS (
  SELECT
    id,
    LOWER(email) as lower_email,
    ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at ASC) as rn
  FROM users
)
DELETE FROM users
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now update all emails to lowercase
UPDATE users
SET email = LOWER(email);

-- Verify the changes
SELECT email, '✓ Email normalisé' as status
FROM users
ORDER BY email;
