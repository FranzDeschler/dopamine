import { IMock, It, Mock } from 'typemoq';
import { LastfmArtist } from '../../common/api/lastfm/lastfm-artist';
import { ImageProcessor } from '../../common/image-processor';
import { Logger } from '../../common/logger';
import { OnlineArtistArtworkGetter } from './online-artist-artwork-getter';
import { LastfmApi } from '../../common/api/lastfm/lastfm.api';

const artist = 'metallica';
const expectedArtistArtwork: Buffer = Buffer.from([1, 2, 3]);
const imageUrl = 'https://images.com/image.png';

describe('OnlineArtistArtworkGetter', () => {
    let imageProcessorMock: IMock<ImageProcessor>;
    let lastfmApiMock: IMock<LastfmApi>;
    let loggerMock: IMock<Logger>;
    let onlineArtistArtworkGetter: OnlineArtistArtworkGetter;
    let lastfmArtist: LastfmArtist;

    beforeEach(() => {
        imageProcessorMock = Mock.ofType<ImageProcessor>();
        lastfmApiMock = Mock.ofType<LastfmApi>();
        loggerMock = Mock.ofType<Logger>();

        onlineArtistArtworkGetter = new OnlineArtistArtworkGetter(
            imageProcessorMock.object,
            lastfmApiMock.object,
            loggerMock.object,
        );

        lastfmArtist = new LastfmArtist();
        lastfmArtist.imageMega = imageUrl;
    });

    describe('getOnlineArtistArtworkAsync', () => {
        it('should return undefined if converting file to data throws error', async () => {
            // Arrange
            lastfmApiMock
                .setup((x) => x.getArtistInfoAsync(It.isAnyString(), false, 'EN'))
                .returns(() => Promise.resolve(lastfmArtist));
            imageProcessorMock
                .setup((x) => x.convertOnlineImageToBufferAsync(It.isAnyString()))
                .throws(new Error('An error occurred'));

            // Act
            const actualArtistArtwork: Buffer | undefined = await onlineArtistArtworkGetter.getOnlineArtworkAsync(artist);

            // Assert
            expect(actualArtistArtwork).toBeUndefined();
        });

        it('should return undefined if getting online artist info throws error', async () => {
            // Arrange
            imageProcessorMock
                .setup((x) => x.convertOnlineImageToBufferAsync(imageUrl))
                .returns(() => Promise.resolve(expectedArtistArtwork));
            lastfmApiMock
                .setup((x) => x.getArtistInfoAsync(It.isAnyString(), false, 'EN'))
                .throws(new Error('An error occurred'));

            // Act
            const actualArtistArtwork: Buffer | undefined = await onlineArtistArtworkGetter.getOnlineArtworkAsync(artist);

            // Assert
            expect(actualArtistArtwork).toBeUndefined();
        });
    });
});