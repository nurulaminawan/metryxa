const pages = process.env.GITHUB_PAGES === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(pages ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {}),
  serverExternalPackages: ["cheerio", "redis"],
};

export default nextConfig;
