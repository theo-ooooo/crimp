/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.crimp.app' },
      { protocol: 'https', hostname: '*-cdn.crimp.local' },
    ],
  },
};

export default nextConfig;
