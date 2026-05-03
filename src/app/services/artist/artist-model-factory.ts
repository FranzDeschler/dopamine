import { ArtistModel } from './artist-model';
import { ApplicationPaths } from '../../common/application/application-paths';
import { TranslatorService } from '../translator/translator.service';

export class ArtistModelFactory {
    public constructor(
        private translatorService: TranslatorService,
        private applicationPaths: ApplicationPaths,
    ) {}

    public create(artistName: string, artworkId: string | undefined): ArtistModel {
        return new ArtistModel(artistName, artworkId, this.translatorService, this.applicationPaths);
    }
}