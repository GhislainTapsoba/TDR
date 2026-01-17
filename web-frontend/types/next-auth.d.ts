import 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
            permissions: string[];
        };
        accessToken?: string;
        customToken?: string;
    }

    interface User {
        id: string;
        email: string;
        name: string;
        role: string;
        permissions: string[];
        token?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: string;
        email: string;
        name: string;
        permissions: string[];
        accessToken?: string;
        customToken?: string;
    }
}
