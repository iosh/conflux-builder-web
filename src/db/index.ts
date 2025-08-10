import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

const db = drizzle(process.env.DB_FILE_NAME!, { schema: schema });

export { db, schema };
