# Production Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests pass (`npm run test`)
- [ ] No console errors in development
- [ ] Environment variables configured (see `.env.example`)
- [ ] Database schema deployed (DB_SCHEMA.md)
- [ ] SSL/TLS certificate obtained
- [ ] API keys and secrets configured in production
- [ ] Logging configured (Sentry, DataDog, etc.)
- [ ] Monitoring setup (health checks, alerts)
- [ ] Backup strategy defined
- [ ] Security audit completed

## Deployment Options

### Option 1: Heroku (Easiest for Small Teams)

```bash
# Setup
heroku login
heroku create appraisal-platform
heroku addons:create heroku-postgresql:standard-0
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set NODE_ENV=production

# Deploy frontend to Vercel/Netlify (separate)
# Or deploy Node server to Heroku, frontend as static

git push heroku main

# Monitor
heroku logs --tail
```

### Option 2: Docker Swarm / Kubernetes

```bash
# Build images
docker build -t appraisal-api ./backend -f backend/Dockerfile
docker build -t appraisal-web . -f Dockerfile.frontend

# Push to registry
docker tag appraisal-api myregistry/appraisal-api:latest
docker push myregistry/appraisal-api:latest

# Deploy with docker-compose on production server
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Cloud VPS (DigitalOcean, Linode, AWS EC2)

```bash
# SSH into server
ssh root@your-server-ip

# Setup
curl -sSL https://get.docker.com | sh
sudo systemctl start docker

# Clone repo
git clone https://github.com/yourorg/appraisal-platform.git
cd appraisal-platform

# Configure
cp .env.example .env
# Edit .env with production values

# Run
docker-compose -f docker-compose.prod.yml up -d

# Setup automatic backups
0 2 * * * pg_dump -h localhost appraisal_db | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
```

### Option 4: AWS (Scalable)

**Frontend:**
```bash
# Deploy to S3 + CloudFront
npm run build
aws s3 sync dist/ s3://appraisal-web-bucket/ --delete
cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

**Backend:**
```bash
# Deploy to ECS + RDS
# 1. Create RDS PostgreSQL instance
# 2. Push Docker image to ECR
# 3. Create ECS service pointing to image
# 4. Setup ALB for load balancing
# 5. Enable auto-scaling
```

**Database:**
```bash
# RDS PostgreSQL
# - Multi-AZ for high availability
# - Automated backups (30 days retention)
# - Enhanced monitoring
# - Read replicas for scaling
```

## Environment Configuration

### Production Variables

```env
# Security
NODE_ENV=production
JWT_SECRET=<generate-with-openssl-rand-base64-32>
CORS_ORIGIN=https://appraisal-platform.com

# Database
DATABASE_URL=postgresql://prod_user:strong_password@db-prod.internal:5432/appraisal_prod

# Services
REDIS_URL=redis://:password@cache-prod.internal:6379
SENDGRID_API_KEY=<from-sendgrid>

# Monitoring
SENTRY_DSN=https://..@sentry.io/...
LOG_LEVEL=warn

# Performance
CACHE_TTL=3600
RATE_LIMIT_MAX_REQUESTS=1000
```

### Database Hardening

```sql
-- Create restricted user (not postgres)
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE appraisal_prod TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Enable row-level security
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY valuations_isolation ON valuations
  USING (owner_id = current_user_id());

-- Encrypt sensitive columns
ALTER TABLE branding_settings ADD COLUMN api_keys_encrypted TEXT;

-- Backup automation
pg_dump appraisal_prod | gzip > /backups/appraisal_prod_$(date +%Y%m%d_%H%M%S).sql.gz
```

## Monitoring & Logging

### Application Health

```bash
# Health check endpoint
GET /health → { status: "ok", timestamp: "2024-01-15T10:30:00Z" }

# Liveness probe (Kubernetes)
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

# Readiness probe
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Logging

```typescript
// Winston logger
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})

// Sentry integration
import Sentry from '@sentry/node'
Sentry.init({ dsn: process.env.SENTRY_DSN })
```

### Metrics

```typescript
// Prometheus metrics
import prometheus from 'prom-client'

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code']
})

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    httpRequestDuration
      .labels(req.method, req.route?.path, res.statusCode)
      .observe(Date.now() - start)
  })
  next()
})

// Expose metrics
app.get('/metrics', (_req, res) => {
  res.set('Content-Type', prometheus.register.contentType)
  res.end(prometheus.register.metrics())
})
```

## Scaling Strategies

### Horizontal Scaling (Multiple Instances)

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: appraisal-api
spec:
  replicas: 3 # Scale to 3 instances
  selector:
    matchLabels:
      app: appraisal-api
  template:
    metadata:
      labels:
        app: appraisal-api
    spec:
      containers:
      - name: api
        image: appraisal-api:latest
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: appraisal-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: appraisal-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Optimization

1. **Indexing** (already defined in DB_SCHEMA.md)
   ```sql
   CREATE INDEX idx_comparables_type_date ON comparables(type, sale_date DESC);
   CREATE INDEX idx_valuations_property_date ON valuations(property_id, created_at DESC);
   ```

2. **Connection Pooling**
   ```typescript
   import PgBoss from 'pg-boss'
   const pool = new PgBoss({ connectionString })
   ```

3. **Caching Layer**
   ```typescript
   // Redis cache for comparables
   const comparables = await redis.get(`comparables:${city}`)
   if (!comparables) {
     comparables = await db.query('SELECT * FROM comparables WHERE city = $1', [city])
     await redis.setex(`comparables:${city}`, 3600, JSON.stringify(comparables))
   }
   ```

## Security Hardening

### HTTPS/TLS

```bash
# Let's Encrypt (free)
certbot certonly --standalone -d appraisal-platform.com
certbot renew --quiet # Add to cron

# In Nginx/HAProxy
ssl_certificate /etc/letsencrypt/live/appraisal-platform.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/appraisal-platform.com/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
})

app.use('/api/', limiter)
```

### CORS

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN, // https://appraisal-platform.com
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

### Helmet.js

```typescript
import helmet from 'helmet'
app.use(helmet())
```

## Rollback Strategy

```bash
# Keep last 5 deployments
docker system prune --filter "until=168h" -a

# Tag releases
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0

# Rollback script
#!/bin/bash
PREVIOUS_IMAGE=$(docker images appraisal-api | sed -n '2p' | awk '{print $3}')
docker-compose down
docker run -d -p 3000:3000 $PREVIOUS_IMAGE
```

## Post-Deployment

1. **Smoke Tests**
   ```bash
   curl https://appraisal-platform.com/health
   curl -X POST https://appraisal-platform.com/api/valuations \
     -H "Authorization: Bearer $API_KEY" \
     -d '{...}'
   ```

2. **Performance Baseline**
   - Response time < 500ms
   - DB query < 100ms
   - Uptime > 99.9%

3. **Notify Team**
   - Deployment status
   - Rollback procedure
   - Known issues

---

**Ready to deploy!** 🚀

Questions? See BACKEND_SETUP.md for development details.
