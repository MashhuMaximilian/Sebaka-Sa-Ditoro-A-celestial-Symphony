
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
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      // Increase timeout for long-running operations like event searching
      executionTimeout: 120, 
    },
  },
  // This is required to allow the Next.js dev server to accept requests from the
  // Firebase Studio UI.
  devServer: {
    allowedDevOrigins: [
        '6000-firebase-studio-1752436261754.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev',
        '9000-firebase-studio-1752436261754.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev'
    ]
  }
};

export default nextConfig;
