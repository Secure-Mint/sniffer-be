<div align="center">
  <h1>token sniffer</h1>
</div>

## Getting started

> **Important!** requires Node >= 20.x and TypeScript >= 5.x

```batch
# install dependencies
$ yarn install

# serve
$ yarn dev

# build for production
$ yarn build
$ yarn start
```

## Docker

```
# build docker image
docker compose build

# start docker image
docker compose up
```

```json
{
  "directory": ["./src/controllers/v1"],
  "exclude": ["**/__mock__", "**/__mocks__", "**/*.spec.ts"],
  "delete": true
}
```
