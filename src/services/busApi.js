// Mock API service for bus operations
import networkData from './network.json'

/**
 * Mock data for buses loaded from network.json
 */
const mockBuses = networkData.buses || []

/**
 * Simulates network delay for API calls
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch all buses
 * @param {Object} options - Query options
 * @param {string} options.region - Filter by region (optional)
 * @param {number} options.minKv - Minimum kV rating (optional)
 * @param {number} options.maxKv - Maximum kV rating (optional)
 * @returns {Promise<Array>} Array of bus objects
 */
export async function fetchBuses(options = {}) {
  // Simulate network delay
  await delay(300)

  let buses = [...mockBuses]

  // Apply filters if provided
  // if (options.region) {
  //   buses = buses.filter(bus => bus.region === options.region)
  // }

  if (options.minKv) {
    buses = buses.filter(bus => bus.kv >= options.minKv)
  }

  if (options.maxKv) {
    buses = buses.filter(bus => bus.kv <= options.maxKv)
  }

  return buses
}

/**
 * Fetch a single bus by ID
 * @param {number} id - Bus ID
 * @returns {Promise<Object|null>} Bus object or null if not found
 */
export async function fetchBusById(id) {
  await delay(200)

  const bus = mockBuses.find(b => b.id === id)
  return bus || null
}

/**
 * Search buses by query string
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching bus objects
 */
export async function searchBuses(query) {
  await delay(250)

  if (!query || query.trim() === '') {
    return [...mockBuses]
  }

  const lowerQuery = query.toLowerCase()
  return mockBuses.filter(bus => {
    return (
      bus.name.toLowerCase().includes(lowerQuery) ||
      bus.bus_num.toString().includes(lowerQuery) ||
      bus.kv.toString().includes(lowerQuery)
    )
  })
}
