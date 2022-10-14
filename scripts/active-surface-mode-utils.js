// @ts-check
import { hotspotParams, t } from "./utils";

export const ASM_TASK_BUTTONS_ID = "task-buttons";

export function createActiveSurfaceModeAnswerButtons() {
  return {
    dropdown: {
      id: ASM_TASK_BUTTONS_ID,
    },
    buttons: [
      createTransparentHotspotButton("yes-button", "true"),
      createTransparentHotspotButton("no-button", "false"),
      createGoToSummaryPageHotspotButton(),
    ],
  };
}

/**
 * @param {string} id
 * @param {"true" | "false"} answerType
 */
function createTransparentHotspotButton(id, answerType) {
  return {
    id,
    title: t(`answerHotspot${capitalize(answerType)}`),
    params: {
      ...hotspotParams,
      answerType,
      goToSlideType: "none",
    },
  };
}

function createGoToSummaryPageHotspotButton() {
  return {
    id: "summary-page-button",
    title: t("goToSummarySlide"),
    params: {
      ...hotspotParams,
      goToSlideType: "go-to-summary-slide",
    },
  };
}

/**
 * Make the first letter in a string uppercase
 * 
 * @param {string} word 
 * @returns {string}
 */
function capitalizeWord(word) {
  return [word[0].toUpperCase(), word.substring(1)].join("");
}

/**
 * Make the first letter in every word uppercase
 * 
 * @param {string} str 
 * @returns {string}
 */
function capitalize(str) {  
  return str
    .split(" ")
    .map(word => capitalizeWord(word))
    .join(" ");
}
