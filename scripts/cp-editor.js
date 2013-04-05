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
  this.parent = parent;
  this.field = field;
  this.params = params;
  this.setValue = setValue;
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
  
  // Add and bind slide controls.
  // TODO: Remember to translate texts.
  H5PEditor.$('<div class="h5p-controls"><a href="#" title="Sort slide - left">&lt;</a><a href="#" title="Sort slide - right">&gt;</a><a href="#" title="Remove slide">&times;</a><a href="#" title="Clone slide" class="h5p-clone-slide"></a><a href="#" title="Add slide">+</a></div>').insertAfter(this.cp.$presentationWrapper).children('a:first').click(function () {
    console.log('Sorting left...');
    return false;
  }).next().click(function () {
    console.log('Sorting right...');
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
 * Adds slide after current slide.
 * 
 * @returns {undefined}
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
  H5P.jQuery(this.cp.keywordsHtml(slideParams.keywords)).insertAfter(this.cp.$currentKeyword);
  
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
  if (!confirm('Are you sure you wish to delete this slide?')) { // TODO: Translate
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

// Tell the editor what widget we are.
H5PEditor.widgets.coursepresentation = H5PEditor.CoursePresentation;