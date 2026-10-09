const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysqlDB = require('../utils/mysql');

class ImportUpload {
  static getStorageDir() {
    const dir = path.join(__dirname, '..', 'storage', 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Saves an uploaded file buffer or stream to private storage and logs to ImportUpload table.
   */
  static async saveUpload({ originalFilename, buffer, actor = 'admin' }) {
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const storageDir = this.getStorageDir();
    const timestamp = Date.now();
    const safeBaseName = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${timestamp}_${fileHash.substring(0, 8)}_${safeBaseName}`;
    const storagePath = path.join(storageDir, storageKey);

    fs.writeFileSync(storagePath, buffer);

    const [result] = await mysqlDB.query(
      `INSERT INTO \`ImportUpload\` (\`original_filename\`, \`storage_key\`, \`file_hash\`, \`file_size\`, \`actor\`, \`created_at\`)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [originalFilename, storageKey, fileHash, buffer.length, actor]
    );

    return {
      uploadId: result.insertId,
      storageKey,
      storagePath,
      fileHash,
      fileSize: buffer.length,
      originalFilename,
    };
  }

  static async getUpload(uploadId) {
    const [rows] = await mysqlDB.query('SELECT * FROM `ImportUpload` WHERE `id` = ?', [uploadId]);
    if (!rows.length) return null;
    const upload = rows[0];
    const storagePath = path.join(this.getStorageDir(), upload.storage_key);
    return {
      ...upload,
      storagePath,
    };
  }
}

module.exports = ImportUpload;
