/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@health-app/shared-types'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
