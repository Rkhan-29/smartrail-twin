// ============================================================
// app/api/auth/login/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/login. The user submits a username +
// password. We find the matching user, check the password is
// correct, and if so, hand back a login cookie (token) plus
// basic profile info. If the username doesn't exist or the
// password is wrong, we send back the exact same generic error
// either way — this stops attackers from figuring out which
// usernames are real just by trying to log in.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { generateAuthCookie } from "@/lib/generateToken";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
    }

    const user = await User.findOne({ username });

    if (!user || !(await user.matchPassword(password))) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    const response = NextResponse.json({
      message: "Logged in successfully.",
      user: { id: user._id, username: user.username, role: user.role },
    });

    const cookie = generateAuthCookie(user._id.toString());
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Server error during login.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
