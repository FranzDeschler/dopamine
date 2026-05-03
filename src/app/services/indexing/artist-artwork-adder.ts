import { Injectable } from '@angular/core';
import { ArtistArtwork } from '../../data/entities/artist-artwork';
import { Logger } from '../../common/logger';
import { ArtistArtworkCacheId } from '../artist-artwork-cache/artist-artwork-cache-id';
import { OnlineArtistArtworkGetter } from './online-artist-artwork-getter';
import { ArtistArtworkCacheServiceBase } from '../artist-artwork-cache/artist-artwork-cache.service.base';
import { ArtistArtworkRepositoryBase } from '../../data/repositories/artist-artwork-repository.base';
import { TrackRepositoryBase } from '../../data/repositories/track-repository.base';
import { NotificationServiceBase } from '../notification/notification.service.base';
import { DataDelimiter } from '../../data/data-delimiter';
import { ArtistSplitter } from '../artist/artist-splitter';
import { StringUtils } from '../../common/utils/string-utils';
import { ArtistData } from '../../data/entities/artist-data';

@Injectable({ providedIn: 'root' })
export class ArtistArtworkAdder {
    public constructor(
        private artistArtworkCacheService: ArtistArtworkCacheServiceBase,
        private artistArtworkRepository: ArtistArtworkRepositoryBase,
        private trackRepository: TrackRepositoryBase,
        private notificationService: NotificationServiceBase,
        private logger: Logger,
        private artistArtworkGetter: OnlineArtistArtworkGetter,
        private artistSplitter: ArtistSplitter,
    ) {}

    public async addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync(): Promise<void> {
        try {
            const artistsThatNeedsArtworkIndexing: ArtistData[] = this.trackRepository.getArtistDataThatNeedsArtistArtworkIndexing() ?? [];
            if (artistsThatNeedsArtworkIndexing.length === 0) {
                this.logger.info(
                    `Found no artist data that needs indexing`,
                    'ArtistArtworkAdder',
                    'addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync',
                );

                return;
            }

            const artistsToSplit: string[] = artistsThatNeedsArtworkIndexing
                .filter((artistData: ArtistData): boolean => !StringUtils.isNullOrWhiteSpace(artistData.artists))
                .flatMap((artistData: ArtistData): string[] => DataDelimiter.fromDelimitedString(artistData.artists));
            const uniqueArtists: Set<string> = this.artistSplitter.splitArtists(artistsToSplit);

            this.logger.info(
                `Found ${uniqueArtists.size} unique artists that needs indexing`,
                'ArtistArtworkAdder',
                'addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync',
            );

            await this.showNotificationTheFirstTimeIndexingRuns();

            for (const artist of uniqueArtists) {
                try {
                    await this.addArtistArtworkAsync(artist);
                } catch (e: unknown) {
                    this.logger.error(
                        e,
                        `Could not add artist artwork for '${artist}'`,
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

    private async addArtistArtworkAsync(artist: string): Promise<void> {
        const artistArtwork: Buffer | undefined = await this.artistArtworkGetter.getOnlineArtworkAsync(artist);

        if (artistArtwork == undefined) {
            return;
        }

        const artistArtworkCacheId: ArtistArtworkCacheId | undefined =
            await this.artistArtworkCacheService.addArtworkDataToCacheAsync(artistArtwork);

        if (artistArtworkCacheId == undefined) {
            return;
        }

        this.trackRepository.disableNeedsArtistArtworkIndexing(artist);
        const newArtistArtwork: ArtistArtwork = new ArtistArtwork(artist, artistArtworkCacheId.id);
        this.artistArtworkRepository.addArtistArtwork(newArtistArtwork);
    }
}
