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
  var that = this;
  if (params === undefined) {
    // TODO: Remove slide content, only here for testing. oooor is it?;)
    params = [{
      elements: [{
          action: {
            library: 'H5P.Text 1.0',
            params: {
              text: 'New slide'
            }
          },
          height: 20,
          width: 30,
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
  this.resizing = false;

  this.passReadies = true;
  parent.ready(function () {
    that.setLocalization();
    that.passReadies = false;
  });
};

/**
 * Finds localization fields and updates value as they change.
 * 
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.setLocalization = function () {
  var that = this;

  var fields = H5PEditor.findField('l10n', this.parent).children;
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    switch (field.field.name) {
      case 'prev':
        field.change(function (value) {
          that.cp.$slideination.children('.h5p-previous').text(value);
        });
        break;

      case 'prevSlide':
        field.change(function (value) {
          that.cp.$slideination.children('.h5p-previous').attr('title', value);
        });
        break;

      case 'scrollLeft':
        field.change(function (value) {
          that.cp.$slideination.children('.h5p-scroll-left').attr('title', value);
        });
        break;

      case 'jumpToSlide':
        field.change(function (value) {
          that.cp.$slideinationSlides.children('li').children('a').attr('title', value);
        });
        break;

      case 'scrollRight':
        field.change(function (value) {
          that.cp.$slideination.children('.h5p-scroll-right').attr('title', value);
        });
        break;

      case 'next':
        field.change(function (value) {
          that.cp.$slideination.children('.h5p-next').text(value);
        });
        break;

      case 'nextSlide':
        field.change(function (value) {
          that.cp.$slideination.children('.h5p-next').attr('title', value);
        });
        break;
   }
  }
};

/**
 * Add an element to the current slide and params.
 * 
 * @param {String} library
 * @param {Object} params
 * @returns {unresolved}
 */
H5PEditor.CoursePresentation.prototype.addElement = function (library) {
  var elParams = {
    action: {
      library: library,
      params: {}
    },
    x: 0,
    y: 0,
    width: 30,
    height: 20
  };

  this.params[this.cp.$current.index()].elements.push(elParams);
  return this.cp.addElement(elParams);
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
  }, H5PEditor.contentId, this);
  this.cp.attach(this.$editor);
  
  // Add drag and drop menu bar.
  that.initializeDNB();

  // Add and bind slide controls.
  H5PEditor.$('<div class="h5p-slidecontrols"><a href="#" title="' + H5PEditor.t('sortSlide', {':dir': 'left'}) + '" class="h5p-slidecontrols-button">&lt;</a><a href="#" title="' + H5PEditor.t('sortSlide', {':dir': 'right'}) + '" class="h5p-slidecontrols-button">&gt;</a><a href="#" title="' + H5PEditor.t('removeSlide') + '" class="h5p-slidecontrols-button">&times;</a><a href="#" title="' + H5PEditor.t('cloneSlide') + '" class="h5p-clone-slide h5p-slidecontrols-button"></a><a href="#" title="' + H5PEditor.t('newSlide') + '" class="h5p-slidecontrols-button">+</a></div>').insertAfter(this.cp.$presentationWrapper).children('a:first').click(function () {
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

  if (this.cp.keywordsWidth) {
    // Bind keyword interactions.
    this.initKeywordInteractions();
  }

  this.cp.resize = function (fullscreen) {
    // Reset drag and drop adjustments.
    if (that.keywordsDNS !== undefined) {
      delete that.keywordsDNS.dnd.containerOffset;
      delete that.keywordsDNS.marginAdjust;
    }
    H5P.CoursePresentation.prototype.resize.apply(that.cp, [fullscreen]);
  };
};

H5PEditor.CoursePresentation.prototype.addDNBButton = function (library) {
  var that = this;
  
  var id = library.split(' ')[0].split('.')[1].toLowerCase();
  
  return {
    id: id,
    title: H5PEditor.t('insertElement', {':type': id}), 
    createElement: function () {
      return that.addElement(library);
    }
  };
};

/**
 * Initialize the drag and drop menu bar.
 * 
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.initializeDNB = function () {
  var that = this;
  
  var buttons = [];
  var libraries = this.field.field.fields[0].field.fields[0].options;
  for (var i = 0; i < libraries.length; i++) {
    buttons.push(that.addDNBButton(libraries[i]));
  }
  
  this.dnb = new H5P.DragNBar(buttons, this.cp.$current);
  
  // Update params when the element is dropped.
  this.dnb.stopMovingCallback = function (x, y) {
    var params = that.params[that.cp.$current.index()].elements[that.dnb.dnd.$element.index()];
    params.x = x;
    params.y = y;
    if (that.dnb.newElement) {
      that.dnb.dnd.$element.dblclick();
    }
  };
  
  this.$bar = H5PEditor.$('<div class="h5p-dragnbar"></div>').insertBefore(this.cp.$presentationWrapper);
  this.dnb.attach(this.$bar);
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
  
  // Keywords removal button.
  H5PEditor.$('<div class="h5p-keywordcontrols"><a href="#" title="' + H5PEditor.t('disableKeywords') + '" class="h5p-keywordcontrols-button">x</a></div>').insertAfter(this.cp.$presentationWrapper).children().click(function () {
    that.removeKeywords(H5PEditor.$(this));
    return false;
  });
  
  // Add our own menu to the drag and drop menu bar.
  H5PEditor.$('<ul class="h5p-dragnbar-ul h5p-dragnbar-left"><li class="h5p-dragnbar-li"><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'main keyword'}) + '" class="h5p-dragnbar-a h5p-dragnbar-mainkeyword-button"></a></li><li class="h5p-dragnbar-li"><a href="#" title="' + H5PEditor.t('insertElement', {':type': 'sub keyword'}) + '" class="h5p-dragnbar-a h5p-dragnbar-subkeyword-button"></a></li></ul>').prependTo(this.$bar);

  // We use this awesome library to make things easier.
  this.keywordsDNS = new H5P.DragNSort(this.cp.$keywords);

  this.keywordsDNS.startMovingCallback = function (event) {
    return that.keywordStartMoving(event);
  };

  this.keywordsDNS.moveCallback = function (x, y) {
    that.keywordMove(x, y);
  };

  this.keywordsDNS.swapCallback = function (direction) {
    that.swapKeywords(direction);
  };

  // Keyword events
  var keywordClick = function (event) {
    if (!that.keywordsDNS.moving) {
      // Convert keywords into text areas when clicking.
      that.editKeyword(H5PEditor.$(this));
      event.stopPropagation();
    }
  };
  var keywordMousedown = function (event) {
    that.keywordsDNS.press(H5PEditor.$(this).parent(), event.pageX, event.pageY);
    return false;
  };
  var newKeyword = function ($li, newKeywordString, x, y) {
    var $ol = $li.children('ol');
    if (!$ol.length) {
      $ol = H5PEditor.$('<ol></ol>').appendTo($li);
    }
    var $element = H5PEditor.$('<li class="h5p-new-keyword h5p-empty-keyword"><span>' + newKeywordString + '</span></li>').appendTo($ol).children('span').click(keywordClick).mousedown(keywordMousedown).end();

    that.keywordsDNS.press($element, x, y);
    return false;
  };

  this.cp.$keywords.find('span').click(keywordClick).mousedown(keywordMousedown);

  this.$bar.find('.h5p-dragnbar-left > .h5p-dragnbar-li').click(function () {
    return false;
  }).filter(':first').mousedown(function (event) {
    // Create new keyword.
    var newKeywordString = H5PEditor.t('newKeyword');

    // Add to params
    that.params[that.cp.$current.index()].keywords.push({main: newKeywordString});

    return newKeyword(that.cp.$keywords.children('.h5p-current'), newKeywordString, event.pageX, event.pageY);
  }).next().mousedown(function (event) {
    // Create new sub keyword.
    var newKeywordString = H5PEditor.t('newKeyword');

    // Add to params
    var keywords = that.params[that.cp.$current.index()].keywords;
    if (!keywords.length) {
      return false;
    }
    keywords = keywords[keywords.length - 1];
    if (keywords.subs === undefined) {
      keywords.subs = [newKeywordString];
    }
    else {
      keywords.subs.push(newKeywordString);
    }

    return newKeyword(that.cp.$keywords.children('.h5p-current').children().children(':last'), newKeywordString, event.pageX, event.pageY);
  });
};

/**
 * Keyword start moving handler.
 *
 * @param {object} event
 * @returns {Boolean} Indicates if we're ready to start moving.
 */
H5PEditor.CoursePresentation.prototype.keywordStartMoving = function (event) {
  // Make sure we're moving the keywords that belongs to this slide.
  this.keywordsDNS.$parent = this.keywordsDNS.$element.parent().parent();
  if (!this.keywordsDNS.$parent.hasClass('h5p-current')) {
    // Element is a sub keyword.
    if (!this.keywordsDNS.$parent.parent().parent().hasClass('h5p-current')) {
      return false;
    }
  }
  else {
    delete this.keywordsDNS.$parent; // Remove since we're not a sub keyword.
  }

  if (this.keywordsDNS.$element.hasClass('h5p-new-keyword')) {
    // Adjust new keywords to mouse pos.
    var height = this.keywordsDNS.$element.height() / 2;
    this.keywordsDNS.dnd.adjust.x += height;
    this.keywordsDNS.dnd.adjust.y += this.keywordsDNS.$element.offset().top - event.pageY + (height * 1.75);
    this.keywordsDNS.$element.removeClass('h5p-new-keyword');
  }

  this.keywordsDNS.dnd.scrollTop = this.cp.$keywords.scrollTop() - parseInt(this.cp.$keywords.css('marginTop'));
  return true;
};

/**
 * Keyword move handler.
 * 
 * @param {int} x
 * @param {int} y
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.keywordMove = function (x, y) {
  // Check if sub keyword should change parent.
  if (this.keywordsDNS.$parent === undefined) {
    return;
  }

  var fontSize = parseInt(this.cp.$wrapper.css('fontSize'));

  // Jump up
  var $prev = this.keywordsDNS.$parent.prev();
  if ($prev.length && y < $prev.offset().top + ($prev.height() + this.keywordsDNS.marginAdjust + parseInt($prev.css('paddingBottom')) - (fontSize/2))) {
    return this.jumpKeyword($prev, 1);
  }

  // Jump down
  var $next = this.keywordsDNS.$parent.next();
  if ($next.length && y + this.keywordsDNS.$element.height() > $next.offset().top + fontSize) {
    return this.jumpKeyword($next, -1);
  }
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
            library: 'H5P.Text 1.0',
            params: {
              text: 'New slide'
            }
          },
          height: 20,
          width: 30,
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
  for (var i = 0; i < slideParams.elements.length; i++) {
    this.cp.addElement(slideParams.elements[i], $slide);
  }

  // Add keywords
  H5P.jQuery(this.cp.keywordsHtml(slideParams.keywords)).insertAfter(this.cp.$currentKeyword).find('span').click(function (event) {
    if (!that.keywordsDNS.moving) {
      // Convert keywords into text areas when clicking.
      that.editKeyword(H5PEditor.$(this));
      event.stopPropagation();
    }
  }).mousedown(function (event) {
    that.keywordsDNS.press(H5PEditor.$(this).parent(), event.pageX, event.pageY);
    return false;
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
  if (!confirm(H5PEditor.t('confirmDeleteSlide'))) {
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

  var $delete = H5PEditor.$('<a href="#" class="h5p-delete-keyword" title="' + H5PEditor.t('deleteKeyword') + '"></a>');
  var $textarea = H5PEditor.$('<textarea>' + ($li.hasClass('h5p-empty-keyword') ? '' : $span.text()) + '</textarea>').insertBefore($span.hide()).keydown(function (event) {
    if (event.keyCode === 13) {
      $textarea.blur();
      return false;
    }
  }).keyup(function () {
    $textarea.css('height', 1).css('height', $textarea[0].scrollHeight - 8);
  }).blur(function () {
    var keyword = $textarea.val();

    if (H5PEditor.trim(keyword) === '') {
      $li.addClass('h5p-empty-keyword');
      keyword = H5PEditor.t('newKeyword');
    }
    else {
      $li.removeClass('h5p-empty-keyword');
    }

    // Update visuals
    $span.text(keyword).show();
    $textarea.add($delete).remove();

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

  $delete.insertBefore($textarea).mousedown(function () {
    // Remove keyword
    var slideIndex = that.cp.$current.index();
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
  });
};

/**
 * Remove keywords sidebar.
 *
 * @param {jQuery} $button
 * @returns {Boolean}
 */
H5PEditor.CoursePresentation.prototype.removeKeywords = function ($button) {
  if (!confirm(H5PEditor.t('removeKeywords'))) {
    return false;
  }

  $button.parent().add(this.cp.$keywordsWrapper).remove();
  this.cp.keywordsWidth = 0;
  this.cp.$slidesWrapper.removeClass('h5p-keyword-slides');
  for (var i = 0; i < this.params.length; i++) {
    if (this.params[i].keywords !== undefined) {
      delete this.params[i].keywords;
    }
  }
};

/**
 * TODO:
 * 
 * @param {type} element
 * @param {type} $wrapper
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.processElement = function (element, $wrapper) {
  var that = this;

  // Edit when double clicking
  $wrapper.dblclick(function (event) {
    that.editElement(H5P.cloneObject(element, true), $wrapper);
  });
  
  // Allow moving of element
  $wrapper.mousedown(function (event) {
    if (that.resizing) {
      return; // Disable when resizing
    }
    that.dnb.dnd.press(H5P.jQuery(this), event.pageX, event.pageY);
    return false;
  });
  
  // Allow resize
  var minSize = this.cp.fontSize * 2;
  $wrapper.resizable({
    minWidth: minSize,
    minHeight: minSize,
    containment: 'parent',
    stop: function () {
      element.width = ($wrapper.width() + 2) / (that.cp.$current.innerWidth() / 100) / that.cp.slideWidthRatio;
      element.height = ($wrapper.height() + 2) / (that.cp.$current.innerHeight() / 100);
      that.resizing = false;
    }
  }).children('.ui-resizable-handle').mousedown(function () {
    that.resizing = true;
  });
  
  
  // Remove button
  H5PEditor.$('<div class="h5p-element-remove" title="' + H5PEditor.t('removeElement') + '"></div>').appendTo($wrapper).click(function () {
    if (!confirm(H5PEditor.t('confirmRemoveElement'))) {
      return;
    }
    
    if (that.dnb.dnd.$coordinates !== undefined) {
      that.dnb.dnd.$coordinates.remove();
    }
    var $element = H5PEditor.$(this).parent();
    
    that.params[that.cp.$current.index()].elements.splice($element.index(), 1);
    $element.remove();
  });
};

/**
 * TODO:
 * 
 * @param {type} element
 * @param {type} $wrapper
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.editElement = function (element, $wrapper) {
  var that = this;
    
  var $library = H5P.jQuery('<div title="Edit content"></div>');

  if (!that.passReadies) {
    that.readies = [];
  }
  
  H5PEditor.processSemanticsChunk(that.field.field.fields[0].field.fields, element, $library, that);
    
  if (!that.passReadies) {
    for (var i = 0; i < that.readies.length; i++) {
      that.readies[i]();
    }
    delete that.readies;
  }

  $library.dialog({
    modal: true,
    draggable: false,
    resizable: false,
    width: '80%',
    dialogClass: "h5p-dialog-no-close",
    appendTo: '.h5p-course-presentation',
    buttons: [
      {
        text: H5PEditor.t('cancel'),
        click: function () {
          $library.dialog('close').remove();
        }
      },
      {
        text: H5PEditor.t('updateElement'),
        click: function () {
          var index = $wrapper.index();
          var elements = that.params[that.cp.$current.index()].elements;
          
          // Update visuals
          $wrapper.remove();
          that.cp.addElement(element);
           
          // Validate children (will remove tmp flags on files)
          for (var i = 0; i < that.children.length; i++) {
            that.children[i].validate();
          }
            
          // Update params
          elements.splice(index, 1);
          elements.push(element);

          $library.dialog('close').remove();
        }
      }
    ]
  });
};

/**
 * Collect functions to execute once the tree is complete.
 *
 * @param {function} ready
 * @returns {undefined}
 */
H5PEditor.CoursePresentation.prototype.ready = function (ready) {
  if (this.passReadies) {
    this.parent.ready(ready);
  }
  else {
    this.readies.push(ready);
  }
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
H5PEditor.l10n.deleteKeyword = 'Remove this keyword';
H5PEditor.l10n.removeKeywords = 'Are you sure you wish to remove the keywords widget? This action cannot be undone.';
H5PEditor.l10n.disableKeywords = 'Remove the keywords widget.';
H5PEditor.l10n.removeElement = 'Remove this element';
H5PEditor.l10n.confirmRemoveElement = 'Are you sure you wish to remove this element?';
H5PEditor.l10n.cancel = 'Cancel';
H5PEditor.l10n.updateElement = 'Update element';