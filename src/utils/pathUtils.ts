// src/utils/pathUtils.ts

/**
 * Resolves a relative path against a base path
 */
export const resolveRelativePath = (basePath: string, relativePath: string): string => {
  // Handle ./ at the beginning (current directory)
  if (relativePath.startsWith('./')) {
    return basePath + relativePath.substring(2);
  }
  
  // Handle ../ (parent directory)
  if (relativePath.startsWith('../')) {
    // Remove the last directory from basePath
    const basePathParts = basePath.split('/');
    basePathParts.pop(); // Remove the last empty string (from trailing slash)
    basePathParts.pop(); // Remove the last directory
    const newBasePath = basePathParts.join('/') + '/';
    
    // Remove the ../ from the relative path
    const newRelativePath = relativePath.substring(3);
    
    // If there are more ../, resolve recursively
    if (newRelativePath.startsWith('../')) {
      return resolveRelativePath(newBasePath, newRelativePath);
    }
    
    return newBasePath + newRelativePath;
  }
  
  // If it doesn't start with ./ or ../, just append to the base path
  return basePath + relativePath;
};

/**
 * Extracts the directory path from a file path
 */
export const getDirectoryPath = (filePath: string): string => {
  return filePath.substring(0, filePath.lastIndexOf('/') + 1);
};

/**
 * Extracts the file name from a file path
 */
export const getFileName = (filePath: string): string => {
  return filePath.substring(filePath.lastIndexOf('/') + 1);
};
