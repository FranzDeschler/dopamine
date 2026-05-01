import { IMock, It, Mock, Times } from 'typemoq';
import { GuidFactory } from '../../common/guid.factory';
import { Logger } from '../../common/logger';
import { IFileMetadata } from '../../common/metadata/i-file-metadata';
import { ArtistArtworkCacheId } from '../artist-artwork-cache/artist-artwork-cache-id';
import { ArtistArtworkAdder } from './artist-artwork-adder';
import { ArtistArtworkCacheServiceBase } from '../artist-artwork-cache/artist-artwork-cache.service.base';
import { ArtistArtworkRepositoryBase } from '../../data/repositories/artist-artwork-repository.base';
import { TrackRepositoryBase } from '../../data/repositories/track-repository.base';
import { FileMetadataFactory } from '../../common/metadata/file-metadata.factory';
import { ArtistData } from '../../data/entities/artist-data';
import { Track } from '../../data/entities/track';
import { ArtistArtwork } from '../../data/entities/artist-artwork';
import { NotificationServiceBase } from '../notification/notification.service.base';
import { OnlineArtistArtworkGetter } from './online-artist-artwork-getter';

class FileMetadataImplementation implements IFileMetadata {
    public path: string;
    public bitRate: number;
    public sampleRate: number;
    public durationInMilliseconds: number;
    public title: string;
    public album: string;
    public albumArtists: string[];
    public artists: string[];
    public genres: string[];
    public comment: string;
    public grouping: string;
    public year: number;
    public trackNumber: number;
    public trackCount: number;
    public discNumber: number;
    public discCount: number;
    public lyrics: string;
    public picture: Buffer;
    public rating: number;
    public composers: string[];
    public conductor: string;
    public beatsPerMinute: number;
    public save(): void {}
    public async loadAsync(): Promise<void> {}
    public get albumAndTrackArtists(): string[] {
        return [];
    }
}

const trackPath = '/home/user/Music/track.mp3';
const artistKey = 'ArtistKey1';
const artistArtworkData: Buffer = Buffer.from([1, 2, 3]);

describe('ArtistArtworkAdder', () => {
    let artistArtworkCacheServiceMock: IMock<ArtistArtworkCacheServiceBase>;
    let artistArtworkRepositoryMock: IMock<ArtistArtworkRepositoryBase>;
    let trackRepositoryMock: IMock<TrackRepositoryBase>;
    let fileMetadataFactoryMock: IMock<FileMetadataFactory>;
    let notificationServiceMock: IMock<NotificationServiceBase>;
    let loggerMock: IMock<Logger>;
    let artistArtworkGetterMock: IMock<OnlineArtistArtworkGetter>;
    let guidFactoryMock: IMock<GuidFactory>;

    let artistArtworkAdder: ArtistArtworkAdder;
    let artistData: ArtistData;
    let track: Track;
    let fileMetadataStub: FileMetadataImplementation;

    beforeEach(() => {
        artistArtworkCacheServiceMock = Mock.ofType<ArtistArtworkCacheServiceBase>();
        artistArtworkRepositoryMock = Mock.ofType<ArtistArtworkRepositoryBase>();
        trackRepositoryMock = Mock.ofType<TrackRepositoryBase>();
        fileMetadataFactoryMock = Mock.ofType<FileMetadataFactory>();
        notificationServiceMock = Mock.ofType<NotificationServiceBase>();
        loggerMock = Mock.ofType<Logger>();
        artistArtworkGetterMock = Mock.ofType<OnlineArtistArtworkGetter>();
        guidFactoryMock = Mock.ofType<GuidFactory>();
        track = new Track(trackPath);
        fileMetadataStub = new FileMetadataImplementation();

        artistArtworkAdder = new ArtistArtworkAdder(
            artistArtworkCacheServiceMock.object,
            artistArtworkRepositoryMock.object,
            trackRepositoryMock.object,
            fileMetadataFactoryMock.object,
            notificationServiceMock.object,
            loggerMock.object,
            artistArtworkGetterMock.object,
        );

        artistData = new ArtistData('Ville Valo');
        artistData.artistKey = artistKey;
    });

    describe('addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync', () => {
        it('should get artist data that needs indexing', async () => {
            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.getArtistDataThatNeedsIndexing(), Times.exactly(1));
        });

        it('should notify that artist artwork is being updated if it is the first time that indexing runs', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
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
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            artistArtworkRepositoryMock
                .setup((x) => x.getNumberOfArtistArtwork())
                .returns(() => 10);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            notificationServiceMock.verify((x) => x.updatingArtistArtworkAsync(), Times.never());
        });

        it('should not get the last modified track for an artist key if there is no artist data that needs indexing', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => []);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.getLastModifiedTrackForArtistKeyAsync(It.isAny()), Times.never());
        });

        it('should get the last modified track for an artist key if there is artist data that needs indexing', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey), Times.exactly(1));
        });

        it('should not create a read-only file metadata if there is no last modified track for the given artist key', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => undefined);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            fileMetadataFactoryMock.verify((x) => x.createAsync(It.isAny()), Times.never());
        });

        it('should create a read-only file metadata if there is a last modified track for the given artist key', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => track);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            fileMetadataFactoryMock.verify((x) => x.createAsync(trackPath), Times.exactly(1));
        });

        it('should get artist artwork if a read-only file metadata was created', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => track);
            fileMetadataFactoryMock
                .setup((x) => x.createAsync(trackPath))
                .returns(() => Promise.resolve(fileMetadataStub));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkGetterMock.verify((x) => x.getOnlineArtworkAsync(It.isAny()), Times.exactly(1));
        });

        it('should not add artist artwork to the cache if no artist artwork data was found', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => track);
            fileMetadataFactoryMock
                .setup((x) => x.createAsync(trackPath))
                .returns(() => Promise.resolve(fileMetadataStub));
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(fileMetadataStub))
                .returns(() => Promise.resolve(undefined));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkCacheServiceMock.verify((x) => x.addArtworkDataToCacheAsync(It.isAny()), Times.never());
        });

        it('should add artist artwork to the cache if artist artwork data was found', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => track);
            fileMetadataFactoryMock
                .setup((x) => x.createAsync(trackPath))
                .returns(() => Promise.resolve(fileMetadataStub));
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(fileMetadataStub))
                .returns(() => Promise.resolve(artistArtworkData));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkCacheServiceMock.verify((x) => x.addArtworkDataToCacheAsync(artistArtworkData), Times.exactly(1));
        });

        it('should not disable artist artwork indexing for the given artist key if the artwork was not added to the cache', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => track);
            fileMetadataFactoryMock
                .setup((x) => x.createAsync(trackPath))
                .returns(() => Promise.resolve(fileMetadataStub));
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(undefined));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.disableNeedsArtistArtworkIndexing(artistKey), Times.never());
        });

        it('should disable artist artwork indexing for the given artist key if the artwork was added to the cache', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => track);
            fileMetadataFactoryMock
                .setup((x) => x.createAsync(trackPath))
                .returns(() => Promise.resolve(fileMetadataStub));
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(fileMetadataStub))
                .returns(() => Promise.resolve(artistArtworkData));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            trackRepositoryMock.verify((x) => x.disableNeedsArtistArtworkIndexing(artistKey), Times.exactly(1));
        });

        it('should not add artist artwork to the database if the artwork was not added to the cache', async () => {
            // Arrange
            trackRepositoryMock
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => track);
            fileMetadataFactoryMock
                .setup((x) => x.createAsync(trackPath))
                .returns(() => Promise.resolve(fileMetadataStub));
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
                .setup((x) => x.getArtistDataThatNeedsIndexing())
                .returns(() => [artistData]);
            trackRepositoryMock
                .setup((x) => x.getLastModifiedTrackForArtistKeyAsync(artistKey))
                .returns(() => track);
            fileMetadataFactoryMock
                .setup((x) => x.createAsync(trackPath))
                .returns(() => Promise.resolve(fileMetadataStub));
            artistArtworkGetterMock
                .setup((x) => x.getOnlineArtworkAsync(fileMetadataStub))
                .returns(() => Promise.resolve(artistArtworkData));

            const artistArtworkCacheId: ArtistArtworkCacheId = new ArtistArtworkCacheId(guidFactoryMock.object);
            artistArtworkCacheServiceMock
                .setup((x) => x.addArtworkDataToCacheAsync(artistArtworkData))
                .returns(() => Promise.resolve(artistArtworkCacheId));

            const newArtistArtwork1: ArtistArtwork = new ArtistArtwork(artistKey, artistArtworkCacheId.id);

            // Act
            await artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();

            // Assert
            artistArtworkRepositoryMock.verify((x) => x.addArtistArtwork(newArtistArtwork1), Times.exactly(1));
        });
    });
});
