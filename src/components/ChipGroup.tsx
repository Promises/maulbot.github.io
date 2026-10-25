import styles from './ChipGroup.module.scss';

export interface ChipOption<T extends string> {
    value: T;
    label: string;
}

interface ChipGroupProps<T extends string> {
    label: string;
    options: ChipOption<T>[];
    value: T;
    onChange: (value: T) => void;
}

/** A row of game buttons picking one value; the picked one shows the pressed frame. */
function ChipGroup<T extends string>({label, options, value, onChange}: ChipGroupProps<T>) {
    return (
        <div className={styles.group} role="group" aria-label={label}>
            <span className={styles.label}>{label}</span>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={option.value === value}
                    className={option.value === value ? styles.chipActive : styles.chip}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export default ChipGroup;
