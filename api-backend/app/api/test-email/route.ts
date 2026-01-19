import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/emailService';
import { verifyAuth } from '@/lib/verifyAuth';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification (seulement pour les admins)
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier que c'est un admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Envoyer l'email de test
    const success = await sendEmail({
      to,
      subject,
      html,
      userId: user.id,
      metadata: { test: true }
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send email'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint GET pour récupérer les logs d'emails récents
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { db } = await import('@/lib/db');

    const { rows: emailLogs } = await db.query(
      `SELECT id, recipient, subject, status, sent_at, error_message, created_at
       FROM email_logs
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return NextResponse.json({ emailLogs });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
