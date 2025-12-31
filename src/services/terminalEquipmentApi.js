// Mock API service for terminal equipment operations
import terminalEquipmentData from '../terminal_equipment.json'

/**
 * Mock data for terminal equipment loaded from terminal_equipment.json
 */
const mockEquipment = terminalEquipmentData || []

/**
 * Simulates network delay for API calls
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch terminal equipment for a specific branch and bus
 * @param {number} branchId - Branch ID
 * @param {number} busId - Bus ID
 * @returns {Promise<Array>} Array of equipment objects for this terminal
 */
export async function fetchTerminalEquipment(branchId, busId) {
  // Simulate network delay
  await delay(200)

  // Convert to numbers to ensure proper comparison
  const branchIdNum = Number(branchId)
  const busIdNum = Number(busId)

  // Filter equipment for this specific terminal (branch + bus combination)
  const equipment = mockEquipment.filter(
    eq => eq.branch_id === branchIdNum && eq.bus_id === busIdNum
  )

  return equipment
}

/**
 * Fetch all terminal equipment
 * @returns {Promise<Array>} Array of all equipment objects
 */
export async function fetchAllTerminalEquipment() {
  await delay(200)
  return [...mockEquipment]
}

/**
 * Fetch equipment by ID
 * @param {number} equipId - Equipment ID
 * @returns {Promise<Object|null>} Equipment object or null if not found
 */
export async function fetchEquipmentById(equipId) {
  await delay(200)

  const equipment = mockEquipment.find(eq => eq.equip_id === Number(equipId))
  return equipment || null
}
