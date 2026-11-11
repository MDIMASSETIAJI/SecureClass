import { NextRequest, NextResponse } from "next/server";
import { SessionService, SESSION_COOKIE_NAME } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await SessionService.revokeSession(token);
    }

    const res = NextResponse.json({ success: true, message: "Berhasil keluar dari sistem." });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}

