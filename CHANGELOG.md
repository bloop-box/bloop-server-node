# [2.0.0](https://github.com/bloop-box/bloop-server-node/compare/v1.1.1...v2.0.0) (2023-10-24)


### Bug Fixes

* **Processor:** make sure to only accept 16 byte UUIDs ([357995e](https://github.com/bloop-box/bloop-server-node/commit/357995ee91cdb23743b7d8ad9a8ff62892604f02))


### Features

* implement bloop version 4 protocol ([725ff00](https://github.com/bloop-box/bloop-server-node/commit/725ff007b24b80437ed1a925fc0c7274c2a09a5f))


### BREAKING CHANGES

* This will require a client implementing version 4 of the bloop
protocol.

## [1.1.1](https://github.com/bloop-box/bloop-server-node/compare/v1.1.0...v1.1.1) (2023-02-22)


### Bug Fixes

* **BufferedStream:** handle socket errors by closing the stream ([9750748](https://github.com/bloop-box/bloop-server-node/commit/97507486e9605122409a3f7438372b69d836d5ed))

# [1.1.0](https://github.com/bloop-box/bloop-server-node/compare/v1.0.3...v1.1.0) (2022-12-11)


### Features

* add auth and idle timeouts ([fae97d9](https://github.com/bloop-box/bloop-server-node/commit/fae97d9db1773a2d0f92c513ba917ec8b70e4460))

## [1.0.3](https://github.com/bloop-box/bloop-server-node/compare/v1.0.2...v1.0.3) (2022-12-10)


### Bug Fixes

* properly format address in info ([056822f](https://github.com/bloop-box/bloop-server-node/commit/056822f24c5f59886c5d970ed41b286d669e6d73))

## [1.0.2](https://github.com/bloop-box/bloop-server-node/compare/v1.0.1...v1.0.2) (2022-12-10)


### Bug Fixes

* export CheckUidResult and GetAudioResult ([7568bd2](https://github.com/bloop-box/bloop-server-node/commit/7568bd258ab27af8b914741a5ff84aacbbeb3fd1))

## [1.0.1](https://github.com/bloop-box/bloop-server-node/compare/v1.0.0...v1.0.1) (2022-12-10)


### Bug Fixes

* user explicit type exports in index.ts ([fcdce69](https://github.com/bloop-box/bloop-server-node/commit/fcdce6918de9be3b9017766df5f64052a66486f6))

# 1.0.0 (2022-12-06)


### Features

* initial commit ([84c612a](https://github.com/bloop-box/bloop-server-node/commit/84c612a512ecc61f6c518d502707371962306dbd))
