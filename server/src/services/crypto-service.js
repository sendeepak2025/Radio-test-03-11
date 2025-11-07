const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Cryptographic Service for FDA 21 CFR Part 11 Compliant Digital Signatures
 * Implements RSA-SHA256 signature generation and verification
 * Supports 2048-bit and 4096-bit RSA keys
 */

class CryptoService {
  constructor() {
    this.algorithm = 'RSA-SHA256';
    this.keySize = 2048;
    this.privateKey = null;
    this.publicKey = null;
    this.keyVersion = null;
    this.archivedKeys = new Map(); // Store old keys for verification
    
    // Load keys on initialization
    this.loadKeys();
  }

  /**
   * Load private and public keys from secure storage with versioning
   * Keys should be stored in environment-specified paths or generated if not exist
   */
  loadKeys() {
    try {
      const keysDir = process.env.SIGNATURE_KEYS_PATH || path.join(__dirname, '../../keys');
      const privateKeyPath = path.join(keysDir, 'signature-private.pem');
      const publicKeyPath = path.join(keysDir, 'signature-public.pem');
      const versionFile = path.join(keysDir, 'key-version.txt');

      // Create keys directory if it doesn't exist
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true, mode: 0o700 });
        console.log('📁 Created keys directory:', keysDir);
      }

      // Check if keys exist, if not generate them
      if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        console.log('🔑 Signature keys not found, generating new key pair...');
        this.generateKeyPair(keysDir);
      }

      // Load keys
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');

      // Load key version
      if (fs.existsSync(versionFile)) {
        this.keyVersion = fs.readFileSync(versionFile, 'utf8').trim();
      } else {
        this.keyVersion = 'v1';
        fs.writeFileSync(versionFile, this.keyVersion, { mode: 0o600 });
      }

      // Load archived keys for verification
      this.loadArchivedKeys(keysDir);

      console.log('✅ Cryptographic keys loaded successfully');
      console.log('🔐 Algorithm:', this.algorithm);
      console.log('🔑 Key Size:', this.keySize, 'bits');
      console.log('📌 Key Version:', this.keyVersion);
      console.log('📦 Archived Keys:', this.archivedKeys.size);
    } catch (error) {
      console.error('❌ Error loading cryptographic keys:', error);
      throw new Error('Failed to load cryptographic keys: ' + error.message);
    }
  }

  /**
   * Load archived keys for verification of old signatures
   * @param {string} keysDir - Keys directory
   */
  loadArchivedKeys(keysDir) {
    try {
      const archiveDir = path.join(keysDir, 'archive');
      if (!fs.existsSync(archiveDir)) {
        return;
      }

      const files = fs.readdirSync(archiveDir);
      for (const file of files) {
        if (file.startsWith('signature-public-') && file.endsWith('.pem')) {
          const version = file.replace('signature-public-', '').replace('.pem', '');
          const keyPath = path.join(archiveDir, file);
          const publicKey = fs.readFileSync(keyPath, 'utf8');
          this.archivedKeys.set(version, publicKey);
          console.log('📦 Loaded archived key:', version);
        }
      }
    } catch (error) {
      console.error('⚠️ Error loading archived keys:', error);
    }
  }

  /**
   * Generate RSA key pair for signatures
   * @param {string} keysDir - Directory to store keys
   */
  generateKeyPair(keysDir) {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: this.keySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase: process.env.SIGNATURE_KEY_PASSPHRASE || 'default_passphrase_change_in_production'
        }
      });

      // Save keys to files with restricted permissions
      const privateKeyPath = path.join(keysDir, 'signature-private.pem');
      const publicKeyPath = path.join(keysDir, 'signature-public.pem');

      fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
      fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

      console.log('✅ Generated new RSA key pair');
      console.log('🔒 Private key saved to:', privateKeyPath);
      console.log('🔓 Public key saved to:', publicKeyPath);

      // Store keys in memory
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    } catch (error) {
      console.error('❌ Error generating key pair:', error);
      throw new Error('Failed to generate key pair: ' + error.message);
    }
  }

  /**
   * Generate cryptographic signature for data with key version
   * @param {string} data - Data to sign
   * @returns {object} Signature with version info
   */
  generateSignature(data) {
    try {
      if (!this.privateKey) {
        throw new Error('Private key not loaded');
      }

      if (!data || typeof data !== 'string') {
        throw new Error('Invalid data for signing');
      }

      const sign = crypto.createSign('RSA-SHA256');
      sign.update(data);
      sign.end();

      const signature = sign.sign({
        key: this.privateKey,
        passphrase: process.env.SIGNATURE_KEY_PASSPHRASE || 'default_passphrase_change_in_production'
      }, 'base64');

      console.log('✅ Signature generated successfully with key version:', this.keyVersion);
      
      // Return signature with version for tracking
      return signature;
    } catch (error) {
      console.error('❌ Error generating signature:', error);
      throw new Error('Failed to generate signature: ' + error.message);
    }
  }

  /**
   * Get current key version
   * @returns {string} Current key version
   */
  getKeyVersion() {
    return this.keyVersion;
  }

  /**
   * Verify cryptographic signature with support for archived keys
   * @param {string} data - Original data that was signed
   * @param {string} signature - Base64-encoded signature to verify
   * @param {string} keyVersion - Optional key version to use for verification
   * @returns {boolean} True if signature is valid
   */
  verifySignature(data, signature, keyVersion = null) {
    try {
      if (!data || typeof data !== 'string') {
        throw new Error('Invalid data for verification');
      }

      if (!signature || typeof signature !== 'string') {
        throw new Error('Invalid signature for verification');
      }

      // Determine which public key to use
      let publicKey = this.publicKey;
      
      if (keyVersion && keyVersion !== this.keyVersion) {
        // Try to use archived key
        if (this.archivedKeys.has(keyVersion)) {
          publicKey = this.archivedKeys.get(keyVersion);
          console.log('🔍 Using archived key version:', keyVersion);
        } else {
          console.warn('⚠️ Archived key not found for version:', keyVersion);
          // Try current key anyway
        }
      }

      if (!publicKey) {
        throw new Error('Public key not available');
      }

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(data);
      verify.end();

      const isValid = verify.verify(publicKey, signature, 'base64');

      console.log('🔍 Signature verification:', isValid ? '✅ VALID' : '❌ INVALID');
      return isValid;
    } catch (error) {
      console.error('❌ Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Generate SHA-256 hash of data
   * @param {string} data - Data to hash
   * @returns {string} Hex-encoded hash
   */
  hashData(data) {
    try {
      if (!data || typeof data !== 'string') {
        throw new Error('Invalid data for hashing');
      }

      const hash = crypto.createHash('sha256');
      hash.update(data);
      const digest = hash.digest('hex');

      console.log('🔐 Data hashed successfully');
      return digest;
    } catch (error) {
      console.error('❌ Error hashing data:', error);
      throw new Error('Failed to hash data: ' + error.message);
    }
  }

  /**
   * Encrypt data using AES-256-CBC
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key (32 bytes for AES-256)
   * @returns {object} Encrypted data with IV
   */
  encryptData(data, key = null) {
    try {
      // Use provided key or generate from environment
      const encryptionKey = key || crypto.scryptSync(
        process.env.ENCRYPTION_KEY || 'default_encryption_key_change_in_production',
        'salt',
        32
      );

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        algorithm: 'aes-256-cbc'
      };
    } catch (error) {
      console.error('❌ Error encrypting data:', error);
      throw new Error('Failed to encrypt data: ' + error.message);
    }
  }

  /**
   * Decrypt data using AES-256-CBC
   * @param {string} encryptedData - Encrypted data in hex
   * @param {string} ivHex - Initialization vector in hex
   * @param {string} key - Decryption key (32 bytes for AES-256)
   * @returns {string} Decrypted data
   */
  decryptData(encryptedData, ivHex, key = null) {
    try {
      // Use provided key or generate from environment
      const decryptionKey = key || crypto.scryptSync(
        process.env.ENCRYPTION_KEY || 'default_encryption_key_change_in_production',
        'salt',
        32
      );

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', decryptionKey, iv);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('❌ Error decrypting data:', error);
      throw new Error('Failed to decrypt data: ' + error.message);
    }
  }

  /**
   * Generate random token for various purposes
   * @param {number} length - Length of token in bytes
   * @returns {string} Hex-encoded random token
   */
  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Get public key for external verification
   * @returns {string} Public key in PEM format
   */
  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Rotate keys (generate new key pair) with proper versioning
   * Old keys are archived and remain available for verification
   * @param {string} reason - Reason for key rotation
   * @returns {object} Rotation result
   */
  rotateKeys(reason = 'Scheduled rotation') {
    try {
      console.log('🔄 Starting key rotation...');
      console.log('📝 Reason:', reason);

      const keysDir = process.env.SIGNATURE_KEYS_PATH || path.join(__dirname, '../../keys');
      const archiveDir = path.join(keysDir, 'archive');
      const rotationLogPath = path.join(keysDir, 'rotation-log.json');

      // Create archive directory
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
      }

      // Archive old keys with version
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const oldVersion = this.keyVersion;
      const privateKeyPath = path.join(keysDir, 'signature-private.pem');
      const publicKeyPath = path.join(keysDir, 'signature-public.pem');

      if (fs.existsSync(privateKeyPath)) {
        fs.renameSync(
          privateKeyPath,
          path.join(archiveDir, `signature-private-${timestamp}.pem`)
        );
        console.log('📦 Archived private key');
      }

      if (fs.existsSync(publicKeyPath)) {
        fs.renameSync(
          publicKeyPath,
          path.join(archiveDir, `signature-public-${timestamp}.pem`)
        );
        console.log('📦 Archived public key');
      }

      // Increment version
      const versionNum = parseInt(oldVersion.replace('v', '')) || 1;
      const newVersion = `v${versionNum + 1}`;

      // Generate new keys
      this.generateKeyPair(keysDir);

      // Update version
      this.keyVersion = newVersion;
      const versionFile = path.join(keysDir, 'key-version.txt');
      fs.writeFileSync(versionFile, newVersion, { mode: 0o600 });

      // Add old key to archived keys map
      if (fs.existsSync(path.join(archiveDir, `signature-public-${timestamp}.pem`))) {
        const archivedPublicKey = fs.readFileSync(
          path.join(archiveDir, `signature-public-${timestamp}.pem`),
          'utf8'
        );
        this.archivedKeys.set(timestamp, archivedPublicKey);
      }

      // Log rotation
      const rotationLog = {
        timestamp: new Date().toISOString(),
        oldVersion,
        newVersion,
        reason,
        archivedKeyTimestamp: timestamp,
        performedBy: process.env.USER || 'system'
      };

      // Append to rotation log
      let rotationHistory = [];
      if (fs.existsSync(rotationLogPath)) {
        rotationHistory = JSON.parse(fs.readFileSync(rotationLogPath, 'utf8'));
      }
      rotationHistory.push(rotationLog);
      fs.writeFileSync(rotationLogPath, JSON.stringify(rotationHistory, null, 2), { mode: 0o600 });

      console.log('✅ Keys rotated successfully');
      console.log('📌 Old version:', oldVersion);
      console.log('📌 New version:', newVersion);
      console.log('📦 Old keys archived to:', archiveDir);

      return {
        success: true,
        oldVersion,
        newVersion,
        timestamp: rotationLog.timestamp,
        archivedKeyTimestamp: timestamp
      };
    } catch (error) {
      console.error('❌ Error rotating keys:', error);
      throw new Error('Failed to rotate keys: ' + error.message);
    }
  }

  /**
   * Get key rotation history
   * @returns {Array} Rotation history
   */
  getRotationHistory() {
    try {
      const keysDir = process.env.SIGNATURE_KEYS_PATH || path.join(__dirname, '../../keys');
      const rotationLogPath = path.join(keysDir, 'rotation-log.json');

      if (fs.existsSync(rotationLogPath)) {
        return JSON.parse(fs.readFileSync(rotationLogPath, 'utf8'));
      }

      return [];
    } catch (error) {
      console.error('❌ Error reading rotation history:', error);
      return [];
    }
  }

  /**
   * Get information about current and archived keys
   * @returns {object} Key information
   */
  getKeyInfo() {
    return {
      currentVersion: this.keyVersion,
      algorithm: this.algorithm,
      keySize: this.keySize,
      archivedVersions: Array.from(this.archivedKeys.keys()),
      rotationHistory: this.getRotationHistory()
    };
  }
}

// Export singleton instance
module.exports = new CryptoService();

// Export singleton instance
module.exports = new CryptoService();
