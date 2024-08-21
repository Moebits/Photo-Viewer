const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const TerserJSPlugin = require("terser-webpack-plugin")
const path = require("path")
const webpack = require("webpack")
const exclude = [/node_modules/, /dist/]

module.exports = [
  {
    target: "electron-renderer",
    entry: "./renderer",
    mode: "production",
    node: {__dirname: false},
    externals: {"react-native-fs": "reactNativeFs", "sharp": "commonjs sharp"},
    output: {filename: "renderer.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({template: path.resolve(__dirname, "./index.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "styles.css", chunkFilename: "styles.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
    devServer: {contentBase: path.join(__dirname, "./dist"), port: 9000, compress: true, hot: true, historyApiFallback: true, publicPath: "/"},
  },
  {
    target: "electron-renderer",
    entry: "./components/BrightnessDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs", "sharp": "commonjs sharp"},
    output: {filename: "brightnessdialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "brightnessdialog.html", template: path.resolve(__dirname, "structures/brightnessdialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "brightnessdialog.css", chunkFilename: "brightnessdialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/HSLDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "hsldialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "hsldialog.html", template: path.resolve(__dirname, "structures/hsldialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "hsldialog.css", chunkFilename: "hsldialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/TintDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "tintdialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "tintdialog.html", template: path.resolve(__dirname, "structures/tintdialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "tintdialog.css", chunkFilename: "tintdialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/BlurDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "blurdialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "blurdialog.html", template: path.resolve(__dirname, "structures/blurdialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "blurdialog.css", chunkFilename: "blurdialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/PixelateDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "pixelatedialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "pixelatedialog.html", template: path.resolve(__dirname, "structures/pixelatedialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "pixelatedialog.css", chunkFilename: "pixelatedialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/BinarizeDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "binarizedialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "binarizedialog.html", template: path.resolve(__dirname, "structures/binarizedialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "binarizedialog.css", chunkFilename: "binarizedialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/ResizeDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "resizedialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "resizedialog.html", template: path.resolve(__dirname, "structures/resizedialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "resizedialog.css", chunkFilename: "resizedialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/RotateDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "rotatedialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "rotatedialog.html", template: path.resolve(__dirname, "structures/rotatedialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "rotatedialog.css", chunkFilename: "rotatedialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/CropDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "cropdialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "cropdialog.html", template: path.resolve(__dirname, "structures/cropdialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "cropdialog.css", chunkFilename: "cropdialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-renderer",
    entry: "./components/GifDialog",
    mode: "production",
    node: {__dirname: false},
    stats: {children: true},
    externals: {"react-native-fs": "reactNativeFs"},
    output: {filename: "gifdialog.js", path: path.resolve(__dirname, "./dist"), publicPath: "./"},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], mainFields: ["main", "module", "browser"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
        {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
        {test: /\.html$/, exclude, use: [{loader: "html-loader", options: {minimize: false}}]},
        {test: /\.less$/, exclude, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader", "less-loader"]},
        {test: /\.css$/, use: [{loader: MiniCssExtractPlugin.loader}, "css-loader"]},
        {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]}
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({filename: "gifdialog.html", template: path.resolve(__dirname, "structures/gifdialog.html"), minify: true}),
      new MiniCssExtractPlugin({filename: "gifdialog.css", chunkFilename: "gifdialog.css"}),
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ],
  },
  {
    target: "electron-main",
    entry: "./main",
    mode: "production",
    node: {__dirname: false},
    externals: {"sharp": "commonjs sharp"},
    output: {filename: "main.js", path: path.resolve(__dirname, "./dist")},
    resolve: {extensions: [".js", ".jsx", ".ts", ".tsx"], alias: {"react-dom$": "react-dom/profiling", "scheduler/tracing": "scheduler/tracing-profiling"}},
    optimization: {minimize: true, minimizer: [new TerserJSPlugin({extractComments: false})], moduleIds: "named"},
    module: {
      rules: [
          {test: /\.(jpe?g|png|gif|svg|mp3|wav|mp4|mkv|mov|avi|yml|txt)$/, exclude, use: [{loader: "file-loader", options: {name: "[path][name].[ext]"}}]},
          {test: /\.(tsx?|jsx?)$/, exclude, use: [{loader: "ts-loader", options: {transpileOnly: true}}]},
          {test: /\.node$/, loader: "node-loader"}
      ]
    },
    plugins: [
      new webpack.DefinePlugin({"process.env.FLUENTFFMPEG_COV": false})
    ]
  }
]