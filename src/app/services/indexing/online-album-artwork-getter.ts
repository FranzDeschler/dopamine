import { Injectable } from '@angular/core';
import { LastfmAlbum } from '../../common/api/lastfm/lastfm-album';
import { LastfmApi } from '../../common/api/lastfm/lastfm.api';
import { ImageProcessor } from '../../common/image-processor';
import { Logger } from '../../common/logger';
import { IFileMetadata } from '../../common/metadata/i-file-metadata';
import { StringUtils } from '../../common/utils/string-utils';
import { ArrayUtils } from '../../common/utils/array-utils';

@Injectable()
export class OnlineAlbumArtworkGetter {
    public constructor(
        private imageProcessor: ImageProcessor,
        private lastfmApi: LastfmApi,
        private logger: Logger,
    ) {}

    public async getOnlineArtworkAsync(fileMetadata: IFileMetadata | undefined): Promise<Buffer | undefined> {
        if (fileMetadata == undefined) {
            return undefined;
        }

        // Title
        let title: string = '';
        if (!StringUtils.isNullOrWhiteSpace(fileMetadata.album)) {
            title = fileMetadata.album;
        } else if (!StringUtils.isNullOrWhiteSpace(fileMetadata.title)) {
            title = fileMetadata.title;
        }

        // Artist
        const artists: string[] = fileMetadata.albumAndTrackArtists;

        if (StringUtils.isNullOrWhiteSpace(title) || ArrayUtils.isNullOrEmpty(artists)) {
            return undefined;
        }

        for (const artist of artists) {
            let lastfmAlbum: LastfmAlbum | undefined;

            try {
                lastfmAlbum = await this.lastfmApi.getAlbumInfoAsync(artist, title, false, 'EN');
            } catch (e: unknown) {
                this.logger.error(
                    e,
                    `Could not get album info for artist='${artist}' and title='${title}'`,
                    'OnlineAlbumArtworkGetter',
                    'getOnlineArtworkAsync',
                );
            }

            if (lastfmAlbum != undefined) {
                if (!StringUtils.isNullOrWhiteSpace(lastfmAlbum.largestImage())) {
                    let artworkData: Buffer;

                    try {
                        artworkData = await this.imageProcessor.convertOnlineImageToBufferAsync(lastfmAlbum.largestImage());

                        this.logger.info(
                            `Downloaded online artwork for artist='${artist}' and title='${title}'`,
                            'OnlineAlbumArtworkGetter',
                            'getOnlineArtworkAsync',
                        );

                        return artworkData;
                    } catch (e: unknown) {
                        this.logger.error(
                            e,
                            `Could not convert file '${lastfmAlbum.largestImage()}' to data`,
                            'OnlineAlbumArtworkGetter',
                            'getOnlineArtworkAsync',
                        );
                    }
                }
            }
        }

        return undefined;
    }
}
