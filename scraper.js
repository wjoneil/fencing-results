const tableauRounds = [
	'aff_deround_128', 
	'aff_deround_64', 
	'aff_deround_32', 
	'aff_deround_16',
	'aff_deround_8',
	'aff_deround_4',
	'aff_deround_2',
	'aff_deround_1'
];

const roundMap = {
	poules: 'Poules',
	aff_deround_128: 'Round of 128',
	aff_deround_64: 'Round of 64',
	aff_deround_32: 'Round of 32',
	aff_deround_16: 'Round of 16',
	aff_deround_8: 'Round of 8',
	aff_deround_4: 'Semi-Finals',
	aff_deround_2: 'Final'
}

function parseEventData($) {
	// e.g. 2017 - AFC#3 - Open Men's Epee
	const eventTitle = $('.page-header h2').text().trim();
	const pouleData = $('.aff_pouletable');
	const tableauData = $('.aff_de');
	
	const poules = parsePouleData($, pouleData);
	const resultsFromPoules = createBoutsFromPoules(eventTitle, poules);
	
	// TODO: record seeding values for DEs
	// and store against the relevant fencers' entry
	const resultsFromTableaux = parseTableauData($, eventTitle, tableauData);

	return [...resultsFromPoules, ...resultsFromTableaux];
}

function parsePouleData($, pouleData) {
	const resultsFromPoules = [];
	pouleData.each((pouleIndex, pouleTable) => {
		const $pouleTable = $(pouleTable);
		const lines = $pouleTable.find('.aff_pouleline');
		// count how many fencers are in the poule
		// this informs the size of the table we're parsing
		const size = lines.length;
		const pouleResults = new Array(size).fill([]);

		$pouleTable.find('.aff_pouleline').each((lineIndex, pouleLine) => {
			const fencer = $(pouleLine).children().eq(1).text().trim(); //e.g. BARNES, Samuel
			const results = $(pouleLine).children().slice(2, size+2);
			pouleResults[lineIndex] = parsePouleLine($, fencer, results);
		});
		resultsFromPoules[pouleIndex] = pouleResults;
	});
	return resultsFromPoules;
}

function parsePouleLine($, fencer, results) {
	// results is a cheerio object, so we must
	// convert this mapped result back into an 
	// array before returning it

	return results.map((index, result) => {
		const resultToAdd = {};

		if (!$(result).hasClass('aff_pouleblank')) {
			resultToAdd.fencer = fencer;
			// a score in the poule table is either a V, a number,
			// or a victory from time expiring (e.g. V4)
			const score = $(result).text();
			const parsedScore = Number.parseInt(score);
			if (score === 'V') {
				resultToAdd.score = 5;
			} else if (!Number.isNaN(parsedScore)) {
				resultToAdd.score = parsedScore;
			} else {
				resultToAdd.score = Number.parseInt(score.slice(1));
			}
			resultToAdd.victory = $(result).hasClass('aff_poulevictory');
		}
		return resultToAdd;
	}).toArray();
}

function parseTableauData($, eventTitle, tableauData) {
	const results = [];
	tableauData.each((tableIndex, tableau) => {
		const $tableau = $(tableau);

		let roundIndex;
		for (roundIndex = 0; roundIndex < tableauRounds.length; roundIndex++) {
			const roundClass = tableauRounds[roundIndex];
			const nextRoundClass = tableauRounds[tableauRounds.indexOf(roundClass) + 1];
			const rows = $tableau.find(`tr:has(.${roundClass})`);
			const rowsForNextRound = $tableau.find(`tr:has(.${nextRoundClass})`);

			if (!rows.length) {
				continue;
			}
			
			// the breakout condition for the traversal of rounds is when there are
			// no entries for the subesquent round in the table because they're in
			// the next tableau record
			if (!rowsForNextRound.length) {
				break;
			}

			let i;
			for (i = 0; i < rows.length; i=i+2) {
				// get a bout; bouts always come in pairs
				const rowsForThisBout = rows.slice(i, i+2);
				const scores = parseTableauLines($, rowsForThisBout);

				// byes are indicated by a blank cell
				if (!(scores.length && scores.every(x => (!!x.fencer)))) {
					continue;
				}

				// from the first fencer's row, find the first row for the next round
				// that row's next sibling contains the score for this round
				const boutResult = rows
												.eq(i)
												.nextAll(`tr:has(.${nextRoundClass})`)
												.first()
												.next()
												.find('.aff_de_score')
												.text()
												.trim()
												.split(' / ');

				if (boutResult.length != 2) {
					throw new Error('Failed to parse score from tableau');
				}

				scores.forEach((entry) => {
					const entryScore = boutResult[entry.victory ? 0 : 1];
					const parsedEntryScore = Number.parseInt(entryScore);
					if (Number.isNaN(parsedEntryScore)) {
						throw new Error('Failed to convert string score to int');
					}
					entry.score = parsedEntryScore;
				});

				const round = roundMap[roundClass];
				const result = createBoutResult(eventTitle, round, ...scores);
				results.push(result);
			}
		}
	});
	return results;
}

function parseTableauLines($, lines) {
	return lines.map((index, line) => {
		return parseSingleTableauLine($(line));
	}).toArray();
}

function parseSingleTableauLine(line) {
	const fencerCell = line.find('.aff_def,.aff_vic');
	return {
		fencer: fencerCell.text().trim(),
		victory: fencerCell.hasClass('aff_vic')
	};
}

function createBoutsFromPoules(eventTitle, poules) {
	const results = [];
	poules.forEach((poule) => {
		poule.forEach((line, i) => {
			line.forEach((score, j) => {
				// we only want the top half of the table
				// because we'll copy the corresponding
				// score from the other half
				if (j > i) {
					const correspondingScore = poule[j][i];
					const result = createBoutResult(eventTitle, roundMap.poules, score, correspondingScore);
					results.push(result);
				}
			});
		});
	});
	return results;
}

function createBoutResult(event, round, ...scores) {
	const fencers = scores.map((score) => (score.fencer));
	return {event, round, fencers, scores};
}

module.exports = {
	parseEventData: parseEventData
}