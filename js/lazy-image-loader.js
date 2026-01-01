/**
 * Lazy Image Loading Utility
 * Implements intersection observer-based lazy loading for images
 */

const LazyImageLoader = {
    observer: null,
    observedImages: new Set(),

    /**
     * Initialize lazy image loading
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        const {
            rootMargin = '50px',
            threshold = 0.01,
            loadingClass = 'lazy-loading',
            loadedClass = 'lazy-loaded',
            errorClass = 'lazy-error'
        } = options;

        this.config = {
            rootMargin,
            threshold,
            loadingClass,
            loadedClass,
            errorClass
        };

        // Check for Intersection Observer support
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported, loading all images immediately');
            this.loadAllImages();
            return;
        }

        // Create intersection observer
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                rootMargin: this.config.rootMargin,
                threshold: this.config.threshold
            }
        );

        // Observe all lazy images
        this.observeImages();

        // Re-observe when DOM changes
        this.setupMutationObserver();
    },

    /**
     * Handle intersection events
     * @private
     */
    handleIntersection(entries) {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this.loadImage(img);
                this.observer.unobserve(img);
                this.observedImages.delete(img);
            }
        });
    },

    /**
     * Load an image
     * @private
     */
    loadImage(img) {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;

        if (!src) {
            return;
        }

        img.classList.add(this.config.loadingClass);

        // Create a temporary image to test loading
        const tempImg = new Image();
        
        tempImg.onload = () => {
            img.src = src;
            if (srcset) {
                img.srcset = srcset;
            }
            img.classList.remove(this.config.loadingClass);
            img.classList.add(this.config.loadedClass);
            
            // Remove data attributes
            delete img.dataset.src;
            delete img.dataset.srcset;
        };

        tempImg.onerror = () => {
            img.classList.remove(this.config.loadingClass);
            img.classList.add(this.config.errorClass);
            console.error(`Failed to load image: ${src}`);
        };

        tempImg.src = src;
    },

    /**
     * Observe all lazy images in the document
     */
    observeImages() {
        const images = document.querySelectorAll('img[data-src], img[loading="lazy"]');
        
        images.forEach((img) => {
            // Handle native lazy loading fallback
            if (img.loading === 'lazy' && !img.dataset.src) {
                return; // Let native lazy loading handle it
            }

            if (!this.observedImages.has(img)) {
                this.observer.observe(img);
                this.observedImages.add(img);
            }
        });
    },

    /**
     * Setup mutation observer to watch for new images
     * @private
     */
    setupMutationObserver() {
        const mutationObserver = new MutationObserver((mutations) => {
            let shouldObserve = false;
            
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'IMG' && (node.dataset.src || node.loading === 'lazy')) {
                                shouldObserve = true;
                            } else if (node.querySelectorAll) {
                                const images = node.querySelectorAll('img[data-src], img[loading="lazy"]');
                                if (images.length > 0) {
                                    shouldObserve = true;
                                }
                            }
                        }
                    });
                }
            });

            if (shouldObserve) {
                this.observeImages();
            }
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    /**
     * Load all images immediately (fallback for browsers without IntersectionObserver)
     * @private
     */
    loadAllImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach((img) => {
            const src = img.dataset.src;
            const srcset = img.dataset.srcset;
            
            if (src) {
                img.src = src;
            }
            if (srcset) {
                img.srcset = srcset;
            }
            
            delete img.dataset.src;
            delete img.dataset.srcset;
        });
    },

    /**
     * Manually trigger loading of a specific image
     * @param {HTMLImageElement} img
     */
    load(img) {
        if (this.observer) {
            this.observer.unobserve(img);
            this.observedImages.delete(img);
        }
        this.loadImage(img);
    },

    /**
     * Add an image to be lazy loaded
     * @param {HTMLImageElement} img
     */
    observe(img) {
        if (!this.observer) {
            this.loadImage(img);
            return;
        }

        if (!this.observedImages.has(img)) {
            this.observer.observe(img);
            this.observedImages.add(img);
        }
    },

    /**
     * Stop observing an image
     * @param {HTMLImageElement} img
     */
    unobserve(img) {
        if (this.observer) {
            this.observer.unobserve(img);
            this.observedImages.delete(img);
        }
    },

    /**
     * Disconnect the observer and cleanup
     */
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observedImages.clear();
        }
    }
};

// Initialize lazy image loading when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LazyImageLoader.init());
} else {
    LazyImageLoader.init();
}

// Make it globally available
window.LazyImageLoader = LazyImageLoader;
