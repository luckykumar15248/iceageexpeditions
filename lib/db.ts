import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { Prisma, PrismaClient } from "@/app/generated/prisma/client"
import { DomainError } from "@/lib/errors"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export type DbClient = Prisma.TransactionClient | PrismaClient

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

export async function runSerializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const prisma = getPrisma()
  const attempts = 3

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      })
    } catch (error) {
      if (error instanceof DomainError || attempt === attempts || !isRetryableTransaction(error)) {
        throw error
      }
    }
  }

  throw new Error("Serializable transaction failed")
}

export function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  const url = new URL(connectionString)
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (!url.hostname || !database) {
    throw new Error("DATABASE_URL must include a host and database name")
  }

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
    connectTimeout: 2_000,
    acquireTimeout: 2_000,
  })

  return new PrismaClient({ adapter })
}

function isRetryableTransaction(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
}
