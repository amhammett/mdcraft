const path = require('path')

module.exports = {
  mode: process.env.NODE_ENV,
  entry: {
    index: ['./src/index.ts'],
    craft: ['./src/craft.ts'],
    server: ['./src/server.ts'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        // exclude: /node_modules/,
      },
    ],
  },
  externals: ['pino-pretty'],
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      handlebars: path.resolve(__dirname, 'node_modules/handlebars/dist/handlebars.min.js'),
    }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  target: 'node',
}
