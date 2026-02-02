-- Créer la table pour suivre les réponses aux tâches
CREATE TABLE IF NOT EXISTS task_responses (
    id SERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response VARCHAR(20) NOT NULL, -- 'accepted', 'rejected'
    responded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(task_id, user_id) -- Un utilisateur ne peut répondre qu'une fois par tâche
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_task_responses_task_user ON task_responses(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_responses_task_id ON task_responses(task_id);