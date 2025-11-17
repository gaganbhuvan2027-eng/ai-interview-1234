const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Disable static generation for specific routes
    skipTrailingSlashRedirect: true,
  },
  // Force dynamic rendering for interview routes
  async headers() {
    return [
      {
        source: '/interview/course/:stream/:subcourse',
        headers: [
          {
            key: 'x-middleware-cache',
            value: 'no-cache',
          },
        ],
      },
    ]
  },
}

export default nextConfig;
