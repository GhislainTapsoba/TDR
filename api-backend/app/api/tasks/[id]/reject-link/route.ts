import { NextRequest, NextResponse } from 'next/server';
import { confirmToken } from '@/lib/emailConfirmation';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/tasks/[id]/reject-link?token=xxx - Lien de refus de tâche depuis email
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/redirect?error=invalid_token`
      );
    }

    // Vérifier le token
    const result = await confirmToken(token);

    if (!result.success) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/redirect?error=${encodeURIComponent(result.error || 'unknown')}`
      );
    }

    // Vérifier que le token correspond bien à cette tâche
    const { id } = await params;
    if (result.data.entityId !== id) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/redirect?error=invalid_task`
      );
    }

    // Rediriger vers la page /redirect qui force la connexion
    // puis redirige vers la page de refus de tâche
    const message = encodeURIComponent('Veuillez vous connecter pour refuser cette tâche.');
    const redirectUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/redirect?reject_task=true&taskId=${id}&message=${message}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('GET /api/tasks/[id]/reject-link error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/?error=server_error`
    );
  }
}
