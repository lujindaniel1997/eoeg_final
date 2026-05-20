const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Extend resolve correctly
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fallback: {
          stream: require.resolve('stream-browserify'),
          buffer: require.resolve('buffer'),
          assert: require.resolve('assert'),
          process: require.resolve('process/browser.js'),
        },
      };

      // Add source-map-loader rule correctly under webpackConfig.module.rules
      webpackConfig.module.rules.push({
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: [/node_modules\/@plotly\/mapbox-gl/],
      });

      // Add plugins
      webpackConfig.plugins = [
        ...(webpackConfig.plugins || []),
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser.js',
        }),
      ];

      return webpackConfig;
    },
  },
};
