/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import { importFromExcel, type ImportFile } from '../../libs/works/import';
import { type CurveUser, } from '../../libs/works/export';
import { Work } from '../../models/index';
import { type WorkDocument } from '../../models/index';

require('dotenv').config();
require('../../libs/db');


// Process to get testing data
// 1. Copy client
// 2. Export works
// 3. Delete works from the client
// 4. Remove Curve IDs from the works export
// 5. Import works
// 6. Copy original works using this script below
// 7. Move import data from original template to CSVs in the importData folder of the client


const clientSize = 'x-large';

const sizeClientIdMapping = {
    'small': '',
    'medium': '66180a87e4ee31325969481b',// 281 works - 13s
    'large': '63638db032aef9d4152271e0', // 3,526 works - 1m 20s
    'x-large': '61ba3c19fec82a05ecf1c1fa' // 
}

const curveUser: CurveUser = { 'id': '600ff2f8d497a0001b460d6d', 'clientId': sizeClientIdMapping[clientSize], 'email': 'soufiane@curveroyaltysystems.com' };



const files: Record<string, ImportFile> = {
    works: { 'originalname': 'works.csv', 'path': `${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/works.csv` },
    alternate_titles: { 'originalname': 'alternate_titles.csv', 'path': `${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/alternate_titles.csv` },
    ip_chains: { 'originalname': 'ip_chains.csv', 'path': `${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/ip_chains.csv` },
    participators: { 'originalname': 'participators.csv', 'path': `${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/participators.csv` },
    partner_ip_chains: { 'originalname': 'partner_ip_chains.csv', 'path': `${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/partner_ip_chains.csv` },
    society_identifiers: { 'originalname': 'society_identifiers.csv', 'path': `${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/society_identifiers.csv` },
    specific_participation_rates: { 'originalname': 'specific_participation_rates.csv', 'path': `${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/specific_participation_rates.csv` },
};

const oldWorks: JsonValue = JSON.parse(fs.readFileSync(`${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/originalWorks.json`, 'utf-8'));

console.log('Clearing old data..');

// Fetch original works
// Work.find({ clientId: sizeClientIdMapping[clientSize] }).then((works) => {
//     fs.writeFileSync(
//         `${__dirname}/importData/${clientSize}-${sizeClientIdMapping[clientSize]}/originalWorks.json`,
//         JSON.stringify(works, null, 2)
//     );
//     console.log('Finished copying works data');
//     process.exit(0);
// })


Work.deleteMany({ clientId: sizeClientIdMapping[clientSize] }).then(async () => {
    console.log('Cleared old data');
    console.log('Importing');
    await importFromExcel(files, curveUser, false);
    console.log('Done importing');
    process.exit(0);
    // console.log('Comparing works..')
    // Work.find({ clientId: sizeClientIdMapping[clientSize] }).lean().then(newWorks => {
    //     console.log('\n\n\n');
    //     compareImportData({ oldWorks: oldWorks as JsonValue[], newWorks: newWorks as JsonValue[] });
    //     console.log('\n\n\n');
    //     process.exit(0);
    // });
});



type JsonValue = WorkDocument | string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function compareImportData({ oldWorks, newWorks }: { oldWorks: JsonValue[], newWorks: JsonValue[] }) {
    const IGNORED_KEYS = new Set([
        '_id',
        '__v',
        'createdAt',
        'updatedAt',
        'significantUpdateDate',
        'partyNo', // TODO double check it's ok to skip
        'createdBy',
        'lastModifiedBy'
    ]);

    function normalize(value: JsonValue): JsonValue {
        if (value === null || value === undefined) return value;
        if (Array.isArray(value)) {
            const items = value.map(normalize);
            return items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        }
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'number') return Math.round(value * 10) / 10;
        if (typeof value === 'object') {
            const result: Record<string, JsonValue> = {};
            for (const key of Object.keys(value).sort()) {
                if (!IGNORED_KEYS.has(key)) {
                    const v = normalize((value as Record<string, JsonValue>)[key]!);
                    result[key] = key === 'caeNumber' && typeof v === 'string' ? v.replace(/^0+/, '') : v;
                }
            }
            return result;
        }
        return value;
    }

    function findDiffs(a: JsonValue, b: JsonValue, path: string): string[] {
        if (JSON.stringify(a) === JSON.stringify(b)) return [];

        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) {
                return [`[${path}] array length differs: old=${a.length}, new=${b.length}`];
            }
            return a.flatMap((item, i) => findDiffs(item, b[i]!, `${path}[${i}]`));
        }

        if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
            const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
            return Array.from(keys).sort().flatMap(key => {
                if (!(key in a)) return [`[${path}.${key}] added in new: ${JSON.stringify((b as Record<string, JsonValue>)[key])}`];
                if (!(key in b)) return [`[${path}.${key}] removed in new, was: ${JSON.stringify((a as Record<string, JsonValue>)[key])}`];
                return findDiffs((a as Record<string, JsonValue>)[key]!, (b as Record<string, JsonValue>)[key]!, `${path}.${key}`);
            });
        }

        return [`[${path}] changed: old=${JSON.stringify(a)}, new=${JSON.stringify(b)}`];
    }

    function getWorkKey(work: JsonValue): string {
        if (work !== null && typeof work === 'object' && !Array.isArray(work)) {
            const w = work as Record<string, JsonValue>;
            return String(w.iswc ?? w.identifier ?? w.title ?? '');
        }
        return '';
    }

    const oldMap = new Map(oldWorks.map(w => [getWorkKey(w), w]));
    const newMap = new Map(newWorks.map(w => [getWorkKey(w), w]));
    const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

    const totalDiffs = Array.from(allKeys).sort().reduce((count, key) => {
        const oldWork = oldMap.get(key);
        const newWork = newMap.get(key);

        if (!oldWork) {
            console.log(`[ADDED] "${key}"`);
            return count + 1;
        }
        if (!newWork) {
            console.log(`[MISSING] "${key}" not found in new data`);
            return count + 1;
        }

        const diffs = findDiffs(normalize(oldWork), normalize(newWork), key);
        diffs.forEach(d => console.log(d));
        return count + diffs.length;
    }, 0);

    console.log('\n\n\n');

    if (totalDiffs === 0) {
        console.log('\x1b[42m\x1b[30m SUCCESS: ALL WORKS MATCH \x1b[0m');
    } else {
        console.log(`\x1b[41m\x1b[97m ERROR: ${totalDiffs} DIFFERENCE(S) FOUND \x1b[0m`);
    }
}