const fs = require('fs');
const path = require('path');
const request = require('request-promise-native');
const cheerio = require('cheerio');
const scraper = require('./scraper.js');

const AUSFENCING_URL_BASE = 'http://ausfencing.org/home/index.php?view=article&id=';

const options = {
	uri: `${AUSFENCING_URL_BASE}5582`,
	transform: (body) => (cheerio.load(body))
};

// seems wasteful to make new requests while we're debugging this code
try {
		const filename = path.join('testfiles', 'afc3-mens-epee.html');
    var data = fs.readFileSync(filename, 'utf8');
    scraper.parseEventData(cheerio.load(data));

} catch(e) {
    console.log('Error:', e.stack);
}

// request(options).then(parseEventData).catch(function(error) {
// 	console.error(error);
// })
