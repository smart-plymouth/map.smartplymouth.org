FROM nginx:1.25.4
COPY build /usr/share/nginx/html
COPY icons /usr/share/nginx/html/icons
