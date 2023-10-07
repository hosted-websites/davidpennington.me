// Version: 2.0
// Last Modified: 2023-10-07 (YYYY-MM-DD)

/**
 * drawdown.js
 * (c) Adam Leggett
 */
; function markdown(src) {

	// I've made several changes to the original drawdown.js
	var rx_lt = /</g;
	var rx_gt = />/g;
	var rx_space = /\t|\r|\uf8ff/g;
	var rx_escape = /\\([\\\|`*_{}\[\]()#+\-~])/g;
	var rx_hr = /^([*\-=_] *){3,}$/gm;
	var rx_blockquote = /\n *&gt; *([^]*?)(?=(\n|$){2})/g;
	var rx_list = /\n( *)(?:[*\-+]|((\d+)|([a-z])|[A-Z])[.)]) +([^]*?)(?=(\n|$){2})/g;
	var rx_listjoin = /<\/(ol|ul)>\n\n<\1>/g;
	var rx_highlight = /(^|[^A-Za-z\d\\])(([*_])|(~)|(\^)|(--)|(\+\+)|`)(\2?)([^<]*?)\2\8(?!\2)(?=\W|_|$)/g;
	var rx_code = /\n((```|~~~).*\n?([^]*?)\n?\2|((    .*?\n)+))/g;
	var rx_link = /((!?)\[(.*?)\]\((.*?)( ".*")?\)|\\([\\`*_{}\[\]()#+\-.!~]))/g;
	var rx_table = /\n(( *\|.*?\| *\n)+)/g;
	var rx_thead = /^.*\n( *\|( *\:?-+\:?-+\:? *\|)* *\n|)/;
	var rx_row = /.*\n/g;
	var rx_cell = /\||(.*?[^\\])\|/g;
	var rx_heading = /(?=^|>|\n)([>\s]*?)(#{1,6}) (.*?)( #*)? *(?=\n|$)/g;
	var rx_para = /(?=^|>|\n)\s*\n+([^<]+?)\n+\s*(?=\n|<|$)/g;
	var rx_stash = /-\d+\uf8ff/g;
	var rx_gist = /https:\/\/gist.github.com\/([^\n]+)/g;

	function replace(rex, fn) {
		src = src.replace(rex, fn);
	}

	function element(tag, content) {
		return '<' + tag + '>' + content + '</' + tag + '>';
	}

	function blockquote(src) {
		return src.replace(rx_blockquote, function (all, content) {
			return element('blockquote', blockquote(highlight(content.replace(/^ *&gt; */gm, ''))));
		});
	}

	function list(src) {
		return src.replace(rx_list, function (all, ind, ol, num, low, content) {
			var entry = element('li', highlight(content.split(
				RegExp('\n ?' + ind + '(?:(?:\\d+|[a-zA-Z])[.)]|[*\\-+]) +', 'g')).map(list).join('</li><li>')));

			return '\n' + (ol
				? '<ol start="' + (num
					? ol + '">'
					: parseInt(ol, 36) - 9 + '" style="list-style-type:' + (low ? 'low' : 'upp') + 'er-alpha">') + entry + '</ol>'
				: element('ul', entry));
		});
	}

	function highlight(src) {
		return src.replace(rx_highlight, function (all, _, p1, emp, sub, sup, small, big, p2, content) {
			return _ + element(
				emp ? (p2 ? 'strong' : 'em')
					: sub ? (p2 ? 's' : 'sub')
						: sup ? 'sup'
							: small ? 'small'
								: big ? 'big'
									: 'code',
				highlight(content));
		});
	}

	function surroundQuotesWithTags(inputString, tagName) {
		const regex = /((["'])(?:(?=(\\?))\3.)*?\2)/g;
		return inputString
			.replace(regex, `<${tagName}>$1</${tagName}>`)
			.replace(/^(\/\/[^\n]+)$/gm, `<i>$1</i>`);
	}

	function unesc(str) {
		return str.replace(rx_escape, '$1');
	}

	var stash = [];
	var si = 0;

	src = '\n' + src + '\n';

	// replace(rx_lt, '&lt;');
	// replace(rx_gt, '&gt;');
	replace(rx_space, '  ');

	// blockquote
	src = blockquote(src);

	// horizontal rule
	replace(rx_hr, '<hr/>');

	// list
	src = list(src);
	replace(rx_listjoin, '');

	// code
	replace(rx_code, function (all, p1, p2, p3, p4) {
		stash[--si] = element('pre', element('code', surroundQuotesWithTags(p3 || p4.replace(/^    /gm, ''), 'span')));
		return si + '\uf8ff';
	});

	// link or image
	replace(rx_link, function (all, p1, p2, p3, p4, p5, p6) {
		stash[--si] = p4
			? p2
				? '<img src="' + p4 + '" alt="' + p3 + '"/>'
				: '<a href="' + p4 + '">' + unesc(highlight(p3)) + '</a>'
			: p6;
		return si + '\uf8ff';
	});

	// table
	replace(rx_table, function (all, table) {
		var sep = table.match(rx_thead)[1];
		return '\n' + element('table',
			table.replace(rx_row, function (row, ri) {
				return row == sep ? '' : element('tr', row.replace(rx_cell, function (all, cell, ci) {
					return ci ? element(sep && !ri ? 'th' : 'td', unesc(highlight(cell || ''))) : ''
				}))
			})
		)
	});

	// heading
	replace(rx_heading, function (all, _, p1, p2) {
		return _ + '<h' + p1.length + ' id="' + p2.toLowerCase().replace(/\W+/g, '-').replace(/^\-|\-$/g, '') + '">' + unesc(highlight(p2)) + '</h' + p1.length + '>'
	});

	// todo: gist
	replace(rx_gist, function (all, path) {
		return gist(path);
	});

	// paragraph
	replace(rx_para, function (all, content) {
		return element('p', unesc(highlight(content)))
	});

	// stash
	replace(rx_stash, function (all) { return stash[parseInt(all)] });

	return src.trim();
};

var loadStyle = function (href, media) {
	var s = document.createElement('link');
	s.type = 'text/css';
	s.media = media || 'all';
	s.rel = 'stylesheet';
	s.href = href;
	var head = document.getElementsByTagName('head')[0];
	head.appendChild(s);
};

function darkMode() {
	var body = document.getElementsByTagName("body")[0];
	body.classList.toggle("dark");
}

function gist(path) {
	var callbackName = "gist_callback" + path.replace(/\W+/g, '-');

	setTimeout(() => {
		fetch('https://gist.github.com/' + path + '.json').then(function (response) {
			return response.json();
		}).then(function (gistData) {
			// delete window[callbackName];
			loadStyle(gistData.stylesheet);
			document.getElementById(callbackName).innerHTML = gistData.div;
		}); // don't catch the error
	}, 0);

	// window[callbackName] = function (gistData) {
	// 	delete window[callbackName];
	// 	loadStyle(gistData.stylesheet);
	// 	document.getElementById(callbackName).innerHTML = gistData.div;
	// };

	// var script = document.createElement("script");
	// script.setAttribute("src", "https://gist.github.com/" + path + ".json?callback=" + callbackName);
	// document.body.appendChild(script);

	return '<div id="' + callbackName + '"></div>';
}

/*
 * Get this party started!
 */
function run() {
	var body = document.getElementsByTagName("body")[0];

	// Attach an ID (based on URL) to the body container for CSS control
	body.id = window.location.pathname.replace(/\W+/g, '-').replace(/^\-|\-$/g, '') || 'index';

	// Convert to HTML starting after the <pre> tag (also removing the </pre> the browser added)
	// var html = markdown(body.innerHTML.replace(/<\/?(pre|script)[^>]*>/g, ''));
	var html = markdown(body.innerHTML.split('<pre>')[1].split('</pre>')[0]);

	// Basic HTML5 shell wrapped in a div
	body.innerHTML = '\
		<header>\
			<div>\
				<span class="home"><a href="/">Home</a></span>\
				<button class="darkmode" onclick="darkMode()">dark mode</button>\
			</div>\
		</header>\
		<main role="main">\
			<article>' + html + '</article>\
		</main>\
		<footer></footer>\
	</div>';

	// Load stylesheet
	loadStyle("/style.css");

	const theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
	if (theme === "dark") {
		darkMode()
	}
}

if (document.readyState === "loading") {
	// Loading hasn't finished yet
	document.addEventListener("DOMContentLoaded", run);
} else {
	// `DOMContentLoaded` has already fired
	run();
}

