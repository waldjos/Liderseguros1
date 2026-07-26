# Integridad del sprite de logos

- Formato: WebP RIFF
- Dimensiones: 800 × 800 px
- Cuadrícula: 10 × 10
- Celda: 80 × 80 px
- Celdas pobladas: 95
- Tamaño exacto: 45.200 bytes
- SHA-256: `222f30a3dc1fe6f7af27d3cb0e2b60adfe22a0e732040fa45e8b138b9c6d8c42`

El endpoint `/api/channel-logo-sprite.js?meta=1` comprueba estos valores antes de entregar el recurso. Si el archivo se trunca o altera, responde con error y el cliente conserva las iniciales de respaldo en lugar de mostrar un recuadro vacío.
