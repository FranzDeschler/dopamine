export class ArrayUtils {
    public static isNullOrEmpty(array: any[]): boolean {
        return array == undefined || array.length === 0;
    }
}