require("dotenv").config();

module.exports = {
  packagerConfig: {
    osxSign: {
      identity: process.env.identity,
      "hardened-runtime": true,
      entitlements: "entitlements.plist",
      ignore: "web-print-service-macos-arm64",
    },
    osxNotarize: {
      tool: "notarytool",
      appleId: process.env.appleId,
      appleIdPassword: process.env.appleIdPassword,
      teamId: process.env.teamId,
    },
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "web_print_service",
      },
    },
    {
      name: "@electron-forge/maker-zip",
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
    },
  ],
  plugins: [
    [
      "@electron-forge/plugin-webpack",
      {
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/index.html",
              js: "./src/renderer.js",
              name: "main_window",
            },
          ],
        },
        devContentSecurityPolicy: "default-src * 'unsafe-eval' 'unsafe-inline'",
      },
    ],
  ],
};
