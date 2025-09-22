# Deployment Rehberi

## Genel Bakış

Bu rehber, Borsa Analizi uygulamasının farklı ortamlarda nasıl deploy edileceğini açıklar.

## Gereksinimler

### Sistem Gereksinimleri

- **Node.js:** v18.0.0 veya üzeri
- **npm:** v8.0.0 veya üzeri (veya pnpm v7.0.0+)
- **RAM:** Minimum 2GB, Önerilen 4GB
- **Disk:** Minimum 1GB boş alan
- **İşletim Sistemi:** Linux, macOS, Windows

### Bağımlılıklar

- React 18+
- TypeScript 5+
- Vite 5+
- Socket.io
- Tailwind CSS

## Geliştirme Ortamı

### Kurulum

1. **Repository'yi klonlayın:**
```bash
git clone <repository-url>
cd BorsaVerileri2025
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
# veya
pnpm install
```

3. **Ortam değişkenlerini ayarlayın:**
```bash
cp .env.example .env.local
```

4. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
# veya
pnpm dev
```

### Ortam Değişkenleri

`.env.local` dosyasında aşağıdaki değişkenleri ayarlayın:

```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_PATTERN_RECOGNITION=true
VITE_ENABLE_REAL_TIME_DATA=true

# Analytics
VITE_ANALYTICS_ID=your-analytics-id

# Debug
VITE_DEBUG_MODE=true
```

## Production Build

### Build Süreci

1. **Production build oluşturun:**
```bash
npm run build
# veya
pnpm build
```

2. **Build'i test edin:**
```bash
npm run preview
# veya
pnpm preview
```

3. **Build çıktısını kontrol edin:**
```bash
ls -la dist/
```

### Build Optimizasyonu

**Vite konfigürasyonu** (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          socket: ['socket.io-client'],
          ui: ['lucide-react'],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
});
```

## Vercel Deployment

### Otomatik Deployment

1. **Vercel hesabı oluşturun:** [vercel.com](https://vercel.com)

2. **GitHub repository'sini bağlayın:**
   - Vercel dashboard'da "New Project" tıklayın
   - GitHub repository'sini seçin
   - Import edin

3. **Build ayarlarını yapılandırın:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Manuel Deployment

1. **Vercel CLI'yi yükleyin:**
```bash
npm install -g vercel
```

2. **Login olun:**
```bash
vercel login
```

3. **Deploy edin:**
```bash
vercel --prod
```

### Vercel Konfigürasyonu

`vercel.json` dosyası:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_URL": "@api_url",
    "VITE_SOCKET_URL": "@socket_url"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

## Netlify Deployment

### Otomatik Deployment

1. **Netlify hesabı oluşturun:** [netlify.com](https://netlify.com)

2. **Site oluşturun:**
   - "New site from Git" tıklayın
   - GitHub repository'sini seçin
   - Build ayarlarını yapılandırın

3. **Build ayarları:**
   - Build command: `npm run build`
   - Publish directory: `dist`

### Netlify Konfigürasyonu

`netlify.toml` dosyası:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "8"

[[redirects]]
  from = "/api/*"
  to = "https://your-api-domain.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Konfigürasyonu

`nginx.conf` dosyası:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    keepalive_timeout  65;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    server {
        listen 80;
        server_name localhost;
        
        root /usr/share/nginx/html;
        index index.html;
        
        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # API proxy
        location /api/ {
            proxy_pass http://api-server:3001/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Socket.io proxy
        location /socket.io/ {
            proxy_pass http://api-server:3001/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Docker Compose

`docker-compose.yml` dosyası:

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_SOCKET_URL=http://localhost:3001
    depends_on:
      - api-server
    networks:
      - app-network

  api-server:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./api:/app
    ports:
      - "3001:3001"
    command: npm start
    environment:
      - NODE_ENV=production
      - PORT=3001
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Docker Build ve Run

```bash
# Build image
docker build -t borsa-analizi .

# Run container
docker run -p 80:80 borsa-analizi

# Docker Compose ile çalıştırma
docker-compose up -d
```

## AWS Deployment

### S3 + CloudFront

1. **S3 Bucket oluşturun:**
```bash
aws s3 mb s3://borsa-analizi-app
```

2. **Static website hosting aktif edin:**
```bash
aws s3 website s3://borsa-analizi-app --index-document index.html --error-document index.html
```

3. **Build'i upload edin:**
```bash
aws s3 sync dist/ s3://borsa-analizi-app --delete
```

4. **CloudFront distribution oluşturun:**
```json
{
  "CallerReference": "borsa-analizi-2024",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-borsa-analizi-app",
        "DomainName": "borsa-analizi-app.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-borsa-analizi-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "Comment": "Borsa Analizi App",
  "Enabled": true
}
```

### EC2 Deployment

1. **EC2 instance oluşturun:**
   - Amazon Linux 2
   - t3.micro (minimum)
   - Security Group: HTTP (80), HTTPS (443), SSH (22)

2. **Instance'a bağlanın:**
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

3. **Gerekli yazılımları yükleyin:**
```bash
sudo yum update -y
sudo yum install -y git

# Node.js yükle
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# PM2 yükle
npm install -g pm2
```

4. **Uygulamayı deploy edin:**
```bash
git clone <repository-url>
cd BorsaVerileri2025
npm install
npm run build

# PM2 ile çalıştır
pm2 serve dist 3000 --spa
pm2 startup
pm2 save
```

## Monitoring ve Logging

### Application Monitoring

**Sentry entegrasyonu:**

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring

**Web Vitals:**

```typescript
// src/utils/analytics.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Analytics servisine gönder
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Health Checks

```typescript
// src/utils/healthCheck.ts
export const healthCheck = async () => {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Periyodik health check
setInterval(async () => {
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.error('Application health check failed');
  }
}, 30000);
```

## Güvenlik

### Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' ws: wss:;
  font-src 'self';
">
```

### Environment Variables

```bash
# Production ortam değişkenleri
VITE_API_URL=https://api.yourdomain.com
VITE_SOCKET_URL=https://api.yourdomain.com
VITE_ENABLE_DEBUG=false
VITE_SENTRY_DSN=your-sentry-dsn
```

## Troubleshooting

### Yaygın Sorunlar

1. **Build hatası:**
```bash
# Node modules temizle
rm -rf node_modules package-lock.json
npm install
```

2. **Memory hatası:**
```bash
# Node.js memory limitini artır
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

3. **Socket.io bağlantı sorunu:**
   - CORS ayarlarını kontrol edin
   - Firewall kurallarını kontrol edin
   - WebSocket desteğini kontrol edin

### Log Analizi

```bash
# PM2 logs
pm2 logs

# Docker logs
docker logs container-name

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Backup ve Recovery

### Automated Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
APP_DIR="/app"

# Create backup
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" "$APP_DIR"

# Keep only last 7 backups
find "$BACKUP_DIR" -name "app_backup_*.tar.gz" -mtime +7 -delete
```

### Recovery Process

```bash
# Restore from backup
tar -xzf app_backup_20240101_120000.tar.gz -C /

# Restart services
pm2 restart all
# veya
docker-compose restart
```

## Performance Optimization

### Bundle Analysis

```bash
# Bundle analyzer
npm install -g webpack-bundle-analyzer
npx vite-bundle-analyzer
```

### Caching Strategy

```typescript
// Service Worker
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open('images').then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((fetchResponse) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});
```

## Scaling

### Horizontal Scaling

```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: borsa-analizi
spec:
  replicas: 3
  selector:
    matchLabels:
      app: borsa-analizi
  template:
    metadata:
      labels:
        app: borsa-analizi
    spec:
      containers:
      - name: frontend
        image: borsa-analizi:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Load Balancing

```nginx
upstream frontend {
    server frontend1:80;
    server frontend2:80;
    server frontend3:80;
}

server {
    listen 80;
    location / {
        proxy_pass http://frontend;
    }
}
```