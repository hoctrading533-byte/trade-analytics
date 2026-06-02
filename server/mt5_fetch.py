import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


def discover_terminal_paths():
    candidates = []
    env_paths = [
        Path.home() / "AppData" / "Roaming",
        Path.home() / "AppData" / "Local",
        Path("C:/Program Files"),
        Path("C:/Program Files (x86)"),
    ]
    for base in env_paths:
        if not base.exists():
            continue
        try:
            found = list(base.rglob("terminal64.exe"))
        except Exception:
            found = []
        for item in found:
            text = str(item)
            if text not in candidates:
                candidates.append(text)
        if len(candidates) >= 20:
            break
    return candidates[:20]


def to_dict(item, keys):
    data = {}
    for key in keys:
        value = getattr(item, key, None)
        if hasattr(value, "timestamp"):
            value = value.timestamp()
        data[key] = value
    return data


def json_print(payload):
    print(json.dumps(payload, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--login", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--server", required=True)
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--terminal-path", default="")
    args = parser.parse_args()

    try:
        import MetaTrader5 as mt5  # type: ignore
    except Exception:
        json_print(
            {
                "ok": False,
                "error": "Python package MetaTrader5 is missing. Run: pip install MetaTrader5",
            }
        )
        return

    days = max(1, min(365, int(args.days or 30)))
    now_utc = datetime.now(timezone.utc)
    from_time = now_utc - timedelta(days=days)

    terminal_path = str(args.terminal_path or "").strip()
    tried_paths = []
    inited = False
    if terminal_path:
        tried_paths.append(terminal_path)
        inited = mt5.initialize(path=terminal_path)
    else:
        inited = mt5.initialize()
        if inited:
            tried_paths.append("default")
    if not inited and not terminal_path:
        for discovered in discover_terminal_paths():
            tried_paths.append(discovered)
            inited = mt5.initialize(path=discovered)
            if inited:
                terminal_path = discovered
                break

    if not inited:
        json_print(
            {
                "ok": False,
                "error": f"MT5 initialize failed: {mt5.last_error()}",
                "triedPaths": tried_paths,
            }
        )
        return

    login_int = int(str(args.login).strip())
    authorized = mt5.login(
        login=login_int,
        password=str(args.password),
        server=str(args.server),
    )
    if not authorized:
        mt5.shutdown()
        json_print({"ok": False, "error": f"MT5 login failed: {mt5.last_error()}"})
        return

    account_info = mt5.account_info()
    positions = mt5.positions_get() or []
    orders = mt5.orders_get() or []
    history_deals = mt5.history_deals_get(from_time, now_utc) or []
    history_orders = mt5.history_orders_get(from_time, now_utc) or []

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
        "company",
    ]
    position_keys = [
        "ticket",
        "time",
        "type",
        "magic",
        "identifier",
        "reason",
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
        "type_filling",
        "type_time",
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
        "magic",
        "position_id",
        "reason",
        "volume",
        "price",
        "commission",
        "swap",
        "profit",
        "fee",
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
        "reason",
        "volume_initial",
        "volume_current",
        "price_open",
        "price_current",
        "price_stoplimit",
        "sl",
        "tp",
        "symbol",
        "comment",
    ]

    account_payload = to_dict(account_info, account_keys) if account_info else {}
    positions_payload = [to_dict(item, position_keys) for item in positions]
    orders_payload = [to_dict(item, order_keys) for item in orders]
    deals_payload = [to_dict(item, deal_keys) for item in history_deals]
    history_orders_payload = [to_dict(item, history_order_keys) for item in history_orders]

    net_profit = sum(float(item.get("profit") or 0) for item in deals_payload)
    gross_profit = sum(max(float(item.get("profit") or 0), 0) for item in deals_payload)
    gross_loss_abs = abs(sum(min(float(item.get("profit") or 0), 0) for item in deals_payload))
    wins = sum(1 for item in deals_payload if float(item.get("profit") or 0) > 0)
    losses = sum(1 for item in deals_payload if float(item.get("profit") or 0) < 0)
    total = len(deals_payload)
    win_rate = (wins / total * 100) if total else 0
    profit_factor = (gross_profit / gross_loss_abs) if gross_loss_abs > 0 else 0

    summary = {
        "days": days,
        "totalDeals": total,
        "wins": wins,
        "losses": losses,
        "winRate": round(win_rate, 2),
        "netProfit": round(net_profit, 2),
        "grossProfit": round(gross_profit, 2),
        "grossLossAbs": round(gross_loss_abs, 2),
        "profitFactor": round(profit_factor, 2),
    }

    mt5.shutdown()
    json_print(
        {
            "ok": True,
            "source": "mt5-python",
            "fetchedAt": now_utc.isoformat(),
            "terminalPath": terminal_path or "",
            "account": account_payload,
            "openPositions": positions_payload,
            "pendingOrders": orders_payload,
            "historyDeals": deals_payload,
            "historyOrders": history_orders_payload,
            "summary": summary,
        }
    )


if __name__ == "__main__":
    main()
