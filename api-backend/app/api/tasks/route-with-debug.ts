const { rows: tasks } = await db.query(queryText, queryParams);

    // DEBUG: Log query results
    console.log('=== TASKS API DEBUG ===');
    console.log('User ID:', user.id, 'Role:', userRole);
    console.log('Query:', queryText.replace(/\s+/g, ' ').trim());
    console.log('Params:', queryParams);
    console.log('Raw tasks found:', tasks.length);
    tasks.forEach(task => {
      console.log(`Task ${task.id}: "${task.title}" - assigned_to_id: ${task.assigned_to_id}`);
    });

    const transformedTasks = tasks.map(task => ({
      ...task,
      project: task.project_id ? { id: task.project_id, title: task.project_title } : null,
      stage: task.stage_id ? { id: task.stage_id, name: task.stage_name } : null,
    }));

    console.log('Transformed tasks count:', transformedTasks.length);
    console.log('=== END DEBUG ===');

    return corsResponse(transformedTasks || [], request);
