# Build - reportcard-service
FROM python:3.11-slim
WORKDIR /app
# WeasyPrint (generation des bulletins PDF) s'appuie sur Pango/Cairo/GDK-Pixbuf, absents de
# l'image python-slim : sans ces libs systeme, l'import de weasyprint plante au demarrage.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libcairo2 \
    libffi8 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 8086
HEALTHCHECK --interval=10s --timeout=5s --retries=10 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8086/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8086"]
