import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const REPORTES_DIR = `${FileSystem.documentDirectory}reportes/`;

export async function asegurarCarpetaReportes() {
  const info = await FileSystem.getInfoAsync(REPORTES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(REPORTES_DIR, { intermediates: true });
  }
}

export function crearNombreArchivo(prefix: string, titulo: string) {
  const limpio = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  const fecha = new Date().toISOString().slice(0, 10);
  const hora = new Date().toISOString().slice(11, 19).replace(/:/g, "");

  return `${prefix}_${limpio || "reporte"}_${fecha}_${hora}.txt`;
}

export async function guardarReporteTxt(fileName: string, contenido: string) {
  await asegurarCarpetaReportes();
  const fileUri = `${REPORTES_DIR}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, contenido, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
}

export async function leerReporteTxt(fileUri: string) {
  return FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function actualizarReporteTxt(fileUri: string, contenido: string) {
  await FileSystem.writeAsStringAsync(fileUri, contenido, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function eliminarReporteTxt(fileUri: string) {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    await FileSystem.deleteAsync(fileUri);
  }
}

export async function compartirReporteTxt(fileUri: string) {
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error("La funcion de compartir no esta disponible en este dispositivo.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "text/plain",
    dialogTitle: "Compartir reporte RedPatitas",
  });
}
