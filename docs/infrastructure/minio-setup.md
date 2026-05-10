# MinIO Setup Guide

This guide documents how to set up MinIO for file storage in staging environments.

## Architecture Overview

```
Browser → nginx (minio-staging.example.com:443 HTTPS)
              ↓
         localhost:9002
              ↓
         MinIO Container (port 9000 internal)
              ↓
         api-boilerplate bucket
```

**Key Concept**: The API uses two different URLs:

- `AWS_S3_ENDPOINT` - Internal Docker network URL for the API to connect to MinIO
- `AWS_S3_PUBLIC_URL` - External public URL returned to clients/browsers

## Prerequisites

- Docker and Docker Compose installed
- nginx installed
- DNS A record pointing `minio-staging.example.com` to your server IP

## Step 1: Start MinIO Container

The MinIO container should be defined in your docker-compose file. Example:

```yaml
services:
  minio-staging:
    image: minio/minio:latest
    container_name: api-boilerplate-minio-staging
    ports:
      - '9002:9000' # API port (external:internal)
      - '9003:9001' # Console port (external:internal)
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio-staging-data:/data
    command: server /data --console-address ":9001"
```

Start the container:

```bash
docker compose up -d minio-staging
```

## Step 2: Create nginx Configuration

Create `/etc/nginx/sites-available/minio-staging`:

```nginx
server {
    listen 80;
    server_name minio-staging.example.com;

    # Allow large file uploads
    client_max_body_size 100M;

    # Reverse proxy to MinIO API (port 9002 on host -> 9000 in container)
    location / {
        proxy_pass http://localhost:9002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_cache_bypass $http_upgrade;

        # MinIO specific headers
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
}
```

Enable the site and reload nginx:

```bash
ln -sf /etc/nginx/sites-available/minio-staging /etc/nginx/sites-enabled/minio-staging
nginx -t
systemctl reload nginx
```

## Step 2.5: Install SSL Certificate

Use Certbot to get a Let's Encrypt SSL certificate:

```bash
certbot --nginx -d minio-staging.example.com --non-interactive --agree-tos --email admin@example.com
```

This will:

- Obtain an SSL certificate
- Automatically configure nginx for HTTPS
- Set up auto-renewal

## Step 3: Create Bucket and Set Permissions

Access the MinIO container and configure:

```bash
# Enter the container
docker exec -it api-boilerplate-minio-staging /bin/sh

# Set up mc alias
mc alias set local http://localhost:9000 minioadmin minioadmin

# Create bucket (if not exists)
mc mb local/api-boilerplate

# Set secure public access policy (read files only, no listing)
cat > /tmp/read-only-objects.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::api-boilerplate/*"]
    }
  ]
}
EOF
mc anonymous set-json /tmp/read-only-objects.json local/api-boilerplate

# Verify policy is set
mc anonymous get local/api-boilerplate
```

**Security Note**: This policy allows public READ access to individual files but blocks bucket listing (enumeration of all files).

## Step 4: Configure API Environment Variables

In your `.env.staging` file:

```env
#== S3 Storage (MinIO for staging)
AWS_S3_ENDPOINT=http://api-boilerplate-minio-staging:9000
AWS_S3_PUBLIC_URL=https://minio-staging.example.com
AWS_S3_ACCESS_KEY_ID=minioadmin
AWS_S3_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET_REGION=us-east-1
AWS_S3_API_VERSION=2010-12-01
AWS_S3_BUCKET_NAME=api-boilerplate
AWS_S3_FORCE_PATH_STYLE=true
```

**Important**:

- `AWS_S3_ENDPOINT` uses the Docker container name (internal network)
- `AWS_S3_PUBLIC_URL` uses the public domain (external access)

## Step 5: Restart API Container

After updating environment variables, restart the API container:

```bash
docker restart api-boilerplate-staging
```

## Step 6: Verify Setup

Test that images are publicly accessible:

```bash
# Upload a test file through the API, then verify:
curl -I https://minio-staging.example.com/api-boilerplate/images/your-image.jpg

# Should return HTTP/2 200 with Content-Type: image/jpeg
```

## Troubleshooting

### "Access Denied" errors

The bucket needs public download policy:

```bash
docker exec api-boilerplate-minio-staging mc anonymous set download local/api-boilerplate
```

### "NoSuchBucket" errors

Create the bucket:

```bash
docker exec api-boilerplate-minio-staging mc mb local/api-boilerplate
```

### Images returning internal Docker URLs

Ensure `AWS_S3_PUBLIC_URL` is set in your environment file and the API container is restarted.

### nginx 502 Bad Gateway

Check if MinIO container is running:

```bash
docker ps | grep minio
curl http://localhost:9002/minio/health/live
```

## Port Reference

| Port | Purpose                                 |
| ---- | --------------------------------------- |
| 9000 | MinIO API (internal container port)     |
| 9001 | MinIO Console (internal container port) |
| 9002 | MinIO API (host mapped port)            |
| 9003 | MinIO Console (host mapped port)        |

## Security Hardening

### 1. Block MinIO Console Port (9003)

The MinIO admin console should not be publicly accessible:

```bash
# Block external access to console port
iptables -I INPUT -p tcp --dport 9003 -j DROP
iptables -I INPUT -p tcp --dport 9003 -s 127.0.0.1 -j ACCEPT

# Save rules
iptables-save > /etc/iptables.rules
```

### 2. Change Default Credentials (Production)

Never use default `minioadmin/minioadmin` in production:

```bash
# In docker-compose or environment:
MINIO_ROOT_USER=your_secure_username
MINIO_ROOT_PASSWORD=your_very_secure_password_here
```

### 3. Bucket Policy Security

- **Use custom JSON policy** (not `mc anonymous set download`) to prevent bucket listing
- Only allow `s3:GetObject` action, not `s3:ListBucket`

## Production Note

For production, we use AWS S3 instead of MinIO. The `AWS_S3_PUBLIC_URL` can be:

- Left empty to use default AWS S3 URL pattern
- Set to a CloudFront CDN URL for better performance
