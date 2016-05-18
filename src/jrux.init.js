/**
 Required. Ace's Basic File to Initiliaze Different Parts and Some Variables.
*/

//document ready function
jQuery(function($) {
  try {
	ju.init();
  } catch(e) {}
});


//some basic variables
(function(undefined) {
	if( !('ju' in window) ) window['ju'] = {}
	if( !('helper' in window['ju']) ) window['ju'].helper = {}
	if( !('vars' in window['ju']) ) window['ju'].vars = {}
	window['ju'].vars['icon'] = ' ju-icon ';
	window['ju'].vars['.icon'] = '.ju-icon';

	ju.vars['touch']	= ('ontouchstart' in window);//(('ontouchstart' in document.documentElement) || (window.DocumentTouch && document instanceof DocumentTouch));
	
	//sometimes the only good way to work around browser's pecularities is to detect them using user-agents
	//though it's not accurate
	var agent = navigator.userAgent
	ju.vars['webkit'] = !!agent.match(/AppleWebKit/i)
	ju.vars['safari'] = !!agent.match(/Safari/i) && !agent.match(/Chrome/i);
	ju.vars['android'] = ju.vars['safari'] && !!agent.match(/Android/i)
	ju.vars['ios_safari'] = !!agent.match(/OS ([4-9])(_\d)+ like Mac OS X/i) && !agent.match(/CriOS/i)
	
	ju.vars['ie'] = window.navigator.msPointerEnabled || (document.all && document.querySelector);//8-11
	ju.vars['old_ie'] = document.all && !document.addEventListener;//8 and below
	ju.vars['very_old_ie']	= document.all && !document.querySelector;//7 and below
	ju.vars['firefox'] = 'MozAppearance' in document.documentElement.style;
	
	ju.vars['non_auto_fixed'] = ju.vars['android'] || ju.vars['ios_safari'];
	
	
	//sometimes we try to use 'tap' event instead of 'click' if jquery mobile plugin is available
	ju['click_event'] = ju.vars['touch'] && jQuery.fn.tap ? 'tap' : 'click';
})();



(function($ , undefined) {

	ju = {
		functions: {},
		
		init: function(initAnyway) {
			//initAnyway used to make sure the call is from our RequireJS app and not a document ready event!
			var initAnyway = !!initAnyway && true;
			if(typeof requirejs !== "undefined" && !initAnyway) return;
			
			for(var func in ju.functions) if(ju.functions.hasOwnProperty(func)) {
				ju.functions[func]();
			}
		}
	}


	ju.functions.basics = function() {
		// for android and ios we don't use "top:auto" when breadcrumbs is fixed
		if(ju.vars['non_auto_fixed']) {
			$('body').addClass('mob-safari');
		}

		ju.vars['transition'] = ju.vars['animation'] || !!$.support.transition;
	}
	
	ju.functions.enableSidebar = function() {
		//initiate sidebar function
		var $sidebar = $('.sidebar');
		if($.fn.ju_sidebar) $sidebar.ju_sidebar();
		if($.fn.ju_sidebar_scroll) $sidebar.ju_sidebar_scroll({
			//for other options please see documentation
			'include_toggle': false || ju.vars['safari'] || ju.vars['ios_safari'] //true = include toggle button in the scrollbars
		});
		if($.fn.ju_sidebar_hover)	$sidebar.ju_sidebar_hover({
			'sub_hover_delay': 750,
			'sub_scroll_style': 'no-track scroll-thin scroll-margin scroll-visible'
		});
	}

	
	//Load content via ajax
	ju.functions.enableAjax = function() {
		if(!$.fn.ju_ajax) return;
 
		if(window.Pace) {
			window.paceOptions = {
				ajax: true,
				document: true,
				eventLag: false // disabled
				//elements: {selectors: ['.page-content-area']}
			}
		}

		var ju_ajax_options = {
			 'close_active': true,
			 
			 close_mobile_menu: '#sidebar',
			 close_dropdowns: true,
			 
			 'default_url': 'page/index',//default hash
			 'content_url': function(hash) {
				//***NOTE***
				//this is for Ace  only, you should change it to return a valid URL
				//please refer to documentation for more info

				if( !hash.match(/^page\//) ) return false;
				var path = document.location.pathname;

				//for example in Ace HTML  version we convert /ajax/index.html#page/gallery to > /ajax/content/gallery.html and load it
				if(path.match(/(\/ajax\/)(index\.html)?/))
					return path.replace(/(\/ajax\/)(index\.html)?/, '/ajax/content/'+hash.replace(/^page\//, '')+'.html') ;

				//for example in Ace PHP  version we convert "ajax.php#page/dashboard" to "ajax.php?page=dashboard" and load it
				return path + "?" + hash.replace(/\//, "=");
			  }			  
		}
		   
		//for IE9 and below we exclude PACE loader (using conditional IE comments)
		//for other browsers we use the following extra ajax loader options
		if(window.Pace) {
			ju_ajax_options['loading_overlay'] = 'body';//the opaque overlay is applied to 'body'
		}

		//initiate ajax loading on this element( which is .page-content-area[data-ajax-content=true] in Ace's )
		$('[data-ajax-content=true]').ju_ajax(ju_ajax_options)

		//if general error happens and ajax is working, let's stop loading icon & PACE
		$(window).on('error.ju_ajax', function() {
			$('[data-ajax-content=true]').each(function() {
				var $this = $(this);
				if( $this.ju_ajax('working') ) {
					if(window.Pace && Pace.running) Pace.stop();
					$this.ju_ajax('stopLoading', true);
				}
			})
		})
	}

	/////////////////////////////

	ju.functions.handleScrollbars = function() {
		//add scrollbars for navbar dropdowns
		var has_scroll = !!$.fn.ju_scroll;
		if(has_scroll) $('.dropdown-content').ju_scroll({reset: false, mouseWheelLock: true})

		//reset scrolls bars on window resize
		if(has_scroll && !ju.vars['old_ie']) {//IE has an issue with widget fullscreen on ajax?!!!
			$(window).on('resize.reset_scroll', function() {
				$('.ju-scroll:not(.scroll-disabled)').not(':hidden').ju_scroll('reset');
			});
			if(has_scroll) $(document).on('settings.ju.reset_scroll', function(e, name) {
				if(name == 'sidebar_collapsed') $('.ju-scroll:not(.scroll-disabled)').not(':hidden').ju_scroll('reset');
			});
		}
	}


	ju.functions.dropdownAutoPos = function() {
		//change a dropdown to "dropup" depending on its position
		$(document).on('click.dropdown.pos', '.dropdown-toggle[data-position="auto"]', function() {
			var offset = $(this).offset();
			var parent = $(this.parentNode);

			if ( parseInt(offset.top + $(this).height()) + 50 
					>
				(ju.helper.scrollTop() + ju.helper.winHeight() - parent.find('.dropdown-menu').eq(0).height())
				) parent.addClass('dropup');
			else parent.removeClass('dropup');
		});
	}

	
	ju.functions.navbarHelpers = function() {
		//prevent dropdowns from hiding when a from is clicked
		/**$(document).on('click', '.dropdown-navbar form', function(e){
			e.stopPropagation();
		});*/


		//disable navbar icon animation upon click
		$('.ju-nav [class*="icon-animated-"]').closest('a').one('click', function(){
			var icon = $(this).find('[class*="icon-animated-"]').eq(0);
			var $match = icon.attr('class').match(/icon\-animated\-([\d\w]+)/);
			icon.removeClass($match[0]);
		});


		//prevent dropdowns from hiding when a tab is selected
		$(document).on('click', '.dropdown-navbar .nav-tabs', function(e){
			e.stopPropagation();
			var $this , href
			var that = e.target
			if( ($this = $(e.target).closest('[data-toggle=tab]')) && $this.length > 0) {
				$this.tab('show');
				e.preventDefault();
				$(window).triggerHandler('resize.navbar.dropdown')
			}
		});
	}

	
	ju.functions.sidebarTooltips = function() {
		//tooltip in sidebar items
		$('.sidebar .nav-list .badge[title],.sidebar .nav-list .badge[title]').each(function() {
			var tooltip_class = $(this).attr('class').match(/tooltip\-(?:\w+)/);
			tooltip_class = tooltip_class ? tooltip_class[0] : 'tooltip-error';
			$(this).tooltip({
				'placement': function (context, source) {
					var offset = $(source).offset();

					if( parseInt(offset.left) < parseInt(document.body.scrollWidth / 2) ) return 'right';
					return 'left';
				},
				container: 'body',
				template: '<div class="tooltip '+tooltip_class+'"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
			});
		});
		
		//or something like this if items are dynamically inserted
		/**
		$('.sidebar').tooltip({
			'placement': function (context, source) {
				var offset = $(source).offset();

				if( parseInt(offset.left) < parseInt(document.body.scrollWidth / 2) ) return 'right';
				return 'left';
			},
			selector: '.nav-list .badge[title],.nav-list .label[title]',
			container: 'body',
			template: '<div class="tooltip tooltip-error"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
		});
		*/
	}
	
	

	ju.functions.scrollTopBtn = function() {
		//the scroll to top button
		var scroll_btn = $('.btn-scroll-up');
		if(scroll_btn.length > 0) {
			var is_visible = false;
			$(window).on('scroll.scroll_btn', function() {
				var scroll = ju.helper.scrollTop();
				var h = ju.helper.winHeight();
				var body_sH = document.body.scrollHeight;
				if(scroll > parseInt(h / 4) || (scroll > 0 && body_sH >= h && h + scroll >= body_sH - 1)) {//|| for smaller pages, when reached end of page
					if(!is_visible) {
						scroll_btn.addClass('display');
						is_visible = true;
					}
				} else {
					if(is_visible) {
						scroll_btn.removeClass('display');
						is_visible = false;
					}
				}
			}).triggerHandler('scroll.scroll_btn');

			scroll_btn.on(ju.click_event, function(){
				var duration = Math.min(500, Math.max(100, parseInt(ju.helper.scrollTop() / 3)));
				$('html,body').animate({scrollTop: 0}, duration);
				return false;
			});
		}
	}


	
	ju.functions.someBrowserFix = function() {
		//chrome and webkit have a problem here when resizing from 479px to more
		//we should force them redraw the navbar!
		if( ju.vars['webkit'] ) {
			var ju_nav = $('.ju-nav').get(0);
			if( ju_nav ) $(window).on('resize.webkit_fix' , function(){
				ju.helper.redraw(ju_nav);
			});
		}
		
		
		//fix an issue with ios safari, when an element is fixed and an input receives focus
		if(ju.vars['ios_safari']) {
		  $(document).on('ju.settings.ios_fix', function(e, event_name, event_val) {
			if(event_name != 'navbar_fixed') return;

			$(document).off('focus.ios_fix blur.ios_fix', 'input,textarea,.wysiwyg-editor');
			if(event_val == true) {
			  $(document).on('focus.ios_fix', 'input,textarea,.wysiwyg-editor', function() {
				$(window).on('scroll.ios_fix', function() {
					var navbar = $('#navbar').get(0);
					if(navbar) ju.helper.redraw(navbar);
				});
			  }).on('blur.ios_fix', 'input,textarea,.wysiwyg-editor', function() {
				$(window).off('scroll.ios_fix');
			  })
			}
		  }).triggerHandler('ju.settings.ios_fix', ['navbar_fixed', $('#navbar').css('position') == 'fixed']);
		}
	}

	
	
	ju.functions.bsCollapseToggle = function() {
		//bootstrap collapse component icon toggle
		$(document).on('hide.bs.collapse show.bs.collapse', function (ev) {
			var panel_id = ev.target.getAttribute('id')
			var panel = $('a[href*="#'+ panel_id+'"]');
			if(panel.length == 0) panel = $('a[data-target*="#'+ panel_id+'"]');
			if(panel.length == 0) return;

			panel.find(ju.vars['.icon']).each(function(){
				var $icon = $(this)

				var $match
				var $icon_down = null
				var $icon_up = null
				if( ($icon_down = $icon.attr('data-icon-show')) ) {
					$icon_up = $icon.attr('data-icon-hide')
				}
				else if( $match = $icon.attr('class').match(/fa\-(.*)\-(up|down)/) ) {
					$icon_down = 'fa-'+$match[1]+'-down'
					$icon_up = 'fa-'+$match[1]+'-up'
				}

				if($icon_down) {
					if(ev.type == 'show') $icon.removeClass($icon_down).addClass($icon_up)
						else $icon.removeClass($icon_up).addClass($icon_down)
						
					return false;//ignore other icons that match, one is enough
				}

			});
		})
	}

})(jQuery);


//some ju helper functions
(function($$ , undefined) {//$$ is ju.helper
 $$.unCamelCase = function(str) {
	return str.replace(/([a-z])([A-Z])/g, function(match, c1, c2){ return c1+'-'+c2.toLowerCase() })
 }
 $$.strToVal = function(str) {
	var res = str.match(/^(?:(true)|(false)|(null)|(\-?[\d]+(?:\.[\d]+)?)|(\[.*\]|\{.*\}))$/i);

	var val = str;
	if(res) {
		if(res[1]) val = true;
		else if(res[2]) val = false;
		else if(res[3]) val = null;	
		else if(res[4]) val = parseFloat(str);
		else if(res[5]) {
			try { val = JSON.parse(str) }
			catch (err) {}
		}
	}

	return val;
 }
 $$.getAttrSettings = function(elem, attr_list, prefix) {
	if(!elem) return;
	var list_type = attr_list instanceof Array ? 1 : 2;
	//attr_list can be Array or Object(key/value)
	var prefix = prefix ? prefix.replace(/([^\-])$/ , '$1-') : '';
	prefix = 'data-' + prefix;

	var settings = {}
	for(var li in attr_list) if(attr_list.hasOwnProperty(li)) {
		var name = list_type == 1 ? attr_list[li] : li;
		var attr_val, attr_name = $$.unCamelCase(name.replace(/[^A-Za-z0-9]{1,}/g , '-')).toLowerCase()

		if( ! ((attr_val = elem.getAttribute(prefix + attr_name))  ) ) continue;
		settings[name] = $$.strToVal(attr_val);
	}

	return settings;
 }

 $$.scrollTop = function() {
	return document.scrollTop || document.documentElement.scrollTop || document.body.scrollTop
 }
 $$.winHeight = function() {
	return window.innerHeight || document.documentElement.clientHeight;
 }
 $$.redraw = function(elem, force) {
	if(!elem) return;
	var saved_val = elem.style['display'];
	elem.style.display = 'none';
	elem.offsetHeight;
	if(force !== true) {
		elem.style.display = saved_val;
	}
	else {
		//force redraw for example in old IE
		setTimeout(function() {
			elem.style.display = saved_val;
		}, 10);
	}
 }
})(ju.helper);