import { t } from './utils';

export default (function () {
  /**
   * Used for IDEs that can format html template strings.
   * `String.raw` doesn't actually do anything.
   */
  const html = String.raw;

  /** 
   * @typedef {object} Ratio
   * @property {string} ratio The ratio on the format 'width-height' (e.g. '4-3' for 4:3)
   * @property {string} label The illustration's label (e.g. "portrait", "landscape")
   */

  /** 
   * @typedef {object} RatioView
   * @property {string} ratio The ratio on the format 'width-height' (e.g. '4-3' for 4:3)
   * @property {string} label The illustration's label (e.g. "portrait", "landscape")
   */

  /**
   * 
   */
  class AspectRatioSelector {
    /**
     * 
     * @param {Ratio[]} ratios
     * @param {(ratio: RatioView) => void} onSubmit
     */
    constructor(ratios, onSubmit) {
      this.availableRatios = ratios.map(ratio => this.ratioToRatioView(ratio));
      this.selectedRatio = this.availableRatios[0];
      this.modal = this.createAspectRatioModal();
      this.onSubmit = onSubmit;
    }

    /**
     * Removes the modal from the DOM, deletes it from memory, then creates a new one
     */
    reset() {
      if (this.modal) {
        this.modal.parentElement.removeChild(this.modal);
        delete this.modal;
      }

      this.selectedRatio = this.availableRatios[0];
      this.modal = this.createAspectRatioModal();
    }

    /**
     * Convert a Ratio object into a RatioView
     * 
     * @param {Ratio} ratio 
     * @return {RatioView}
     */
    ratioToRatioView(ratio) {
      const [widthStr, heightStr] = ratio.ratio.split('-');

      const width = Number.parseInt(widthStr, 10);
      const height = Number.parseInt(heightStr, 10);

      const malformedAspectRatio = Number.isNaN(width) || Number.isNaN(height) || width <= 0 || height <= 0;
      if (malformedAspectRatio) {
        // TODO: Should we throw an error instead of only logging it out?
        console.error(`The ratio '${ratio.ratio}' is malformed. The ratio should be on the format 'width-height'.`)
      }

      return {
        ratio: ratio.ratio,
        illustration: this.createRatioIllustration(width, height, ratio.label),
      };
    }

    /**
     * @param {number} width The width part of the ratio equation. This is relative to the height, not absolute.
     * @param {number} height The height part of the ratio equation. This is relative to the width, not absolute.
     * @param {string} label The illustration's label (e.g. "portrait", "landscape")
     * @return {string} The generated element as an HTML string
     */
    createRatioIllustration(width, height, label) {
      return html `
      <div class="aspect-ratio-modal-illustration-container">
        <div class="aspect-ratio-modal-illustration" style="padding-top: ${(height / width) * 100}%">
          <span class="aspect-ratio-modal-illustration-label">${label}</span>
        </div>
      </div>`;
    }

    /**
     * 
     * @param {RatioView} ratioObj
     * @param {boolean} isChecked
     * @param {number} index
     */
    createRatioButton(ratioObj, isChecked, index) {
      const container = document.createElement('div');
      container.className = 'aspect-ratio-modal-ratio-radio-container';

      const radioId = `aspect-ratio-modal-ratio-${index}`;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.addEventListener('change', () => this.setRatio(ratioObj));
      radio.checked = isChecked;
      radio.className = 'aspect-ratio-modal-ratio-radio';
      radio.name = 'aspect-ratio-modal-ratio';
      radio.id = radioId;
      container.appendChild(radio);

      const label = document.createElement('label');
      label.innerHTML = ratioObj.illustration;
      label.className = 'aspect-ratio-modal-ratio';
      label.setAttribute('for', radioId);
      container.appendChild(label);

      return container;
    }

    /**
     * 
     * @param {RatioView} newRatio 
     */
    setRatio(newRatio) {
      this.selectedRatio = newRatio;
    }

    /**
     * Creates an aspect ratio modal.
     * The modal includes button to set the aspect ratio to either 4/3 or 3/4.
     * 
     * @return {HTMLDivElement}
     */
    createAspectRatioModal() {
      const container = document.createElement('div');
      container.className = 'aspect-ratio-modal-container';

      const modal = document.createElement('section');
      modal.className = 'aspect-ratio-modal';

      const modalHeader = document.createElement('header');
      modalHeader.className = 'aspect-ratio-modal-header';

      const heading = document.createElement('h1');
      heading.className = 'aspect-ratio-modal-title';
      heading.textContent = t('aspectRatioTitle');

      const subHeading = document.createElement('p');
      subHeading.setAttribute('role', 'doc-subtitle');
      subHeading.className = 'aspect-ratio-modal-subtitle';
      subHeading.textContent = t('aspectRatioSubtitle');

      modalHeader.appendChild(heading);
      modalHeader.appendChild(subHeading);
      modal.appendChild(modalHeader);

      const ratioContainer = document.createElement('div');
      ratioContainer.className = 'aspect-ratio-modal-ratios';

      this.availableRatios
        .map((ratio, index) => this.createRatioButton(ratio, index === 0, index))
        .map((button) => ratioContainer.appendChild(button));

      modal.appendChild(ratioContainer);

      const modalFooter = document.createElement('footer');
      modalFooter.className = 'aspect-ratio-modal-footer';

      const submitButton = document.createElement('button');
      submitButton.type = 'button';
      submitButton.className = 'aspect-ratio-submit-button';
      submitButton.addEventListener('click', () => this.onSubmitClick());
      submitButton.textContent = t('aspectRatioSubmit');

      modalFooter.appendChild(submitButton);
      modal.appendChild(modalFooter);

      container.appendChild(modal);

      return container;
    }

    /**
     * Adds the modal to the DOM
     */
    show() {
      // TODO: Set the course presentation as the container instead? That is not necessary if the cp is _always_ wrapped inside an iframe
      document.body.appendChild(this.modal);
    }

    hide() {
      this.reset();
    }

    /**
     * Runs the onSubmit function, then removes the modal
     */
    onSubmitClick() {
      this.onSubmit(this.selectedRatio);
      this.hide();
    }
  }

  return AspectRatioSelector;
})();