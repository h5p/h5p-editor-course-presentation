// @ts-check

/** @typedef {any} jQuery */

/**
 * Show and hide fields based on the `displayAsButton` setting
 *
 * @param {jQuery} element
 * @param {jQuery} $
 */
export function alterDisplayAsButtonSemantics(element, $) {
  const $displayAsButtonFields = element.$form.find(
    ".field-name-displayAsButton"
  );

  // Show or hide button size dropdown depending on display as button checkbox
  $displayAsButtonFields.each(
    /**
     * @param {number} index
     * @param {HTMLElement} element
     */
    (index, element) => {
      // TODO: Use showWhen in semantics.json instead…
      const $displayAsButtonField = $(element);
      const $displayAsButtonCheckbox = $displayAsButtonField.find("input");
      const $parent = $displayAsButtonField.parent();

      const buttonSizeField = $parent.find(".field-name-buttonSize");
      const buttonUseIconField = $parent.find(".field-name-useButtonIcon");
      const buttonColorField = $parent.find(".field-name-buttonColor");
      const buttonIconSelectField = $parent.find(".field-name-buttonIcon");

      const displayElementAsButton = $displayAsButtonCheckbox[0].checked;
      if (!displayElementAsButton) {
        hideFields(
          buttonSizeField,
          buttonUseIconField,
          buttonColorField,
          buttonIconSelectField
        );
      }

      $displayAsButtonCheckbox.change((e) => {
        const checkbox = e.target;
        if (checkbox.checked) {
          showFields(buttonSizeField, buttonUseIconField, buttonColorField);

          if (buttonUseIconField.find("input")[0].checked) {
            showFields(buttonIconSelectField);
          }
        } else {
          hideFields(
            buttonSizeField,
            buttonUseIconField,
            buttonColorField,
            buttonIconSelectField
          );
        }
      });
    }
  );
}

export function alterDisplayAsHotspotSemantics(element, $) {
  const $hotspotButtonFields = element.$form.find(".field-name-showAsHotspot");

  $hotspotButtonFields.each((index, element) => {
    const $hotspotButtonField = $(element);
    const $parent = $hotspotButtonField.parent();

    const $displayAsButtonField = $parent.find(".field-name-displayAsButton");
    const $displayAsHotspotCheckbox = $hotspotButtonField.find("input");

    const displayElementAsHotspot =
      $displayAsHotspotCheckbox.get(0) &&
      $displayAsHotspotCheckbox.get(0).checked;
    
    hideFields($hotspotButtonField);
    
    if (displayElementAsHotspot) {
      hideFields($displayAsButtonField);
    }

    $displayAsHotspotCheckbox.change((e) => {
      const checkbox = e.target;
      if (checkbox.checked) {
        hideFields($displayAsButtonField);
      } else {
        showFields($displayAsButtonField);
      }
    });
  });
}

/**
 * @param {*} element
 * @param {jQuery} $
 */
export function alterHotspotGotoSemantics(element, $) {
  const $hotspotButtonFields = element.$form.find(".field-name-showAsHotspot");

  $hotspotButtonFields.each((index, elm) => {
    const $hotspotButtonField = $(elm);
    const $parent = $hotspotButtonField.parent();

    const $hotspotTypeSelect = $parent.find(".field-name-goToSlideType");
    const currentType =
      ($hotspotTypeSelect.get(0) && $hotspotTypeSelect.get(0).value) ||
      $hotspotTypeSelect.find("[selected]").attr("value");

    if (!currentType) {
      return;
    }

    window.requestAnimationFrame(() => {
      updateHotspotConnectedFields(currentType, $parent);
    });

    $hotspotTypeSelect.change((event) => {
      const currentType = event.target.value;

      updateHotspotConnectedFields(currentType, $parent);
    });
  });

  /**
   * @param {"specified" | "next" | "previous" | "information-dialog"} hotspotType
   * @param {jQuery} $parent
   */
  function updateHotspotConnectedFields(hotspotType, $parent) {
    const findField = (/** @type {string} */ name) => $parent.find(`.field-name-${name}`);
    
    const $specificSlideInput = findField("goToSlide");
    const $dialogAudioInput = findField("dialogAudio");
    const $dialogHeaderTypeGroup = $parent.find(
      ".h5p-radio-selector-dialogHeaderContent"
    );
    const $dialogContentInput = findField("dialogContent");

    const hotspotConnectedFields = [
      $specificSlideInput,
      $dialogContentInput,
      $dialogAudioInput,
      $dialogHeaderTypeGroup,
    ];

    showFields(...hotspotConnectedFields);

    const isGoToSpecifiedSlide = hotspotType === "specified";
    if (!isGoToSpecifiedSlide) {
      hideFields($specificSlideInput);
    }

    const isDialogWindow = hotspotType === "information-dialog";
    if (!isDialogWindow) {
      hideFields(
        $dialogAudioInput,
        $dialogContentInput,
        $dialogHeaderTypeGroup
      );
    }
  }
}

/**
 * Show fields by removing a `hidden` class
 *
 * @param  {...jQuery} fields
 */
function showFields(...fields) {
  const hiddenClass = "h5p-hidden2";
  fields.forEach((field) => field.removeClass(hiddenClass));
}

/**
 * Hide fields by adding a `hidden` class
 *
 * @param  {...jQuery} fields
 */
function hideFields(...fields) {
  const hiddenClass = "h5p-hidden2";
  fields.forEach((field) => field.addClass(hiddenClass));
}
