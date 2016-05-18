/**
 <b>Scrollbars for sidebar <i>(second style)</i></b>. This approach can be used on fixed or normal sidebar.
 It uses <u>"overflow:hidden"</u> so you can't use <u>.hover</u> submenus and it will be disabled when sidebar is minimized.
 It may also be slightly faster especially when resizing browser window.
 <i class="glyphicon glyphicon-flash"></i> <u class="text-primary">Native browser scrollbars</u> are used in touch devices.
 */

(function($ , undefined) {
	//if( !$.fn.ju_scroll ) return;

	var hasTouch = ju.vars['touch'];
	var nativeScroll = /**ju.vars['old_ie'] ||*/ hasTouch;

	var old_safari = ju.vars['safari'] && navigator.userAgent.match(/version\/[1-5]/i)
	//NOTE
	//Safari on windows has not been updated for a long time.
	//And it has a problem when sidebar is fixed&scrollable and there is a CSS3 animation inside page content.
	//Very probably windows users of safari have migrated to another browser by now!



	var is_element_pos =
		'getComputedStyle' in window ?
			//el.offsetHeight is used to force redraw and recalculate 'el.style.position' esp. for webkit!
			function(el, pos) { el.offsetHeight; return window.getComputedStyle(el).position == pos }
			:
			function(el, pos) { el.offsetHeight; return $(el).css('position') == pos }


	function Sidebar_Scroll(sidebar , settings) {
		var self = this;

		var $window = $(window);

		var $sidebar = $(sidebar),
			$nav = $sidebar.find('.nav-list'),
			$toggle = $sidebar.find('.sidebar-toggle').eq(0),
			$shortcuts = $sidebar.find('.sidebar-shortcuts').eq(0),

			nav = $nav.get(0);

		if(!nav) return;


		var attrib_values = ju.helper.getAttrSettings(sidebar, $.fn.ju_sidebar_scroll.defaults);
		this.settings = $.extend({}, $.fn.ju_sidebar_scroll.defaults, settings, attrib_values);

		var scroll_to_active = self.settings.scroll_to_active;
		this.only_if_fixed = self.settings.only_if_fixed;



		var ju_sidebar = $sidebar.ju_sidebar('ref');
		$sidebar.attr('data-sidebar-scroll', 'true');

		var submenu_hover = function() {
			return $sidebar.first('li.hover > .submenu').css('position') == 'absolute'
		}


		var scroll_div = null,
			scroll_content = null,
			scroll_content_div = null,
			bar = null,
			ju_scroll = null;

		this.is_scrolling = false;
		var _initiated = false;
		this.sidebar_fixed = is_element_pos(sidebar, 'fixed');

		var $avail_height, $content_height;

		var available_height = function() {
			//available window space
			var offset = $nav.parent().offset();//because `$nav.offset()` considers the "scrolled top" amount as well
			if(self.sidebar_fixed) offset.top -= ju.helper.scrollTop();

			return $window.innerHeight() - offset.top - ( self.settings.include_toggle ? 0 : $toggle.outerHeight() ) + 1;
		}
		var content_height = function() {
			return nav.scrollHeight;
		}

		var initiate = function(on_page_load) {
			if( _initiated ) return;
			if( (self.only_if_fixed && !self.sidebar_fixed) || submenu_hover() ) return;//eligible??
			//return if we want scrollbars only on "fixed" sidebar and sidebar is not "fixed" yet!

			//initiate once
			$nav.wrap('<div class="nav-wrap-up" />');
			if(self.settings.include_shortcuts && $shortcuts.length != 0) $nav.parent().prepend($shortcuts);
			if(self.settings.include_toggle && $toggle.length != 0) $nav.parent().append($toggle);

			if(!nativeScroll) {
				scroll_div = $nav.parent()
					.ju_scroll({
						size: available_height(),
						reset: true,
						mouseWheelLock: true,
						lockAnyway: self.settings.lock_anyway,
						styleClass: self.settings.scroll_style,
						hoverReset: false
					})
					.closest('.ju-scroll').addClass('nav-scroll');

				ju_scroll = scroll_div.data('ju_scroll');

				scroll_content = scroll_div.find('.scroll-content').eq(0);

				if(old_safari && !self.settings.include_toggle) {
					var toggle = $toggle.get(0);
					if(toggle) scroll_content.on('scroll.safari', function() {
						ju.helper.redraw(toggle);
					});
				}
			}
			else {
				$nav.parent().addClass('sidebar-scroll-native').css('max-height', available_height());
				ju_scroll = true;
				scroll_div = scroll_content = $nav.parent();
			}

			_initiated = true;

			//if the active item is not visible, scroll down so that it becomes visible
			//only the first time, on page load
			if(on_page_load == true) {
				self.reset();//try resetting at first

				if( scroll_to_active ) {
					self.scroll_to_active();
				}
				scroll_to_active = false;
			}
		}


		this.scroll_to_active = function() {
			if( !nativeScroll && (!ju_scroll || !ju_scroll.is_active()) ) return;
			try {
				//sometimes there's no active item or not 'offsetTop' property
				var $active;

				var vars = ju_sidebar['vars']();

				var nav_list = $sidebar.find('.nav-list')
				if(vars['minimized'] && !vars['collapsible']) {
					$active = nav_list.find('> .active')
				}
				else {
					$active = $nav.find('> .active.hover')
					if($active.length == 0)	$active = $nav.find('.active:not(.open)')
				}

				var top = $active.outerHeight();

				nav_list = nav_list.get(0);
				var active = $active.get(0);
				while(active != nav_list) {
					top += active.offsetTop;
					active = active.parentNode;
				}

				var scroll_amount = top - scroll_div.height();
				if(scroll_amount > 0) {
					scroll_content.scrollTop(scroll_amount);
				}
			}catch(e){}



		}


		this.reset = function(recalc) {
			if(recalc === true) {
				this.sidebar_fixed = is_element_pos(sidebar, 'fixed');
			}

			if( (this.only_if_fixed && !this.sidebar_fixed) || submenu_hover() ) {
				this.disable();
				return;//eligible??
			}
			//return if we want scrollbars only on "fixed" sidebar and sidebar is not "fixed" yet!

			if( !_initiated ) initiate();
			//initiate scrollbars if not yet

			$sidebar.addClass('sidebar-scroll');

			var vars = ju_sidebar['vars']();


			//enable if:
			//menu is not minimized
			//menu is not collapsible mode (responsive navbar-collapse mode which has default browser scroller)
			//menu is not horizontal or horizontal but mobile view (which is not navbar-collapse)
			//and available height is less than nav's height			
			var enable_scroll = !vars['minimized'] && !vars['collapsible'] && !vars['horizontal']
				&& ($avail_height = available_height()) < ($content_height = nav.parentNode.scrollHeight);

			this.is_scrolling = true;
			if( enable_scroll && ju_scroll ) {
				//scroll_content_div.css({height: $content_height, width: 8});
				//scroll_div.prev().css({'max-height' : $avail_height})
				if(!nativeScroll) {
					ju_scroll.update({size: $avail_height});
					ju_scroll.enable();
					ju_scroll.reset();
				}
				else {
					$nav.parent().addClass('sidebar-scroll-native').css('max-height', $avail_height);
				}
			}

			if(!nativeScroll) {
				if( !enable_scroll || !ju_scroll.is_active() ) {
					if(this.is_scrolling) this.disable();
				}
			}
			else {
				if( !enable_scroll && this.is_scrolling ) this.disable();
			}

			//return is_scrolling;
		}

		this.disable = function() {
			this.is_scrolling = false;
			if(ju_scroll) {
				if(!nativeScroll) ju_scroll.disable();
				else $nav.parent().removeClass('sidebar-scroll-native').css('max-height', '');
			}

			$sidebar.removeClass('sidebar-scroll');
		}

		this.prehide = function(height_change) {
			if(!this.is_scrolling || ju_sidebar.get('minimized')) return;//when minimized submenu's toggle should have no effect

			if(content_height() + height_change < available_height()) {
				this.disable();
			}
			else if(height_change < 0) {
				//if content height is decreasing
				//let's move nav down while a submenu is being hidden
				var scroll_top = scroll_content.scrollTop() + height_change
				if(scroll_top < 0) return;

				scroll_content.scrollTop(scroll_top);
			}
		}

		this._reset = function(recalc) {
			if(recalc === true) {
				this.sidebar_fixed = is_element_pos(sidebar, 'fixed');
			}

			if(ju.vars['webkit'])
				setTimeout(function() { self.reset() } , 0);
			else this.reset();
		}

		this.get = function(name) {
			if(this.hasOwnProperty(name)) return this[name];
		}
		this.set = function(name, value) {
			if(this.hasOwnProperty(name)) this[name] = value;
		}
		this.ref = function() {
			//return a reference to self
			return this;
		}

		this.updateStyle = function(styleClass) {
			if(!ju_scroll || nativeScroll) return;
			ju_scroll.update({styleClass: styleClass});
		}


		//change scrollbar size after a submenu is hidden/shown
		//but don't change if sidebar is minimized
		$sidebar.on('hidden.ju.submenu.sidebar_scroll shown.ju.submenu.sidebar_scroll', '.submenu', function(e) {
			e.stopPropagation();

			if( !ju_sidebar.get('minimized') ) {
				//webkit has a little bit of a glitch!!!
				self._reset();
			}
		})

		initiate(true);//true = on_page_load
	}



	//reset on document and window changes
	$(document).on('settings.ju.sidebar_scroll', function(ev, event_name, event_val){
		$('.sidebar[data-sidebar-scroll=true]').each(function() {
			var $this = $(this);
			var sidebar_scroll = $this.ju_sidebar_scroll('ref');

			if( event_name == 'sidebar_collapsed' ) {
				if( $this.attr('data-sidebar-hover') == 'true' ) $this.ju_sidebar_hover('reset');

				if(event_val == true) sidebar_scroll.disable();//disable scroll if collapsed
				else sidebar_scroll.reset();
			}
			else if( event_name === 'sidebar_fixed' || event_name === 'navbar_fixed' ) {
				var is_scrolling = sidebar_scroll.get('is_scrolling');
				var sidebar_fixed = is_element_pos(this, 'fixed')
				sidebar_scroll.set('sidebar_fixed', sidebar_fixed);

				if(sidebar_fixed && !is_scrolling) {
					sidebar_scroll.reset();
				}
				else if( !sidebar_fixed  && sidebar_scroll.get('only_if_fixed') ) {
					sidebar_scroll.disable();
				}
			}
		})
	})

	$(window).on('resize.ju.sidebar_scroll', function(){
		$('.sidebar[data-sidebar-scroll=true]').each(function() {
			var sidebar_scroll = $(this).ju_sidebar_scroll('ref');

			var sidebar_fixed = is_element_pos(this, 'fixed')
			sidebar_scroll.set('sidebar_fixed', sidebar_fixed);
			sidebar_scroll.reset();
		});
	})



	/////////////////////////////////////////////
	if(!$.fn.ju_sidebar_scroll) {
		$.fn.ju_sidebar_scroll = function (option, value) {
			var method_call;

			var $set = this.each(function () {
				var $this = $(this);
				var data = $this.data('ju_sidebar_scroll');
				var options = typeof option === 'object' && option;

				if (!data) $this.data('ju_sidebar_scroll', (data = new Sidebar_Scroll(this, options)));
				if (typeof option === 'string' && typeof data[option] === 'function') {
					method_call = data[option](value);
				}
			});

			return (method_call === undefined) ? $set : method_call;
		}

		$.fn.ju_sidebar_scroll.defaults = {
			'scroll_to_active': true,
			'include_shortcuts': true,
			'include_toggle': false,
			'scroll_style': '',
			'lock_anyway': false,
			'only_if_fixed': true
		}

	}

})(window.jQuery);

/**
 <b>Submenu hover adjustment</b>. Automatically move up a submenu to fit into screen when some part of it goes beneath window.
 Pass a "true" value as an argument and submenu will have native browser scrollbars when necessary.
 */

(function($ , undefined) {

    if( ju.vars['very_old_ie'] ) return;
    //ignore IE7 & below

    var hasTouch = ju.vars['touch'];
    var nativeScroll = ju.vars['old_ie'] || hasTouch;


    var is_element_pos =
        'getComputedStyle' in window ?
            //el.offsetHeight is used to force redraw and recalculate 'el.style.position' esp. for webkit!
            function(el, pos) { el.offsetHeight; return window.getComputedStyle(el).position == pos }
            :
            function(el, pos) { el.offsetHeight; return $(el).css('position') == pos }



    $(window).on('resize.sidebar.ju_hover', function() {
        $('.sidebar[data-sidebar-hover=true]').ju_sidebar_hover('update_vars').ju_sidebar_hover('reset');
    })

    $(document).on('settings.ju.ju_hover', function(e, event_name, event_val) {
        if(event_name == 'sidebar_collapsed') $('.sidebar[data-sidebar-hover=true]').ju_sidebar_hover('reset');
        else if(event_name == 'navbar_fixed') $('.sidebar[data-sidebar-hover=true]').ju_sidebar_hover('update_vars');
    })

    var sidebars = [];

    function Sidebar_Hover(sidebar , settings) {
        var self = this, that = this;

        var attrib_values = ju.helper.getAttrSettings(sidebar, $.fn.ju_sidebar_hover.defaults);
        this.settings = $.extend({}, $.fn.ju_sidebar_hover.defaults, settings, attrib_values);


        var $sidebar = $(sidebar), nav_list = $sidebar.find('.nav-list').get(0);
        $sidebar.attr('data-sidebar-hover', 'true');

        sidebars.push($sidebar);

        var sidebar_vars = {};
        var old_ie = ju.vars['old_ie'];



        var scroll_right = false;
        //scroll style class
        var hasHoverDelay = self.settings.sub_hover_delay || false;

        if(hasTouch && hasHoverDelay) self.settings.sub_hover_delay = parseInt(Math.max(self.settings.sub_hover_delay, 2500));//for touch device, delay is at least 2.5sec

        var $window = $(window);
        //navbar used for adding extra offset from top when adjusting submenu
        var $navbar = $('.navbar').eq(0);
        var navbar_fixed = $navbar.css('position') == 'fixed';
        this.update_vars = function() {
            navbar_fixed = $navbar.css('position') == 'fixed';
        }

        self.dirty = false;
        //on window resize or sidebar expand/collapse a previously "pulled up" submenu should be reset back to its default position
        //for example if "pulled up" in "responsive-min" mode, in "fullmode" should not remain "pulled up"
        this.reset = function() {
            if( self.dirty == false ) return;
            self.dirty = false;//so don't reset is not called multiple times in a row!

            $sidebar.find('.submenu').each(function() {
                var $sub = $(this), li = $sub.parent();
                $sub.css({'top': '', 'bottom': '', 'max-height': ''});

                if($sub.hasClass('ju-scroll')) {
                    $sub.ju_scroll('disable');
                }
                else {
                    $sub.removeClass('sub-scroll');
                }

                if( is_element_pos(this, 'absolute') ) $sub.addClass('can-scroll');
                else $sub.removeClass('can-scroll');

                li.removeClass('pull_up').find('.menu-text:first').css('margin-top', '');
            })

            $sidebar.find('.hover-show').removeClass('hover-show hover-shown hover-flip');
        }

        this.updateStyle = function(newStyle) {
            sub_scroll_style = newStyle;
            $sidebar.find('.submenu.ju-scroll').ju_scroll('update', {styleClass: newStyle});
        }
        this.changeDir = function(dir) {
            scroll_right = (dir === 'right');
        }


        //update submenu scrollbars on submenu hide & show

        var lastScrollHeight = -1;
        //hide scrollbars if it's going to be not needed anymore!
        if(!nativeScroll)
            $sidebar.on('hide.ju.submenu.sidebar_hover', '.submenu', function(e) {
                if(lastScrollHeight < 1) return;

                e.stopPropagation();
                var $sub = $(this).closest('.ju-scroll.can-scroll');
                if($sub.length == 0 || !is_element_pos($sub[0], 'absolute')) return;

                if($sub[0].scrollHeight - this.scrollHeight < lastScrollHeight) {
                    $sub.ju_scroll('disable');
                }
            });




        //reset scrollbars 
        if(!nativeScroll)
            $sidebar.on('shown.ju.submenu.sidebar_hover hidden.ju.submenu.sidebar_hover', '.submenu', function(e) {
                if(lastScrollHeight < 1) return;

                var $sub = $(this).closest('.ju-scroll.can-scroll');
                if($sub.length == 0 || !is_element_pos($sub[0], 'absolute') ) return;

                var sub_h = $sub[0].scrollHeight;

                if(lastScrollHeight > 14 && sub_h - lastScrollHeight > 4) {
                    $sub.ju_scroll('enable').ju_scroll('reset');//don't update track position
                }
                else {
                    $sub.ju_scroll('disable');
                }
            });


        ///////////////////////


        var currentScroll = -1;

        //some mobile browsers don't have mouseenter
        var event_1 = !hasTouch ? 'mouseenter.sub_hover' : 'touchstart.sub_hover';// pointerdown.sub_hover';
        var event_2 = !hasTouch ? 'mouseleave.sub_hover' : 'touchend.sub_hover touchcancel.sub_hover';// pointerup.sub_hover pointercancel.sub_hover';

        $sidebar.on(event_1, '.nav-list li, .sidebar-shortcuts', function (e) {
            sidebar_vars = $sidebar.ju_sidebar('vars');


            //ignore if collapsible mode (mobile view .navbar-collapse) so it doesn't trigger submenu movements
            //or return if horizontal but not mobile_view (style 1&3)
            if( sidebar_vars['collapsible'] /**|| sidebar_vars['horizontal']*/ ) return;

            var $this = $(this);

            var shortcuts = false;
            var has_hover = $this.hasClass('hover');

            var sub = $this.find('> .submenu').get(0);
            if( !(sub || ((this.parentNode == nav_list || has_hover || (shortcuts = $this.hasClass('sidebar-shortcuts'))) /**&& sidebar_vars['minimized']*/)) ) {
                if(sub) $(sub).removeClass('can-scroll');
                return;//include .compact and .hover state as well?
            }

            var target_element = sub, is_abs = false;
            if( !target_element && this.parentNode == nav_list ) target_element = $this.find('> a > .menu-text').get(0);
            if( !target_element && shortcuts ) target_element = $this.find('.sidebar-shortcuts-large').get(0);
            if( (!target_element || !(is_abs = is_element_pos(target_element, 'absolute'))) && !has_hover ) {
                if(sub) $(sub).removeClass('can-scroll');
                return;
            }


            var sub_hide = hasHoverDelay ? getSubHide(this) : null;
            //var show_sub = false;

            if(sub) {
                if(is_abs) {
                    self.dirty = true;

                    var newScroll = ju.helper.scrollTop();
                    //if submenu is becoming visible for first time or document has been scrolled, then adjust menu
                    if( (hasHoverDelay && !sub_hide.is_visible()) || (!hasTouch && newScroll != currentScroll) || old_ie ) {
                        //try to move/adjust submenu if the parent is a li.hover or if submenu is minimized
                        //if( is_element_pos(sub, 'absolute') ) {//for example in small device .hover > .submenu may not be absolute anymore!
                        $(sub).addClass('can-scroll');
                        //show_sub = true;
                        if(!old_ie && !hasTouch) adjust_submenu.call(this, sub);
                        else {
                            //because ie8 needs some time for submenu to be displayed and real value of sub.scrollHeight be kicked in
                            var that = this;
                            setTimeout(function() {	adjust_submenu.call(that, sub) }, 0)
                        }
                        //}
                        //else $(sub).removeClass('can-scroll');
                    }
                    currentScroll = newScroll;
                }
                else {
                    $(sub).removeClass('can-scroll');
                }
            }
            //if(show_sub) 
            hasHoverDelay && sub_hide.show();

        }).on(event_2, '.nav-list li, .sidebar-shortcuts', function (e) {
            sidebar_vars = $sidebar.ju_sidebar('vars');

            if( sidebar_vars['collapsible'] /**|| sidebar_vars['horizontal']*/ ) return;

            if( !$(this).hasClass('hover-show') ) return;

            hasHoverDelay && getSubHide(this).hideDelay();
        });


        function subHide(li_sub) {
            var self = li_sub, $self = $(self);
            var timer = null;
            var visible = false;

            this.show = function() {
                if(timer != null) clearTimeout(timer);
                timer = null;

                $self.addClass('hover-show hover-shown');
                visible = true;

                //let's hide .hover-show elements that are not .hover-shown anymore (i.e. marked for hiding in hideDelay)
                for(var i = 0; i < sidebars.length ; i++)
                {
                    sidebars[i].find('.hover-show').not('.hover-shown').each(function() {
                        getSubHide(this).hide();
                    })
                }
            }

            this.hide = function() {
                visible = false;

                $self.removeClass('hover-show hover-shown hover-flip');

                if(timer != null) clearTimeout(timer);
                timer = null;

                var sub = $self.find('> .submenu').get(0);
                if(sub) getSubScroll(sub, 'hide');
            }

            this.hideDelay = function(callback) {
                if(timer != null) clearTimeout(timer);

                $self.removeClass('hover-shown');//somehow marked for hiding

                timer = setTimeout(function() {
                    visible = false;
                    $self.removeClass('hover-show hover-flip');
                    timer = null;

                    var sub = $self.find('> .submenu').get(0);
                    if(sub) getSubScroll(sub, 'hide');

                    if(typeof callback === 'function') callback.call(this);
                }, that.settings.sub_hover_delay);
            }

            this.is_visible = function() {
                return visible;
            }
        }
        function getSubHide(el) {
            var sub_hide = $(el).data('subHide');
            if(!sub_hide) $(el).data('subHide', (sub_hide = new subHide(el)));
            return sub_hide;
        }


        function getSubScroll(el, func) {
            var sub_scroll = $(el).data('ju_scroll');
            if(!sub_scroll) return false;
            if(typeof func === 'string') {
                sub_scroll[func]();
                return true;
            }
            return sub_scroll;
        }

        function adjust_submenu(sub) {
            var $li = $(this);
            var $sub = $(sub);
            sub.style.top = '';
            sub.style.bottom = '';


            var menu_text = null
            if( sidebar_vars['minimized'] && (menu_text = $li.find('.menu-text').get(0)) ) {
                //2nd level items don't have .menu-text
                menu_text.style.marginTop = '';
            }

            var scroll = ju.helper.scrollTop();
            var navbar_height = 0;

            var $scroll = scroll;

            if( navbar_fixed ) {
                navbar_height = sidebar.offsetTop;//$navbar.height();
                $scroll += navbar_height + 1;
                //let's avoid our submenu from going below navbar
                //because of chrome z-index stacking issue and firefox's normal .submenu over fixed .navbar flicker issue
            }




            var off = $li.offset();
            off.top = parseInt(off.top);

            var extra = 0, parent_height;

            sub.style.maxHeight = '';//otherwise scrollHeight won't be consistent in consecutive calls!?
            var sub_h = sub.scrollHeight;
            var parent_height = $li.height();
            if(menu_text) {
                extra = parent_height;
                off.top += extra;
            }
            var sub_bottom = parseInt(off.top + sub_h)

            var move_up = 0;
            var winh = $window.height();


            //if the bottom of menu is going to go below visible window

            var top_space = parseInt(off.top - $scroll - extra);//available space on top
            var win_space = winh;//available window space

            var horizontal = sidebar_vars['horizontal'], horizontal_sub = false;
            if(horizontal && this.parentNode == nav_list) {
                move_up = 0;//don't move up first level submenu in horizontal mode
                off.top += $li.height();
                horizontal_sub = true;//first level submenu
            }

            if(!horizontal_sub && (move_up = (sub_bottom - (winh + scroll))) >= 0 ) {
                //don't move up more than available space
                move_up = move_up < top_space ? move_up : top_space;

                //move it up a bit more if there's empty space
                if(move_up == 0) move_up = 20;
                if(top_space - move_up > 10) {
                    move_up += parseInt(Math.min(25, top_space - move_up));
                }


                //move it down if submenu's bottom is going above parent LI
                if(off.top + (parent_height - extra) > (sub_bottom - move_up)) {
                    move_up -= (off.top + (parent_height - extra) - (sub_bottom - move_up));
                }

                if(move_up > 0) {
                    sub.style.top = -(move_up) + 'px';
                    if( menu_text ) {
                        menu_text.style.marginTop = -(move_up) + 'px';
                    }
                }
            }
            if(move_up < 0) move_up = 0;//when it goes below

            var pull_up = move_up > 0 && move_up > parent_height - 20;
            if(pull_up) {
                $li.addClass('pull_up');
            }
            else $li.removeClass('pull_up');


            //flip submenu if out of window width
            if(horizontal) {
                if($li.parent().parent().hasClass('hover-flip')) $li.addClass('hover-flip');//if a parent is already flipped, flip it then!
                else {
                    var sub_off = $sub.offset();
                    var sub_w = $sub.width();
                    var win_w = $window.width();
                    if(sub_off.left + sub_w > win_w) {
                        $li.addClass('hover-flip');
                    }
                }
            }


            //don't add scrollbars if it contains .hover menus
            var has_hover = $li.hasClass('hover') && !sidebar_vars['mobile_view'];
            if(has_hover && $sub.find('> li > .submenu').length > 0) return;


            //if(  ) {
            var scroll_height = (win_space - (off.top - scroll)) + (move_up);
            //if after scroll, the submenu is above parent LI, then move it down
            var tmp = move_up - scroll_height;
            if(tmp > 0 && tmp < parent_height) scroll_height += parseInt(Math.max(parent_height, parent_height - tmp));

            scroll_height -= 5;

            if(scroll_height < 90) {
                return;
            }

            var ju_scroll = false;
            if(!nativeScroll) {
                ju_scroll = getSubScroll(sub);
                if(ju_scroll == false) {
                    $sub.ju_scroll({
                        //hideOnIdle: true,
                        observeContent: true,
                        detached: true,
                        updatePos: false,
                        reset: true,
                        mouseWheelLock: true,
                        styleClass: self.settings.sub_scroll_style
                    });
                    ju_scroll = getSubScroll(sub);

                    var track = ju_scroll.get_track();
                    if(track) {
                        //detach it from body and insert it after submenu for better and cosistent positioning
                        $sub.after(track);
                    }
                }

                ju_scroll.update({size: scroll_height});
            }
            else {
                $sub
                    .addClass('sub-scroll')
                    .css('max-height', (scroll_height)+'px')
            }


            lastScrollHeight = scroll_height;
            if(!nativeScroll && ju_scroll) {
                if(scroll_height > 14 && sub_h - scroll_height > 4) {
                    ju_scroll.enable()
                    ju_scroll.reset();
                }
                else {
                    ju_scroll.disable();
                }

                //////////////////////////////////
                var track = ju_scroll.get_track();
                if(track) {
                    track.style.top = -(move_up - extra - 1) + 'px';

                    var off = $sub.position();
                    var left = off.left
                    if( !scroll_right ) {
                        left += ($sub.outerWidth() - ju_scroll.track_size());
                    }
                    else {
                        left += 2;
                    }
                    track.style.left = parseInt(left) + 'px';

                    if(horizontal_sub) {//first level submenu
                        track.style.left = parseInt(left - 2) + 'px';
                        track.style.top = parseInt(off.top) + (menu_text ? extra - 2 : 0) + 'px';
                    }
                }
            }
            //}


            //again force redraw for safari!
            if( ju.vars['safari'] ) {
                ju.helper.redraw(sub)
            }
        }

    }



    /////////////////////////////////////////////
    $.fn.ju_sidebar_hover = function (option, value) {
        var method_call;

        var $set = this.each(function () {
            var $this = $(this);
            var data = $this.data('ju_sidebar_hover');
            var options = typeof option === 'object' && option;

            if (!data) $this.data('ju_sidebar_hover', (data = new Sidebar_Hover(this, options)));
            if (typeof option === 'string' && typeof data[option] === 'function') {
                method_call = data[option](value);
            }
        });

        return (method_call === undefined) ? $set : method_call;
    }

    $.fn.ju_sidebar_hover.defaults = {
        'sub_sub_hover_delay': 750,
        'sub_scroll_style': 'no-track scroll-thin'
    }


})(window.jQuery);
    
/**
 <b>Sidebar functions</b>. Collapsing/expanding, toggling mobile view menu and other sidebar functions.
*/

(function($ , undefined) {
	var sidebar_count = 0;

	function Sidebar(sidebar, settings) {
		var self = this;
		this.$sidebar = $(sidebar);
		this.$sidebar.attr('data-sidebar', 'true');
		if( !this.$sidebar.attr('id') ) this.$sidebar.attr( 'id' , 'id-sidebar-'+(++sidebar_count) )

		
		//get a list of 'data-*' attributes that override 'defaults' and 'settings'
		var attrib_values = ju.helper.getAttrSettings(sidebar, $.fn.ju_sidebar.defaults, 'sidebar-');
		this.settings = $.extend({}, $.fn.ju_sidebar.defaults, settings, attrib_values);


		//some vars
		this.minimized = false;//will be initialized later
		this.collapsible = false;//...
		this.horizontal = false;//...
		this.mobile_view = false;//


		//return an array containing sidebar state variables
		this.vars = function() {
			return {'minimized': this.minimized, 'collapsible': this.collapsible, 'horizontal': this.horizontal, 'mobile_view': this.mobile_view}
		}
		this.get = function(name) {
			if(this.hasOwnProperty(name)) return this[name];
		}
		this.set = function(name, value) {
			if(this.hasOwnProperty(name)) this[name] = value;
		}
		

		//return a reference to self (sidebar instance)
		this.ref = function() {
			return this;
		}

		
		//toggle icon for sidebar collapse/expand button
		var toggleIcon = function(minimized, save) {
			var icon = $(this).find(ju.vars['.icon']), icon1, icon2;
			if(icon.length > 0) {
				icon1 = icon.attr('data-icon1');//the icon for expanded state
				icon2 = icon.attr('data-icon2');//the icon for collapsed state

				if(typeof minimized !== "undefined") {
					if(minimized) icon.removeClass(icon1).addClass(icon2);
					else icon.removeClass(icon2).addClass(icon1);
				}
				else {
					icon.toggleClass(icon1).toggleClass(icon2);
				}
				
				try {
					if(save !== false) ju.settings.saveState(icon.get(0));
				} catch(e) {}
			}
		}
		
		//if not specified, find the toggle button related to this sidebar
		var findToggleBtn = function() {
			var toggle_btn = self.$sidebar.find('.sidebar-collapse');
			if(toggle_btn.length == 0) toggle_btn = $('.sidebar-collapse[data-target="#'+(self.$sidebar.attr('id')||'')+'"]');
			if(toggle_btn.length != 0) toggle_btn = toggle_btn[0];
			else toggle_btn = null;
			
			return toggle_btn;
		}
		
		
		//collapse/expand sidebar
		this.toggleMenu = function(toggle_btn, save) {
			if(this.collapsible) return;

			this.minimized = !this.minimized;
			var save = !(toggle_btn === false || save === false);
			
		
			if(this.minimized) this.$sidebar.addClass('menu-min');
			else this.$sidebar.removeClass('menu-min');

			try {
				if(save) ju.settings.saveState(sidebar, 'class', 'menu-min', this.minimized);
			} catch(e) {}
		
			if( !toggle_btn ) {
				toggle_btn = findToggleBtn();
			}
			if(toggle_btn) {
				toggleIcon.call(toggle_btn, this.minimized, save);
			}

			//force redraw for ie8
			if(ju.vars['old_ie']) ju.helper.redraw(sidebar);
			
			
			$(document).trigger('settings.ju', ['sidebar_collapsed' , this.minimized, sidebar, save]);
		}
		this.collapse = function(toggle_btn, save) {
			if(this.collapsible) return;
			this.minimized = false;
			
			this.toggleMenu(toggle_btn, save);
		}
		this.expand = function(toggle_btn, save) {
			if(this.collapsible) return;
			this.minimized = true;
			
			this.toggleMenu(toggle_btn, save);
		}
		

		
		this.showResponsive = function() {
			this.$sidebar.removeClass(responsive_min_class).removeClass(responsive_max_class);
		}
		
		//collapse/expand in 2nd mobile style
		this.toggleResponsive = function(toggle_btn, showMenu) {
			if( !this.mobile_view || this.mobile_style != 3 ) return;
		
			if( this.$sidebar.hasClass('menu-min') ) {
				//remove menu-min because it interferes with responsive-max
				this.$sidebar.removeClass('menu-min');
				var btn = findToggleBtn();
				if(btn) toggleIcon.call(btn);
			}


			var showMenu = typeof showMenu !== 'undefined' ? showMenu : this.$sidebar.hasClass(responsive_min_class);
			if(showMenu) {
				this.$sidebar.addClass(responsive_max_class).removeClass(responsive_min_class);
			}
			else {
				this.$sidebar.removeClass(responsive_max_class).addClass(responsive_min_class);
			}
			this.minimized = !showMenu;


			if( !toggle_btn ) {
				toggle_btn = this.$sidebar.find('.sidebar-expand');
				if(toggle_btn.length == 0) toggle_btn = $('.sidebar-expand[data-target="#'+(this.$sidebar.attr('id')||'')+'"]');
				if(toggle_btn.length != 0) toggle_btn = toggle_btn[0];
				else toggle_btn = null;
			}
			
			if(toggle_btn) {
				var icon = $(toggle_btn).find(ju.vars['.icon']), icon1, icon2;
				if(icon.length > 0) {
					icon1 = icon.attr('data-icon1');//the icon for expanded state
					icon2 = icon.attr('data-icon2');//the icon for collapsed state

					if(!showMenu) icon.removeClass(icon2).addClass(icon1);
					else icon.removeClass(icon1).addClass(icon2);
				}
			}

			$(document).triggerHandler('settings.ju', ['sidebar_collapsed' , this.minimized]);
		}
		
		
		//some helper functions
		
		//determine if we have 4th mobile style responsive sidebar and we are in mobile view
		this.is_collapsible = function() {
			var toggle
			return (this.$sidebar.hasClass('navbar-collapse'))
			&& ((toggle = $('.navbar-toggle[data-target="#'+(this.$sidebar.attr('id')||'')+'"]').get(0)) != null)
			&&  toggle.scrollHeight > 0
			//sidebar is collapsible and collapse button is visible?
		}
		//determine if we are in mobile view
		this.is_mobile_view = function() {
			var toggle
			return ((toggle = $('.menu-toggler[data-target="#'+(this.$sidebar.attr('id')||'')+'"]').get(0)) != null)
			&&  toggle.scrollHeight > 0
		}


		//toggling (show/hide) submenu elements
		this.$sidebar.on(ju.click_event+'.ju.submenu', '.nav-list', function (ev) {
			var nav_list = this;

			//check to see if we have clicked on an element which is inside a .dropdown-toggle element?!
			//if so, it means we should toggle a submenu
			var link_element = $(ev.target).closest('a');
			if(!link_element || link_element.length == 0) return;//return if not clicked inside a link element

			var minimized  = self.minimized && !self.collapsible;
			//if .sidebar is .navbar-collapse and in small device mode, then let minimized be uneffective
	
			if( !link_element.hasClass('dropdown-toggle') ) {//it doesn't have a submenu return
				//just one thing before we return
				//if sidebar is collapsed(minimized) and we click on a first level menu item
				//and the click is on the icon, not on the menu text then let's cancel event and cancel navigation
				//Good for touch devices, that when the icon is tapped to see the menu text, navigation is cancelled
				//navigation is only done when menu text is tapped

				if( ju.click_event == 'tap'
					&&
					minimized
					&&
					link_element.get(0).parentNode.parentNode == nav_list )//only level-1 links
				{
					var text = link_element.find('.menu-text').get(0);
					if( text != null && ev.target != text && !$.contains(text , ev.target) ) {//not clicking on the text or its children
						ev.preventDefault();
						return false;
					}
				}


				//ios safari only has a bit of a problem not navigating to link address when scrolling down
				//specify data-link attribute to ignore this
				if(ju.vars['ios_safari'] && link_element.attr('data-link') !== 'false') {
					//only ios safari has a bit of a problem not navigating to link address when scrolling down
					//please see issues section in documentation
					document.location = link_element.attr('href');
					ev.preventDefault();
					return false;
				}

				return;
			}
			
			ev.preventDefault();
			
			


			var sub = link_element.siblings('.submenu').get(0);
			if(!sub) return false;
			var $sub = $(sub);

			var height_change = 0;//the amount of height change in .nav-list

			var parent_ul = sub.parentNode.parentNode;
			if
			(
				( minimized && parent_ul == nav_list )
				 || 
				( ( $sub.parent().hasClass('hover') && $sub.css('position') == 'absolute' ) && !self.collapsible )
			)
			{
				return false;
			}

			
			var sub_hidden = (sub.scrollHeight == 0)

			//if not open and visible, let's open it and make it visible
			if( sub_hidden && self.settings.hide_open_subs ) {//being shown now
			  $(parent_ul).find('> .open > .submenu').each(function() {
				//close all other open submenus except for the active one
				if(this != sub && !$(this.parentNode).hasClass('active')) {
					height_change -= this.scrollHeight;
					self.hide(this, self.settings.duration, false);
				}
			  })
			}

			if( sub_hidden ) {//being shown now
				self.show(sub, self.settings.duration);
				//if a submenu is being shown and another one previously started to hide, then we may need to update/hide scrollbars
				//but if no previous submenu is being hidden, then no need to check if we need to hide the scrollbars in advance
				if(height_change != 0) height_change += sub.scrollHeight;//we need new updated 'scrollHeight' here
			} else {
				self.hide(sub, self.settings.duration);
				height_change -= sub.scrollHeight;
				//== -1 means submenu is being hidden
			}

			//hide scrollbars if content is going to be small enough that scrollbars is not needed anymore
			//do this almost before submenu hiding begins
			//but when minimized submenu's toggle should have no effect
			if (height_change != 0) {
				if(self.$sidebar.attr('data-sidebar-scroll') == 'true' && !self.minimized) 
					self.$sidebar.ju_sidebar_scroll('prehide', height_change)
			}

			return false;
		})

		var submenu_working = false;
		this.show = function(sub, $duration, shouldWait) {
			//'shouldWait' indicates whether to wait for previous transition (submenu toggle) to be complete or not?
			shouldWait = (shouldWait !== false);
			if(shouldWait && submenu_working) return false;
					
			var $sub = $(sub);
			var event;
			$sub.trigger(event = $.Event('show.ju.submenu'))
			if (event.isDefaultPrevented()) {
				return false;
			}
			
			if(shouldWait) submenu_working = true;


			$duration = typeof $duration !== 'undefined' ? $duration : this.settings.duration;
			
			$sub.css({
				height: 0,
				overflow: 'hidden',
				display: 'block'
			})
			.removeClass('nav-hide').addClass('nav-show')//only for window < @grid-float-breakpoint and .navbar-collapse.menu-min
			.parent().addClass('open');
			
			sub.scrollTop = 0;//this is for submenu_hover when sidebar is minimized and a submenu is scrollTop'ed using scrollbars ...

			
			var complete = function(ev, trigger) {
				ev && ev.stopPropagation();
				$sub
				.css({'transition-property': '', 'transition-duration': '', overflow:'', height: ''})
				//if(ju.vars['webkit']) ju.helper.redraw(sub);//little Chrome issue, force redraw ;)

				if(trigger !== false) $sub.trigger($.Event('shown.ju.submenu'))
				
				if(shouldWait) submenu_working = false;
			}
			
			
			var finalHeight = sub.scrollHeight;

			if($duration == 0 || finalHeight == 0 || !$.support.transition.end) {
				//(if duration is zero || element is hidden (scrollHeight == 0) || CSS3 transitions are not available)
				complete();
			}
			else {
				$sub
				.css({
					 'height': finalHeight,
					 'transition-property': 'height',
					 'transition-duration': ($duration/1000)+'s'
					}
				)
				.one($.support.transition.end, complete);
				
				//there is sometimes a glitch, so maybe retry
				if(ju.vars['android'] ) {
					setTimeout(function() {
						complete(null, false);
						ju.helper.redraw(sub);
					}, $duration + 20);
				}
			}

			return true;
		 }
		 
		 
		 this.hide = function(sub, $duration, shouldWait) {
			//'shouldWait' indicates whether to wait for previous transition (submenu toggle) to be complete or not?
			shouldWait = (shouldWait !== false);
			if(shouldWait && submenu_working) return false;
		 
			
			var $sub = $(sub);
			var event;
			$sub.trigger(event = $.Event('hide.ju.submenu'))
			if (event.isDefaultPrevented()) {
				return false;
			}
			
			if(shouldWait) submenu_working = true;
			

			$duration = typeof $duration !== 'undefined' ? $duration : this.settings.duration;
			
			
			var initialHeight = sub.scrollHeight;
			$sub.css({
				height: initialHeight,
				overflow: 'hidden',
				display: 'block'
			})
			.parent().removeClass('open');

			sub.offsetHeight;
			//forces the "sub" to re-consider the new 'height' before transition

			
			var complete = function(ev, trigger) {
				ev && ev.stopPropagation();
				$sub
				.css({display: 'none', overflow:'', height: '', 'transition-property': '', 'transition-duration': ''})
				.removeClass('nav-show').addClass('nav-hide')//only for window < @grid-float-breakpoint and .navbar-collapse.menu-min

				if(trigger !== false) $sub.trigger($.Event('hidden.ju.submenu'))
				
				if(shouldWait) submenu_working = false;
			}
			
			
			if( $duration == 0 || initialHeight == 0 || !$.support.transition.end) {
				//(if duration is zero || element is hidden (scrollHeight == 0) || CSS3 transitions are not available)
				complete();
			}
			else {
				$sub
				.css({
					 'height': 0,
					 'transition-property': 'height',
					 'transition-duration': ($duration/1000)+'s'
					}
				)
				.one($.support.transition.end, complete);
				
				//there is sometimes a glitch, so maybe retry
				if(ju.vars['android'] ) {
					setTimeout(function() {
						complete(null, false);
						ju.helper.redraw(sub);
					}, $duration + 20);
				}
			}

			return true;
		 }

		 this.toggle = function(sub, $duration) {
			$duration = $duration || self.settings.duration;
		 
			if( sub.scrollHeight == 0 ) {//if an element is hidden scrollHeight becomes 0
				if( this.show(sub, $duration) ) return 1;
			} else {
				if( this.hide(sub, $duration) ) return -1;
			}
			return 0;
		 }


		//sidebar vars
		var minimized_menu_class  = 'menu-min';
		var responsive_min_class  = 'responsive-min';
		var responsive_max_class  = 'responsive-max';
		var horizontal_menu_class = 'h-sidebar';

		var sidebar_mobile_style = function() {
			//differnet mobile menu styles
			this.mobile_style = 1;//default responsive mode with toggle button inside navbar
			if(this.$sidebar.hasClass('responsive') && !$('.menu-toggler[data-target="#'+this.$sidebar.attr('id')+'"]').hasClass('navbar-toggle')) this.mobile_style = 2;//toggle button behind sidebar
			 else if(this.$sidebar.hasClass(responsive_min_class)) this.mobile_style = 3;//minimized menu
			  else if(this.$sidebar.hasClass('navbar-collapse')) this.mobile_style = 4;//collapsible (bootstrap style)
		}
		sidebar_mobile_style.call(self);
		  
		function update_vars() {
			this.mobile_view = this.mobile_style < 4 && this.is_mobile_view();
			this.collapsible = !this.mobile_view && this.is_collapsible();

			this.minimized = 
			(!this.collapsible && this.$sidebar.hasClass(minimized_menu_class))
			 ||
			(this.mobile_style == 3 && this.mobile_view && this.$sidebar.hasClass(responsive_min_class))

			this.horizontal = !(this.mobile_view || this.collapsible) && this.$sidebar.hasClass(horizontal_menu_class)
		}

		//update some basic variables
		$(window).on('resize.sidebar.vars' , function(){
			update_vars.call(self);
		}).triggerHandler('resize.sidebar.vars')
		
		
		
		
		
		this.mobileToggle = function(showMenu) {
			var showMenu = typeof showMenu === "undefined" ? undefined : showMenu;
			
			if(this.mobile_view) {
				if(this.mobile_style == 1 || this.mobile_style == 2) {
					this.toggleMobile(null, showMenu);
				}
				else if(this.mobile_style == 3) {
					this.toggleResponsive(null, showMenu);
				}
			}
			else if(this.collapsible) {
				this.toggleCollapsible(null, showMenu);
			}
		}
		this.mobileShow = function() {
			this.mobileToggle(true);
		}
		this.mobileHide = function() {
			this.mobileToggle(false);
		}
		
		
		
		this.toggleMobile = function(toggle_btn, showMenu) {
			if(!(this.mobile_style == 1 || this.mobile_style == 2)) return;
			
			var showMenu = typeof showMenu !== 'undefined' ? showMenu : !this.$sidebar.hasClass('display');
			if(!toggle_btn) {
				toggle_btn = $('.menu-toggler[data-target="#'+(this.$sidebar.attr('id')||'')+'"]');
				if(toggle_btn.length != 0) toggle_btn = toggle_btn[0];
				else toggle_btn = null;
			}
			if(showMenu) {
				this.$sidebar.addClass('display');
				if(toggle_btn) $(toggle_btn).addClass('display');
			}
			else {
				this.$sidebar.removeClass('display');
				if(toggle_btn) $(toggle_btn).removeClass('display');
			}
		}
		
		
		this.toggleCollapsible = function(toggle_btn, showMenu) {
			if(this.mobile_style != 4) return;
			
			var showMenu = typeof showMenu !== 'undefined' ? showMenu : !this.$sidebar.hasClass('in');
			if(showMenu) {
				this.$sidebar.collapse('show');
			}
			else {
				this.$sidebar.removeClass('display');
				this.$sidebar.collapse('hide');
			}	
		}

	}//end of Sidebar
	

	//sidebar events
	
	//menu-toggler
	$(document)
	.on(ju.click_event+'.ju.menu', '.menu-toggler', function(e){
		var btn = $(this);
		var sidebar = $(btn.attr('data-target'));
		if(sidebar.length == 0) return;
		
		e.preventDefault();
				
		//sidebar.toggleClass('display');
		//btn.toggleClass('display');
		
		sidebar.ju_sidebar('toggleMobile', this);
		
		var click_event = ju.click_event+'.ju.autohide';
		var auto_hide = sidebar.attr('data-auto-hide') === 'true';

		if( btn.hasClass('display') ) {
			//hide menu if clicked outside of it!
			if(auto_hide) {
				$(document).on(click_event, function(ev) {
					if( sidebar.get(0) == ev.target || $.contains(sidebar.get(0), ev.target) ) {
						ev.stopPropagation();
						return;
					}

					sidebar.ju_sidebar('toggleMobile', this, false);
					$(document).off(click_event);
				})
			}

			if(sidebar.attr('data-sidebar-scroll') == 'true') sidebar.ju_sidebar_scroll('reset');
		}
		else {
			if(auto_hide) $(document).off(click_event);
		}

		return false;
	})
	//sidebar collapse/expand button
	.on(ju.click_event+'.ju.menu', '.sidebar-collapse', function(e){
		
		var target = $(this).attr('data-target'), $sidebar = null;
		if(target) $sidebar = $(target);
		if($sidebar == null || $sidebar.length == 0) $sidebar = $(this).closest('.sidebar');
		if($sidebar.length == 0) return;

		e.preventDefault();
		$sidebar.ju_sidebar('toggleMenu', this);
	})
	//this button is used in `mobile_style = 3` responsive menu style to expand minimized sidebar
	.on(ju.click_event+'.ju.menu', '.sidebar-expand', function(e){
		var target = $(this).attr('data-target'), $sidebar = null;
		if(target) $sidebar = $(target);
		if($sidebar == null || $sidebar.length == 0) $sidebar = $(this).closest('.sidebar');
		if($sidebar.length == 0) return;	
	
		var btn = this;
		e.preventDefault();
		$sidebar.ju_sidebar('toggleResponsive', this);
		
		var click_event = ju.click_event+'.ju.autohide';
		if($sidebar.attr('data-auto-hide') === 'true') {
			if( $sidebar.hasClass(responsive_max_class) ) {
				$(document).on(click_event, function(ev) {
					if( $sidebar.get(0) == ev.target || $.contains($sidebar.get(0), ev.target) ) {
						ev.stopPropagation();
						return;
					}

					$sidebar.ju_sidebar('toggleResponsive', btn);
					$(document).off(click_event);
				})
			}
			else {
				$(document).off(click_event);
			}
		}
	})

	
	$.fn.ju_sidebar = function (option, value, value2) {
		var method_call;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('ju_sidebar');
			var options = typeof option === 'object' && option;

			if (!data) $this.data('ju_sidebar', (data = new Sidebar(this, options)));
			if (typeof option === 'string' && typeof data[option] === 'function') {
				if(value instanceof Array) method_call = data[option].apply(data, value);
				else if(value2 !== undefined) method_call = data[option](value, value2);
				else method_call = data[option](value);
			}
		});

		return (method_call === undefined) ? $set : method_call;
	};
	
	
	$.fn.ju_sidebar.defaults = {
		'duration': 300,
		'hide_open_subs': true
    }


})(window.jQuery);
