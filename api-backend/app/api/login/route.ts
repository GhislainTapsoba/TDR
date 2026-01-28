import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log("Attempting login for email:", email);
    console.log("Password received (for debug only, do not log in production):", password); // IMPORTANT: Remove in production

    if (!email || !password) {
      console.log("Email or password missing.");
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("Querying database for user:", email);
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    console.log("Database query result - user:", user ? "Found" : "Not Found");

    if (!user) {
      console.log("User not found for email:", email);
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("Comparing password for user:", user.email);
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Password comparison result:", passwordMatch);

    if (!passwordMatch) {
      console.log("Password does not match for user:", user.email);
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("Login successful for user:", user.email);
    // Omit sensitive data like password hash from the response
    const { password: userPassword, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
