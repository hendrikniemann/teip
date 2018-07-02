# Teip loader

Teip loader is an opinionated webpack loader that allows you to load and import `.graphql` files into your code.

## Usage

Include Teip loader into your Webpack configuration.

```js
module.exports.config = {
  module: {
    rules: [
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        loader: '@teip/loader',
        options: {
          esModules: true, // true by default so just for example...
        },
      },
    ],
  },
};
```

## Options

### ES Modules

Use the `esModules` options flag to change the output files to commonjs modules format.
