# Teip loader

Teip loader is an opinionated webpack loader that allows you to load and import `.graphql` files into your code. Teip loader creates ES modules by default but can also be configured to produce commonjs exports.

## Usage

Include Teip loader into your Webpack configuration. If you are using Webpack 2 or newer you should be good to go without configuration. If you are using Webpack 1 you need to set `esModules` to `false`.

```js
module.exports.config = {
  module: {
    rules: [
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        loader: '@teip/loader',
      },
    ],
  },
};
```

## Options

### ES Modules

Use the `esModules` options flag to change the output files to commonjs modules format. This is only required if your platform does not support ES modules yet (e.g. when running Webpack 1 or using the results within Node.js).
