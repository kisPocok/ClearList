/**
 * Clear List Project
 * @author David Schneidhoffer (@kisPocok)
 * @version 1.1
 * @see http://kispocok.github.io/ClearList/
 */

/**
 * Clear List object
 * @returns {object}
 */
var clearList = function()
{
	// Globals
	var config, list, listSelector, startHex, endHex, minClear, hoverDiff, autosave, autoload, storage,
		inited   = false,
		cacheKey = 'clearList-save';

	/**
	 * @param listContainerSelector jQuery selector
	 * @param defaultConfig         Array
	 */
	var init = function(listContainerSelector, defaultConfig) {
		listSelector = listContainerSelector;
		config       = defaultConfig || {};

		// Configurable settings || default values
		startHex   = config.startHexColor || 'e3252b';    // Top tile color
		endHex     = config.endHexColor   || 'eeba37';    // Bottom tile color
		minClear   = config.minClear      || 5;           // Minimum tile before reach the endHexColor
		hoverDiff  = config.hoverDiff     || 10;          // Hover color diff in percent, f.e.: (+/-) 10%
		autosave   = config.autosave      || false;       // Save on each (add/remove/finish) trigger
		autoload   = config.autoload      || false;       // Load last state on start
		storage    = config.storage       || window.localStorage; // localStorage or similar
		cacheKey  += listContainerSelector;

		var loaded = false;
		if (autoload) {
			loaded = loadListFromStorage();
		}

		if (!loaded && config.listItems) {
			addItemsToList(config.listItems);
		}

		$(listSelector)
			.on('ITEM_FINISHED', function(event) {
				if ($(listSelector).find(':not(.done)').length < 1) {
					$(listSelector).trigger('LIST_FINISHED').trigger('LIST_ACTION');
				}
			})
			.on('LIST_ACTION', function(event) {
				if (autosave) {
					saveListToStorage();
				}
			});

		colorize();
		inited = true;

		return this;
	};

	/**
	 * Add more items to list.
	 * @param items array Must be array
	 */
	var addItemsToList = function(items)
	{
		$(items).each(function(i, item) {
			addItemToList(item);
		})
	};

	/**
	 * Add one items to list.
	 * @param item string
	 * @param done boolean
	 */
	var addItemToList = function(item, done)
	{
		var e = $('<li>' + item + '</li>');
		if (done) {
			e.addClass('done');
		}
		$(listSelector).append(e);

		if (inited) {
			colorize();
		}

		$(listSelector).trigger('ITEM_ADDED').trigger('LIST_ACTION');
	};

	/**
	 * Remove item by index (start counting from top)
	 * @param index int
	 */
	var removeItemFromList = function(index)
	{
		var e = $(listSelector).find('>li')[index];
		$(e).remove();
		colorize();
		$(listSelector).trigger('LIST_ACTION');
	};

	var removeAllItem = function()
	{
		$(listSelector).find('>li').remove();
	};

	var removeFinishedItem = function()
	{
		$(listSelector).find('>li').filter('.done').remove();
		colorize();
		$(listSelector).trigger('LIST_ACTION');
	};

	/**
	 * Open specified item or all
	 * @param index
	 */
	var openItems = function(index)
	{
		var items = $(list);
		if (isInt(index)) {
			items = $( items.get(index) );
		}

		items.filter('.done').removeClass('done');
		$(listSelector).trigger('LIST_RESTART').trigger('LIST_ACTION');
	};

	/**
	 * Close specified item or all
	 * @param index integer, optional
	 */
	var finishItems = function(index)
	{
		var items = $(list);
		if (isInt(index)) {
			items = $( items.get(index) );
		}

		items.addClass('done');
		$(listSelector).trigger('ITEM_FINISHED').trigger('LIST_ACTION');
	};

	/**
	 * Toggle Done specified or all items.
	 * @param index integer, optional
	 */
	var toggleItemState = function(index)
	{
		var items = $(list);
		if (isInt(index)) {
			items = $( items.get(index) );
		}
		items.toggleClass('done');
		$(listSelector).trigger('LIST_ACTION');
	};

	var reloadDefaultItems = function()
	{
		removeAllItem();
		addItemsToList(config.listItems);
	};

	var saveListToStorage = function()
	{
		var json = [];
		list.each(function(i, element) {
			json[i] = {
				title: $(element).text(),
				done:  $(element).hasClass('done') ? 1 : 0
			}
		});
		var data = JSON.stringify(json);
		storage.setItem(cacheKey, data);
		$(listSelector).trigger('LIST_SAVED');
	};

	var loadListFromStorage = function()
	{
		if (storage.length < 1 || !storage.hasOwnProperty(cacheKey) || storage.getItem(cacheKey) == '0') {
			$(listSelector).trigger('LIST_LOAD_FAILED');
			return false;
		}

		removeAllItem();
		var data = storage.getItem(cacheKey),
			json = JSON.parse(data);
		$(json).each(function(i, element) {
			addItemToList(element.title, element.done);
		});

		$(listSelector).trigger('LIST_LOADED');
		return true;
	};

	var removeListFromStorage = function()
	{
		storage.setItem(cacheKey, 0);
	};

	var updateListSelector = function()
	{
		list = $(listSelector).find('>li');
	};

	/**
	 * Enable or disable autosave
	 * @param state boolean
	 */
	var setAutoSaveStatusTo = function(state)
	{
		autosave = !!state;
	};

	/**
	 * Repaint the item list
	 */
	var colorize = function()
	{
		updateListSelector();
		var attrName  = 'data-hoverDiff',
			step      = Math.max(minClear, list.length-1),
			startHexR = hexToR(startHex),
			startHexG = hexToG(startHex),
			startHexB = hexToB(startHex),
			stepR     = Math.abs((startHexR-hexToR(endHex)) / step),
			stepG     = Math.abs((startHexG-hexToG(endHex)) / step),
			stepB     = Math.abs((startHexB-hexToB(endHex)) / step);

		list.each(function(i, element) {
			var r = Math.round(startHexR + (stepR * i)),
				g = Math.round(startHexG + (stepG * i)),
				b = Math.round(startHexB + (stepB * i)),
				c = rgb(r,g,b),
				cHover = rgb(r-(r/100*hoverDiff), g-(g/100*hoverDiff), b-(b/100*hoverDiff));
			$(element)
				.css({backgroundColor: c})
				.attr(attrName, cHover)
				.filter(':not(.inited)') // to add hover/click event listeners only once
				.addClass('inited')
				.click(function(event) {
					$(event.target).toggleClass('done');
					$(listSelector).trigger('ITEM_CLICK').trigger('LIST_ACTION');
				})
				.hover(function(event) {
					var element = $(event.target),
						color   = element.attr(attrName);

					if (element.hasClass('done')) {
						return;
					}

					element
						.attr(attrName, element.css('backgroundColor'))
						.css({backgroundColor: color});
				});
		});
	};

	function isInt(n)  { return typeof n === 'number' && n % 1 == 0; }
	function hexToR(h) { return parseInt((cutHex(h)).substring(0,2), 16); }
	function hexToG(h) { return parseInt((cutHex(h)).substring(2,4), 16); }
	function hexToB(h) { return parseInt((cutHex(h)).substring(4,6), 16); }
	function cutHex(h) { return (h.charAt(0)=="#") ? h.substring(1,7):h; }
	function rgb(r, g, b) { return ['rgb(', parseHex(r), ',', parseHex(g), ',', parseHex(b), ')'].join(''); }
	function parseHex(h) { return Math.min(255, Math.max(0, parseInt(h))); }

	return {
		author:   '@kisPocok',           // That is my twitter name. Don't remove please.
		version:  '1.1',                 // Version number
		init:     init,                  // Constructor
		add:      addItemToList,         // Add item to list
		remove:   removeItemFromList,    // Remove selected item
		clean:    removeFinishedItem,    // Drops only finished items
		clear:    removeAllItem,         // Drops all item
		finish:   finishItems,           // Finish specified or all item
		reset:    openItems,             // Mark specified or all item as new
		toggle:   toggleItemState,       // Change item(s) status (from new to finished and vica-versa)
		restart:  reloadDefaultItems,    // Reload predefined item in config
		save:     saveListToStorage,     // Save current state to localStorage
		load:     loadListFromStorage,   // Load last saved state from localStorage
		del:      removeListFromStorage, // Remove list from localStorage
		autosave: setAutoSaveStatusTo    // Set autosave ON/OFF. Boolean parameter required.
	}
};
window.clearList = clearList;