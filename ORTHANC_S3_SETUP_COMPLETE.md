# Orthanc S3 Setup Complete! 🎉

## Your New Orthanc Server Details

### Server Information
- **Server IP**: 54.160.225.145
- **Web Interface**: http://54.160.225.145:8042
- **DICOM Port**: 4242
- **Username**: orthanc
- **Password**: orthanc_secure_2024

### Storage Configuration
- **Storage Type**: AWS S3
- **S3 Bucket**: orthanc-dicom-storage-varn
- **Region**: us-east-1
- **Storage Structure**: Flat
- **Encryption**: AES256 (Server-side)

### AWS Resources Created
1. **S3 Bucket**: `orthanc-dicom-storage-varn`
2. **IAM User**: `rthanc-s3-user`
3. **EC2 Instance**: `i-072485e337aab6327` (t3.micro)
4. **Security Group**: Ports 22, 4242, 8042 open

---

## What Was Updated

### Backend Configuration
- ✅ `server/.env` - Updated ORTHANC_URL to new AWS server
- ✅ MongoDB Atlas - Already configured (no changes needed)
- ✅ AI Services - Already configured (no changes needed)

### How to Test

1. **Start your backend server**:
   ```bash
   cd server
   npm start
   ```

2. **Start your frontend**:
   ```bash
   cd viewer
   npm run dev
   ```

3. **Upload a DICOM file** through your application

4. **Verify in S3**:
   - Go to AWS Console → S3
   - Open bucket: `orthanc-dicom-storage-varn`
   - You should see `.dcm` files

---

## Access Orthanc Web Interface

**URL**: http://54.160.225.145:8042

**Login**:
- Username: `orthanc`
- Password: `orthanc_secure_2024`

**Features Available**:
- Upload DICOM files
- View studies/series
- Query/Retrieve
- DICOM Web (DICOMweb) API
- REST API

---

## Architecture

```
Your Application (Local)
    ↓
Node.js Backend (localhost:8001)
    ↓
AWS Orthanc Server (54.160.225.145:8042)
    ↓
AWS S3 Bucket (orthanc-dicom-storage-varn)
    ↓
MongoDB Atlas (cluster1.xqa5iyj.mongodb.net)
```

---

## Important Notes

### Security
- ✅ S3 bucket is private (no public access)
- ✅ Server-side encryption enabled (AES256)
- ✅ Authentication enabled on Orthanc
- ⚠️ **TODO**: Change default password in production
- ⚠️ **TODO**: Restrict security group to specific IPs

### Costs (Approximate)
- **EC2 t3.micro**: ~$7-10/month
- **S3 Storage**: ~$0.023/GB/month
- **S3 Requests**: ~$0.005 per 1000 requests
- **Data Transfer**: First 100GB free/month

### Backup
- S3 versioning is enabled (can restore deleted files)
- Consider enabling S3 lifecycle policies for old data
- Orthanc database is in Docker volume `orthanc-db`

---

## SSH Access to Server

**Connect via AWS Console**:
1. Go to EC2 → Instances
2. Select your instance
3. Click "Connect" → "EC2 Instance Connect"

**Or via PowerShell** (if you have the .pem file):
```powershell
ssh -i orthanc-key.pem ubuntu@54.160.225.145
```

---

## Useful Commands on Server

### Check Orthanc Status
```bash
cd ~/orthanc-s3
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f
```

### Restart Orthanc
```bash
docker-compose restart
```

### Stop Orthanc
```bash
docker-compose down
```

### Start Orthanc
```bash
docker-compose up -d
```

### Check S3 Storage Usage
```bash
docker-compose exec orthanc curl -u orthanc:orthanc_secure_2024 http://localhost:8042/statistics
```

---

## API Endpoints

### Orthanc REST API
- **Base URL**: http://54.160.225.145:8042
- **Auth**: Basic Auth (orthanc:orthanc_secure_2024)

**Examples**:
```bash
# Get system info
curl -u orthanc:orthanc_secure_2024 http://54.160.225.145:8042/system

# List all studies
curl -u orthanc:orthanc_secure_2024 http://54.160.225.145:8042/studies

# Get statistics
curl -u orthanc:orthanc_secure_2024 http://54.160.225.145:8042/statistics
```

### DICOMweb API
- **Base URL**: http://54.160.225.145:8042/dicom-web
- **WADO URL**: http://54.160.225.145:8042/wado

---

## Troubleshooting

### Can't Upload Files
1. Check S3 permissions for IAM user
2. Check Orthanc logs: `docker-compose logs`
3. Verify AWS credentials in docker-compose.yml

### Can't Access Web Interface
1. Check EC2 security group (port 8042 open)
2. Check Orthanc is running: `docker-compose ps`
3. Check EC2 instance is running in AWS console

### S3 Access Denied Errors
1. Go to IAM → Users → rthanc-s3-user
2. Ensure `AmazonS3FullAccess` policy is attached
3. Wait 30 seconds for permissions to propagate

### Server Connection Issues
1. Check EC2 instance public IP hasn't changed
2. Verify security group rules
3. Check Orthanc container is running

---

## Next Steps (Option 2 - Full AWS Deployment)

When you're ready to deploy everything to AWS:

1. **Deploy Backend to EC2**
   - Same server as Orthanc or separate
   - Install Node.js and dependencies
   - Set up PM2 for process management
   - Configure nginx as reverse proxy

2. **Deploy Frontend**
   - Build production bundle
   - Upload to S3 bucket
   - Set up CloudFront CDN
   - Configure custom domain

3. **Deploy AI Services**
   - Keep using Hugging Face API (recommended)
   - Or deploy to separate EC2 with GPU

4. **Set Up Domain & SSL**
   - Register domain
   - Configure Route 53
   - Set up SSL certificates (Let's Encrypt)

5. **Monitoring & Backup**
   - CloudWatch for monitoring
   - Automated S3 backups
   - Database backups

---

## Support

If you need help:
1. Check Orthanc logs first
2. Check AWS CloudWatch logs
3. Verify all services are running
4. Check network connectivity

---

**Setup completed on**: October 31, 2025
**Orthanc Version**: 24.10.1
**Storage**: AWS S3 (orthanc-dicom-storage-varn)
