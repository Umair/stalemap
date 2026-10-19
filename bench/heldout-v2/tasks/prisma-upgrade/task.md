We upgraded Prisma to v7 and `npx prisma validate` now rejects this project's setup. Fix it for Prisma 7. The database connection string still comes from the `DATABASE_URL` environment variable.
