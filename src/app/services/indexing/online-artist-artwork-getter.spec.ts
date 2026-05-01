import { IMock, It, Mock } from 'typemoq';
import { LastfmArtist } from '../../common/api/lastfm/lastfm-artist';
import { ImageProcessor } from '../../common/image-processor';
import { Logger } from '../../common/logger';
import { IFileMetadata } from '../../common/metadata/i-file-metadata';
import { OnlineArtistArtworkGetter } from './online-artist-artwork-getter';
import { LastfmApi } from '../../common/api/lastfm/lastfm.api';
import { SettingsMock } from '../../testing/settings-mock';

const expectedArtistArtwork: Buffer = Buffer.from([1, 2, 3]);
const imageUrl = 'https://images.com/image.png';

describe('OnlineArtistArtworkGetter', () => {
    let imageProcessorMock: IMock<ImageProcessor>;
    let lastfmApiMock: IMock<LastfmApi>;
    let loggerMock: IMock<Logger>;
    let settingsMock: SettingsMock;
    let metaDataMock: IMock<IFileMetadata>;
    let onlineArtistArtworkGetter: OnlineArtistArtworkGetter;
    let lastfmArtist: LastfmArtist;

    beforeEach(() => {
        imageProcessorMock = Mock.ofType<ImageProcessor>();
        lastfmApiMock = Mock.ofType<LastfmApi>();
        loggerMock = Mock.ofType<Logger>();
        settingsMock = new SettingsMock();
        metaDataMock = Mock.ofType<IFileMetadata>();

        onlineArtistArtworkGetter = new OnlineArtistArtworkGetter(
            imageProcessorMock.object,
            lastfmApiMock.object,
            loggerMock.object,
            settingsMock,
        );

        lastfmArtist = new LastfmArtist();
        lastfmArtist.imageMega = imageUrl;

        settingsMock.showArtistImages = true;

        imageProcessorMock
            .setup((x) => x.convertOnlineImageToBufferAsync(imageUrl))
            .returns(() => Promise.resolve(expectedArtistArtwork));

        lastfmApiMock
            .setup((x) => x.getArtistInfoAsync(It.isAnyString(), false, 'EN'))
            .returns(() => Promise.resolve(lastfmArtist));

        metaDataMock.setup((x) => x.albumAndTrackArtists).returns(() => ['Artist 1', 'Artist 2']);
    });

    describe('getOnlineArtistArtworkAsync', () => {
        it('should return undefined if showing artist images is disabled in the settings', async () => {
            // Arrange
            settingsMock.showArtistImages = false;

            // Act
            const actualArtistArtwork: Buffer | undefined = await onlineArtistArtworkGetter.getOnlineArtworkAsync(undefined);

            // Assert
            expect(actualArtistArtwork).toBeUndefined();
        });

        it('should return undefined if fileMetaData is undefined', async () => {
            // Act
            const actualArtistArtwork: Buffer | undefined = await onlineArtistArtworkGetter.getOnlineArtworkAsync(undefined);

            // Assert
            expect(actualArtistArtwork).toBeUndefined();
        });

        it('should return undefined if fileMetaData has no artists', async () => {
            // Arrange
            metaDataMock.setup((x) => x.albumAndTrackArtists).returns(() => []);

            // Act
            const actualArtistArtwork: Buffer | undefined = await onlineArtistArtworkGetter.getOnlineArtworkAsync(metaDataMock.object);

            // Assert
            expect(actualArtistArtwork).toBeUndefined();
        });

        it('should return artwork if fileMetaData has artists', async () => {
            // Act
            const actualArtistArtwork: Buffer | undefined = await onlineArtistArtworkGetter.getOnlineArtworkAsync(metaDataMock.object);

            // Assert
            expect(actualArtistArtwork).toBe(expectedArtistArtwork);
        });

        it('should return undefined if converting file to data throws error', async () => {
            // Arrange
            imageProcessorMock
                .setup((x) => x.convertOnlineImageToBufferAsync(It.isAnyString()))
                .throws(new Error('An error occurred'));

            // Act
            const actualArtistArtwork: Buffer | undefined = await onlineArtistArtworkGetter.getOnlineArtworkAsync(metaDataMock.object);

            // Assert
            expect(actualArtistArtwork).toBeUndefined();
        });

        it('should return undefined if getting online artist info throws error', async () => {
            // Arrange
            lastfmApiMock
                .setup((x) => x.getArtistInfoAsync(It.isAnyString(), false, 'EN'))
                .throws(new Error('An error occurred'));

            // Act
            const actualArtistArtwork: Buffer | undefined = await onlineArtistArtworkGetter.getOnlineArtworkAsync(metaDataMock.object);

            // Assert
            expect(actualArtistArtwork).toBeUndefined();
        });
    });
});