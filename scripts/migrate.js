require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysqlDB = require('../utils/mysql');

async function runMigration() {
  const sqlFile = path.join(__dirname, '..', 'migrations', '20261005_history_and_restore_schema.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  // Strip line comments
  const cleanSql = sqlContent.replace(/--.*$/gm, '');
  
  // Split statements by semicolon
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Running ${statements.length} migration statements...`);

  for (const stmt of statements) {
    if (stmt) {
      await mysqlDB.query(stmt);
    }
  }

  console.log('Migration completed successfully!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
