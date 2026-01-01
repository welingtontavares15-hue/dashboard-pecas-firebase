/**
 * Dynamic Module Loader
 * Implements lazy loading of JavaScript modules for performance optimization
 */

const ModuleLoader = {
    loadedModules: new Map(),
    loadingPromises: new Map(),

    /**
     * Dynamically load a module
     * @param {string} moduleName - Name of the module to load
     * @param {string} modulePath - Path to the module file
     * @returns {Promise<any>} The loaded module
     */
    async loadModule(moduleName, modulePath) {
        // Return cached module if already loaded
        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        // Return existing promise if already loading
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        // Create new loading promise
        const loadingPromise = this._loadModuleScript(modulePath)
            .then((module) => {
                this.loadedModules.set(moduleName, module);
                this.loadingPromises.delete(moduleName);
                return module;
            })
            .catch((error) => {
                this.loadingPromises.delete(moduleName);
                console.error(`Failed to load module ${moduleName}:`, error);
                throw error;
            });

        this.loadingPromises.set(moduleName, loadingPromise);
        return loadingPromise;
    },

    /**
     * Load a module script dynamically
     * @private
     */
    async _loadModuleScript(modulePath) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = modulePath;
            script.type = 'text/javascript';
            
            script.onload = () => {
                resolve(window);
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${modulePath}`));
            };
            
            document.head.appendChild(script);
        });
    },

    /**
     * Load multiple modules in parallel
     * @param {Array<{name: string, path: string}>} modules
     * @returns {Promise<Map>} Map of loaded modules
     */
    async loadModules(modules) {
        const promises = modules.map(({ name, path }) => 
            this.loadModule(name, path).then(module => ({ name, module }))
        );
        
        const results = await Promise.all(promises);
        const modulesMap = new Map();
        results.forEach(({ name, module }) => {
            modulesMap.set(name, module);
        });
        
        return modulesMap;
    },

    /**
     * Lazy load chart library when needed
     */
    async loadChartLibrary() {
        if (window.Chart) {
            return window.Chart;
        }
        
        await this.loadModule('chart', './js/vendor/chart.umd.js');
        return window.Chart;
    },

    /**
     * Lazy load PDF library when needed
     */
    async loadPdfLibrary() {
        if (window.jspdf?.jsPDF) {
            return window.jspdf.jsPDF;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.integrity = 'sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==';
            script.crossOrigin = 'anonymous';
            script.referrerPolicy = 'no-referrer';
            
            script.onload = () => resolve(window.jspdf.jsPDF);
            script.onerror = () => reject(new Error('Failed to load jsPDF library'));
            
            document.head.appendChild(script);
        });
    },

    /**
     * Lazy load Excel library when needed
     */
    async loadExcelLibrary() {
        if (window.XLSX) {
            return window.XLSX;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.integrity = 'sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA==';
            script.crossOrigin = 'anonymous';
            script.referrerPolicy = 'no-referrer';
            
            script.onload = () => resolve(window.XLSX);
            script.onerror = () => reject(new Error('Failed to load XLSX library'));
            
            document.head.appendChild(script);
        });
    },

    /**
     * Lazy load QR Code library when needed
     */
    async loadQRCodeLibrary() {
        if (window.QRCode) {
            return window.QRCode;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
            script.integrity = 'sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==';
            script.crossOrigin = 'anonymous';
            script.referrerPolicy = 'no-referrer';
            
            script.onload = () => resolve(window.QRCode);
            script.onerror = () => reject(new Error('Failed to load QRCode library'));
            
            document.head.appendChild(script);
        });
    },

    /**
     * Preload a module without waiting for it
     * @param {string} modulePath - Path to the module
     */
    preloadModule(modulePath) {
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = modulePath;
        document.head.appendChild(link);
    },

    /**
     * Check if a module is loaded
     * @param {string} moduleName
     * @returns {boolean}
     */
    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    },

    /**
     * Unload a module from cache
     * @param {string} moduleName
     */
    unloadModule(moduleName) {
        this.loadedModules.delete(moduleName);
    }
};

// Make it globally available
window.ModuleLoader = ModuleLoader;
