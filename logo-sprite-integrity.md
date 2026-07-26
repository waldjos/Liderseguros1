# Integridad del sprite de logos

- Formato: WebP RIFF
- Dimensiones: 800 × 800 px
- Cuadrícula: 10 × 10
- Celda: 80 × 80 px
- Celdas pobladas: 95
- Tamaño exacto: 45.200 bytes
- SHA-256: `3cf783556d925cac630a6ef2c2308e01358da6f94c6362662ef8eae1fa0c1d6e`

El endpoint `/api/channel-logo-sprite.js?meta=1` comprueba estos valores antes de entregar el recurso. Si el archivo se trunca o altera, responde con error y el cliente conserva las iniciales de respaldo en lugar de mostrar un recuadro vacío.
