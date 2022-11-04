module.exports = {
  mode: 'development',
  entry: [
    './scripts/cp-editor.js',
    './scripts/disposable-boolean.js',
  ],
  output: {
    filename: 'cp-editor.js',
    path: `${__dirname}/dist`,
  },
};
