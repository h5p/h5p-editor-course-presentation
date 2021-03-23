// @ts-check

import libraryJson from '../library.json';

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
