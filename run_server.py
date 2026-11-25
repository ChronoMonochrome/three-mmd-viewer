#!/usr/bin/env python3
"""
Запускает Vite dev-сервер (`npm run dev`) и прокидывает его наружу через `pyngrok`
с настройками из файла `.env`.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from pyngrok import ngrok


PROJECT_ROOT = Path(__file__).resolve().parent


def load_env_file(env_path: Path) -> None:
    """Загружает переменные из .env в os.environ, если они ещё не заданы."""
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        os.environ.setdefault(key, value)


def connect_ngrok_tunnel(port: int, public_url_env: str):
    """Поднимает туннель ngrok, пробуя передать URL/домен и откатываясь на стандартный connect."""
    cleaned = public_url_env.strip()
    if cleaned:
        url_candidate = cleaned if "://" in cleaned else f"https://{cleaned}"
        for kwargs in (
            {"addr": port, "proto": "http", "url": url_candidate},
            {"addr": port, "proto": "http"},
        ):
            try:
                return ngrok.connect(**kwargs)
            except Exception:
                continue

    return ngrok.connect(addr=port, proto="http")


def wait_for_dev_server(proc: subprocess.Popen[str], timeout_sec: float = 20.0) -> None:
    """Ждёт старта процесса npm run dev."""
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"`npm run dev` завершился с кодом {proc.returncode}")
        time.sleep(0.25)
        if time.monotonic() - (deadline - timeout_sec) >= 2.0:
            return


def main() -> int:
    load_env_file(PROJECT_ROOT / ".env")

    token = os.getenv("NGROK_TOKEN", "").strip()
    public_url_env = os.getenv("NGROK_PUBLIC_URL", "").strip()
    port = int(os.getenv("PORT") or os.getenv("VITE_PORT") or "5173")

    try:
        ngrok.kill()
    except Exception:
        pass

    if token:
        try:
            ngrok.set_auth_token(token)
        except Exception:
            pass

    npm_cmd = "npm.cmd" if sys.platform.startswith("win") else "npm"
    dev_env = os.environ.copy()
    dev_env.setdefault("HOST", "0.0.0.0")

    print(f"[run_server] Запускаю `{npm_cmd} run dev` в {PROJECT_ROOT} (порт {port})...")
    dev_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--port", str(port), "--host", "0.0.0.0"],
        cwd=str(PROJECT_ROOT),
        env=dev_env,
        stdin=subprocess.DEVNULL,
        text=True,
    )

    tunnel = None
    stopping = False

    def cleanup(_signum: int | None = None, _frame: object | None = None) -> None:
        nonlocal stopping
        if stopping:
            return
        stopping = True
        print("\n[run_server] Останавливаю туннель и dev-сервер...")
        try:
            if tunnel is not None:
                ngrok.disconnect(tunnel.public_url)
        except Exception:
            pass
        try:
            ngrok.kill()
        except Exception:
            pass
        if dev_proc.poll() is None:
            dev_proc.terminate()
            try:
                dev_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                dev_proc.kill()

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        wait_for_dev_server(dev_proc)
        tunnel = connect_ngrok_tunnel(port, public_url_env)

        print(f"[run_server] Локальный адрес: http://localhost:{port}")
        print(f"[run_server] Публичный URL:  {tunnel.public_url}")
        print("[run_server] Нажмите Ctrl+C для остановки.")

        while True:
            if dev_proc.poll() is not None:
                print(f"[run_server] Процесс npm run dev завершился (код {dev_proc.returncode}).")
                break
            time.sleep(1.0)
    except Exception as exc:
        print(f"[run_server] Ошибка: {exc}", file=sys.stderr)
        cleanup()
        return 1
    finally:
        cleanup()

    return dev_proc.returncode or 0


if __name__ == "__main__":
    raise SystemExit(main())
