var H5PEditor = H5PEditor || {};

/**
 * Create a field for the form.
 * 
 * @param {mixed} parent
 * @param {Object} field
 * @param {mixed} params
 * @param {function} setValue
 * @returns {H5PEditor.Text}
 */
H5PEditor.CoursePresentation = function (parent, field, params, setValue) {
  if (params === undefined) {
    // TODO: Remove slide content, only here for testing.
    params = [{
      elements: [{
          action: {
            library: 'H5P.cpText 1.0',
            params: {
              text: 'New slide'
            }
          },
          height: 60,
          width: 200,
          x: 0,
          y: 0
      }],
      keywords: [{
          main: 'New keyword'
      }]
    }];
    setValue(field, params);
  }
  
  this.parent = parent;
  this.field = field;
  this.params = params;
};

/**
 * Append field to wrapper.
 * 
 * @param {type} $wrapper
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.appendTo = function ($wrapper) {
  var that = this;
  
  this.$item = H5PEditor.$(this.createHtml()).appendTo($wrapper);
  this.$editor = this.$item.children('.editor');
  this.$errors = this.$item.children('.errors');
  
  // Create new presentation.
  this.cp = new H5P.CoursePresentation({
    slides: this.params
  }, H5PEditor.contentId);
  this.cp.attach(this.$editor);
  
  // Elements bar
  H5PEditor.$('<div class="h5p-elements-bar"><ul><li><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'main keyword'}) + '">1.</a></li><li><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'sub keyword'}) + '">1.1</a></li></ul><ul><li><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'text'}) + '">T</a></li><li><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'image'}) + '">I</a></li></ul></div>').insertBefore(this.cp.$presentationWrapper);
  
  // Add and bind slide controls.
  H5PEditor.$('<div class="h5p-controls"><a href="#" title="' + H5PEditor.t('sortSlide', {':dir': 'left'}) + '">&lt;</a><a href="#" title="' + H5PEditor.t('sortSlide', {':dir': 'right'}) + '">&gt;</a><a href="#" title="' + H5PEditor.t('removeSlide') + '">&times;</a><a href="#" title="' + H5PEditor.t('cloneSlide') + '" class="h5p-clone-slide"></a><a href="#" title="' + H5PEditor.t('newSlide') + '">+</a></div>').insertAfter(this.cp.$presentationWrapper).children('a:first').click(function () {
    that.sortSlide(that.cp.$current.prev(), -1); // Left
    return false;
  }).next().click(function () {    
    that.sortSlide(that.cp.$current.next(), 1); // Right
    return false;
  }).next().click(function () {
    that.removeSlide();
    return false;
  }).next().click(function () {
    that.addSlide(H5P.cloneObject(that.params[that.cp.$current.index()], true));
    return false;
  }).next().click(function () {
    that.addSlide();
    return false;
  });
  
  // Bind keyword interactions.
  this.initKeywordInteractions();
};

/**
 * Create HTML for the field.
 */
H5PEditor.CoursePresentation.prototype.createHtml = function () {
  return H5PEditor.createItem(this.field.widget, '<div class="editor"></div>');
};

/**
 * Validate the current field.
 */
H5PEditor.CoursePresentation.prototype.validate = function () {
  return true;
};

/**
 * Remove this item.
 */
H5PEditor.CoursePresentation.prototype.remove = function () {
  this.$item.remove();
};

/**
 * Initialize keyword interactions.
 * 
 * @returns {undefined} Nothing
 */
H5PEditor.CoursePresentation.prototype.initKeywordInteractions = function () {
  var that = this;
  var $keyword, $placeholder, $parent, startX, startY, moving, adjust, keywordMarginAdjust, moveThreshold = 4;
  var keywordsOffset = this.cp.$keywords.offset();
  
  // Private function for updateing params after swapping keywords.
  var swapKeywords = function (direction) {
    var keywords = that.params[that.cp.$current.index()].keywords;
    if ($parent !== undefined) {
      // We're swapping sub keywords.
      keywords = keywords[$parent.index()].subs;
    }

    var index = $keyword.index() - 1;
    var oldIndex = index + direction;
    var oldItem = keywords[oldIndex];
    keywords[oldIndex] = keywords[index];
    keywords[index] = oldItem;
  };
  
  // Private function for jumping a sub keyword to another parent.
  var jumpKeyword = function ($target, direction) {
    var $ol = $target.children('ol');
    if (!$ol.length) {
      $ol = H5PEditor.$('<ol></ol>').appendTo($target);
    }
    
    // Remove from params
    var keywords = that.params[that.cp.$current.index()].keywords;
    var subs = keywords[$parent.index()];
    var item = subs.subs.splice($keyword.index() - 1, 1)[0];
    if (!subs.subs.length) {
      delete subs.subs;
    }
    
    // Update UI
    if (direction === -1) {
      $keyword.add($placeholder).prependTo($ol);
    }
    else {
      $keyword.add($placeholder).appendTo($ol);
    }
    
    // Add to params
    subs = keywords[$target.index()];
    if (subs.subs === undefined) {
      subs.subs = [item];
    }
    else {
      subs.subs.splice($keyword.index() - 1, 0, item);
    }
        
    // Remove ol if empty.
    $ol = $parent.children('ol');
    if (!$ol.children('li').length) {
      $ol.remove();
    }
    $parent = $target;
  };
  
  // Private function for handling the mouse move event.
  var move = function (event) {
    if (!moving) {
      if (event.pageX > startX + moveThreshold || event.pageX < startX - moveThreshold || event.pageY > startY + moveThreshold || event.pageY < startY - moveThreshold) {
        // Start moving
        
        $parent = $keyword.parent().parent();
        if (!$parent.hasClass('h5p-current')) {
          if (!$parent.parent().parent().hasClass('h5p-current')) {
            return;
          }
          else {
            adjust.x += parseInt($keyword.css('marginLeft'));
          }
        }
        else {
          $parent = undefined;
        }
        
        moving = true;
        $placeholder = $('<li class="h5p-placeholder" style="height:' + $keyword.height() + 'px"><span></span></li>').insertBefore($keyword.css('width', $keyword.width() + 'px').addClass('h5p-moving'));
      }
      else {
        return;
      }
    }
    
    var x = event.pageX - adjust.x;
    var y = event.pageY - adjust.y;
    $keyword.css({left: x - keywordsOffset.left, top: y - keywordsOffset.top});
    
    // Try to move up.
    var $prev = $keyword.prev().prev();
    if ($prev.length && y < $prev.offset().top + (($prev.height() + keywordMarginAdjust + parseInt($prev.css('paddingBottom'))) / 2)) {
      $prev.insertAfter($keyword);
      return swapKeywords(1);
    }
    
    // Try to move down.
    var $next = $keyword.next();
    if ($next.length && y + $keyword.height() > $next.offset().top + (($next.height() + keywordMarginAdjust + parseInt($next.css('paddingBottom'))) / 2)) {
      $next.insertBefore($placeholder);
      return swapKeywords(-1);
    }
    
    // Check if sub keyword should change parent.
    if ($parent !== undefined) {
      // Jump up
      $prev = $parent.prev();
      if ($prev.length && y < $prev.offset().top + ($prev.height() + keywordMarginAdjust + parseInt($prev.css('paddingBottom')) - 5)) {
        return jumpKeyword($prev, 1);
      }
      
      // Jump down
      $next = $parent.next();
      if ($next.length && y + $keyword.height() > $next.offset().top + 20) {
        return jumpKeyword($next, -1);
      }
    }
  };
  
  // Private function for handling the mouse up event.
  var up = function () {
    // Stop tracking mouse
    H5PEditor.$body.unbind('mousemove', move).unbind('mouseup', up).removeAttr('style')[0].onselectstart = null;
    
    if (moving) {
      $keyword.removeClass('h5p-moving').removeAttr('style');
      $placeholder.remove();
    }
  };
  
  this.cp.$keywords.find('span').click(function () {
    if (!moving) {
      // Convert keywords into text areas when clicking.
      that.editKeyword(H5PEditor.$(this));
    }
  }).mousedown(function (event) {
    // Start tracking mouse
    H5PEditor.$body.attr('unselectable', 'on').mouseup(up).bind('mouseleave', up).css({'-moz-user-select': 'none', '-webkit-user-select': 'none', 'user-select': 'none', '-ms-user-select': 'none'}).mousemove(move)[0].onselectstart = function () {
      return false;
    };
    
    $keyword = H5PEditor.$(this).parent();
    moving = false;
    startX = event.pageX;
    startY = event.pageY;
    
    if (keywordMarginAdjust === undefined) {
      keywordMarginAdjust = parseInt($keyword.css('marginTop')) + parseInt($keyword.css('marginBottom'));
    }
    
    var offset = $keyword.offset();
    adjust = {
      x: event.pageX - offset.left,
      y: event.pageY - offset.top - keywordMarginAdjust
    };
    
    return false;
  });
};

/**
 * Adds slide after current slide.
 * 
 * @param {object} slideParams
 * @returns {undefined} Nothing
 */
H5PEditor.CoursePresentation.prototype.addSlide = function (slideParams) {
  var that = this;
  
  if (slideParams === undefined) {
    // Set new slide params
    // TODO: Remove elements and keywords, only here for testing.
    slideParams = {
      elements: [{
          action: {
            library: 'H5P.cpText 1.0',
            params: {
              text: 'New slide'
            }
          },
          height: 60,
          width: 200,
          x: 0,
          y: 0
      }],
      keywords: [{
          main: 'New keyword'
      }]
    };
  }
  
  // Add slide with elements
  var $slide = H5P.jQuery(H5P.CoursePresentation.createSlide(slideParams)).insertAfter(this.cp.$current);
  this.cp.addElements($slide, slideParams.elements);
  
  // Add keywords
  H5P.jQuery(this.cp.keywordsHtml(slideParams.keywords)).insertAfter(this.cp.$currentKeyword).find('span').click(function () {
    that.editKeyword(H5PEditor.$(this));
  });
  
  // Add to and update slideination.
  var $slideinationSlide = H5P.jQuery(H5P.CoursePresentation.createSlideinationSlide()).insertAfter(this.cp.$currentSlideinationSlide).children('a').click(function () {
    that.cp.jumpToSlide(H5P.jQuery(this).text() - 1);
    return false;
  }).end();
  var i = parseInt(this.cp.$currentSlideinationSlide.text());
  that.updateSlideination($slideinationSlide, i);
  
  // Switch to the new slide.
  this.cp.nextSlide();
  
  // Update presentation params.
  this.params.splice(i, 0, slideParams);
};

/**
 * Update slideination numbering.
 * 
 * @param {H5P.jQuery} $slideinationSlide
 * @param {int} index
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.updateSlideination = function ($slideinationSlide, index) {
  while ($slideinationSlide.length) {
    index += 1;
    $slideinationSlide.children().text(index);
    $slideinationSlide = $slideinationSlide.next();
  }
};

/**
 * Remove the current slide
 * 
 * @returns {Boolean} Indicates success
 */
H5PEditor.CoursePresentation.prototype.removeSlide = function () {
  var index = this.cp.$current.index();        
  var $remove = this.cp.$current.add(this.cp.$currentSlideinationSlide).add(this.cp.$currentKeyword);
  
  // Confirm and change slide.
  if (!confirm(H5PEditor.t('confirmDeleteSlide'))) { // TODO: Translate
    return false;
  }
  
  // Change slide
  var move = this.cp.previousSlide() ? -1 : (this.cp.nextSlide(true) ? 0 : undefined);
  if (move === undefined) {
    return false; // No next or previous slide
  }
  
  // Remove visuals.
  $remove.remove();
  
  // Update slideination numbering.
  this.updateSlideination(this.cp.$currentSlideinationSlide, index + move);
  
  // Update presentation params.
  this.params.splice(index, 1);
};

/**
 * Sort current slide in the given direction.
 * 
 * @param {H5PEditor.$} $element The next/prev slide.
 * @param {int} direction 1 for next, -1 for prev.
 * @returns {Boolean} Indicates success.
 */
H5PEditor.CoursePresentation.prototype.sortSlide = function ($element, direction) {
  if (!$element.length) {
    return false;
  }
  
  var index = this.cp.$current.index();
  
  // Move slides and keywords.
  if (direction === -1) {
    this.cp.$current.insertBefore($element.removeClass('h5p-previous'));
    this.cp.$currentKeyword.insertBefore(this.cp.$currentKeyword.prev());
  }
  else {
    this.cp.$current.insertAfter($element.addClass('h5p-previous'));
    this.cp.$currentKeyword.insertAfter(this.cp.$currentKeyword.next());
  }
  this.cp.scrollToKeywords();

  // Update slideination
  var newIndex = index + direction;
  this.cp.jumpSlideination(newIndex);
  
  // Update params.
  this.params.splice(newIndex, 0, this.params.splice(index, 1)[0]);
  
  return true;
};

/**
 * Edit keyword.
 * 
 * @param {H5PEditor.$} $span Keyword wrapper.
 * @returns {unresolved} Nothing
 */
H5PEditor.CoursePresentation.prototype.editKeyword = function ($span) {
  var that = this;

  var $li = $span.parent();
  var $ancestor = $li.parent().parent();
  var main = $ancestor.hasClass('h5p-current');
    
  if (!main && !$ancestor.parent().parent().hasClass('h5p-current')) {
    return;
  }
    
  var $textarea = H5PEditor.$('<textarea>' + $span.text() + '</textarea>').insertBefore($span.hide()).keydown(function (event) {
    if (event.keyCode === 13) {
      $textarea.blur();
      return false;
    }
  }).keyup(function () {
    $textarea.css('height', 1).css('height', $textarea[0].scrollHeight - 8);
  }).blur(function () {
    var keyword = $textarea.val();
      
    // Update visuals
    $span.text(keyword).show();
    $textarea.remove();
      
    // Update params
    var slideIndex = that.cp.$current.index();
    if (main) {
      that.params[slideIndex].keywords[$li.index()].main = keyword;
    }
    else {
      that.params[slideIndex].keywords[$li.parent().parent().index()].subs[$li.index()] = keyword;
    }
  }).focus();
  $textarea.keyup();
};

// Tell the editor what widget we are.
H5PEditor.widgets.coursepresentation = H5PEditor.CoursePresentation;

// Add translations
H5PEditor.l10n.confirmDeleteSlide = 'Are you sure you wish to delete this slide?';
H5PEditor.l10n.sortSlide = 'Sort slide - :dir';
H5PEditor.l10n.removeSlide = 'Remove slide';
H5PEditor.l10n.cloneSlide = 'Clone slide';
H5PEditor.l10n.newSlide = 'Add new slide';

H5PEditor.l10n.insertElement = 'Click and drag to place :type';