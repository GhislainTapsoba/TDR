import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      permissions: string[];
    };
    customToken?: string;
    accessToken?: string;
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    permissions: string[];
    customToken?: string;
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
    permissions?: string[];
    customToken?: string;
    accessToken?: string;
  }
}

