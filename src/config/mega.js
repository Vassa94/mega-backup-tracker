require('dotenv').config();
const { Storage } = require('megajs');
const logger = require('../utils/logger');

class MegaConfig {
    constructor() {
        this.validateEnvVars();
        this.email = process.env.MEGA_EMAIL;
        this.password = process.env.MEGA_PASSWORD;
        this.storage = null;
    }

    validateEnvVars() {
        const requiredVars = ['MEGA_EMAIL', 'MEGA_PASSWORD'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Variables de entorno faltantes: ${missingVars.join(', ')}`);
        }
    }

    async connect() {
        try {
            if (this.storage && this.storage.ready) {
                logger.dev("Reutilizando conexión existente a MEGA");
                return this.storage;
            }

            logger.info("Conectando a MEGA...");
            this.storage = new Storage({ 
                email: this.email, 
                password: this.password 
            });

            await this.storage.ready;
            await this.storage.reload(); // Aseguramos que los datos estén actualizados
            logger.info("✅ Conectado a MEGA");
            return this.storage;
        } catch (error) {
            logger.error("❌ Error conectando a MEGA:", error);
            throw error;
        }
    }

    async getBackupsFolder() {
        if (!this.storage || !this.storage.ready) {
            throw new Error("No hay conexión activa con MEGA");
        }

        await this.storage.reload(); // Recargar para asegurar datos actualizados
        
        if (!this.storage.root || !this.storage.root.children) {
            throw new Error("No se pudo acceder al sistema de archivos de MEGA");
        }

        const backupsFolder = this.storage.root.children.find(
            folder => folder.name === "Backups"
        );

        if (!backupsFolder) {
            throw new Error("No se encontró la carpeta de backups en MEGA");
        }

        return backupsFolder;
    }
}

module.exports = new MegaConfig(); 