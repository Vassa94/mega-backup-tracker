const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

class Migrations {
    constructor() {
        this.dbPath = path.join(__dirname, '../../backups.db');
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    logger.error("Error conectando a la BD para migraciones:", err.message, err);
                    reject(err);
                } else {
                    logger.dev("Conectado a la base de datos para migraciones");
                    resolve();
                }
            });
        });
    }

    async createMigrationsTable() {
        return new Promise((resolve, reject) => {
            const sql = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            this.db.run(sql, (err) => {
                if (err) {
                    logger.error("Error creando tabla de migraciones:", err.message, err);
                    reject(err);
                } else {
                    logger.dev("Tabla de migraciones creada/verificada");
                    resolve();
                }
            });
        });
    }

    async tableExists(tableName) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                [tableName],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });
    }

    async renameTable(oldName, newName) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `ALTER TABLE ${oldName} RENAME TO ${newName}`,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async beginTransaction() {
        return new Promise((resolve, reject) => {
            this.db.run("BEGIN TRANSACTION", (err) => {
                if (err) {
                    logger.error("Error iniciando transacción:", err.message, err);
                    reject(err);
                } else {
                    logger.dev("Transacción iniciada");
                    resolve();
                }
            });
        });
    }

    async commit() {
        return new Promise((resolve, reject) => {
            this.db.run("COMMIT", (err) => {
                if (err) {
                    logger.error("Error haciendo commit:", err.message, err);
                    reject(err);
                } else {
                    logger.dev("Commit realizado");
                    resolve();
                }
            });
        });
    }

    async rollback() {
        return new Promise((resolve, reject) => {
            this.db.run("ROLLBACK", (err) => {
                if (err) {
                    logger.error("Error haciendo rollback:", err.message, err);
                    reject(err);
                } else {
                    logger.dev("Rollback realizado");
                    resolve();
                }
            });
        });
    }

    async migrate() {
        try {
            await this.connect();
            await this.createMigrationsTable();
            
            const migrations = [
                {
                    name: '001_simplified_schema',
                    up: `
                        -- Respaldar datos existentes
                        CREATE TEMPORARY TABLE temp_clientes AS 
                        SELECT 
                            c.id_cliente,
                            c.id_cliente as nombre,
                            c.email,
                            c.anydesk_id,
                            c.anydesk_pass,
                            c.ignorar,
                            cs.frecuencia_backup,
                            cs.notificar_email,
                            cs.emails_adicionales,
                            NULL as notas
                        FROM clientes c
                        LEFT JOIN client_settings cs ON c.id_cliente = cs.cliente;

                        CREATE TEMPORARY TABLE temp_backups AS 
                        SELECT 
                            cliente,
                            archivo,
                            fecha_subida,
                            CASE 
                                WHEN archivo LIKE '%.zip' THEN 'ZIP'
                                WHEN archivo LIKE '%.rar' THEN 'RAR'
                                WHEN archivo LIKE '%.gz' THEN 'GZIP'
                                WHEN archivo LIKE '%.fbk' THEN 'FIREBIRD'
                                ELSE NULL 
                            END as tipo_backup,
                            actualizado
                        FROM backups;

                        -- Eliminar tablas existentes
                        DROP TABLE IF EXISTS backups;
                        DROP TABLE IF EXISTS backup_history;
                        DROP TABLE IF EXISTS client_settings;
                        DROP TABLE IF EXISTS clientes;

                        -- Crear nueva estructura
                        CREATE TABLE clientes (
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
                        );

                        CREATE TABLE backups (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            cliente TEXT NOT NULL,
                            archivo TEXT NOT NULL,
                            fecha_subida TEXT NOT NULL,
                            tipo_backup TEXT,
                            actualizado INTEGER DEFAULT 0,
                            FOREIGN KEY (cliente) REFERENCES clientes(id_cliente),
                            UNIQUE(cliente)
                        );

                        -- Migrar datos
                        INSERT INTO clientes (
                            id_cliente, nombre, email, anydesk_id, anydesk_pass,
                            ignorar, frecuencia_backup, notificar_email, emails_adicionales
                        ) SELECT * FROM temp_clientes;

                        -- Para backups, solo insertamos el más reciente por cliente
                        INSERT INTO backups (cliente, archivo, fecha_subida, tipo_backup, actualizado)
                        SELECT 
                            b.cliente,
                            b.archivo,
                            b.fecha_subida,
                            b.tipo_backup,
                            b.actualizado
                        FROM temp_backups b
                        INNER JOIN (
                            SELECT cliente, MAX(fecha_subida) as max_fecha
                            FROM temp_backups
                            GROUP BY cliente
                        ) m ON b.cliente = m.cliente AND b.fecha_subida = m.max_fecha;

                        -- Crear índices
                        CREATE INDEX idx_clientes_ignorar ON clientes(ignorar);
                        CREATE INDEX idx_backups_actualizado ON backups(actualizado);

                        -- Limpiar tablas temporales
                        DROP TABLE temp_clientes;
                        DROP TABLE temp_backups;
                    `
                }
            ];

            for (const migration of migrations) {
                try {
                    const executed = await this.checkMigration(migration.name);
                    if (!executed) {
                        logger.dev(`Iniciando migración: ${migration.name}`);
                        await this.beginTransaction();
                        
                        try {
                            await this.executeMigration(migration);
                            await this.recordMigration(migration.name);
                            await this.commit();
                            logger.info(`Migración completada: ${migration.name}`);
                        } catch (error) {
                            logger.error(`Error en migración ${migration.name}:`, error);
                            await this.rollback();
                            throw error;
                        }
                    } else {
                        logger.dev(`Migración ya ejecutada: ${migration.name}`);
                    }
                } catch (error) {
                    logger.error(`Error fatal en migración ${migration.name}:`, error);
                    throw error;
                }
            }

            logger.info("Todas las migraciones completadas exitosamente");
        } catch (error) {
            logger.error("Error en el proceso de migraciones:", error);
            throw error;
        } finally {
            if (this.db) {
                this.db.close(() => {
                    logger.dev("Conexión de migraciones cerrada");
                });
            }
        }
    }

    async checkMigration(name) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT id FROM migrations WHERE name = ?",
                [name],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(!!row);
                    }
                }
            );
        });
    }

    async executeMigration(migration) {
        return new Promise((resolve, reject) => {
            this.db.exec(migration.up, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async recordMigration(name) {
        return new Promise((resolve, reject) => {
            this.db.run(
                "INSERT INTO migrations (name) VALUES (?)",
                [name],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }
}

module.exports = new Migrations(); 