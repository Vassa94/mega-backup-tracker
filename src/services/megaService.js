const megaConfig = require('../config/mega');
const logger = require('../utils/logger');

class MegaService {
    constructor() {
        this.storage = null;
        this.backupsFolder = null;
    }

    async initialize() {
        try {
            this.storage = await megaConfig.connect();
            this.backupsFolder = await megaConfig.getBackupsFolder();
            return true;
        } catch (error) {
            logger.error('Error inicializando MEGA:', error);
            throw error;
        }
    }

    getAllFiles(folder) {
        let files = [];

        const exploreFolder = (currentFolder, currentPath) => {
            logger.info(`Explorando carpeta: ${currentPath}`);

            if (!currentFolder.children || currentFolder.children.length === 0) {
                logger.warn(`La carpeta ${currentPath} está vacía o no tiene archivos visibles.`);
                return;
            }

            for (const item of currentFolder.children) {
                if (item.children) {
                    logger.info(`Explorando subcarpeta: ${currentPath}/${item.name}`);
                    exploreFolder(item, `${currentPath}/${item.name}`);
                } else {
                    const fileDate = new Date(item.timestamp * 1000);
                    logger.info(`Archivo encontrado: ${currentPath}/${item.name} | Fecha: ${fileDate}`);
                    files.push(item);
                }
            }
        };

        exploreFolder(folder, folder.name);

        if (files.length === 0) {
            logger.warn(`No se encontraron archivos en ${folder.name}`);
        } else {
            logger.info(`Se encontraron ${files.length} archivos en ${folder.name}`);
        }

        return files;
    }

    getClientFolders() {
        if (!this.backupsFolder) {
            throw new Error('No hay conexión activa con MEGA');
        }
        return this.backupsFolder.children || [];
    }

    isBackupFile(fileName) {
        const validExtensions = ['.zip', '.rar', '.gz', '.fbk'];
        const lowerFileName = fileName.toLowerCase();
        
        return validExtensions.some(ext => lowerFileName.endsWith(ext)) ||
               /\.\d+$/.test(fileName);
    }

    getFileDate(file) {
        return new Date(file.timestamp * 1000);
    }
}

module.exports = MegaService; 