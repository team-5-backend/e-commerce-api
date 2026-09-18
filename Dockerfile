<<<<<<< HEAD
FROM node:24-alpine 

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev
 
COPY . .

EXPOSE 3000
 
CMD ["npm", "start"]
=======
FROM node:24-alpine 

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev
 
COPY . .

EXPOSE 3000
 
CMD ["npm", "start"]
>>>>>>> 781d2786b99b8b1a327cb3eadeb4b649b8aac6ab
 