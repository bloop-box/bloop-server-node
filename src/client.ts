import type {Logger} from 'winston';
import {IpV4Addr, IpV6Addr} from './ip-addr';
import type {IpAddr} from './ip-addr';
import type Processor from './Processor';
import {AudioNotFoundResult, ThrottledUidResult, UnknownUidResult} from './Processor';
import type Stream from './Stream';

export enum Command {
    checkUid = 0,
    getAudio = 1,
    ping = 2,
    quit = 3,
}

export enum AuthResponse {
    invalidAuth = 0,
    validAuth = 1,
}

export enum CheckUidResponse {
    unknownUid = 0,
    throttledUid = 2,
    validUid = 1,
}

export enum GetAudioResponse {
    audioNotFound = 0,
    audioFound = 1,
}

export enum PingResponse {
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
            const clientIdLength = await stream.readUint8();
            const clientId = (await stream.readExact(clientIdLength)).toString('utf-8');

            const secretLength = await stream.readUint8();
            const secret = (await stream.readExact(secretLength)).toString('utf-8');

            const inetVersion = await stream.readUint8();
            let localIp : IpAddr;

            switch (inetVersion) {
                case 4:
                    localIp = new IpV4Addr(await stream.readExact(4));
                    break;

                case 6:
                    localIp = new IpV6Addr(await stream.readExact(16));
                    break;

                default:
                    logger?.info(`Invalid INET version "${inetVersion}"`);
                    stream.writeUint8(AuthResponse.invalidAuth);
                    return null;
            }

            const authResult = await processor.authenticate(clientId, secret, localIp);

            if (!authResult) {
                logger?.info(`Unknown client ID "${clientId}" or invalid secret`);
                stream.writeUint8(AuthResponse.invalidAuth);
                return null;
            }

            stream.writeUint8(AuthResponse.validAuth);
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
                    stream.writeUint8(CheckUidResponse.unknownUid);
                    break;
                }

                if (response instanceof ThrottledUidResult) {
                    stream.writeUint8(CheckUidResponse.throttledUid);
                    break;
                }

                stream.writeUint8(CheckUidResponse.validUid);
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
                    stream.writeUint8(GetAudioResponse.audioNotFound);
                    break;
                }

                stream.writeUint8(GetAudioResponse.audioFound);
                stream.writeUInt32LE(result.data.length);
                stream.writeAll(result.data);
                break;
            }

            case Command.ping:
                stream.writeUint8(PingResponse.pong);
                break;

            case Command.quit:
                return;

            default:
                logger?.info(`Unknown command: ${commandCode}`);
                return;
        }
    }
};

export default handleClient;
