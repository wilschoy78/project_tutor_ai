# Stage 1: Build Frontend
FROM node:20-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
# Ensure we build for production with relative API paths
ENV VITE_API_URL=/api/v1
RUN npm run build

# Stage 2: Setup Backend & Final Image
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ .

# Copy Frontend Build from Stage 1
# We place it where main.py expects it: ../frontend/dist relative to app/
# Since WORKDIR is /app, we put it in /frontend/dist
COPY --from=frontend-build /app/frontend/dist /frontend/dist

# Update main.py to look for frontend in the correct place if needed, 
# OR ensures the directory structure matches what main.py expects.
# main.py looks at: os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
# If main.py is in /app/main.py, it looks in /frontend/dist. 
# So copying to /frontend/dist is correct.

# Environment Variables (Defaults)
ENV PORT=8000
ENV HOST=0.0.0.0
ENV MOODLE_URL=https://bcccs.octanity.net/lms
ENV ENABLE_MOCK_MOODLE=False
ENV LLM_PROVIDER=groq
ENV MODEL_NAME=llama-3.1-8b-instant

# Expose Port
EXPOSE 8000

# Run Application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
