import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { config } from "@/config";

const db = drizzle(config.DB_FILE_NAME, { schema: schema });

export { db, schema };
