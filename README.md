# Issie Shared
A shared repo for common controls and apis for the issie apps


## How to install
`npm install @beitissieshapiro/issie-shared`

but before, you need to configure github as a source for this org:

- create a .npmrc file with this:
```
@beitissieshapiro:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
- create a hithub personal-access-token (classic) with packages-read permission
- `export GITHUB_TOKEN=<your pat>

## How to publish a new version
- modify package.json version field
- push to github
- create a new release --> this will trigger an action which will publish a new version of the package