const { DataDelimiter } = require('./data-delimiter');

class ArtistKeyGenerator {
    generateArtistKey(albumArtists, trackArtists) {
        let artistKeyItems = [];

        if (albumArtists !== undefined && albumArtists.length !== 0) {
            albumArtists = albumArtists.filter((x) => x !== undefined && x !== '');
            artistKeyItems.push(...albumArtists);
        }

        if (trackArtists !== undefined && trackArtists.length !== 0) {
            trackArtists = trackArtists.filter((x) => x !== undefined && x !== '');
            artistKeyItems.push(...trackArtists);
        }

        return DataDelimiter.toDelimitedString(artistKeyItems);
    }
}

exports.ArtistKeyGenerator = ArtistKeyGenerator;
