
'use strict'

class CrawlerPrerenderClass {

	sendRenderingCompleteEvent() {
		const PAGE_COMPLETELY_RENDERED_EVENT_NAME = '597cd556-2463-4604-9af7-cfc9e13667cf';
		const event = new Event(PAGE_COMPLETELY_RENDERED_EVENT_NAME);
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
}

const CrawlerPrerender = new CrawlerPrerenderClass();
window.CrawlerPrerender = CrawlerPrerender;