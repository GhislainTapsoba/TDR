import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Avertir si les variables ne sont pas configurées
if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  console.warn('⚠️ ATTENTION: Variables Supabase non configurées dans .env.local');
  console.warn('📝 Copiez .env.local.example vers .env.local et ajoutez vos vraies clés Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
