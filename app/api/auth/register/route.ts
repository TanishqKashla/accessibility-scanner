import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectMongo from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import Organization from "@/lib/db/models/Organization";
import { authLimiter, rateLimitResponse } from "@/lib/ratelimit";

interface RegisterBody {
  email?: string;
  password?: string;
  name?: string;
  orgName?: string;
}

function isValidEmail(email: string) {
  return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const { success, reset } = await authLimiter.limit(ip);
  if (!success) return rateLimitResponse(reset - Date.now());

  const body = (await request.json()) as RegisterBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const name = body.name?.trim();
  const orgName = body.orgName?.trim() || email?.split("@")[1] || "Default Org";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  await connectMongo();

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return NextResponse.json({ error: "User already exists." }, { status: 409 });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const organization = await Organization.create({ name: orgName });

  const user = await User.create({
    email,
    hashedPassword,
    role: "viewer",
    orgId: organization._id,
    name,
  });

  return NextResponse.json(
    {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        orgId: organization._id,
        name: user.name,
      },
    },
    { status: 201 }
  );
}
