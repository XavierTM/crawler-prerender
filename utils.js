
const fsNoPromises = require('fs');
const fs = fsNoPromises.promises;
const isbot = require('isbot');


function pathExists(path) {

	return new Promise((resolve) => {
		fsNoPromises.access(path, fsNoPromises.F_OK, (err) => {
			if (err)
				resolve(false);
			else
				resolve(true);
		});
	});

}



function absoluteToFullUrl(base, absolute) {
	return base + absolute;
}



function relativeToFullUrl(url, relative) {
	return `${url}/${relative}`;
}



function baseUrl(url) {

	let indexOfFirstSingleSlash;

	for (let i = 0; i < url.length; i++) {

		const xter = url.charAt(i);

		if (xter !== '/')
			continue;

		try {
			
			if (url.charAt(i - 1) === '/')
				continue;
			if (url.charAt(i + 1) === '/') {
				i++; // jumping the next, since it won't qualify anyway
				continue;
			}

			indexOfFirstSingleSlash = i;
			break;

		} catch(err) {
			continue;
		}
	}

	let baseUrl;

	if (indexOfFirstSingleSlash)
		baseUrl = url.substring(0, indexOfFirstSingleSlash);
	else
		baseUrl = url;

	return baseUrl;

}



function urlType(url) {

	if (typeof url !== 'string' || url.length === 0)
		return null;

	if (/^http/i.test(url))
		return 'full';

	if (/^localhost/gi.test(url))
		return 'full';

	if (/^[^\/]+\.[^\/]+/.test(url))
		return 'full';

	if (/^\//.test(url))
		return 'absolute';

	return 'relative';

}


function checkIfBot(req) {
	const userAgent = req.headers['user-agent'];
	return isbot(userAgent);
}


async function saveRenderedHTML(DOM, filePath) {

	console.log('saveRenderedHTML', { filePath})
	const html = DOM.serialize();
	await fs.writeFile(filePath, html, 'utf8');
}


module.exports = {
	absoluteToFullUrl,
	baseUrl,
	checkIfBot,
	pathExists,
	relativeToFullUrl,
	saveRenderedHTML,
	urlType
}