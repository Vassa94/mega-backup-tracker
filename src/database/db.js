const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../../backups.db');
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, async (err) => {
                if (err) {
                    logger.error("Error conectando a la BD:", err.message);
                    reject(err);
                } else {
                    logger.dev("Conectado a la base de datos");
                    try {
                        await this.initializeTables();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }
            });
        });
    }

    async initializeTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS clientes (
                id_cliente TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                email TEXT,
                anydesk_id TEXT,
                anydesk_pass TEXT,
                ignorar INTEGER DEFAULT 0,
                frecuencia_backup INTEGER DEFAULT 30,
                notificar_email BOOLEAN DEFAULT 1,
                emails_adicionales TEXT,
                notas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS backups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente TEXT NOT NULL,
                archivo TEXT NOT NULL,
                fecha_subida TEXT NOT NULL,
                tipo_backup TEXT,
                actualizado INTEGER DEFAULT 0,
                FOREIGN KEY (cliente) REFERENCES clientes(id_cliente),
                UNIQUE(cliente)
            )`,
            `CREATE INDEX IF NOT EXISTS idx_clientes_ignorar ON clientes(ignorar)`,
            `CREATE INDEX IF NOT EXISTS idx_backups_actualizado ON backups(actualizado)`
        ];

        for (const query of queries) {
            await this.run(query);
        }
    }

    // Métodos genéricos de base de datos
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    logger.error("Error en consulta SQL:", err.message);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    logger.error("Error en consulta SQL:", err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    logger.error("Error en consulta SQL:", err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Métodos para Clientes
    async createCliente(clienteData) {
        const sql = `
            INSERT INTO clientes (
                id_cliente, nombre, email, anydesk_id, anydesk_pass,
                ignorar, frecuencia_backup, notificar_email, emails_adicionales, notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            clienteData.id_cliente,
            clienteData.nombre || clienteData.id_cliente,
            clienteData.email,
            clienteData.anydesk_id,
            clienteData.anydesk_pass,
            clienteData.ignorar || 0,
            clienteData.frecuencia_backup || 30,
            clienteData.notificar_email || 1,
            clienteData.emails_adicionales,
            clienteData.notas
        ];
        return this.run(sql, params);
    }

    async updateCliente(id_cliente, clienteData) {
        const sql = `
            UPDATE clientes SET
                nombre = ?,
                email = ?,
                anydesk_id = ?,
                anydesk_pass = ?,
                ignorar = ?,
                frecuencia_backup = ?,
                notificar_email = ?,
                emails_adicionales = ?,
                notas = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_cliente = ?
        `;
        const params = [
            clienteData.nombre,
            clienteData.email,
            clienteData.anydesk_id,
            clienteData.anydesk_pass,
            clienteData.ignorar,
            clienteData.frecuencia_backup,
            clienteData.notificar_email,
            clienteData.emails_adicionales,
            clienteData.notas,
            id_cliente
        ];
        return this.run(sql, params);
    }

    async deleteCliente(id_cliente) {
        // Primero eliminamos los backups asociados
        await this.run('DELETE FROM backups WHERE cliente = ?', [id_cliente]);
        // Luego eliminamos el cliente
        return this.run('DELETE FROM clientes WHERE id_cliente = ?', [id_cliente]);
    }

    async getCliente(id_cliente) {
        return this.get('SELECT * FROM clientes WHERE id_cliente = ?', [id_cliente]);
    }

    async getAllClientes() {
        return this.all('SELECT * FROM clientes ORDER BY nombre');
    }

    // Métodos para Backups
    async updateBackup(clienteData) {
        const tipo_backup = this.detectarTipoBackup(clienteData.archivo);
        const sql = `
            INSERT OR REPLACE INTO backups (
                cliente, archivo, fecha_subida, tipo_backup, actualizado
            ) VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            clienteData.cliente,
            clienteData.archivo,
            clienteData.fecha_subida,
            tipo_backup,
            clienteData.actualizado || 0
        ];
        return this.run(sql, params);
    }

    async getBackup(cliente) {
        return this.get('SELECT * FROM backups WHERE cliente = ?', [cliente]);
    }

    async getAllBackups() {
        return this.all(`
            SELECT 
                b.*,
                c.nombre,
                c.ignorar
            FROM backups b
            JOIN clientes c ON b.cliente = c.id_cliente
            ORDER BY b.fecha_subida DESC
        `);
    }

    detectarTipoBackup(archivo) {
        if (archivo.endsWith('.zip')) return 'ZIP';
        if (archivo.endsWith('.rar')) return 'RAR';
        if (archivo.endsWith('.gz')) return 'GZIP';
        if (archivo.endsWith('.fbk')) return 'FIREBIRD';
        return null;
    }

    async getIgnoredClients() {
        return this.all('SELECT id_cliente FROM clientes WHERE ignorar = 1');
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        logger.error("Error cerrando la BD:", err.message);
                        reject(err);
                    } else {
                        logger.dev("Conexión a la BD cerrada");
                        this.db = null;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new Database(); 