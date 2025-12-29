import type { NextConfig } from "next";

const allowedDevOrigins = ["localhost", "127.0.0.1", "192.168.0.195", "0.0.0.0"];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export { allowedDevOrigins };
export default nextConfig;
