import { Injectable } from '@angular/core';
import { StringUtils } from '../../common/utils/string-utils';
import { LastfmArtist } from '../../common/api/lastfm/lastfm-artist';
import { Logger } from '../../common/logger';
import { ImageProcessor } from '../../common/image-processor';
import { LastfmApi } from '../../common/api/lastfm/lastfm.api';

@Injectable()
export class OnlineArtistArtworkGetter {
    public constructor(
        private imageProcessor: ImageProcessor,
        private lastfmApi: LastfmApi,
        private logger: Logger,
    ) {}

    public async getOnlineArtworkAsync(artistName: string): Promise<Buffer | undefined> {
        let lastfmArtist: LastfmArtist | undefined;

        try {
            lastfmArtist = await this.lastfmApi.getArtistInfoAsync(artistName, false, 'EN');
        } catch (e: unknown) {
            this.logger.error(
                e,
                `Could not get artist info for '${artistName}'`,
                'ArtistArtworkGetter',
                'getArtistArtworkAsync'
            );
        }

        if (lastfmArtist != undefined) {
            if (!StringUtils.isNullOrWhiteSpace(lastfmArtist.largestImage())) {
                let artworkData: Buffer;

                try {
                    artworkData = await this.imageProcessor.convertOnlineImageToBufferAsync(lastfmArtist.largestImage());

                    this.logger.info(
                        `Downloaded online artwork for '${artistName}'`,
                        'ArtistArtworkGetter',
                        'getArtistArtworkAsync',
                    );

                    return artworkData;
                } catch (e: unknown) {
                    this.logger.error(
                        e,
                        `Could not convert file '${lastfmArtist.largestImage()}' to data`,
                        'ArtistArtworkGetter',
                        'getArtistArtworkAsync',
                    );
                }
            }
        }
    }
}
