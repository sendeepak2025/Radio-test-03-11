# Docker & Kubernetes Deployment Guide

## 📦 Overview

This guide covers deploying the Radiology Reporting System using Docker and Kubernetes.

**Architecture**:
- **Frontend**: React + Vite (NGINX served)
- **Backend**: Node.js + Express
- **Database**: MongoDB 7.0
- **Cache**: Redis 7
- **DICOM**: Orthanc (optional)

---

## 🐳 Docker Deployment

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM
- 50GB+ disk space

### Quick Start

1. **Clone repository**:
```bash
git clone <repository-url>
cd Radio-test-03-11
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

3. **Build and start**:
```bash
docker-compose up -d
```

4. **Verify deployment**:
```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f

# Check health
curl http://localhost:5000/api/health
curl http://localhost:3000/health
```

5. **Access application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Orthanc: http://localhost:8042

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a service
docker-compose restart backend

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Execute command in container
docker-compose exec backend npm run optimize-database

# Scale backend
docker-compose up -d --scale backend=3

# Remove all containers and volumes
docker-compose down -v
```

### Building Images

```bash
# Build backend
cd server
docker build -t radiology-backend:latest .

# Build frontend
cd ../viewer
docker build -t radiology-frontend:latest .

# Push to registry
docker tag radiology-backend:latest your-registry/radiology-backend:latest
docker push your-registry/radiology-backend:latest

docker tag radiology-frontend:latest your-registry/radiology-frontend:latest
docker push your-registry/radiology-frontend:latest
```

---

## ☸️ Kubernetes Deployment

### Prerequisites

- Kubernetes cluster 1.25+
- kubectl configured
- Helm 3+ (optional)
- NGINX Ingress Controller
- Cert-Manager (for SSL)

### Cluster Setup

1. **Create namespace**:
```bash
kubectl apply -f k8s/namespace.yaml
```

2. **Create secrets**:
```bash
# Update secrets in k8s/secrets.yaml with base64 encoded values
echo -n "your-password" | base64

# Apply secrets
kubectl apply -f k8s/secrets.yaml
```

3. **Create ConfigMap**:
```bash
# Update k8s/configmap.yaml with your configuration
kubectl apply -f k8s/configmap.yaml
```

### Deploy Services

```bash
# Deploy MongoDB
kubectl apply -f k8s/mongodb-deployment.yaml

# Wait for MongoDB to be ready
kubectl wait --for=condition=ready pod -l app=mongodb -n radiology --timeout=300s

# Deploy Redis
kubectl apply -f k8s/redis-deployment.yaml

# Deploy Backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy Frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy Ingress
kubectl apply -f k8s/ingress.yaml

# Deploy Auto-scaling
kubectl apply -f k8s/hpa.yaml
```

### Verify Deployment

```bash
# Check all resources
kubectl get all -n radiology

# Check pods
kubectl get pods -n radiology

# Check services
kubectl get svc -n radiology

# Check ingress
kubectl get ingress -n radiology

# Check persistent volumes
kubectl get pvc -n radiology

# View logs
kubectl logs -f deployment/backend -n radiology
kubectl logs -f deployment/frontend -n radiology
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment backend --replicas=5 -n radiology

# Check HPA status
kubectl get hpa -n radiology

# View HPA details
kubectl describe hpa backend-hpa -n radiology
```

### Updates & Rollouts

```bash
# Update image
kubectl set image deployment/backend backend=your-registry/radiology-backend:v2.0 -n radiology

# Check rollout status
kubectl rollout status deployment/backend -n radiology

# View rollout history
kubectl rollout history deployment/backend -n radiology

# Rollback to previous version
kubectl rollout undo deployment/backend -n radiology

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n radiology
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://user:pass@mongodb:27017/radiology
REDIS_URL=redis://:password@redis:6379
JWT_SECRET=your-jwt-secret-minimum-32-characters
ORTHANC_URL=http://orthanc:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
```

#### Frontend
```bash
VITE_API_URL=http://backend-service:5000
VITE_WS_URL=ws://backend-service:5000
```

### Resource Requirements

| Component | Min CPU | Min RAM | Storage |
|-----------|---------|---------|---------|
| Frontend | 250m | 256Mi | - |
| Backend | 500m | 512Mi | 50Gi (uploads) |
| MongoDB | 500m | 512Mi | 20Gi |
| Redis | 250m | 256Mi | 10Gi |

### Port Mapping

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Frontend | 3000 | HTTP | Web UI |
| Backend | 5000 | HTTP | REST API |
| MongoDB | 27017 | TCP | Database |
| Redis | 6379 | TCP | Cache |
| Orthanc | 8042 | HTTP | Web interface |
| Orthanc | 4242 | DICOM | DICOM protocol |

---

## 🔒 Security

### SSL/TLS Configuration

1. **Install cert-manager**:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

2. **Create ClusterIssuer**:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

3. **Apply**:
```bash
kubectl apply -f cluster-issuer.yaml
```

### Secret Management

**For production, use external secret management**:

1. **AWS Secrets Manager**:
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
```

2. **HashiCorp Vault**:
```bash
# Install Vault
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault -n vault --create-namespace
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: radiology
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 5000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: mongodb
    ports:
    - protocol: TCP
      port: 27017
```

---

## 📊 Monitoring

### Prometheus & Grafana

1. **Install Prometheus**:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

2. **Access Grafana**:
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Default credentials: admin/prom-operator
```

3. **Import dashboards**:
- Node.js Application Dashboard (ID: 11159)
- MongoDB Dashboard (ID: 2583)
- NGINX Ingress Dashboard (ID: 9614)

### Health Checks

**Backend**:
```bash
curl http://localhost:5000/api/health
```

**Frontend**:
```bash
curl http://localhost:3000/health
```

**Kubernetes**:
```bash
kubectl get --raw /healthz
kubectl get --raw /livez
kubectl get --raw /readyz
```

---

## 🔄 Backup & Restore

### MongoDB Backup

```bash
# Backup
kubectl exec -it deployment/mongodb -n radiology -- mongodump --out /tmp/backup
kubectl cp radiology/mongodb-pod:/tmp/backup ./mongodb-backup-$(date +%Y%m%d)

# Restore
kubectl cp ./mongodb-backup mongodb-pod:/tmp/backup -n radiology
kubectl exec -it deployment/mongodb -n radiology -- mongorestore /tmp/backup
```

### Automated Backups

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: radiology
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:7.0
            command:
            - /bin/sh
            - -c
            - mongodump --host mongodb-service --out /backup/$(date +%Y%m%d)
            volumeMounts:
            - name: backup
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: mongodb-backup-pvc
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Pod not starting**:
```bash
kubectl describe pod <pod-name> -n radiology
kubectl logs <pod-name> -n radiology
```

**2. Database connection failed**:
```bash
# Check MongoDB is running
kubectl get pods -l app=mongodb -n radiology

# Check MongoDB logs
kubectl logs deployment/mongodb -n radiology

# Test connection
kubectl exec -it deployment/backend -n radiology -- node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e))"
```

**3. Ingress not working**:
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress
kubectl describe ingress radiology-ingress -n radiology

# View NGINX logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

**4. Out of memory**:
```bash
# Check pod resources
kubectl top pods -n radiology

# Increase limits in deployment
kubectl edit deployment backend -n radiology
```

### Debug Mode

```bash
# Enable debug logs
kubectl set env deployment/backend DEBUG=* -n radiology

# View detailed logs
kubectl logs -f deployment/backend -n radiology --tail=100

# Execute shell in pod
kubectl exec -it deployment/backend -n radiology -- /bin/sh
```

---

## 📈 Performance Tuning

### MongoDB Optimization

```bash
# Run optimization script
kubectl exec -it deployment/backend -n radiology -- node optimize-database.js
```

### Connection Pooling

```javascript
// server/src/index.js
mongoose.connect(mongoUri, {
  maxPoolSize: 100,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### Redis Caching

```javascript
// Implement Redis caching for templates
const cacheKey = `templates:${modality}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const templates = await ReportTemplate.find({ modality });
await redis.setex(cacheKey, 900, JSON.stringify(templates)); // 15 min TTL
```

---

## 🎯 Production Checklist

- [ ] Update all secrets in `k8s/secrets.yaml`
- [ ] Configure SSL certificates
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure automated backups
- [ ] Set resource limits and requests
- [ ] Configure HPA (auto-scaling)
- [ ] Set up logging (ELK or Loki)
- [ ] Configure network policies
- [ ] Run security scan (Trivy)
- [ ] Load testing completed
- [ ] Database indexes created
- [ ] Configure alerting
- [ ] Document runbooks
- [ ] Train operations team

---

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Cert-Manager](https://cert-manager.io/docs/)
- [Prometheus](https://prometheus.io/docs/)
- [MongoDB on Kubernetes](https://www.mongodb.com/kubernetes)

---

**Last Updated**: November 19, 2025  
**Version**: 1.0.0
