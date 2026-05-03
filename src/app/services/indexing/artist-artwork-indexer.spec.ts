import { IMock, Mock, Times } from 'typemoq';
import { Logger } from '../../common/logger';
import { ArtistArtworkAdder } from './artist-artwork-adder';
import { ArtistArtworkIndexer } from './artist-artwork-indexer';
import { ArtistArtworkRemover } from './artist-artwork-remover';
import { NotificationServiceBase } from '../notification/notification.service.base';
import { SettingsMock } from '../../testing/settings-mock';

describe('ArtistArtworkIndexer', () => {
    let artistArtworkRemoverMock: IMock<ArtistArtworkRemover>;
    let artistArtworkAdderMock: IMock<ArtistArtworkAdder>;
    let notificationServiceMock: IMock<NotificationServiceBase>;
    let loggerMock: IMock<Logger>;
    let artistArtworkIndexer: ArtistArtworkIndexer;
    let settingsMock: SettingsMock;

    beforeEach(() => {
        artistArtworkRemoverMock = Mock.ofType<ArtistArtworkRemover>();
        artistArtworkAdderMock = Mock.ofType<ArtistArtworkAdder>();
        notificationServiceMock = Mock.ofType<NotificationServiceBase>();
        loggerMock = Mock.ofType<Logger>();
        settingsMock = new SettingsMock();
        artistArtworkIndexer = new ArtistArtworkIndexer(
            artistArtworkRemoverMock.object,
            artistArtworkAdderMock.object,
            notificationServiceMock.object,
            loggerMock.object,
            settingsMock,
        );

        settingsMock.showArtistImages = true;
    });

    describe('indexArtistArtworkAsync', () => {
        it('should do nothing if showing artist images is disabled in the settings', async () => {
            // Arrange
            settingsMock.showArtistImages = false;

            // Act
            await artistArtworkIndexer.indexArtistArtworkAsync();

            // Assert
            artistArtworkRemoverMock.verify((x) => x.removeArtistArtworkThatHasNoTrackAsync(), Times.never());
            artistArtworkRemoverMock.verify((x) => x.removeArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync(), Times.never());
            artistArtworkAdderMock.verify((x) => x.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync(), Times.never());
            artistArtworkRemoverMock.verify((x) => x.removeArtistArtworkThatIsNotInTheDatabaseFromDiskAsync(), Times.never());
        });

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
