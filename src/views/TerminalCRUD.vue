<template>
  <v-container fluid class="page-container">
    <!-- Schematic Editor Section -->
    <v-row v-if="loading">
      <v-col class="d-flex justify-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <span class="ml-4">Loading schematic...</span>
      </v-col>
    </v-row>

    <v-alert v-else-if="error" type="error" class="mb-4">
      Error: {{ error }}
    </v-alert>

    <v-row v-else class="schematic-section">
      <v-col>
        <v-sheet class="schematic-sheet">
          <v-stage
            :config="stageConfig"
            @wheel="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @click="handleStageClick"
            @contextmenu="handleStageRightClick">
            <v-layer>
              <!-- Draw edges (branches) with 90-degree routing -->
              <v-line
                v-for="edge in visibleEdges"
                :key="'edge-' + edge.id"
                :config="getEdgeConfig(edge)"
                @click="handleEdgeClick(edge, $event)"
                @contextmenu="handleEdgeRightClick(edge, $event)"
              />

              <!-- Draw terminal caps when terminal is selected -->
              <template v-for="edge in visibleEdges" :key="'terminal-caps-' + edge.id">
                <v-line
                  v-for="(cap, index) in getTerminalCaps(edge)"
                  :key="'cap-' + edge.id + '-' + index"
                  :config="cap.config"
                  @click="handleTerminalCapClick(edge, cap, $event)"
                  @contextmenu="handleTerminalCapRightClick(edge, cap, $event)"
                />
              </template>

              <!-- Draw edge labels -->
              <v-text
                v-for="edge in visibleEdges"
                :key="'edge-label-' + edge.id"
                :config="{
                  x: edge.labelX,
                  y: edge.labelY,
                  text: edge.name,
                  fontSize: 12,
                  fill: '#333',
                  align: 'center'
                }"
              />

              <!-- Draw nodes as rectangles -->
              <v-group
                v-for="node in visibleNodes"
                :key="'node-' + node.id">
                <v-rect
                  :config="getNodeConfig(node)"
                  @click="handleNodeClick(node, $event)"
                  @contextmenu="handleNodeRightClick(node, $event)"
                />
                <v-text
                  :config="{
                    x: node.labelX,
                    y: node.labelY,
                    text: node.name,
                    fontSize: 14,
                    fontStyle: 'bold',
                    fill: '#000'
                  }"
                />
              </v-group>
            </v-layer>
          </v-stage>
        </v-sheet>
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
                  :items-per-page="10"
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

    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      :style="{
        position: 'fixed',
        left: contextMenu.x + 'px',
        top: contextMenu.y + 'px',
        zIndex: 9999
      }"
      @contextmenu.prevent>
      <v-card>
        <v-list dense>
          <v-list-subheader>{{ contextMenu.objectType }}</v-list-subheader>
          <v-list-item @click="handleProperties">
            <v-list-item-title>Properties</v-list-item-title>
          </v-list-item>
          <v-list-item @click="handleHide">
            <v-list-item-title>Hide</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </div>

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
  </v-container>
</template>


<script>
import ELK from 'elkjs/lib/elk.bundled.js'
import netlistData from '../netlist.json'
import terminalEquipmentData from '../terminal_equipment.json'
import sectionsData from '../sections.json'
import EditEdge from '../components/EditEdge.vue'
import EditNode from '../components/EditNode.vue'
import ViewEquipment from '../components/ViewEquipment.vue'
import ViewSection from '../components/ViewSection.vue'

export default {
  name: 'TerminalCRUD',
  components: {
    EditEdge,
    EditNode,
    ViewEquipment,
    ViewSection
  },
  data() {
    return {
      loading: true,
      error: null,
      layoutNodes: [],
      layoutEdges: [],
      activeTerminals: {}, // Track which terminals are active { edgeId: { start: bool, end: bool } }
      activeTab: 'branches', // Active tab in data browser
      expandedSectionGroups: [], // Track which section groups are expanded
      // Dialog states
      showBranchDialog: false,
      showBusDialog: false,
      showEquipmentDialog: false,
      showSectionDialog: false,
      currentBranch: null,
      currentBus: null,
      currentEquipment: null,
      currentSection: null,
      stageConfig: {
        width: window.innerWidth - 48, // Account for padding
        height: window.innerHeight * 0.5 - 80, // Account for toolbar and margins
        draggable: true,
        x: 50,
        y: 50
      },
      isDragging: false,
      lastMousePos: null,
      selectionStyle: {
        stroke: '#9333EA',
        strokeWidth: 3
      },
      nodeStyle: {
        stroke: '#000',
        strokeWidth: 1
      },
      edgeStyle: {
        stroke: '#2196F3',
        strokeWidth: 2
      },
      terminalStyle: {
        normalColor: '#2196F3',
        selectedColor: '#9333EA'
      },
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        objectType: '',
        targetObject: null
      },
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
    visibleNodes() {
      return this.layoutNodes.filter(node => !node.hidden)
    },
    visibleEdges() {
      return this.layoutEdges.filter(edge => !edge.hidden)
    },
    selectedBranches() {
      // Get selected edges and combine with original branch data
      return this.layoutEdges
        .filter(edge => edge.selected)
        .map(edge => {
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
      return this.layoutNodes
        .filter(node => node.selected)
        .map(node => {
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
      const selectedBranchIds = this.layoutEdges
        .filter(edge => edge.selected)
        .map(edge => parseInt(edge.id))

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
          const terminalEquip = terminalEquipmentData.filter(
            eq => eq.branch_id === branchId && eq.node_id === nodeId
          )
          equipment.push(...terminalEquip)
        }

        // Check end terminal
        if (terminals.end) {
          const nodeId = branchData.node2_id
          const branchId = branchData.id

          // Find all equipment for this branch and node
          const terminalEquip = terminalEquipmentData.filter(
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
  async mounted() {
    try {
      await this.computeLayout()
      this.loading = false
      window.addEventListener('resize', this.handleResize)
      window.addEventListener('click', this.handleClickOutside)
    } catch (err) {
      this.error = err.message
      this.loading = false
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    // Helper method to sum section lengths
    sumSectionLengths(sections) {
      return sections.reduce((sum, section) => sum + section.length_mi, 0)
    },
    async computeLayout() {
      const elk = new ELK()

      // Prepare the graph for ELK
      // Ports have to be explicitly defined. Probably doesn't make sense for
      // busses with infinite number of connects.
      // Port params don't affect anything in this example.
      const graph = {
        id: "root",
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': '30', // this routes edges away from nodes so labels don't overlap edges.
          'elk.layered.spacing.nodeNodeBetweenLayers': '100',
          'elk.spacing.edgeEdge': 20,
          'elk.edgeLabels.placement': 'TAIL',
          'elk.edgeRouting': 'ORTHOGONAL',
          // 'elk.layered.nodePlacement.strategy': 'SIMPLE',
          // 'elk.nodeLabels.placement': 'OUTSIDE, H_LEFT, V_BOTTOM', // I can't get this to work in global
        },
        children: netlistData.nodes.map(node => ({
          id: String(node.id),
          width: 5,
          height: 100,
          layoutOptions: {
            'elk.nodeLabels.placement': 'OUTSIDE, H_LEFT, V_BOTTOM',
          },
          labels: [{ text: node.name, width:50, height:10 }]
        })),
        edges: netlistData.branches.map(branch => ({
          id: String(branch.id),
          layoutOptions: {
            'elk.edgeLabels.placement': 'TAIL',
          },
          sources: [String(branch.node1_id)],
          targets: [String(branch.node2_id)],
          labels: [{ text: branch.name, width:50, height:10 }]
        }))
      }

      // Compute layout
      const layout = await elk.layout(graph)

      // Process nodes - manual label positioning
      this.layoutNodes = layout.children.map(node => {
        const originalNode = netlistData.nodes.find(n => n.id === parseInt(node.id))

        // Position label to the right and below the node
        // console.log('Node label:', node.labels[0].text, 'at', node.labels[0].x, node.labels[0].x)
        const labelX = node.x + node.labels[0].x
        const labelY = node.y + node.labels[0].y

        // console.log(node.labels)
        return {
          id: node.id,
          name: originalNode.name,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          labelX,
          labelY,
          selected: false,
          hidden: false
        }
      })

      // Process edges - use ELK's routing and label positions
      this.layoutEdges = layout.edges.map(edge => {
        const originalBranch = netlistData.branches.find(b => b.id === parseInt(edge.id))
        const sections = edge.sections || []
        const points = []

        if (sections.length > 0) {
          const section = sections[0]

          // Start point
          points.push(section.startPoint.x, section.startPoint.y)

          // Bend points (these create the 90-degree angles)
          if (section.bendPoints) {
            section.bendPoints.forEach(bp => {
              points.push(bp.x, bp.y)
            })
          }

          // End point
          points.push(section.endPoint.x, section.endPoint.y)
        }

        // Use ELK's computed label position
        let labelX = 0, labelY = 0
        if (edge.labels && edge.labels.length > 0) {
          const label = edge.labels[0]
          labelX = label.x
          labelY = label.y
          // console.log('Edge label:', label.text, 'at', labelX, labelY)
        }

        return {
          id: edge.id,
          name: originalBranch.name,
          points,
          labelX,
          labelY,
          selected: false,
          hidden: false
        }
      })
    },
    handleResize() {
      this.stageConfig.width = window.innerWidth - 48
      this.stageConfig.height = window.innerHeight * 0.5 - 80
    },
    getNodeConfig(node) {
      const baseConfig = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        fill: '#000',
        // hitStrokeWidth: 5  // Nodes are thick already and easy to click
      }

      if (node.selected) {
        return { ...baseConfig, ...this.selectionStyle }
      }
      return { ...baseConfig, ...this.nodeStyle }
    },
    getEdgeConfig(edge) {
      const baseConfig = {
        points: edge.points,
        lineJoin: 'miter',
        lineCap: 'butt',
        hitStrokeWidth: 20  // Wider invisible hit area for easier clicking
      }

      if (edge.selected) {
        return { ...baseConfig, ...this.selectionStyle }
      }
      return { ...baseConfig, ...this.edgeStyle }
    },
    getTerminalCaps(edge) {
      const caps = []
      const points = edge.points

      if (points.length < 4) return caps

      const terminals = this.activeTerminals[edge.id] || {}
      const terminalLength = 10
      const terminalStrokeWidth = 7
      const orangeColor = this.terminalStyle.normalColor
      const purpleColor = this.terminalStyle.selectedColor

      // Helper to calculate a point along a line segment
      const getPointAtDistance = (x1, y1, x2, y2, distance) => {
        const dx = x2 - x1
        const dy = y2 - y1
        const length = Math.sqrt(dx * dx + dy * dy)
        const ratio = Math.min(distance / length, 1)
        return {
          x: x1 + dx * ratio,
          y: y1 + dy * ratio
        }
      }

      // Draw start terminal cap - 20px from the start
      const startX = points[0]
      const startY = points[1]
      const nextX = points[2]
      const nextY = points[3]
      const startEndPoint = getPointAtDistance(startX, startY, nextX, nextY, terminalLength)
      const startSelected = terminals.start || false

      caps.push({
        config: {
          points: [startX, startY, startEndPoint.x, startEndPoint.y],
          stroke: startSelected ? purpleColor : orangeColor,
          strokeWidth: terminalStrokeWidth,
          lineJoin: 'miter',
          lineCap: 'round',
          hitStrokeWidth: 20
        },
        terminalEnd: 'start'
      })

      // Draw end terminal cap - 20px from the end
      const len = points.length
      const endX = points[len - 2]
      const endY = points[len - 1]
      const prevX = points[len - 4]
      const prevY = points[len - 3]
      const endStartPoint = getPointAtDistance(endX, endY, prevX, prevY, terminalLength)
      const endSelected = terminals.end || false

      caps.push({
        config: {
          points: [endX, endY, endStartPoint.x, endStartPoint.y],
          stroke: endSelected ? purpleColor : orangeColor,
          strokeWidth: terminalStrokeWidth,
          lineJoin: 'miter',
          lineCap: 'round',
          hitStrokeWidth: 20
        },
        terminalEnd: 'end'
      })

      return caps
    },
    handleNodeClick(node, e) {
      const shiftKey = e?.evt?.shiftKey || false

      if (!shiftKey) {
        // Deselect all other objects when not shift-clicking
        this.layoutNodes.forEach(n => {
          if (n !== node) n.selected = false
        })
        this.layoutEdges.forEach(edge => edge.selected = false)
        Object.keys(this.activeTerminals).forEach(edgeId => {
          this.activeTerminals[edgeId].start = false
          this.activeTerminals[edgeId].end = false
        })
      }

      // Toggle selection of clicked node
      node.selected = !node.selected

      // Switch to busses tab when a node is selected
      if (node.selected) {
        this.activeTab = 'busses'
      }

      console.log('Node clicked:', node)
      console.log('Node attributes:', {
        id: node.id,
        name: node.name,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        labelX: node.labelX,
        labelY: node.labelY,
        selected: node.selected
      })
    },
    handleEdgeClick(edge, e) {
      const shiftKey = e?.evt?.shiftKey || false

      if (!shiftKey) {
        // Deselect all other objects when not shift-clicking
        this.layoutNodes.forEach(node => node.selected = false)
        this.layoutEdges.forEach(e => {
          if (e !== edge) e.selected = false
        })
        Object.keys(this.activeTerminals).forEach(edgeId => {
          this.activeTerminals[edgeId].start = false
          this.activeTerminals[edgeId].end = false
        })
      }

      // Toggle selection of clicked edge
      edge.selected = !edge.selected

      // Switch to branches tab when an edge is selected
      if (edge.selected) {
        this.activeTab = 'branches'
      }

      console.log('Edge clicked:', edge)
      console.log('Edge attributes:', {
        id: edge.id,
        name: edge.name,
        points: edge.points,
        labelX: edge.labelX,
        labelY: edge.labelY,
        selected: edge.selected
      })
    },
    handleWheel(e) {
      e.evt.preventDefault()
      const stage = e.target.getStage()
      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale
      }

      const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1

      stage.scale({ x: newScale, y: newScale })

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale
      }

      stage.position(newPos)
    },
    handleMouseDown(e) {
      if (e.evt.button === 0) { // Left mouse button
        this.isDragging = true
        this.lastMousePos = {
          x: e.evt.clientX,
          y: e.evt.clientY
        }
      }
    },
    handleMouseMove(e) {
      if (this.isDragging && this.lastMousePos) {
        const dx = e.evt.clientX - this.lastMousePos.x
        const dy = e.evt.clientY - this.lastMousePos.y

        this.stageConfig.x += dx
        this.stageConfig.y += dy

        this.lastMousePos = {
          x: e.evt.clientX,
          y: e.evt.clientY
        }
      }
    },
    handleMouseUp() {
      this.isDragging = false
      this.lastMousePos = null
    },
    handleStageClick(e) {
      // Check if the click was on the stage/layer (background) and not on a shape
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.getType() === 'Layer'

      if (clickedOnEmpty) {
        // Deselect all objects
        this.layoutNodes.forEach(node => node.selected = false)
        this.layoutEdges.forEach(edge => edge.selected = false)

        // Deselect all terminals
        Object.keys(this.activeTerminals).forEach(edgeId => {
          this.activeTerminals[edgeId].start = false
          this.activeTerminals[edgeId].end = false
        })

        console.log('Canvas background clicked - deselecting all')
      }
    },
    handleStageRightClick(e) {
      // Prevent default browser context menu on canvas
      e.evt.preventDefault()
      console.log('Right-click on canvas background - default menu prevented')
    },
    handleNodeRightClick(node, e) {
      // Prevent default context menu
      e.evt.preventDefault()

      // Deselect all objects
      this.layoutNodes.forEach(n => n.selected = false)
      this.layoutEdges.forEach(edge => edge.selected = false)

      // Select the right-clicked node
      node.selected = true

      // Set context menu properties
      this.contextMenu.show = false // Hide first to reset position
      this.contextMenu.x = e.evt.clientX
      this.contextMenu.y = e.evt.clientY
      this.contextMenu.objectType = 'Node'
      this.contextMenu.targetObject = node

      // Show menu on next tick
      this.$nextTick(() => {
        this.contextMenu.show = true
      })

      console.log('Node right-clicked:', node.name, 'at', e.evt.clientX, e.evt.clientY)
    },
    handleTerminalCapClick(edge, cap, e) {
      const shiftKey = e?.evt?.shiftKey || false

      console.log('Terminal cap clicked:', cap.terminalEnd, 'of edge', edge.name)

      if (!shiftKey) {
        // Deselect all other objects when not shift-clicking
        this.layoutNodes.forEach(node => node.selected = false)
        this.layoutEdges.forEach(e => e.selected = false)
        Object.keys(this.activeTerminals).forEach(edgeId => {
          if (edgeId !== edge.id) {
            this.activeTerminals[edgeId].start = false
            this.activeTerminals[edgeId].end = false
          } else {
            // Deselect the other end of the same edge
            const otherEnd = cap.terminalEnd === 'start' ? 'end' : 'start'
            this.activeTerminals[edgeId][otherEnd] = false
          }
        })
      }

      // Toggle terminal cap selection
      if (!this.activeTerminals[edge.id]) {
        this.activeTerminals[edge.id] = { start: false, end: false }
      }

      // Toggle the clicked terminal
      const wasSelected = this.activeTerminals[edge.id][cap.terminalEnd]
      this.activeTerminals[edge.id][cap.terminalEnd] = !wasSelected

      // Switch to terminal equipment tab when a terminal is selected
      if (!wasSelected) {
        this.activeTab = 'terminal-equipment'
      }

      console.log(`Terminal ${cap.terminalEnd} ${wasSelected ? 'deselected' : 'selected'}`)
    },
    handleTerminalCapRightClick(edge, cap, e) {
      // Prevent default context menu
      e.evt.preventDefault()

      // Find the nearby bus
      const branch = this.getBranchById(edge.id)
      let nearbyBus = null
      if (branch) {
        const nodeId = cap.terminalEnd === 'start' ? branch.node1_id : branch.node2_id
        nearbyBus = this.getNodeById(nodeId)
      }

      // Deselect all objects
      this.layoutNodes.forEach(n => n.selected = false)
      this.layoutEdges.forEach(e => e.selected = false)

      // Select the edge
      edge.selected = true

      // Activate the terminal cap visualization
      if (!this.activeTerminals[edge.id]) {
        this.activeTerminals[edge.id] = { start: false, end: false }
      }
      this.activeTerminals[edge.id][cap.terminalEnd] = true

      // Set context menu properties for terminal
      this.contextMenu.show = false
      this.contextMenu.x = e.evt.clientX
      this.contextMenu.y = e.evt.clientY
      this.contextMenu.objectType = 'Terminal'
      this.contextMenu.targetObject = {
        edge: edge,
        terminalEnd: cap.terminalEnd,
        bus: nearbyBus
      }

      // Show menu on next tick
      this.$nextTick(() => {
        this.contextMenu.show = true
      })

      console.log('Terminal cap right-clicked:', cap.terminalEnd, 'of', edge.name, nearbyBus ? 'nearby bus: ' + nearbyBus.name : '')
    },
    handleEdgeRightClick(edge, e) {
      // Prevent default context menu
      e.evt.preventDefault()

      // Deselect all objects
      this.layoutNodes.forEach(n => n.selected = false)
      this.layoutEdges.forEach(e => e.selected = false)

      // Select the right-clicked edge
      edge.selected = true

      // Set context menu properties for branch
      this.contextMenu.show = false
      this.contextMenu.x = e.evt.clientX
      this.contextMenu.y = e.evt.clientY
      this.contextMenu.objectType = 'Branch'
      this.contextMenu.targetObject = edge

      // Show menu on next tick
      this.$nextTick(() => {
        this.contextMenu.show = true
      })

      console.log('Branch right-clicked:', edge.name)
    },
    getBranchById(id) {
      return netlistData.branches.find(b => b.id === parseInt(id))
    },
    getNodeById(id) {
      return netlistData.nodes.find(n => n.id === id)
    },
    handleClickOutside() {
      // Unselect terminal if context menu was showing a terminal
      if (this.contextMenu.objectType === 'Terminal' && this.contextMenu.targetObject) {
        const edge = this.contextMenu.targetObject.edge
        const terminalEnd = this.contextMenu.targetObject.terminalEnd
        if (this.activeTerminals[edge.id]) {
          this.activeTerminals[edge.id][terminalEnd] = false
        }
      }

      // Close context menu when clicking anywhere
      this.contextMenu.show = false
    },
    handleProperties() {
      console.log('Properties clicked for:', this.contextMenu.objectType, this.contextMenu.targetObject)
      // TODO: Implement properties dialog

      // Unselect terminal if showing terminal menu
      if (this.contextMenu.objectType === 'Terminal' && this.contextMenu.targetObject) {
        const edge = this.contextMenu.targetObject.edge
        const terminalEnd = this.contextMenu.targetObject.terminalEnd
        if (this.activeTerminals[edge.id]) {
          this.activeTerminals[edge.id][terminalEnd] = false
        }
      }

      this.contextMenu.show = false
    },
    handleHide() {
      const target = this.contextMenu.targetObject

      if (this.contextMenu.objectType === 'Node') {
        // Hide node by setting a hidden flag
        target.hidden = true
        console.log('Hiding node:', target.name)
      } else if (this.contextMenu.objectType === 'Branch') {
        // Hide edge by setting a hidden flag
        target.hidden = true
        console.log('Hiding branch:', target.name)
      } else if (this.contextMenu.objectType === 'Terminal') {
        // Unselect terminal
        const edge = target.edge
        const terminalEnd = target.terminalEnd
        if (this.activeTerminals[edge.id]) {
          this.activeTerminals[edge.id][terminalEnd] = false
        }
      }

      this.contextMenu.show = false
    },
    editEquipment(item) {
      console.log('Edit equipment:', item)
      this.currentEquipment = { ...item }
      this.showEquipmentDialog = true
    },
    deleteEquipment(item) {
      console.log('Delete equipment:', item)
      // TODO: Implement delete confirmation and logic
    },
    viewSection(item) {
      console.log('View section:', item)
      this.currentSection = { ...item }
      this.showSectionDialog = true
    },
    viewBus(item) {
      console.log('View bus:', item)
      // Find the full node data from layoutNodes
      const layoutNode = this.layoutNodes.find(n => n.id === String(item.id))
      const nodeData = netlistData.nodes.find(n => n.id === item.id)

      this.currentBus = {
        id: item.id,
        name: item.name,
        node_num: item.node_num,
        kv: item.kv,
        x: layoutNode ? layoutNode.x : 0,
        y: layoutNode ? layoutNode.y : 0,
        width: layoutNode ? layoutNode.width : 0,
        height: layoutNode ? layoutNode.height : 0
      }
      this.showBusDialog = true
    },
    viewBranch(item) {
      console.log('View branch:', item)
      // Find the full edge data from layoutEdges
      const layoutEdge = this.layoutEdges.find(e => e.id === String(item.id))
      const branchData = netlistData.branches.find(b => b.id === item.id)

      this.currentBranch = {
        id: item.id,
        name: item.name,
        node1_id: item.node1_id,
        node2_id: item.node2_id,
        ckt: branchData ? branchData.ckt : '',
        labelX: layoutEdge ? layoutEdge.labelX : 0,
        labelY: layoutEdge ? layoutEdge.labelY : 0,
        points: layoutEdge ? layoutEdge.points : []
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
