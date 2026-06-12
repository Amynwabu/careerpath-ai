import { activityLogTable, db } from "@workspace/db";
import { logger } from "./logger";

export async function logActivity(event: {
  userId?: number | null;
  type: string;
  description: string;
}): Promise<void> {
  try {
    await db.insert(activityLogTable).values({
      userId: event.userId ?? null,
      type: event.type,
      description: event.description,
    });
  } catch (error) {
    logger.error({ err: error, event }, "Failed to write activity log event");
  }
}
