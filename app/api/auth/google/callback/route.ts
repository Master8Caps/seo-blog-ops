import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import type { Auth } from "googleapis"
import { createOAuth2Client } from "@/lib/google/client"
import { storeRefreshToken } from "@/lib/google/auth"
import { createSupabaseServerClient } from "@/lib/auth/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/integrations/google?error=${encodeURIComponent(error)}`, request.url)
    )
  }
  if (!code) {
    return NextResponse.redirect(
      new URL("/settings/integrations/google?error=missing_code", request.url)
    )
  }

  const client = createOAuth2Client()
  let tokens: Auth.Credentials
  try {
    const result = await client.getToken(code)
    tokens = result.tokens
  } catch (err) {
    console.error("[google/callback] token exchange failed:", err)
    return NextResponse.redirect(
      new URL("/settings/integrations/google?error=token_exchange_failed", request.url)
    )
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(
      new URL("/settings/integrations/google?error=no_refresh_token", request.url)
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const grantedScope = tokens.scope ?? ""
  await storeRefreshToken(tokens.refresh_token, grantedScope, user?.email ?? "unknown")
  revalidatePath("/settings/integrations/google")

  import("@/modules/integrations/services/gsc-auto-match").then(({ autoMatchSitesToGscProperties }) =>
    autoMatchSitesToGscProperties().catch((err) =>
      console.error("[google/callback] auto-match failed:", err)
    )
  )

  return NextResponse.redirect(
    new URL("/settings/integrations/google?connected=1", request.url)
  )
}
