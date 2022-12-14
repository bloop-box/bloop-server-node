import type {Logger} from 'winston';
import type Processor from './Processor';
import {AudioNotFoundResult, ThrottledUidResult, UnknownUidResult} from './Processor';
import type Stream from './Stream';

export enum Command {
    checkUid = 0,
    getAudio = 1,
    ping = 2,
}

export enum Response {
    invalidAuth = 0,
    validAuth = 1,
    unknownUid = 0,
    throttledUid = 2,
    validUid = 1,
    audioNotFound = 0,
    audioFound = 1,
    pong = 0,
}

const handleClient = async (
    stream : Stream,
    processor : Processor,
    logger ?: Logger,
    authTimeout = 1_000,
    idleTimeout = 30_000,
) : Promise<void> => {
    // We handle the auth timeout via race instead of a socket timeout. This forces the client to complete
    // authentication in a fixed amount of time. Otherwise, a malicious client could send individual bytes to keep the
    // connection open for up 256 times the socket timeout.
    let timeout;

    const clientId = await Promise.race([
        new Promise<null>(resolve => {
            timeout = setTimeout(() => {
                resolve(null);
            }, authTimeout);
        }),
        (async () => {
            const credentialsLength = await stream.readUint8();
            const credentials = (await stream.readExact(credentialsLength)).toString('ascii');

            if (!credentials.includes(':')) {
                logger?.info('Malformed credentials');
                stream.writeUint8(Response.invalidAuth);
                return null;
            }

            const [clientId, secret] = credentials.split(':', 2);
            const authResult = await processor.authenticate(clientId, secret);

            if (!authResult) {
                logger?.info(`Unknown client ID "${clientId}" or invalid secret`);
                stream.writeUint8(Response.invalidAuth);
                return null;
            }

            stream.writeUint8(Response.validAuth);
            return clientId;
        })(),
    ]);

    clearTimeout(timeout);

    if (!clientId) {
        return;
    }

    // At this point we can be certain that it's not a random client anymore, so further inactivity is handled via
    // socket timeouts.
    stream.setTimeout(idleTimeout, () => {
        stream.close();
    });

    while (!stream.isClosed()) {
        const commandCode = await stream.readUint8();

        switch (commandCode) {
            case Command.checkUid: {
                const uid = (await stream.readExact(7));
                const response = await processor.checkUid(clientId, uid);

                if (response instanceof UnknownUidResult) {
                    stream.writeUint8(Response.unknownUid);
                    break;
                }

                if (response instanceof ThrottledUidResult) {
                    stream.writeUint8(Response.throttledUid);
                    break;
                }

                stream.writeUint8(Response.validUid);
                stream.writeUint8(response.achievementIds.length);

                for (const achievementId of response.achievementIds) {
                    stream.writeAll(achievementId);
                }

                break;
            }

            case Command.getAudio: {
                const id = (await stream.readExact(20));
                const result = await processor.getAudio(id);

                if (result instanceof AudioNotFoundResult) {
                    stream.writeUint8(Response.audioNotFound);
                    break;
                }

                stream.writeUint8(Response.audioFound);
                stream.writeUInt32LE(result.data.length);
                stream.writeAll(result.data);
                break;
            }

            case Command.ping:
                stream.writeUint8(Response.pong);
                break;

            default:
                logger?.info(`Unknown command: ${commandCode}`);
                return;
        }
    }
};

export default handleClient;
