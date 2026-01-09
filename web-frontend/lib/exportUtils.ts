import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Project, Task, User } from './api';

/**
 * Export utilities for generating PDF and Excel reports
 */

// ==================== PDF EXPORTS ====================

/**
 * Export projects to PDF
 */
export function exportProjectsToPDF(projects: Project[]) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Rapport des Projets', 14, 22);

  // Date
  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

  // Summary stats
  const stats = {
    total: projects.length,
    planning: projects.filter(p => p.status === 'PLANNING').length,
    inProgress: projects.filter(p => p.status === 'IN_PROGRESS').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    onHold: projects.filter(p => p.status === 'ON_HOLD').length,
    cancelled: projects.filter(p => p.status === 'CANCELLED').length,
  };

  doc.setFontSize(11);
  doc.text('Résumé:', 14, 40);
  doc.setFontSize(9);
  doc.text(`Total: ${stats.total} | Planification: ${stats.planning} | En cours: ${stats.inProgress} | Terminés: ${stats.completed}`, 14, 46);

  // Table
  const tableData = projects.map(p => [
    p.title,
    getStatusLabel(p.status),
    p.start_date ? new Date(p.start_date).toLocaleDateString('fr-FR') : '-',
    p.due_date ? new Date(p.due_date).toLocaleDateString('fr-FR') : '-',
    p.description?.substring(0, 50) || '-',
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['Projet', 'Statut', 'Début', 'Échéance', 'Description']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Save
  doc.save(`projets_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export tasks to PDF
 */
export function exportTasksToPDF(tasks: Task[]) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Rapport des Tâches', 14, 22);

  // Date
  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

  // Summary stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    inReview: tasks.filter(t => t.status === 'IN_REVIEW').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED').length,
  };

  doc.setFontSize(11);
  doc.text('Résumé:', 14, 40);
  doc.setFontSize(9);
  doc.text(`Total: ${stats.total} | À faire: ${stats.todo} | En cours: ${stats.inProgress} | Terminées: ${stats.completed} | En retard: ${stats.overdue}`, 14, 46);

  // Table
  const tableData = tasks.map(t => [
    t.title,
    getTaskStatusLabel(t.status),
    getPriorityLabel(t.priority),
    t.assigned_to?.name || 'Non assignée',
    t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR') : '-',
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['Tâche', 'Statut', 'Priorité', 'Assigné à', 'Échéance']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Save
  doc.save(`taches_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export users to PDF
 */
export function exportUsersToPDF(users: User[]) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Liste des Utilisateurs', 14, 22);

  // Date
  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

  // Summary stats
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    users: users.filter(u => u.role === 'user').length,
  };

  doc.setFontSize(11);
  doc.text('Résumé:', 14, 40);
  doc.setFontSize(9);
  doc.text(`Total: ${stats.total} | Administrateurs: ${stats.admins} | Chefs de Projet: ${stats.managers} | Employés: ${stats.users}`, 14, 46);

  // Table
  const tableData = users.map(u => [
    u.name,
    u.email,
    getRoleLabel(u.role),
    new Date(u.created_at).toLocaleDateString('fr-FR'),
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['Nom', 'Email', 'Rôle', 'Créé le']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Save
  doc.save(`utilisateurs_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export analytics report to PDF
 */
export function exportAnalyticsToPDF(
  projects: Project[],
  tasks: Task[],
  metrics: any
) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('Rapport Analytique Complet', 14, 22);

  // Date
  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

  // KPIs Section
  doc.setFontSize(14);
  doc.text('Indicateurs Clés de Performance (KPI)', 14, 45);

  doc.setFontSize(10);
  let y = 55;
  doc.text(`📊 Total Projets: ${metrics.totalProjects}`, 20, y);
  y += 7;
  doc.text(`    • Actifs: ${metrics.activeProjects}`, 20, y);
  y += 6;
  doc.text(`    • Terminés: ${metrics.completedProjects}`, 20, y);
  y += 6;
  doc.text(`    • En attente: ${metrics.onHoldProjects}`, 20, y);

  y += 10;
  doc.text(`✓ Total Tâches: ${metrics.totalTasks}`, 20, y);
  y += 7;
  doc.text(`    • Complétées: ${metrics.completedTasks}`, 20, y);
  y += 6;
  doc.text(`    • En cours: ${metrics.inProgressTasks}`, 20, y);
  y += 6;
  doc.text(`    • En retard: ${metrics.overdueTasks}`, 20, y);

  y += 10;
  doc.text(`📈 Taux de Complétion: ${metrics.completionRate}%`, 20, y);

  // Projects by Status
  y += 15;
  doc.setFontSize(14);
  doc.text('Distribution des Projets', 14, y);

  y += 10;
  const projectsData = [
    ['Planification', projects.filter(p => p.status === 'PLANNING').length],
    ['En cours', projects.filter(p => p.status === 'IN_PROGRESS').length],
    ['En attente', projects.filter(p => p.status === 'ON_HOLD').length],
    ['Terminés', projects.filter(p => p.status === 'COMPLETED').length],
    ['Annulés', projects.filter(p => p.status === 'CANCELLED').length],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Statut', 'Nombre']],
    body: projectsData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 20 },
    tableWidth: 80,
  });

  // Tasks by Priority
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Distribution par Priorité', 14, finalY);

  const tasksData = [
    ['Urgente', tasks.filter(t => t.priority === 'URGENT').length],
    ['Haute', tasks.filter(t => t.priority === 'HIGH').length],
    ['Moyenne', tasks.filter(t => t.priority === 'MEDIUM').length],
    ['Basse', tasks.filter(t => t.priority === 'LOW').length],
  ];

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Priorité', 'Nombre']],
    body: tasksData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [220, 38, 38] },
    margin: { left: 20 },
    tableWidth: 80,
  });

  // Save
  doc.save(`rapport_analytique_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ==================== EXCEL EXPORTS ====================

/**
 * Export projects to Excel
 */
export function exportProjectsToExcel(projects: Project[]) {
  const data = projects.map(p => ({
    'Titre': p.title,
    'Statut': getStatusLabel(p.status),
    'Date de Début': p.start_date ? new Date(p.start_date).toLocaleDateString('fr-FR') : '',
    'Date de Fin': p.end_date ? new Date(p.end_date).toLocaleDateString('fr-FR') : '',
    'Échéance': p.due_date ? new Date(p.due_date).toLocaleDateString('fr-FR') : '',
    'Description': p.description || '',
    'Créé le': new Date(p.created_at).toLocaleDateString('fr-FR'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projets');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 30 }, // Titre
    { wch: 15 }, // Statut
    { wch: 12 }, // Date Début
    { wch: 12 }, // Date Fin
    { wch: 12 }, // Échéance
    { wch: 50 }, // Description
    { wch: 12 }, // Créé le
  ];

  XLSX.writeFile(workbook, `projets_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Export tasks to Excel
 */
export function exportTasksToExcel(tasks: Task[]) {
  const data = tasks.map(t => ({
    'Titre': t.title,
    'Statut': getTaskStatusLabel(t.status),
    'Priorité': getPriorityLabel(t.priority),
    'Assigné à': t.assigned_to?.name || 'Non assignée',
    'Projet': t.project?.title || '',
    'Échéance': t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR') : '',
    'Description': t.description || '',
    'Créé le': new Date(t.created_at).toLocaleDateString('fr-FR'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tâches');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 30 }, // Titre
    { wch: 15 }, // Statut
    { wch: 10 }, // Priorité
    { wch: 20 }, // Assigné
    { wch: 25 }, // Projet
    { wch: 12 }, // Échéance
    { wch: 50 }, // Description
    { wch: 12 }, // Créé le
  ];

  XLSX.writeFile(workbook, `taches_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Export users to Excel
 */
export function exportUsersToExcel(users: User[]) {
  const data = users.map(u => ({
    'Nom': u.name,
    'Email': u.email,
    'Rôle': getRoleLabel(u.role),
    'Créé le': new Date(u.created_at).toLocaleDateString('fr-FR'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Utilisateurs');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Nom
    { wch: 30 }, // Email
    { wch: 20 }, // Rôle
    { wch: 12 }, // Créé le
  ];

  XLSX.writeFile(workbook, `utilisateurs_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Export complete analytics to Excel (multiple sheets)
 */
export function exportAnalyticsToExcel(
  projects: Project[],
  tasks: Task[],
  users: User[],
  metrics: any
) {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Indicateur', 'Valeur'],
    ['Total Projets', metrics.totalProjects],
    ['Projets Actifs', metrics.activeProjects],
    ['Projets Terminés', metrics.completedProjects],
    ['Projets En Attente', metrics.onHoldProjects],
    [''],
    ['Total Tâches', metrics.totalTasks],
    ['Tâches Complétées', metrics.completedTasks],
    ['Tâches En Cours', metrics.inProgressTasks],
    ['Tâches En Retard', metrics.overdueTasks],
    [''],
    ['Taux de Complétion', `${metrics.completionRate}%`],
    [''],
    ['Date de Génération', new Date().toLocaleString('fr-FR')],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

  // Projects sheet
  const projectsData = projects.map(p => ({
    'Titre': p.title,
    'Statut': getStatusLabel(p.status),
    'Date Début': p.start_date ? new Date(p.start_date).toLocaleDateString('fr-FR') : '',
    'Échéance': p.due_date ? new Date(p.due_date).toLocaleDateString('fr-FR') : '',
    'Description': p.description || '',
  }));
  const projectsSheet = XLSX.utils.json_to_sheet(projectsData);
  XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projets');

  // Tasks sheet
  const tasksData = tasks.map(t => ({
    'Titre': t.title,
    'Statut': getTaskStatusLabel(t.status),
    'Priorité': getPriorityLabel(t.priority),
    'Assigné': t.assigned_to?.name || 'Non assignée',
    'Projet': t.project?.title || '',
    'Échéance': t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR') : '',
  }));
  const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
  XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tâches');

  // Users sheet
  const usersData = users.map(u => ({
    'Nom': u.name,
    'Email': u.email,
    'Rôle': getRoleLabel(u.role),
  }));
  const usersSheet = XLSX.utils.json_to_sheet(usersData);
  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Utilisateurs');

  XLSX.writeFile(workbook, `rapport_complet_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ==================== HELPER FUNCTIONS ====================

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLANNING: 'Planification',
    IN_PROGRESS: 'En cours',
    ON_HOLD: 'En attente',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
  };
  return labels[status] || status;
}

function getTaskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    TODO: 'À faire',
    IN_PROGRESS: 'En cours',
    IN_REVIEW: 'En révision',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    LOW: 'Basse',
    MEDIUM: 'Moyenne',
    HIGH: 'Haute',
    URGENT: 'Urgente',
  };
  return labels[priority] || priority;
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrateur',
    manager: 'Chef de Projet',
    user: 'Employé',
  };
  return labels[role] || role;
}
