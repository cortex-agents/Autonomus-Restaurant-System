import json
from redis.asyncio import Redis
from app.config import get_settings
STREAM="restaurant:inbound"
async def get_redis(): return Redis.from_url(get_settings().redis_url,decode_responses=True)
async def enqueue_message(message):
    r=await get_redis()
    try: return await r.xadd(STREAM,{"payload":json.dumps(message)})
    finally: await r.aclose()
