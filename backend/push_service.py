"""Web Push notifications module.

Stores browser PushSubscriptions in MongoDB (collection `push_subscriptions`)
and exposes a helper to dispatch notifications to all (or a single user's)
subscriptions.

For production sending, install `pywebpush` and configure VAPID keys in
.env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIM_EMAIL`).
Without VAPID keys the module still stores subscriptions but cannot dispatch
real pushes — the API replies with `{configured: false}` so callers can
surface the requirement to the user.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

VAPID_PUBLIC = os.environ.get("VAPID_PUBLIC_KEY")
VAPID_PRIVATE = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_EMAIL = os.environ.get("VAPID_CLAIM_EMAIL", "mailto:noreply@ttpro.app")


def is_configured() -> bool:
    return bool(VAPID_PUBLIC and VAPID_PRIVATE)


def public_key() -> Optional[str]:
    return VAPID_PUBLIC


async def save_subscription(db, sub: dict, user_id: Optional[str] = None) -> dict:
    """Upsert a PushSubscription (idempotent on `endpoint`)."""
    endpoint = sub.get("endpoint")
    if not endpoint:
        return {"error": "invalid_subscription"}
    doc = {
        "endpoint": endpoint,
        "keys": sub.get("keys") or {},
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.push_subscriptions.update_one(
        {"endpoint": endpoint},
        {"$set": doc},
        upsert=True,
    )
    return {"saved": True, "endpoint": endpoint, "user_id": user_id}


async def delete_subscription(db, endpoint: str) -> dict:
    r = await db.push_subscriptions.delete_one({"endpoint": endpoint})
    return {"deleted": r.deleted_count}


async def send_to_all(db, title: str, body: str,
                     user_id: Optional[str] = None,
                     url: str = "/") -> dict:
    """Send a notification to all subscriptions (or one user's only).

    If pywebpush is not installed OR VAPID keys missing, no real push is sent —
    we return a count of subscriptions that WOULD have been pushed.
    """
    q = {"user_id": user_id} if user_id else {}
    subs = await db.push_subscriptions.find(q, {"_id": 0}).to_list(1000)

    if not is_configured():
        return {"configured": False, "would_push": len(subs),
                "needed_env_vars": ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]}

    try:
        from pywebpush import webpush, WebPushException  # noqa: WPS433 (lazy import)
    except ImportError:
        return {"configured": False, "would_push": len(subs),
                "error": "pywebpush_not_installed",
                "hint": "pip install pywebpush"}

    payload = json.dumps({"title": title, "body": body, "url": url})
    sent = 0
    failed = 0
    for s in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": s["endpoint"],
                    "keys": s["keys"],
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE,
                vapid_claims={"sub": VAPID_EMAIL},
            )
            sent += 1
        except WebPushException as e:
            logger.warning("Push failed for %s: %s", s["endpoint"][:60], e)
            failed += 1
            # 410 Gone => prune subscription
            if hasattr(e, 'response') and getattr(e.response, 'status_code', 0) == 410:
                await db.push_subscriptions.delete_one({"endpoint": s["endpoint"]})
    return {"configured": True, "sent": sent, "failed": failed,
            "total_subscriptions": len(subs)}
