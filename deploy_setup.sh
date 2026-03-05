#!/bin/bash
set -e

echo "=== Starting MySQL setup ==="
systemctl start mysql
systemctl enable mysql
systemctl start redis-server
systemctl enable redis-server

mysql -u root -e "CREATE DATABASE IF NOT EXISTS gobiz_gateway;"
mysql -u root -e "CREATE USER IF NOT EXISTS 'gobiz'@'localhost' IDENTIFIED BY 'G0b1z_S3cur3_2024!';"
mysql -u root -e "GRANT ALL PRIVILEGES ON gobiz_gateway.* TO 'gobiz'@'localhost'; FLUSH PRIVILEGES;"
echo "DB_OK"

echo "=== Cloning repo ==="
mkdir -p /var/www
cd /var/www
rm -rf gobiz-gateway
git clone https://github.com/odzre/web-tools.git gobiz-gateway
cd gobiz-gateway

echo "=== Creating .env ==="
cat > .env << 'ENVEOF'
DATABASE_URL="mysql://gobiz:G0b1z_S3cur3_2024!@localhost:3306/gobiz_gateway"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="xK9mP2vQ8nR5tY3wA7jD0fH4sL6bC1eN"
ENCRYPTION_KEY="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2"
SMTP_HOST="mail.noetopup.com"
SMTP_PORT=465
SMTP_USER="notif@noetopup.com"
SMTP_PASS="@andika12"
NEXT_PUBLIC_APP_URL="https://tools.odzre.my.id"
NEXT_PUBLIC_SITE_NAME="MyCash"
ENVEOF
echo "ENV_OK"

echo "=== Installing dependencies ==="
npm install

echo "=== Generating Prisma ==="
npx prisma generate
npx prisma db push --accept-data-loss

echo "=== Building ==="
npm run build

echo "=== Starting with PM2 ==="
pm2 delete gobiz-gateway 2>/dev/null || true
pm2 start npm --name "gobiz-gateway" -- start
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 save

echo "=== Setting up Nginx ==="
cat > /etc/nginx/sites-available/gobiz-gateway << 'NGINXEOF'
server {
    listen 80;
    server_name tools.odzre.my.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/gobiz-gateway /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

echo "=== Firewall ==="
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw allow 40000/tcp >/dev/null 2>&1 || true

echo "=== ALL DONE ==="
pm2 status
