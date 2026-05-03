import { Injectable } from '@angular/core';
import { Logger } from '../../common/logger';
import { Timer } from '../../common/scheduling/timer';
import { ArtistArtworkAdder } from './artist-artwork-adder';
import { ArtistArtworkRemover } from './artist-artwork-remover';
import { NotificationServiceBase } from '../notification/notification.service.base';
import { SettingsBase } from '../../common/settings/settings.base';

@Injectable({ providedIn: 'root' })
export class ArtistArtworkIndexer {
    public constructor(
        private artistArtworkRemover: ArtistArtworkRemover,
        private artistArtworkAdder: ArtistArtworkAdder,
        private notificationService: NotificationServiceBase,
        private logger: Logger,
        private settings: SettingsBase,
    ) {}

    public async indexArtistArtworkAsync(): Promise<void> {
        if (!this.settings.showArtistImages) {
            return;
        }

        this.logger.info('+++ STARTED INDEXING ARTIST ARTWORK +++', 'ArtistArtworkIndexer', 'indexArtistArtworkAsync');

        const timer: Timer = new Timer();
        timer.start();

        await this.artistArtworkRemover.removeArtistArtworkThatHasNoTrackAsync();
        await this.artistArtworkRemover.removeArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();
        await this.artistArtworkAdder.addArtistArtworkForTracksThatNeedArtistArtworkIndexingAsync();
        await this.artistArtworkRemover.removeArtistArtworkThatIsNotInTheDatabaseFromDiskAsync();

        timer.stop();

        this.logger.info(
            `+++ FINISHED INDEXING ARTIST ARTWORK (Time required: ${timer.elapsedMilliseconds} ms) +++`,
            'ArtistArtworkIndexer',
            'indexArtistArtworkAsync',
        );

        this.notificationService.dismiss();
    }
}
