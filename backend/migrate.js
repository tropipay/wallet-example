/**
 * Database Migration Script
 * Adds new columns to existing users table for registration feature
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Migration {
  constructor() {
    const dbPath = path.join(__dirname, 'tropipay_wallet.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
      } else {
        console.log('✅ Connected to SQLite database for migration');
        this.migrate();
      }
    });
  }

  async migrate() {
    console.log('🔄 Starting database migration...');

    try {
      // Add new columns to users table if they don't exist
      const alterQueries = [
        'ALTER TABLE users ADD COLUMN first_name TEXT',
        'ALTER TABLE users ADD COLUMN last_name TEXT', 
        'ALTER TABLE users ADD COLUMN email TEXT',
        'ALTER TABLE users ADD COLUMN phone TEXT'
      ];

      for (const query of alterQueries) {
        await new Promise((resolve, reject) => {
          this.db.run(query, (err) => {
            if (err) {
              if (err.message.includes('duplicate column name')) {
                console.log(`⚠️  Column already exists, skipping: ${query}`);
              } else {
                console.error(`❌ Error executing: ${query}`, err.message);
              }
            } else {
              console.log(`✅ Successfully executed: ${query}`);
            }
            resolve();
          });
        });
      }

      console.log('✅ Database migration completed successfully');
      
      // Show current table schema
      this.showTableSchema();

    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }

  showTableSchema() {
    this.db.all("PRAGMA table_info(users)", (err, rows) => {
      if (err) {
        console.error('❌ Error getting table schema:', err);
      } else {
        console.log('\n📋 Current users table schema:');
        console.table(rows.map(row => ({
          Name: row.name,
          Type: row.type,
          NotNull: row.notnull ? 'YES' : 'NO',
          DefaultValue: row.dflt_value || 'NULL'
        })));
      }
      
      // Close database connection
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err);
        } else {
          console.log('✅ Database connection closed');
        }
      });
    });
  }
}

// Run migration
new Migration();