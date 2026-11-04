FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/opt/moneyprinterturbo \
    MPT_HOME=/data \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg git fonts-noto-cjk fonts-liberation libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/moneyprinterturbo

RUN git clone --depth 1 --branch v1.3.9 https://github.com/harry0703/MoneyPrinterTurbo.git . \
    && pip install --no-cache-dir .

COPY services/moneyprinterturbo/entrypoint.sh /usr/local/bin/mpt-entrypoint
RUN chmod +x /usr/local/bin/mpt-entrypoint && mkdir -p /data

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/mpt-entrypoint"]
