import { NextResponse } from "next/server"
import { createOAuth2Client } from "@/lib/google/client"
import { GOOGLE_OAUTH_SCOPES } from "@/lib/google/scopes"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const client = createOAuth2Client()
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces refresh_token to be returned every time
    scope: [...GOOGLE_OAUTH_SCOPES],
    include_granted_scopes: true,
  })
  return NextResponse.redirect(url)
}
