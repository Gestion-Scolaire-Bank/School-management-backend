# Build - notification-service
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 8085
HEALTHCHECK --interval=10s --timeout=5s --retries=10 \
    CMD wget -qO- http://localhost:8085/health || exit 1
CMD ["node", "src/index.js"]
