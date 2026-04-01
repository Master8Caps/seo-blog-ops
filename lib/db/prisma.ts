import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Use pooled connection (DATABASE_URL) for serverless — direct connections
  // exhaust Supabase's connection limit when Vercel spins up many functions
  const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? ""
  const adapter = new PrismaPg(connectionString)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
