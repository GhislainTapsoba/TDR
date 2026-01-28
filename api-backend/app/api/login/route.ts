import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email !== "arseneghislaintaps@gmail.com" || password !== "123456") {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    id: 1,           // ⚠️ OBLIGATOIRE
    name: "Arsène",
    email,
  });
}
