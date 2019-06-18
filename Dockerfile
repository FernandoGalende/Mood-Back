FROM node:8.11-alpine
WORKDIR /express
ADD . .
RUN npm install
CMD ["sh", "-c", "node src/app.js"]
