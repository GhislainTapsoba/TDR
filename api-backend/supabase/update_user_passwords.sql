s-- Script pour mettre à jour les mots de passe des utilisateurs existants
-- Mot de passe : "password"
-- Hash bcrypt généré avec salt rounds = 10 : $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

UPDATE users
SET password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email IN (
  'arseneghislaintaps@gmail.com',
  'ghislain443480@gmail.com',
  'iaclaude3.5@gmail.com',
  'ousmane.balbone@deep-technologies.com'
);

-- Vérifier que les mots de passe ont été mis à jour
SELECT email, '✓ Mot de passe mis à jour' as status
FROM users
WHERE email IN (
  'arseneghislaintaps@gmail.com',
  'ghislain443480@gmail.com',
  'iaclaude3.5@gmail.com',
  'ousmane.balbone@deep-technologies.com'
);
