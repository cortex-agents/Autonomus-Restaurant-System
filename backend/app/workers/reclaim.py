import asyncio
import json
import logging
from redis.asyncio import Redis

STREAM = "restaurant:inbound"
GROUP = "restaurant-workers"
DEAD_STREAM = "restaurant:dead"
MAX_DELIVERIES = 5
logger = logging.getLogger(__name__)


async def reclaim_stale_messages(redis: Redis, consumer: str, min_idle_ms: int = 5 * 60 * 1000, count: int = 50):
    """
    Reclaims messages that have been sitting unacknowledged in the group's
    Pending Entries List for too long — e.g. because the worker that originally
    read them crashed before calling XACK. Claims them for `consumer` so they
    get reprocessed instead of being stuck forever.
    """
    try:
        _cursor, claimed, _deleted = await redis.xautoclaim(
            STREAM, GROUP, consumer, min_idle_time=min_idle_ms, start_id="0-0", count=count
        )
        return claimed
    except Exception:
        return []


async def reclaim_loop(redis: Redis, consumer: str, process_fn, interval_seconds: int = 60):
    """Background loop: every interval_seconds, reclaims and reprocesses stale messages."""
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            claimed = await reclaim_stale_messages(redis, consumer)
            for msg_id, data in claimed:
                try:
                    pend = await redis.xpending_range(STREAM, GROUP, min=msg_id, max=msg_id, count=1)
                    if pend and pend[0].get("times_delivered", 0) > MAX_DELIVERIES:
                        await redis.xadd(DEAD_STREAM, {"payload": data.get("payload", ""), "orig_id": msg_id})
                        await redis.xack(STREAM, GROUP, msg_id)
                        logger.error("Message %s moved to %s after %s deliveries", msg_id, DEAD_STREAM, MAX_DELIVERIES)
                        continue

                    await process_fn(json.loads(data["payload"]))
                    await redis.xack(STREAM, GROUP, msg_id)
                except Exception:
                    logger.exception("Reclaimed message %s failed again", msg_id)
                    continue
        except Exception:
            logger.exception("Reclaim loop iteration failed")
            continue