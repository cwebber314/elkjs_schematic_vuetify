<template>
  <v-container fluid class="page-container">
    <!-- Schematic Editor Section -->
    <v-row class="schematic-section">
      <v-col>
        <SchematicEditor2
          :netlist-data="netlistData"
          :width="editorWidth"
          :height="editorHeight"
          @node-click="handleNodeClick"
          @edge-click="handleEdgeClick"
          @terminal-click="handleTerminalClick"
          @selection-changed="handleSelectionChanged"
          @properties-click="handlePropertiesClick"
          @grow-click="handleGrowClick"
        />
      </v-col>
    </v-row>

    <!-- Data Browser Section -->
    <v-row v-if="!loading && !error" class="data-browser-section">
      <v-col>
        <v-card>
          <v-tabs v-model="activeTab" bg-color="primary">
            <v-tab value="branches">Branches</v-tab>
            <v-tab value="busses">Busses</v-tab>
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

              <!-- Busses Tab -->
              <v-window-item value="busses">
                <v-data-table
                  :headers="bussesHeaders"
                  :items="selectedBusses"
                  :items-per-page="5"
                  class="elevation-1"
                  density="compact">
                  <template v-slot:top>
                    <v-toolbar flat>
                      <v-toolbar-title>Selected Busses ({{ selectedBusses.length }})</v-toolbar-title>
                    </v-toolbar>
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-icon
                      size="small"
                      color="blue"
                      @click="viewBus(item)"
                      title="View Details">
                      mdi-information-outline
                    </v-icon>
                  </template>
                  <template v-slot:no-data>
                    <v-alert type="info" class="ma-2">
                      No busses selected. Click on a bus (node rectangle) in the schematic to view its details.
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
    <EditEdge
      v-if="currentBranch"
      v-model="showBranchDialog"
      :edge="currentBranch"
    />

    <EditNode
      v-if="currentBus"
      v-model="showBusDialog"
      :node="currentBus"
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
import netlistData from '../netlist.json'
import terminalEquipmentData from '../terminal_equipment.json'
import sectionsData from '../sections.json'
import SchematicEditor2 from '../components/SchematicEditor2.vue'
import EditEdge from '../components/EditEdge.vue'
import EditNode from '../components/EditNode.vue'
import ViewEquipment from '../components/ViewEquipment.vue'
import ViewSection from '../components/ViewSection.vue'

export default {
  name: 'TerminalCRUDComponent',
  components: {
    SchematicEditor2,
    EditEdge,
    EditNode,
    ViewEquipment,
    ViewSection
  },
  data() {
    return {
      netlistData,
      terminalEquipmentData: [...terminalEquipmentData],
      loading: false,
      error: null,
      selectedNodes: [],
      selectedEdges: [],
      activeTerminals: {},
      activeTab: 'branches',
      expandedSectionGroups: [],
      editorWidth: window.innerWidth - 48,
      editorHeight: window.innerHeight * 0.5 - 80,
      // Dialog states
      showBranchDialog: false,
      showBusDialog: false,
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
        { title: 'Node 1', key: 'node1_name', sortable: true },
        { title: 'Node 2', key: 'node2_name', sortable: true },
        { title: 'Node 1 ID', key: 'node1_id', sortable: true },
        { title: 'Node 2 ID', key: 'node2_id', sortable: true }
      ],
      bussesHeaders: [
        { title: 'Actions', key: 'actions', sortable: false, width: '80px' },
        { title: 'ID', key: 'id', sortable: true },
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Node Number', key: 'node_num', sortable: true },
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
        { title: 'Node', key: 'node_name', sortable: true },
        { title: 'Branch ID', key: 'branch_id', sortable: true },
        { title: 'Node ID', key: 'node_id', sortable: true }
      ]
    }
  },
  computed: {
    selectedBranches() {
      // Get selected edges and combine with original branch data
      return this.selectedEdges.map(edge => {
        const branchData = netlistData.branches.find(b => b.id === parseInt(edge.id))
        const node1 = netlistData.nodes.find(n => n.id === branchData.node1_id)
        const node2 = netlistData.nodes.find(n => n.id === branchData.node2_id)

        return {
          id: branchData.id,
          name: branchData.name,
          node1_id: branchData.node1_id,
          node2_id: branchData.node2_id,
          node1_name: node1 ? node1.name : 'Unknown',
          node2_name: node2 ? node2.name : 'Unknown'
        }
      })
    },
    selectedBusses() {
      // Get selected nodes and combine with original node data
      return this.selectedNodes.map(node => {
        const nodeData = netlistData.nodes.find(n => n.id === parseInt(node.id))

        return {
          id: nodeData.id,
          name: nodeData.name,
          node_num: nodeData.node_num,
          kv: nodeData.kv
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
        const branchData = netlistData.branches.find(b => b.id === branchId)
        const branchName = branchData ? branchData.name : `Branch ${branchId}`
        const branchSections = sectionsData.filter(section => section.branch_id === branchId)

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
      Object.keys(this.activeTerminals).forEach(edgeId => {
        const terminals = this.activeTerminals[edgeId]
        const branchData = netlistData.branches.find(b => b.id === parseInt(edgeId))

        if (!branchData) return

        // Check start terminal
        if (terminals.start) {
          const nodeId = branchData.node1_id
          const branchId = branchData.id

          // Find all equipment for this branch and node
          const terminalEquip = this.terminalEquipmentData.filter(
            eq => eq.branch_id === branchId && eq.node_id === nodeId
          )
          equipment.push(...terminalEquip)
        }

        // Check end terminal
        if (terminals.end) {
          const nodeId = branchData.node2_id
          const branchId = branchData.id

          // Find all equipment for this branch and node
          const terminalEquip = this.terminalEquipmentData.filter(
            eq => eq.branch_id === branchId && eq.node_id === nodeId
          )
          equipment.push(...terminalEquip)
        }
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
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    // Helper method to sum section lengths
    sumSectionLengths(sections) {
      return sections.reduce((sum, section) => sum + section.length_mi, 0)
    },
    handleSelectionChanged({ nodes, edges, terminals }) {
      this.selectedNodes = nodes
      this.selectedEdges = edges
      this.activeTerminals = terminals
    },
    handleNodeClick(node) {
      if (node.selected) {
        this.activeTab = 'busses'
      }
    },
    handleEdgeClick(edge) {
      if (edge.selected) {
        this.activeTab = 'branches'
      }
    },
    handleTerminalClick({ edge, terminalEnd, selected }) {
      if (selected) {
        this.activeTab = 'terminal-equipment'
      }
    },
    handleResize() {
      this.editorWidth = window.innerWidth - 48
      this.editorHeight = window.innerHeight * 0.5 - 80
    },
    handlePropertiesClick({ objectType, targetObject }) {
      console.log('Properties clicked from context menu:', objectType, targetObject)

      if (objectType === 'Node') {
        // Open EditNode dialog
        const nodeData = netlistData.nodes.find(n => n.id === parseInt(targetObject.id))

        this.currentBus = {
          id: targetObject.id,
          name: targetObject.name,
          node_num: nodeData ? nodeData.node_num : '',
          kv: nodeData ? nodeData.kv : '',
          x: targetObject.x || 0,
          y: targetObject.y || 0,
          width: targetObject.width || 0,
          height: targetObject.height || 0
        }
        this.showBusDialog = true
      } else if (objectType === 'Branch') {
        // Open EditEdge dialog
        const branchData = netlistData.branches.find(b => b.id === parseInt(targetObject.id))

        this.currentBranch = {
          id: targetObject.id,
          name: targetObject.name,
          node1_id: branchData ? branchData.node1_id : '',
          node2_id: branchData ? branchData.node2_id : '',
          ckt: branchData ? branchData.ckt : '',
          labelX: targetObject.labelX || 0,
          labelY: targetObject.labelY || 0,
          points: targetObject.points || []
        }
        this.showBranchDialog = true
      }
    },
    handleGrowClick({ objectType, targetObject }) {
      console.log('Grow clicked from context menu:', objectType, targetObject)
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
    viewSection(item) {
      console.log('View section:', item)
      this.currentSection = { ...item }
      this.showSectionDialog = true
    },
    viewBus(item) {
      console.log('View bus:', item)
      // We don't have layoutNode anymore, so just use the basic data
      const nodeData = netlistData.nodes.find(n => n.id === item.id)

      this.currentBus = {
        id: item.id,
        name: item.name,
        node_num: item.node_num,
        kv: item.kv,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
      this.showBusDialog = true
    },
    viewBranch(item) {
      console.log('View branch:', item)
      // We don't have layoutEdge anymore, so just use the basic data
      const branchData = netlistData.branches.find(b => b.id === item.id)

      this.currentBranch = {
        id: item.id,
        name: item.name,
        node1_id: item.node1_id,
        node2_id: item.node2_id,
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

:deep(.summary-row) {
  background-color: rgba(0, 0, 0, 0.05);
  font-weight: bold;
}
</style>
