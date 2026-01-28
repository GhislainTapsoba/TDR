const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

/**
 * Génère une URL avec redirection forcée (déconnexion + login)
 * Utile pour éviter les problèmes de session partagée en environnement local
 */
function createRedirectUrl(path: string): string {
  return `${FRONTEND_URL}/redirect?to=${encodeURIComponent(path)}`;
}

// Template de base avec style
const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification - Plateforme de Gestion</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e9ecef;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
    }
    .task-details {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .task-details p {
      margin: 8px 0;
    }
    .priority-high {
      color: #dc3545;
      font-weight: bold;
    }
    .priority-medium {
      color: #fd7e14;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Plateforme de Gestion de Projets</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
      <p>&copy; ${new Date().getFullYear()} Plateforme de Gestion de Projets. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

// Template: Assignation de tâche avec confirmation
export function taskAssignedTemplate(data: {
  userName: string;
  taskTitle: string;
  taskDescription?: string;
  projectName: string;
  dueDate?: string;
  priority: string;
  taskId: string;
  confirmationToken?: string;
}): string {
  const priorityClass = data.priority === 'HIGH' || data.priority === 'URGENT' ? 'priority-high' : 'priority-medium';

  const content = `
    <h2>Nouvelle tâche assignée</h2>
    <p>Bonjour <strong>${data.userName}</strong>,</p>
    <p>Une nouvelle tâche vous a été assignée dans le projet <strong>${data.projectName}</strong>.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.taskTitle}</h3>
      ${data.taskDescription ? `<p>${data.taskDescription}</p>` : ''}
      <p><strong>Priorité:</strong> <span class="${priorityClass}">${data.priority}</span></p>
      ${data.dueDate ? `<p><strong>Échéance:</strong> ${new Date(data.dueDate).toLocaleDateString('fr-FR')}</p>` : ''}
    </div>

    ${data.confirmationToken ? `
      <div class="info-box" style="background: #d1ecf1; border-left-color: #0c5460;">
        <p><strong>📧 Action requise:</strong> Veuillez confirmer la réception et démarrer la tâche, ou refuser si vous ne pouvez pas la réaliser.</p>
      </div>

      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 5px; text-align: center;">
            <a href="${FRONTEND_URL}/api/confirm-email?token=${data.confirmationToken}" class="button" style="background: #28a745; display: inline-block; padding: 12px 30px; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold;">
              ✓ Confirmer et démarrer
            </a>
          </td>
          <td style="padding: 5px; text-align: center;">
            <a href="${FRONTEND_URL}/redirect?reject_task=true&taskId=${data.taskId}" class="button" style="background: #dc3545; display: inline-block; padding: 12px 30px; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold;">
              ✕ Refuser la tâche
            </a>
          </td>
        </tr>
      </table>

      <p style="text-align: center; margin-top: 10px;">
        <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" style="color: #667eea; text-decoration: none;">
          Ou consulter la tâche
        </a>
      </p>
    ` : `
      <p style="text-align: center;">
        <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button">
          Voir la tâche
        </a>
      </p>
    `}

    <div class="info-box">
      <p><strong>💡 Note:</strong> La confirmation de réception fera automatiquement passer le statut de la tâche à "EN COURS".</p>
    </div>
  `;

  return baseTemplate(content);
}

// Template: Mise à jour de tâche
export function taskUpdatedTemplate(data: {
  userName: string;
  taskTitle: string;
  changes: string;
  taskId: string;
  updatedBy: string;
}): string {
  const content = `
    <h2>Tâche mise à jour</h2>
    <p>Bonjour <strong>${data.userName}</strong>,</p>
    <p>La tâche "<strong>${data.taskTitle}</strong>" a été mise à jour par <strong>${data.updatedBy}</strong>.</p>

    <div class="info-box">
      <h4 style="margin-top: 0;">Modifications:</h4>
      <p>${data.changes}</p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button">
        Consulter la tâche
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Étape complétée
export function stageCompletedTemplate(data: {
  stageName: string;
  projectName: string;
  completedBy: string;
  nextStageName?: string;
  tasksCreated: number;
  projectId: string;
}): string {
  const content = `
    <h2>✅ Étape complétée</h2>
    <p>L'étape "<strong>${data.stageName}</strong>" du projet <strong>${data.projectName}</strong> a été complétée par ${data.completedBy}.</p>

    ${data.tasksCreated > 0 ? `
      <div class="info-box">
        <p><strong>${data.tasksCreated}</strong> nouvelle(s) tâche(s) ont été créées automatiquement.</p>
      </div>
    ` : ''}

    ${data.nextStageName ? `
      <p>L'étape suivante "<strong>${data.nextStageName}</strong>" est maintenant en cours.</p>
    ` : ''}

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}`)}" class="button">
        Voir le projet
      </a>
    </p>
  `;

  return baseTemplate(content);
}

export function taskDueSoonTemplate(data: {
  userName: string;
  taskTitle: string;
  dueDate: string;
  daysRemaining: number;
  taskId: string;
}): string {
  const isOverdue = data.daysRemaining < 0;
  const urgency = data.daysRemaining <= 1 ? 'URGENT' : 'IMPORTANT';
  const urgencyColor = data.daysRemaining <= 1 ? '#dc3545' : '#fd7e14';

  let title = `⚠️ ${urgency}: Échéance proche`;
  let message = `La tâche "<strong>${data.taskTitle}</strong>" arrive à échéance dans <strong style="color: ${urgencyColor};">${data.daysRemaining} jour(s)</strong>.`;

  if (isOverdue) {
    title = `🚨 URGENT: Tâche en retard`;
    message = `La tâche "<strong>${data.taskTitle}</strong>" est en retard de <strong style="color: ${urgencyColor};">${Math.abs(data.daysRemaining)} jour(s)</strong>.`;
  } else if (data.daysRemaining === 0) {
    title = `⏰ URGENT: Échéance aujourd'hui`;
    message = `La tâche "<strong>${data.taskTitle}</strong>" arrive à échéance <strong style="color: ${urgencyColor};">aujourd'hui</strong>.`;
  }

  const content = `
    <h2 style="color: ${urgencyColor};">${title}</h2>
    <p>Bonjour <strong>${data.userName}</strong>,</p>
    <p>${message}</p>

    <div class="info-box">
      <p><strong>Date limite:</strong> ${new Date(data.dueDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</p>
    </div>

    <p>Merci de compléter cette tâche ou de mettre à jour son statut dès que possible.</p>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button">
        Accéder à la tâche
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Projet créé
export function projectCreatedTemplate(data: {
  projectName: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  createdBy: string;
  projectId: string;
}): string {
  const content = `
    <h2>🎉 Nouveau projet créé</h2>
    <p>Un nouveau projet a été créé par <strong>${data.createdBy}</strong>.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.projectName}</h3>
      ${data.description ? `<p>${data.description}</p>` : ''}
      ${data.startDate ? `<p><strong>Date de début:</strong> ${new Date(data.startDate).toLocaleDateString('fr-FR')}</p>` : ''}
      ${data.dueDate ? `<p><strong>Date de fin prévue:</strong> ${new Date(data.dueDate).toLocaleDateString('fr-FR')}</p>` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}`)}" class="button">
        Consulter le projet
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Changement de statut de tâche par manager
export function taskStatusChangeByManagerTemplate(data: {
  userName: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  managerName: string;
  projectName: string;
  taskId: string;
  confirmationToken?: string;
}): string {
  const content = `
    <h2>🔄 Statut de tâche modifié</h2>
    <p>Bonjour <strong>${data.userName}</strong>,</p>
    <p>Le manager <strong>${data.managerName}</strong> a modifié le statut de votre tâche dans le projet <strong>${data.projectName}</strong>.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.taskTitle}</h3>
      <p><strong>Ancien statut:</strong> ${data.oldStatus}</p>
      <p><strong>Nouveau statut:</strong> <span style="color: #28a745; font-weight: bold;">${data.newStatus}</span></p>
    </div>

    ${data.confirmationToken ? `
      <div class="info-box" style="background: #fff3cd; border-left-color: #856404;">
        <p><strong>⚠️ Confirmation requise:</strong> Veuillez confirmer la réception de cette modification en cliquant sur le bouton ci-dessous.</p>
      </div>

      <p style="text-align: center;">
        <a href="${FRONTEND_URL}/api/confirm-email?token=${data.confirmationToken}" class="button" style="background: #ffc107; color: #000;">
          ✓ Confirmer la réception
        </a>
      </p>

      <p style="font-size: 12px; color: #666; text-align: center;">
        Une fois confirmé, le manager pourra poursuivre la gestion de cette tâche.
      </p>
    ` : ''}

    <p style="text-align: center; margin-top: 20px;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" style="color: #667eea; text-decoration: none;">
        Consulter la tâche
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Changement de statut d'étape par employé
export function stageStatusChangeByEmployeeTemplate(data: {
  managerName: string;
  stageName: string;
  oldStatus: string;
  newStatus: string;
  employeeName: string;
  projectName: string;
  projectId: string;
}): string {
  const content = `
    <h2>📊 Statut d'étape modifié</h2>
    <p>Bonjour <strong>${data.managerName}</strong>,</p>
    <p><strong>${data.employeeName}</strong> a modifié le statut de l'étape "<strong>${data.stageName}</strong>" dans le projet <strong>${data.projectName}</strong>.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.stageName}</h3>
      <p><strong>Ancien statut:</strong> ${data.oldStatus}</p>
      <p><strong>Nouveau statut:</strong> <span style="color: #28a745; font-weight: bold;">${data.newStatus}</span></p>
      <p><strong>Modifié par:</strong> ${data.employeeName}</p>
    </div>

    <div class="info-box">
      <p><strong>💼 Action suggérée:</strong> Vérifiez que ce changement correspond à l'avancement réel du projet.</p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}`)}" class="button">
        Consulter le projet
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Projet créé - Notification au créateur
export function projectCreatedNotificationTemplate(data: {
  creatorName: string;
  projectName: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  projectId: string;
}): string {
  const content = `
    <h2>🎉 Votre projet a été créé avec succès</h2>
    <p>Bonjour <strong>${data.creatorName}</strong>,</p>
    <p>Votre projet "<strong>${data.projectName}</strong>" a été créé avec succès sur la plateforme.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.projectName}</h3>
      ${data.description ? `<p>${data.description}</p>` : ''}
      ${data.startDate ? `<p><strong>Date de début:</strong> ${new Date(data.startDate).toLocaleDateString('fr-FR')}</p>` : ''}
      ${data.dueDate ? `<p><strong>Date de fin prévue:</strong> ${new Date(data.dueDate).toLocaleDateString('fr-FR')}</p>` : ''}
    </div>

    <div class="info-box">
      <p><strong>Prochaines étapes:</strong></p>
      <ul style="margin: 5px 0; padding-left: 20px;">
        <li>Créer les étapes du projet</li>
        <li>Ajouter des membres à l'équipe</li>
        <li>Créer et assigner des tâches</li>
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}`)}" class="button">
        Gérer le projet
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Tâche terminée - Notification au manager
export function taskCompletedByEmployeeTemplate(data: {
  managerName: string;
  taskTitle: string;
  employeeName: string;
  projectName: string;
  completionComment?: string;
  taskId: string;
}): string {
  const content = `
    <h2>✅ Tâche terminée</h2>
    <p>Bonjour <strong>${data.managerName}</strong>,</p>
    <p><strong>${data.employeeName}</strong> a marqué la tâche "<strong>${data.taskTitle}</strong>" comme terminée dans le projet <strong>${data.projectName}</strong>.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.taskTitle}</h3>
      <p><strong>Complétée par:</strong> ${data.employeeName}</p>
      ${data.completionComment ? `<p><strong>Commentaire:</strong> ${data.completionComment}</p>` : ''}
    </div>

    <div class="info-box" style="background: #d4edda; border-left-color: #155724;">
      <p><strong>Action requise:</strong> Veuillez vérifier et valider la complétion de cette tâche.</p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button" style="background: #28a745;">
        Vérifier la tâche
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Rapport hebdomadaire
export function weeklyReportTemplate(data: {
  userName: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
  projectsActive: number;
}): string {
  const content = `
    <h2>📊 Rapport hebdomadaire</h2>
    <p>Bonjour <strong>${data.userName}</strong>,</p>
    <p>Voici votre résumé d'activité de la semaine:</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">Vos statistiques</h3>
      <p>✅ Tâches terminées: <strong>${data.tasksCompleted}</strong></p>
      <p>🔄 Tâches en cours: <strong>${data.tasksInProgress}</strong></p>
      <p>📋 Tâches en attente: <strong>${data.tasksPending}</strong></p>
      <p>📁 Projets actifs: <strong>${data.projectsActive}</strong></p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl('/dashboard')}" class="button">
        Accéder au tableau de bord
      </a>
    </p>

    <div class="info-box">
      <p><strong>Continuez sur votre lancée!</strong> 💪</p>
    </div>
  `;

  return baseTemplate(content);
}

// Template: Toutes les étapes terminées - Notification au manager
export function allStagesCompletedTemplate(data: {
  managerName: string;
  projectName: string;
  projectDescription?: string;
  completedBy: string;
  projectId: string;
  stagesCompleted: number;
}): string {
  const content = `
    <h2>🎉 Projet terminé - Toutes les étapes sont complétées!</h2>
    <p>Bonjour <strong>${data.managerName}</strong>,</p>
    <p>Excellente nouvelle! <strong>${data.completedBy}</strong> vient de terminer la dernière étape du projet "<strong>${data.projectName}</strong>".</p>

    <div class="task-details" style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-left: 4px solid #28a745;">
      <h3 style="margin-top: 0; color: #155724;">✅ ${data.projectName}</h3>
      ${data.projectDescription ? `<p style="color: #155724;">${data.projectDescription}</p>` : ''}
      <p style="color: #155724;"><strong>Nombre d'étapes complétées:</strong> ${data.stagesCompleted}</p>
      <p style="color: #155724;"><strong>Terminé par:</strong> ${data.completedBy}</p>
    </div>

    <div class="info-box" style="background: #fff3cd; border-left-color: #856404;">
      <p><strong>📋 Prochaines actions suggérées:</strong></p>
      <ul style="margin: 5px 0; padding-left: 20px;">
        <li>Vérifier la qualité de toutes les livrables</li>
        <li>Planifier une réunion de clôture avec l'équipe</li>
        <li>Archiver le projet ou planifier les prochaines phases</li>
        <li>Assigner l'équipe à de nouveaux projets</li>
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}`)}" class="button" style="background: #28a745;">
        Consulter le projet
      </a>
    </p>

    <p style="text-align: center; margin-top: 20px;">
      <a href="${createRedirectUrl('/dashboard/projects')}" style="color: #667eea; text-decoration: none; font-size: 14px;">
        Voir tous vos projets →
      </a>
    </p>

    <div class="info-box" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-left-color: #1976d2;">
      <p style="text-align: center; margin: 0;">
        <strong>🎊 Félicitations à toute l'équipe pour ce projet réussi!</strong>
      </p>
    </div>
  `;

  return baseTemplate(content);
}

// Template: Tâche refusée par l'employé
export function taskRejectedByEmployeeTemplate(data: {
  employeeName: string;
  taskTitle: string;
  projectName: string;
  taskId: string;
  rejectionReason: string;
  managerName: string;
}): string {
  const content = `
    <h2 style="color: #dc3545;">❌ Tâche refusée</h2>
    <p>Bonjour <strong>${data.managerName}</strong>,</p>
    <p>L'employé <strong>${data.employeeName}</strong> a refusé la tâche "<strong>${data.taskTitle}</strong>" dans le projet <strong>${data.projectName}</strong>.</p>

    <div class="task-details" style="background: #f8d7da; border-left: 4px solid #dc3545;">
      <h3 style="margin-top: 0; color: #721c24;">${data.taskTitle}</h3>
      <p><strong>Employé:</strong> ${data.employeeName}</p>
      <p><strong>Statut:</strong> <span style="color: #dc3545; font-weight: bold;">REFUSÉE</span></p>
      <p><strong>Raison du refus:</strong><br/><em>${data.rejectionReason}</em></p>
    </div>

    <div class="info-box" style="background: #fff3cd; border-left-color: #856404;">
      <p><strong>⚠️ Action requise:</strong> Veuillez prendre contact avec l'employé pour comprendre les raisons du refus et réassigner la tâche si nécessaire.</p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button" style="background: #dc3545;">
        Consulter la tâche
      </a>
    </p>

    <div class="info-box">
      <p><strong>💡 Note:</strong> Le statut de la tâche n'a pas été modifié. Vous pouvez la réassigner à un autre employé ou la modifier selon les besoins.</p>
    </div>
  `;

  return baseTemplate(content);
}

// Template: Tâche refusée
export function taskRefusedTemplate(data: {
  taskTitle: string;
  projectName: string;
  refusedBy: string;
  refusalReason: string;
  taskId: string;
}): string {
  const content = `
    <h2 style="color: #dc3545;">❌ Tâche refusée</h2>
    <p>La tâche "<strong>${data.taskTitle}</strong>" du projet <strong>${data.projectName}</strong> a été refusée.</p>

    <div class="task-details" style="background: #f8d7da; border-left: 4px solid #dc3545;">
      <h3 style="margin-top: 0; color: #721c24;">${data.taskTitle}</h3>
      <p><strong>Refusée par:</strong> ${data.refusedBy}</p>
      <p><strong>Raison du refus:</strong><br/><em>${data.refusalReason}</em></p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button" style="background: #dc3545;">
        Consulter la tâche
      </a>
    </p>
  `;

  return baseTemplate(content);
}

/**
 * Template d'email pour notifier le changement de statut d'une tâche par un employé
 */
export function taskStatusChangedByEmployeeTemplate(data: {
  employeeName: string;
  taskTitle: string;
  taskId: string;
  projectTitle: string;
  projectId: string;
  oldStatus: string;
  newStatus: string;
  comment?: string;
}) {
  const statusLabels: Record<string, string> = {
    TODO: 'À faire',
    IN_PROGRESS: 'En cours',
    IN_REVIEW: 'En révision',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée'
  };

  const statusColors: Record<string, string> = {
    TODO: '#6c757d',
    IN_PROGRESS: '#0dcaf0',
    IN_REVIEW: '#ffc107',
    COMPLETED: '#28a745',
    CANCELLED: '#dc3545'
  };

  const oldStatusLabel = statusLabels[data.oldStatus] || data.oldStatus;
  const newStatusLabel = statusLabels[data.newStatus] || data.newStatus;
  const newStatusColor = statusColors[data.newStatus] || '#667eea';

  const content = `
    <h2 style="color: #333; margin-bottom: 20px;">📊 Changement de statut d'une tâche</h2>

    <p>Bonjour,</p>

    <p><strong>${data.employeeName}</strong> a modifié le statut d'une tâche :</p>

    <div class="info-box" style="background: #e7f3ff; border-left-color: #2196f3;">
      <p style="margin: 5px 0;"><strong>📋 Tâche:</strong> ${data.taskTitle}</p>
      <p style="margin: 5px 0;"><strong>📁 Projet:</strong> ${data.projectTitle}</p>
    </div>

    <div class="info-box" style="background: #f8f9fa; border-left: 4px solid ${newStatusColor};">
      <p style="margin: 5px 0;">
        <strong>Ancien statut:</strong> <span style="color: ${statusColors[data.oldStatus] || '#6c757d'};">${oldStatusLabel}</span>
      </p>
      <p style="margin: 5px 0;">
        <strong>Nouveau statut:</strong> <span style="color: ${newStatusColor}; font-weight: bold;">${newStatusLabel}</span>
      </p>
      <p style="margin: 5px 0;"><strong>Par:</strong> ${data.employeeName}</p>
    </div>

    ${data.comment ? `
    <div class="info-box" style="background: #fff3cd; border-left-color: #856404;">
      <p style="margin: 5px 0;"><strong>💬 Commentaire:</strong></p>
      <p style="margin: 10px 0; font-style: italic;">"${data.comment}"</p>
    </div>
    ` : ''}

    ${data.newStatus === 'COMPLETED' ? `
    <div class="info-box" style="background: #d4edda; border-left-color: #28a745;">
      <p style="color: #155724; margin: 0;"><strong>✅ Cette tâche est maintenant terminée!</strong></p>
      <p style="color: #155724; margin: 5px 0; font-size: 14px;">Vérifiez le travail et mettez à jour le statut du projet si nécessaire.</p>
    </div>
    ` : ''}

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button">
        Voir la tâche
      </a>
    </p>

    <p style="text-align: center; margin-top: 10px;">
      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}`)}" style="color: #667eea; text-decoration: none; font-size: 14px;">
        Voir le projet complet →
      </a>
    </p>
  `;

  return baseTemplate(content);
}

/**
 * Template d'email pour notifier le changement de statut d'une étape par un employé
 */
export function stageStatusChangedByEmployeeTemplate(data: {
  employeeName: string;
  stageName: string;
  stageId: string;
  projectTitle: string;
  projectId: string;
  oldStatus: string;
  newStatus: string;
  comment?: string;
}) {
  const statusLabels: Record<string, string> = {
    PENDING: 'En attente',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminée',
    BLOCKED: 'Bloquée'
  };

  const statusColors: Record<string, string> = {
    PENDING: '#6c757d',
    IN_PROGRESS: '#0dcaf0',
    COMPLETED: '#28a745',
    BLOCKED: '#dc3545'
  };

  const oldStatusLabel = statusLabels[data.oldStatus] || data.oldStatus;
  const newStatusLabel = statusLabels[data.newStatus] || data.newStatus;
  const newStatusColor = statusColors[data.newStatus] || '#667eea';

  const content = `
    <h2 style="color: #333; margin-bottom: 20px;">📈 Changement de statut d'une étape</h2>

    <p>Bonjour,</p>

    <p><strong>${data.employeeName}</strong> a modifié le statut d'une étape du projet :</p>

    <div class="info-box" style="background: #e7f3ff; border-left-color: #2196f3;">
      <p style="margin: 5px 0;"><strong>📊 Étape:</strong> ${data.stageName}</p>
      <p style="margin: 5px 0;"><strong>📁 Projet:</strong> ${data.projectTitle}</p>
    </div>

    <div class="info-box" style="background: #f8f9fa; border-left: 4px solid ${newStatusColor};">
      <p style="margin: 5px 0;">
        <strong>Ancien statut:</strong> <span style="color: ${statusColors[data.oldStatus] || '#6c757d'};">${oldStatusLabel}</span>
      </p>
      <p style="margin: 5px 0;">
        <strong>Nouveau statut:</strong> <span style="color: ${newStatusColor}; font-weight: bold;">${newStatusLabel}</span>
      </p>
      <p style="margin: 5px 0;"><strong>Par:</strong> ${data.employeeName}</p>
    </div>

    ${data.comment ? `
    <div class="info-box" style="background: #fff3cd; border-left-color: #856404;">
      <p style="margin: 5px 0;"><strong>💬 Commentaire:</strong></p>
      <p style="margin: 10px 0; font-style: italic;">"${data.comment}"</p>
    </div>
    ` : ''}

    ${data.newStatus === 'COMPLETED' ? `
    <div class="info-box" style="background: #d4edda; border-left-color: #28a745;">
      <p style="color: #155724; margin: 0;"><strong>✅ Cette étape est maintenant terminée!</strong></p>
      <p style="color: #155724; margin: 5px 0; font-size: 14px;">Vérifiez l'avancement global et mettez à jour le statut du projet si toutes les étapes sont terminées.</p>
    </div>
    ` : ''}

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}`)}" class="button">
        Voir le projet
      </a>
    </p>

    <p style="text-align: center; margin-top: 10px;">

      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}#stage-${data.stageId}`)}" style="color: #667eea; text-decoration: none; font-size: 14px;">
        Voir les détails de l'étape →
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Confirmation de démarrage de tâche par l'employé
export function employeeTaskConfirmationTemplate(data: {
  employeeName: string;
  taskTitle: string;
  projectName: string;
  taskId: string;
  managerName: string;
}): string {
  const content = `
    <h2>✅ Confirmation de Démarrage de Tâche</h2>
    <p>Bonjour <strong>${data.managerName}</strong>,</p>
    <p>L'employé <strong>${data.employeeName}</strong> a confirmé et démarré la tâche "<strong>${data.taskTitle}</strong>" dans le projet <strong>${data.projectName}</strong>.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.taskTitle}</h3>
      <p><strong>Employé:</strong> ${data.employeeName}</p>
      <p><strong>Statut:</strong> <span style="color: #28a745; font-weight: bold;">EN COURS</span></p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button">
        Consulter la tâche
      </a>
    </p>

    <div class="info-box">
      <p><strong>💡 Note:</strong> Le statut de la tâche a été automatiquement mis à jour.</p>
    </div>
  `;

  return baseTemplate(content);
}

// Template: Accusé de réception pour changement de statut de tâche
export function taskStatusChangeAcknowledgementTemplate(data: {
  employeeName: string;
  taskTitle: string;
  projectName: string;
  taskId: string;
  managerName: string;
  oldStatus: string;
  newStatus: string;
}): string {
  const statusLabels: Record<string, string> = {
    TODO: 'À faire',
    IN_PROGRESS: 'En cours',
    IN_REVIEW: 'En révision',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée'
  };

  const content = `
    <h2>📧 Accusé de Réception - Changement de Statut de Tâche</h2>
    <p>Bonjour <strong>${data.managerName}</strong>,</p>
    <p>L'employé <strong>${data.employeeName}</strong> a bien reçu et confirmé la notification de changement de statut de la tâche "<strong>${data.taskTitle}</strong>" dans le projet <strong>${data.projectName}</strong>.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.taskTitle}</h3>
      <p><strong>Employé:</strong> ${data.employeeName}</p>
      <p><strong>Ancien statut:</strong> ${statusLabels[data.oldStatus] || data.oldStatus}</p>
      <p><strong>Nouveau statut:</strong> <span style="color: #28a745; font-weight: bold;">${statusLabels[data.newStatus] || data.newStatus}</span></p>
    </div>

    <div class="info-box" style="background: #d4edda; border-left-color: #28a745;">
      <p><strong>✅ Confirmation:</strong> L'employé a pris connaissance du changement de statut et peut maintenant travailler en conséquence.</p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/tasks/${data.taskId}`)}" class="button">
        Consulter la tâche
      </a>
    </p>
  `;

  return baseTemplate(content);
}

// Template: Accusé de réception pour changement de statut d'étape
export function stageStatusChangeAcknowledgementTemplate(data: {
  employeeName: string;
  stageName: string;
  projectName: string;
  projectId: string;
  stageId: string;
  managerName: string;
  oldStatus: string;
  newStatus: string;
}): string {
  const statusLabels: Record<string, string> = {
    PENDING: 'En attente',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminée',
    BLOCKED: 'Bloquée'
  };

  const content = `
    <h2>📧 Accusé de Réception - Changement de Statut d'Étape</h2>
    <p>Bonjour <strong>${data.managerName}</strong>,</p>
    <p>L'employé <strong>${data.employeeName}</strong> a bien reçu et confirmé la notification de changement de statut de l'étape "<strong>${data.stageName}</strong>" dans le projet <strong>${data.projectName}</strong>.</p>

    <div class="task-details">
      <h3 style="margin-top: 0;">${data.stageName}</h3>
      <p><strong>Employé:</strong> ${data.employeeName}</p>
      <p><strong>Ancien statut:</strong> ${statusLabels[data.oldStatus] || data.oldStatus}</p>
      <p><strong>Nouveau statut:</strong> <span style="color: #28a745; font-weight: bold;">${statusLabels[data.newStatus] || data.newStatus}</span></p>
    </div>

    <div class="info-box" style="background: #d4edda; border-left-color: #28a745;">
      <p><strong>✅ Confirmation:</strong> L'employé a pris connaissance du changement de statut de l'étape.</p>
    </div>

    <p style="text-align: center;">
      <a href="${createRedirectUrl(`/dashboard/projects/${data.projectId}`)}" class="button">
        Consulter le projet
      </a>
    </p>
  `;

  return baseTemplate(content);
}

