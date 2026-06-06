import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

function getSafeRedirectPath(value: unknown): string {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return "/dashboard";
  }

  const blockedPrefixes = ["/login", "/signup", "/logout", "/auth"];

  if (
    blockedPrefixes.some(
      (prefix) => rawValue === prefix || rawValue.startsWith(`${prefix}/`),
    )
  ) {
    return "/dashboard";
  }

  return rawValue;
}

function getOtpErrorMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("expired") || lowerMessage.includes("invalid")) {
    return "Code is incorrect or has expired. Request a new code and try again.";
  }

  if (lowerMessage.includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }

  return "Verification failed. Please try again.";
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication service is not configured yet.",
      },
      { status: 500 },
    );
  }

  let body: {
    email?: unknown;
    token?: unknown;
    redirectTo?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Verification failed. Please try again.",
      },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const redirectTo = getSafeRedirectPath(body.redirectTo);

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      {
        success: false,
        error: "Please enter a valid email address.",
      },
      { status: 400 },
    );
  }

  if (!/^\d{6}$/.test(token)) {
    return NextResponse.json(
      {
        success: false,
        error: "OTP must be 6 digits.",
      },
      { status: 400 },
    );
  }

  const response = NextResponse.json(
    {
      success: true,
      redirectTo,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: getOtpErrorMessage(error.message),
        },
        { status: 400 },
      );
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification succeeded but session was not created.",
        },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Session could not be confirmed. Please try again.",
        },
        { status: 400 },
      );
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Verification failed. Please try again.",
      },
      { status: 500 },
    );
  }
}
