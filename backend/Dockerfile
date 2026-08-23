FROM node:20-slim

RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

RUN pip3 install -U yt-dlp --break-system-packages

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]