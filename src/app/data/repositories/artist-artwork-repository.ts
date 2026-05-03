/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@angular/core';
import { DatabaseFactory } from '../database-factory';
import { ArtistArtwork } from '../entities/artist-artwork';
import { ArtistArtworkRepositoryBase } from './artist-artwork-repository.base';
import { ClauseCreator } from '../clause-creator';

@Injectable()
export class ArtistArtworkRepository implements ArtistArtworkRepositoryBase {
    public constructor(private databaseFactory: DatabaseFactory) {}

    public addArtistArtwork(artistArtwork: ArtistArtwork): void {
        const statement = this.database.prepare('INSERT INTO ArtistArtwork (Artist, ArtworkID) VALUES (?, ?);');
        statement.run(artistArtwork.artist, artistArtwork.artworkId);
    }

    public getAllArtistArtwork(): ArtistArtwork[] | undefined {
        const statement = this.database.prepare(
            `SELECT ArtistArtworkID as artistArtworkId, 
                    Artist as artist, 
                    ArtworkID as artworkId 
            FROM ArtistArtwork;`
        );

        return statement.all();
    }

    public getArtistArtworkForArtist(artist: string): ArtistArtwork | undefined {
        const statement = this.database.prepare(
            `SELECT ArtistArtworkID as artistArtworkId, 
                    Artist as artist, 
                    ArtworkID as artworkId 
            FROM ArtistArtwork
            WHERE Artist=?;`,
        );

        return statement.get(artist);
    }

    public getNumberOfArtistArtwork(): number {
        const statement = this.database.prepare(`SELECT COUNT(*) AS numberOfArtistArtwork FROM ArtistArtwork;`);
        const result: any = statement.get();
        return result.numberOfArtistArtwork;
    }

    public getNumberOfArtistArtworkThatHasNoTrack(): number {
        const statement = this.database.prepare(
            `SELECT COUNT(*) AS numberOfArtistArtwork
            FROM ArtistArtwork a
            WHERE NOT EXISTS (
                SELECT 1 FROM Track t
                WHERE ${this.trackArtistLikeArtworkArtist()}
            );`,
        );

        const result: any = statement.get();
        return result.numberOfArtistArtwork;
    }

    public deleteArtistArtworkThatHasNoTrack(): number {
        const statement = this.database.prepare(
            `DELETE FROM ArtistArtwork a 
             WHERE NOT EXISTS (
                SELECT 1 FROM Track t
                WHERE ${this.trackArtistLikeArtworkArtist()}
             );`,
        );

        const info = statement.run();
        return info.changes;
    }

    public getNumberOfArtistArtworkForTracksThatNeedArtistArtworkIndexing(): number {
        const statement = this.database.prepare(
            `SELECT COUNT(*) AS numberOfArtistArtwork 
             FROM ArtistArtwork a
             LEFT JOIN Track t ON ${this.trackArtistLikeArtworkArtist()}
             WHERE t.NeedsArtistArtworkIndexing = 1;`,
        );

        const result: any = statement.get();
        return result.numberOfArtistArtwork;
    }

    public deleteArtistArtworkForTracksThatNeedArtistArtworkIndexing(): number {
        const statement = this.database.prepare(
            `DELETE FROM ArtistArtwork a
             WHERE EXISTS (
                 SELECT 1 FROM Track t
                 WHERE ${this.trackArtistLikeArtworkArtist()}
                 AND t.NeedsArtistArtworkIndexing = 1
             );`,
        );

        const info = statement.run();
        return info.changes;
    }

    private get database(): any {
        return this.databaseFactory.create();
    }

    private trackArtistLikeArtworkArtist(): string {
        return ClauseCreator.createOrLikeColumnClause('t.Artists', 'a.Artist');
    }
}
