# Implementar gráficas de estadísticas

Implementa las siguientes gráficas en RedPatitas siguiendo el plan
especificado. Trabaja sección por sección y confirma cada una antes
de continuar.

## 1. Perfil General (perfil/refugio y dueño)

    Esta sección mostrará métricas personales usando el userId de la sesión activa en AsyncStorage.

    Gráfica de Pastel (Pie Chart):
    Objetivo: Representar proporciones del inventario de animales.

    Métrica: Distribución de las mascotas registradas por ese usuario (Ej: 60% Perros, 30% Gatos, 10% Aves).

    Datos: Filtrar el nodo mascotas/ por idUsuario.

    Gráfica de Líneas (Line Chart):
    Objetivo: Mostrar la evolución de la actividad del usuario en el tiempo.

    Métrica: Cantidad de publicaciones realizadas en la última semana (días), mes (semanas) o año (meses).

    Datos: Filtrar el nodo publicaciones/ por el ID del usuario y agrupar por el timestamp de creación.

## 2. Panel Exclusivo de Refugio (perfil/refugio)

    Esta sección se renderizará condicionalmente solo si el userRole en sesión es "Refugio". Servirá como su panel de administración interno.

    Gráfica de Barras (Bar Chart):
    Objetivo: Comparar categorías directamente.

    Métrica: Comparativa de adopciones (Perros vs. Gatos), agrupadas por mes. Incluirá la distinción de éxito si la adopción fue gestionada por la app o de forma externa.

    Datos: Nodos históricos de bajas/adopciones generados al cambiar el estado de un registro en mascotas/.

    Gráfica de Barras (Bar Chart):
    Objetivo: Comparar categorías directamente.

    Métrica: Comparativa de adopciones. A diferencia de la gráfica anterior, en este caso vas a comparar las adopciones que se tienen en el refugio, es decir, cuantas adopciones se dieron por medio de la app, y cuantas fuera de la app.

    Datos: Nodos históricos de bajas/adopciones generados al cambiar el estado de un registro en mascotas/.

    Pasos previos: Sería agregar una opción al eliminar una mascota, que se pueda eliminar, o adoptar, y ambas irían a una eliminación de esa mascota, pero al presionar adoptar se añada un registro con un control de adopciones por medio de la app, y en la gráfica de dispersión comparar adoptar por medio de la app, con adoptar fuera de la app.

    Cómo implementarlo en Firebase:
    En lugar de hacer un borrado destructivo (remove() de Firebase), puedes lanzar un modal que pregunte el motivo de la baja:

    ❌ Eliminar registro (Borrado físico por error o duplicado).

    📱 Adoptado por medio de la app (Cambia el estado o mueve el registro a un nodo adopciones).

    🏡 Adoptado externamente (Familia que llegó directo al refugio sin usar la app).

    Al guardar estos dos últimos con un timestamp, empiezas a generar datos históricos de muchísimo valor.

    Implica cambios en la insercion de datos en la tabla de usuario.

## 3. Estadísticas Globales (indexPublicaciones/estadisticas)

    Esta pestaña vivirá junto al feed principal y será pública, mostrando el impacto general de la red social.

    Gráfica de Barras (Bar Chart):
    Objetivo: Comparar el volumen del contenido actual de la plataforma.

    Métrica: Cantidad de publicaciones activas divididas por su tipo ('reporte', 'perdidos', 'recreacion').

    Datos: Conteo total del nodo publicaciones/ agrupado por el campo tipo.

    Gráfica de Área (Area Chart):
    Objetivo: Representar tendencias acumuladas y volumen histórico.

    Métrica: Crecimiento de usuarios registrados en el tiempo.

    Datos: Conteo histórico del nodo usuarios/ usando su fecha de registro.

    Gráfica de Dispersión (Scatter Chart):
    Objetivo: Visualizar la relación entre dos variables numéricas para descubrir patrones.

    Métrica: Evidencia visual (Eje X: Cantidad de fotos, leyendo las llaves del Record<string, string>) vs. Tiempo de resolución (Eje Y: Días transcurridos hasta encontrar a la mascota).

    Datos: Historial de publicaciones de tipo 'perdidos' que ya fueron marcadas como resueltas.

## Restricciones técnicas

- Usar la librería `react-native-gifted-charts` (o la que ya esté instalada)
- Filtrar siempre por `userId` de AsyncStorage antes de hacer queries a Firebase
- El panel de Refugio debe renderizarse condicionalmente con `userRole === "Refugio"`
- Los campos `fotos` son `Record<string, string>`, iterar con `Object.entries()`
