# ===============================
# Build stage
# ===============================
FROM node:20-alpine AS build
WORKDIR /app

# 安裝依賴（先 copy lock 檔，利於 cache）
COPY package.json package-lock.json ./
RUN npm ci

# 複製程式碼並 build
COPY . .
RUN npm run build


# ===============================
# Runtime stage (Static server only)
# ===============================
FROM nginx:alpine

# 不放任何自訂 nginx.conf
# 使用官方預設設定，單純 serve 靜態檔案

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
