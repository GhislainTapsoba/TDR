import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const perm = await requirePermission(userRole, 'export', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
    }

    const { types, format, dateRange } = await request.json();

    let data: any = {};

    // Export des projets
    if (types.includes('projects') || types.includes('all')) {
      const projectsQuery = `
        SELECT p.*, u.name as created_by_name 
        FROM projects p 
        LEFT JOIN users u ON p.created_by_id = u.id
        ${getDateFilter('p.created_at', dateRange)}
        ORDER BY p.created_at DESC
      `;
      const { rows: projects } = await db.query(projectsQuery);
      data.projects = projects;
    }

    // Export des tâches
    if (types.includes('tasks') || types.includes('all')) {
      const tasksQuery = `
        SELECT t.*, 
               c.name as created_by_name,
               p.title as project_title,
               s.name as stage_name,
               (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
                FROM task_assignees ta 
                JOIN users u ON ta.user_id = u.id 
                WHERE ta.task_id = t.id) as assignees
        FROM tasks t
        LEFT JOIN users c ON t.created_by_id = c.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN stages s ON t.stage_id = s.id
        ${getDateFilter('t.created_at', dateRange)}
        ORDER BY t.created_at DESC
      `;
      const { rows: tasks } = await db.query(tasksQuery);
      data.tasks = tasks;
    }

    // Export des utilisateurs
    if (types.includes('users') || types.includes('all')) {
      const usersQuery = `
        SELECT id, name, email, role, is_active, created_at, updated_at
        FROM users
        ${getDateFilter('created_at', dateRange)}
        ORDER BY created_at DESC
      `;
      const { rows: users } = await db.query(usersQuery);
      data.users = users;
    }

    // Export des activités
    if (types.includes('activities') || types.includes('all')) {
      const activitiesQuery = `
        SELECT al.*, u.name as user_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${getDateFilter('al.created_at', dateRange)}
        ORDER BY al.created_at DESC
        LIMIT 1000
      `;
      const { rows: activities } = await db.query(activitiesQuery);
      data.activities = activities;
    }

    // Format de retour selon le type demandé
    if (format === 'json') {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="export_${types.join('_')}_${new Date().toISOString().split('T')[0]}.json"`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    if (format === 'csv') {
      const csv = convertToCSV(data, types);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="export_${types.join('_')}_${new Date().toISOString().split('T')[0]}.csv"`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    return corsResponse(data, request);

  } catch (error) {
    console.error('Export error:', error);
    return corsResponse({ error: 'Erreur lors de l\'export' }, request, { status: 500 });
  }
}

function getDateFilter(column: string, dateRange: string): string {
  if (dateRange === 'all') return '';
  
  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case 'last_3_months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case 'last_6_months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'last_year':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      return '';
  }

  return `WHERE ${column} >= '${startDate.toISOString()}'`;
}

function convertToCSV(data: any, types: string[]): string {
  let csv = '';

  if (data.projects && (types.includes('projects') || types.includes('all'))) {
    csv += 'PROJETS\n';
    csv += 'Titre,Statut,Description,Date de création,Créé par\n';
    data.projects.forEach((p: any) => {
      csv += `"${p.title}","${p.status}","${p.description || ''}","${new Date(p.created_at).toLocaleDateString('fr-FR')}","${p.created_by_name || ''}"\n`;
    });
    csv += '\n';
  }

  if (data.tasks && (types.includes('tasks') || types.includes('all'))) {
    csv += 'TÂCHES\n';
    csv += 'Titre,Statut,Priorité,Projet,Assignés,Date de création\n';
    data.tasks.forEach((t: any) => {
      const assignees = t.assignees ? t.assignees.map((a: any) => a.name).join('; ') : '';
      csv += `"${t.title}","${t.status}","${t.priority}","${t.project_title || ''}","${assignees}","${new Date(t.created_at).toLocaleDateString('fr-FR')}"\n`;
    });
    csv += '\n';
  }

  if (data.users && (types.includes('users') || types.includes('all'))) {
    csv += 'UTILISATEURS\n';
    csv += 'Nom,Email,Rôle,Actif,Date de création\n';
    data.users.forEach((u: any) => {
      csv += `"${u.name}","${u.email}","${u.role}","${u.is_active ? 'Oui' : 'Non'}","${new Date(u.created_at).toLocaleDateString('fr-FR')}"\n`;
    });
    csv += '\n';
  }

  return csv;
}