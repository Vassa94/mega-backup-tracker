const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '../../logs');
        
        // Crear directorio de logs si no existe
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir);
        }

        // Definir rutas de los archivos de log
        this.paths = {
            app: path.join(this.logsDir, 'backups.log'),
            dev: path.join(this.logsDir, 'dev.log'),
            error: path.join(this.logsDir, 'error.log')
        };

        // Limpiar los archivos de log al iniciar
        Object.values(this.paths).forEach(logPath => {
            fs.writeFileSync(logPath, '');
        });

        // Crear streams para cada tipo de log
        this.streams = {
            app: fs.createWriteStream(this.paths.app, { flags: 'a' }),
            dev: fs.createWriteStream(this.paths.dev, { flags: 'a' }),
            error: fs.createWriteStream(this.paths.error, { flags: 'a' })
        };
    }

    formatMessage(level, message, error = null) {
        const date = new Date();
        const timestamp = date.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (error) {
            formattedMessage += `\nStack: ${error.stack}\n`;
        }
        
        return formattedMessage + '\n';
    }

    write(type, message) {
        this.streams[type].write(message);
    }

    // Log de aplicación: solo información relevante de backups
    info(message) {
        const formattedMessage = this.formatMessage('INFO', message);
        this.write('app', formattedMessage);
    }

    // Log de errores: solo errores de ejecución
    error(message, error = null) {
        const formattedMessage = this.formatMessage('ERROR', message, error);
        this.write('error', formattedMessage);
        // También lo registramos en dev para debugging
        this.write('dev', formattedMessage);
    }

    // Log de desarrollo: todo lo técnico
    dev(message, error = null) {
        const formattedMessage = this.formatMessage('DEV', message, error);
        this.write('dev', formattedMessage);
    }

    // Estos métodos ahora son aliases que van al log de desarrollo
    warn(message) {
        this.dev(`[WARN] ${message}`);
    }

    debug(message) {
        this.dev(`[DEBUG] ${message}`);
    }

    close() {
        Object.values(this.streams).forEach(stream => {
            if (stream) {
                stream.end();
            }
        });
    }
}

module.exports = new Logger(); 