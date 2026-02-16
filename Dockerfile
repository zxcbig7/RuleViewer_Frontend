# ===============================
# Build stage
# ===============================
FROM node:20-alpine AS build
WORKDIR /app

# 安裝依賴（先 copy 兩個 lock 檔到工作目錄，利於 cache）
COPY package.json package-lock.json ./

# npm ci 會嚴格依照 package-lock.json 安裝
RUN npm ci

# 這裡才一次複製程式碼並 build
COPY . .

# 把前端原始碼轉成「純靜態資產」。
# React 輸出結果會放在 /app/dist。
RUN npm run build


# ===============================
# Runtime stage (Static server only)
# ===============================
FROM nginx:alpine

# 不放任何自訂 nginx.conf
# 使用官方預設設定，單純 serve 靜態檔案

# 從名為 build 的 stage拿 /app/dist複 製到目前這個 image 的 /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# 讓 Nginx 在前景執行
# container 的 PID 1 由 Nginx 持有
# 若 Nginx 掛掉，container 會結束，符合容器生命週期管理邏輯
CMD ["nginx", "-g", "daemon off;"]
