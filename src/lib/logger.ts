import { config } from "@/config";
import pino from "pino";

const logger = pino({
  level: config.LOG_LEVEL,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export { logger };
