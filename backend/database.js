// Database configuration and initialization for Node.js backend
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, 'tropipay_wallet.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
      } else {
        console.log('✅ Connected to SQLite database');
        this.createTables();
      }
    });
  }

  createTables() {
    // Tabla de usuarios/clientes
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT UNIQUE NOT NULL,
        client_secret TEXT NOT NULL,
        access_token TEXT,
        token_expires_at DATETIME,
        user_data TEXT, -- JSON string with user profile data
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabla de cuentas (cache local para mejorar UX)
    const createAccountsTable = `
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        account_id TEXT NOT NULL,
        account_number TEXT NOT NULL,
        currency TEXT NOT NULL,
        alias TEXT,
        type TEXT,
        is_default BOOLEAN DEFAULT 0,
        available REAL DEFAULT 0,
        blocked REAL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    // Tabla de beneficiarios (cache local)
    const createBeneficiariesTable = `
      CREATE TABLE IF NOT EXISTS beneficiaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        beneficiary_id TEXT NOT NULL,
        account_number TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        alias TEXT,
        email TEXT,
        phone TEXT,
        country_code TEXT,
        country_name TEXT,
        type INTEGER DEFAULT 0,
        state TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    // Ejecutar creación de tablas
    this.db.serialize(() => {
      this.db.run(createUsersTable, (err) => {
        if (err) console.error('Error creating users table:', err);
        else console.log('✅ Users table ready');
      });
      
      this.db.run(createAccountsTable, (err) => {
        if (err) console.error('Error creating accounts table:', err);
        else console.log('✅ Accounts table ready');
      });
      
      this.db.run(createBeneficiariesTable, (err) => {
        if (err) console.error('Error creating beneficiaries table:', err);
        else console.log('✅ Beneficiaries table ready');
      });
    });
  }

  // ========== MÉTODOS PARA USUARIOS ==========

  getUser(clientId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE client_id = ?';
      this.db.get(query, [clientId], (err, row) => {
        if (err) reject(err);
        else {
          if (row && row.user_data) {
            try {
              row.profile = JSON.parse(row.user_data);
            } catch (e) {
              row.profile = {};
            }
          }
          resolve(row);
        }
      });
    });
  }

  getUserById(userId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ?';
      this.db.get(query, [userId], (err, row) => {
        if (err) reject(err);
        else {
          if (row && row.user_data) {
            try {
              row.profile = JSON.parse(row.user_data);
            } catch (e) {
              row.profile = {};
            }
          }
          resolve(row);
        }
      });
    });
  }

  createUser(clientId, clientSecret, userInfo = {}) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO users (client_id, client_secret, first_name, last_name, email, phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const { firstName, lastName, email, phone } = userInfo;
      
      this.db.run(query, [clientId, clientSecret, firstName, lastName, email, phone], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  updateUserToken(userId, accessToken, expiresAt) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE users 
        SET access_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(query, [accessToken, expiresAt.toISOString(), userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateUserData(userId, userData) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE users 
        SET user_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(query, [JSON.stringify(userData), userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // ========== MÉTODOS PARA CUENTAS ==========

  saveAccounts(userId, accounts) {
    return new Promise((resolve, reject) => {
      console.log(`💾 Saving ${accounts?.length || 0} accounts for user ${userId}`);
      this.db.serialize(() => {
        // Limpiar cuentas existentes del usuario
        this.db.run('DELETE FROM accounts WHERE user_id = ?', [userId], (err) => {
          if (err) {
            console.error('❌ Error deleting old accounts:', err);
            reject(err);
            return;
          }

          if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
            console.log('ℹ️  No accounts to save, resolving');
            resolve();
            return;
          }

          // Insertar nuevas cuentas
          const insertQuery = `
            INSERT INTO accounts (user_id, account_id, account_number, currency, alias, type, is_default, available, blocked)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          const stmt = this.db.prepare(insertQuery);
          let completed = 0;
          let hasError = false;

          accounts.forEach((account, index) => {
            console.log(`💾 Saving account ${index + 1}/${accounts.length}:`, JSON.stringify(account, null, 2));
            stmt.run([
              userId,
              account.id,
              account.accountNumber || '',
              account.currency,
              account.alias || `Cuenta ${account.currency}`,
              account.type || 1,
              account.isDefault ? 1 : 0,
              (account.balance || 0) / 100, // Convertir centavos a unidades principales
              ((account.pendingIn || 0) + (account.pendingOut || 0)) / 100 // También convertir pendientes
            ], (err) => {
              if (err && !hasError) {
                console.error(`❌ Error saving account ${index + 1}:`, err);
                hasError = true;
                stmt.finalize();
                reject(err);
                return;
              }
              
              completed++;
              console.log(`✅ Account ${index + 1} saved successfully`);
              if (completed === accounts.length && !hasError) {
                stmt.finalize((err) => {
                  if (err) {
                    console.error('❌ Error finalizing accounts save:', err);
                    reject(err);
                  } else {
                    console.log(`✅ All ${accounts.length} accounts saved successfully`);
                    resolve();
                  }
                });
              }
            });
          });
        });
      });
    });
  }

  getAccounts(userId) {
    return new Promise((resolve, reject) => {
      console.log(`📖 Getting accounts for user ${userId} from database`);
      const query = `
        SELECT 
          account_id as id, 
          account_number,
          currency, 
          alias, 
          type, 
          is_default as isDefault,
          available as balance,
          available,
          blocked,
          last_updated
        FROM accounts 
        WHERE user_id = ? 
        ORDER BY is_default DESC, currency
      `;
      this.db.all(query, [userId], (err, rows) => {
        if (err) {
          console.error(`❌ Error getting accounts for user ${userId}:`, err);
          reject(err);
        } else {
          console.log(`📦 Raw database rows (${rows.length} items):`, JSON.stringify(rows, null, 2));
          // Convertir is_default de 0/1 a boolean y formatear campos
          const accounts = rows.map(row => ({
            ...row,
            isDefault: row.isDefault === 1,
            balance: parseFloat(row.balance || 0),
            available: parseFloat(row.available || 0),
            blocked: parseFloat(row.blocked || 0)
          }));
          console.log(`✅ Processed accounts (${accounts.length} items):`, JSON.stringify(accounts, null, 2));
          resolve(accounts);
        }
      });
    });
  }

  // ========== MÉTODOS PARA BENEFICIARIOS ==========

  saveBeneficiaries(userId, beneficiaries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Limpiar beneficiarios existentes del usuario
        this.db.run('DELETE FROM beneficiaries WHERE user_id = ?', [userId], (err) => {
          if (err) {
            reject(err);
            return;
          }

          if (!beneficiaries || !Array.isArray(beneficiaries) || beneficiaries.length === 0) {
            resolve();
            return;
          }

          // Insertar nuevos beneficiarios
          const insertQuery = `
            INSERT INTO beneficiaries (
              user_id, beneficiary_id, account_number, first_name, last_name, 
              alias, email, phone, country_code, country_name, type, state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          const stmt = this.db.prepare(insertQuery);
          let completed = 0;
          let hasError = false;

          beneficiaries.forEach(beneficiary => {
            stmt.run([
              userId,
              beneficiary.id,
              beneficiary.accountNumber || beneficiary.account_number || '',
              beneficiary.firstName || beneficiary.first_name || '',
              beneficiary.lastName || beneficiary.last_name || '',
              beneficiary.alias || `${beneficiary.firstName} ${beneficiary.lastName}`,
              beneficiary.email || '',
              beneficiary.phone || '',
              beneficiary.countryDestination?.code || beneficiary.country_code || '',
              beneficiary.countryDestination?.name || beneficiary.country_name || '',
              beneficiary.type || 0,
              beneficiary.state || 'active'
            ], (err) => {
              if (err && !hasError) {
                hasError = true;
                stmt.finalize();
                reject(err);
                return;
              }
              
              completed++;
              if (completed === beneficiaries.length && !hasError) {
                stmt.finalize((err) => {
                  if (err) reject(err);
                  else resolve();
                });
              }
            });
          });
        });
      });
    });
  }

  getBeneficiaries(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          beneficiary_id as id,
          account_number,
          first_name as firstName,
          last_name as lastName,
          alias,
          email,
          phone,
          country_code,
          country_name,
          type,
          state,
          created_at
        FROM beneficiaries 
        WHERE user_id = ? 
        ORDER BY first_name, last_name
      `;
      this.db.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else {
          // Formatear beneficiarios para el frontend
          const beneficiaries = rows.map(row => ({
            ...row,
            countryDestination: {
              code: row.country_code,
              name: row.country_name
            }
          }));
          resolve(beneficiaries);
        }
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err);
          } else {
            console.log('✅ Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Singleton instance
const database = new Database();

module.exports = database;