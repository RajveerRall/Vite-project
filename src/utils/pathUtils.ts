// src/utils/pathUtils.ts

/**
 * Resolves a relative path against a base path
 * Returns paths relative to EPUB root (no leading slash), as JSZip expects
 */
export const resolveRelativePath = (basePath: string, relativePath: string): string => {
  // Handle absolute paths (starting with /) - treat as root-relative, remove leading slash
  if (relativePath.startsWith('/')) {
    return relativePath.substring(1);
  }
  
  // Handle ./ at the beginning (current directory)
  if (relativePath.startsWith('./')) {
    const result = basePath + relativePath.substring(2);
    // Normalize: remove leading slash if present (JSZip doesn't handle leading slashes)
    return result.startsWith('/') ? result.substring(1) : result;
  }
  
  // Handle ../ (parent directory)
  if (relativePath.startsWith('../')) {
    // Remove the last directory from basePath
    const basePathParts = basePath.split('/').filter(p => p !== ''); // Filter out empty strings
    basePathParts.pop(); // Remove the last directory
    
    // If we've gone past root, return empty base path
    const newBasePath = basePathParts.length > 0 ? basePathParts.join('/') + '/' : '';
    
    // Remove the ../ from the relative path
    const newRelativePath = relativePath.substring(3);
    
    // If there are more ../, resolve recursively
    if (newRelativePath.startsWith('../')) {
      return resolveRelativePath(newBasePath, newRelativePath);
    }
    
    const result = newBasePath + newRelativePath;
    // Normalize: remove leading slash if present (JSZip doesn't handle leading slashes)
    return result.startsWith('/') ? result.substring(1) : result;
  }
  
  // If it doesn't start with ./ or ../, just append to the base path
  const result = basePath + relativePath;
  // Normalize: remove leading slash if present (JSZip doesn't handle leading slashes)
  return result.startsWith('/') ? result.substring(1) : result;
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
