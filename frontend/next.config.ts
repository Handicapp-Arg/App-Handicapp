import type { NextConfig } from "next";

// basePath opcional: sirve la app bajo un subpath (ej. /handicapp) cuando el
// despliegue comparte dominio/IP con otro proyecto. En dev/producción normal
// queda vacío (raíz).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  basePath,
};

export default nextConfig;
