// Mock API service for branch operations
import networkData from './network.json'

/**
 * Mock data for branches loaded from network.json
 */
const mockBranches = networkData.branches || []

/**
 * Simulates network delay for API calls
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch all branches
 * @param {Object} options - Query options
 * @param {number} options.bus1_id - Filter by bus1_id (optional)
 * @param {number} options.bus2_id - Filter by bus2_id (optional)
 * @returns {Promise<Array>} Array of branch objects
 */
export async function fetchBranches(options = {}) {
  // Simulate network delay
  await delay(300)

  let branches = [...mockBranches]

  // Apply filters if provided
  if (options.bus1_id) {
    branches = branches.filter(branch => branch.bus1_id === options.bus1_id)
  }

  if (options.bus2_id) {
    branches = branches.filter(branch => branch.bus2_id === options.bus2_id)
  }

  return branches
}

/**
 * Fetch a single branch by ID
 * @param {number} id - Branch ID
 * @returns {Promise<Object|null>} Branch object or null if not found
 */
export async function fetchBranchById(id) {
  await delay(200)

  const branch = mockBranches.find(b => b.id === id)
  return branch || null
}

/**
 * Search branches by query string
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching branch objects
 */
export async function searchBranches(query) {
  await delay(250)

  if (!query || query.trim() === '') {
    return [...mockBranches]
  }

  const lowerQuery = query.toLowerCase()
  return mockBranches.filter(branch => {
    return (
      branch.name.toLowerCase().includes(lowerQuery) ||
      branch.ckt.toString().includes(lowerQuery) ||
      branch.bus1_id.toString().includes(lowerQuery) ||
      branch.bus2_id.toString().includes(lowerQuery)
    )
  })
}
