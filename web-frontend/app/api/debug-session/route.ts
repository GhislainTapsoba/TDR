// web-frontend/app/api/debug-session/route.ts
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession();
  
  // Vérifier les cookies dans la requête
  const cookies = request.headers.get('cookie');
  
  return NextResponse.json({
    session,
    cookies,
    hasSessionCookie: cookies?.includes('next-auth.session-token'),
    timestamp: new Date().toISOString()
  });
}