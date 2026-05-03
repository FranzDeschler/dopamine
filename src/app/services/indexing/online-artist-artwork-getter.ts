import { Injectable } from '@angular/core';
import { StringUtils } from '../../common/utils/string-utils';
import { LastfmArtist } from '../../common/api/lastfm/lastfm-artist';
import { Logger } from '../../common/logger';
import { ImageProcessor } from '../../common/image-processor';
import { LastfmApi } from '../../common/api/lastfm/lastfm.api';
import { OnlineArtistImageGetter } from '../artist-information/online-artist-image-getter';

@Injectable()
export class OnlineArtistArtworkGetter {
    public constructor(
        private onlineArtistImageGetter: OnlineArtistImageGetter,
        private imageProcessor: ImageProcessor,
        private lastfmApi: LastfmApi,
        private logger: Logger,
    ) {}

    public async getOnlineArtworkAsync(artistName: string): Promise<Buffer | undefined> {
        let lastfmArtist: LastfmArtist | undefined;

        try {
            lastfmArtist = await this.lastfmApi.getArtistInfoAsync(artistName, false, 'EN');
        } catch (e: unknown) {
            this.logger.error(e, `Could not get artist info for '${artistName}'`, 'OnlineArtistArtworkGetter', 'getOnlineArtworkAsync');
        }

        if (lastfmArtist != undefined) {
            let artistImageUrl: string = '';

            try {
                artistImageUrl = await this.onlineArtistImageGetter.getArtistImageAsync(lastfmArtist.musicBrainzId);
            } catch (e: unknown) {
                this.logger.error(
                    e,
                    `Could not get artist image URL for '${artistName}'`,
                    'OnlineArtistArtworkGetter',
                    'getOnlineArtworkAsync',
                );
            }

            if (StringUtils.isNullOrWhiteSpace(artistImageUrl)) {
                this.logger.info(`Could not find online artwork for '${artistName}'`, 'OnlineArtistArtworkGetter', 'getOnlineArtworkAsync');
            } else {
                let artworkData: Buffer;

                try {
                    artworkData = await this.imageProcessor.convertOnlineImageToBufferAsync(artistImageUrl);

                    this.logger.info(`Downloaded online artwork for '${artistName}'`, 'ArtistArtworkGetter', 'getOnlineArtworkAsync');

                    return artworkData;
                } catch (e: unknown) {
                    this.logger.error(
                        e,
                        `Could not convert file '${artistImageUrl}' to data`,
                        'OnlineArtistArtworkGetter',
                        'getArtistArtworkAsync',
                    );
                }
            }
        }
    }
}
