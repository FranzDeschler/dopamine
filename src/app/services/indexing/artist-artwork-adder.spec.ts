import { IMock, It, Mock, Times } from 'typemoq';
import { GuidFactory } from '../../common/guid.factory';
import { Logger } from '../../common/logger';
import { ArtistArtworkCacheId } from '../artist-artwork-cache/artist-artwork-cache-id';
import { ArtistArtworkAdder } from './artist-artwork-adder';
import { ArtistArtworkCacheServiceBase } from '../artist-artwork-cache/artist-artwork-cache.service.base';
import { ArtistArtworkRepositoryBase } from '../../data/repositories/artist-artwork-repository.base';
import { TrackRepositoryBase } from '../../data/repositories/track-repository.base';
import { ArtistData } from '../../data/entities/artist-data';
import { ArtistArtwork } from '../../data/entities/artist-artwork';
import { NotificationServiceBase } from '../notification/notification.service.base';
import { OnlineArtistArtworkGetter } from './online-artist-artwork-getter';
import { ArtistSplitter } from '../artist/artist-splitter';

const artistArtworkData: Buffer = Buffer.from([1, 2, 3]);

describe('ArtistArtworkAdder', () => {
    let artistArtworkCacheServiceMock: IMock<ArtistArtworkCacheServiceBase>;
    let artistArtworkRepositoryMock: IMock<ArtistArtworkRepositoryBase>;
    let trackRepositoryMock: IMock<TrackRepositoryBase>;
    let notificationServiceMock: IMock<NotificationServiceBase>;
    let loggerMock: IMock<Logger>;
    let artistArtworkGetterMock: IMock<OnlineArtistArtworkGetter>;
    let guidFactoryMock: IMock<GuidFactory>;
    let artistSplitterMock: IMock<ArtistSplitter>;

    let artistArtworkAdder: ArtistArtworkAdder;
    let artistData: ArtistData;

    beforeEach(() => {
        artistArtworkCacheServiceMock = Mock.ofType<ArtistArtworkCacheServiceBase>();
        artistArtworkRepositoryMock = Mock.ofType<ArtistArtworkRepositoryBase>();
        trackRepositoryMock = Mock.ofType<TrackRepositoryBase>();
        notificationServiceMock = Mock.ofType<NotificationServiceBase>();
        loggerMock = Mock.ofType<Logger>();
        artistArtworkGetterMock = Mock.ofType<OnlineArtistArtworkGetter>();
        guidFactoryMock = Mock.ofType<GuidFactory>();
        artistSplitterMock = Mock.ofType<ArtistSplitter>();

        artistArtworkAdder = new ArtistArtworkAdder(
            artistArtworkCacheServiceMock.object,
            artistArtworkRepositoryMock.object,
            trackRepositoryMock.object,
            notificationServiceMock.object,
            loggerMock.object,
            artistArtworkGetterMock.object,
            artistSplitterMock.object,
        );

        artistData = new ArtistData('metallica');
    });

    describe('addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync', () => {
        it('should get artist data that needs indexing', async () => {
            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.getArtistDataThatNeedsArtistArtworkIndexing(), Times.exactly(1));
        });

        it('should notify that artist artwork is being updated if it is the first time that indexing runs', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [artistData]);
            artistSplitterMock
                .setup((x) => x.splitArtists([artistData.artists]))
                .returns(() => [artistData.artists]);
            artistArtworkRepositoryMock
                .setup((x) => x.getNumberOfArtistArtwork())
                .returns(() => 0);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            notificationServiceMock.verify((x) => x.updatingArtistArtworkAsync(), Times.exactly(1));
        });

        it('should not notify that artist artwork is being updated if it is not the first time that indexing runs', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [artistData]);
            artistArtworkRepositoryMock
                .setup((x) => x.getNumberOfArtistArtwork())
                .returns(() => 10);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            notificationServiceMock.verify((x) => x.updatingArtistArtworkAsync(), Times.never());
        });

        it('should ignore unknown artists', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [new ArtistData('')]);
            artistArtworkRepositoryMock
                .setup((x) => x.getNumberOfArtistArtwork())
                .returns(() => 10);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            notificationServiceMock.verify((x) => x.updatingArtistArtworkAsync(), Times.never());
        });

        it('should not add artist artwork to the cache if no artist artwork data was found', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [artistData]);
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(It.isAnyString()))
                .returns(() => Promise.resolve(undefined));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkCacheServiceMock.verify((x) => x.addArtworkDataToCacheAsync(It.isAny()), Times.never());
        });

        it('should add artist artwork to the cache if artist artwork data was found', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [artistData]);
            artistSplitterMock
                .setup((x) => x.splitArtists([artistData.artists]))
                .returns(() => [artistData.artists]);
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(It.isAnyString()))
                .returns(() => Promise.resolve(artistArtworkData));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkCacheServiceMock.verify((x) => x.addArtworkDataToCacheAsync(artistArtworkData), Times.exactly(1));
        });

        it('should not disable artist artwork indexing for the corresponding artist if the artwork was not added to the cache', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [artistData]);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(undefined));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.disableNeedsArtistArtworkIndexing(It.isAnyString()), Times.never());
        });

        it('should disable artist artwork indexing for the corresponding artist if the artwork was added to the cache', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [artistData]);
            artistSplitterMock
                .setup((x) => x.splitArtists([artistData.artists]))
                .returns(() => [artistData.artists]);
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(artistData.artists))
                .returns(() => Promise.resolve(artistArtworkData));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.disableNeedsArtistArtworkIndexing(artistData.artists), Times.exactly(1));
        });

        it('should not add artist artwork to the database if the artwork was not added to the cache', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [artistData]);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(undefined));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkRepositoryMock.verify((x) => x.addArtistArtwork(It.isAny()), Times.never());
        });

        it('should add artist artwork to the database if the artwork was added to the cache', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing())
                .returns(() => [artistData]);
            artistSplitterMock
                .setup((x) => x.splitArtists([artistData.artists]))
                .returns(() => [artistData.artists]);
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(artistData.artists))
                .returns(() => Promise.resolve(artistArtworkData));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            const newArtistArtwork: ArtistArtwork = new ArtistArtwork(artistData.artists, artistArtworkCacheId.id);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkRepositoryMock.verify((x) => x.addArtistArtwork(newArtistArtwork), Times.exactly(1));
        });

        it('should split artists and load artwork for each individual artist', async () => {
            // Arrange
            artistData = new ArtistData('Aerosmith Feat. Alanis Morissette');
            trackRepositoryMock.setup((x) => x.getArtistDataThatNeedsArtistArtworkIndexing()).returns(() => [artistData]);
            artistSplitterMock
                .setup((x) => x.splitArtists([artistData.artists]))
                .returns(() => ['aerosmith', 'alanis morissette']);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkGetterMock.verify((x) => x.getOnlineArtworkAsync('aerosmith'), Times.exactly(1));
            artistArtworkGetterMock.verify((x) => x.getOnlineArtworkAsync('alanis morissette'), Times.exactly(1));
        });
    });
});
