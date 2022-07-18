const CopyPlugin = require("copy-webpack-plugin");
const PermissionsOutputPlugin = require("webpack-permissions-plugin");
const path = require("path");
module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/main.js",
  // Put your normal webpack config below here
  module: {
    rules: require("./webpack.rules"),
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "static", to: "static" }],
    }),
    new PermissionsOutputPlugin({
      buildFiles: [
        path.resolve(
          ".webpack",
          "main",
          "static",
          "web-print-service-macos-arm64"
        ),
      ],
      // dist/app.js is redundant, it already got 755 by being included in the buildFolder above
    }),
  ],
};
