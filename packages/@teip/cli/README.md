# Teip CLI

This is a cli tool to utilise the Teip tools

## Installation

```
yarn add --dev @teip/cli
```

## Usage

In a directory with configured [graphql-config]() file execute

```
yarn teip generate
```

This will create `.flow` type definition files next to `.graphql` and `*.gql` files. Alternatively you can provide your own glob pattern:

```
yarn teip generate **/*.gql
```
