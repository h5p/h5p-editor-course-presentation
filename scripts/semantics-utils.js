// @ts-check

/**
 * Show and hide fields based on the `displayAsButton` setting
 *
 * @param {jQuery} element
 * @param {jQuery} $
 */
export function alterDisplayAsButton(element, $) {
  const $displayAsButtonFields = element.$form.find(
    ".field-name-displayAsButton"
  );

  // Show or hide button size dropdown depending on display as button checkbox
  $displayAsButtonFields.each(function () {
    // TODO: Use showWhen in semantics.json instead…
    const $displayAsButtonField = $(this);
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

    $displayAsButtonCheckbox.change(function (e) {
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
  });
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
