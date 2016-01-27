H5PEditor.CoursePresentation.BackgroundSelector = (function ($, EventDispatcher) {

  /**
   * Create a Background Selector.
   *
   * @class H5PEditor.CoursePresentation.BackgroundSelector
   * @param {H5PEditor.$} $backgroundSlides Elements to paint
   * @param {boolean} [isSingleSlide] Background selector is for a single element
   */
  function BackgroundSelector($backgroundSlides, isSingleSlide) {
    var self = this;

    // Inheritance
    EventDispatcher.call(this);

    // Background selector wrapper
    var $bgSelector;

    // Button for resetting background
    var $resetButton;

    // Outsource readies
    this.passReadies = true;

    // Collection of processed semantics
    this.children = [];

    // Default to false
    isSingleSlide = isSingleSlide || false;

    this.addBackground = function () {
      var settings = self.getSettings();

      // Invalid background
      if (!settings) {
        removeBackground();
        return;
      }

      // Store single slide data
      if (isSingleSlide && settings.value) {
        $backgroundSlides.removeClass('global');
      }

      paintElement();
      $resetButton.addClass('show');
    };

    var radioLabels = [
      H5PEditor.t('H5PEditor.CoursePresentation', 'setImageBackground', {}),
      H5PEditor.t('H5PEditor.CoursePresentation', 'setColorFillBackground', {})
    ];

    var removeBackground = function () {

      // Trigger global background
      if (isSingleSlide) {
        $backgroundSlides.addClass('global');
        self.trigger('turnedGlobal');
      }
      else {
        // Remove global background
        paintElement();
      }
      $resetButton.removeClass('show');
    };

    var getTargetSlides = function () {
      return isSingleSlide ? $backgroundSlides : $backgroundSlides.filter('.global');
    };

    var paintElement = function () {
      var settings = self.getSettings();

      if (!settings) {
        settings = {
          type: 'reset'
        }
      }
      var $targetSlides = getTargetSlides();

      // Reset
      $targetSlides.removeClass('has-background')
        .css('background', '')
        .css('background-image', '')
        .css('background-color', '');

      if (settings.type === 'image') {
        $targetSlides.addClass('has-background')
          .css('background-image', 'url(' + settings.value + ')');
      }
      else if (settings.type === 'bgColor') {
        $targetSlides.addClass('has-background')
          .css('background-color', settings.value);
      }
    };


    /**
     * @typedef {Object} bgOptions Background options object
     * @property {boolean} [isSingle] Initialized for single slides
     * @property {boolean} [isVisible] Initialized as visible
     * @property {number} [index] Optional insert index
     */

    /**
     * Add a background selector
     *
     * @param fields
     * @param params
     * @param {jQuery} $wrapper
     * @param {bgOptions} [options] Options object
     */
    this.addBgSelector = function (fields, params, $wrapper, options) {
      options = options || {};
      var single = options.isSingle ? ' single' : '';
      var show = options.isVisible ? ' show' : '';
      $bgSelector = $('<div>', {
        'class': 'h5p-bg-selector' + single + show
      });

      // Process semantics into background selector
      console.log("adding bg selector", params);
      H5PEditor.processSemanticsChunk(H5P.jQuery.makeArray(fields), params, $bgSelector, self);
      addOptionListeners();
      addResetButton($bgSelector);
      getRadioSelector().setRadioLabels(radioLabels);

      // Check if single slide should use global settings
      if (isSingleSlide && !self.getSettings()) {
        $backgroundSlides.addClass('global');
        self.trigger('turnedGlobal');
      }
      else {
        paintElement();
      }

      // Insert after previous index
      if (options.index && (options.index > 0) && (options.index < $wrapper.children().length)) {
        $bgSelector.insertAfter($wrapper.children('.single').eq(options.index - 1));
      }
      else {
        $bgSelector.appendTo($wrapper);
      }

      return this;
    };

    /**
     * Add listener for when backgrounds are changed
     */
    var addOptionListeners = function () {
      var radioSelector = getRadioSelector();
      radioSelector.on('backgroundAdded', function () {
        self.addBackground();
      });

      radioSelector.on('backgroundRemoved', function () {
        removeBackground();
      });
    };

    var addResetButton = function ($wrapper) {

      $resetButton = $('<button>', {
        'html': H5PEditor.t('H5PEditor.CoursePresentation', 'resetToDefault', {}),
        'class': 'h5p-background-selector-reset'
      }).click(function () {
        getRadioSelector().resetCheckedOption();
      });

      if (self.getSettings()) {
        $resetButton.addClass('show');
      }

      $resetButton.appendTo($wrapper);
    };

    /**
     * Get radio selector
     * @returns {H5PEditor.RadioSelector}
     */
    var getRadioSelector = function () {
      return self.children[0];
    };

    this.validate = function () {
      return getRadioSelector().validate();
    };

    this.getSettings = function () {
      return getRadioSelector().getStoredOption();
    };

    this.setBackgroundSlides = function ($newBackgroundSlides) {
      $backgroundSlides = $newBackgroundSlides;
    };

    this.removeElement = function () {
      if ($bgSelector) {
        $bgSelector.remove();
      }

      return this;
    };

    this.updateColorPicker = function () {
      getRadioSelector().reflow();
    };

    this.getSelectedIndex = function () {
      return getRadioSelector().getSelectedIndex();
    };

    this.setSelectedIndex = function (index) {
      getRadioSelector().setSelectedIndex(index);
    };
  }

  // Inheritance
  BackgroundSelector.prototype = Object.create(EventDispatcher.prototype);
  BackgroundSelector.prototype.constructor = BackgroundSelector;

  return BackgroundSelector;
})(H5P.jQuery, H5P.EventDispatcher);
