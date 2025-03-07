const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const BackupService = require('./services/backupService');
const NotificationService = require('./services/notificationService');
const logger = require('./utils/logger');
const db = require('./database/db');

let mainWindow;
let backupService;
let notificationService;
let abmWindow = null;

async function createWindow() {
    try {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        mainWindow.loadFile(path.join(__dirname, 'index.html'));
        
        // Inicializar servicios
        backupService = new BackupService();
        notificationService = new NotificationService();
        
        // Notificar inicio de conexión
        mainWindow.webContents.send('connection-status', 'connecting');
        
        // Inicializar servicios
        await backupService.initialize();
        
        // Notificar conexión exitosa
        mainWindow.webContents.send('connection-status', 'connected');
        
        logger.info('Aplicación iniciada correctamente');
    } catch (error) {
        logger.error('Error al iniciar la aplicación:', error);
        // Notificar error de conexión
        if (mainWindow) {
            mainWindow.webContents.send('connection-status', 'error');
        }
        app.quit();
    }
}

function createABMWindow() {
    if (abmWindow) {
        abmWindow.focus();
        return;
    }

    abmWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    abmWindow.loadFile('src/windows/clienteABM.html');

    abmWindow.on('closed', () => {
        abmWindow = null;
    });
}

// Manejo de eventos IPC
ipcMain.on('ejecutar-script', async (event, script) => {
    if (script === 'index.js') {
        event.reply('update-output', 'Esperando...');
        setTimeout(() => event.reply('update-output', 'Procesando...'), 1000);

        try {
            logger.info("Iniciando procesamiento de backups...");
            await backupService.processBackups();
            
            // Obtener todos los backups en lugar de solo los desactualizados
            const allBackups = await backupService.getAllBackups();
            
            // Enviamos los datos sin formatear la fecha
            event.reply('mostrar-tabla', allBackups);
            event.reply('update-output', '✅ Tarea finalizada.');
        } catch (error) {
            logger.error('Error en el proceso principal:', error);
            event.reply('update-output', '❌ Error al procesar los backups');
        }
    } else if (script === 'avisos.js') {
        event.reply('update-output', 'Enviando avisos...');
        try {
            const outdatedBackups = await backupService.getOutdatedBackups();
            await notificationService.notifyOutdatedBackups(outdatedBackups);
            event.reply('update-output', '✅ Avisos enviados correctamente.');
        } catch (error) {
            logger.error('Error enviando avisos:', error);
            event.reply('update-output', '❌ Error al enviar los avisos');
        }
    }
});

// Manejadores IPC para operaciones CRUD
ipcMain.handle('get-clientes', async () => {
    try {
        return await db.getAllClientes();
    } catch (error) {
        logger.error('Error obteniendo clientes:', error);
        throw error;
    }
});

// Manejador para obtener todos los backups
ipcMain.handle('get-all-backups', async () => {
    try {
        return await backupService.getAllBackups();
    } catch (error) {
        logger.error('Error obteniendo todos los backups:', error);
        throw error;
    }
});

ipcMain.handle('get-cliente', async (event, id) => {
    try {
        return await db.getCliente(id);
    } catch (error) {
        logger.error('Error obteniendo cliente:', error);
        throw error;
    }
});

ipcMain.handle('create-cliente', async (event, clienteData) => {
    try {
        return await db.createCliente(clienteData);
    } catch (error) {
        logger.error('Error creando cliente:', error);
        throw error;
    }
});

ipcMain.handle('update-cliente', async (event, id, clienteData) => {
    try {
        return await db.updateCliente(id, clienteData);
    } catch (error) {
        logger.error('Error actualizando cliente:', error);
        throw error;
    }
});

ipcMain.handle('delete-cliente', async (event, id) => {
    try {
        return await db.deleteCliente(id);
    } catch (error) {
        logger.error('Error eliminando cliente:', error);
        throw error;
    }
});

// Evento para abrir la ventana ABM desde la ventana principal
ipcMain.on('open-abm', () => {
    createABMWindow();
});

// Eventos de la aplicación
app.whenReady().then(createWindow);

// Manejo del cierre de la aplicación
async function handleAppClose() {
    try {
        logger.info('Cerrando aplicación...');
        if (backupService) {
            await backupService.close();
        }
        await db.close();
        logger.info('Conexiones cerradas correctamente');
        logger.close();
        app.quit();
    } catch (error) {
        logger.error('Error durante el cierre de la aplicación:', error);
        app.exit(1);
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        handleAppClose();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Manejo de errores no capturados
process.on('uncaughtException', async (error) => {
    logger.error('Error no capturado:', error);
    await handleAppClose();
});

process.on('unhandledRejection', async (error) => {
    logger.error('Promesa rechazada no manejada:', error);
    await handleAppClose();
});

// Limpieza al cerrar
process.on('exit', () => {
    logger.info('Proceso terminado');
}); 