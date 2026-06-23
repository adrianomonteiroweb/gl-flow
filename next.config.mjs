/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: ['@workspace/ui'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
