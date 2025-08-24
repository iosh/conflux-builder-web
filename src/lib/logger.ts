import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export { logger };
