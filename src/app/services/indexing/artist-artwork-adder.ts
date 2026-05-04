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

            const rawArtistsToIndividualArtistsMap: Map<string, string[]> =
                this.splitToIndividualArtists(artistsThatNeedsArtworkIndexing);

            const numberOfUniqueArtists = this.countUniqueArtists(rawArtistsToIndividualArtistsMap);
            this.logger.info(
                `Found ${numberOfUniqueArtists} unique artists that needs indexing`,
                'ArtistArtworkAdder',
                'addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync',
            );

            await this.showNotificationTheFirstTimeIndexingRuns();
            await this.addArtistArtworkAsync(rawArtistsToIndividualArtistsMap);
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

    private async addArtistArtworkAsync(rawArtistsToIndividualArtistsMap: Map<string, string[]>): Promise<void> {
        const processedArtists: string[] = [];
        for (const [rawArtists, individualArtists] of rawArtistsToIndividualArtistsMap) {
            let success: boolean = true;
            for (const artist of individualArtists) {
                if (processedArtists.includes(artist.toLowerCase())) {
                    continue;
                }

                try {
                    success &&= await this.addArtistArtworkForIndividualArtistAsync(artist);
                } catch (e: unknown) {
                    success = false;
                    this.logger.error(
                        e,
                        `Could not add artist artwork for '${rawArtists}'`,
                        'ArtistArtworkAdder',
                        'addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync',
                    );
                }

                processedArtists.push(artist.toLowerCase());
            }

            if (success) {
                this.trackRepository.disableNeedsArtistArtworkIndexing(rawArtists);
            }
        }
    }

    private async addArtistArtworkForIndividualArtistAsync(artist: string): Promise<boolean> {
        const artistArtwork: Buffer | undefined = await this.artistArtworkGetter.getOnlineArtworkAsync(artist);

        if (artistArtwork == undefined) {
            return false;
        }

        const artistArtworkCacheId: ArtistArtworkCacheId | undefined =
            await this.artistArtworkCacheService.addArtworkDataToCacheAsync(artistArtwork);

        if (artistArtworkCacheId == undefined) {
            return false;
        }

        const newArtistArtwork: ArtistArtwork = new ArtistArtwork(artist, artistArtworkCacheId.id);
        this.artistArtworkRepository.addArtistArtwork(newArtistArtwork);

        return true;
    }

    // In order to update the NeedsArtistArtworkIndexing flag in the database, we need to know which individual
    // artists are part of the raw Artists field.
    private splitToIndividualArtists(artistsThatNeedsArtworkIndexing: ArtistData[]): Map<string, string[]> {
        const result: Map<string, string[]> = new Map<string, string[]>();

        for (const artistData of artistsThatNeedsArtworkIndexing) {
            const rawArtists: string = artistData.artists;
            if (!StringUtils.isNullOrWhiteSpace(rawArtists)) {
                const artistsToSplit: string[] = DataDelimiter.fromDelimitedString(rawArtists);
                const individualArtists: string[] = this.artistSplitter.splitArtists(artistsToSplit);
                result.set(rawArtists, individualArtists);
            }
        }

        return result;
    }

    private countUniqueArtists(map: Map<string, string[]>): number {
        const individualArtists: string[] = Array.from(map.values()).flat();
        const uniqueArtists: Set<string> = new Set(individualArtists);
        return uniqueArtists.size;
    }
}
