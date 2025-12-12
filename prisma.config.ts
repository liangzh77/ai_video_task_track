import "dotenv/config";
import { defineConfig } from "prisma/config";

// Try multiple possible environment variable names
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE2_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE2_POSTGRES_URL ||
  "postgresql://localhost:5432/task_tracker";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
