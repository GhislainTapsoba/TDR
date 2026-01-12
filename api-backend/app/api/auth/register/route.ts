import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return NextResponse.json({ error: 'Format d\'email invalide.' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà.' }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        { name, email: normalizedEmail, password: hashedPassword, role: 'EMPLOYEE' }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return NextResponse.json({ error: 'Erreur lors de la création de l\'utilisateur.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Utilisateur créé avec succès.', user: newUser }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}