const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseConfig {
    constructor() {
        this.dbPath = path.join(__dirname, '../../backups.db');
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error("❌ Error abriendo la BD:", err.message);
                    reject(err);
                } else {
                    console.log("✅ Base de datos SQLite conectada");
                    resolve(this.db);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error("❌ Error cerrando la BD:", err.message);
                } else {
                    console.log("✅ Base de datos cerrada correctamente");
                }
            });
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`CREATE TABLE IF NOT EXISTS clientes (
                    id_cliente TEXT PRIMARY KEY,
                    nombre TEXT,
                    contacto TEXT,
                    email TEXT,
                    anydesk_id TEXT,
                    anydesk_pass TEXT,
                    ignorar INTEGER DEFAULT 0
                )`);

                this.db.run(`CREATE TABLE IF NOT EXISTS backups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente TEXT,
                    archivo TEXT,
                    fecha_subida TEXT,
                    actualizado INTEGER DEFAULT 0
                )`, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log("✅ Tablas creadas/verificadas correctamente.");
                        resolve();
                    }
                });
            });
        });
    }
}

module.exports = new DatabaseConfig(); 