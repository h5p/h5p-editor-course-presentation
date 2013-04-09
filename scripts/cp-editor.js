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
  this.$bar = H5PEditor.$('<div class="h5p-elements-bar"><ul><li><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'main keyword'}) + '">1.</a></li><li><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'sub keyword'}) + '">1.1.</a></li></ul><ul><li><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'text'}) + '">T</a></li><li><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'image'}) + '">I</a></li></ul></div>').insertBefore(this.cp.$presentationWrapper);
  
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
  
  // We use this awesome library to make things easier.
  this.keywordsDNS = new H5P.DragNSort(this.cp.$keywords.offset());

  this.keywordsDNS.startMovingCallback = function (event) {
    // Make sure we're moving the keywords that belongs to this slide.
    that.keywordsDNS.$parent = that.keywordsDNS.$element.parent().parent();
    if (!that.keywordsDNS.$parent.hasClass('h5p-current')) {
      // Element is a sub keyword.
      if (!that.keywordsDNS.$parent.parent().parent().hasClass('h5p-current')) {
        return false;
      }
    }
    else {
      delete that.keywordsDNS.$parent; // Remove since we're not a sub keyword.
    }
  
    if (that.keywordsDNS.$element.hasClass('h5p-new-keyword')) {
      // Adjust new keywords to mouse pos.
      that.keywordsDNS.dnd.adjust.x += 15;
      that.keywordsDNS.dnd.adjust.y += that.keywordsDNS.$element.offset().top - event.pageY + 16;
      that.keywordsDNS.$element.removeClass('h5p-new-keyword');
    }
  
    return true;
  };
  
  this.keywordsDNS.moveCallback = function (x, y) {
    // Check if sub keyword should change parent.
    if (that.keywordsDNS.$parent === undefined) {
      return;
    }
    
    // Jump up
    var $prev = that.keywordsDNS.$parent.prev();
    if ($prev.length && y < $prev.offset().top + ($prev.height() + that.keywordsDNS.marginAdjust + parseInt($prev.css('paddingBottom')) - 5)) {
      return that.jumpKeyword($prev, 1);
    }
      
    // Jump down
    var $next = that.keywordsDNS.$parent.next();
    if ($next.length && y + that.keywordsDNS.$element.height() > $next.offset().top + 20) {
      return that.jumpKeyword($next, -1);
    }
  };
  
  this.keywordsDNS.swapCallback = function (direction) {
    that.swapKeywords(direction);
  };

  // Keyword events
  var keywordClick = function () {
    if (!that.keywordsDNS.moving) {
      // Convert keywords into text areas when clicking.
      that.editKeyword(H5PEditor.$(this));
    }
  };
  var keywordMousedown = function (event) {
    that.keywordsDNS.press(H5PEditor.$(this).parent(), event.pageX, event.pageY);
    return false;
  };
  
  this.cp.$keywords.find('span').click(keywordClick).mousedown(keywordMousedown);
  
  this.$bar.children(':first').children(':first').click(function () {
    return false;
  }).mousedown(function (event) {
    var newKeyword = H5PEditor.t('newKeyword');
    var $element = H5PEditor.$('<li class="h5p-new-keyword"><span>' + newKeyword + '</span></li>').appendTo(that.cp.$keywords.children('.h5p-current').children()).children('span').click(keywordClick).mousedown(keywordMousedown).end();
    that.params[that.cp.$current.index()].keywords.push({main: newKeyword});
    
    that.keywordsDNS.press($element, event.pageX, event.pageY);
    return false;
  });
};

/**
 * Update params after swapping keywords.
 * 
 * @param {type} direction
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.swapKeywords = function (direction) {
  var keywords = this.params[this.cp.$current.index()].keywords;
  if (this.keywordsDNS.$parent !== undefined) {
    // We're swapping sub keywords.
    keywords = keywords[this.keywordsDNS.$parent.index()].subs;
  }

  var index = this.keywordsDNS.$element.index() - 1;
  var oldIndex = index + direction;
  var oldItem = keywords[oldIndex];
  keywords[oldIndex] = keywords[index];
  keywords[index] = oldItem;
};

/**
 * Move a sub keyword to another parent.
 *
 * @param {jQuery} $target The new parent.
 * @param {int} direction Indicates the direction we're jumping in.
 * @returns {undefined} 
 */
H5PEditor.CoursePresentation.prototype.jumpKeyword = function ($target, direction) {
  var $ol = $target.children('ol');
  if (!$ol.length) {
    $ol = H5PEditor.$('<ol></ol>').appendTo($target);
  }
    
  // Remove from params
  var keywords = this.params[this.cp.$current.index()].keywords;
  var subs = keywords[this.keywordsDNS.$parent.index()];
  var item = subs.subs.splice(this.keywordsDNS.$element.index() - 1, 1)[0];
  if (!subs.subs.length) {
    delete subs.subs;
  }
    
  // Update UI
  if (direction === -1) {
    this.keywordsDNS.$element.add(this.keywordsDNS.$placeholder).prependTo($ol);
  }
  else {
    this.keywordsDNS.$element.add(this.keywordsDNS.$placeholder).appendTo($ol);
  }
    
  // Add to params
  subs = keywords[$target.index()];
  if (subs.subs === undefined) {
    subs.subs = [item];
  }
  else {
    subs.subs.splice(this.keywordsDNS.$element.index() - 1, 0, item);
  }
        
  // Remove ol if empty.
  $ol = this.keywordsDNS.$parent.children('ol');
  if (!$ol.children('li').length) {
    $ol.remove();
  }
  this.keywordsDNS.$parent = $target;
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
    var slideIndex = that.cp.$current.index();
      
    if (keyword === '') {
      // Remove empty keywords
      if (main) {
        that.params[slideIndex].keywords.splice($li.index(), 1);
        $li.add($textarea).remove();
      }
      else {
        // Sub keywords
        var pi = $li.parent().parent().index();
        var $ol = $li.parent();
        if ($ol.children().length === 1) {
          delete that.params[slideIndex].keywords[pi].subs;
          $ol.remove();
        }
        else {
          that.params[slideIndex].keywords[pi].subs.splice($li.index(), 1);
          $li.add($textarea).remove();
        }
      }
      return;
    }
      
    // Update visuals
    $span.text(keyword).show();
    $textarea.remove();
      
    // Update params
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

H5PEditor.l10n.newKeyword = 'New keyword';