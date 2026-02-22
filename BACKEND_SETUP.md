# Backend Setup (Node.js + Express)

## Quick Start

```bash
# 1. Create backend folder
mkdir backend
cd backend

# 2. Setup
npm init -y
npm install express pg zod cors dotenv
npm install -D typescript ts-node nodemon @types/node @types/express

# 3. Create .env
cat > .env << EOF
DATABASE_URL=postgresql://postgres:password@localhost:5432/appraisal_db
PORT=3000
NODE_ENV=development
EOF

# 4. Copy server code
cp ../backend.example.ts server.ts

# 5. Run
npm run dev
```

## package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  }
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost/appraisal_db` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `JWT_SECRET` | Auth token secret | (generate random string) |
| `API_KEYS` | API keys (comma-separated) | `key1,key2,key3` |

## Database Setup

```bash
# Create database
createdb appraisal_db

# Run schema (from DB_SCHEMA.md)
psql appraisal_db < ../DB_SCHEMA.md

# Create indexes
psql appraisal_db << EOF
CREATE INDEX idx_comparables_city ON comparables(type, sale_date DESC);
CREATE INDEX idx_valuations_property ON valuations(property_id);
CREATE INDEX idx_properties_client ON properties(client_id);
EOF
```

## API Endpoints

### Comparables

```bash
# Import CSV
curl -X POST http://localhost:3000/api/comparables/import \
  -H "Content-Type: application/json" \
  -d '{"format": "csv", "data": "address,salePrice,builtArea\n..."}'
```

### Valuations

```bash
# Calculate
curl -X POST http://localhost:3000/api/valuations \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "...", "method": "comparable-sales"}'

# Get all
curl http://localhost:3000/api/valuations/PROPERTY_ID
```

### Reports

```bash
# Generate
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "...", "template": "standard"}'
```

### Branding

```bash
# Get
curl http://localhost:3000/api/branding

# Update
curl -X PUT http://localhost:3000/api/branding \
  -H "Content-Type: application/json" \
  -d '{"colors": {"primary": "#6366f1"}}'
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY server.ts ./
RUN npx tsc

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

```bash
docker build -t appraisal-backend .
docker run -e DATABASE_URL=... -p 3000:3000 appraisal-backend
```

### Heroku

```bash
heroku create appraisal-api
heroku addons:create heroku-postgresql:standard-0
git push heroku main
```

### Railway / Render

See their docs (similar to Heroku).

## Authentication (Next Step)

Add JWT middleware:

```typescript
import jwt from 'jsonwebtoken'

app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    ;(req as any).user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})
```

## Monitoring

```bash
# PM2
pm2 start server.ts --name appraisal-api
pm2 monit

# Logs
pm2 logs appraisal-api
```

## Performance Tips

1. **Cache comparables** by city + type (Redis)
2. **Batch valuations** (queue with Bull/BullMQ)
3. **Async reports** (generate in background, email when ready)
4. **Index database** properly (see above)
5. **Rate limit** API (npm: express-rate-limit)

---

Ready to build! 🚀
