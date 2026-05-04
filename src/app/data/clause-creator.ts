import { StringUtils } from '../common/utils/string-utils';
import { Constants } from '../common/application/constants';

export class ClauseCreator {
    public static escapeQuotes(sourceString: string): string {
        return StringUtils.replaceAll(sourceString, `'`, `''`);
    }

    public static createTextInClause(columnName: string, clauseItems: string[]): string {
        const quotedClauseItems: string[] = clauseItems.map((item) => `'` + ClauseCreator.escapeQuotes(item) + `'`);
        const commaSeparatedItems: string = quotedClauseItems.join(',');

        return `${columnName} IN (${commaSeparatedItems})`;
    }

    public static createNumericInClause(columnName: string, clauseItems: number[]): string {
        const commaSeparatedItems: string = clauseItems.join(',');

        return `${columnName} IN (${commaSeparatedItems})`;
    }

    public static createOrLikeClause(columnName: string, clauseItems: string[], delimiter: string): string {
        let orLikeClause: string = '';

        orLikeClause += ' (';

        const orClauses: string[] = [];

        for (const clauseItem of clauseItems) {
            if (StringUtils.isNullOrWhiteSpace(clauseItem)) {
                orClauses.push(`(${columnName} IS NULL OR ${columnName}='')`);
            } else {
                orClauses.push(
                    `(LOWER(${columnName}) LIKE LOWER('%${delimiter}${StringUtils.replaceAll(clauseItem, `'`, `''`)}${delimiter}%'))`,
                );
            }
        }

        orLikeClause += orClauses.join(' OR ');
        orLikeClause += ')';

        return orLikeClause;
    }

    public static createOrLikeSplitArtistClause(sourceColumn: string, targetColumn: string, artistSplitSeparators: string): string {
        const delimiter: string = Constants.columnValueDelimiter;
        const separators: string[] = artistSplitSeparators.split(/\[([^\]]+)\]/g).filter((x: string) => x !== '');
        const orClauses: string[] = [];

        orClauses.push(`LOWER(${sourceColumn}) = '${delimiter}' || ${targetColumn} || '${delimiter}'`);
        for (const separator of separators) {
            orClauses.push(`LOWER(${sourceColumn}) LIKE '% ${separator} ' || ${targetColumn} || '${delimiter}%'`);
            orClauses.push(`LOWER(${sourceColumn}) LIKE '%${delimiter}' || ${targetColumn} || ' ${separator} %'`);
        }

        return '(' + orClauses.join(' OR ') + ')';
    }
}
