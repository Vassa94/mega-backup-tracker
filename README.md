# Mega Backup Tracker

Sistema de monitoreo y gestión de backups almacenados en MEGA.

## Características

- Monitoreo automático de backups en MEGA
- Interfaz gráfica moderna y responsiva
- Gestión de clientes (ABM)
- Notificaciones por email para backups desactualizados
- Exportación de datos a CSV
- Filtrado y búsqueda en tiempo real
- Ordenamiento de tabla por columnas
- Indicador de estado de conexión
- Sistema de logs detallado con hora local
- Filtrado por estado de backup (Al día, Desactualizados, Sin backups)

## Criterios de Revisión

La aplicación analiza los backups según los siguientes criterios:

1. **Estructura en MEGA**:
   - Debe existir una carpeta llamada "Backups" en la raíz de MEGA
   - Dentro de "Backups", cada cliente debe tener su propia carpeta
   - El nombre de la carpeta del cliente debe coincidir con su ID en la base de datos

2. **Frecuencia de Revisión**: 
   - Se considera un backup como "desactualizado" si tiene más de 30 días
   - La fecha límite se calcula automáticamente al iniciar el análisis

3. **Tipos de Backup Válidos**:
   - ZIP
   - RAR
   - GZIP
   - Firebird (FBK)

4. **Estados Posibles**:
   - ✅ Al día: Backup válido con menos de 30 días
   - ⚠️ Desactualizado: Backup válido con más de 30 días
   - ❌ Sin backups: No se encontraron archivos de backup

5. **Clientes Ignorados**:
   - Los clientes marcados como "ignorar" en la base de datos no se analizan
   - No aparecen en la tabla de backups
   - No reciben notificaciones

## Requisitos

- Node.js 14 o superior
- NPM 6 o superior
- Cuenta de MEGA con espacio suficiente para backups
- Servidor SMTP para envío de notificaciones (opcional)

## Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd mega-backup-tracker
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:
```env
MEGA_EMAIL=tu_email@ejemplo.com
MEGA_PASSWORD=tu_contraseña
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_USER=tu_usuario_smtp
SMTP_PASS=tu_contraseña_smtp
SMTP_SECURE=false
```

4. Preparar estructura en MEGA:
   - Crear una carpeta llamada "Backups" en la raíz de MEGA
   - Dentro de "Backups", crear una carpeta por cada cliente
   - El nombre de cada carpeta debe ser el ID del cliente

## Estructura del Proyecto

```
mega-backup-tracker/
├── src/
│   ├── config/           # Configuraciones (MEGA, DB)
│   ├── database/         # Gestión de base de datos
│   ├── services/         # Servicios principales
│   ├── utils/           # Utilidades y helpers
│   ├── windows/         # Ventanas de la aplicación
│   ├── styles/          # Estilos CSS
│   ├── index.html       # Interfaz principal
│   └── main.js          # Punto de entrada
├── logs/                # Archivos de log
├── .env                 # Variables de entorno
├── .gitignore          # Archivos ignorados por git
├── package.json        # Dependencias y scripts
└── README.md           # Documentación
```

## Uso

1. Iniciar la aplicación:
```bash
npm start
```

2. Funcionalidades principales:
   - **Analizar Backups**: Verifica el estado de los backups en MEGA
   - **Enviar Avisos**: Notifica a los clientes con backups desactualizados
   - **Gestionar Clientes**: ABM de clientes y sus configuraciones
   - **Exportar**: Exporta los datos a CSV
   - **Filtrar**: Por estado o texto de búsqueda
   - **Ordenar**: Click en los encabezados de columna

## Base de Datos

La aplicación utiliza SQLite con las siguientes tablas:

### Tabla: clientes
- `id_cliente`: Identificador único del cliente
- `nombre`: Nombre del cliente
- `email`: Email de contacto
- `anydesk_id`: ID de AnyDesk
- `anydesk_pass`: Contraseña de AnyDesk
- `ignorar`: Flag para ignorar cliente
- `frecuencia_backup`: Frecuencia de backup en días
- `notificar_email`: Flag para notificaciones
- `emails_adicionales`: Emails adicionales para notificaciones
- `notas`: Notas adicionales

### Tabla: backups
- `id`: Identificador único del backup
- `cliente`: ID del cliente
- `archivo`: Nombre del archivo de backup
- `fecha_subida`: Fecha del último backup
- `tipo_backup`: Tipo de backup (ZIP, RAR, etc.)
- `actualizado`: Estado de actualización

## Logs

La aplicación mantiene tres tipos de logs:
- `backups.log`: Información general
- `dev.log`: Información técnica
- `error.log`: Errores y excepciones

## Contribuir

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 