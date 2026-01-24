const { rows: tasks } = await db.query(queryText, queryParams);

    console.log('User ID:', user.id);
    console.log('Query:', queryText);
    console.log('Params:', queryParams);
    console.log('Tasks found:', tasks.length);

    const transformedTasks = tasks.map(task => ({
      ...task,
      project: task.project_id ? { id: task.project_id, title: task.project_title } : null,
      stage: task.stage_id ? { id: task.stage_id, name: task.stage_name } : null,
    }));

    console.log('Transformed tasks:', transformedTasks.map(t => ({ id: t.id, title: t.title, assigned_to_id: t.assigned_to_id, assignees: t.assignees })));
