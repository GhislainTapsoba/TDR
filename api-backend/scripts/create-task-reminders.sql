-- Créer la table pour suivre les rappels envoyés
CREATE TABLE IF NOT EXISTS task_reminders (
    id SERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL, -- 'in_2_days', 'tomorrow', 'today'
    sent_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_type_date ON task_reminders(reminder_type, DATE(created_at));

-- Ajouter une colonne phone aux utilisateurs si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);