
# crawler-prerender
This module make easier to manage SEO for SPAs(single page applications). It solves two problems associated with SPA SEO management.  
1. Some crawlers can't run Javascript
2. Since an SPA usually has one template HTML page, you cannot set ```<meta>``` tags, and page title in advance for different routes.

**NB**: It only works with Express.js

## How it works
In general, the package crawls your web pages, get the Javascript to generate content, runs it, then saves the HTML content to show search engine crawlers. When a search engine crawls your website, it the serves it the prerendered HTML. Normal clients will still receives normal SPA content.

### Backend
The npm package that has two components

#### Prerendering function
This function generates HTML from your page Javascript and saves it to the file system. All you need to do is pass a path to the resource, and it will generate the HTML.

#### Middleware
This middleware will detect traffic from search engine crawlers and it serves them prerendered HTML rather than SPA javascript page. If the path is not yet prerendered, it will return HTTP 503 error code, then prerenders the path.

### Front end
The front end script consists of two functions.

#### Function to set title and meta data
The function to set page title, meta keywords and meta description

#### Function to notify the prerender to save the HTML
The prerender will wait for the javascript to finish rendering the page contents. This function will notify it when that happens


## Installation

```bash
	$ npm install crawler-prerender
```

## Backend basic setup
```javascript

(async function () {

	const express = require('express');
	const crawlerPrerender = require('crawler-prerender');

	// getting the middleware
	const crawlerPrerenderOptions = { siteUrl: 'http://example.com/8080' };
	const crawlerPrerenderMiddleware = await crawlerPrerender(crawlerPrerenderOptions);

	const app = express();

	// define your api routes here


	// mount static middleware before the crawler-prerendere middleware
	app.use(express.static('/path/to/static/root/directory', { index: false })); // put index: false to avoid issues prerendering the homepage

	app.get('*', crawlerPrerenderMiddleware);

	// serving your SPA
	app.get('*', function(req, res) {
		res.sendFile('/path/to/static/root/directory/index.html');
	});

})();
```
### Prerendering a path
```javascript
	const prerender = 
```

### Options

<table>
	<tr>
		<td><b>siteUrl</b></td>
		<td>
		 	Abc
		</td>
	</tr>
	<tr>
		<td><b>basePath</b></td>
		<td>
		 	The directory to save prerendered html
		</td>
	</tr>
	<tr>
		<td><b>siteUrl</b></td>
		<td>
		 	Abc
		</td>
	</tr>
	<tr>
		<td><b>prerenderOnTimeout</b></td>
		<td>
		 	Abc
		</td>
	</tr>
</table>

## Front End Setup

[https://cdn.jsdelivr.net/gh/xaviertm/crawler-prerender@0.1.9/crawler-prerender.min.js](https://cdn.jsdelivr.net/gh/xaviertm/crawler-prerender@0.1.9/crawler-prerender.min.js)

Include the above script in your application

### Setting title, meta keywords, and meta description

```javascript
	
	const title = 'My Page Title | My Site';
	const description = "My meta page description";
	const keywords = "seo, page, keywords";

	const meta_data = { title, keywords, description };

	CrawlerPrerender.initMetaData(meta_data);
```

### Notifying the prerender module when you page is rendered
```javascript
	CrawlerPrerender.sendRenderingCompleteEvent();
```