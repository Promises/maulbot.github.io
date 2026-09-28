/** Joins the class names that are set: classNames(styles.a, isB && styles.b). */
export default function classNames(...names: (string | false | null | undefined)[]): string {
    return names.filter(Boolean).join(' ');
}
