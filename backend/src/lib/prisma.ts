import "../config/load-env.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
