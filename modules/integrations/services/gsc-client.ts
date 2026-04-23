import { google, type searchconsole_v1 } from "googleapis"
import { getAccessToken } from "@/lib/google/auth"

export type SearchConsoleClient = searchconsole_v1.Searchconsole

export async function getSearchConsoleClient(): Promise<SearchConsoleClient> {
  const accessToken = await getAccessToken()
  return google.searchconsole({
    version: "v1",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
