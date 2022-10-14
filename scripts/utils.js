// @ts-check

import libraryJson from "../library.json";

export const hotspotParams = {
  type: "rectangle",
  showAsHotspot: true,
  title: "",
  shape: {
    borderStyle: "none",
    fillColor: "transparent",
  },
};

/**
 * Parse `library.json` to find version number of given dependency
 *
 * @param {string} libraryName
 * @return {string}
 */
export function getLibraryDependencyVersion(libraryName) {
  const dependency = libraryJson.preloadedDependencies.find(
    (dependency) => dependency.machineName === libraryName
  );

  if (!dependency) {
    return;
  }

  return `${dependency.majorVersion}.${dependency.minorVersion}`;
}

/**
 * Translate text strings.
 * 
 * @see https://github.com/boyum/h5p-types/blob/v1.1.0/src/types/H5PEditorObject.ts#L34
 *
 * @param {string} translationKey Translation string identifier.
 * @param {Record<`:${string}`, string>} [vars] Placeholders and values to replace in the text.
 *
 * @returns Translated string, or a default text if the translation is missing.
 */
  export function t(translationKey, vars) {
  // @ts-expect-error H5PEditor is globally available
  return H5PEditor.t('H5PEditor.NDLAInteractiveBoard', translationKey, vars);
}