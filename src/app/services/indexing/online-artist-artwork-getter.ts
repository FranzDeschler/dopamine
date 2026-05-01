import { Injectable } from '@angular/core';
import { IFileMetadata } from '../../common/metadata/i-file-metadata';
import { StringUtils } from '../../common/utils/string-utils';
import { LastfmArtist } from '../../common/api/lastfm/lastfm-artist';
import { Logger } from '../../common/logger';
import { ImageProcessor } from '../../common/image-processor';
import { LastfmApi } from '../../common/api/lastfm/lastfm.api';
import { SettingsBase } from '../../common/settings/settings.base';
import { ArrayUtils } from '../../common/utils/array-utils';

@Injectable()
export class OnlineArtistArtworkGetter {
    public constructor(
        private imageProcessor: ImageProcessor,
        private lastfmApi: LastfmApi,
        private logger: Logger,
        private settings: SettingsBase,
    ) {}

    public async getOnlineArtworkAsync(fileMetadata: IFileMetadata | undefined): Promise<Buffer | undefined> {
        if (!this.settings.showArtistImages || fileMetadata == undefined) {
            return undefined;
        }

        const artists: string[] = fileMetadata.albumAndTrackArtists;
        if (ArrayUtils.isNullOrEmpty(artists)) {
            return undefined;
        }

        for (const artist of artists) {
            let lastfmArtist: LastfmArtist | undefined;

            try {
                lastfmArtist = await this.lastfmApi.getArtistInfoAsync(artist, false, 'EN');
            } catch (e: unknown) {
                this.logger.error(e, `Could not get artist info for artist='${artist}'`, 'ArtistArtworkGetter', 'getArtistArtworkAsync');
            }

            if (lastfmArtist != undefined) {
                if (!StringUtils.isNullOrWhiteSpace(lastfmArtist.largestImage())) {
                    let artworkData: Buffer;

                    try {
                        artworkData = await this.imageProcessor.convertOnlineImageToBufferAsync(lastfmArtist.largestImage());

                        this.logger.info(
                            `Downloaded online artwork for artist='${artist}'`,
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
}
