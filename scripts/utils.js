// @ts-check

import { preloadedDependencies } from "../library.json";

/**
 * Parse `library.json` to find version number of given dependency
 *
 * @param {string} libraryName
 * @return {string}
 */
export function getLibraryDependencyVersion(libraryName) {
  const dependency = preloadedDependencies.find(
    (dependency) => dependency.machineName === libraryName
  );

  if (!dependency) {
    return;
  }

  return `${dependency.majorVersion}.${dependency.minorVersion}`;
}
