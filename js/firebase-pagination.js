/**
 * Firebase Query Pagination Utility
 * Implements efficient cursor-based pagination for Firebase Realtime Database queries
 */

const FirebasePagination = {
    // Store pagination state for different queries
    paginationState: new Map(),

    /**
     * Initialize pagination for a query
     * @param {string} queryId - Unique identifier for the query
     * @param {Object} config - Pagination configuration
     * @returns {Object} Pagination controller
     */
    createPagination(queryId, config = {}) {
        const {
            pageSize = 20,
            orderBy = 'timestamp',
            orderDirection = 'desc'
        } = config;

        const state = {
            queryId,
            pageSize,
            orderBy,
            orderDirection,
            currentPage: 0,
            lastKey: null,
            hasMore: true,
            loadedData: [],
            totalLoaded: 0
        };

        this.paginationState.set(queryId, state);

        return {
            loadPage: (page) => this.loadPage(queryId, page),
            loadNext: () => this.loadNextPage(queryId),
            loadPrevious: () => this.loadPreviousPage(queryId),
            reset: () => this.resetPagination(queryId),
            getState: () => this.getPaginationState(queryId),
            hasMore: () => this.hasMoreData(queryId)
        };
    },

    /**
     * Load a specific page
     * @param {string} queryId
     * @param {number} pageNumber
     */
    async loadPage(queryId, pageNumber) {
        const state = this.paginationState.get(queryId);
        if (!state) {
            throw new Error(`Pagination not initialized for query: ${queryId}`);
        }

        state.currentPage = pageNumber;
        return this.fetchPage(state);
    },

    /**
     * Load next page
     * @param {string} queryId
     */
    async loadNextPage(queryId) {
        const state = this.paginationState.get(queryId);
        if (!state) {
            throw new Error(`Pagination not initialized for query: ${queryId}`);
        }

        if (!state.hasMore) {
            return { data: [], hasMore: false };
        }

        state.currentPage++;
        return this.fetchPage(state);
    },

    /**
     * Load previous page
     * @param {string} queryId
     */
    async loadPreviousPage(queryId) {
        const state = this.paginationState.get(queryId);
        if (!state || state.currentPage === 0) {
            return { data: [], hasMore: state ? state.hasMore : false };
        }

        state.currentPage--;
        return this.fetchPage(state);
    },

    /**
     * Fetch a page of data from Firebase
     * @private
     */
    async fetchPage(state) {
        // This is a template method - implement actual Firebase query logic
        // based on your specific data structure
        console.log(`Fetching page ${state.currentPage} for ${state.queryId}`);
        
        // Return structure for the data
        return {
            data: [],
            currentPage: state.currentPage,
            hasMore: state.hasMore,
            totalLoaded: state.totalLoaded
        };
    },

    /**
     * Query Firebase with pagination
     * @param {string} path - Firebase path
     * @param {Object} options - Query options
     */
    async queryWithPagination(path, options = {}) {
        const {
            pageSize = 20,
            lastKey = null,
            orderBy = 'timestamp',
            orderDirection = 'desc'
            // filters can be added in future enhancement
        } = options;

        try {
            if (!FirebaseInit.isInitialized) {
                await FirebaseInit.init();
            }

            if (!FirebaseInit.isAuthenticated) {
                await FirebaseInit.ensureAuthenticated();
            }

            const { ref, get, query, orderByChild, limitToFirst, limitToLast, startAfter, endBefore } = window.firebaseModules;
            const database = FirebaseInit.database;

            const dbRef = ref(database, path);
            let dbQuery = query(dbRef, orderByChild(orderBy));

            // Apply pagination
            if (orderDirection === 'desc') {
                dbQuery = query(dbQuery, limitToLast(pageSize + 1));
            } else {
                dbQuery = query(dbQuery, limitToFirst(pageSize + 1));
            }

            // Apply cursor-based pagination
            if (lastKey) {
                if (orderDirection === 'desc') {
                    dbQuery = query(dbQuery, endBefore(lastKey));
                } else {
                    dbQuery = query(dbQuery, startAfter(lastKey));
                }
            }

            const snapshot = await get(dbQuery);
            
            if (!snapshot.exists()) {
                return {
                    data: [],
                    hasMore: false,
                    nextKey: null
                };
            }

            const items = [];
            snapshot.forEach((childSnapshot) => {
                items.push({
                    key: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            // Check if there are more items
            const hasMore = items.length > pageSize;
            if (hasMore) {
                items.pop(); // Remove the extra item used for hasMore check
            }

            // Get the key for next pagination
            const nextKey = items.length > 0 ? items[items.length - 1][orderBy] : null;

            return {
                data: orderDirection === 'desc' ? items.reverse() : items,
                hasMore,
                nextKey
            };

        } catch (error) {
            console.error('Firebase pagination query failed:', error);
            throw error;
        }
    },

    /**
     * Query Firebase with limit (simpler approach)
     * @param {string} path - Firebase path
     * @param {number} limit - Number of items to fetch
     */
    async queryWithLimit(path, limit = 50) {
        try {
            if (!FirebaseInit.isInitialized) {
                await FirebaseInit.init();
            }

            if (!FirebaseInit.isAuthenticated) {
                await FirebaseInit.ensureAuthenticated();
            }

            const { ref, get, query, limitToLast } = window.firebaseModules;
            const database = FirebaseInit.database;

            const dbRef = ref(database, path);
            const dbQuery = query(dbRef, limitToLast(limit));

            const snapshot = await get(dbQuery);
            
            if (!snapshot.exists()) {
                return [];
            }

            const items = [];
            snapshot.forEach((childSnapshot) => {
                items.push({
                    key: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            return items;

        } catch (error) {
            console.error('Firebase limit query failed:', error);
            throw error;
        }
    },

    /**
     * Reset pagination state
     * @param {string} queryId
     */
    resetPagination(queryId) {
        const state = this.paginationState.get(queryId);
        if (state) {
            state.currentPage = 0;
            state.lastKey = null;
            state.hasMore = true;
            state.loadedData = [];
            state.totalLoaded = 0;
        }
    },

    /**
     * Get pagination state
     * @param {string} queryId
     */
    getPaginationState(queryId) {
        return this.paginationState.get(queryId);
    },

    /**
     * Check if there's more data to load
     * @param {string} queryId
     */
    hasMoreData(queryId) {
        const state = this.paginationState.get(queryId);
        return state ? state.hasMore : false;
    },

    /**
     * Clear all pagination state
     */
    clearAll() {
        this.paginationState.clear();
    }
};

// Make it globally available
window.FirebasePagination = FirebasePagination;
