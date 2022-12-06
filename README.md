# Bloop Server for NodeJS

[![Release](https://github.com/bloop-box/bloop-server-node/actions/workflows/release.yml/badge.svg)](https://github.com/bloop-box/bloop-server-node/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/bloop-box/bloop-server-node/branch/main/graph/badge.svg?token=SFF7EKPZ2X)](https://codecov.io/gh/bloop-box/bloop-server-node)

Server library implementing the Bloop Box protocol. This allows you to implement your own Bloop Server without having to
worry about networking details.

## Installation

Run `npm i bloop-server`

## Quickstart

### Processor
In order to use the server, you have to implement a processor first. Following is a boilerplate code which should get
you started:

```typescript
import {
    AudioFoundResult,
    AudioNotFoundResult,
    ThrottledUidResult,
    UnknownUidResult,
    ValidUidResult,
} from 'bloop-server';
import type {
    CheckUidResult,
    GetAudioResult,
    Processor,
} from 'bloop-server';

class MyProcessor implements Processor {
    public authenticate(clientId : string, secret : string) : boolean {
        return clientId === 'foo' && secret === 'bar';
    }

    public async checkUid(clientId : string, uid : Buffer) : CheckUidResult {
        const hexUid = uid.toString('hex');

        if (hexUid === '00000000000001') {
            // If the UID was scanned too quickly in succession, return a throttle result.
            return new ThrottledUidResult();
        }

        if (hexUid === '00000000000002') {
            // This is a valid UID, return an array of achievement IDs, if any were achieved.
            return new ValidUidResult([
                Buffer.from('0000000000000000000000000000000000000001'),
                Buffer.from('0000000000000000000000000000000000000002'),
            ]);
        }

        return new UnknownUidResult();
    }

    public async getAudio(id : Buffer) : GetAudioResult {
        const hexId = id.toString('hex');

        if (hexId === '0000000000000000000000000000000000000001') {
            // Return MP3 audio data.
            return new AudioFoundResult(Buffer.alloc(50));
        }

        return new AudioNotFoundResult();
    }
}
```

> **Note**: Then `authenticate` method can either be synchronous or marked `async` and return a promise.

### Running the server

After implementing and instantiating your processor, it's time to create the server. For this, you'll first need to
have a valid SSL certificate. Then you can go ahead and start the server:

```typescript
import {startServer} from 'boop-server';

const processor = new MyProcessor();
const {server, closeOpenConnections} = startServer({
    processor,

    tls: {
        // Buffer or string of your private key.
        key: '',
        // Buffer or string of your full certificate chain.
        cert: '',
    },
    
    // Choose a port which is available on your server.
    // If not specified, a random port is chosen.
    port: 12345,

    // Optionally bind the server to a specific interface. 
    //hostname: '',

    // Optionally define a logger to get information from the server.
    // See the winston NPM package for more details:
    //logger: winston.createLogger({
    //    format: winston.format.simple(),
    //    transports: new winston.transport.Console(),
    //}),
});

// This takes care of gracefully shutting down the server on CTRL+C
process.on('SIGINT', () => {
    closeOpenConnections();
    server.close(() => {
        process.exit(0);
    });
});
```
