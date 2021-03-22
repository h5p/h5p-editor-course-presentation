const glob = require('glob');

module.exports = {
  mode: 'production',
  entry: [
    './scripts/cp-editor.js',
    './disposable-boolean.js',
  ],
  output: {
    filename: '[name].js',
    path: `${__dirname}/dist`,
  },
};
