export function calcularEdadDesdeFecha(fechaNacimiento?: string | null): number {
  if (!fechaNacimiento) return 0;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return 0;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesDiff = hoy.getMonth() - nacimiento.getMonth();
  const diaDiff = hoy.getDate() - nacimiento.getDate();

  if (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0)) edad--;
  return Math.max(edad, 0);
}

export function formatearEdad(fechaNacimiento?: string | null): string {
  const edad = calcularEdadDesdeFecha(fechaNacimiento);
  return `${edad} ${edad === 1 ? "año" : "años"}`;
}
