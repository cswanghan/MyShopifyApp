/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "src",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  serverConditions: ["workerd", "worker", "browser"],
  serverDependenciesToBundle: [
    /@shopify\/polaris/,
    /@shopify\/polaris-icons/,
  ],
  serverModuleFormat: "esm",
  future: {
    v2_errorBoundary: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
};