import type { NextConfig } from "next";

// basePath opcional: sirve la app bajo un subpath (ej. /handicapp) cuando el
// despliegue comparte dominio/IP con otro proyecto. En dev/producción normal
// queda vacío (raíz).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  basePath,

  async headers() {
    return [
      {
        // Apple exige que el apple-app-site-association se sirva como JSON.
        // Al no tener extensión, Next lo entregaría como octet-stream y iOS lo
        // descarta en silencio: los links seguirían abriendo el navegador.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;
