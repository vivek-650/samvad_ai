import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        // Use env DATABASE_URL; explicit datasourceUrl optional unless overriding
        datasourceUrl: process.env.DATABASE_URL,
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;