
'use strict'

// dependencies
const fs = require('fs').promises;
const validURL = require('valid-url');
const axios_raw = require('axios');
const { JSDOM } = require('jsdom');

// constants
const CRAWLER_PRERENDER_BASE_PATH = `${__dirname}/crawler-prerender`;
const APPROXIMATE_RETRY_PERIOD = 2 * 60 * 1000;
const DEFAULT_RENDERING_TIMEOUT = 30000;

// utility functions

const {
	absoluteToFullUrl,
	baseUrl,
	checkIfBot,
	pathExists,
	relativeToFullUrl,
	saveRenderedHTML,
	urlType
} = require('./utils');


const settings = {};
const axios = axios_raw.create({
	headers: {
		'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/534.30 (KHTML, like Gecko) Ubuntu/11.04 Chromium/12.0.742.112 Chrome/12.0.742.112 Safari/534.30'
	}
});

const crawlerPrerender = async function(options = {}) {

	let error;

	// site url
	if (options.siteUrl) {

		let { siteUrl } = options;

		const urlIsValid = validURL.isUri(siteUrl); // it doesn't return a boolean

		if (!urlIsValid) {
			error = new Error(`invalid value for 'siteUrl'`);
			throw error;
		}

		if (!/:\/\//.test(siteUrl))
			siteUrl = 'http://' + siteUrl;

		settings.siteUrl = siteUrl;

	} else {
		error = new Error("'siteUrl' option is required");
		throw error;
	}

	// render timeout


	// base path for storing prerendered files
	let basePathExists;

	if (options.basePath) {

		settings.basePath = options.basePath;
		basePathExists = await pathExists(settings.basePath);

		if (basePathExists === false) {
			throw new Error('basePath does not exist');
			return;
		}

	} else {
		// use default path, create if it doesnot exists already
		settings.basePath = CRAWLER_PRERENDER_BASE_PATH;
		basePathExists = await pathExists(CRAWLER_PRERENDER_BASE_PATH);

		if (basePathExists === false)
			await fs.mkdir(CRAWLER_PRERENDER_BASE_PATH);

	}


	// return middlware
	return async function(req, res, next) {

		const isBot = checkIfBot(req);

		if (isBot) {

			const { basePath } = settings;
			const encodedFileName = encodeURIComponent(req.originalUrl);
			const filePath = `${basePath}/${encodedFileName}`;

			const fileExists = await pathExists(filePath);

			if (fileExists === false) {

				const shouldBeRenderedTimestamp = Date.now() + APPROXIMATE_RETRY_PERIOD;
				const shouldBeRenderedDateTimeObject = new Date(shouldBeRenderedTimestamp);
				const retryAfter = shouldBeRenderedDateTimeObject.toUTCString();

				// as per Google recommendation
				res.setHeader('Retry-After', retryAfter);
				res.sendStatus(503);

				await crawlerPrerender.prerender(req.originalUrl);

			} else {
				res.sendFile(filePath);
			}

		}  else {
			next();
		}
	}

}

crawlerPrerender.prerender = async function(path) {

	if (typeof path !== 'string' || path.length === 0)
		throw new Error('invalid path');

	// adding a leading slash if it doesn't exist
	if (path.charAt(0) !== '/')
		path = `/${path}`;

	// removing the trailing slash if it exists, and if the string length <> 1
	const pathLen = path.length;

	if (pathLen > 1) {
		if (path.charAt(pathLen - 1) ===  '/')
			path = path.substring(0, pathLen - 1);
	}

	try {

		const url = settings.siteUrl + path;

		let html, axiosResults, document, scripts;

		// get page html
		axiosResults = await axios.get(url);
		html = axiosResults.data;

		// creating a dormant DOM
		const dormantDOM = new JSDOM(html);
	
		// loading external scripts for execution
		document = dormantDOM.window.document;
		scripts = document.querySelectorAll('script');

		for (let i = 0; i < scripts.length; i++) {

			const script = scripts[i];
			const src = script.src;


			if (src && src !== '') { // checking if the script is external

				// removing the src and getting it's contents instead
				script.setAttribute('data-crawler-prerender-script-src', src); // preserving it's src attribute value
				script.removeAttribute('src');
				const url_type = urlType(src);

				const base_url = baseUrl(url);

				let scriptURL;

				switch (url_type) {

					case 'full':
						scriptURL = src;
						break;

					case 'absolute':
						scriptURL = absoluteToFullUrl(base_url, src);
						break;

					case 'relative':
						scriptURL = relativeToFullUrl(url, src);

					default:
						throw new Error('Invalid URL');

				}

				let response = await axios.get(scriptURL);
				const scriptContents = response.data;

				script.innerHTML = scriptContents;

			}
		}

		// create a DOM that will execute the scripts that will create contents
		html = dormantDOM.serialize();

		const options = { 
			runScripts: "dangerously",
			resources: "usable",
			url // very important
		};

		const DOM = new JSDOM(html, options);
		document = DOM.window.document;

		const encodedFileName = encodeURIComponent(path);
		const filePath = `${settings.basePath}/${encodedFileName}`;

		let timer;

		document.addEventListener('PAGE_COMPLETELY_RENDERED', async function() {

			clearTimeout(timer);

			// restoring src attributes for scripts
			scripts = document.querySelectorAll('script');

			for (let i = 0; i < scripts.length; i++) {

				const script = scripts[i];

				const dataCrawlerPrerenderScriptSrc = script.getAttribute('data-crawler-prerender-script-src');

				if (!dataCrawlerPrerenderScriptSrc)
					continue;

				script.removeAttribute('data-crawler-prerender-script-src');
				script.setAttribute('src', dataCrawlerPrerenderScriptSrc);
				script.innerHTML = '';

			}

			await saveRenderedHTML(DOM, filePath);

			console.log('Prerendered');

		});

		// timeout if the page took so much time to render
		timer = setTimeout(() => {
			const event = new DOM.window.Event('PAGE_COMPLETELY_RENDERED');
			document.dispatchEvent(event);
		}, DEFAULT_RENDERING_TIMEOUT);

	} catch(err) {
		// catching an error and recalling itself again
		console.log(err);
		//process.exit(0);
		//crawlerPrerender.prerender(path);
	}
} 


module.exports = crawlerPrerender;