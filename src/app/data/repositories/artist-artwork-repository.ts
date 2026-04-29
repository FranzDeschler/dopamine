/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@angular/core';
import { DatabaseFactory } from '../database-factory';
import { ArtistArtwork } from '../entities/artist-artwork';
import { ArtistArtworkRepositoryBase } from './artist-artwork-repository.base';

@Injectable()
export class ArtistArtworkRepository implements ArtistArtworkRepositoryBase {
    public constructor(private databaseFactory: DatabaseFactory) {}

    public addArtistArtwork(artistArtwork: ArtistArtwork): void {
        const statement = this.database.prepare('INSERT INTO ArtistArtwork (ArtistKey, ArtworkID) VALUES (?, ?);');
        statement.run(artistArtwork.artistKey, artistArtwork.artworkId);
    }

    public getAllArtistArtwork(): ArtistArtwork[] | undefined {
        const statement = this.database.prepare(
            `SELECT ArtistArtworkID as artistArtworkId, ArtistKey as artistKey, ArtworkID as artworkId FROM ArtistArtwork;`,
        );

        return statement.all();
    }

    public getNumberOfArtistArtwork(): number {
        const statement = this.database.prepare(`SELECT COUNT(*) AS numberOfArtistArtwork FROM ArtistArtwork;`);
        const result: any = statement.get();
        return result.numberOfArtistArtwork;
    }

    public getNumberOfArtistArtworkThatHasNoTrack(): number {
        const statement = this.database.prepare(
            `SELECT COUNT(*) AS numberOfArtistArtwork
            FROM ArtistArtwork
            WHERE ArtistKey NOT IN (SELECT ArtistKey FROM Track);`,
        );

        const result: any = statement.get();
        return result.numberOfArtistArtwork;
    }

    public deleteArtistArtworkThatHasNoTrack(): number {
        const statement = this.database.prepare(
            `DELETE FROM ArtistArtwork WHERE ArtistKey NOT IN (SELECT ArtistKey FROM Track);`,
        );

        const info = statement.run();
        return info.changes;
    }

    public getNumberOfArtistArtworkForTracksThatNeedArtistArtworkIndexing(): number {
        const statement = this.database.prepare(
            `SELECT COUNT(*) AS numberOfArtistArtwork 
            FROM ArtistArtwork 
            WHERE ArtistKey IN (SELECT ArtistKey FROM Track WHERE NeedsArtistArtworkIndexing = 1);`,
        );

        const result: any = statement.get();
        return result.numberOfArtistArtwork;
    }

    public deleteArtistArtworkForTracksThatNeedArtistArtworkIndexing(): number {
        const statement = this.database.prepare(
            `DELETE FROM ArtistArtwork
            WHERE ArtistKey IN (SELECT ArtistKey FROM Track WHERE NeedsArtistArtworkIndexing = 1);`
        );

        const info = statement.run();
        return info.changes;
    }

    private get database(): any {
        return this.databaseFactory.create();
    }
}
