const path = require('path')

module.exports = {
  mode: process.env.NODE_ENV,
  entry: {
    index: ['./src/cli/index.ts'],
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
  externals: {
    'pino-pretty': 'pino-pretty',
    './mdcraft.config.js': 'mdcraft.config.js',
  },
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
