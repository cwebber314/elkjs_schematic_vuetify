// Mock API service for network operations
import networkData from './network.json'

/**
 * Mock data for network loaded from network.json
 */
const mockBuses = networkData.buses || []
const mockBranches = networkData.branches || []

/**
 * Simulates network delay for API calls
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch network data for a specific bus
 * Returns all branches connected to the bus and all buses associated with those branches
 * @param {number} busid - Bus ID
 * @returns {Promise<Object|null>} Network data object with buses and branches, or null if bus not found
 */
export async function fetchNetworkByBusId(busid) {
  // Simulate network delay
  busid = Number(busid)
  console.log(`fetchNetworkByBusId: ${busid}`)
  await delay(300)

  // Check if the bus exists
  const bus = mockBuses.find(b => b.id === busid)
  if (!bus) {
    return null
  }

  // Find all branches connected to this bus
  const connectedBranches = mockBranches.filter(branch =>
    branch.bus1_id === busid || branch.bus2_id === busid
  )

  // Get all unique bus IDs from the connected branches
  const busIds = new Set()
  busIds.add(busid) // Include the original bus

  connectedBranches.forEach(branch => {
    busIds.add(branch.bus1_id)
    busIds.add(branch.bus2_id)
  })

  // Get all buses associated with the connected branches
  const connectedBuses = mockBuses.filter(b => busIds.has(b.id))

  return {
    buses: connectedBuses,
    branches: connectedBranches
  }
}

/**
 * Fetch network data for specific bus IDs and branch IDs.
 * Returns buses matching the IDs and branches matching the branch IDs.
 * @param {number[]} busIds - Array of bus IDs to load
 * @param {number[]} branchIds - Array of branch IDs to load
 * @returns {Promise<{buses: Array, branches: Array}>}
 */
export async function fetchNetworkByIds(busIds, branchIds) {
  await delay(300)

  const busIdSet = new Set(busIds)
  const branchIdSet = new Set(branchIds)

  // Get buses matching the IDs
  const buses = mockBuses.filter(bus => busIdSet.has(bus.id))

  // Get branches matching the branch IDs
  const branches = mockBranches.filter(branch => branchIdSet.has(branch.id))

  return { buses, branches }
}
