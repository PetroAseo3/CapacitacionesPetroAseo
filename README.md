# CapacitacionesPetroAseo

Portal de capacitación de PetroAseo. Acceso del personal por documento, videos, exámenes y resultados en porcentaje. Administración de capacitaciones y fechas.

## Estado
Esta es la versión actual para ChatGPT Sites / Cloudflare Workers y D1. La adaptación para Vercel y Supabase está pendiente. Importar este repositorio a Vercel todavía no entrega un sistema funcional.

## Desarrollo
Node.js >=22.13.0. Ejecutar `npm ci` y `npm run dev`. La configuración privada y el binding D1 deben prepararse en el entorno local.

## Datos y configuración
No se incluyen claves privadas, padrón de personal ni resultados reales. Nunca subir archivos .env, .dev.vars ni exportaciones de la base de datos al repositorio. Para trasladar el historial se requiere una migración separada; preservar EXAM_SECRET mediante un canal privado.

Ver PERSONNEL_UPDATES.md para la incorporación acumulativa del personal.
