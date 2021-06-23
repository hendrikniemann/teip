# Teip

Opinionated tools around [GraphQL](http://graphql.org) and [Flow](https://flow.org).

## Publishing packages in this repo

After making changes in packages, set the new version in the changed packages.
Update the other packages that depend on the package with the new dependency version and also update their version.
Now you can use _Lerna_ to publish the packages:

```
npm lerna publish from-package
```

This will publish all packages with new versions to the registry.
Compilation will be done automatically with the `prepublish` scripts in the packages.
