/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: false,
  },
  async headers() {
    return [
      {
        source: "/api/parking",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60, stale-while-revalidate=3600" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
