import {readFileSync} from 'fs';
import type {TLSSocket} from 'tls';
import {connect} from 'tls';
import type {StartServerResult} from '../src';
import {AudioNotFoundResult, startServer, UnknownUidResult} from '../src';
import BufferedStream from '../src/BufferedStream';
import {Command} from '../src/client';
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
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('foo', 'utf-8'));
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('bar', 'utf-8'));
            stream.writeUint8(4);
            stream.writeAll(Buffer.from([192, 168, 0, 1]));

            const authResult = await stream.readUint8();
            expect(authResult).toBe(1);
        }

        try {
            await tester(stream);
        } finally {
            stream.writeUint8(Command.quit);
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
    for (const startServerResult of startServerResults) {
        startServerResult.closeOpenConnections();

        await new Promise<void>(resolve => startServerResult.server.close(() => {
            startServerResults.delete(startServerResult);
            resolve();
        }));
    }
};
