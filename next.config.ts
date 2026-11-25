import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Se hacen aquí (y no en la página) porque el layout de /dashboard exige
    // que el usuario sea productor y mandaría a /onboarding antes de redirigir.
    return [
      { source: "/dashboard/tickets", destination: "/mis-entradas", permanent: false },
      { source: "/dashboard/events/:id/scan", destination: "/scan/:id", permanent: false },
    ];
  },
};

export default nextConfig;
