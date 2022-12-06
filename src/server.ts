import type {Server, TlsOptions, TLSSocket} from 'tls';
import {createServer} from 'tls';
import type {Logger} from 'winston';
import BufferedStream from './BufferedStream';
import handleClient from './client';
import type Processor from './Processor';
import type Stream from './Stream';
import {StreamClosedError} from './Stream';

export type ServerOptions = {
    tls : TlsOptions;
    port ?: number;
    hostname ?: string;
    processor : Processor;
    logger ?: Logger;
};

export type StartServerResult = {
    server : Server;
    closeOpenConnections : () => void;
};

export const startServer = async (options : ServerOptions) : Promise<StartServerResult> => {
    const streams = new Set<Stream>();

    const server = createServer(options.tls, (socket : TLSSocket) => {
        const stream = new BufferedStream(socket);
        streams.add(stream);

        handleClient(stream, options.processor, options.logger)
            .then(() => {
                stream.close();
                streams.delete(stream);
            })
            .catch(error => {
                /* istanbul ignore next */
                if (!(error instanceof StreamClosedError)) {
                    options.logger?.error('Client error: ', error);
                }

                stream.close();
                streams.delete(stream);
            });
    });

    await new Promise<void>((resolve, reject) => {
        server.listen(options.port, options.hostname, () => {
            const address = server.address();

            /* istanbul ignore next */
            if (!address) {
                reject(new Error('Server did not return an address'));
                return;
            }

            options.logger?.info(`Server started on ${address.toString()}`);
            resolve();
        });
    });

    return {
        server,
        closeOpenConnections: () => {
            for (const stream of streams.values()) {
                stream.close();
                streams.delete(stream);
            }
        },
    };
};
