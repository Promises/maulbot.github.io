#!/usr/bin/env node
/*
 * Writes src/mazeDesigner/races.json: the races and towers the Maze Designer offers, from the
 * map repo's own race data (its scripts/race-data.js), with only the fields the designer uses.
 * Run it again whenever the map's towers change:
 *
 *     node scripts/maze-designer-data.js <path to the Warcraft-Maul-Reimagined checkout>
 */
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const mapRepo = process.argv[2];
if (!mapRepo || !fs.existsSync(path.join(mapRepo, 'scripts', 'race-data.js'))) {
    console.error('usage: node scripts/maze-designer-data.js <path to the Warcraft-Maul-Reimagined checkout>');
    process.exit(1);
}

const run = (command, args) => execFileSync(command, args, {cwd: mapRepo, encoding: 'utf8', maxBuffer: 64 << 20});
const races = JSON.parse(run('node', ['scripts/race-data.js']));
const commit = run('git', ['rev-parse', '--short', 'HEAD']).trim();

const out = {
    source: {commit, generated: new Date().toISOString().slice(0, 10)},
    races: races.map((race) => ({
        name: race.name,
        tier: race.tier,
        enabled: race.enabled,
        towers: race.towers.map((tower) => ({
            id: tower.id,
            name: tower.name,
            gold: tower.gold,
            food: tower.food,
            foodMade: tower.foodMade,
            attacks: tower.attacks && {
                type: tower.attacks.type,
                range: tower.attacks.range,
                damageMin: tower.attacks.damageMin,
                damageMax: tower.attacks.damageMax,
            },
            upgradesTo: tower.upgradesTo,
        })),
    })),
};

const file = path.join(__dirname, '..', 'src', 'mazeDesigner', 'races.json');
fs.mkdirSync(path.dirname(file), {recursive: true});
fs.writeFileSync(file, JSON.stringify(out) + '\n');
const towers = out.races.reduce((n, race) => n + race.towers.length, 0);
console.log(`${path.relative(process.cwd(), file)}: ${out.races.length} races, ${towers} towers, map ${commit}`);
