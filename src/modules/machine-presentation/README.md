# Presentación de máquinas

Configuración visual independiente del modelo técnico. Se vincula mediante `machineRef` y solo acepta referencias existentes en el mock y registradas en la jerarquía de acceso. Las lecturas filtran permisos del lado servidor. Las escrituras refrescan al actor y verifican `machines.view` más el permiso de edición correspondiente dentro de una transacción Serializable; cada cambio se audita en esa misma transacción.

`getMachinePresentations(actor, machineRefs)` devuelve exclusivamente referencias autorizadas, con nombre/descripcion opcionales y galería ordenada. Una referencia autorizada sin configuración tiene valores nulos y galería vacía. `MachineImage` utiliza la ilustración original si no hay imagen o si la carga falla. No reemplaza ni modifica sensores, telemetría, predicciones o mantenimiento.

## Object storage opcional

Configurar las seis variables juntas:

| Variable | Uso |
| --- | --- |
| `OBJECT_STORAGE_ENDPOINT` | Endpoint HTTPS S3 compatible; para R2, endpoint de la cuenta |
| `OBJECT_STORAGE_REGION` | Región del proveedor; `auto` para R2 |
| `OBJECT_STORAGE_BUCKET` | Bucket existente |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Credencial con escritura limitada al bucket |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Secreto correspondiente, solo servidor |
| `OBJECT_STORAGE_PUBLIC_URL` | Base HTTPS pública del bucket o dominio de imágenes, sin query ni fragmento |

El módulo no crea buckets ni claves y no habilita exposición pública. El operador debe preparar el bucket/dominio según la política de acceso de su despliegue. La configuración parcial o inválida deshabilita el formulario de carga e informa el problema. Sin configuración sigue funcionando la opción URL externa.

Los archivos se validan por firma JPEG/PNG/WEBP y se limitan a 5 MiB; se guardan con UUID y MIME inferido del contenido. No se almacenan binarios en PostgreSQL. La aplicación debe permitir un cuerpo de Server Action de 6 MiB para el archivo más el multipart. URLs externas nunca se descargan desde el servidor y las imágenes omiten referrer; el navegador las carga directamente sin el optimizador de Next.js.

Eliminar una imagen de la galería no borra el objeto remoto, que puede compartirse. Una carga exitosa seguida de un fallo de la transacción puede dejar un objeto sin referencia; la limpieza de objetos huérfanos debe hacerse por una política independiente, contrastando referencias actuales y respetando un plazo de retención. No se implementa borrado remoto automático.

Verificación focalizada: `node --test src/modules/machine-presentation/validation.test.mjs`.
