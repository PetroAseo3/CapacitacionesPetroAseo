# Actualizaciones acumulativas del personal

- Cada archivo recibido se incorpora por tipo y número de documento. Conservar ceros iniciales.
- Añadir documentos nuevos, actualizar nombres coincidentes y conservar a quienes no estén en el archivo. No borrar ni reiniciar notas, intentos, fechas, versiones de capacitación o consentimientos.
- No cambiar EXAM_SECRET: se usa en el identificador estable que vincula el documento con todo su historial.
- people guarda solo el identificador calculado en el servidor, tipo y nombre. En Supabase, petro_people contiene el padrón completo migrado; no requiere ROSTER_* en el alojamiento nuevo.
- Usar POST /api/admin/roster. Primero dryRun=true; luego la misma relación con un importId estable y dryRun=false. La operación valida el archivo completo y aplica los cambios en una transacción. Reenviar el mismo importId y contenido es idempotente.
- El acceso requiere la sesión administrativa o una autorización temporal ROSTER_IMPORT_ACCESS configurada como secreto con token y expiresAt. Mantener estos valores fuera de archivos y del código. El secreto EXAM_SECRET nunca debe regenerarse al importar personas.
- Verificar attemptsPreserved y comparar los registros históricos antes y después. No crear exámenes de prueba con personal real.
- Rechazar documentos inválidos o duplicados con nombres contradictorios. Pedir aclaración solo para esas filas si aparecen.
