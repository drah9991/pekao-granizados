# Regla de Notificación

Tienes permiso para usar `code_execution` para ejecutar comandos `curl`.

Cuando termines un objetivo principal que te haya asignado, o si te encuentras bloqueado, debes notificarme enviando una petición POST a la siguiente URL de Make.com:

```
https://hook.eu1.make.com/tu_codigo_aqui
```

Ejemplo de ejecución que debes usar:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"✅ Tarea lista","body":"He terminado el refactor"}' \
  https://hook.eu1.make.com/tu_codigo_aqui
```
