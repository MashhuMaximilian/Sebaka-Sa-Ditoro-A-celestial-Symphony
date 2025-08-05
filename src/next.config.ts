
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // This is required to allow the Next.js dev server to accept requests from the
  // Firebase Studio UI.
  allowedDevOrigins: [
    '6000-firebase-studio-1752436261754.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev',
  ],
};

export default nextConfig;
