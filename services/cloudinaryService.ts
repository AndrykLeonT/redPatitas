const CLOUD_NAME = "dwlbornu8";
const UPLOAD_PRESET = "uploadRedPatitas";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Sube una imagen a Cloudinary y devuelve la URL HTTPS.
 * Solo URIs locales (file://, content://, ph://) deben pasar por aquí —
 * las URLs https/http ya son remotas.
 */
export async function subirImagen(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", { uri, type: "image/jpeg", name: "photo.jpg" } as any);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error(data.error?.message ?? "Error al subir imagen a Cloudinary");
  }
  return data.secure_url;
}

// Identifica archivos del dispositivo que aun no se han subido a Cloudinary.
export function esUriLocal(uri: string): boolean {
  return /^(file|content|ph|asset):/i.test(uri);
}

/**
 * Itera un Record<key, uri>, sube las URIs locales a Cloudinary y devuelve
 * el record actualizado con URLs HTTPS. Las URLs ya remotas se mantienen.
 */
export async function subirFotosLocales(
  fotos: Record<string, string> | undefined,
): Promise<Record<string, string>> {
  if (!fotos) return {};
  const resultado: Record<string, string> = {};
  for (const [key, uri] of Object.entries(fotos)) {
    if (esUriLocal(uri)) {
      resultado[key] = await subirImagen(uri);
    } else {
      resultado[key] = uri;
    }
  }
  return resultado;
}
