#!/usr/bin/env python3
"""
MT5 Real-time WebSocket Agent
Run this on your Windows machine where MetaTrader 5 is installed.
It connects to MT5 and streams live data to the server via WebSocket.
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime, timedelta, timezone

try:
    import MetaTrader5 as mt5
except ImportError:
    print("Python package MetaTrader5 is missing. Run: pip install MetaTrader5", file=sys.stderr)
    sys.exit(1)

try:
    import websockets
except ImportError:
    print("Python package websockets is missing. Run: pip install websockets", file=sys.stderr)
    sys.exit(1)

ACCOUNT_KEYS = [
    "login", "name", "server", "currency", "balance", "equity",
    "profit", "margin", "margin_free", "margin_level", "leverage", "company"
]

POSITION_KEYS = [
    "ticket", "time", "type", "magic", "identifier", "reason",
    "volume", "price_open", "sl", "tp", "price_current", "profit", "symbol", "comment"
]

ORDER_KEYS = [
    "ticket", "time_setup", "type", "type_filling", "type_time", "state",
    "volume_initial", "volume_current", "price_open", "sl", "tp", "symbol", "comment"
]

DEAL_KEYS = [
    "ticket", "order", "time", "type", "entry", "magic", "position_id", "reason",
    "volume", "price", "commission", "swap", "profit", "fee", "symbol", "comment"
]


def to_dict(item, keys):
    data = {}
    for key in keys:
        value = getattr(item, key, None)
        if hasattr(value, "timestamp"):
            value = value.timestamp()
        data[key] = value
    return data


HISTORY_ORDER_KEYS = [
    "ticket", "position_id", "time_setup", "time_done", "type", "state", "reason",
    "volume_initial", "volume_current", "price_open", "price_current",
    "price_stoplimit", "sl", "tp", "symbol", "comment"
]


def build_snapshot(days):
    now_utc = datetime.now(timezone.utc)
    from_time = now_utc - timedelta(days=days)

    account_info = mt5.account_info()
    positions = mt5.positions_get() or []
    orders = mt5.orders_get() or []
    history_deals = mt5.history_deals_get(from_time, now_utc) or []
    history_orders = mt5.history_orders_get(from_time, now_utc) or []

    deals = [to_dict(item, DEAL_KEYS) for item in history_deals]
    net_profit = sum(float(d.get("profit") or 0) for d in deals)
    gross_profit = sum(max(float(d.get("profit") or 0), 0) for d in deals)
    gross_loss_abs = abs(sum(min(float(d.get("profit") or 0), 0) for d in deals))
    wins = sum(1 for d in deals if float(d.get("profit") or 0) > 0)
    losses = sum(1 for d in deals if float(d.get("profit") or 0) < 0)
    total = len(deals)
    win_rate = (wins / total * 100) if total else 0
    profit_factor = (gross_profit / gross_loss_abs) if gross_loss_abs > 0 else 0

    return {
        "source": "mt5-agent-ws",
        "fetchedAt": now_utc.isoformat(),
        "account": to_dict(account_info, ACCOUNT_KEYS) if account_info else {},
        "openPositions": [to_dict(p, POSITION_KEYS) for p in positions],
        "pendingOrders": [to_dict(o, ORDER_KEYS) for o in orders],
        "historyDeals": deals,
        "historyOrders": [to_dict(h, HISTORY_ORDER_KEYS) for h in history_orders],
        "summary": {
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
    }


def discover_terminal_paths():
    from pathlib import Path
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
    return candidates[:20]


def init_mt5(terminal_path):
    if terminal_path:
        return mt5.initialize(path=terminal_path)
    inited = mt5.initialize()
    if inited:
        return True
    for discovered in discover_terminal_paths():
        inited = mt5.initialize(path=discovered)
        if inited:
            return True
    return False


async def run_agent(ws_url, token, login, password, server, terminal_path, days, interval):
    login_int = int(str(login).strip())
    days_val = max(1, min(365, int(days or 30)))

    print(f"[mt5-agent] Initializing MT5...", flush=True)
    inited = init_mt5(terminal_path)
    if not inited:
        print(f"[mt5-agent] MT5 initialize failed: {mt5.last_error()}", flush=True)
        return

    authorized = mt5.login(login=login_int, password=password, server=server)
    if not authorized:
        print(f"[mt5-agent] MT5 login failed: {mt5.last_error()}", flush=True)
        mt5.shutdown()
        return

    print(f"[mt5-agent] MT5 connected. Account: {login}", flush=True)

    while True:
        try:
            async with websockets.connect(
                ws_url,
                ping_interval=interval + 5,
                ping_timeout=10,
                max_size=10 * 1024 * 1024,
            ) as ws:
                auth_msg = {"type": "auth", "token": token}
                await ws.send(json.dumps(auth_msg))
                auth_resp = json.loads(await ws.recv())
                if auth_resp.get("status") != "ok":
                    print(f"[mt5-agent] Auth failed: {auth_resp}", flush=True)
                    return

                print(f"[mt5-agent] Connected to server. Streaming every {interval}s...", flush=True)

                while True:
                    try:
                        snapshot = build_snapshot(days_val)
                        msg = json.dumps({"type": "snapshot", "data": snapshot})
                        await ws.send(msg)
                        print(
                            f"[mt5-agent] Pushed: {snapshot['account'].get('login', '')} "
                            f"| positions={len(snapshot['openPositions'])} "
                            f"| deals={snapshot['summary']['totalDeals']}",
                            flush=True
                        )
                    except Exception as e:
                        print(f"[mt5-agent] Snapshot error: {e}", flush=True)

                    await asyncio.sleep(interval)

        except websockets.exceptions.ConnectionClosed as e:
            print(f"[mt5-agent] Disconnected ({e.code}). Reconnecting in 5s...", flush=True)
            await asyncio.sleep(5)
        except Exception as e:
            print(f"[mt5-agent] Connection error: {e}. Reconnecting in 10s...", flush=True)
            await asyncio.sleep(10)


def main():
    parser = argparse.ArgumentParser(description="MT5 Real-time WebSocket Agent")
    parser.add_argument("--ws-url", required=True, help="WebSocket server URL (e.g. ws://localhost:4000/ws/agent)")
    parser.add_argument("--token", required=True, help="Connector JWT token from server")
    parser.add_argument("--login", required=True, help="MT5 login")
    parser.add_argument("--password", required=True, help="MT5 password")
    parser.add_argument("--server", required=True, help="MT5 server name")
    parser.add_argument("--terminal-path", default="", help="Path to terminal64.exe")
    parser.add_argument("--days", type=int, default=30, help="Days of history to fetch")
    parser.add_argument("--interval", type=int, default=5, help="Push interval in seconds")
    args = parser.parse_args()

    if not args.ws_url.startswith("ws") and not args.ws_url.startswith("wss"):
        print("Error: --ws-url must start with ws:// or wss://", file=sys.stderr)
        sys.exit(1)

    try:
        asyncio.run(run_agent(
            ws_url=args.ws_url,
            token=args.token,
            login=args.login,
            password=args.password,
            server=args.server,
            terminal_path=args.terminal_path,
            days=args.days,
            interval=args.interval,
        ))
    except KeyboardInterrupt:
        print("[mt5-agent] Stopped by user.", flush=True)
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    main()
