
# crawler-prerender
This module make easier to manage SEO for SPAs(single page applications). It solves two problems associated with SPA SEO management.  
1. Some crawlers can't run Javascript, so they will index an empty page.
2. Since an SPA usually has one template HTML page, you cannot set ```<meta>``` tags, and page title in advance for different routes.


## How it works
In general, the package crawls your web pages, get the Javascript to generate content, runs it, then saves the HTML content to show to search engine crawlers. When a search engine crawls your website, it the serves it the prerendered HTML. Normal clients will still receives normal SPA content.

### Backend
The npm package has two components

#### Prerendering function
This function generates HTML from your page Javascript and saves it to the file system. All you need to do is pass a path to the resource, and it will generate the HTML.

#### Middleware
This middleware will detect traffic from search engine crawlers and it serves them prerendered HTML rather than SPA javascript page. If the path is not yet prerendered, it will return HTTP 503 error code, then prerenders the path.

**NB**: The middleware only works with Express.js


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
	const { middleware } = await crawlerPrerender(crawlerPrerenderOptions);

	const app = express();

	// define your api routes and middlewares here

	// mount static middleware before the crawler-prerendere middleware
	app.use(express.static('/path/to/static/root/directory', { index: false })); // put index: false to avoid issues prerendering the homepage

	app.get('*', middleware);

	// serving your SPA
	app.get('*', function(req, res) {
		res.sendFile('/path/to/static/root/directory/index.html');
	});

})();
```
### Prerendering a path
By default, it will overwrite the prerendered contents of the path
```javascript

const crawlerPrerender = require('crawler-prerender');
const options = { siteUrl: 'www.example.com' };
const { prerender } = await crawlerPrerender(options);

const path = '/products/1234'; // absolute path
await prerender(path);

```

You can also access the ```prerender``` function as follows
```javascript
crawlerPrerender.prerender('/some-path');
```

**NB**: You can only access prerender that way after passing options

#### Prerender only if not prerendered
You can prevent the ```prerender``` function from overwriting the path's prerendered contents. This is useful when you want to make sure that all the paths are prerendered every time you startup the application, but you do not want to waste resources when the paths are already prerendered.

```javascript
prerender(path, { overwrite: false });
``` 

### Options

<table>
	<tr>
		<td><b>siteUrl</b></td>
		<td>
		 	The base URL of your web app
		 	<br><br>
		 	Ex: www.example.com
		 	<br>
		 	<b>Required</b>
		</td>
	</tr>
	<tr>
		<td><b>basePath</b></td>
		<td>
		 	The directory to save prerendered html
		 	<br>
		 	<b>Default</b>: <code>`${process.cwd()}/crawler-prerender`</code>
		</td>
	</tr>
	<tr>
		<td><b>prerenderOnTimeout</b></td>
		<td>
		 	The prerender will wait for a period of 30s for the page to finish rendering. If it is not rendered by then, it will either prerender without waiting, or raise an error.
		 	<br><br>
		 	<b>Default</b>: <code>false</code>
		</td>
	</tr>
	<tr>
		<td><b>prerenderOnError</b></td>
		<td>
			A function to be called when an error occurs while prerendering.<br>
			<br>
			<code>function(path, errors) {
				&#13;
				&nbsp; &nbsp;// code
				&#13;}</code><br>
				<br>
			<b>path</b> — the path that was being prerendered.<br>
			<b>errors</b> — an array of all the errors that occured during retries
			<br>
			<b>NB</b>: This function will only be called when <code>prerender</code> is called because a crawler tried to crawl a path that was not prerendered.
		 	<br><br>
		 	<b>Default</b>: The default function will just print the errors on the console. It's not wise to use this in production, since you won't be always looking at your console.
		</td>
	</tr>
</table>

## Front End Setup

```html
<script defer src="https://cdn.jsdelivr.net/gh/xaviertm/crawler-prerender@v0.1.0/crawler-prerender.min.js"></script>
```

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