#!/bin/sh
set -eu

: "${MPT_API_KEY:?MPT_API_KEY must be set as a secret}"
export MPT_HOME="${MPT_HOME:-/data}"
export PORT="${PORT:-8080}"

mkdir -p "$MPT_HOME"
if [ ! -f "$MPT_HOME/config.toml" ]; then
  cp /opt/moneyprinterturbo/config.example.toml "$MPT_HOME/config.toml"
fi

python - <<'PY'
import os
import toml

home = os.environ["MPT_HOME"]
path = os.path.join(home, "config.toml")
with open(path, "r", encoding="utf-8") as stream:
    config = toml.load(stream)

config["listen_host"] = "0.0.0.0"
config["listen_port"] = int(os.environ.get("PORT", "8080"))
app = config.setdefault("app", {})
app["api_key"] = os.environ["MPT_API_KEY"]
app["enable_redis"] = False
app["endpoint"] = ""

with open(path, "w", encoding="utf-8") as stream:
    toml.dump(config, stream)
PY

exec uvicorn app.asgi:app --host 0.0.0.0 --port "$PORT" --proxy-headers --forwarded-allow-ips="*"
