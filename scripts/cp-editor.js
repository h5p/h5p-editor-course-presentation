import SlideSelector from './slide-selector';
import AspectRatioSelector from './aspect-ratio-selector';
import { getLibraryDependencyVersion, hotspotParams } from './utils';
import {
  alterDisplayAsButtonSemantics,
  alterDisplayAsHotspotSemantics,
  alterHotspotGotoSemantics
} from './semantics-utils';
import { ASM_TASK_BUTTONS_ID, createActiveSurfaceModeAnswerButtons } from './active-surface-mode-utils';

/*global H5P,ns*/
var H5PEditor = window.H5PEditor || {};

/**
 * Create a field for the form.
 *
 * @param {mixed} parent
 * @param {Object} field
 * @param {mixed} params
 * @param {function} setValue
 * @returns {H5PEditor.Text}
 */
H5PEditor.NDLACoursePresentation = function (parent, field, params, setValue) {
  var that = this;
  H5P.NDLADragNBar.FormManager.call(this, parent, {
    doneButtonLabel: H5PEditor.t('H5PEditor.NDLACoursePresentation', 'done'),
    deleteButtonLabel: H5PEditor.t('H5PEditor.NDLACoursePresentation', 'remove'),
    expandBreadcrumbButtonLabel: H5PEditor.t('H5PEditor.NDLACoursePresentation', 'expandBreadcrumbButtonLabel'),
    collapseBreadcrumbButtonLabel: H5PEditor.t('H5PEditor.NDLACoursePresentation', 'collapseBreadcrumbButtonLabel')
  }, 'coursepresentation');

  const isNewPresentation = params === undefined;
  if (isNewPresentation) {
    params = {
      slides: [{
        elements: [],
        keywords: [],
        aspectRatio: this.defaultAspectRatio
      }],
      defaultAspectRatio: this.defaultAspectRatio
    };

    setValue(field, params);
  }

  this.parent = parent;
  this.field = field;
  this.params = params;
  // Elements holds a mix of forms and params, not element instances
  this.elements = [];
  this.slideRatio = 1.9753;
  this.defaultElementWidthOfContainerInPercent = 40;

  this.passReadies = true;
  parent.ready(() => {
    if (isNewPresentation) {
      const aspectRatioSelector = new AspectRatioSelector([{
          ratio: "4-3",
          label: H5PEditor.t('H5PEditor.NDLACoursePresentation', 'aspectRatioLandscape'),
        },
        {
          ratio: "3-4",
          label: H5PEditor.t('H5PEditor.NDLACoursePresentation', 'aspectRatioPortrait'),
        },
      ], (newRatio) => this.setRatio(newRatio.ratio));

      aspectRatioSelector.show();
    } else {
      this.updateSlideRatio(this.cp.defaultAspectRatio);
    }

    this.passReadies = false;

    // Active surface mode
    const activeSurfaceCheckbox = H5PEditor.findField('override/activeSurface', parent);
    activeSurfaceCheckbox.on('checked', this.activateActiveSurfaceMode.bind(this));
  });

  if (H5PEditor.NDLAInteractiveVideo !== undefined) {
    // Disable IV's guided tour within CP
    H5PEditor.NDLAInteractiveVideo.disableGuidedTour();
  }

  // Update paste button
  H5P.externalDispatcher.on('datainclipboard', function (event) {
    if (!that.libraries) {
      return;
    }
    var canPaste = !event.data.reset;
    if (canPaste) {
      // Check if content type is supported here
      canPaste = that.canPaste(H5P.getClipboard());
    }
    that.dnb.setCanPaste(canPaste);
  });
};

H5PEditor.NDLACoursePresentation.allAspectRatios = ['4-3', '3-4', '16-9', '9-16'];
H5PEditor.NDLACoursePresentation.prototype.defaultAspectRatio = H5PEditor.NDLACoursePresentation.allAspectRatios[0];

H5PEditor.NDLACoursePresentation.prototype = Object.create(H5P.NDLADragNBar.FormManager.prototype);
H5PEditor.NDLACoursePresentation.prototype.constructor = H5PEditor.NDLACoursePresentation;

/**
 * Must be changed if the semantics for the elements changes.
 * @type {string}
 */
H5PEditor.NDLACoursePresentation.clipboardKey = 'H5PEditor.NDLACoursePresentation';

/**
 * Will change the size of all elements using the given ratio.
 *
 * @param {number} heightRatio
 */
H5PEditor.NDLACoursePresentation.prototype.updateElementSizes = function (heightRatio) {
  const $slides = this.cp.$slidesWrapper.children();

  // Go through all slides
  for (let i = 0; i < this.params.slides.length; i++) {
    const slide = this.params.slides[i];
    
    const noElementsInSlide = !slide.elements || slide.elements.length < 1;
    if (noElementsInSlide) {
      continue;
    }

    const $slideElements = $slides.eq(i).children();
    
    for (let j = 0; j < slide.elements.length; j++) {
      const element = slide.elements[j];

      // Update params
      element.height *= heightRatio;
      element.y *= heightRatio;

      // Update visuals if possible
      $slideElements.eq(j).css({
        height: element.height + '%',
        top: element.y + '%'
      });
    }
  }
};

/**
 * Compute true slide aspect ratio,
 * based on set aspect ratio and footer height
 * 
 * @returns {number}
 */
H5PEditor.NDLACoursePresentation.prototype.getTrueSlideAspectRatio = function () {
  const footerHeight = this.slideRatio > 1 ? 95 : 50;
  const wrapperHeight = this.cp.$wrapper.get(0).getBoundingClientRect().height;
  const footerShareOfTotalHeight = footerHeight / wrapperHeight;
  
  return this.slideRatio + footerShareOfTotalHeight;  
}

/**
 * Get element's default aspect ratio, based on library name
 * 
 * @param {string} libraryName 
 * @returns {number}
 */
H5PEditor.NDLACoursePresentation.prototype.getDefaultElementAspectRatio = function(libraryName) {
  let elementAspectRatio = 4 / 3;
  switch (libraryName) {
    case 'H5P.Audio':
    case 'H5P.NDLAInteractiveVideo':
      elementAspectRatio = 1 / 1;
      break;
  }
  
  return elementAspectRatio;
}

/**
 * Add an element to the current slide and params.
 *
 * @param {string|object} library Content type or parameters
 * @param {object} [options] Override the default options
 * @param {object} [instanceParameters] Override the default instance parameters
 * @returns {object}
 */
H5PEditor.NDLACoursePresentation.prototype.addElement = function (library, options = {}, instanceParameters = {}) {
  let elementParams;
  let libraryName;
  
  if (!(library instanceof String || typeof library === 'string')) {
    elementParams = library;
    libraryName = library.action.library.split(' ')[0];
  } else {
    libraryName = library.split(' ')[0];
  }

  const elementAspectRatio = this.getDefaultElementAspectRatio(libraryName);

  const isNewElement = !elementParams;
  if (isNewElement) {
    // Create default start parameters
    elementParams = {
      x: 30,
      y: 30,
      width: this.defaultElementWidthOfContainerInPercent,
      height: undefined,
      transform: 'translate(0px, 0px) rotate(0deg)'
    };

    if (library === 'GoToSlide') {
      elementParams.goToSlide = 1;
    }
    else {
      elementParams.action = (options.action ? options.action : {
        library: library,
        params: instanceParameters
      });
      elementParams.action.subContentId = H5P.createUUID();

      switch (libraryName) {
        case 'H5P.Audio':
          elementParams.width = 5;
          elementParams.action.params.fitToWrapper = true;
          break;
      
        case 'H5P.DragQuestion':
          elementParams.width = 50;
          break;

        case 'H5P.Video':
          elementParams.width = 50;
          break;

        case 'H5P.NDLAInteractiveVideo':
          elementParams.width = 50;
          break;
      }
    }

    const hasSizeOverride = options.width && options.height;
    if (hasSizeOverride && !options.displayAsButton) {
      // Use specified size
      elementParams.width = options.width;
      elementParams.height = options.height * this.slideRatio;
    }

    if (options.displayAsButton) {
      elementParams.displayAsButton = true;
    }
  }

  if (options.pasted) {
    elementParams.pasted = true;
  }

  elementParams = {
    ...elementParams,
    ...instanceParameters,
  };
  
  const slideIndex = this.cp.$current.index();
  const slideParams = this.params.slides[slideIndex];

  const trueAspectRatio = this.getTrueSlideAspectRatio();
  elementParams.height = elementParams.height || elementParams.width * trueAspectRatio / elementAspectRatio;

  if (slideParams.elements === undefined) {
    // No previous elements
    slideParams.elements = [elementParams];
  }
  else {
    const containerStyle = window.getComputedStyle(this.dnb.$container[0]);
    const containerWidth = parseFloat(containerStyle.width);
    const containerHeight = parseFloat(containerStyle.height);

    // Make sure we don't overlap another element
    const pToPx = containerWidth / 100;
    const pos = {
      x: elementParams.x * pToPx,
      y: (elementParams.y * pToPx) / this.slideRatio
    };
    this.dnb.avoidOverlapping(pos, {
      width: (elementParams.width / 100) * containerWidth,
      height: (elementParams.height / 100) * containerHeight,
    });
    elementParams.x = pos.x / pToPx;
    elementParams.y = (pos.y / pToPx) * this.slideRatio;

    // Add as last element
    slideParams.elements.push(elementParams);
  }

  this.cp.$boxWrapper.add(this.cp.$boxWrapper.find('.h5p-presentation-wrapper:first')).css('overflow', 'visible');

  const element = this.cp.children[slideIndex].addChild(elementParams);

  return this.cp.attachElement(elementParams, element.instance, this.cp.$current, slideIndex);
};

/**
 * Append field to wrapper.
 *
 * @param {type} $wrapper
 * @returns {undefined}
 */
H5PEditor.NDLACoursePresentation.prototype.appendTo = function ($wrapper) {
  var that = this;

  this.$item = H5PEditor.$(this.createHtml()).appendTo($wrapper);
  this.$editor = this.$item.children('.editor');
  this.$errors = this.$item.children('.h5p-errors');

  // Create new presentation.
  var presentationParams = (this.parent instanceof ns.Library ? this.parent.params.params : this.parent.params);
  if (presentationParams && presentationParams.override && presentationParams.override.activeSurface === true) {
    this.slideRatio = H5PEditor.NDLACoursePresentation.RATIO_SURFACE;
  }
  this.cp = new H5P.NDLACoursePresentation(presentationParams, H5PEditor.contentId, {cpEditor: this});
  this.cp.attach(this.$editor);
  if (this.cp.$wrapper.is(':visible')) {
    this.cp.trigger('resize');
  }
  var $settingsWrapper = H5PEditor.$('<div>', {
    'class': 'h5p-settings-wrapper hidden',
    appendTo: that.cp.$boxWrapper.children('.h5p-presentation-wrapper')
  });


  // Add drag and drop menu bar.
  this.initializeDNB(false);
  
  // Find BG selector fields and init slide selector
  var globalBackgroundField = H5PEditor.NDLACoursePresentation.findField('globalBackgroundSelector', this.field.fields);
  var slideFields = H5PEditor.NDLACoursePresentation.findField('slides', this.field.fields);
  this.backgroundSelector = new SlideSelector(that, that.cp.$slidesWrapper, globalBackgroundField, slideFields, that.params)
    .appendTo($settingsWrapper);

  // Add and bind slide controls.
  var slideControls = {
    $add: H5PEditor.$('<a href="#" aria-label="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'newSlide') + '" class="h5p-slidecontrols-button h5p-slidecontrols-button-add"></a>'),
    $clone: H5PEditor.$('<a href="#" aria-label="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'cloneSlide') + '" class="h5p-clone-slide h5p-slidecontrols-button h5p-slidecontrols-button-clone"></a>'),
    $background: H5PEditor.$('<a href="#" aria-label="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'backgroundSlide') + '" class="h5p-slidecontrols-button h5p-slidecontrols-button-background"></a>'),
    $sortLeft: H5PEditor.$('<a href="#" aria-label="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'sortSlide', {':dir': 'left'}) + '" class="h5p-slidecontrols-button h5p-slidecontrols-button-sort-left"></a>'),
    $sortRight: H5PEditor.$('<a href="#" aria-label="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'sortSlide', {':dir': 'right'}) + '" class="h5p-slidecontrols-button h5p-slidecontrols-button-sort-right"></a>'),
    $delete: H5PEditor.$('<a href="#" aria-label="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'removeSlide') + '" class="h5p-slidecontrols-button h5p-slidecontrols-button-delete"></a>'),
  };
  this.slideControls = slideControls;

  H5PEditor.$('<div class="h5p-slidecontrols">').append([
    slideControls.$add,
    slideControls.$clone,
    slideControls.$background,
    slideControls.$sortLeft,
    slideControls.$sortRight,
    slideControls.$delete,
  ]).appendTo(this.cp.$footer.children('.h5p-footer-right-adjusted:first'))
    .children('a:first')
    .click(function () {
      that.addSlide();
      that.updateSlidesSidebar();
      return false;
    })
    .next()
    .click(function () {
      var newSlide = H5P.cloneObject(that.params.slides[that.cp.$current.index()], true);
      newSlide.keywords = [];
      that.addSlide(newSlide);
      H5P.ContinuousText.Engine.run(that);
      that.updateSlidesSidebar();
      return false;
    })
    .next()
    .click(function () {
      that.backgroundSelector.toggleOpen();
      H5PEditor.$(this).toggleClass('active');
      return false;
    })
    .next()
    .click(function () {
      that.sortSlide(that.cp.$current.prev(), -1);
      return false;
    })
    .next()
    .click(function () {
      that.sortSlide(that.cp.$current.next(), 1);
      return false;
    })
    .next()
    .click(function () {
      var removeIndex = that.cp.$current.index();
      var removed = that.removeSlide();
      if (removed !== false) {
        that.trigger('removeSlide', removeIndex);
      }
      that.updateSlidesSidebar();
      return false;
    });

  if (this.cp.activeSurface) {
    // Enable adjustments
    this.cp.$container.addClass('h5p-active-surface');

    // Remove navigation
    this.cp.$progressbar.remove();
  }

  // Relay window resize to CP view
  H5P.$window.on('resize', function () {
    that.cp.trigger('resize');
  });

  this.updateSlidesSidebar();
};

/**
 * Sets the given ratio to every slide in the course presentation.
 * Will also change the default aspect ratio that is used for new slides.
 *
 * @param {"4-3" | "3-4"} ratio
 */
H5PEditor.NDLACoursePresentation.prototype.setRatio = function (ratio) {
  this.cp.slides.forEach(slide => slide.aspectRatio = ratio);
  this.cp.defaultAspectRatio = ratio;
  this.updateSlideRatio(ratio);
  
  this.cp.resize();
}

/**
 * Updates the slide ratio field
 *
 * @param {"4-3" | "3-4"} ratio
 */
H5PEditor.NDLACoursePresentation.prototype.updateSlideRatio = function (ratio) {  
  if (!ratio) {
    return;
  }
  
  const [widthRatio, heightRatio] = ratio.split("-").map(num => parseInt(num));
  this.slideRatio = widthRatio / heightRatio;
}

/**
 * Add Drag and Drop button group.
 *
 * @param {H5P.Library} library Library for which a button will be added.
 * @param {object} options Options.
 * @param {object} params Custom semantics params
 */
H5PEditor.NDLACoursePresentation.prototype.createDNBButton = function (library, options, params) {
  options = options || {};
  const id = options.id || library.name.split('.')[1].toLowerCase();

  return {
    id,
    title: (options.title === undefined) ? library.title : options.title,
    createElement: () => 
      this.addElement(library.uberName, H5P.jQuery.extend(true, {}, options), params),
  };
};

/**
 * Add Drag and Drop button group.
 *
 * @param {H5P.Library} library Library for which a button will be added.
 * @param {object} groupData Data for the group.
 * @param {object} [options]
 * @param {string} [options.title]
 * @param {string} [options.titleGroup]
 * @param {string} [options.id]
 * @return {{
 *   id: string;
 *   title: string;
 *   titleGroup: string;
 *   type: string;
 *   width: number;
 *   height: number;
 *   buttons: Array;
 * }} Button group.
 */
H5PEditor.NDLACoursePresentation.prototype.createDNBButtonGroup = function (library, groupData, options = {}) {
  const id = options.id || library.name.split('.')[1].toLowerCase();

  const buttonGroup = {
    id,
    title: options.title || groupData.dropdown.title || library.title,
    titleGroup: groupData.dropdown.titleGroup,
    type: 'group',
    buttons: groupData.buttons.map((button) => {
      const options = {
        id: button.id,
        title: button.title,
        width: button.width,
        height: button.height,
        action: {
          library: library.uberName,
          params: button.params || {},
        },
      };
  
      return this.createDNBButton(library, options, button.params);
    }),
  };

  return buttonGroup;
};

H5PEditor.NDLACoursePresentation.prototype.setContainerEm = function (containerEm) {
  this.containerEm = containerEm;

  if (this.dnb !== undefined && this.dnb.dnr !== undefined) {
    this.dnb.dnr.setContainerEm(this.containerEm);
  }
};

/**
 * Initialize the drag and drop menu bar.
 */
H5PEditor.NDLACoursePresentation.prototype.initializeDNB = function (forceReinitialize) {
  const that = this;
  
  const existingDragNBar = document.querySelector('.h5p-dragnbar');
  const hasBeenInitialized = !!existingDragNBar;
  
  if (hasBeenInitialized) {
    if (forceReinitialize) {
      existingDragNBar.parentElement.removeChild(existingDragNBar);
    }
    else {
      return;
    }
  }
  
  this.$bar = H5PEditor.$('<div class="h5p-dragnbar">' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'loading') + '</div>').insertBefore(this.cp.$boxWrapper);
  const slides = H5PEditor.NDLACoursePresentation.findField('slides', this.field.fields);
  const elementFields = H5PEditor.NDLACoursePresentation.findField('elements', slides.field.fields).field.fields;
  const action = H5PEditor.NDLACoursePresentation.findField('action', elementFields);

  const shapeButtonBase = {
    title: '',
    width: 14.09, // 100 units
    height: 14.09
  };

  const shapeButtonBaseArrowRight = {
    title: '',
    width: 10.00,
    height: 5.00
  };

  const shapeButtonBaseArrowUp = {
    title: '',
    width: 5.00,
    height: 10.00
  };

  const shapeButtonBase1D = {
    params: {
      line: {
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#000'
      }
    }
  };

  const shapeButtonBase2D = {
    params: {
      shape: {
        fillColor: '#fff',
        borderWidth: 0,
        borderStyle: 'solid',
        borderColor: '#000',
      }
    }
  };

  // Ideally, this would not be built here
  const dropdownMenus = {};
  dropdownMenus['ndlashape'] = {
    dropdown: {
      id: 'ndlashape'
    },
    buttons: [
      H5P.jQuery.extend(true, {}, shapeButtonBase, shapeButtonBase2D, {
        id: 'shape-rectangle',
        params: {
          type: 'rectangle',
          shape: {
            borderRadius: 0
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, shapeButtonBase2D, {
        id: 'shape-circle',
        params: {
          type: 'circle'
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, {
        id: 'shape-triangle',
        params: {
          type: 'triangle',
          svgpolygon: {
            fillColor: 'rgb(255,255,255)',
            borderColor: 'rgb(0,0,0)'
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, {
        id: 'shape-pentagon',
        params: {
          type: 'pentagon',
          svgpolygon: {
            fillColor: 'rgb(255,255,255)',
            borderColor: 'rgb(0,0,0)'
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, {
        id: 'shape-hexagon',
        params: {
          type: 'hexagon',
          svgpolygon: {
            fillColor: 'rgb(255,255,255)',
            borderColor: 'rgb(0,0,0)'
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, {
        id: 'shape-cube',
        params: {
          type: 'cube',
          svg3d: {
            fillColor: 'white',
            borderColor: ''
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, {
        id: 'shape-cylinder',
        params: {
          type: 'cylinder',
          svg3d: {
            fillColor: 'white',
            borderColor: ''
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, {
        id: 'shape-cone',
        params: {
          type: 'cone',
          svg3d: {
            fillColor: 'white',
            borderColor: ''
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, shapeButtonBase1D, {
        id: 'shape-horizontal-line',
        params: {
          type: 'horizontal-line'
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBase, shapeButtonBase1D, {
        id: 'shape-vertical-line',
        params: {
          type: 'vertical-line'
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBaseArrowRight, {
        id: 'shape-long-arrow-right',
        params: {
          type: 'long-arrow-right',
          svg: {
            fillColor: ''
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBaseArrowRight, {
        id: 'shape-long-arrow-left',
        params: {
          type: 'long-arrow-left',
          svg: {
            fillColor: ''
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBaseArrowUp, {
        id: 'shape-long-arrow-up',
        params: {
          type: 'long-arrow-up',
          svg: {
            fillColor: ''
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBaseArrowUp, {
        id: 'shape-long-arrow-down',
        params: {
          type: 'long-arrow-down',
          svg: {
            fillColor: ''
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBaseArrowRight, {
        id: 'shape-arrows-alt-h',
        params: {
          type: 'arrows-alt-h',
          svg: {
            fillColor: ''
          }
        }
      }),
      H5P.jQuery.extend(true, {}, shapeButtonBaseArrowUp, {
        id: 'shape-arrows-alt-v',
        params: {
          type: 'arrows-alt-v',
          svg: {
            fillColor: ''
          }
        }
      })
    ]
  };

  dropdownMenus[ASM_TASK_BUTTONS_ID] = createActiveSurfaceModeAnswerButtons();

  H5PEditor.LibraryListCache.getLibraries(action.options, (libraries) => {
    this.libraries = libraries;
    const buttons = [];

    for (const library of libraries) {
      if (library.restricted !== true) {
        // Insert button or buttongroup
        const libraryId = library.name.split('.')[1].toLowerCase();

        const libraryHasDropdown = !!dropdownMenus[libraryId];
        if (libraryHasDropdown) {
          buttons.push(that.createDNBButtonGroup(library, dropdownMenus[libraryId]));
        }
        else {
          buttons.push(that.createDNBButton(library));
        }
      }
    }

    // Add go to slide button
    const goToSlide = H5PEditor.NDLACoursePresentation.findField('goToSlide', elementFields);
    if (goToSlide) {
      buttons.splice(5, 0, {
        id: 'gotoslide',
        title: H5PEditor.t('H5PEditor.NDLACoursePresentation', 'goToSlide'),
        createElement: () => this.addElement(
            `H5P.NDLAShape ${this.getShapeLibraryVersion()}`,
            undefined, 
            {
              ...hotspotParams,
            },
          ),
      });
    }


    let h5pShapeLib = libraries.find(library => library.name === "H5P.NDLAShape");
    if(h5pShapeLib === undefined){
      h5pShapeLib = {
        uberName: "H5P.NDLAShape 1.1",
        name: "H5P.NDLAShape",
        title: "Shape", 
        majorVersion: 1,
        minorVersion: 1,
        runnable: 0,
        restricted: false,
        tutorialUrl: null, 
        metadataSettings: {}
      };
    }




    buttons.splice(
      0,
      0,
      this.createDNBButtonGroup(
        h5pShapeLib,
        dropdownMenus[ASM_TASK_BUTTONS_ID],
        {
          id: ASM_TASK_BUTTONS_ID,
          title: H5PEditor.t('H5PEditor.NDLACoursePresentation', 'answerHotspot'),
        },
      ),
    );

    this.dnb = new H5P.NDLADragNBar(buttons, this.cp.$current, this.$editor, {$blurHandlers: this.cp.$boxWrapper, libraries: libraries});

    this.$dnbContainer = this.cp.$current;
    this.dnb.dnr.snap = 10;
    this.dnb.dnr.setContainerEm(this.containerEm);

    // Register all attached elements with dnb
    that.elements.forEach(function (slide, slideIndex) {
      slide.forEach(function (element, elementIndex) {
        var elementParams = that.params.slides[slideIndex].elements[elementIndex];
        that.addToDragNBar(element, elementParams);
      });
    });

    let reflowLoop;
    const reflowInterval = 250;
    const reflow = () => {
      H5P.ContinuousText.Engine.run(this);
      reflowLoop = setTimeout(reflow, reflowInterval);
    };

    // Resizing listener
    that.dnb.dnr.on('startResizing', function () {
      var elementParams = that.params.slides[that.cp.$current.index()].elements[that.dnb.$element.index()];

      // Check for continuous text
      if (elementParams.action && elementParams.action.library.split(' ')[0] === 'H5P.ContinuousText') {
        reflowLoop = setTimeout(reflow, reflowInterval);
      }
    });

    // Resizing has stopped
    that.dnb.dnr.on('stoppedResizing', function () {
      var elementParams = that.params.slides[that.cp.$current.index()].elements[that.dnb.$element.index()];

      // Store new element position
      elementParams.width = that.dnb.$element.width() / (that.cp.$current.innerWidth() / 100);
      elementParams.height = that.dnb.$element.height() / (that.cp.$current.innerHeight() / 100);
      elementParams.y = ((parseFloat(that.dnb.$element.css('top')) / that.cp.$current.innerHeight()) * 100);
      elementParams.x = ((parseFloat(that.dnb.$element.css('left')) / that.cp.$current.innerWidth()) * 100);

      // Stop reflow loop and run one last reflow
      if (elementParams.action && elementParams.action.library.split(' ')[0] === 'H5P.ContinuousText') {
        clearTimeout(reflowLoop);
        H5P.ContinuousText.Engine.run(that);
      }

      // Trigger element resize
      var elementInstance = that.cp.elementInstances[that.cp.$current.index()][that.dnb.$element.index()];
      H5P.trigger(elementInstance, 'resize');
    });

    // Update params when dragging has stopped
    that.dnb.stopDragCallback = function (newTransform, $element) {
      var params = that.params.slides[that.cp.$current.index()].elements[$element.index()];
      params.transform = newTransform;
    };

    // Update params when resizing has stopped
    that.dnb.stopResizeCallback = function (newWidth, newHeight, newTransform, $element) {
      var params = that.params.slides[that.cp.$current.index()].elements[$element.index()];
      params.x = ((parseFloat(that.dnb.$element.css('left')) / that.cp.$current.innerWidth()) * 100);
      params.y = ((parseFloat(that.dnb.$element.css('top')) / that.cp.$current.innerHeight()) * 100);
      params.width = parseFloat(newWidth);
      params.height = parseFloat(newHeight);
      params.transform = newTransform;

      // Resizing the video-element when dragging the control-box attached to the video-element
      const newWidthAbsolute = (parseFloat(newWidth) / 100) * that.cp.$current.innerWidth();
      const newHeightAbsolute = (parseFloat(newHeight) / 100) * that.cp.$current.innerHeight();
      const isVideo = params.action && params.action.library.split(' ')[0] === 'H5P.Video';
      if(isVideo) {
        const $videoElement = $element.find('.h5p-video').children();
        $videoElement
          .css({width: newWidthAbsolute + 'px', height: newHeightAbsolute + 'px'})
        
        const iFrame = $videoElement.find('iframe');
        iFrame.attr('width', newWidthAbsolute).attr('height', newHeightAbsolute);
      }
    };

    // Update params when rotation has stopped
    that.dnb.stopRotationCallback = function (newTransform, $element) {
      var params = that.params.slides[that.cp.$current.index()].elements[$element.index()];
      params.transform = newTransform;
    };

    // Update params when the element is dropped.
    that.dnb.stopMovingCallback = function (x, y) {
      var params = that.params.slides[that.cp.$current.index()].elements[that.dnb.$element.index()];
      params.x = x;
      params.y = y;
    };

    // Update params when the element is moved instead, to prevent timing issues.
    that.dnb.dnd.moveCallback = function (x, y) {
      var params = that.params.slides[that.cp.$current.index()].elements[that.dnb.$element.index()];
      params.x = x;
      params.y = y;

      that.dnb.updateCoordinates();
    };

    // Edit element when it is dropped.
    that.dnb.dnd.releaseCallback = function () {
      var params = that.params.slides[that.cp.$current.index()].elements[that.dnb.$element.index()];
      var element = that.elements[that.cp.$current.index()][that.dnb.$element.index()];

      if (that.dnb.newElement) {
        that.cp.$boxWrapper.add(that.cp.$boxWrapper.find('.h5p-presentation-wrapper:first')).css('overflow', '');

        if (params.action !== undefined && H5P.libraryFromString(params.action.library).machineName === 'H5P.ContinuousText') {
          H5P.ContinuousText.Engine.run(that);
          if (!that.params.ct) {
            // No CT text but there could be elements
            var CTs = that.getCTs(false, true);
            if (CTs.length === 1) {
              // First element, open form
              that.showElementForm(element, that.dnb.$element, params);
            }
          }
        }
        else {
          that.showElementForm(element, that.dnb.$element, params);
        }
      }
    };

    /**
     * @private
     * @param {string} lib uber name
     * @returns {boolean}
     */
    that.supported = function (lib) {
      for (var i = 0; i < libraries.length; i++) {
        if (libraries[i].restricted !== true && libraries[i].uberName === lib) {
          return true; // Library is supported and allowed
        }
      }

      return false;
    };

    that.dnb.on('paste', function (event) {
      var pasted = event.data;
      var options = {
        width: pasted.width,
        height: pasted.height,
        pasted: true
      };

      if (pasted.from === H5PEditor.NDLACoursePresentation.clipboardKey) {
        // Pasted content comes from the same version of CP

        if (!pasted.generic) {
          // Non generic part, must be content like gotoslide or similar
          that.dnb.focus(that.addElement(pasted.specific, options));
        }
        else if (that.supported(pasted.generic.library)) {
          // Special case for ETA - can't copy the index, then export won't include
          // the original, since they will have the same index.
          if (pasted.generic.library.split(' ')[0] === 'H5P.ExportableTextArea') {
            delete pasted.generic.params.index;
          }
          // Has generic part and the generic libray is supported
          that.dnb.focus(that.addElement(pasted.specific, options));
        }
        else {
          alert(H5PEditor.t('H5P.NDLADragNBar', 'unableToPaste'));
        }
      }
      else if (pasted.generic) {
        if (that.supported(pasted.generic.library)) {
          // Supported library from another content type)

          if (pasted.specific.displayType === 'button') {
            // Make sure buttons from IV  still are buttons.
            options.displayAsButton = true;
          }
          options.action = pasted.generic;
          that.dnb.focus(that.addElement(pasted.generic.library, options));
        }
        else {
          alert(H5PEditor.t('H5P.NDLADragNBar', 'unableToPaste'));
        }
      }
    });

    that.dnb.attach(that.$bar);

    // Set paste button
    that.dnb.setCanPaste(that.canPaste(H5P.getClipboard()));

    // Bind keyword interactions.
    that.initKeywordInteractions();

    // Trigger event
    that.trigger('librariesReady');
  });
};

H5PEditor.NDLACoursePresentation.prototype.getShapeLibraryVersion = function() {
  this._shapeLibVersion = this._shapeLibVersion || getLibraryDependencyVersion('H5P.NDLAShape');
  const shapeLibNotLoaded = !this._shapeLibVersion;
  if (shapeLibNotLoaded) {
    console.warn('H5P.NDLAShape is not listed as a preloaded dependency in `library.json`');
  }

  return this._shapeLibVersion;
};

H5PEditor.NDLACoursePresentation.prototype.activateActiveSurfaceMode = function () {
  const oldHeight = parseFloat(window.getComputedStyle(this.cp.$current[0]).height);

  // Enable adjustments
  this.cp.$container.addClass('h5p-active-surface');

  // Remove navigation
  this.cp.$progressbar.remove();

  // Find change in %
  var newHeight = parseFloat(window.getComputedStyle(this.cp.$current[0]).height);
  var change = (newHeight - oldHeight) / newHeight;

  // Account for the progress bar that was removed
  this.slideRatio = H5PEditor.NDLACoursePresentation.RATIO_SURFACE;

  // Update elements
  this.updateElementSizes(1 - change);

  this.cp.activeSurface = true;

  this.initializeDNB(true);
};

/**
 * Check if the clipboard can be pasted into CP.
 *
 * @param {Object} [clipboard] Clipboard data.
 * @return {boolean} True, if clipboard can be pasted.
 */
H5PEditor.NDLACoursePresentation.prototype.canPaste = function (clipboard) {
  if (clipboard) {
    if (clipboard.from === H5PEditor.NDLACoursePresentation.clipboardKey &&
        (!clipboard.generic || this.supported(clipboard.generic.library))) {
      // Content comes from the same version of CP
      // Non generic part = must be content like gotoslide or similar
      return true;
    }
    else if (clipboard.generic && this.supported(clipboard.generic.library)) {
      // Supported library from another content type
      return true;
    }
  }

  return false;
};

/**
 * Create HTML for the field.
 */
H5PEditor.NDLACoursePresentation.prototype.createHtml = function () {
  return H5PEditor.createFieldMarkup(this.field, '<div class="editor"></div>');
};

/**
 * Validate the current field.
 */
H5PEditor.NDLACoursePresentation.prototype.validate = function () {
  // Validate all form elements
  var valid = true;
  var firstCT = true;
  for (var i = 0; i < this.elements.length; i++) {
    if (!this.elements[i]) {
      continue;
    }
    for (var j = 0; j < this.elements[i].length; j++) {
      // We must make sure form values are stored if the dialog was never closed
      var elementParams = this.params.slides[i].elements[j];
      var isCT = (elementParams.action !== undefined && elementParams.action.library.split(' ')[0] === 'H5P.ContinuousText');
      if (isCT && !firstCT) {
        continue; // Only need to process the first CT
      }

      // Validate element form
      for (var k = 0; k < this.elements[i][j].children.length; k++) {
        if (this.elements[i][j].children[k].validate() === false && valid) {
          valid = false;
        }
      }

      if (isCT) {
        if (!this.params.ct) {
          // Store complete text in CT param
          this.params.ct = elementParams.action.params.text;
        }
        firstCT = false;
      }
    }
  }
  valid &= this.backgroundSelector.validate();

  // Distribute CT text across elements
  H5P.ContinuousText.Engine.run(this);
  this.trigger('validate');
  return valid;
};

/**
 * Remove this item.
 */
H5PEditor.NDLACoursePresentation.prototype.remove = function () {
  this.trigger('remove');
  if (this.dnb !== undefined) {
    this.dnb.remove();
  }
  this.$item.remove();

  this.elements.forEach(function (slides) {
    slides.forEach(function (interaction) {
      H5PEditor.removeChildren(interaction.children);
    });
  });
};

/**
 * Initialize keyword interactions.
 *
 * @returns {undefined} Nothing
 */
H5PEditor.NDLACoursePresentation.prototype.initKeywordInteractions = function () {
  var that = this;
  // Add our own menu to the drag and drop menu bar.
  that.$keywordsDNB = H5PEditor.$(
    '<ul class="h5p-dragnbar-ul h5p-dragnbar-left">' +
      '<li class="h5p-slides-menu">' +
        '<div title="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'slides') + '" class="h5p-dragnbar-keywords" role="button" tabindex="0">' +
          '<span>' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'slides') + '</span>' +
        '</div>' +
        '<div class="h5p-keywords-dropdown">' +
          '<label class="h5p-keywords-enable">' +
            '<input type="checkbox"/>' +
            H5PEditor.t('H5PEditor.NDLACoursePresentation', 'showTitles') +
          '</label>' +
          '<label class="h5p-keywords-portrait"><input type="checkbox"/>' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'portrait') + '</label>' +
          '<label class="h5p-keywords-always"><input type="checkbox"/>' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'alwaysShow') + '</label>' +
          '<label class="h5p-keywords-hide"><input type="checkbox"/>' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'autoHide') + '</label>' +
          '<label class="h5p-keywords-opacity"><input type="text"/> % ' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'opacity') + '</label>' +
          '<div class="h5peditor-button h5peditor-button-textual importance-low" role="button" tabindex="0" aria-disabled="false">' +
            H5PEditor.t('H5PEditor.NDLACoursePresentation', 'ok') +
          '</div>' +
        '</div>' +
      '</li>' +
    '</ul>').prependTo(this.$bar);

  that.initKeywordMenu();

  // Make keywords drop down menu come alive
  var $slidesMenu = this.$bar.find('.h5p-dragnbar-keywords');
  var $dropdown = this.$bar.find('.h5p-keywords-dropdown');
  var preventClose = false;
  var closeDropdown = function () {
    if (preventClose) {
      preventClose = false;
    }
    else {
      $slidesMenu.removeClass('h5p-open');
      $dropdown.removeClass('h5p-open');
      that.cp.$container.off('click', closeDropdown);
    }
  };

  $dropdown.find('.h5peditor-button').click(closeDropdown);

  // Make sure keywords settings and button is hidden on load if disabled
  if (!this.params.keywordListEnabled) {
    $dropdown.children().first().siblings().hide().last().show();
    that.cp.$keywordsButton.hide();
  }

  // Open dropdown when clicking the dropdown button
  $slidesMenu.click(function () {
    if (!$dropdown.hasClass('h5p-open')) {
      that.cp.$container.on('click', closeDropdown);
      $slidesMenu.addClass('h5p-open');
      $dropdown.addClass('h5p-open');
      preventClose = true;
    }
  });

  // Prevent closing when clicking on the dropdown dialog it self
  $dropdown.click(function () {
    preventClose = true;
  });

  // Enable keywords list
  var $enableKeywords = this.$bar.find('.h5p-keywords-enable input').change(function () {
    that.params.keywordListEnabled = $enableKeywords.is(':checked');
    if (that.params.keywordListEnabled) {
      if (that.params.keywordListAlwaysShow) {
        that.cp.$keywordsWrapper.show().add(that.cp.$keywordsButton).addClass('h5p-open');
        that.cp.$keywordsButton.hide();
      }
      else {
        that.cp.$keywordsWrapper.add(that.cp.$keywordsButton).show();
      }
      ns.$(this).parent().siblings().show();
    }
    else {
      that.cp.$keywordsWrapper.add(that.cp.$keywordsButton).hide();
      ns.$(this).parent().siblings().hide().last().show();
    }
  });

  // Always show keywords list
  var $alwaysKeywords = this.$bar.find('.h5p-keywords-always input').change(function () {
    var checked = $alwaysKeywords.is(':checked');

    that.params.keywordListAlwaysShow = checked;

    if (checked) {
      // Disable auto hide
      that.params.keywordListAutoHide = false;
      that.$bar.find('.h5p-keywords-hide input')
        .attr('checked', false)
        .attr("disabled", true)
        .parent().addClass('h5p-disabled');
    }
    else {
      that.$bar.find('.h5p-keywords-hide input')
        .attr("disabled", false)
        .parent().removeClass('h5p-disabled');
    }

    if (!that.params.keywordListEnabled) {
      that.cp.hideKeywords();
      that.cp.$keywordsButton.hide();
      return;
    }
    else if (!that.params.keywordListAlwaysShow) {
      that.cp.$keywordsButton.show();
    }
    if (that.params.keywordListAlwaysShow) {
      that.cp.$keywordsButton.hide();
      that.cp.showKeywords();
    }
    else if (that.params.keywordListEnabled) {
      that.cp.$keywordsButton.show();
      that.cp.showKeywords();
    }
  });

  // Auto hide keywords list
  var $hideKeywords = this.$bar.find('.h5p-keywords-hide input').change(function () {
    that.params.keywordListAutoHide = $hideKeywords.is(':checked');
  });

  // Opacity for keywords list
  var $opacityKeywords = this.$bar.find('.h5p-keywords-opacity input').change(function () {
    var opacity = parseInt($opacityKeywords.val());
    if (isNaN(opacity)) {
      opacity = 90;
    }
    if (opacity > 100) {
      opacity = 100;
    }
    if (opacity < 0) {
      opacity = 0;
    }
    that.params.keywordListOpacity = opacity;
    that.cp.setKeywordsOpacity(opacity);
  });

  /**
   * Help set default values if undefined.
   *
   * @private
   * @param {String} option
   * @param {*} defaultValue
   */
  var checkDefault = function (option, defaultValue) {
    if (that.params[option] === undefined) {
      that.params[option] = defaultValue;
    }
  };

  // Set defaults if undefined
  checkDefault('keywordListEnabled', true);
  checkDefault('keywordListAlwaysShow', false);
  checkDefault('keywordListAutoHide', false);
  checkDefault('keywordListOpacity', 90);

  // Update HTML
  $enableKeywords.attr('checked', that.params.keywordListEnabled);
  $alwaysKeywords.attr('checked', that.params.keywordListAlwaysShow);
  $hideKeywords.attr('checked', that.params.keywordListAutoHide);
  $opacityKeywords.val(that.params.keywordListOpacity);
};

/**
 * Initiates the keyword menu
 */
H5PEditor.NDLACoursePresentation.prototype.initKeywordMenu = function () {
  var that = this;
  // Keyword events
  var keywordClick = function (event) {
    // Convert keywords into text areas when clicking.
    if (that.editKeyword(H5PEditor.$(this)) !== false) {
      event.stopPropagation();
      H5PEditor.$(event.target).parent().addClass('h5p-editing');
    }
  };

  // Make existing keywords editable
  this.cp.$keywords.find('.h5p-keyword-title').click(keywordClick);
};


/**
 * Adds slide after current slide.
 *
 * @param {object} slideParams
 * @returns {undefined} Nothing
 */
H5PEditor.NDLACoursePresentation.prototype.addSlide = function (slideParams) {
  var that = this;

  if (slideParams === undefined) {
    // Set new slide params
    slideParams = {
      elements: [],
      keywords: [],
      aspectRatio: that.cp.defaultAspectRatio
    };
  }

  var index = this.cp.$current.index() + 1;
  this.params.slides.splice(index, 0, slideParams);
  this.elements.splice(index, 0, []);
  this.cp.elementInstances.splice(index, 0, []);
  this.cp.elementsAttached.splice(index, 0, []);
  const slide = this.cp.addChild(slideParams, index);

  // Add slide with elements
  slide.getElement().insertAfter(this.cp.$current);
  that.trigger('addedSlide', index);
  slide.appendElements();

  this.cp.updateKeywordMenuFromSlides();
  this.initKeywordMenu();

  // Update progressbar
  this.updateNavigationLine(index);

  // Switch to the new slide.
  this.cp.nextSlide();
};

/** 
 * Update slides with solutions.
 */
H5PEditor.NDLACoursePresentation.prototype.updateNavigationLine = function (index) {
  const hasSolutionArray = this.cp.slides.map((instanceArray, slideIndex) => {
    const slideElements = this.cp.elementInstances[slideIndex];
    
    const isTaskWithSolution =
      slideElements &&
      slideElements.some((elementInstance) =>
        this.cp.checkForSolutions(elementInstance),
      );

    return isTaskWithSolution ? [true] : [];
  });

  // Update progressbar and footer
  this.cp.navigationLine.initProgressbar(hasSolutionArray);
  this.cp.navigationLine.updateProgressBar(index);
  this.cp.navigationLine.updateFooter(index);
};

/**
 * Remove the current slide
 *
 * @returns {Boolean} Indicates success
 */
H5PEditor.NDLACoursePresentation.prototype.removeSlide = function () {
  var index = this.cp.$current.index();
  var $remove = this.cp.$current.add(this.cp.$currentKeyword);
  var isRemovingDnbContainer = this.cp.$current.index() === this.$dnbContainer.index();

  // Confirm
  if (!confirm(H5PEditor.t('H5PEditor.NDLACoursePresentation', 'confirmDeleteSlide'))) {
    return false;
  }

  // Remove elements from slide
  var slideKids = this.elements[index];
  if (slideKids !== undefined) {
    for (var i = 0; i < slideKids.length; i++) {
      this.removeElement(slideKids[i], slideKids[i].$wrapper, this.cp.elementInstances[index][i].libraryInfo && this.cp.elementInstances[index][i].libraryInfo.machineName === 'H5P.ContinuousText');
    }
  }
  this.elements.splice(index, 1);

  // Change slide
  var move = this.cp.previousSlide() ? -1 : (this.cp.nextSlide(true) ? 0 : undefined);

  // Replace existing DnB container used for calculating dimensions of elements
  if (isRemovingDnbContainer) {
    // Set new dnb container
    this.$dnbContainer = this.cp.$current;
    this.dnb.setContainer(this.$dnbContainer);
  }
  if (move === undefined) {
    return false; // No next or previous slide
  }

  // ExportableTextArea needs to know about the deletion:
  H5P.ExportableTextArea.CPInterface.onDeleteSlide(index);

  // Update presentation params.
  this.params.slides.splice(index, 1);

  // Update the list of element instances
  this.cp.elementInstances.splice(index, 1);
  this.cp.elementsAttached.splice(index, 1);

  this.cp.removeChild(index);

  this.cp.updateKeywordMenuFromSlides();
  this.initKeywordMenu();
  this.updateNavigationLine(index + move);

  // Remove visuals.
  $remove.remove();

  H5P.ContinuousText.Engine.run(this);
};

/**
 * Animate navigation line slide icons when the slides are sorted
 *
 * @param {number} direction 1 for next, -1 for prev.
 */
H5PEditor.NDLACoursePresentation.prototype.animateNavigationLine = function (direction) {
  var that = this;

  var $selectedProgressPart = that.cp.$progressbar.find('.h5p-progressbar-part-selected');
  $selectedProgressPart.css('transform', 'translateX(' + (-100 * direction) + '%)');

  var $selectedNext = (direction == 1 ? $selectedProgressPart.prev() : $selectedProgressPart.next());
  $selectedNext.css('transform', 'translateX(' + (100 * direction) + '%)');

  setTimeout(function () { // Next tick triggers animation
    $selectedProgressPart.add($selectedNext).css('transform', '');
  }, 0);
};

/**
 * Update the slides sidebar
 */
H5PEditor.NDLACoursePresentation.prototype.updateSlidesSidebar = function () {
  var self = this;
  var $keywords = this.cp.$keywords.children();

  // Update the sub titles
  $keywords.each(function (index) {

    var $keyword = H5PEditor.$(this);

    $keyword.find('.h5p-keyword-subtitle').html(self.cp.l10n.slide + ' ' + (index + 1));
    $keyword.find('.joubel-icon-edit').remove();

    var $editIcon = H5PEditor.$(
      '<a href="#" class="joubel-icon-edit h5p-hidden" title="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'edit') + '" tabindex="0">' +
        '<span class="h5p-icon-circle"></span>' +
        '<span class="h5p-icon-pencil"></span>' +
      '</a>'
    ).click(function () {
      // If clicked is not already active, do a double click
      if (!H5PEditor.$(this).parents('[role="menuitem"]').hasClass('h5p-current')) {
        H5PEditor.$(this).siblings('span').click().click();
      }
      else {
        H5PEditor.$(this).siblings('span').click();
      }
      $editIcon.siblings('textarea').select();
      return false;
    }).keydown(function (event) {
      if ([13,32].indexOf(event.which) !== -1) {
        H5PEditor.$(this).click();
        return false;
      }

      // Ignore arrow keys for now to avoid JS-error
      if (event.which >= 37 && event.which <= 40) {
        return false;
      }
    }).blur(function () {
      $editIcon.addClass('h5p-hidden');
    }).appendTo($keywords.eq(index));

    H5PEditor.$(this).focus(function () {
      $editIcon.removeClass('h5p-hidden');
    }).hover(function () {
      if (!H5PEditor.$(this).hasClass('h5p-editing')) {
        $editIcon.removeClass('h5p-hidden');
      }
    }).mouseleave(function () {
      $editIcon.addClass('h5p-hidden');
    }).blur(function (e) {
      if (e.relatedTarget && e.relatedTarget.className !== 'joubel-icon-edit' || !e.relatedTarget) {
        $editIcon.addClass('h5p-hidden');
      }
    });
  });
};

/**
 * Sort current slide in the given direction.
 *
 * @param {H5PEditor.$} $element The next/prev slide.
 * @param {int} direction 1 for next, -1 for prev.
 * @returns {Boolean} Indicates success.
 */
H5PEditor.NDLACoursePresentation.prototype.sortSlide = function ($element, direction) {
  if (!$element.length) {
    return false;
  }

  var index = this.cp.$current.index();
  var keywordsEnabled = this.cp.$currentKeyword !== undefined;

  // Move slides and keywords.
  if (direction === -1) {
    this.cp.$current.insertBefore($element.removeClass('h5p-previous'));
    if (keywordsEnabled) {
      var $prev = this.cp.$currentKeyword.prev();
      this.cp.$currentKeyword.insertBefore($prev);
      this.swapIndexes(this.cp.$currentKeyword, $prev);
    }
  }
  else {
    this.cp.$current.insertAfter($element.addClass('h5p-previous'));
    if (keywordsEnabled) {
      var $next = this.cp.$currentKeyword.next();
      this.cp.$currentKeyword.insertAfter($next);
      this.swapIndexes(this.cp.$currentKeyword, $next);
    }
  }

  if (keywordsEnabled) {
    this.cp.keywordMenu.scrollToKeywords();
  }

  // Jump to sorted slide number
  var newIndex = index + direction;
  this.cp.jumpToSlide(newIndex);

  // Need to inform exportable text area about the change:
  H5P.ExportableTextArea.CPInterface.changeSlideIndex(direction > 0 ? index : index-1, direction > 0 ? index+1 : index);

  // Update params.
  this.swapCollectionIndex(this.params.slides, index, newIndex);
  this.swapCollectionIndex(this.elements, index, newIndex);
  this.swapCollectionIndex(this.cp.elementInstances, index, newIndex);
  this.swapCollectionIndex(this.cp.elementsAttached, index, newIndex);
  this.cp.moveChild(index, newIndex);

  this.updateNavigationLine(newIndex);
  H5P.ContinuousText.Engine.run(this);
  this.updateSlidesSidebar();

  this.animateNavigationLine(direction);
  this.trigger('sortSlide', direction);

  return true;
};

/**
 * Swap indexes in array, useful when sorting
 *
 * @param {Array} collection The collection we'll swap indexes in
 * @param {number} firstIndex First index that will be swapped
 * @param {number} secondIndex Second index that will be swapped
 */
H5PEditor.NDLACoursePresentation.prototype.swapCollectionIndex = function (collection, firstIndex, secondIndex) {
  var temp = collection[firstIndex];
  collection[firstIndex] = collection[secondIndex];
  collection[secondIndex] = temp;
};

/**
 * Swaps the [data-index] values of two elements
 *
 * @param {jQuery} $current
 * @param {jQuery} $other
 */
H5PEditor.NDLACoursePresentation.prototype.swapIndexes = function ($current, $other) {
  var currentIndex = $current.attr('data-index');
  var otherIndex = $other.attr('data-index');
  $current.attr('data-index', otherIndex);
  $other.attr('data-index', currentIndex);
};

/**
 * Edit keyword.
 *
 * @param {H5PEditor.$} $span Keyword wrapper.
 * @returns {unresolved} Nothing
 */
H5PEditor.NDLACoursePresentation.prototype.editKeyword = function ($span) {
  var that = this;

  var $li = $span.parent();
  if (!$li.hasClass('h5p-current')) {
    return false; // Can only edit title for the current slide
  }

  var oldTitle = $span.text(); // Used for reset / cancel
  var slideIndex = that.cp.$current.index();
  if (!that.params.slides[slideIndex].keywords || !that.params.slides[slideIndex].keywords.length) {
    oldTitle = ''; // Prevent editing 'No title' string
  }

  var $delete = H5PEditor.$(
    '<a href="#" class="joubel-icon-cancel" title="' + H5PEditor.t('H5PEditor.NDLACoursePresentation', 'cancel') + '">' +
      '<span class="h5p-icon-circle"></span>' +
      '<span class="h5p-icon-cross"></span>' +
    '</a>');

  var $textarea = H5PEditor.$('<textarea></textarea>')
    .val(oldTitle)
    .insertBefore($span.hide())
    .keydown(function (event) {
      if (event.keyCode === 13) {
        $textarea.blur();
        $li.focus();
        return false;
      }

      // don't propagate key events from textarea
      event.stopPropagation();
    }).keyup(function () {
      $textarea.css('height', $textarea[0].scrollHeight);
    }).blur(function (event) {
      if (event.relatedTarget && event.relatedTarget.className !== 'joubel-icon-cancel' || !event.relatedTarget) {
        var keyword = $textarea.val(); // Text not HTML

        that.updateKeyword(keyword, slideIndex, $span.html());

        // Remove textarea
        $li.removeClass('h5p-editing');
        $span.css({'display': 'inline-block'});
        $textarea.add($delete).remove();
      }
    }).focus();

  $textarea.keyup();

  $delete.insertAfter($textarea).click(function (e) {
    e.preventDefault();
    $textarea.val(oldTitle).blur();
    H5PEditor.$('[role="menuitem"].h5p-current').focus();
  }).keydown(function (e) {
    if ([32,13].indexOf(e.which) !== -1) {
      H5PEditor.$(this).click();
      return false;
    }
    // Ignore arrow keys for now to avoid JS-error
    if (e.which >= 37 && e.which <= 40) {
      return false;
    }
  }).blur(function (e) {
    if (e.relatedTarget && e.relatedTarget.tagName !== 'TEXTAREA' || !e.relatedTarget) {
      $textarea.blur();
    }
  });
};

/**
 * Updates the configs with the new keyword
 *
 * @param {string} keyword
 * @param {number} slideIndex
 * @param {string} oldTitle
 */
H5PEditor.NDLACoursePresentation.prototype.updateKeyword = function (keyword, slideIndex, oldTitle) {
  var that = this;
  var hasTitle = true;

  if (H5P.trim(keyword) === '') {
    // Title is blank, use placeholder text
    keyword = that.cp.l10n.noTitle;
    hasTitle = false;
  }

  // Update navigation bar display?
  that.cp.progressbarParts[slideIndex].data('keyword', oldTitle);

  // Update keywords button
  H5PEditor.$('.current-slide-title').html(oldTitle);

  // Update params
  if (hasTitle) {
    that.params.slides[slideIndex].keywords = [{
      main: keyword
    }];
  }
  else {
    delete that.params.slides[slideIndex].keywords;
  }

  // Update keyword list item
  H5PEditor.$('[role="menuitem"].h5p-current .h5p-keyword-title').text(keyword);
};

/**
 * Generate element form.
 *
 * @param {Object} elementParams
 * @param {String} type
 * @returns {Object}
 */
H5PEditor.NDLACoursePresentation.prototype.generateForm = function (elementParams, type) {
  var self = this;

  if (type === 'H5P.ContinuousText' && self.ct) {
    // Continuous Text shares a single form across all elements
    return {
      '$form': self.ct.element.$form,
      children: self.ct.element.children
    };
  }

  // Get semantics for the elements field
  var slides = H5PEditor.NDLACoursePresentation.findField('slides', this.field.fields);
  var elementFields = H5PEditor.$.extend(true, [], H5PEditor.NDLACoursePresentation.findField('elements', slides.field.fields).field.fields);

  const isAnswerHotspot = !!elementParams.answerType;

  // Manipulate semantics into only using a given set of fields
  if (type === 'goToSlide') {
    // Hide all others
    this.showFields(elementFields, ['title', 'goToSlide', 'goToSlideType', 'invisible']);
  } else if (isAnswerHotspot) {
    this.hideFields(
      elementFields,
      [
        'solution',
        'alwaysDisplayComments',
        'backgroundOpacity',
        'displayAsButton',
        'buttonSize',
        'buttonColor',
        'useButtonIcon',
        'buttonIcon',
    ]);
  }
  else {
    var hideFields = [];

    if (type === 'H5P.ContinuousText' || type === 'H5P.Audio') {
      // Continuous Text or Go To Slide cannot be displayed as a button
      hideFields.push('displayAsButton');
      hideFields.push('buttonSize');
    }
    else if (type === "H5P.NDLAShape") {
      hideFields.push(
        'solution',
        'alwaysDisplayComments',
        'backgroundOpacity',
        'displayAsButton',
        'buttonSize',
        'buttonColor',
        'useButtonIcon',
        'buttonIcon'
      );
    }

    // Only display goToSlide field for goToSlide elements
    self.hideFields(elementFields, hideFields);
  }

  var element = {
    '$form': H5P.jQuery('<div/>')
  };

  // Render element fields
  H5PEditor.processSemanticsChunk(elementFields, elementParams, element.$form, self);
  element.children = self.children;

  // Remove library selector and copy button and paste button
  var pos = elementFields.map(function (field) {
    return field.type;
  }).indexOf('library');
  if (pos !== -1 && element.children[pos].hide) {
    element.children[pos].hide();
    element.$form.css('padding-top', '0');
  }

  alterDisplayAsButtonSemantics(element, ns.$);
  alterDisplayAsHotspotSemantics(element, ns.$);
  alterHotspotGotoSemantics(element, ns.$);

  element.$form.find('.field-name-useButtonIcon').each(function () { // TODO: Use showWhen in semantics.json instead…
    var buttonIconSelectField = ns.$(this).parent().find('.field-name-buttonIcon');

    if (!ns.$(this).find("input")[0].checked) {
      buttonIconSelectField.addClass("h5p-hidden2");
    }

    ns.$(this).find("input").change(function (e) {
      if (e.target.checked) {
        buttonIconSelectField.removeClass("h5p-hidden2");
      }
      else {
        buttonIconSelectField.addClass("h5p-hidden2");
      }
    });
  });

  // Set correct aspect ratio on new images.
  // TODO: Do not use/rely on magic numbers!
  var library = element.children[4];
  if (!(library instanceof H5PEditor.None)) {
    var libraryChange = function () {
      if (library.children[0].field.type === 'image') {
        library.children[0].changes.push(function (params) {
          self.setImageSize(element, elementParams, params);
        });
      } else if (library.children[0].field.type === 'video') {
        library.children[0].changes.push(function (params) {
          self.setVideoSize(elementParams, params);
        });
      }

      // Determine library options for this subcontent library
      var libraryOptions = H5PEditor.NDLACoursePresentation.findField('action', elementFields).options;
      if (libraryOptions.length > 0 && typeof libraryOptions[0] === 'object') {
        libraryOptions = libraryOptions.filter(function (option) {
          return option.name.split(' ')[0] === type;
        });
        libraryOptions = (libraryOptions.length > 0) ? libraryOptions[0] : {};
      }
      else {
        libraryOptions = {};
      }
    };
    if (library.children === undefined) {
      library.changes.push(libraryChange);
    }
    else {
      libraryChange();
    }
  }

  return element;
};

/**
 * Help set size for new images and keep aspect ratio.
 *
 * @param {object} element
 * @param {object} elementParams
 * @param {object} fileParams
 */
H5PEditor.NDLACoursePresentation.prototype.setImageSize = function (element, elementParams, fileParams) {
  if (fileParams === undefined || fileParams.width === undefined || fileParams.height === undefined) {
    return;
  }

  // Avoid to small images
  var minSize = parseInt(element.$wrapper.css('font-size')) +
                element.$wrapper.outerWidth() -
                element.$wrapper.innerWidth();

  var fileRatio = fileParams.width / fileParams.height;

  // Use minSize
  if (fileParams.width < minSize){
    fileParams.height = minSize * fileRatio;
  }

  if (fileParams.height < minSize){
    fileParams.height = minSize;
  }

  // Reduce height for tiny images, stretched pixels looks horrible
  var suggestedHeight = fileParams.height / (this.cp.$current.innerHeight() / 100);
  if (suggestedHeight < elementParams.height) {
    elementParams.height = suggestedHeight;
  }

  // Calculate new width
  elementParams.width = elementParams.height * fileRatio;

  if(elementParams.width > element.$wrapper.innerWidth()){
    elementParams.height = (element.$wrapper.innerWidth() * elementParams.height) / elementParams.width;
    elementParams.width = element.$wrapper.innerWidth();
  }

  if(elementParams.height > element.$wrapper.innerHeight()){
    elementParams.width = (element.$wrapper.innerHeight() * elementParams.width) / elementParams.height;
    elementParams.height = element.$wrapper.innerHeight();
  }
  
  elementParams.width = (elementParams.width / element.$wrapper.innerWidth()) * 100;
  elementParams.height = (elementParams.height / element.$wrapper.innerHeight()) * 100;
};

/**
 * Help set size for new videos and keep aspect ratio.
 *
 * @param {object} element
 * @param {object} elementParams
 * @param {object} fileParams
 */
H5PEditor.NDLACoursePresentation.prototype.setVideoSize = function (elementParams, fileParams) {
  if( fileParams === undefined){
    return;
  }
  if (fileParams.hasOwnProperty('aspectRatio') !== true) {
    fileParams.aspectRatio = '16:9';
  }

  const cpRatio = this.cp.$current.innerWidth() / this.cp.$current.innerHeight();

  const ratioParts = String(fileParams.aspectRatio).split(':');
  elementParams.height = (elementParams.width * (ratioParts.length === 1 ? fileParams.aspectRatio : (ratioParts[1] / ratioParts[0]))) * cpRatio;
};

/**
 * Hide all fields in the given list. All others are shown.
 *
 * @param {Object[]} elementFields
 * @param {String[]} fields
 */
H5PEditor.NDLACoursePresentation.prototype.hideFields = function (elementFields, fields) {
  // Find and hide fields in list
  for (var i = 0; i < fields.length; i++) {
    var field = H5PEditor.NDLACoursePresentation.findField(fields[i], elementFields);
    if (field) {
      field.widget = 'none';
    }
  }
};

/**
 * Show all fields in the given list. All others are hidden.
 *
 * @param {Object[]} elementFields
 * @param {String[]} fields
 */
H5PEditor.NDLACoursePresentation.prototype.showFields = function (elementFields, fields) {
  // Find and hide all fields not in list
  for (var i = 0; i < elementFields.length; i++) {
    var field = elementFields[i];
    var found = false;

    for (var j = 0; j < fields.length; j++) {
      if (field.name === fields[j]) {
        found = true;
        break;
      }
    }

    if (!found) {
      field.widget = 'none';
    }
  }
};

/**
* Find the title for the given library.
*
* @param {String} type Library name
* @param {Function} next Called when we've found the title
*/
H5PEditor.NDLACoursePresentation.prototype.findLibraryTitle = function (library, next) {
  var self = this;

  /** @private */
  var find = function () {
    for (var i = 0; i < self.libraries.length; i++) {
      if (self.libraries[i].name === library) {
        next(self.libraries[i].title);
        return;
      }
    }
  };

  if (self.libraries === undefined) {
    // Must wait until library titles are loaded
    self.once('librariesReady', find);
  }
  else {
    find();
  }
};

/**
 * Callback used by CP when a new element is added.
 *
 * @param {Object} elementParams
 * @param {jQuery} $wrapper
 * @param {Number} slideIndex
 * @param {Object} elementInstance
 * @returns {undefined}
 */
H5PEditor.NDLACoursePresentation.prototype.processElement = function (elementParams, $wrapper, slideIndex, elementInstance) {
  var that = this;

  // Detect type
  var type;
  if (elementParams.action !== undefined) {
    type = elementParams.action.library.split(' ')[0];
  }
  else {
    type = 'goToSlide';
  }

  // Find element identifier
  var elementIndex = $wrapper.index();

  // Generate element form
  if (this.elements[slideIndex] === undefined) {
    this.elements[slideIndex] = [];
  }
  if (this.elements[slideIndex][elementIndex] === undefined) {
    this.elements[slideIndex][elementIndex] = this.generateForm(elementParams, type);
  }

  // Get element
  var element = this.elements[slideIndex][elementIndex];
  element.$wrapper = $wrapper;

  H5P.jQuery('<div/>', {
    'class': 'h5p-element-overlay'
  }).appendTo($wrapper);

  if (that.dnb) {
    that.addToDragNBar(element, elementParams);
  }

  // Open form dialog when double clicking element
  $wrapper.dblclick(function () {
    that.showElementForm(element, $wrapper, elementParams);
  });

  if (type === 'H5P.ContinuousText' && that.ct === undefined) {
    // Keep track of first CT element!
    that.ct = {
      element: element,
      params: elementParams
    };
  }

  if (elementParams.pasted) {
    if (type === 'H5P.ContinuousText') {
      H5P.ContinuousText.Engine.run(this);
    }

    delete elementParams.pasted;
  }

  if (elementInstance.onAdd) {
    // Some sort of callback event thing
    elementInstance.onAdd(elementParams, slideIndex);
  }
};

/**
 * Make sure element can be moved and stop moving while resizing.
 *
 * @param {Object} element
 * @param {Object} elementParams
 * @returns {H5P.NDLADragNBarElement}
 */
H5PEditor.NDLACoursePresentation.prototype.addToDragNBar = function (element, elementParams) {
  var self = this;

  var type = (elementParams.action ? elementParams.action.library.split(' ')[0] : null);

  const options = {
    disableResize: elementParams.displayAsButton,
    lock: (type === 'H5P.NDLAChart' && elementParams.action.params.graphMode === 'pieChart'),
    cornerLock: (type === 'H5P.Image' || type === 'H5P.NDLAShape')
  };

  if (type === 'H5P.NDLAShape') {
    options.minSize = 3;
    if (elementParams.action.params.type == 'vertical-line') {
      options.directionLock = "vertical";
    }
    else if (elementParams.action.params.type == 'horizontal-line') {
      options.directionLock = "horizontal";
    }
  }

  var clipboardData = H5P.NDLADragNBar.clipboardify(H5PEditor.NDLACoursePresentation.clipboardKey, elementParams, 'action');
  var dnbElement = self.dnb.add(element.$wrapper, clipboardData, options);

  dnbElement.contextMenu.on('contextMenuEdit', function () {
    self.showElementForm(element, element.$wrapper, elementParams);
  });
  element.$wrapper.find('*').attr('tabindex', '-1');

  dnbElement.contextMenu.on('contextMenuRemove', function () {
    if (!confirm(H5PEditor.t('H5PEditor.NDLACoursePresentation', 'confirmRemoveElement'))) {
      return;
    }
    if (H5PEditor.Html) {
      H5PEditor.Html.removeWysiwyg();
    }
    self.removeElement(element, element.$wrapper, (elementParams.action !== undefined && H5P.libraryFromString(elementParams.action.library).machineName === 'H5P.ContinuousText'));
    self.dnb.blurAll();
  });

  dnbElement.contextMenu.on('contextMenuBringToFront', function () {
    // Old index
    var oldZ = element.$wrapper.index();

    // Current slide index
    var slideIndex = self.cp.$current.index();

    // Update visuals
    element.$wrapper.appendTo(self.cp.$current);

    // Find slide params
    var slide = self.params.slides[slideIndex].elements;

    // Remove from old pos
    slide.splice(oldZ, 1);

    // Add to top
    slide.push(elementParams);

    // Re-order elements in the same fashion
    self.elements[slideIndex].splice(oldZ, 1);
    self.elements[slideIndex].push(element);

    self.cp.children[slideIndex].moveChild(oldZ, self.cp.children[slideIndex].children.length - 1);
  });

  dnbElement.contextMenu.on('contextMenuSendToBack', function () {
    // Old index
    var oldZ = element.$wrapper.index();

    // Current slide index
    var slideIndex = self.cp.$current.index();

    // Update visuals
    element.$wrapper.prependTo(self.cp.$current);

    // Find slide params
    var slide = self.params.slides[slideIndex].elements;

    // Remove from old pos
    slide.splice(oldZ, 1);

    // Add to top
    slide.unshift(elementParams);

    // Re-order elements in the same fashion
    self.elements[slideIndex].splice(oldZ, 1);
    self.elements[slideIndex].unshift(element);

    self.cp.children[slideIndex].moveChild(oldZ, 0);
  });

  return dnbElement;
};

/**
 * Removes element from slide.
 *
 * @param {Object} element
 * @param {jQuery} $wrapper
 * @param {Boolean} isContinuousText
 * @returns {undefined}
 */
H5PEditor.NDLACoursePresentation.prototype.removeElement = function (element, $wrapper, isContinuousText) {
  var slideIndex = this.cp.$current.index();
  var elementIndex = $wrapper.index();

  var elementInstance = this.cp.elementInstances[slideIndex][elementIndex];
  var removeForm = (element.children.length ? true : false);

  if (isContinuousText) {
    var CTs = this.getCTs(false, true);
    if (CTs.length === 2) {
      // Prevent removing form while there are still some CT elements left
      removeForm = false;

      if (element === CTs[0].element && CTs.length === 2) {
        CTs[1].params.action.params = CTs[0].params.action.params;
      }
    }
    else {
      delete this.params.ct;
      delete this.ct;
    }
  }

  if (removeForm) {
    H5PEditor.removeChildren(element.children);
  }

  // Completely remove element from CP
  if (elementInstance.onDelete) {
    elementInstance.onDelete(this.params, slideIndex, elementIndex);
  }
  this.elements[slideIndex].splice(elementIndex, 1);
  this.cp.elementInstances[slideIndex].splice(elementIndex, 1);
  this.params.slides[slideIndex].elements.splice(elementIndex, 1);
  this.cp.children[slideIndex].removeChild(elementIndex);

  $wrapper.remove();

  if (isContinuousText) {
    H5P.ContinuousText.Engine.run(this);
  }
};

/**
 * Displays the given form in a popup.
 *
 * @param {jQuery} $form
 * @param {jQuery} $wrapper
 * @param {object} element Params
 * @returns {undefined}
 */
H5PEditor.NDLACoursePresentation.prototype.showElementForm = function (element, $wrapper, elementParams) {
  // Determine element type
  var machineName;
  if (elementParams.action !== undefined) {
    machineName = H5P.libraryFromString(elementParams.action.library).machineName;
  }

  // Special case for Continuous Text
  var isContinuousText = (machineName === 'H5P.ContinuousText');
  if (isContinuousText && this.ct) {
    // Get CT text from storage
    this.ct.element.$form.find('.text .ckeditor').first().html(this.params.ct);
    this.ct.params.action.params.text = this.params.ct;
  }

  // Disable guided tour for IV
  if (machineName === 'H5P.InteractiveVideo') {
    // Recreate IV form, workaround for Youtube API not firing
    // onStateChange when IV is reopened.
    element = this.generateForm(elementParams, machineName);
  }

  /**
   * The user has clicked delete, remove the element.
   * @private
   */
  const handleFormremove = (e) => {
    e.preventRemove = !confirm(H5PEditor.t('H5PEditor.NDLACoursePresentation', 'confirmRemoveElement'));
    if (e.preventRemove) {
      return;
    }
    this.removeElement(element, $wrapper, isContinuousText);
    this.dnb.blurAll();
    this.dnb.preventPaste = false;
  };
  this.on('formremove', handleFormremove);

  /**
   * The user is done editing, save and update the display.
   * @private
   */
  const handleFormdone = () => {
    // Validate / save children
    for (var i = 0; i < element.children.length; i++) {
      element.children[i].validate();
    }

    if (isContinuousText) {
      // Store complete CT on slide 0
      this.params.ct = this.ct.params.action.params.text;

      // Split up text and place into CT elements
      H5P.ContinuousText.Engine.run(this);

      setTimeout(function () {
        // Put focus back on ct element
        this.dnb.focus($wrapper);
      }, 1);
    }
    else {
      // Wait until form is actually closed until calculating aspect ratio based on wrapper size
      window.requestAnimationFrame(() => {
        const defaultElementAspectRatio = this.getDefaultElementAspectRatio(machineName);
        const trueSlideAspectRatio = this.getTrueSlideAspectRatio();
        const elementHasDefaultSize = elementParams.width === this.defaultElementWidthOfContainerInPercent && elementParams.height === elementParams.width * trueSlideAspectRatio / defaultElementAspectRatio;

        const isImage = machineName === 'H5P.Image';
        if (elementHasDefaultSize && isImage) {
          const imageAspectRatio = elementParams.action.params.file && (elementParams.action.params.file.width / elementParams.action.params.file.height);
          if (imageAspectRatio) {
            elementParams.height = elementParams.width * (1 / imageAspectRatio) * trueSlideAspectRatio;
          }
        }
        if(isImage) {
          const containerStyle = window.getComputedStyle(this.dnb.$container[0]);
          const containerWidth = parseFloat(containerStyle.width);
          const containerHeight = parseFloat(containerStyle.height);
          const imageAspectRatio = elementParams.action.params.file && (elementParams.action.params.file.width / elementParams.action.params.file.height);
          if(imageAspectRatio){
            if(elementParams.action.params.file.width < containerWidth * this.defaultElementWidthOfContainerInPercent/100) {
              if(elementParams.width == this.defaultElementWidthOfContainerInPercent) {
                const initialImageWidthPercent = (elementParams.action.params.file.width / containerWidth) * 100;
                const initialImageHeightPercent = (elementParams.action.params.file.height / containerHeight) * 100;
                elementParams.width = initialImageWidthPercent;
                elementParams.height = initialImageHeightPercent;
              }
            }
          }
        }
        const isAdvancedText = machineName === 'H5P.AdvancedText';
        if(isAdvancedText) {
          if(elementParams.width == this.defaultElementWidthOfContainerInPercent) {
            const text = elementParams.action.params.text;
            if(text !== undefined) {
              const lengthText = text.length;
              const numberOfParagraphs = text.split('<p>').length - 1;
              const numberOfListElements = text.split('<li>').length - 1;
              const elementAspectRatio = this.getDefaultElementAspectRatio('H5P.AdvancedText');

              const shortTextLength = 150;
              const longTextLength = 300;

              if(numberOfParagraphs + numberOfListElements == 1 && lengthText < shortTextLength) {
                elementParams.width = this.defaultElementWidthOfContainerInPercent;
                elementParams.height = (elementParams.width * trueSlideAspectRatio / elementAspectRatio) / 4;
              }
              else if(numberOfParagraphs + numberOfListElements == 1 && lengthText >= shortTextLength && lengthText < longTextLength) {
                elementParams.width = this.defaultElementWidthOfContainerInPercent;
                elementParams.height = (elementParams.width * trueSlideAspectRatio / elementAspectRatio) / 2;
              }
              else if(numberOfParagraphs + numberOfListElements == 1 && lengthText >= longTextLength) {
                elementParams.width = this.defaultElementWidthOfContainerInPercent;
                elementParams.height = (elementParams.width * trueSlideAspectRatio / elementAspectRatio);
              }
              else if(numberOfParagraphs + numberOfListElements == 2 && lengthText < longTextLength ) {
                elementParams.width = this.defaultElementWidthOfContainerInPercent;
                elementParams.height = (elementParams.width * trueSlideAspectRatio / elementAspectRatio) / 2;
              }
              else if(numberOfParagraphs + numberOfListElements == 2 && lengthText >= longTextLength) {
                elementParams.width = this.defaultElementWidthOfContainerInPercent;
                elementParams.height = (elementParams.width * trueSlideAspectRatio / elementAspectRatio);
              }
              else if(numberOfParagraphs + numberOfListElements == 3 && lengthText < shortTextLength) {
                elementParams.width = this.defaultElementWidthOfContainerInPercent;
                elementParams.height = (elementParams.width * trueSlideAspectRatio / elementAspectRatio) / 2;
              }
              else if(numberOfParagraphs + numberOfListElements == 3 && lengthText >= shortTextLength) {
                elementParams.width = this.defaultElementWidthOfContainerInPercent;
                elementParams.height = (elementParams.width * trueSlideAspectRatio / elementAspectRatio);
              }
              else if(numberOfParagraphs + numberOfListElements > 3) {
                elementParams.width = this.defaultElementWidthOfContainerInPercent;
                elementParams.height = (elementParams.width * trueSlideAspectRatio / elementAspectRatio);
              }
            }
          }
        }
        this.redrawElement($wrapper, element, elementParams);
      });
    }

    this.dnb.preventPaste = false;
  }
  this.on('formdone', handleFormdone);

  /**
   * The form pane is fully displayed.
   * @private
   */
  const handleFormopened = (event) => {
    if (isLoaded) {
      focusFirstField();
    }
  }
  this.on('formopened', handleFormopened);

  /**
   * Remove event listeners on form close
   * @private
   */
  const handleFormclose = () => {
    this.off('formremove', handleFormremove);
    this.off('formdone', handleFormdone);
    this.off('formclose', handleFormclose);
    this.off('formopened', handleFormopened);
  };
  this.on('formclose', handleFormclose);

  const libraryField = H5PEditor.findField('action', element);

  /**
   * Focus the first field of the form.
   * Should be triggered when library is loaded + form is opened.
   *
   * @private
   */
  var focusFirstField = () => {
    // Find the first ckeditor or texteditor field that is not hidden.
    // h5p-editor dialog is copyright dialog
    // h5p-dialog-box is IVs video choose dialog
    H5P.jQuery('.ckeditor, .h5peditor-text', libraryField.$myField)
      .not(`
        .h5p-editor-dialog .ckeditor,
        .h5p-editor-dialog .h5peditor-text,
        .h5p-dialog-box .ckeditor,
        .h5p-dialog-box .h5peditor-text`
        ,libraryField.$myField)
      .eq(0)
      .focus();
  };

  // Determine if library is already loaded
  let isLoaded = false;
  if (libraryField.currentLibrary === undefined && libraryField.change !== undefined) {
    libraryField.change(() => {
      isLoaded = true;
      if (this.isFormOpen()) {
        focusFirstField();
      }
    });
  }
  else {
    isLoaded = true;
  }

  let customTitle, customIconId;
  if (elementParams.action === undefined) {
    customTitle = H5PEditor.t('H5PEditor.NDLACoursePresentation', 'goToSlide');
    customIconId = 'gotoslide';
  }

  // Open a new form pane with the element form
  this.openForm(libraryField, element.$form[0], null, customTitle, customIconId);

  // Deselect any elements
  if (this.dnb !== undefined) {
    this.dnb.preventPaste = true;
    setTimeout(() => {
      this.dnb.blurAll();
    }, 0);
  }
};

/**
* Redraw element.
*
* @param {jQuery} $wrapper Element container to be redrawn.
* @param {object} element Element data.
* @param {object} elementParams Element parameters.
* @param {number} [repeat] Counter for redrawing if necessary.
*/
H5PEditor.NDLACoursePresentation.prototype.redrawElement = function ($wrapper, element, elementParams, repeat) {
  const elementIndex = $wrapper.index();
  const slideIndex = this.cp.$current.index();
  const elementsParams = this.params.slides[slideIndex].elements;
  const elements = this.elements[slideIndex];
  const elementInstances = this.cp.elementInstances[slideIndex];

  // Determine how many elements still need redrawal after this one
  repeat = (typeof repeat === 'undefined') ? elements.length - 1 - elementIndex : repeat;

  const isPieChart = elementParams.action 
    && elementParams.action.library.split(' ')[0] === 'H5P.NDLAChart'
    && elementParams.action.params.graphMode === 'pieChart';
  if (isPieChart) {
    elementParams.width = elementParams.height / this.slideRatio;
  }

  // Remove Element instance from Slide
  this.cp.children[slideIndex].removeChild(elementIndex);

  // Remove instance of lib:
  elementInstances.splice(elementIndex, 1);

  // Update params
  elementsParams.splice(elementIndex, 1);
  elementsParams.push(elementParams);

  // Update elements
  elements.splice(elementIndex, 1);
  elements.push(element);

  // Update visuals
  $wrapper.remove();
  let instance = this.cp.children[slideIndex].addChild(elementParams).instance;
  const $element = this.cp.attachElement(elementParams, instance, this.cp.$current, slideIndex);

  // Make sure we're inside the container
  this.fitElement($element, elementParams);

  // Resize element.
  instance = elementInstances[elementInstances.length - 1];
  if ((instance.preventResize === undefined || instance.preventResize === false) && instance.$ !== undefined && !elementParams.displayAsButton) {
    H5P.trigger(instance, 'resize');
  }

  if (repeat === elements.length - 1 - elementIndex) {
    setTimeout(() => {
      // Put focus back on element
      this.dnb.focus($element);
    }, 1);
  }

  /*
   * Reset to previous element order, otherwise the initially redrawn element
   * would be put on top instead of remaining at the original z position.
   */
  if (repeat > 0) {
    repeat--;
    this.redrawElement(elements[elementIndex].$wrapper, elements[elementIndex], elementsParams[elementIndex], repeat);
  }
};

/**
 * Applies the updated position and size properties to the given element.
 *
 * All properties are converted to percentage.
 *
 * @param {H5P.jQuery} $element
 * @param {Object} elementParams
 */
H5PEditor.NDLACoursePresentation.prototype.fitElement = function ($element, elementParams) {
  const sizeNPosition = this.dnb.getElementSizeNPosition($element);
  const updated = H5P.NDLADragNBar.fitElementInside(sizeNPosition);

  const pW = (sizeNPosition.containerWidth / 100);
  const pH = (sizeNPosition.containerHeight / 100);

  // Set the updated properties
  const style = {};

  if (updated.width !== undefined) {
    elementParams.width = updated.width / pW;
    style.width = elementParams.width + '%';
  }
  if (updated.left !== undefined) {
    elementParams.x = updated.left / pW;
    style.left = elementParams.x + '%';
  }
  if (updated.height !== undefined) {
    elementParams.height = updated.height / pH;
    style.height = elementParams.height + '%';
  }
  if (updated.top !== undefined) {
    elementParams.y = updated.top / pH;
    style.top = elementParams.y + '%';
  }

  // Apply style
  $element.css(style);
};

/**
* Find ContinuousText elements.
*
* @param {Boolean} [firstOnly] Return first element only
* @param {Boolean} [maxTwo] Return after two elements have been found
* @returns {{Object[]|Object}}
*/
H5PEditor.NDLACoursePresentation.prototype.getCTs = function (firstOnly, maxTwo) {
  var self = this;

  var CTs = [];

  for (var i = 0; i < self.elements.length; i++) {
    var slideElements = self.elements[i];
    if (!self.params.slides[i] || !self.params.slides[i].elements) {
      continue;
    }

    for (var j = 0; slideElements !== undefined && j < slideElements.length; j++) {
      var element = slideElements[j];
      var params = self.params.slides[i].elements[j];
      if (params.action !== undefined && params.action.library.split(' ')[0] === 'H5P.ContinuousText') {
        CTs.push({
          element: element,
          params: params
        });

        if (firstOnly) {
          return CTs[0];
        }
        if (maxTwo && CTs.length === 2) {
          return CTs;
        }
      }
    }
  }

  return firstOnly ? null : CTs;
};

/**
 * Collect functions to execute once the tree is complete.
 *
 * @param {function} ready
 * @returns {undefined}
 */
H5PEditor.NDLACoursePresentation.prototype.ready = function (ready) {
  if (this.passReadies) {
    this.parent.ready(ready);
  }
  else {
    this.readies.push(ready);
  }
};

/**
 * Look for field with the given name in the given collection.
 *
 * @param {String} name of field
 * @param {Array} fields collection to look in
 * @returns {Object} field object
 */
H5PEditor.NDLACoursePresentation.findField = function (name, fields) {
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].name === name) {
      return fields[i];
    }
  }
};

/** @constant {Number} */
H5PEditor.NDLACoursePresentation.RATIO_SURFACE = 16 / 9;

// Tell the editor what widget we are.
window.H5PEditor.widgets.coursepresentation = H5PEditor.NDLACoursePresentation;
