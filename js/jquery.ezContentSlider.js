/**
 * jQuery ezContentSlider Plugin
 * Version: 0.5.9 (beta)
 * URL: http://ezContentSlider.com 
 * Description: Lite-weight (.min is ~14k) full-featured (and responsive) content slider (or fade). Works on images (see demo), as well as non-images (with minor adjustments).
 * Requires: 1.9.x - Designed and developed using 1.9.x. (Not sure if it works with any earlier jQ releases but you're welcome to try.)
 * Author: Mark "Chief Alchemist" Simchock (http://ChiefAlchemist.com)
 * Copyright: Copyright 2014 Alchemy United (AlchemyUnited.com)
 * License: Free to use under the GPLv2 license. http://www.gnu.org/licenses/gpl-2.0.html
 *
 * PLEASE NOTE: If you use ezCS on a site and publish something about the site - for example, a blog post about the launch - please give some link back love to http://ezContentSlider.com. Thanks
 */
 
/**
-- CHANGE LOG --

-- 0.5.9 - Fri 25 July 2014
---- FIXED: Full-screen image sizing calculation issue
---- TODO: Leaning on lazy-load changed the POV of how things work. Revisit and look for efficiency improvements

-- 0.5.8 - Fri 11 July 2014
---- FIXED: Mopped up a dingleberry with full-screen and Chrome (PC).
---- FIXED: Carousel was getting mucked up by too clicks too often. Not any more :)

-- 0.5.7 - Thur 10 July 2014
---- ADDED: "Lazy load" for full screen images. When in full-screen, slide will show normal size image stretched to full while the larger image loads, else (i.e., onerror) we continue to use the normal image. 

-- 0.5.6 - Wed 9 July 2014
---- FIXED: Make sure the selector is present on the current page. Don't try to setup the slider if there's no selector to set it up on. #Duh

-- 0.5.5 - Tue 9 Oct 2012
---- FIXED: One of the calls to function ezcsPlayAuto() passed an extra parm which (needless to say) mucked things up. 

-- 0.5.4 - Tue 18 Sept 2012
---- FIXED: ezcsIsBusy - main next / prev clicks are ignored until transition fadeIn (or slide over) is completed. 
---- CHANGED: Did a load of variable renaming (read: shortened them) to try to make the overall file size smaller.

-- 0.5.3 - Mon 17 Sept 2012
---- ADDED: Escape key closes fullscreen
---- ADDED: Main image next / prev keeps carousel in sync

-- 0.5.2 - Thur 13 Sept 2012
---- ADDED: var oEzcs - Single object makes it easier to pass a collection of vars that were previously "global"
---- CHANGED: Adding oEzcs resulted in clean up of orphaned code and vars
---- ADDED: Support for multiple ezContentSliders per page
---- ADDED Option/default:: carouselPageClickStopsPlayAuto - true / false
---- ADDED Option/default:: mainNextPrevClickStopsPlayAuto - true / false
---- ADDED Option/default: displayFullStyle : 'fill' / 'fit' else any other value defaults to 'fill'
---- ADDED Option/default: displayFullFillCenterImg : true / false will resize full image from upper left corner (i.e., no centering)
---- ADDED: a couple other settings, but nothing that effects functionality (per se)
 
-- 0.5.1 - Fri 10 Aug 2012
---- ADDED: Support of social media share button (show / hide)
 *
 */
 
 
// Plugin closure wrapper
(function($) {
	// Main plugin function
	$.fn.ezContentSlider = function(options) { 
		// oEzcs are a collection of vars that are used across the plugin.  
		var $this = $(this),
			oEzcs = {
				opts : '',
				ezcsIsBusy : false,
				nowIndex : 0,
				nowGroup : 0,
				nowDisplayWidth : 0,
				nowDisplayHeight : 0,
				cMainSlidesUL : '',
				cMainSlidesList : '',
				cCarouselWrapper : '',
				cCarouselPagesWrap : '',
				cCarouselPagesUL : '',
				cCarouselPagesList : '',
				newPagesPerClick : '',
				numOfGroups : '',
				cControlsPlayClass : '',
				cDisplayRegClass : '',
				cDisplayFullClass : '',
				cCaptionRegClass : '',
				cCaptionFullClass : '',
				cShareRegClass : '',
				cShareFullClass : '',
				loaderSelector : '',
				autoPlayInterval : '',
				objImage : ''
		};
		
		// if the selector the plugin is attached to isn't on the page then there's no sense continuing.
		if ( $this.length == 0){
		  return $this;
		}
		
		// overwrite plugin defaults with user options
		oEzcs.opts = $.extend({}, $.fn.ezContentSlider.defaults, options);
		// the lazy load needs this
		oEzcs.opts.objImage = new Image();
		
		// a couple quick opts validations
		// in general to keep code-bloat to a minimum the plugin presumes the options values will be valid. if not, things could break so please be careful
		if ( oEzcs.opts.carouselGroupPageOverlap < 0 ){
			oEzcs.opts.carouselGroupPageOverlap = 1;
		}
		if ( oEzcs.opts.carouselSlideEasing != 'swing'){
			oEzcs.opts.carouselSlideEasing = 'linear';
		}
		if ( oEzcs.opts.slidesPerSlideEasing != 'swing'){
			oEzcs.opts.slidesPerSlideEasing = 'linear';
		}
		if (oEzcs.opts.startIndex < 0) {
			oEzcs.opts.startIndex = 0;
		}
		oEzcs.loaderSelector = $this.find(oEzcs.opts.loaderSelector);
		// cache the UL for the sliding effect
		oEzcs.cMainSlidesUL = $this.find(oEzcs.opts.slidesMainSelector +' ul');
		// get all the li children and cache them into cMainSlidesList for the main images
		oEzcs.cMainSlidesList = $this.find(oEzcs.opts.slidesMainSelector +' ul > li');

		// lets make sure we have something to work with
		if ( oEzcs.cMainSlidesList.length > 0 ) {
			// let the setup begin...
			oEzcs.loaderSelector.show();
			// start with what screen mode? reg or fullscreen?
			oEzcs.cDisplayRegClass = oEzcs.cMainSlidesList.find(oEzcs.opts.displayRegClass);
			oEzcs.cDisplayFullClass = oEzcs.cMainSlidesList.find(oEzcs.opts.displayFullClass);
			
			// if the large imgs are to be lazy loaded then there's a bit more setup to do
			// let's swap the reg img into the full spot and stash the full in a data attr for later
			if (oEzcs.opts.mainFullImgLazyLoad != false){
			  oEzcs.cDisplayFullClass.filter('img').each(function(index){
				imgRegSrc = oEzcs.cDisplayRegClass.filter('img').eq(index).attr('src');
				// take the "large: src and stash it to a data-attribute
			    $(this).attr('data-'+oEzcs.opts.mainFullImgSrcDataAttr, $(this).attr('src'));
				// take the reg src and use it for the full image - for now
				$(this).attr('src',imgRegSrc);
			});
			
			}
			// cache the captions
			oEzcs.cCaptionRegClass = oEzcs.cMainSlidesList.find(oEzcs.opts.captionRegClass);
			oEzcs.cCaptionFullClass = oEzcs.cMainSlidesList.find(oEzcs.opts.captionFullClass);
			// cache the share
			oEzcs.cShareRegClass = oEzcs.cMainSlidesList.find(oEzcs.opts.shareRegClass);
			oEzcs.cShareFullClass = oEzcs.cMainSlidesList.find(oEzcs.opts.shareFullClass);
			// show the captions?
			if (!oEzcs.opts.captionIsShow){
				oEzcs.cCaptionRegClass.hide();
				oEzcs.cCaptionFullClass.hide();
			}
			// show the share options?
			if (!oEzcs.opts.shareIsShow){
				oEzcs.cShareRegClass.hide();
				oEzcs.cShareFullClass.hide();
			}
			// initial view is regular or full screen
			if (oEzcs.opts.displayIsReg) {
				// if the effect is fade then all the main slides need to start as .hide()
				// we decide which is the first to .show() about 30 lines down.
				if ( oEzcs.opts.slidesMainEffect === 'fade') {
					oEzcs.cMainSlidesList.hide();
				}
				// if reg then hide the fullscreen stuff
				oEzcs.cMainSlidesList.find(oEzcs.opts.displayFullClass).hide();				
			} else {
				// else, it's fullscreen
				$this.addClass(oEzcs.opts.fullToThisAddClassName);
				oEzcs.cDisplayRegClass.hide();
				oEzcs.cDisplayFullClass.show();
				oEzcs.opts.displayIsReg = false;
			}
			oEzcs = ezcsMainResize($this,oEzcs);
			// setup the carousel
			if ( oEzcs.opts.carouselUse ) { 
				oEzcs.cCarouselWrapper = $this.find(oEzcs.opts.carouselWrapperSelector);
				oEzcs.cCarouselPagesWrap = oEzcs.cCarouselWrapper.find(oEzcs.opts.carouselPagesWrapperSelector);
				oEzcs.cCarouselPagesUL = oEzcs.cCarouselPagesWrap.find('ul');
				oEzcs.cCarouselPagesList = oEzcs.cCarouselWrapper.find('ul > li');
				oEzcs.cCarouselPagesList.show();
				oEzcs.cCarouselPagesList.eq(oEzcs.nowIndex).addClass(oEzcs.opts.carouselPageSelectedClassName);
				oEzcs = ezcsCalculateCarouselVars(oEzcs);
			}
			// is the startIndex != 0 (i.e., the oEzcs.nowIndex init value)
			if (oEzcs.opts.startIndex > 0) {
				if (oEzcs.opts.startIndex > oEzcs.cMainSlidesList.length) {
					oEzcs.opts.startIndex = 0;
				}
				oEzcs = ezcsShowMain(oEzcs.opts.startIndex, oEzcs);
			}
			oEzcs.cMainSlidesList.eq(oEzcs.opts.startIndex).show();
			// get the controls setup
			oEzcs = ezcsSetupControls($this,oEzcs);
			// we're (finally) done so hide the loader gif
			oEzcs.loaderSelector.hide();
			// ALL READY! 
			// autoPlay?
			if ( oEzcs.opts.playAutoPlaying ) { 
			  oEzcs = ezcsPlayAuto(oEzcs)
			}	
		} 
		
		// if the window resizes then we have some things to do
		$(window).resize(function() {
		  oEzcs = ezcsMainResize($this, oEzcs);
			// if the window size changes so does the carousel
			if ( oEzcs.opts.carouselUse ) {
			  oEzcs = ezcsCalculateCarouselVars(oEzcs);
			}
			// reposition the current image based on the resize()
			imgLrg = oEzcs.cMainSlidesList.eq(oEzcs.nowIndex).find('img' + oEzcs.opts.displayFullClass);
			oEzcs = ezcsFullPosition(imgLrg, oEzcs);
		});
		return $this;	
 
  
	function ezcsMainResize($this,oEzcs) {
		// for reasons I couldn't uncover, $(opts.slidesMainSelector).width() returns a value that's slightly off unless this width is reset to 'auto' here first. 
		// Hack-y? Perhaps (but it works).
		// the issue has something to do with fullscreen making the list items wider than the slidesMainSelector. then when going from full to reg the .width() get thrown off a bit. 
		// "reset" the height too
		oEzcs.cMainSlidesList.css({'width':'auto','height':'auto'});
		// regular display
		if ( oEzcs.opts.displayIsReg ) {
			// get the width
			oEzcs.nowDisplayWidth = $this.find(oEzcs.opts.slidesMainSelector).width();
			// set the width of the list items
			oEzcs.cMainSlidesList.css('width', oEzcs.nowDisplayWidth);
			// for sliding, set the width of the UL
			oEzcs.cMainSlidesUL.css('width',(oEzcs.nowDisplayWidth * oEzcs.cMainSlidesList.length))
		} else {
		  // else: fullscreen display
		  oEzcs.nowDisplayWidth = window.innerWidth; //window.innerWidth
		  oEzcs.nowDisplayHeight = window.innerHeight;
		  
		  oEzcs.cMainSlidesList.css('width', oEzcs.nowDisplayWidth).css('height', oEzcs.nowDisplayHeight);
		  oEzcs.cMainSlidesUL.css('width', (oEzcs.nowDisplayWidth * oEzcs.cMainSlidesList.length)+'px' );
		}
	return oEzcs;
	}
	
	
	function ezcsFullPosition(thisImg,oEzcs){
	
	  if (oEzcs.opts.displayFullStyle === 'fit') {
	
		if ((oEzcs.nowDisplayWidth / oEzcs.nowDisplayHeight) > (thisImg.data(oEzcs.opts.mainFullImgRatioDataAttr))) {
		  // window aspect ratio is "wider" than img aspect ratio -> resize on the height and then center the width
		  thisImg.addClass(oEzcs.opts.displayFullImgHeight100PercentClassName);
		  thisImg.removeClass(oEzcs.opts.displayFullImgWidth100PercentClassName);
		  marginLeft = (oEzcs.nowDisplayWidth - (thisImg.data(oEzcs.opts.mainFullImgWidthDataAttr) * (oEzcs.nowDisplayHeight/ thisImg.data(oEzcs.opts.mainFullImgHeightDataAttr)))) / 2;
		  thisImg.css({'margin-top': 'auto','margin-left':marginLeft});
		} else {
		  // window aspect ratio is "taller" than img aspect ratio -> resize on the width and then center the height 
		  thisImg.addClass(oEzcs.opts.displayFullImgWidth100PercentClassName);
		  thisImg.removeClass(oEzcs.opts.displayFullImgHeight100PercentClassName);
		  marginTop = (oEzcs.nowDisplayHeight - (thisImg.data(oEzcs.opts.mainFullImgHeightDataAttr) * (oEzcs.nowDisplayWidth/ thisImg.data(oEzcs.opts.mainFullImgWidthDataAttr)))) / 2;
		  thisImg.css({'margin-top': marginTop,'margin-left':'auto'});	
		}
	    
	  } else { // fill
	    if ( oEzcs.opts.displayFullFillCenterImg ) {
		  // what is the display's aspect ratio vs the images acpect ratio?
		  // this will determine if we resize to fill using the height or the width
						if ((oEzcs.nowDisplayWidth / oEzcs.nowDisplayHeight) > (thisImg.data(oEzcs.opts.mainFullImgRatioDataAttr))) {
							// window aspect ratio is "wider" than img aspect ratio -> resize on the width and then center the vert 
							thisImg.addClass(oEzcs.opts.displayFullImgWidth100PercentClassName);
							thisImg.removeClass(oEzcs.opts.displayFullImgHeight100PercentClassName);
							marginTop = (oEzcs.nowDisplayHeight - (thisImg.data(oEzcs.opts.mainFullImgHeightDataAttr) * (oEzcs.nowDisplayWidth/ thisImg.data(oEzcs.opts.mainFullImgWidthDataAttr)))) / 2;
							thisImg.css({'margin-top': marginTop,'margin-left':'auto'});
						} else {
							// window aspect ratio is "taller" than img aspect ratio -> resize on the height and then center the horizontal 
							thisImg.addClass(oEzcs.opts.displayFullImgHeight100PercentClassName);
							thisImg.removeClass(oEzcs.opts.displayFullImgWidth100PercentClassName);
							marginLeft = (oEzcs.nowDisplayWidth - (thisImg.data(oEzcs.opts.mainFullImgWidthDataAttr) * (oEzcs.nowDisplayHeight/ thisImg.data(oEzcs.opts.mainFullImgHeightDataAttr)))) / 2;
							thisImg.css({'margin-top': 'auto','margin-left':marginLeft});	
						}
					
				} else {
						// what is the display's aspect ratio vs the images acpect ratio?
						// this will determine if we resize to fill using the height or the width
						if ((oEzcs.nowDisplayWidth / oEzcs.nowDisplayHeight) > (thisImg.data(oEzcs.opts.mainFullImgRatioDataAttr))) {
							// window aspect ratio is "wider" than img aspect ratio -> resize on the width and then center the vert 
							thisImg.addClass(oEzcs.opts.displayFullImgWidth100PercentClassName);
							thisImg.removeClass(oEzcs.opts.displayFullImgHeight100PercentClassName);
						} else {
							// window aspect ratio is "taller" than img aspect ratio -> resize on the height and then center the horizontal 
							thisImg.addClass(oEzcs.opts.displayFullImgHeight100PercentClassName);
							thisImg.removeClass(oEzcs.opts.displayFullImgWidth100PercentClassName);	
						}
						
				}
			}	
	  return oEzcs;
	}
	
	function ezcsCalculateCarouselVars(oEzcs) {
		// currently how wide is the carousel window?
		var carouselWidth = oEzcs.cCarouselWrapper.find(oEzcs.opts.carouselPagesWrapperSelector).width();
		// how many pages/thumbs will fit in that window? that is, how many in a group)? 
		pagesPerGroup = Math.floor( carouselWidth / oEzcs.opts.carouselPageWidthInt );
		// how many pages/thumbs should overlap when paging from one group to the next
		oEzcs.newPagesPerClick = pagesPerGroup - oEzcs.opts.carouselGroupPageOverlap;
		// is the overlap too much?
		if ( oEzcs.newPagesPerClick < 1 ) {
			oEzcs.newPagesPerClick = pagesPerGroup;
		}
		// number of Groups? we round up because even part of a group is still a group
		oEzcs.numOfGroups = Math.ceil( oEzcs.cCarouselPagesList.length  / oEzcs.newPagesPerClick ) - 1;
	return oEzcs;
	}
	
	function ezcsSetupControls($this,oEzcs){
		var cControlsSwitchClass = $this.find(oEzcs.opts.controlsSwitchClass),
			cControlsSwitchWrapperClass = $this.find(oEzcs.opts.controlsSwitchWrapperClass),
			cControlsThumbsClass = $this.find(oEzcs.opts.controlsThumbsClass),
			cControlsCaptionClass = $this.find(oEzcs.opts.controlsCaptionClass),
			cControlsShareClass = $this.find(oEzcs.opts.controlsShareClass),
			cControlsDisplayClass =  $this.find(oEzcs.opts.controlsDisplayClass),
			cMainPrevSelector =  $this.find(oEzcs.opts.mainPrevSelector),
			cMainNextSelector =  $this.find(oEzcs.opts.mainNextSelector);
			// we might need to toggle this if the autoPlayContineous is false
			oEzcs.cControlsPlayClass =  $this.find(oEzcs.opts.controlsPlayClass);
			
		if ( oEzcs.opts.carouselUse ) {
			var cCarouselGroupNext = $this.find(oEzcs.opts.carouselGroupNextSelector),
				cCarouselGroupPrev = $this.find(oEzcs.opts.carouselGroupPrevSelector);
			// click on a carousel list item?	
			oEzcs.cCarouselPagesList.on('click',function(){	
			  // make sure we're not already busy
			  if ( ! oEzcs.ezcsIsBusy ) {
				// should playAuto be stopped?
				if ( oEzcs.opts.playAutoPlaying && oEzcs.opts.carouselPageClickStopsPlayAuto ) {
					oEzcs.opts.playAutoPlaying = false;
					clearInterval(oEzcs.autoPlayInterval);
					oEzcs.cControlsPlayClass.toggle();
				}
				oEzcs = ezcsShowMain( $(this).index(), oEzcs);
			  }
			});
			// next carousel group?	
			cCarouselGroupNext.on('click',function(){	
				oEzcs = ezcsCarouselGroupPaging('next', oEzcs);	
			});
			// prev carousel group
			cCarouselGroupPrev.on('click',function(){		
				oEzcs = ezcsCarouselGroupPaging('prev', oEzcs);
			});	
		}
		// next main content slide?		
		cMainNextSelector.on('click',function(){
			// should playAuto be stopped?
			if ( oEzcs.opts.playAutoPlaying && oEzcs.opts.mainNextPrevClickStopsPlayAuto ) {
				oEzcs.opts.playAutoPlaying = false;
				clearInterval(oEzcs.autoPlayInterval);
				oEzcs.cControlsPlayClass.toggle();
			}
			ezcsMainNavigate('next', oEzcs);
		});
		// prev main content slide?
		cMainPrevSelector.on('click',function(){
			// should playAuto be stopped?
			if ( oEzcs.opts.playAutoPlaying && oEzcs.opts.mainNextPrevClickStopsPlayAuto ) {
				oEzcs.opts.playAutoPlaying = false;
				clearInterval(oEzcs.autoPlayInterval);
				oEzcs.cControlsPlayClass.toggle();
			}
			ezcsMainNavigate('prev', oEzcs);
		});			

		$(document).on('keyup.$this', function( event ) {
			if (event.keyCode === 39) {
					ezcsMainNavigate( 'next', oEzcs);
			} else if (event.keyCode === 37) {
					ezcsMainNavigate( 'prev' , oEzcs);
			}
		});	
		// toggle controls display (with a fade if you like)
		cControlsSwitchClass.on('click',function(){
			cControlsSwitchClass.toggle();
			cControlsSwitchWrapperClass.fadeToggle(oEzcs.opts.controlsSwitchFadeDuration);
		});
		
		// toggle between reg display and fullscreen		
		cControlsDisplayClass.on('click',function(){
			cControlsDisplayClass.toggle();
			oEzcs = ezcsToggleRegFull($this,oEzcs)
		});
		
		// escape key out of fullscreen mode
		$(document).keyup(function(e) {
			if ((e.keyCode == 27) && (oEzcs.opts.displayIsReg === false) && (oEzcs.opts.displayFullCloseWithEscape)) {
				cControlsDisplayClass.toggle();
				oEzcs = ezcsToggleRegFull($this,oEzcs)
			}	   
		});
		
		// toggle the displaying of the carousel / thumbs 
		cControlsThumbsClass.on('click',function(){
			cControlsThumbsClass.toggle();
			oEzcs.cCarouselWrapper.fadeToggle(oEzcs.opts.controlsSwitchFadeDuration);
		});
		
		// toggle the displaying of the captions
		cControlsCaptionClass.on('click',function(){
			cControlsCaptionClass.toggle();
			if ( oEzcs.opts.captionIsShow ) {
				oEzcs.cCaptionRegClass.hide();
				oEzcs.cCaptionFullClass.hide();
				oEzcs.opts.captionIsShow = false;
			} else {
				if ( oEzcs.opts.displayIsReg ) {
					oEzcs.cCaptionRegClass.show();
				} else {
					oEzcs.cCaptionFullClass.show();
				}
				oEzcs.opts.captionIsShow = true;			
			}
		});
		
		// toggle the displaying of the share options
		cControlsShareClass.on('click',function(){
			cControlsShareClass.toggle();
			if ( oEzcs.opts.shareIsShow ) {
				oEzcs.cShareRegClass.hide();
				oEzcs.cShareFullClass.hide();
				oEzcs.opts.shareIsShow = false;
			} else {
				if ( oEzcs.opts.displayIsReg ) {
					oEzcs.cShareRegClass.show();
				} else {
					oEzcs.cShareFullClass.show();
				}
				oEzcs.opts.shareIsShow = true;			
			}
		});
		
		// toggle the displaying of the Play / Pause 
		oEzcs.cControlsPlayClass.on('click',function(){
			oEzcs.cControlsPlayClass.toggle();
			if ( oEzcs.opts.playAutoPlaying ) {
				clearInterval(oEzcs.autoPlayInterval);
				oEzcs.opts.playAutoPlaying = false;
			} else {
				oEzcs = ezcsPlayAuto(oEzcs)
				oEzcs.opts.playAutoPlaying = true;		
			}
			
		});
	return oEzcs;
	}
	
	// toggle between Reg display and Fullscreen
	function ezcsToggleRegFull($this,oEzcs) {	
		// what is the current display reg else full
		if (oEzcs.opts.displayIsReg) { 
			oEzcs.cDisplayRegClass.hide();
			$this.addClass(oEzcs.opts.fullToThisAddClassName);
			oEzcs.cDisplayFullClass.show();
			oEzcs.opts.displayIsReg = false;
		} else {
		   oEzcs.cDisplayFullClass.hide();
			$this.removeClass(oEzcs.opts.fullToThisAddClassName); 
			oEzcs.cDisplayRegClass.show();
			oEzcs.opts.displayIsReg = true;		
		}
		// do the main resizing
		oEzcs = ezcsMainResize($this,oEzcs);
		// now redraw the main based on the new dimensions
		oEzcs = ezcsShowMain(oEzcs.nowIndex,oEzcs);
		// the carousel too
		oEzcs = ezcsCalculateCarouselVars(oEzcs);
		// opps? did we show the captions / share options even tho' the captionIsShow flag is false? yeah, kinda a hacky workaround but it works
		if ( !oEzcs.opts.captionIsShow) { 
			oEzcs.cCaptionRegClass.hide();
			oEzcs.cCaptionFullClass.hide();
		}
		if ( !oEzcs.opts.shareIsShow) { 
			oEzcs.cShareRegClass.hide();
			oEzcs.cShareFullClass.hide();
		}
	return oEzcs;
	}
	
	function ezcsPlayAuto(oEzcs) {
		var playNext = oEzcs.nowIndex;
		oEzcs.autoPlayInterval = setInterval(function() {	
			if ((playNext - ((oEzcs.nowGroup * oEzcs.newPagesPerClick) - 1)) >= (oEzcs.newPagesPerClick - 1) && (oEzcs.opts.carouselUse)) {
				oEzcs = ezcsCarouselGroupPaging('next',oEzcs);
			}	
			++playNext;
			if ( playNext < oEzcs.cMainSlidesList.length ) {
				oEzcs = ezcsShowMain( playNext, oEzcs);
				oEzcs.nowIndex = playNext;				
			} else if ( oEzcs.opts.playContinuous ) {
				    playNext = -1;
					oEzcs.nowIndex = -1;
					oEzcs.nowGroup = -1;
					// slide and fade for playContinuous are slightly different.
					if ( oEzcs.opts.carouselUse ) {
						if ( oEzcs.opts.carouselGroupPagingEffect === 'fade' ) {
							oEzcs.nowGroup = 1;
						}
						oEzcs = ezcsCarouselGroupPaging('prev',oEzcs);
					}
				} else {
					oEzcs.opts.playAutoPlaying = false;
					oEzcs.cControlsPlayClass.toggle();
					clearInterval(oEzcs.autoPlayInterval);
				}
		}, oEzcs.opts.playAutoDuration );
	return oEzcs;
	}
	
	function ezcsCarouselGroupPaging (direction,oEzcs) {
		// which paging effect ?
		if ( oEzcs.opts.carouselGroupPagingEffect === 'fade') {
			if (( direction == 'next' )  && ( oEzcs.nowGroup < oEzcs.numOfGroups )) {
				// the hide'em loop index will need to be adjusted. idxAdjust = ((oEzcs.nowGroup * oEzcs.newPagesPerClick) - 1);
				// hide'em
				for( idx = 1; idx <= oEzcs.newPagesPerClick; idx++){
					oEzcs.cCarouselPagesList.eq(idx + ((oEzcs.nowGroup * oEzcs.newPagesPerClick) - 1)).fadeOut(oEzcs.opts.carouselGroupPagingDuration);
				}
				++oEzcs.nowGroup;
			} else if (direction === 'prev' && oEzcs.nowGroup > 0){
				--oEzcs.nowGroup;
			    // the hide'em loop index will need to be adjusted. idxAdjust = ((oEzcs.nowGroup * oEzcs.newPagesPerClick) - 1);
				// hide'em
				for( idx = 1; idx <= oEzcs.newPagesPerClick; idx++){
					oEzcs.cCarouselPagesList.eq(idx +((oEzcs.nowGroup * oEzcs.newPagesPerClick) - 1)).fadeIn(oEzcs.opts.carouselGroupPagingDuration);
				}
			}
		} else { // if not fade then default to slide
			if (( direction === 'next' )  && (oEzcs.nowGroup < oEzcs.numOfGroups )) { 
				// slide to left how far? = ((oEzcs.nowGroup + 1) * ( oEzcs.newPagesPerClick * opts.carouselPageWidthInt ) * -1)
				// now slide'em
				oEzcs.cCarouselPagesUL.animate( {'left' : ((oEzcs.nowGroup + 1) * ( oEzcs.newPagesPerClick * oEzcs.opts.carouselPageWidthInt ) * -1) }, oEzcs.opts.carouselGroupPagingDuration, oEzcs.opts.carouselSlideEasing );
				++oEzcs.nowGroup;	
			} else if (( direction === 'prev' )  && ( oEzcs.nowGroup > 0 )) {
				--oEzcs.nowGroup;
				// slide right by adding a positive value to the negative from going left = (((oEzcs.nowGroup + 1 ) * ( oEzcs.newPagesPerClick * opts.carouselPageWidthInt ) * -1) + (oEzcs.newPagesPerClick * opts.carouselPageWidthInt))
				// now slide'em
				oEzcs.cCarouselPagesUL.animate({'left' : (((oEzcs.nowGroup + 1 ) * ( oEzcs.newPagesPerClick * oEzcs.opts.carouselPageWidthInt ) * -1) + (oEzcs.newPagesPerClick * oEzcs.opts.carouselPageWidthInt))}, oEzcs.opts.carouselGroupPagingDuration, oEzcs.opts.carouselSlideEasing );	
			}
		}
	return oEzcs;
	}
	
	// prev / next for the main slides
	function ezcsMainNavigate (direction, oEzcs) {
	// navigate through the "slides"
		// don't act on a click if ezcs is busy
		if ( oEzcs.ezcsIsBusy ) {
			return; 
		}
		oEzcs.ezcsIsBusy = true;
		if( direction === 'next' ) {
			if( oEzcs.nowIndex + 1 >= oEzcs.cMainSlidesList.length ) {
				nextIndex = 0;
				// now group page back the carousel
				for (var i = oEzcs.numOfGroups, l = 0; i > l; i--) {
					ezcsCarouselGroupPaging ('prev',oEzcs)
				}
			} else {
				nextIndex = oEzcs.nowIndex + 1;
				if (nextIndex >= ((oEzcs.nowGroup + 1) * oEzcs.newPagesPerClick)){
					ezcsCarouselGroupPaging ('next',oEzcs)
				}
			}
		}
		else if( direction === 'prev' ) {
			if( oEzcs.nowIndex -1 < 0 ) {
				nextIndex = oEzcs.cMainSlidesList.length - 1;
				// now group page ahead the carousel
				for (var i =  0, l = oEzcs.numOfGroups; i < l; i++) {
					ezcsCarouselGroupPaging ('next',oEzcs)
				}
			} else {
				nextIndex = oEzcs.nowIndex - 1;
				if (nextIndex <= (oEzcs.nowGroup * oEzcs.newPagesPerClick)){
					ezcsCarouselGroupPaging ('prev',oEzcs)
				}
			}
		}
		oEzcs.ezcsIsBusy = false;
		oEzcs = ezcsShowMain(nextIndex, oEzcs);
	return oEzcs;
	}	
	
	
	function ezscLoadLarge(displayThisIndex, oEzcs ){
	  // get the current large image obj
	  imgLrg = oEzcs.cMainSlidesList.eq(displayThisIndex).find('img' + oEzcs.opts.displayFullClass);
	  // get the src data attr
	  dataSrc = imgLrg.data(oEzcs.opts.mainFullImgSrcDataAttr);
	  
	  if (typeof dataSrc != 'undefined' && imgLrg.data(oEzcs.opts.mainFullImgReadyDataAttr) != true){
	    // original src - we're gonna have to presume this image exists
	    origSrc = imgLrg.attr('src');
	    //objImage = new Image();
		// if there's a on error then fallback to the orig normal image / src
		oEzcs.opts.objImage.onerror = function(){
		  imgLrg.attr('src', origSrc);		
		};
		// one the new large src load then...
	    oEzcs.opts.objImage.onload = function(){
		  imgLrg.attr('src', dataSrc);	
		  // we only want to losd the large image once
          imgLrg.attr('data-' + oEzcs.opts.mainFullImgReadyDataAttr, true);
		  // now set up some of the data attributes
		  imgLrg.attr('data-'+oEzcs.opts.mainFullImgWidthDataAttr, oEzcs.opts.objImage.width);
		  imgLrg.attr('data-'+oEzcs.opts.mainFullImgHeightDataAttr, oEzcs.opts.objImage.height);
		  imgLrg.attr('data-'+oEzcs.opts.mainFullImgRatioDataAttr, oEzcs.opts.objImage.width / oEzcs.opts.objImage.height); 
		  // image in full effect, now position it. 
		  oEzcs = ezcsFullPosition(imgLrg, oEzcs);
		};
	    oEzcs.opts.objImage.src = dataSrc;
	  }
	}
		
	// show the main slide
	function ezcsShowMain(displayThisIndex, oEzcs) {
		// don't act on a click if ezcs is busy
		if ( oEzcs.ezcsIsBusy ) {
			return;
		}
		oEzcs.ezcsIsBusy = true;
		oEzcs.loaderSelector.show();
		// if we're in large mode the
		if ( oEzcs.opts.displayIsReg != true){ 
		  if ( oEzcs.opts.mainFullImgLazyLoad != false ){
		    ezscLoadLarge(displayThisIndex, oEzcs );
		  } else {
		    imgLrg = oEzcs.cMainSlidesList.eq(displayThisIndex).find('img' + oEzcs.opts.displayFullClass);
			// if we have't done so yet, "preprocess" the large image
			if (imgLrg.data(oEzcs.opts.mainFullImgReadyDataAttr) != true){
			  imgLrg.attr('data-' + oEzcs.opts.mainFullImgReadyDataAttr, true);
			  oEzcs.opts.objImage.src = imgLrg.attr('src');
			  imgLrg.attr('data-'+oEzcs.opts.mainFullImgWidthDataAttr, oEzcs.opts.objImage.width);
			  imgLrg.attr('data-'+oEzcs.opts.mainFullImgHeightDataAttr, oEzcs.opts.objImage.height);
			  imgLrg.attr('data-'+oEzcs.opts.mainFullImgRatioDataAttr, oEzcs.opts.objImage.width / oEzcs.opts.objImage.height); 
			}
			// ok. now position the large image
			oEzcs = ezcsFullPosition(imgLrg, oEzcs);
		  } 
		}
				
		if (oEzcs.opts.carouselUse) { 
			// updated the selected images of the carousel 
			oEzcs.cCarouselPagesList.eq(oEzcs.nowIndex).removeClass(oEzcs.opts.carouselPageSelectedClassName);
			oEzcs.cCarouselPagesList.eq(displayThisIndex).addClass(oEzcs.opts.carouselPageSelectedClassName);
		}
		if (oEzcs.opts.slidesMainEffect == 'fade') {
			// nowIndex displayed image. once the fadeIn is complete set excsIsBusy to false
			oEzcs.cMainSlidesList.eq(oEzcs.nowIndex).fadeOut(oEzcs.opts.slidesMainFadeOutDuration,function(){oEzcs.cMainSlidesList.eq(displayThisIndex).fadeIn(oEzcs.opts.slidesMainFadeInDuration,function(){oEzcs.ezcsIsBusy = false;})});
		} else {
			oEzcs.cMainSlidesUL.animate({'left' : (displayThisIndex * oEzcs.nowDisplayWidth) * -1}, Math.abs(displayThisIndex - oEzcs.nowIndex) * oEzcs.opts.slidesPerSlideDuration, oEzcs.opts.slidesPerSlideEasing,function(){oEzcs.ezcsIsBusy = false;});
		}
		oEzcs.loaderSelector.hide();
		// update the nowIndex
		oEzcs.nowIndex = displayThisIndex;
	return oEzcs;
	}
	
 }; // end $.fn.plugin
	
// Default settings for the plugin
$.fn.ezContentSlider.defaults = {
	startIndex : 0,  // note: The index of the first side is 0 not 1
	loaderSelector : '.ezcs-loader',
	controlsSwitchWrapperClass : '.ezcs-controls-switch-wrapper', // what wraps all the controls 'cept the switch control? this is toggled by the switch click
	controlsSwitchFadeDuration : 200, // fancy a fade on the switch toggle?
	controlsSwitchClass : '.ezcs-control-switch',
	controlsThumbsClass : '.ezcs-control-thumbs',
	controlsCaptionClass : '.ezcs-control-caption',
	controlsShareClass : '.ezcs-control-share',
	controlsDisplayClass : '.ezcs-control-display',
	controlsPlayClass : '.ezcs-control-play',
  	carouselUse : true, // true, else any other value will be considered false (i.e., you must be explicit about wanting the carousel)
	carouselPageSelectedClassName : 'ezcs-selected', // Note: This setting is simply the class name, the leading period (.) should NOT be included.
	carouselWrapperSelector : '.ezcs-carousel-wrapper',
	carouselPagesWrapperSelector : '.ezcs-carousel-pages-wrapper',
	carouselGroupNextSelector : '.ezcs-carousel-group-next',
	carouselGroupPrevSelector : '.ezcs-carousel-group-prev',
	carouselGroupPageOverlap : 0, // how many pages (read: thumbnails) from the current group being displayed will be "overlapped" into the next / prev group to be diaplayed? Overlapping can make it easier for user to follow the group paging. 
	carouselGroupPagingEffect : 'slide', // 'fade', else any other value defaults to 'slide'
	carouselGroupPagingDuration : 250, //The duration of the .fadeOut() / .fadeIn() when paging from one group to the next.
	carouselSlideEasing : 'swing', // if carouselGroupPagingEffect : 'slide' then use this easing -> 'swing' else any other value defaults to 'linear'. 
	carouselPageWidthInt : 68, // just the integer (w/out the px). img width + borders + margins + paddings. you have to do the math yourself (so the plugin doesn't have invest overhead to do so).
	carouselPageClickStopsPlayAuto : true,
	mainNextSelector : '.ezcs-main-next',
	mainPrevSelector : '.ezcs-main-prev',
	mainNextPrevClickStopsPlayAuto : true,
	mainFullImgRatioDataAttr : 'ezscfullimgratio', // note: data- will be prefixed to this string to create a data attr
	mainFullImgWidthDataAttr : 'ezscfullimgwidth', // note: data- will be prefixed to this string to create a data attr
	mainFullImgHeightDataAttr : 'ezscfullimgheight', // note: data- will be prefixed to this string to create a data attr
	mainFullImgSrcDataAttr : 'ezscfullimgsrc', //'ezscfullimgsrc', // note: data- will be prefixed to this string to create a data attr
	mainFullImgReadyDataAttr : 'ezscfullimgready', // has the full image been lay loaded / used? if so, then we don't need to data- the dimensions and such again
	mainFullImgLazyLoad : true,  // true = use the normal image, stretch it to large, then "lazy load" the large image, and once that's loaded replace the normal with the large
	slidesMainSelector : '.ezcs-main-slides',
	slidesWrapperClass : '.ezcs-the-slides',
	slidesMainEffect : 'slide',	// 'fade' else any other value defaults to 'slide'. note: the main slide effect does not necessarily have to match the carousel
	slidesMainFadeOutDuration : 300, // 
	slidesMainFadeInDuration : 300, // 
	slidesPerSlideDuration : 200, // what "speed" is the slide. should not be greater than playAutoDuration (duh?), and as such there's no code to check this. it's on you. 
	slidesPerSlideEasing : 'swing', // 'swing' else any other value defaults to 'linear'. if slidesMainEffect : 'slide' then use this easing
	captionRegClass : '.ezcs-caption-reg',
	captionFullClass : '.ezcs-caption-full',
	captionIsShow : true,  // note: if false then it's up to you to sort out the markup. that is remove the control or flip-flop the display:none
	shareRegClass : '.ezcs-share-reg',
	shareFullClass : '.ezcs-share-full',
	shareIsShow : true,  // note: if false then it's up to you to sort out the markup...
	displayRegClass : '.ezcs-display-reg',
	displayFullClass : '.ezcs-display-full',
	displayFullCloseWithEscape : true,
	displayFullStyle : 'fill', // 'fit' else any other value defaults to 'fill'. note: 'fit' will not oversize the image to fill the screen
	displayFullFillCenterImg : true, // center the full screen image based on window size and image size
	displayFullImgWidth100PercentClassName : 'ezcs-width-100-percent',  // Note: This setting is simply the class name, the leading period (.) should NOT be included.
	displayFullImgHeight100PercentClassName : 'ezcs-height-100-percent', // Note: This setting is simply the class name, the leading period (.) should NOT be included.
 	fullToThisAddClassName : 'ezcs-status-fullscreen', // Note: Just the class name, the leading period (.) should NOT be included. This value is used in an addClass(). Also, update CSS if you change this.
	displayIsReg : true, // true = start in regular mode. false = full screen. note: if you have muliple sliders on a page a want full, use the options for one of the sliders.  
	playAutoPlaying: false,
	playAutoDuration : 2000, // if slidesMainEffect : 'fade' then this value should be greater than slidesMainFadeOutDuration + slidesMainFadeInDuration. if 
	playContinuous : true  // true = when you get to the end, loop back to the start again. false = stop at the end. 
};

})(jQuery); // end closure wrapper