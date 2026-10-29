# CapacitacionesPetroAseo

Adaptación del portal para Next.js en Vercel y PostgreSQL/Auth en Supabase.

## Configuración privada de Vercel
SUPABASE_URL: URL del proyecto.
SUPABASE_PUBLISHABLE_KEY: clave pública del proyecto.
SUPABASE_SECRET_KEY: clave privada, solo del servidor; nunca NEXT_PUBLIC_.
EXAM_SECRET: secreto privado del nuevo alojamiento. No cambiarlo una vez migrado el padrón. La migración inicial remapeó las identidades por la correspondencia exacta y única entre documentos y personas; conservó los ID de los exámenes y sus notas, fechas y respuestas.
ADMIN_EMAILS: asistente@petro.pe

SUPABASE_JWKS_URL no es necesario: el servidor valida la sesión mediante Supabase Auth /auth/v1/user.

## Preparación
1. Ejecutar supabase/migrations/202610290001_portal.sql en SQL Editor. Solo una vez; toda la operación es transaccional. Usa tablas petro_* para evitar colisiones con otras aplicaciones. RLS está habilitado y las claves públicas no pueden leer el personal ni las respuestas correctas.
2. Crear o invitar la cuenta administradora desde Supabase Auth y configurar su contraseña allí, nunca en este repositorio. Cuenta autorizada por ADMIN_EMAILS. La cuenta inicial ya fue creada durante la migración.
3. Ejecutar también supabase/migrations/202610290002_personal.sql para el panel de personal y los reinicios. La migración inicial de 219 personas y 5 exámenes ya fue aplicada en el proyecto seleccionado; no repetirla ni importar datos ficticios sobre personas reales.
4. Importar el repositorio en Vercel y configurar las variables privadas antes de publicar.

## Desarrollo
Node >=22.13.0. npm ci, npm run dev. Compilación: npm run build. Crear un .env.local ignorado solo para desarrollo; no subir secretos.

## Acceso administrativo
/admin usa correo y contraseña de Supabase Auth; no usa ChatGPT. Cookie HttpOnly, SameSite=Strict y Secure en producción; la sesión se vuelve a validar en el servidor y debe renovarse iniciando sesión al vencer. No se admite registro público de administradores.

## Conservación
El sitio original continúa independiente. No cambiar su configuración ni borrar datos durante el traslado. Este repositorio no contiene padrón real, resultados reales ni secretos. Ver PERSONNEL_UPDATES.md para importaciones acumulativas. El panel Personal permite buscar y agregar personas y reiniciar una o todas sus capacitaciones, conservando el historial. Los límites de intentos y las exclusiones no están implementados.

Las carpetas scripts, worker, examples y drizzle conservan referencias del alojamiento anterior; Vercel usa Next.js y supabase/migrations. No ejecutar las migraciones SQLite de drizzle en Supabase.
