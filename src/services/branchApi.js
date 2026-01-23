// Mock API service for branch operations
import networkData from './network.json'

/**
 * Mock data for branches loaded from network.json
 */
const mockBranches = networkData.branches || []
const relatedBranches = networkData.related_branches || []
const mutualDetails = networkData.mutual_details || []

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

/**
 * Fetch related branches for a list of branch IDs
 * Returns all branch IDs that are related to any of the input branch IDs
 * @param {Array<number>} branchIds - Array of branch IDs to find relations for
 * @returns {Promise<Array<number>>} Array of related branch IDs (excluding the input IDs)
 */
export async function fetchRelatedBranches(branchIds) {
  await delay(200)

  if (!branchIds || branchIds.length === 0) {
    return []
  }

  const inputSet = new Set(branchIds.map(id => Number(id)))
  const relatedIds = new Set()

  relatedBranches.forEach(relation => {
    const id1 = Number(relation.id1)
    const id2 = Number(relation.id2)

    if (inputSet.has(id1)) {
      relatedIds.add(id2)
    }
    if (inputSet.has(id2)) {
      relatedIds.add(id1)
    }
  })

  // Remove input IDs from results (only return the related ones, not the original inputs)
  inputSet.forEach(id => relatedIds.delete(id))

  return Array.from(relatedIds)
}

/**
 * Fetch mutual details for a pair of related branches
 * @param {number} branchId1 - First branch ID
 * @param {number} branchId2 - Second branch ID
 * @returns {Promise<Object|null>} Mutual details object or null if not found
 */
export async function fetchMutualDetails(branchId1, branchId2) {
  await delay(200)

  const id1 = Number(branchId1)
  const id2 = Number(branchId2)

  // Find mutual details for this pair (order doesn't matter)
  const details = mutualDetails.find(md =>
    (md.id1 === id1 && md.id2 === id2) ||
    (md.id1 === id2 && md.id2 === id1)
  )

  return details || null
}
