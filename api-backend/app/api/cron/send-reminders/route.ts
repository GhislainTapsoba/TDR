// api-backend/app/api/cron/send-reminders/route.ts
import { NextResponse } from 'next/server';
import { sendDueDateReminders } from '../../../../scripts/send-due-date-reminders';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 1. Validate Cron Secret
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn('CRON: Unauthorized attempt to run send-reminders job.');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  console.log('CRON: Authorized request received. Starting send-reminders job...');

  try {
    // 2. Execute the reminder logic
    // We run this asynchronously and don't wait for it to finish.
    // The cron job doesn't need to wait for the result, just to trigger it.
    sendDueDateReminders().catch(error => {
      // Log errors that might occur during the async execution
      console.error('CRON: Error during background execution of sendDueDateReminders:', error);
    });

    // 3. Respond immediately to the cron job
    return NextResponse.json({ message: 'Due date reminder job triggered successfully.' });

  } catch (error) {
    console.error('CRON: Failed to trigger send-reminders job:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
