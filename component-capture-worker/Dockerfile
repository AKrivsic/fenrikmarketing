FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.ts lib ./

ENV COMPONENT_CAPTURE_PORT=8090
EXPOSE 8090

CMD ["npm", "start"]
