import {PlacedTower} from './analysis';
import {RaceIndex} from './races';

// Selecting towers the way the game does: a click selects one, shift-click adds or drops one,
// a double-click selects every tower of that kind.

/** The form a tower has now: the last of its chain. */
export const formOf = (tower: PlacedTower): string => tower.chain[tower.chain.length - 1];

/** A click on tower i: it alone (or nothing, when it was the only one selected); with shift, i toggled. */
export function clickSelection(selected: number[], i: number, additive: boolean): number[] {
    if (additive) {
        return selected.includes(i) ? selected.filter((k) => k !== i) : [...selected, i].sort((a, b) => a - b);
    }
    return selected.length === 1 && selected[0] === i ? [] : [i];
}

/** Every tower that is now the same form as tower i. */
export function sameForm(towers: PlacedTower[], i: number): number[] {
    const form = formOf(towers[i]);
    return towers.map((tower, k) => (formOf(tower) === form ? k : -1)).filter((k) => k >= 0);
}

/** The forms every selected tower can upgrade to. */
export function commonUpgrades(towers: PlacedTower[], selected: number[], index: RaceIndex): string[] {
    const options = selected.map((i) => index.byId.get(formOf(towers[i]))?.tower.upgradesTo || []);
    return options.length ? options[0].filter((id) => options.every((ids) => ids.includes(id))) : [];
}

export const upgradeAll = (towers: PlacedTower[], selected: number[], id: string): PlacedTower[] =>
    towers.map((tower, k) => (selected.includes(k) ? {...tower, chain: [...tower.chain, id]} : tower));

/** Takes back the last upgrade of every selected tower (a base tower stays as it is). */
export const downgradeAll = (towers: PlacedTower[], selected: number[]): PlacedTower[] =>
    towers.map((tower, k) => (selected.includes(k) && tower.chain.length > 1 ? {...tower, chain: tower.chain.slice(0, -1)} : tower));

export const removeAll = (towers: PlacedTower[], selected: number[]): PlacedTower[] =>
    towers.filter((_, k) => !selected.includes(k));

/** Every selected tower as a new base tower where it stands (its upgrades go with the old one). */
export const replaceAll = (towers: PlacedTower[], selected: number[], id: string): PlacedTower[] =>
    towers.map((tower, k) => (selected.includes(k) ? {...tower, chain: [id]} : tower));
