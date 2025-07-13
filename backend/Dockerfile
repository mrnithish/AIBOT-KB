# =============================
# STAGE 1 — Builder
# =============================
FROM python:3.12-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libxml2-dev \
    libxslt-dev \
    libjpeg-dev \
    zlib1g-dev \
    cargo \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install deps
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --prefix=/python-deps --no-cache-dir -r requirements.txt

# Copy your source code
COPY . .

# =============================
# STAGE 2 — Distroless
# =============================
FROM gcr.io/distroless/base-debian12

# Set working directory
WORKDIR /app

# Copy python runtime & installed packages from builder
COPY --from=builder /python-deps /usr/local
COPY --from=builder /usr/local/lib /usr/local/lib
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /lib /lib
COPY --from=builder /lib64 /lib64
COPY --from=builder /app /app

# Expose FastAPI port
EXPOSE 8000

# ✅ Use correct path to Python binary in distroless
CMD ["/usr/local/bin/python3", "-m", "uvicorn", "app:app", "--host=0.0.0.0", "--port=8000"]
