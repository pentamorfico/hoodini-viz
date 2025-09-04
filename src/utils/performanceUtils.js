// Performance optimization utilities for hoodini-viz

/**
 * Batch process large arrays to prevent blocking the main thread
 * @param {Array} items - Items to process
 * @param {Function} processor - Function to process each item
 * @param {number} batchSize - Number of items to process per batch
 * @param {Function} onProgress - Optional progress callback
 */
export function batchProcess(items, processor, batchSize = 1000, onProgress = null) {
  return new Promise((resolve) => {
    let currentIndex = 0;
    const results = [];
    
    function processBatch() {
      const endIndex = Math.min(currentIndex + batchSize, items.length);
      
      for (let i = currentIndex; i < endIndex; i++) {
        results.push(processor(items[i], i));
      }
      
      currentIndex = endIndex;
      
      if (onProgress) {
        onProgress(currentIndex, items.length);
      }
      
      if (currentIndex < items.length) {
        // Continue processing in next frame
        requestAnimationFrame(processBatch);
      } else {
        resolve(results);
      }
    }
    
    processBatch();
  });
}

/**
 * Debounce function calls to prevent excessive execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Maximum executions per limit period
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Create a reverse index from an array of objects
 * @param {Array} items - Array of items to index
 * @param {string|Function} keyFunc - Key function or property name
 */
export function createReverseIndex(items, keyFunc) {
  const index = {};
  const getKey = typeof keyFunc === 'string' 
    ? (item) => item[keyFunc]
    : keyFunc;
    
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = getKey(item, i);
    
    if (key != null) {
      if (!index[key]) {
        index[key] = [];
      }
      index[key].push(item);
    }
  }
  
  return index;
}

/**
 * Measure performance of a function
 * @param {Function} func - Function to measure
 * @param {string} label - Label for the measurement
 */
export function measurePerformance(func, label) {
  return function(...args) {
    const startTime = performance.now();
    const result = func.apply(this, args);
    const endTime = performance.now();
    return result;
  };
}

/**
 * Memory-efficient object iteration for large datasets
 * @param {Object} obj - Object to iterate
 * @param {Function} callback - Callback function (value, key, index)
 * @param {number} batchSize - Items per batch
 */
export function forEachLarge(obj, callback, batchSize = 5000) {
  return new Promise((resolve) => {
    const keys = Object.keys(obj);
    let currentIndex = 0;
    
    function processBatch() {
      const endIndex = Math.min(currentIndex + batchSize, keys.length);
      
      for (let i = currentIndex; i < endIndex; i++) {
        const key = keys[i];
        callback(obj[key], key, i);
      }
      
      currentIndex = endIndex;
      
      if (currentIndex < keys.length) {
        requestAnimationFrame(processBatch);
      } else {
        resolve();
      }
    }
    
    processBatch();
  });
}

/**
 * Check if React DevTools is affecting performance
 */
export function checkDevToolsPerformance() {
  if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.warn('⚠️  React DevTools detected - may cause performance delays');
    return true;
  }
  return false;
}

/**
 * Performance monitoring wrapper for effects
 * @param {Function} effect - Effect function
 * @param {string} name - Effect name for logging
 */
export function monitoredEffect(effect, name) {
  return (...args) => {
    const startTime = performance.now();
    
    const result = effect(...args);
    
    // Handle both sync and async effects
    if (result && typeof result.then === 'function') {
      return result.then(res => {
        const endTime = performance.now();
        return res;
      });
    } else {
      const endTime = performance.now();
      return result;
    }
  };
}
