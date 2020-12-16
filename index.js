
'use strict'

// dependencies
const fs = require('fs').promises;
const path = require('path');
const validURL = require('valid-url');
const axios_raw = require('axios');
const { serializeError } = require('serialize-error');
const { JSDOM, VirtualConsole } = require('jsdom');

// constants
const CRAWLER_PRERENDER_BASE_PATH = `${process.cwd()}/crawler-prerender`;
const APPROXIMATE_RETRY_PERIOD = 2 * 60 * 1000;
const DEFAULT_RENDERING_TIMEOUT = 60000;
const PAGE_COMPLETELY_RENDERED_EVENT_NAME = '597cd556-2463-4604-9af7-cfc9e13667cf';
const JSDOM_DOCUMENT_READY_EVENT_NAME = 'bbdfdd86-d1ed-4f0f-ae0f-b7e49674426d';
const PRERENDER_MAXIMUM_RETRIES = 5;

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

function prerenderOnErrorDefault(path, errors) {

	console.log(`Errors encounterd while prerendering path '${path}'`);

	errors.forEach(function(error, index) {
		const serialized = serializeError(error);
		console.log(`${index + 1}.`, serialized);
	});

}

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

		// adding protocol if it wasn't present
		if (!/:\/\//.test(siteUrl))
			siteUrl = 'http://' + siteUrl;

		settings.siteUrl = siteUrl;

	} else {
		error = new Error("'siteUrl' option is required");
		throw error;
	}


	// what to do when prerender fails on a path multiple times
	const { prerenderOnError } = options;
	if (typeof prerenderOnError === 'function')
		settings.prerenderOnError = prerenderOnError;
	else
		settings.prerenderOnError = prerenderOnErrorDefault;


	// base path for storing prerendered files
	let basePathExists;

	if (options.basePath) {

		settings.basePath = path.resolve(options.basePath);
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

	// what to do on timeout
	settings.prerenderOnTimeout = (options.prerenderOnTimeout === true);

	crawlerPrerender.prerender = prerender;

	const middleware = async function(req, res, next) {

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

				let prerendered = false;
				const errors = [];

				for (let i = 0; i < PRERENDER_MAXIMUM_RETRIES; i++) {
					try {
						await prerender(req.originalUrl, true);
						prerendered = true;
						break;
					} catch (err) {
						errors.push(err);
					}
				}

				if (!prerendered) {
					await settings.prerenderOnError(req.originalUrl, errors);
				}

			} else {
				res.sendFile(filePath);
			}

		}  else {
			next();
		}
	}

	return { prerender, middleware };

}

const prerender = function(path, options={}) {

	const doNotOverwrite = (options.overwrite === false);

	return new Promise(async (resolve, reject) => {

		if (typeof path !== 'string' || path.length === 0)
			reject(new Error('invalid path'));

		// adding a leading slash if it doesn't exist
		if (path.charAt(0) !== '/')
			path = `/${path}`;

		// removing the trailing slash if it exists, and if the string length <> 1
		const pathLen = path.length;

		if (pathLen > 1) {
			if (path.charAt(pathLen - 1) ===  '/')
				path = path.substring(0, pathLen - 1);
		}

		// creating the file path
		const encodedFileName = encodeURIComponent(path);
		const filePath = `${settings.basePath}/${encodedFileName}`;

		// if doNotOverwrite check if it exists, if it does return
		if (doNotOverwrite) {
			const fileExists = await pathExists(filePath);
			if (fileExists) {
				resolve();
				return;
			}
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
							reject(new Error('Invalid URL'));

					}

					let response = await axios.get(scriptURL);
					const scriptContents = response.data;

					script.innerHTML = scriptContents;

				}
			}

			// create a DOM that will execute the scripts that will create contents
			html = dormantDOM.serialize();

			const virtualConsole = new VirtualConsole();
			const options = { 
				runScripts: "dangerously",
				url, // very important
				virtualConsole
			};

			const DOM = new JSDOM(html, options);
			document = DOM.window.document;


			let timer;

			const pageCompletelyRendered = async function() {

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

				try {
					await saveRenderedHTML(DOM, filePath);
					resolve();
				} catch (err) {
					reject(err);
				}

			};

			document.addEventListener(PAGE_COMPLETELY_RENDERED_EVENT_NAME, pageCompletelyRendered);

			const { Event } = DOM.window;

			// timeout if the page took so much time to render
			timer = setTimeout(() => {

				if (settings.prerenderOnTimeout) {
					const event = new Event(PAGE_COMPLETELY_RENDERED_EVENT_NAME);
					document.dispatchEvent(event);
				} else {
					document.removeEventListener(PAGE_COMPLETELY_RENDERED_EVENT_NAME, pageCompletelyRendered);

					const err = new Error('Render timeout');
					reject(err);
				}

			}, DEFAULT_RENDERING_TIMEOUT);

			// telling the document that JSDOM is now ready to receive the PAGE_COMPLETELY_RENDERED event
	      const event = new Event(JSDOM_DOCUMENT_READY_EVENT_NAME);
	      document.dispatchEvent(event);

		} catch(err) {
			reject(err);
		}
	});

} 


module.exports = crawlerPrerender;