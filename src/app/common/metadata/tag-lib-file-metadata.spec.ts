import { IFileMetadata } from './i-file-metadata';
import { TagLibFileMetadata } from './tag-lib-file-metadata';

jest.mock('node-taglib-sharp', () => ({
    File: { createFromPath: jest.fn() },
    ByteVector: {},
    Id3v2FrameClassType: {},
    Id3v2FrameIdentifiers: {},
    Id3v2PopularimeterFrame: {},
    Id3v2Tag: {},
    PictureType: {},
    TagTypes: {},
}));

describe('TagLibFileMetadata', () => {
    describe('get albumAndTrackArtists', () => {
        it('should return empty array if there is no artist', () => {
            // Arrange
            const metadata: IFileMetadata = new TagLibFileMetadata('');

            // Act
            const artists: string[] = metadata.albumAndTrackArtists;

            // Assert
            expect(artists).toEqual([]);
        });

        it('should return only track artist if there is no album artist', () => {
            // Arrange
            const metadata: IFileMetadata = new TagLibFileMetadata('');
            metadata.artists = ['Ville Valo', 'Natalia Avelon'];

            // Act
            const artists: string[] = metadata.albumAndTrackArtists;

            // Assert
            expect(artists).toEqual(metadata.artists);
        });

        it('should return album and track artists', () => {
            // Arrange
            const metadata: IFileMetadata = new TagLibFileMetadata('');
            metadata.artists = ['Ville Valo', 'Natalia Avelon'];
            metadata.albumArtists = ['Ville Valo', 'yet another artist'];

            // Act
            const artists: string[] = metadata.albumAndTrackArtists;

            // Assert
            expect(artists).toEqual([...metadata.albumArtists, ...metadata.artists]);
        });
    });
});
