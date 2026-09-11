import asyncio
import json
from redis.asyncio import Redis

STREAM = "restaurant:inbound"
GROUP = "restaurant-workers"


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
                    await process_fn(json.loads(data["payload"]))
                    await redis.xack(STREAM, GROUP, msg_id)
                except Exception:
                    continue
        except Exception:
            continue