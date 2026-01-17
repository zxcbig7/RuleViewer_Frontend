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
# Runtime stage (Nginx)
# ===============================
FROM nginx:alpine

# 移除預設設定
RUN rm /etc/nginx/conf.d/default.conf

# 複製自訂 Nginx 設定
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 複製 build 結果
COPY --from=build /app/dist /usr/share/nginx/html

# 對外開放 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
