import { IMock, It, Mock, Times } from 'typemoq';
import { GuidFactory } from '../../common/guid.factory';
import { Logger } from '../../common/logger';
import { ArtistArtworkCacheId } from '../artist-artwork-cache/artist-artwork-cache-id';
import { ArtistArtworkAdder } from './artist-artwork-adder';
import { ArtistArtworkCacheServiceBase } from '../artist-artwork-cache/artist-artwork-cache.service.base';
import { ArtistArtworkRepositoryBase } from '../../data/repositories/artist-artwork-repository.base';
import { TrackRepositoryBase } from '../../data/repositories/track-repository.base';
import { ArtistsKey } from '../../data/entities/artist-key';
import { ArtistArtwork } from '../../data/entities/artist-artwork';
import { NotificationServiceBase } from '../notification/notification.service.base';
import { OnlineArtistArtworkGetter } from './online-artist-artwork-getter';

const artist: string = 'metallica';
const artistArtworkData: Buffer = Buffer.from([1, 2, 3]);

describe('ArtistArtworkAdder', () => {
    let artistArtworkCacheServiceMock: IMock<ArtistArtworkCacheServiceBase>;
    let artistArtworkRepositoryMock: IMock<ArtistArtworkRepositoryBase>;
    let trackRepositoryMock: IMock<TrackRepositoryBase>;
    let notificationServiceMock: IMock<NotificationServiceBase>;
    let loggerMock: IMock<Logger>;
    let artistArtworkGetterMock: IMock<OnlineArtistArtworkGetter>;
    let guidFactoryMock: IMock<GuidFactory>;

    let artistArtworkAdder: ArtistArtworkAdder;
    let artistsKey: ArtistsKey;

    beforeEach(() => {
        artistArtworkCacheServiceMock = Mock.ofType<ArtistArtworkCacheServiceBase>();
        artistArtworkRepositoryMock = Mock.ofType<ArtistArtworkRepositoryBase>();
        trackRepositoryMock = Mock.ofType<TrackRepositoryBase>();
        notificationServiceMock = Mock.ofType<NotificationServiceBase>();
        loggerMock = Mock.ofType<Logger>();
        artistArtworkGetterMock = Mock.ofType<OnlineArtistArtworkGetter>();
        guidFactoryMock = Mock.ofType<GuidFactory>();

        artistArtworkAdder = new ArtistArtworkAdder(
            artistArtworkCacheServiceMock.object,
            artistArtworkRepositoryMock.object,
            trackRepositoryMock.object,
            notificationServiceMock.object,
            loggerMock.object,
            artistArtworkGetterMock.object,
        );

        artistsKey = new ArtistsKey(`;${artist};`);
    });

    describe('addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync', () => {
        it('should get artist data that needs indexing', async () => {
            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing(), Times.exactly(1));
        });

        it('should notify that artist artwork is being updated if it is the first time that indexing runs', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
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
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
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
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [new ArtistsKey('')]);
            artistArtworkRepositoryMock
                .setup((x) => x.getNumberOfArtistArtwork())
                .returns(() => 10);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            notificationServiceMock.verify((x) => x.updatingArtistArtworkAsync(), Times.never());
        });

        it('should not add artist artwork to the cache if no artist artwork was found', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
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
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
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
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
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
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(artist))
                .returns(() => Promise.resolve(artistArtworkData));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.disableNeedsArtistArtworkIndexing(artistsKey.artistsKey), Times.exactly(1));
        });

        it('should not add artist artwork to the database if the artwork was not added to the cache', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
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
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(artist))
                .returns(() => Promise.resolve(artistArtworkData));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            const newArtistArtwork: ArtistArtwork = new ArtistArtwork(artist, artistArtworkCacheId.id);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkRepositoryMock.verify((x) => x.addArtistArtwork(newArtistArtwork), Times.exactly(1));
        });

        it('should load artwork for each individual artist only once', async () => {
            // Arrange
            const artistsKey1 = new ArtistsKey(';aerosmith;alanis morissette;');
            const artistsKey2 = new ArtistsKey(';alanis morissette;aerosmith;');
            const artistsKey3 = new ArtistsKey(';alanis morissette;');
            const artistsKey4 = new ArtistsKey(';aerosmith;');
            trackRepositoryMock
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey1, artistsKey2, artistsKey3, artistsKey4]);

            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(It.isAnyString()))
                .returns(() => Promise.resolve(artistArtworkData));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkGetterMock.verify((x) => x.getOnlineArtworkAsync('aerosmith'), Times.exactly(1));
            artistArtworkGetterMock.verify((x) => x.getOnlineArtworkAsync('alanis morissette'), Times.exactly(1));
        });

        it('should disable NeedsArtistArtworkIndexing when downloading artwork for all individual artists succeeds', async () => {
            // Arrange
            artistsKey = new ArtistsKey(';aerosmith;alanis morissette;');
            trackRepositoryMock
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(It.isAnyString()))
                .returns(() => Promise.resolve(artistArtworkData));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.disableNeedsArtistArtworkIndexing(artistsKey.artistsKey), Times.exactly(1));
        });

        it('should disable NeedsArtistArtworkIndexing for unknown artists', async () => {
            // Arrange
            artistsKey = new ArtistsKey('');
            trackRepositoryMock
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkGetterMock.verify((x) => x.getOnlineArtworkAsync(It.isAnyString()), Times.never());
            trackRepositoryMock.verify((x) => x.disableNeedsArtistArtworkIndexing(artistsKey.artistsKey), Times.exactly(1));
        });

        it('should not disable NeedsArtistArtworkIndexing when downloading artwork for one artist fails', async () => {
            // Arrange
            artistsKey = new ArtistsKey(';aerosmith;alanis morissette;');
            trackRepositoryMock
                .setup((x) => x.getArtistsKeysOfArtistsThatNeedsArtworkIndexing())
                .returns(() => [artistsKey]);
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync('aerosmith'))
                .returns(() => Promise.resolve(artistArtworkData));
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync('alanis morissette'))
                .returns(() => Promise.resolve(undefined));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.disableNeedsArtistArtworkIndexing(artistsKey.artistsKey), Times.never());
        });
    });
});
