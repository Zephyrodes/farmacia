FROM node:18

WORKDIR /app

# Copiar dependencias primero para usar cache
COPY package*.json ./

# Instalar solo si cambia package.json
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando de arranque
CMD ["npm", "start"]
