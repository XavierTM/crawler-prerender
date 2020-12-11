
'use strict'

class CrawlerPrerenderClass {

	sendRenderingCompleteEvent() {

		this.document_rendered = true;

		if (this.jsdom_ready)
			this.dispatchEvent();

	}

	dispatchEvent() {
		const event = new Event(this.PAGE_COMPLETELY_RENDERED_EVENT_NAME);
		document.dispatchEvent(event);
	}

	initMetaData(data = {}) {

		const { description, title, keywords } = data;

		if (title)
			document.title = title;

		if (description) {

			// removing existing ones
			const metaDescriptionTags = document.querySelectorAll('meta[name=description]');
			if (metaDescriptionTags.length) {
				for(let i = 0; i < metaDescriptionTags.length; i++)
					metaDescriptionTags[i].remove();
			}

			// creating the meta tag
			const metaDescriptionTag = document.createElement('meta');
			metaDescriptionTag.setAttribute('name', 'description')
			metaDescriptionTag.setAttribute('content', description);

			document.head.append(metaDescriptionTag);

		}

		if (keywords) {
			// removing existing ones
			const metaKeywordsTags = document.querySelectorAll('meta[name=keywords]');
			if (metaKeywordsTags.length) {
				for(let i = 0; i < metaKeywordsTags.length; i++)
					metaKeywordsTags[i].remove();
			}

			// creating the meta tag
			const metaKeywordsTag = document.createElement('meta');
			metaKeywordsTag.setAttribute('name', 'keywords');
			metaKeywordsTag.setAttribute('content', keywords);

			document.head.append(metaKeywordsTag);

		}
	}

	constructor() {

		this.JSDOM_DOCUMENT_READY_EVENT_NAME = 'bbdfdd86-d1ed-4f0f-ae0f-b7e49674426d';
		this.PAGE_COMPLETELY_RENDERED_EVENT_NAME = '597cd556-2463-4604-9af7-cfc9e13667cf';
		this.jsdom_ready = false;
		this.document_rendered = false;

		const _this = this;

		document.addEventListener(this.JSDOM_DOCUMENT_READY_EVENT_NAME, function() {
			_this.jsdom_ready = true;

			if (_this.document_rendered)
				_this.dispatchEvent();
			
		});
	}
}

const CrawlerPrerender = new CrawlerPrerenderClass();
window.CrawlerPrerender = CrawlerPrerender;