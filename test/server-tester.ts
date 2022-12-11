import {readFileSync} from 'fs';
import type {TLSSocket} from 'tls';
import {connect} from 'tls';
import type {StartServerResult} from '../src';
import {AudioNotFoundResult, startServer, UnknownUidResult} from '../src';
import BufferedStream from '../src/BufferedStream';
import type Processor from '../src/Processor';
import type Stream from '../src/Stream';

export const tlsOptions = {
    key: readFileSync(`${__dirname}/test.key`),
    cert: readFileSync(`${__dirname}/test.crt`),
};

type Tester = (socket : Stream) => Promise<void>;

const startServerResults = new Set<StartServerResult>();

export const testServer = async (
    processor : Partial<Processor>,
    tester : Tester,
    autoAuth = true,
    authTimeout ?: number,
    idleTimeout ?: number,
) : Promise<void> => {
    const startServerResult = await startServer({
        tls: tlsOptions,
        authTimeout,
        idleTimeout,
        processor: {
            authenticate: processor.authenticate ?? (() => true),
            checkUid: processor.checkUid
                ?? /* istanbul ignore next */ (async () => Promise.resolve(new UnknownUidResult())),
            getAudio: processor.getAudio
                ?? /* istanbul ignore next */ (async () => Promise.resolve(new AudioNotFoundResult())),
        },
    });
    startServerResults.add(startServerResult);

    try {
        const address = startServerResult.server.address();

        /* istanbul ignore next */
        if (!address || typeof address === 'string') {
            throw new Error('Invalid address received from server');
        }

        const socket = await new Promise<TLSSocket>((resolve, reject) => {
            const socket = connect({port: address.port, host: address.address, rejectUnauthorized: false}, () => {
                resolve(socket);
            });

            socket.on('error', error => {
                /* istanbul ignore next */
                reject(error);
            });
        });

        const stream = new BufferedStream(socket);

        if (autoAuth) {
            stream.writeUint8(7);
            stream.writeAll(Buffer.from('foo:bar', 'ascii'));
            const authResult = await stream.readUint8();
            expect(authResult).toBe(1);
        }

        try {
            await tester(stream);
        } finally {
            stream.close();
        }
    } finally {
        startServerResult.closeOpenConnections();

        await new Promise<void>(resolve => startServerResult.server.close(() => {
            startServerResults.delete(startServerResult);
            resolve();
        }));
    }
};

export const closeOpenServer = async () : Promise<void> => {
    /* istanbul ignore next */
    for (const startServerResult of startServerResults.values()) {
        startServerResult.closeOpenConnections();

        await new Promise<void>(resolve => startServerResult.server.close(() => {
            startServerResults.delete(startServerResult);
            resolve();
        }));
    }
};
