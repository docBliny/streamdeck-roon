const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",
  entry: {
    // "plug-in": "./plug-in/js/index.js",
    // "property-inspector": "./property-inspector/js/index.js",
  },
  output: {
    filename: "[name]/js/index.js",
    path: path.resolve(__dirname, "net.bliny.roon.sdPlugin"),
  },
  resolve: {
    alias: {
      sood: false,
      "node-uuid": false,
      fs: false,
      dgram: false,
      util: false,
      os: false,
      net: false,
      tls: false,
    },
  },
  externals: {
    bufferutil: "commonjs bufferutil",
    "utf-8-validate": "commonjs utf-8-validate",
  },
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Required for node-roon-api dependencies to build (i.e. don't build unused Node dependencies)
          keep_fnames: true,
          // keep_classnames: true,
          // mangle: false,
        },
      }),
    ],
  },
  plugins: [
    // new NodePolyfillPlugin(),

    // new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    // new HtmlWebpackPlugin({
    //   template: path.resolve(__dirname, "plug-in", "index.html"),
    //   filename: path.resolve(
    //     __dirname,
    //     "net.bliny.roon.sdPlugin",
    //     "plug-in",
    //     "index.html"
    //   ),
    //   inject: false,
    // }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "property-inspector", "index.html"),
      filename: path.resolve(
        __dirname,
        "net.bliny.roon.sdPlugin",
        "property-inspector",
        "index.html"
      ),
      inject: false,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "plug-in", "images"),
          to: path.resolve(
            __dirname,
            "net.bliny.roon.sdPlugin",
            "plug-in",
            "images"
          ),
        },
        {
          from: path.resolve(__dirname, "plug-in", "layouts"),
          to: path.resolve(
            __dirname,
            "net.bliny.roon.sdPlugin",
            "plug-in",
            "layouts"
          ),
        },
        {
          from: path.resolve(__dirname, "previews"),
          to: path.resolve(__dirname, "net.bliny.roon.sdPlugin", "previews"),
        },
        {
          from: path.resolve(__dirname, "manifest.json"),
          to: path.resolve(
            __dirname,
            "net.bliny.roon.sdPlugin",
            "manifest.json"
          ),
        },
        // {
        //   from: path.resolve(__dirname, "property-inspector", "css"),
        //   to: path.resolve(
        //     __dirname,
        //     "net.bliny.roon.sdPlugin",
        //     "property-inspector",
        //     "css"
        //   ),
        // },
      ],
    }),
  ],
  module: {
    rules: [],
  },
};
