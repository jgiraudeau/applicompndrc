FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    python3-dev \
    gcc \
    libpq-dev \
    pandoc \
    build-essential \
    python3-cffi \
    python3-brotli \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
# Force cache bust - Ensure fpdf2/python-docx are installed
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
# Expose port (informative)
EXPOSE 8000

# Start command
# We use the shell form to allow environment variable expansion ($PORT)
# Railway provides the PORT variable at runtime.
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
