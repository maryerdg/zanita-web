# Comandos de Respaldo y Migración Remota (Zanita)

> **ATENCIÓN**: NO ejecutar ninguno de estos comandos sin previa revisión de Maryer.

## 1. Iniciar Sesión en Supabase CLI
```bash
npx supabase login
```
*(Se abrirá el navegador para generar y copiar el token de acceso).*

## 2. Vincular el Proyecto Remoto Existente
```bash
npx supabase link --project-ref <PROJECT_REF>
```

## 3. Respaldar Datos Existentes (OBLIGATORIO Y FUERA DE GIT)
Los respaldos pueden contener datos sensibles (ej: emails en leads). No deben ser versionados.
```bash
mkdir -p supabase/backups
echo "*" > supabase/backups/.gitignore
npx supabase db dump --linked -f supabase/backups/pre_zanita_schema.sql
npx supabase db dump --linked --data-only -f supabase/backups/pre_zanita_data.sql
```

## 4. Inspeccionar Diferencias
Comparar los cambios locales contra la base de datos remota sin aplicar nada:
```bash
npx supabase db diff --linked
```
*(Asegurar que no aparezcan referencias destructivas a 'leads' ni 'lead_events').*

## 5. Aplicar Migración Remota
Una vez revisado el diff:
```bash
npx supabase db push
```
