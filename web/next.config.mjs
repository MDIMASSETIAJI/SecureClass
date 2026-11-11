/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2'],
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
