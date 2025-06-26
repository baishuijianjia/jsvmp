const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'jsvmp.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'JSVMP',
      type: 'umd'
    },
    globalObject: 'this',
    clean: true
  },
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
  // 移除外部依赖，让webpack将babel包打包进来以支持浏览器环境
  // externals: {
  //   '@babel/parser': '@babel/parser',
  //   '@babel/types': '@babel/types'
  // },
  // 暂时去掉babel-loader，直接使用原生JS
  // module: {
  //   rules: [
  //     {
  //       test: /\.js$/,
  //       exclude: /node_modules/,
  //       use: {
  //         loader: 'babel-loader',
  //         options: {
  //           presets: ['@babel/preset-env'],
  //           targets: {
  //             node: '14'
  //           }
  //         }
  //       }
  //     }
  //   ]
  // },
  resolve: {
    extensions: ['.js', '.json']
  },
  optimization: {
    minimize: process.env.NODE_ENV !== 'development'
  }
};