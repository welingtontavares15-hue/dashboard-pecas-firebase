/**
 * Performance Monitoring Utilities
 * Tracks Web Vitals and application performance metrics
 */

const PerformanceMonitor = {
    metrics: {},
    observers: [],

    /**
     * Initialize performance monitoring
     */
    init() {
        this.trackWebVitals();
        this.trackNavigationTiming();
        this.trackResourceTiming();
        this.setupPerformanceObserver();
    },

    /**
     * Track Core Web Vitals
     */
    trackWebVitals() {
        // Track Largest Contentful Paint (LCP)
        this.observeLCP();
        
        // Track First Input Delay (FID)
        this.observeFID();
        
        // Track Cumulative Layout Shift (CLS)
        this.observeCLS();
        
        // Track First Contentful Paint (FCP)
        this.observeFCP();
        
        // Track Time to First Byte (TTFB)
        this.observeTTFB();
    },

    /**
     * Observe Largest Contentful Paint
     */
    observeLCP() {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
                this.logMetric('LCP', this.metrics.lcp);
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('LCP observation not supported:', e);
        }
    },

    /**
     * Observe First Input Delay
     */
    observeFID() {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    this.metrics.fid = entry.processingStart - entry.startTime;
                    this.logMetric('FID', this.metrics.fid);
                });
            });
            observer.observe({ entryTypes: ['first-input'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('FID observation not supported:', e);
        }
    },

    /**
     * Observe Cumulative Layout Shift
     */
    observeCLS() {
        try {
            let clsValue = 0;
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        this.metrics.cls = clsValue;
                    }
                }
                this.logMetric('CLS', this.metrics.cls);
            });
            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('CLS observation not supported:', e);
        }
    },

    /**
     * Observe First Contentful Paint
     */
    observeFCP() {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.name === 'first-contentful-paint') {
                        this.metrics.fcp = entry.startTime;
                        this.logMetric('FCP', this.metrics.fcp);
                    }
                });
            });
            observer.observe({ entryTypes: ['paint'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('FCP observation not supported:', e);
        }
    },

    /**
     * Observe Time to First Byte
     */
    observeTTFB() {
        try {
            const navEntry = performance.getEntriesByType('navigation')[0];
            if (navEntry) {
                this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
                this.logMetric('TTFB', this.metrics.ttfb);
            }
        } catch (e) {
            console.warn('TTFB observation not supported:', e);
        }
    },

    /**
     * Track navigation timing
     */
    trackNavigationTiming() {
        if (!window.performance || !window.performance.timing) {
            return;
        }

        window.addEventListener('load', () => {
            setTimeout(() => {
                const timing = performance.timing;
                const navigationStart = timing.navigationStart;

                this.metrics.pageLoadTime = timing.loadEventEnd - navigationStart;
                this.metrics.domReadyTime = timing.domContentLoadedEventEnd - navigationStart;
                this.metrics.dnsLookupTime = timing.domainLookupEnd - timing.domainLookupStart;
                this.metrics.tcpConnectTime = timing.connectEnd - timing.connectStart;
                this.metrics.serverResponseTime = timing.responseEnd - timing.requestStart;
                this.metrics.domParseTime = timing.domInteractive - timing.domLoading;

                this.logMetric('Page Load Time', this.metrics.pageLoadTime);
                this.logMetric('DOM Ready Time', this.metrics.domReadyTime);
            }, 0);
        });
    },

    /**
     * Track resource timing
     */
    trackResourceTiming() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const resources = performance.getEntriesByType('resource');
                
                const resourceMetrics = {
                    totalResources: resources.length,
                    scripts: resources.filter(r => r.initiatorType === 'script').length,
                    stylesheets: resources.filter(r => r.initiatorType === 'link').length,
                    images: resources.filter(r => r.initiatorType === 'img').length,
                    totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
                    avgDuration: resources.reduce((sum, r) => sum + r.duration, 0) / resources.length
                };

                this.metrics.resources = resourceMetrics;
                this.logResourceMetrics(resourceMetrics);
            }, 1000);
        });
    },

    /**
     * Setup generic performance observer
     */
    setupPerformanceObserver() {
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'measure') {
                        this.logMetric(`Custom: ${entry.name}`, entry.duration);
                    }
                });
            });
            observer.observe({ entryTypes: ['measure'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('Performance observer not supported:', e);
        }
    },

    /**
     * Mark a performance timestamp
     * @param {string} name - Name of the mark
     */
    mark(name) {
        try {
            performance.mark(name);
        } catch (e) {
            console.warn('Performance mark not supported:', e);
        }
    },

    /**
     * Measure time between two marks
     * @param {string} name - Name of the measure
     * @param {string} startMark - Start mark name
     * @param {string} endMark - End mark name (optional, uses current time if not provided)
     */
    measure(name, startMark, endMark) {
        try {
            if (endMark) {
                performance.measure(name, startMark, endMark);
            } else {
                performance.measure(name, startMark);
            }
            
            const measure = performance.getEntriesByName(name, 'measure')[0];
            return measure ? measure.duration : null;
        } catch (e) {
            console.warn('Performance measure not supported:', e);
            return null;
        }
    },

    /**
     * Get all collected metrics
     * @returns {Object} All metrics
     */
    getMetrics() {
        return { ...this.metrics };
    },

    /**
     * Get a summary of performance metrics
     * @returns {Object} Performance summary
     */
    getSummary() {
        return {
            webVitals: {
                lcp: this.formatMetric(this.metrics.lcp),
                fid: this.formatMetric(this.metrics.fid),
                cls: this.metrics.cls ? this.metrics.cls.toFixed(3) : 'N/A',
                fcp: this.formatMetric(this.metrics.fcp),
                ttfb: this.formatMetric(this.metrics.ttfb)
            },
            timing: {
                pageLoadTime: this.formatMetric(this.metrics.pageLoadTime),
                domReadyTime: this.formatMetric(this.metrics.domReadyTime),
                serverResponseTime: this.formatMetric(this.metrics.serverResponseTime)
            },
            resources: this.metrics.resources || {}
        };
    },

    /**
     * Format metric for display
     * @param {number} value - Metric value in milliseconds
     * @returns {string} Formatted metric
     */
    formatMetric(value) {
        if (value === undefined || value === null) {
            return 'N/A';
        }
        return `${Math.round(value)}ms`;
    },

    /**
     * Log a metric
     * @param {string} name - Metric name
     * @param {number} value - Metric value
     */
    logMetric(name, value) {
        // Only log in development or when explicitly enabled
        if (this.isDebugMode()) {
            console.log(`[Performance] ${name}: ${this.formatMetric(value)}`);
        }
    },

    /**
     * Log resource metrics
     * @param {Object} metrics - Resource metrics
     */
    logResourceMetrics(metrics) {
        // Only log in development or when explicitly enabled
        if (this.isDebugMode()) {
            console.log('[Performance] Resources:', {
                total: metrics.totalResources,
                scripts: metrics.scripts,
                stylesheets: metrics.stylesheets,
                images: metrics.images,
                totalSize: `${Math.round(metrics.totalSize / 1024)}KB`,
                avgDuration: this.formatMetric(metrics.avgDuration)
            });
        }
    },

    /**
     * Check if debug mode is enabled
     * @returns {boolean}
     */
    isDebugMode() {
        // Enable in development or when explicitly set
        return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.debug) || 
               window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1';
    },

    /**
     * Report performance metrics to console
     */
    report() {
        console.log('=== Performance Report ===');
        console.table(this.getSummary().webVitals);
        console.table(this.getSummary().timing);
        console.log('Resources:', this.getSummary().resources);
    },

    /**
     * Cleanup observers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PerformanceMonitor.init());
} else {
    PerformanceMonitor.init();
}

// Make it globally available
window.PerformanceMonitor = PerformanceMonitor;
