import { IMock, Mock, Times } from 'typemoq';
import { Logger } from '../../common/logger';
import { ArtistArtworkAdder } from './artist-artwork-adder';
import { ArtistArtworkIndexer } from './artist-artwork-indexer';
import { ArtistArtworkRemover } from './artist-artwork-remover';
import { NotificationServiceBase } from '../notification/notification.service.base';

describe('ArtistArtworkIndexer', () => {
    let artistArtworkRemoverMock: IMock<ArtistArtworkRemover>;
    let artistArtworkAdderMock: IMock<ArtistArtworkAdder>;
    let notificationServiceMock: IMock<NotificationServiceBase>;
    let loggerMock: IMock<Logger>;
    let artistArtworkIndexer: ArtistArtworkIndexer;

    beforeEach(() => {
        artistArtworkRemoverMock = Mock.ofType<ArtistArtworkRemover>();
        artistArtworkAdderMock = Mock.ofType<ArtistArtworkAdder>();
        notificationServiceMock = Mock.ofType<NotificationServiceBase>();
        loggerMock = Mock.ofType<Logger>();
        artistArtworkIndexer = new ArtistArtworkIndexer(
            artistArtworkRemoverMock.object,
            artistArtworkAdderMock.object,
            notificationServiceMock.object,
            loggerMock.object,
        );
    });

    describe('indexArtistArtworkAsync', () => {
        it('should remove artwork that has no track', async () => {
            // Arrange, Act
            await artistArtworkIndexer.indexArtistArtworkAsync();

            // Assert
            artistArtworkRemoverMock.verify((x) => x.removeArtistArtworkThatHasNoTrackAsync(), Times.exactly(1));
        });

        it('should remove artwork for tracks that need artist artwork indexing', async () => {
            // Arrange, Act
            await artistArtworkIndexer.indexArtistArtworkAsync();

            // Assert
            artistArtworkRemoverMock.verify((x) => x.removeArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync(), Times.exactly(1));
        });

        it('should add artwork for tracks that need artist artwork indexing', async () => {
            // Arrange, Act
            await artistArtworkIndexer.indexArtistArtworkAsync();

            // Assert
            artistArtworkAdderMock.verify((x) => x.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync(), Times.exactly(1));
        });

        it('should remove artwork that is not in the database from disk', async () => {
            // Arrange, Act
            await artistArtworkIndexer.indexArtistArtworkAsync();

            // Assert
            artistArtworkRemoverMock.verify((x) => x.removeArtistArtworkThatIsNotInTheDatabaseFromDiskAsync(), Times.exactly(1));
        });

        it('should dismiss the indexing notification', async () => {
            // Arrange, Act
            await artistArtworkIndexer.indexArtistArtworkAsync();

            // Assert
            notificationServiceMock.verify((x) => x.dismiss(), Times.exactly(1));
        });
    });
});
