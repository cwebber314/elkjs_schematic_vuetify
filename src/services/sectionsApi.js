// Mock API service for section operations
import sectionsData from './sections.json'

/**
 * Mock data for sections loaded from sections.json
 */
const mockSections = sectionsData || []

/**
 * Simulates network delay for API calls
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch sections for a specific branch
 * @param {number} branchId - Branch ID
 * @returns {Promise<Array>} Array of section objects for this branch
 */
export async function fetchSectionsByBranch(branchId) {
  // Simulate network delay
  await delay(200)

  // Convert to number to ensure proper comparison
  const branchIdNum = Number(branchId)

  // Filter sections for this specific branch
  const sections = mockSections.filter(
    section => section.branch_id === branchIdNum
  )

  console.log("fetchSectionsByBranch()")

  return sections
}

/**
 * Fetch all sections
 * @returns {Promise<Array>} Array of all section objects
 */
export async function fetchAllSections() {
  await delay(200)
  return [...mockSections]
}

/**
 * Fetch section by ID
 * @param {number} sectionId - Section ID
 * @returns {Promise<Object|null>} Section object or null if not found
 */
export async function fetchSectionById(sectionId) {
  await delay(200)

  const section = mockSections.find(s => s.section_id === Number(sectionId))
  return section || null
}
