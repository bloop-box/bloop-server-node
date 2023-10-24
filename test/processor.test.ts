import {ValidUidResult} from '../src';

describe('Processor', () => {
    it('should throw error with too many achievements', () => {
        const id = Buffer.from('0'.repeat(40), 'hex');

        expect(() => {
            new ValidUidResult(new Array(256).fill(id) as Buffer[]);
        }).toThrow('Response cannot contain more than 255 achievements');
    });

    it('should throw error with invalid achievement ID', () => {
        const id = Buffer.from('0'.repeat(42), 'hex');

        expect(() => {
            new ValidUidResult([id]);
        }).toThrow('Length of achievement ID "000000000000000000000000000000000000000000" is not 16 bytes');
    });
});
