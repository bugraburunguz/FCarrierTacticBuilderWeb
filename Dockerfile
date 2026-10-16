FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# DEPLOY-01: şablon açılışta envsubst ile conf.d/default.conf olur. Varsayılanlar yerel compose içindir; Railway PORT'u verir,
# BACKEND_URL servis değişkenidir (docs/deploy/RAILWAY.md). DNS sunucusu konteynerin resolv.conf'undan (NGINX_LOCAL_RESOLVERS).
ENV PORT=80 \
    BACKEND_URL=http://backend:8080 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    TRUST_EDGE_REAL_IP=0
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
