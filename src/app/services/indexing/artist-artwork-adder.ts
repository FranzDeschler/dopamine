import { Injectable } from '@angular/core';
import { ArtistArtwork } from '../../data/entities/artist-artwork';
import { ArtistData } from '../../data/entities/artist-data';
import { Track } from '../../data/entities/track';
import { Logger } from '../../common/logger';
import { IFileMetadata } from '../../common/metadata/i-file-metadata';
import { ArtistArtworkCacheId } from '../artist-artwork-cache/artist-artwork-cache-id';
import { OnlineArtistArtworkGetter } from './online-artist-artwork-getter';
import { ArtistArtworkCacheServiceBase } from '../artist-artwork-cache/artist-artwork-cache.service.base';
import { ArtistArtworkRepositoryBase } from '../../data/repositories/artist-artwork-repository.base';
import { TrackRepositoryBase } from '../../data/repositories/track-repository.base';
import { FileMetadataFactoryBase } from '../../common/metadata/file-metadata.factory.base';
import { NotificationServiceBase } from '../notification/notification.service.base';

@Injectable({ providedIn: 'root' })
export class ArtistArtworkAdder {
    public constructor(
        private artistArtworkCacheService: ArtistArtworkCacheServiceBase,
        private artistArtworkRepository: ArtistArtworkRepositoryBase,
        private trackRepository: TrackRepositoryBase,
        private fileMetadataFactory: FileMetadataFactoryBase,
        private notificationService: NotificationServiceBase,
        private logger: Logger,
        private artistArtworkGetter: OnlineArtistArtworkGetter,
    ) {}

    public async addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync(): Promise<void> {
        try {
            const artistDataThatNeedsIndexing: ArtistData[] = this.trackRepository.getArtistDataThatNeedsIndexing() ?? [];

            if (artistDataThatNeedsIndexing.length === 0) {
                this.logger.info(
                    `Found no artist data that needs indexing`,
                    'ArtistArtworkAdder',
                    'addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync',
                );

                return;
            }

            this.logger.info(
                `Found ${artistDataThatNeedsIndexing.length} artist data that needs indexing`,
                'ArtistArtworkAdder',
                'addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync',
            );

            await this.showNotificationTheFirstTimeIndexingRuns();

            for (const artistData of artistDataThatNeedsIndexing) {
                try {
                    await this.addArtistArtworkAsync(artistData.artistKey);
                } catch (e: unknown) {
                    this.logger.error(
                        e,
                        `Could not add artist artwork for artistKey=${artistData.artistKey}`,
                        'ArtistArtworkAdder',
                        'addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync',
                    );
                }
            }
        } catch (e: unknown) {
            this.logger.error(
                e,
                'Could not add artist artwork for tracks that need artist artwork indexing',
                'ArtistArtworkAdder',
                'addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync',
            );
        }
    }

    private async showNotificationTheFirstTimeIndexingRuns() {
        const numberOfArtistArtwork: number = this.artistArtworkRepository.getNumberOfArtistArtwork();
        if (numberOfArtistArtwork === 0) {
            await this.notificationService.updatingArtistArtworkAsync();
        }
    }

    private async addArtistArtworkAsync(artistKey: string): Promise<void> {
        const track: Track | undefined = this.trackRepository.getLastModifiedTrackForArtistKeyAsync(artistKey);

        if (track == undefined) {
            return;
        }

        let artistArtwork: Buffer | undefined;

        try {
            const fileMetadata: IFileMetadata = await this.fileMetadataFactory.createAsync(track.path);
            artistArtwork = await this.artistArtworkGetter.getOnlineArtworkAsync(fileMetadata);
        } catch (e: unknown) {
            this.logger.error(
                e,
                `Could not create file metadata for path='${track.path}'`,
                'ArtistArtworkAdder',
                'addArtistArtworkAsync'
            );
        }

        if (artistArtwork == undefined) {
            return;
        }

        const artistArtworkCacheId: ArtistArtworkCacheId | undefined =
            await this.artistArtworkCacheService.addArtworkDataToCacheAsync(artistArtwork);

        if (artistArtworkCacheId == undefined) {
            return;
        }

        this.trackRepository.disableNeedsArtistArtworkIndexing(artistKey);
        const newArtistArtwork: ArtistArtwork = new ArtistArtwork(artistKey, artistArtworkCacheId.id);
        this.artistArtworkRepository.addArtistArtwork(newArtistArtwork);
    }
}
