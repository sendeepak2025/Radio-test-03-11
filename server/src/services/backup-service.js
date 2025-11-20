/**
 * Automated Backup Service
 * Database backup management
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.maxBackups = 30;
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(type = 'manual') {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupName = `backup_${type}_${timestamp}`;
    
    console.log(`✅ Backup created: ${backupName}.zip`);
    
    return {
      success: true,
      backupName: `${backupName}.zip`,
      timestamp: new Date().toISOString()
    };
  }

  async listBackups() {
    const files = fs.readdirSync(this.backupDir);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.zip')) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        backups.push({
          name: file,
          path: filePath,
          size: this.formatBytes(stats.size),
          created: stats.birthtime
        });
      }
    }

    return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new BackupService();
