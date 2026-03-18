import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectMongo from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import { signJWT } from "@/lib/auth/jwt";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  await connectMongo();

  const user = await User.findOne({ email });
  if (!user || !user.hashedPassword) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = signJWT({
    userId: user._id.toString(),
    orgId: user.orgId.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      name: user.name,
    },
  });
}
