import type {IpAddr} from './ip-addr';

export class UnknownUidResult {}
export class ThrottledUidResult {}
export class ValidUidResult {
    public constructor(public readonly achievementIds : Buffer[]) {
        if (this.achievementIds.length > 255) {
            throw new Error('Response cannot contain more than 255 achievements');
        }

        for (const achievementId of achievementIds) {
            if (achievementId.length !== 16) {
                throw new Error(`Length of achievement ID "${achievementId.toString('hex')}" is not 16 bytes`);
            }
        }
    }
}

export type CheckUidResult = UnknownUidResult | ThrottledUidResult | ValidUidResult;

export class AudioNotFoundResult {}
export class AudioFoundResult {
    public constructor(public readonly data : Buffer) {
    }
}

export type GetAudioResult = AudioNotFoundResult | AudioFoundResult;

type Processor = {
    authenticate : (clientId : string, secret : string, localIp : IpAddr) => Promise<boolean> | boolean;
    checkUid : (clientId : string, uid : Buffer) => Promise<CheckUidResult>;
    getAudio : (id : Buffer) => Promise<GetAudioResult>;
};

export default Processor;
