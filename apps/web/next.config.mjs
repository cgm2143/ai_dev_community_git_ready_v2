/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000' }, // 로컬 MinIO
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' }, // Supabase Storage
    ],
  },
};
export default nextConfig;
