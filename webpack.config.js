const glob = require('glob');

module.exports = {
  mode: 'production',
  entry: [
    './scripts/cp-editor.js',
    './scripts/disposable-boolean.js',
  ],
  output: {
    filename: 'cp-editor.js',
    path: `${__dirname}/dist`,
  },
};
