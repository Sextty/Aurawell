import { app } from "./app.js";
import { prisma } from "./db.js";

const port = parseInt(process.env.PORT || "4400", 10);
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Aurawell API on :${port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
