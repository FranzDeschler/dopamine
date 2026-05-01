import { GuidFactory } from '../../common/guid.factory';

export class ArtistArtworkCacheId {
    public constructor(guidFactory: GuidFactory) {
        this.id = `artist-${guidFactory.create()}`;
    }

    public readonly id: string;
}