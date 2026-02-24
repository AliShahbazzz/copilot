const path = require('path');

module.exports = {
  content: [
    path.resolve(__dirname, './src/**/*.{ts,tsx}'),
    path.resolve(
      __dirname,
      './node_modules/@assistant-ui/react-ui/dist/**/*.{js,mjs}'
    ),
  ],
  plugins: [
    require('tailwindcss-animate'),
    require('@assistant-ui/react-ui/tailwindcss')({ components: ['thread'] }),
  ],
};
