import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { ensureUploadsDir } from "./modules/machine/machine-image";
import { startMaintenanceDueJob } from "./modules/maintenance-plan/maintenance-due.job";

ensureUploadsDir();
const server = app.listen(env.PORT, () => console.log(`Metal HR API listening on port ${env.PORT}`));
startMaintenanceDueJob();
const shutdown = async () => { await prisma.$disconnect(); server.close(() => process.exit(0)); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
