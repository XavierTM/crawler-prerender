
'use strict'

const PAGE_COMPLETELY_RENDERED_EVENT_NAME = '597cd556-2463-4604-9af7-cfc9e13667cf';

class CrawlerPrerender {
	sendRenderingCompleteEvent() {
		const event = new Event(PAGE_COMPLETELY_RENDERED_EVENT_NAME);
		document.dispatchEvent(event);
	}
}