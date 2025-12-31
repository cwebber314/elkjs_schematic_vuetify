<template>
  <v-container fluid class="page-container">
    <!-- Schematic Editor Section -->
    <!-- Toolbar with Add Node and Add Branch buttons -->

    <div class="schematic-section">
      <v-row no-gutters class="schematic-row">
        <v-col cols="auto">
          <div id="schematic-toolbar" class="vertical-toolbar">
            <v-menu location="right">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="large"
                  title="Select Region"
                  variant="flat"
                  color="surface"
                  icon="mdi-map">
                </v-btn>
              </template>
              <v-list density="compact" min-width="150">
                <v-list-subheader>Select Region</v-list-subheader>
                <v-list-item
                  v-for="regionOption in regions"
                  :key="regionOption"
                  :value="regionOption"
                  :active="region === regionOption"
                  @click="region = regionOption">
                  <v-list-item-title>{{ regionOption }}</v-list-item-title>
                  <template v-slot:append v-if="region === regionOption">
                    <v-icon>mdi-check</v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </v-menu>
            <v-btn
              icon="mdi-vector-point-select"
              title="Show Bus"
              size="large"
              variant="flat"
              color="surface"
              @click="showSelectBusDialog = true">
            </v-btn>
            <v-btn
              v-if="false"
              icon="mdi-vector-point-plus"
              title="Add Bus"
              size="large"
              variant="flat"
              color="surface"
              >
            </v-btn>
            <v-btn
              v-if="false"
              icon="mdi-vector-polyline-plus"
              title="Add Branch"
              size="large"
              variant="flat"
              color="surface">
            </v-btn>
          </div>
        </v-col>
        <v-col>
          <SchematicEditor2
            ref="schematicEditor"
            :networkData="networkData"
            :width="editorWidth"
            :height="editorHeight"
            @bus-click="handleBusClick"
            @edge-click="handleEdgeClick"
            @terminal-click="handleTerminalClick"
            @selection-changed="handleSelectionChanged"
            @properties-click="handlePropertiesClick"
            @grow-click="handleGrowClick"
            @add-bus-click="handleAddBusClick"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Resize Handle -->
    <div
      class="resize-handle"
      @mousedown="startResize"
      :class="{ 'resizing': isResizing }">
      <div class="resize-handle-line"></div>
    </div>

    <!-- Data Browser Section -->
    <v-row v-if="!loading && !error" class="data-browser-section">
      <v-col>
        <v-card>
          <v-tabs v-model="activeTab" bg-color="primary">
            <v-tab value="branches">Branches</v-tab>
            <v-tab value="buses">Buses</v-tab>
            <v-tab value="sections">Sections</v-tab>
            <v-tab value="terminal-equipment">Terminal Equipment</v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="activeTab">
              <!-- Branches Tab -->
              <v-window-item value="branches">
                <v-data-table
                  :headers="branchHeaders"
                  :items="selectedBranches"
                  :items-per-page="5"
                  class="elevation-1"
                  density="compact">
                  <template v-slot:top>
                    <v-toolbar flat>
                      <v-toolbar-title>Selected Branches ({{ selectedBranches.length }})</v-toolbar-title>
                    </v-toolbar>
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-icon
                      size="small"
                      color="blue"
                      @click="viewBranch(item)"
                      title="View Details">
                      mdi-information-outline
                    </v-icon>
                  </template>
                  <template v-slot:no-data>
                    <v-alert type="info" class="ma-2">
                      No branches selected. Click on a branch in the schematic to view its details.
                    </v-alert>
                  </template>
                </v-data-table>
              </v-window-item>

              <!-- Buses Tab -->
              <v-window-item value="buses">
                <v-data-table
                  :headers="busesHeaders"
                  :items="selectedBuses"
                  :items-per-page="5"
                  class="elevation-1"
                  density="compact">
                  <template v-slot:top>
                    <v-toolbar flat>
                      <v-toolbar-title>Selected Buses ({{ selectedBuses.length }})</v-toolbar-title>
                    </v-toolbar>
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-icon
                      size="small"
                      color="blue"
                      @click="addBus(item)"
                      title="View Details">
                      mdi-information-outline
                    </v-icon>
                  </template>
                  <template v-slot:no-data>
                    <v-alert type="info" class="ma-2">
                      No buses selected. Click on a bus (node rectangle) in the schematic to view its details.
                    </v-alert>
                  </template>
                </v-data-table>
              </v-window-item>

              <!-- Sections Tab -->
              <v-window-item value="sections">
                <v-data-table
                  :headers="sectionsHeaders"
                  :items="selectedSections"
                  :items-per-page="-1"
                  :group-by="selectedBranches.length > 1 ? [{ key: 'branch_id', order: 'asc' }] : []"
                  v-model:expanded="expandedSectionGroups"
                  class="elevation-1"
                  density="compact">
                  <template v-slot:top>
                    <v-toolbar flat>
                      <v-toolbar-title>Branch Sections ({{ selectedSections.length }} sections)</v-toolbar-title>
                    </v-toolbar>
                  </template>
                  <template v-slot:no-data>
                    <v-alert type="info" class="ma-2">
                      No branches selected. Click on a branch in the schematic to view its sections.
                    </v-alert>
                  </template>
                  <template v-slot:group-header="{ item, columns, toggleGroup, isGroupOpen }">
                    <tr>
                      <td :colspan="columns.length" class="bg-primary text-white font-weight-bold">
                        <v-btn
                          size="small"
                          variant="text"
                          :icon="isGroupOpen(item) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                          @click="toggleGroup(item)"
                        ></v-btn>
                        {{ item.value }} | {{ branchIdToNameMap[item.value] }}
                      </td>
                    </tr>
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-icon
                      size="small"
                      color="blue"
                      @click="viewSection(item)"
                      title="View Details">
                      mdi-information-outline
                    </v-icon>
                  </template>
                  <template v-slot:item.length_mi="{ item }">
                    {{ item.length_mi.toFixed(2) }}
                  </template>
                  <template v-slot:group-summary="{ item, columns }" v-if="selectedBranches.length > 1">
                    <tr class="summary-row">
                      <td colspan="4" class="text-right">Total</td>
                      <td>{{ sectionTotalsByBranch[item.value].toFixed(2) }}</td>
                      <td colspan="3"></td>
                    </tr>
                  </template>
                  <template v-slot:body.append v-if="selectedSections.length > 0 && selectedBranches.length <= 1">
                    <tr class="summary-row">
                      <td colspan="4" class="text-right">Total</td>
                      <td>{{ totalSectionLength.toFixed(2) }}</td>
                      <td colspan="3"></td>
                    </tr>
                  </template>
                </v-data-table>
              </v-window-item>

              <!-- Terminal Equipment Tab -->
              <v-window-item value="terminal-equipment">
                <v-data-table
                  :headers="equipmentHeaders"
                  :items="selectedTerminalEquipment"
                  :items-per-page="10"
                  class="elevation-1"
                  density="compact">
                  <template v-slot:top>
                    <v-toolbar flat>
                      <v-toolbar-title>Terminal Equipment ({{ selectedTerminalEquipment.length }} items)</v-toolbar-title>
                    </v-toolbar>
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-icon
                      size="small"
                      class="me-2"
                      color="blue"
                      @click="editEquipment(item)"
                      title="Edit">
                      mdi-pencil
                    </v-icon>
                    <v-icon
                      size="small"
                      color="red"
                      @click="deleteEquipment(item)"
                      title="Delete">
                      mdi-delete
                    </v-icon>
                  </template>
                  <template v-slot:no-data>
                    <v-alert type="info" class="ma-2">
                      No terminals selected. Click on a terminal (orange/purple cap at the end of a branch) in the schematic to view its equipment.
                    </v-alert>
                  </template>
                  <template v-slot:body.append v-if="selectedTerminalEquipment.length > 0">
                    <tr class="font-weight-bold bg-grey-lighten-3">
                      <td colspan="3" class="text-right">Minimum Rating:</td>
                      <td>{{ minEquipmentRating }}</td>
                      <td colspan="4"></td>
                    </tr>
                  </template>
                </v-data-table>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogs -->
    <EditBranch
      v-if="currentBranch"
      v-model="showBranchDialog"
      :edge="currentBranch"
    />

    <EditBus
      v-if="currentBus"
      v-model="addBusDialog"
      :node="currentBus"
    />

    <SelectBus
      v-model="showSelectBusDialog"
      :region="region"
      @select="handleSelectBus"
    />

    <ViewEquipment
      v-if="currentEquipment"
      v-model="showEquipmentDialog"
      :equipment="currentEquipment"
    />

    <ViewSection
      v-if="currentSection"
      v-model="showSectionDialog"
      :section="currentSection"
    />

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">Confirm Deletion</v-card-title>
        <v-card-text>
          <div v-if="itemToDelete">
            Are you sure you want to delete equipment <strong>{{ itemToDelete.equip_name }}</strong> (ID: {{ itemToDelete.equip_id }})?
          </div>
          <div class="text-caption text-grey mt-2">
            This action cannot be undone.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelDelete">Cancel</v-btn>
          <v-btn color="red" variant="text" @click="confirmDelete" :loading="isDeleting">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>


<script>
import { fetchNetworkByBusId } from '../services/networkApi.js'
import { fetchAllSections } from '../services/sectionsApi.js'
import terminalEquipmentData from '../terminal_equipment.json'
import SchematicEditor2 from '../components/SchematicEditor2.vue'
import EditBranch from '../components/EditBranch.vue'
import EditBus from '../components/EditBus.vue'
import SelectBus from '../components/SelectBus.vue'
import ViewEquipment from '../components/ViewEquipment.vue'
import ViewSection from '../components/ViewSection.vue'

export default {
  name: 'TerminalCRUDComponent',
  components: {
    SchematicEditor2,
    EditBranch,
    EditBus,
    SelectBus,
    ViewEquipment,
    ViewSection
  },
  data() {
    return {
      region: 'SPP', // Either SPP, ERCOT, PJM
      regions: ['SPP', 'ERCOT', 'PJM'],
      networkData: { buses: [], branches: [] }, // Empty until bus is selected
      terminalEquipmentData: [...terminalEquipmentData],
      sectionsData: [], // Will be loaded from API
      loading: false,
      error: null,
      selectedBuses: [],
      selectedEdges: [],
      selectedTerminals: [],
      activeTab: 'branches',
      expandedSectionGroups: [],
      editorWidth: window.innerWidth - 48,
      editorHeight: window.innerHeight * 0.5 - 80,
      // Resize state
      isResizing: false,
      resizeStartY: 0,
      resizeStartHeight: 0,
      // Dialog states
      showBranchDialog: false,
      addBusDialog: false,
      showSelectBusDialog: false,
      showEquipmentDialog: false,
      showSectionDialog: false,
      showDeleteDialog: false,
      currentBranch: null,
      currentBus: null,
      currentEquipment: null,
      currentSection: null,
      itemToDelete: null,
      isDeleting: false,
      branchHeaders: [
        { title: 'Actions', key: 'actions', sortable: false, width: '80px' },
        { title: 'ID', key: 'id', sortable: true },
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Bus 1', key: 'bus1_name', sortable: true },
        { title: 'Bus 2', key: 'bus2_name', sortable: true },
        { title: 'Bus 1 ID', key: 'bus1_id', sortable: true },
        { title: 'Bus 2 ID', key: 'bus2_id', sortable: true }
      ],
      busesHeaders: [
        { title: 'Actions', key: 'actions', sortable: false, width: '80px' },
        { title: 'ID', key: 'id', sortable: true },
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Bus Number', key: 'bus_num', sortable: true },
        { title: 'kV', key: 'kv', sortable: true }
      ],
      sectionsHeaders: [
        { title: 'Actions', key: 'actions', sortable: false, width: '80px' },
        { title: 'Section ID', key: 'section_id', sortable: true },
        { title: 'Section Name', key: 'section_name', sortable: true },
        { title: 'Section #', key: 'section_n', sortable: true },
        { title: 'Length (mi)', key: 'length_mi', sortable: true },
        { title: 'Conductor', key: 'conductor', sortable: true },
        { title: 'Branch', key: 'branch_name', sortable: true },
        { title: 'Branch ID', key: 'branch_id', sortable: true }
      ],
      equipmentHeaders: [
        { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
        { title: 'Equipment ID', key: 'equip_id', sortable: true },
        { title: 'Equipment Name', key: 'equip_name', sortable: true },
        { title: 'Rating', key: 'equip_rating', sortable: true },
        { title: 'Branch', key: 'branch_name', sortable: true },
        { title: 'Bus', key: 'bus_name', sortable: true },
        { title: 'Branch ID', key: 'branch_id', sortable: true },
        { title: 'Bus ID', key: 'bus_id', sortable: true }
      ]
    }
  },
  computed: {
    selectedBranches() {
      console.log("selectedBranches()")
      // Get selected edges and combine with original branch data
      return this.selectedEdges.map(edge => {
        const branchData = this.networkData.branches.find(b => b.id === parseInt(edge.id))
        const bus1 = this.networkData.buses.find(b => b.id === branchData.bus1_id)
        const bus2 = this.networkData.buses.find(b => b.id === branchData.bus2_id)

        return {
          id: branchData.id,
          name: branchData.name,
          bus1_id: branchData.bus1_id,
          bus2_id: branchData.bus2_id,
          bus1_name: bus1 ? bus1.name : 'Unknown',
          bus2_name: bus2 ? bus2.name : 'Unknown'
        }
      })
    },
    selectedBuses() {
      // Get selected buses and combine with original bus data
      return this.selectedBuses.map(bus => {
        const busData = this.networkData.buses.find(b => b.id === parseInt(bus.id))

        return {
          id: busData.id,
          name: busData.name,
          bus_num: busData.bus_num,
          kv: busData.kv
        }
      })
    },
    selectedSections() {
      // Get sections for selected branches
      const sections = []

      // Get selected branch IDs
      const selectedBranchIds = this.selectedEdges.map(edge => parseInt(edge.id))

      // Find all sections for selected branches
      selectedBranchIds.forEach((branchId) => {
        const branchData = this.networkData.branches.find(b => b.id === branchId)
        const branchName = branchData ? branchData.name : `Branch ${branchId}`
        const branchSections = this.sectionsData.filter(section => section.branch_id === branchId)

        // Add branch name to each section for grouping display
        const sectionsWithBranchName = branchSections.map(section => ({
          ...section,
          branch_name: branchName
        }))

        sections.push(...sectionsWithBranchName)
      })

      return sections
    },
    totalSectionLength() {
      // Calculate total length of all selected sections
      return this.sumSectionLengths(this.selectedSections)
    },
    sectionTotalsByBranch() {
      // Calculate total length for each branch
      const totals = {}
      this.selectedSections.forEach(section => {
        if (!totals[section.branch_id]) {
          totals[section.branch_id] = 0
        }
        totals[section.branch_id] += section.length_mi
      })
      return totals
    },
    branchIdToNameMap() {
      // Create a map of branch_id to branch_name for group headers
      const map = {}
      this.selectedSections.forEach(section => {
        if (!map[section.branch_id]) {
          map[section.branch_id] = section.branch_name
        }
      })
      return map
    },
    minEquipmentRating() {
      // Calculate minimum rating of all selected terminal equipment
      if (this.selectedTerminalEquipment.length === 0) return 0
      return Math.min(...this.selectedTerminalEquipment.map(eq => eq.equip_rating))
    },
    selectedTerminalEquipment() {
      // Get equipment for selected terminals
      const equipment = []

      // Iterate through all active terminals
      this.selectedTerminals.forEach(terminal => {
        const branchId = terminal.branch
        const busId = terminal.bus

        // Find all equipment for this branch and bus
        const terminalEquip = this.terminalEquipmentData.filter(
          eq => eq.branch_id === branchId && eq.bus_id === busId
        )
        equipment.push(...terminalEquip)
      })

      return equipment
    }
  },
  watch: {
    selectedSections: {
      handler() {
        // Auto-expand all section groups when sections change
        if (this.selectedBranches.length > 1) {
          // Get unique branch IDs from selected sections
          const branchIds = [...new Set(this.selectedSections.map(s => s.branch_id))]
          // Expand all groups by setting the expanded array to include all branch IDs
          this.expandedSectionGroups = branchIds.map(id => ({ value: id }))
        } else {
          this.expandedSectionGroups = []
        }
      },
      immediate: true
    },
    region(newVal) {
      console.log('Region changed to:', newVal)
      // Save selected region to localStorage
      localStorage.setItem('selectedRegion', newVal)
    }
  },
  async mounted() {
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('keydown', this.handleKeyPress)

    // Restore saved region from localStorage
    const savedRegion = localStorage.getItem('selectedRegion')
    if (savedRegion && this.regions.includes(savedRegion)) {
      this.region = savedRegion
      console.log('Restored region from localStorage:', savedRegion)
    }

    // Restore saved schematic height from localStorage
    const savedHeight = localStorage.getItem('schematicHeight')
    if (savedHeight) {
      const height = parseInt(savedHeight, 10)
      if (!isNaN(height) && height >= 200 && height <= window.innerHeight - 200) {
        this.editorHeight = height
        console.log('Restored schematic height from localStorage:', height)
      }
    }

    // Load all sections data on component mount
    try {
      this.sectionsData = await fetchAllSections()
      console.log('Loaded sections data:', this.sectionsData.length)
    } catch (err) {
      console.error('Error loading sections data:', err)
      this.error = 'Failed to load sections data'
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('keydown', this.handleKeyPress)
  },
  methods: {
    // Helper method to sum section lengths
    sumSectionLengths(sections) {
      return sections.reduce((sum, section) => sum + section.length_mi, 0)
    },
    handleSelectionChanged({ buses, edges, terminals }) {
      this.selectedBuses = buses
      this.selectedEdges = edges
      this.selectedTerminals = terminals
    },
    handleBusClick(bus) {
      // if (bus.selected) {
      //   this.activeTab = 'buses'
      // }
    },
    handleEdgeClick(edge) {
      // if (edge.selected) {
      //   this.activeTab = 'branches'
      // }
    },
    handleTerminalClick({ edge, terminalEnd, selected }) {
      // if (selected) {
      //   this.activeTab = 'terminal-equipment'
      // }
    },
    handleResize() {
      this.editorWidth = window.innerWidth - 48
      this.editorHeight = window.innerHeight * 0.5 - 80
    },
    handleKeyPress(event) {
      // Ignore keypress if user is typing in an input field
      const tagName = event.target.tagName.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || event.target.isContentEditable) {
        return
      }

      // Handle keyboard shortcuts
      if (event.key === 'g' || event.key === 'G') {
        // Grow shortcut - only works if exactly one bus is selected
        if (this.selectedBuses.length === 1 && this.selectedEdges.length === 0) {
          event.preventDefault()
          const bus = this.selectedBuses[0]
          console.log('Grow shortcut triggered for bus:', bus.name)
          this.handleGrowClick({ objectType: 'Bus', targetObject: bus })
        }
      } else if (event.key === 'h' || event.key === 'H') {
        // Hide shortcut - works on any selection
        const totalSelected = this.selectedBuses.length + this.selectedEdges.length
        if (totalSelected > 0) {
          event.preventDefault()
          console.log('Hide shortcut triggered for', totalSelected, 'items')

          // Hide all selected buses
          this.selectedBuses.forEach(bus => {
            if (this.$refs.schematicEditor) {
              const layoutBus = this.$refs.schematicEditor.layoutBuses.find(b => b.id === bus.id)
              if (layoutBus) {
                layoutBus.hidden = true
                layoutBus.selected = false
              }
            }
          })

          // Hide all selected edges
          this.selectedEdges.forEach(edge => {
            if (this.$refs.schematicEditor) {
              const layoutEdge = this.$refs.schematicEditor.layoutEdges.find(e => e.id === edge.id)
              if (layoutEdge) {
                layoutEdge.hidden = true
                layoutEdge.selected = false
              }
            }
          })

          // Clear selection
          this.selectedBuses = []
          this.selectedEdges = []
        }
      }
    },
    startResize(event) {
      this.isResizing = true
      this.resizeStartY = event.clientY
      this.resizeStartHeight = this.editorHeight

      // Add global listeners for dragging
      window.addEventListener('mousemove', this.doResize)
      window.addEventListener('mouseup', this.stopResize)

      // Prevent text selection during drag
      event.preventDefault()
    },
    doResize(event) {
      if (!this.isResizing) return

      const deltaY = event.clientY - this.resizeStartY
      const newHeight = this.resizeStartHeight + deltaY

      // Set minimum and maximum heights
      const minHeight = 200
      const maxHeight = window.innerHeight - 400

      this.editorHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))
    },
    stopResize() {
      if (!this.isResizing) return

      this.isResizing = false

      // Remove global listeners
      window.removeEventListener('mousemove', this.doResize)
      window.removeEventListener('mouseup', this.stopResize)

      // Save to localStorage
      localStorage.setItem('schematicHeight', this.editorHeight.toString())
      console.log('Saved schematic height to localStorage:', this.editorHeight)
    },
    handlePropertiesClick({ objectType, targetObject }) {
      console.log('Properties clicked from context menu:', objectType, targetObject)

      if (objectType === 'Bus') {
        // Open EditNode dialog
        const busData = this.networkData.buses.find(b => b.id === parseInt(targetObject.id))

        this.currentBus = {
          id: targetObject.id,
          name: targetObject.name,
          bus_num: busData ? busData.bus_num : '',
          kv: busData ? busData.kv : '',
          x: targetObject.x || 0,
          y: targetObject.y || 0,
          width: targetObject.width || 0,
          height: targetObject.height || 0
        }
        this.addBusDialog = true
      } else if (objectType === 'Branch') {
        // Open EditBranch dialog
        const branchData = this.networkData.branches.find(b => b.id === parseInt(targetObject.id))

        this.currentBranch = {
          id: targetObject.id,
          name: targetObject.name,
          bus1_id: branchData ? branchData.bus1_id : '',
          bus2_id: branchData ? branchData.bus2_id : '',
          ckt: branchData ? branchData.ckt : '',
          labelX: targetObject.labelX || 0,
          labelY: targetObject.labelY || 0,
          points: targetObject.points || []
        }
        this.showBranchDialog = true
      }
    },
    async handleGrowClick({ objectType, targetObject }) {
      console.log('Grow clicked from context menu:', objectType, targetObject)

      if (objectType === 'Bus' && targetObject) {
        try {
          this.loading = true

          // Fetch network data for the selected bus
          const network = await fetchNetworkByBusId(targetObject.id)

          if (network) {
            // Merge the new network data with existing data
            this.mergeNetworkData(network)

            // Unhide all buses and branches from the grow result
            await this.$nextTick() // Wait for layout to recompute
            if (this.$refs.schematicEditor) {
              const busIds = network.buses.map(bus => bus.id)
              const branchIds = network.branches.map(branch => branch.id)
              this.$refs.schematicEditor.unhideBusesAndBranches(busIds, branchIds)
            }

            console.log(`Grew network from ${targetObject.name}:`, network)
            console.log('Total buses:', this.networkData.buses.length)
            console.log('Total branches:', this.networkData.branches.length)
          } else {
            console.error('No network data found for bus:', targetObject.id)
          }
        } catch (err) {
          console.error('Error fetching network data for grow:', err)
          this.error = 'Failed to grow network'
        } finally {
          this.loading = false
        }
      }
    },
    mergeNetworkData(newNetwork) {
      // Helper method to merge new network data without duplicates

      // Merge buses (avoid duplicates by ID)
      const existingBusIds = new Set(this.networkData.buses.map(b => b.id))
      const newBuses = newNetwork.buses.filter(bus => !existingBusIds.has(bus.id))
      this.networkData.buses.push(...newBuses)

      // Merge branches (avoid duplicates by ID)
      const existingBranchIds = new Set(this.networkData.branches.map(b => b.id))
      const newBranches = newNetwork.branches.filter(branch => !existingBranchIds.has(branch.id))
      this.networkData.branches.push(...newBranches)

      console.log(`Added ${newBuses.length} new buses and ${newBranches.length} new branches`)
    },
    handleAddBusClick() {
      console.log('Show Bus clicked from schematic context menu')
      this.showSelectBusDialog = true
    },
    editEquipment(item) {
      console.log('Edit equipment:', item)
      this.currentEquipment = { ...item }
      this.showEquipmentDialog = true
    },
    deleteEquipment(item) {
      console.log('Delete equipment:', item)
      this.itemToDelete = item
      this.showDeleteDialog = true
    },
    cancelDelete() {
      this.showDeleteDialog = false
      this.itemToDelete = null
    },
    async confirmDelete() {
      if (!this.itemToDelete) return

      this.isDeleting = true

      try {
        // Mock API DELETE call
        const equipmentId = this.itemToDelete.equip_id
        console.log(`Calling DELETE /api/terminal-equipment/${equipmentId}`)

        // Simulate API call with 500ms delay
        await new Promise(resolve => setTimeout(resolve, 500))

        // Mock successful response
        const mockResponse = {
          success: true,
          message: `Equipment ${equipmentId} deleted successfully`
        }

        console.log('DELETE response:', mockResponse)

        if (mockResponse.success) {
          // Remove item from the local array
          const index = this.terminalEquipmentData.findIndex(
            eq => eq.equip_id === this.itemToDelete.equip_id
          )

          if (index !== -1) {
            this.terminalEquipmentData.splice(index, 1)
            console.log(`Removed equipment ${equipmentId} from local data`)
          }

          // Close dialog and reset
          this.showDeleteDialog = false
          this.itemToDelete = null
        }
      } catch (error) {
        console.error('Error deleting equipment:', error)
        // In a real app, you might show an error notification here
      } finally {
        this.isDeleting = false
      }
    },
    async handleSelectBus(busData) {
      console.log('Selected bus:', busData)

      try {
        // Fetch network data for the selected bus
        this.loading = true
        const network = await fetchNetworkByBusId(busData.id)

        if (network) {
          // Update network data with the fetched data
          this.networkData = network

          // Mark the bus as selected
          const busWithSelection = { ...busData, selected: true }

          // Clear previous selections and add this bus
          this.selectedBuses = [busWithSelection]

          // Switch to the buses tab to show the selected bus
          this.activeTab = 'buses'

          console.log(`Loaded network for ${busData.name}:`, network)
        } else {
          console.error('No network data found for bus:', busData.id)
          this.error = `No network data found for ${busData.name}`
        }
      } catch (err) {
        console.error('Error fetching network data:', err)
        this.error = 'Failed to load network data'
      } finally {
        this.loading = false
        this.showSelectBusDialog = false
      }
    },
    viewSection(item) {
      console.log('View section:', item)
      this.currentSection = { ...item }
      this.showSectionDialog = true
    },
    addBus(item) {
      console.log('View bus:', item)
      // Find the bus data from the current network data
      const busData = this.networkData.buses.find(b => b.id === item.id)

      this.currentBus = {
        id: item.id,
        name: item.name,
        bus_num: item.bus_num,
        kv: item.kv,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
      this.addBusDialog = true
    },
    viewBranch(item) {
      console.log('View branch:', item)
      // Find the branch data from the current network data
      const branchData = this.networkData.branches.find(b => b.id === item.id)

      this.currentBranch = {
        id: item.id,
        name: item.name,
        bus1_id: item.bus1_id,
        bus2_id: item.bus2_id,
        ckt: branchData ? branchData.ckt : '',
        labelX: 0,
        labelY: 0,
        points: []
      }
      this.showBranchDialog = true
    }
  }
}
</script>

<style scoped>
.page-container {
  height: calc(100vh - 64px);
  padding: 0;
  display: flex;
  flex-direction: column;
}

.schematic-section {
  flex: 0 0 50%;
  overflow: hidden;
  display: flex;
}

.schematic-row {
  flex: 1;
  display: flex !important;
  flex-wrap: nowrap !important;
  height: 100%;
}

.schematic-sheet {
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.data-browser-section {
  flex: 1;
  overflow: auto;
  min-height: 300px;
}

.resize-handle {
  height: 8px;
  cursor: ns-resize;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 10;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.resize-handle.resizing {
  background-color: rgba(0, 123, 255, 0.2);
}

.resize-handle-line {
  width: 40px;
  height: 2px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
}

.resize-handle:hover .resize-handle-line {
  background-color: rgba(0, 123, 255, 0.6);
}

:deep(.summary-row) {
  background-color: rgba(0, 0, 0, 0.05);
  font-weight: bold;
}

.vertical-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background-color: rgb(var(--v-theme-surface));
  min-height: 100%;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.schematic-row .v-col {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
