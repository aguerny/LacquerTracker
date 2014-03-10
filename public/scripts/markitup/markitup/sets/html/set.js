// ----------------------------------------------------------------------------
// markItUp!
// ----------------------------------------------------------------------------
// Copyright (C) 2008 Jay Salvat
// http://markitup.jaysalvat.com/
// ----------------------------------------------------------------------------
// Html tags
// http://en.wikipedia.org/wiki/html
// ----------------------------------------------------------------------------
// Basic set. Feel free to add more tags
// ----------------------------------------------------------------------------
mySettings = {
	onShiftEnter:	{keepDefault:false, replaceWith:'<br />\n'},
	onCtrlEnter:	{keepDefault:false, openWith:'\n<p>', closeWith:'</p>\n'},
	onTab:			{keepDefault:false, openWith:'	 '},
	markupSet: [
		{name:'Bold', key:'B', openWith:'(!(**|!|**)!)', closeWith:'(!(**|!|**)!)' },
		{name:'Italic', key:'I', openWith:'(!(*|!|*)!)', closeWith:'(!(*|!|*)!)' },
		{separator:'---------------' },
		{name:'Picture', key:'P', replaceWith:'![Enter description here...]([![Source:!:http://]!])' },
		{name:'Link', key:'L', openWith:'[Enter link text here...]([![Link:!:http://]!])'},
	]
}