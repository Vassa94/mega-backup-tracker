const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class NotificationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendEmail(to, subject, html) {
        try {
            const mailOptions = {
                from: process.env.SMTP_FROM,
                to,
                subject,
                html
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email enviado: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error('Error enviando email:', error);
            throw error;
        }
    }

    async notifyOutdatedBackups(outdatedBackups) {
        if (!outdatedBackups || outdatedBackups.length === 0) {
            logger.info('No hay backups desactualizados para notificar');
            return;
        }

        const subject = '⚠️ Alertas de Backups Desactualizados';
        const html = this.generateEmailContent(outdatedBackups);

        try {
            await this.sendEmail(process.env.NOTIFICATION_EMAIL, subject, html);
            logger.info('Notificación de backups desactualizados enviada');
        } catch (error) {
            logger.error('Error enviando notificación de backups desactualizados:', error);
            throw error;
        }
    }

    generateEmailContent(outdatedBackups) {
        const tableRows = outdatedBackups.map(backup => `
            <tr>
                <td>${backup.cliente}</td>
                <td>${backup.archivo}</td>
                <td>${new Date(backup.fecha_subida).toLocaleString()}</td>
            </tr>
        `).join('');

        return `
            <h2>Backups Desactualizados</h2>
            <p>Los siguientes clientes tienen backups desactualizados:</p>
            <table border="1" cellpadding="5" cellspacing="0">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Archivo</th>
                        <th>Fecha de Subida</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <p>Por favor, contacte a los clientes correspondientes para actualizar sus backups.</p>
        `;
    }
}

module.exports = NotificationService; 