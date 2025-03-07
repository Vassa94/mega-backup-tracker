const db = require('../database/db');
const MegaService = require('./megaService');
const logger = require('../utils/logger');

class BackupService {
    constructor() {
        this.UN_MES_EN_MS = 30 * 24 * 60 * 60 * 1000;
        this.fechaLimite = new Date(Date.now() - this.UN_MES_EN_MS);
        this.megaService = new MegaService();
        this.initialized = false;
    }

    async initialize() {
        try {
            await db.connect();
            await this.megaService.initialize();
            this.initialized = true;
            return true;
        } catch (error) {
            logger.error('Error inicializando el servicio de backups:', error);
            throw error;
        }
    }

    async processBackups() {
        try {
            if (!this.initialized) {
                logger.info("Inicializando servicios...");
                await this.initialize();
            }

            logger.info("Iniciando procesamiento de backups...");
            
            const clientFolders = this.megaService.getClientFolders();
            const ignoredClients = await db.getIgnoredClients();
            const ignoredClientIds = ignoredClients.map(c => c.id_cliente);
            
            for (const clientFolder of clientFolders) {
                if (ignoredClientIds.includes(clientFolder.name)) {
                    logger.info(`Ignorando carpeta: ${clientFolder.name} (marcada en BD)`);
                    continue;
                }

                logger.info(`Analizando cliente: ${clientFolder.name}`);
                const files = this.megaService.getAllFiles(clientFolder);

                if (files.length === 0) {
                    logger.warn(`Cliente sin archivos: ${clientFolder.name}`);
                    await this.saveBackupInfo(clientFolder.name, {
                        archivo: "SIN BACKUPS",
                        fecha_subida: new Date().toISOString(),
                        actualizado: 0
                    });
                    continue;
                }

                files.sort((a, b) => b.timestamp - a.timestamp);
                const mostRecentFile = files[0];
                const uploadDate = this.megaService.getFileDate(mostRecentFile);
                const isValidBackup = this.megaService.isBackupFile(mostRecentFile.name);
                const isUpdated = isValidBackup && uploadDate >= this.fechaLimite;

                logger.info(`Archivo más reciente: ${mostRecentFile.name} | Fecha: ${uploadDate}`);
                
                await this.saveBackupInfo(clientFolder.name, {
                    archivo: mostRecentFile.name,
                    fecha_subida: uploadDate.toISOString(),
                    actualizado: isUpdated ? 1 : 0
                });

                logger.info(isUpdated ? 
                    `✅ Cliente al día: ${clientFolder.name}` : 
                    `⚠️ Cliente sin backups recientes: ${clientFolder.name}`
                );
            }

            logger.info("Procesamiento de backups completado");
            return true;
        } catch (error) {
            logger.error('Error procesando backups:', error);
            throw error;
        }
    }

    async saveBackupInfo(cliente, backupInfo) {
        try {
            // Verificar si el cliente existe, si no, crearlo
            const existingClient = await db.getCliente(cliente);
            if (!existingClient) {
                await db.createCliente({
                    id_cliente: cliente,
                    nombre: cliente
                });
            }

            // Actualizar el backup
            await db.updateBackup({
                cliente,
                ...backupInfo
            });
        } catch (error) {
            logger.error(`Error guardando información de backup para ${cliente}:`, error);
            throw error;
        }
    }

    async getOutdatedBackups() {
        try {
            const backups = await db.getAllBackups();
            return backups.filter(b => !b.actualizado && !b.ignorar);
        } catch (error) {
            logger.error('Error obteniendo backups desactualizados:', error);
            throw error;
        }
    }

    async getAllBackups() {
        try {
            const backups = await db.getAllBackups();
            return backups.filter(b => !b.ignorar);
        } catch (error) {
            logger.error('Error obteniendo todos los backups:', error);
            throw error;
        }
    }

    async close() {
        try {
            await db.close();
        } catch (error) {
            logger.error('Error cerrando conexiones:', error);
        }
    }
}

module.exports = BackupService; 