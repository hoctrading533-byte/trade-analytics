import argparse
import json
from datetime import datetime, timedelta, timezone
from urllib import request


def to_dict(item, keys):
    data = {}
    for key in keys:
        value = getattr(item, key, None)
        if hasattr(value, "timestamp"):
            value = value.timestamp()
        data[key] = value
    return data


def build_snapshot(login, password, server, days, terminal_path):
    import MetaTrader5 as mt5  # type: ignore

    now_utc = datetime.now(timezone.utc)
    from_time = now_utc - timedelta(days=days)
    inited = mt5.initialize(path=terminal_path) if terminal_path else mt5.initialize()
    if not inited:
        raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")

    ok = mt5.login(login=login, password=password, server=server)
    if not ok:
        mt5.shutdown()
        raise RuntimeError(f"MT5 login failed: {mt5.last_error()}")

    account_info = mt5.account_info()
    positions = mt5.positions_get() or []
    orders = mt5.orders_get() or []
    deals = mt5.history_deals_get(from_time, now_utc) or []
    history_orders = mt5.history_orders_get(from_time, now_utc) or []
    mt5.shutdown()

    account_keys = [
        "login",
        "name",
        "server",
        "currency",
        "balance",
        "equity",
        "profit",
        "margin",
        "margin_free",
        "margin_level",
        "leverage",
    ]
    position_keys = [
        "ticket",
        "time",
        "type",
        "volume",
        "price_open",
        "sl",
        "tp",
        "price_current",
        "profit",
        "symbol",
        "comment",
    ]
    order_keys = [
        "ticket",
        "time_setup",
        "type",
        "state",
        "volume_initial",
        "volume_current",
        "price_open",
        "sl",
        "tp",
        "symbol",
        "comment",
    ]
    deal_keys = [
        "ticket",
        "order",
        "time",
        "type",
        "entry",
        "volume",
        "price",
        "commission",
        "swap",
        "fee",
        "profit",
        "symbol",
        "comment",
    ]
    history_order_keys = [
        "ticket",
        "position_id",
        "time_setup",
        "time_done",
        "type",
        "state",
        "volume_initial",
        "volume_current",
        "price_open",
        "sl",
        "tp",
        "symbol",
        "comment",
    ]

    return {
        "source": "mt5-connector-local",
        "fetchedAt": now_utc.isoformat(),
        "account": to_dict(account_info, account_keys) if account_info else {},
        "openPositions": [to_dict(x, position_keys) for x in positions],
        "pendingOrders": [to_dict(x, order_keys) for x in orders],
        "historyDeals": [to_dict(x, deal_keys) for x in deals],
        "historyOrders": [to_dict(x, history_order_keys) for x in history_orders],
    }


def push_snapshot(api_base, token, snapshot):
    body = json.dumps({"snapshot": snapshot}).encode("utf-8")
    url = f"{api_base.rstrip('/')}/api/trading/exness/push"
    req = request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    with request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
        return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-base", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--login", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--server", required=True)
    parser.add_argument("--terminal-path", default="")
    parser.add_argument("--days", type=int, default=30)
    args = parser.parse_args()

    try:
        login = int(str(args.login).strip())
        days = max(1, min(365, int(args.days or 30)))
        snapshot = build_snapshot(
            login=login,
            password=str(args.password),
            server=str(args.server),
            days=days,
            terminal_path=str(args.terminal_path or "").strip(),
        )
        response = push_snapshot(args.api_base, args.token, snapshot)
        print(json.dumps({"ok": True, "response": response}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
