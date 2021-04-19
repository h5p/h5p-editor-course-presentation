// @ts-check
import { hotspotParams } from "./utils";

export const ASM_TASK_BUTTONS_ID = "task-buttons";

export function createActiveSurfaceModeAnswerButtons() {
  return {
    dropdown: {
      id: ASM_TASK_BUTTONS_ID,
    },
    buttons: [
      createTransparentHotspotButton("yes-button", "true"),
      createTransparentHotspotButton("no-button", "false"),
    ],
  };
}

/**
 *
 * @param {string} id
 * @param {"true" | "false" | "none"} answerType
 */
function createTransparentHotspotButton(id, answerType) {
  return {
    id,
    params: {
      ...hotspotParams,
      answerType,
    },
  };
}
