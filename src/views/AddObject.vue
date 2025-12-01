<template>
  <v-container fluid class="page-container">
    <v-row>
      <v-col>
        <h1 class="text-h4 text-primary mb-4">Add Object</h1>
        <p>Add a node or edge to the diagram</p>
      </v-col>
    </v-row>

    <v-row v-if="loading">
      <v-col class="d-flex justify-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <span class="ml-4">Loading schematic...</span>
      </v-col>
    </v-row>

    <v-alert v-else-if="error" type="error" class="mb-4">
      Error: {{ error }}
    </v-alert>

    <!-- Toolbar with Add Node and Add Branch buttons -->
    <v-toolbar v-if="!loading && !error" density="compact" color="surface">
      <v-btn
        icon="mdi-vector-point-plus"
        @click="handleAddNode"
        :disabled="!isAddNodeEnabled"
        title="Add Node">
      </v-btn>
      <v-btn
        icon="mdi-vector-polyline-plus"
        @click="handleAddBranch"
        :disabled="!isAddBranchEnabled"
        title="Add Branch">
      </v-btn>
    </v-toolbar>

    <!-- Edit Node Dialog -->
    <EditNode
      v-model="showNodeDialog"
      :node="editingNode"
      @save="handleNodeSave"
    />

    <!-- Edit Edge Dialog -->
    <EditEdge
      v-model="showEdgeDialog"
      :edge="editingEdge"
      @save="handleEdgeSave"
    />

    <v-stage v-if="!loading && !error"
      :config="stageConfig"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp">
      <v-layer>
        <!-- Draw edges (branches) with 90-degree routing -->
        <v-line
          v-for="edge in layoutEdges"
          :key="'edge-' + edge.id"
          :config="getEdgeConfig(edge)"
          @click="handleEdgeClick(edge)"
        />

        <!-- Draw edge labels -->
        <v-text
          v-for="edge in layoutEdges"
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
          v-for="node in layoutNodes"
          :key="'node-' + node.id">
          <v-rect
            :config="getNodeConfig(node)"
            @click="handleNodeClick(node)"
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
  </v-container>
</template>


<script>
import ELK from 'elkjs/lib/elk.bundled.js'
import netlistData from '../netlist.json'
import EditNode from '../components/EditNode.vue'
import EditEdge from '../components/EditEdge.vue'

export default {
  name: 'AddObject',
  components: {
    EditNode,
    EditEdge
  },
  data() {
    return {
      loading: true,
      error: null,
      layoutNodes: [],
      layoutEdges: [],
      networkData: { ...netlistData },
      stageConfig: {
        width: window.innerWidth,
        height: window.innerHeight - 60,
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
      showNodeDialog: false,
      showEdgeDialog: false,
      editingNode: null,
      editingEdge: null
    }
  },
  computed: {
    selectedNodes() {
      return this.layoutNodes.filter(node => node.selected)
    },
    isAddNodeEnabled() {
      return this.selectedNodes.length === 0
    },
    isAddBranchEnabled() {
      return this.selectedNodes.length === 2
    }
  },
  async mounted() {
    try {
      await this.computeLayout()
      this.loading = false
      window.addEventListener('resize', this.handleResize)
    } catch (err) {
      this.error = err.message
      this.loading = false
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
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
        children: this.networkData.nodes.map(node => ({
          id: String(node.id),
          width: 5,
          height: 100,
          layoutOptions: {
            'elk.nodeLabels.placement': 'OUTSIDE, H_LEFT, V_BOTTOM',
          },
          labels: [{ text: node.name, width:50, height:10 }]
        })),
        edges: this.networkData.branches.map(branch => ({
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
        const originalNode = this.networkData.nodes.find(n => n.id === parseInt(node.id))

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
          selected: false
        }
      })

      // Process edges - use ELK's routing and label positions
      this.layoutEdges = layout.edges.map(edge => {
        const originalBranch = this.networkData.branches.find(b => b.id === parseInt(edge.id))
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
          selected: false
        }
      })
    },
    handleResize() {
      this.stageConfig.width = window.innerWidth
      this.stageConfig.height = window.innerHeight - 60
    },
    getNodeConfig(node) {
      const baseConfig = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        fill: '#000',
        hitStrokeWidth: 20  // Wider invisible hit area for easier clicking
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
    handleNodeClick(node) {
      // Toggle selection
      node.selected = !node.selected

      // Deselect all edges when selecting a node
      if (node.selected) {
        this.layoutEdges.forEach(edge => edge.selected = false)
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
    handleEdgeClick(edge) {
      // Toggle selection
      edge.selected = !edge.selected

      // Deselect all nodes when selecting an edge
      if (edge.selected) {
        this.layoutNodes.forEach(node => node.selected = false)
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
    handleAddNode() {
      console.log('Add Node button clicked')

      // Create a new node with default values
      const newNodeId = Math.max(...this.networkData.nodes.map(n => n.id), 0) + 1
      this.editingNode = {
        id: newNodeId,
        name: `Node ${newNodeId}`,
        node_num: String(100 + newNodeId),
        kv: '138',
        x: 0,
        y: 0,
        width: 5,
        height: 100
      }

      this.showNodeDialog = true
    },
    handleAddBranch() {
      console.log('Add Branch button clicked')

      // Get the two selected nodes
      const selectedNodes = this.selectedNodes
      if (selectedNodes.length !== 2) {
        console.error('Must have exactly 2 nodes selected')
        return
      }

      // Create a new branch with the selected nodes
      const newBranchId = Math.max(...this.networkData.branches.map(b => b.id), 0) + 1
      const node1 = this.networkData.nodes.find(n => n.id === parseInt(selectedNodes[0].id))
      const node2 = this.networkData.nodes.find(n => n.id === parseInt(selectedNodes[1].id))

      this.editingEdge = {
        id: newBranchId,
        name: `${node1.name} - ${node2.name}`,
        node1_id: node1.id,
        node2_id: node2.id,
        ckt: '1',
        labelX: 0,
        labelY: 0,
        points: []
      }

      this.showEdgeDialog = true
    },
    async handleNodeSave(nodeData) {
      console.log('Saving node:', nodeData)

      // Add the new node to the network data
      this.networkData.nodes.push({
        id: nodeData.id,
        name: nodeData.name,
        node_num: nodeData.node_num,
        kv: nodeData.kv
      })

      // Redraw the network
      await this.computeLayout()

      console.log('Node added successfully')
    },
    async handleEdgeSave(edgeData) {
      console.log('Saving edge:', edgeData)

      // Add the new branch to the network data
      this.networkData.branches.push({
        id: edgeData.id,
        name: edgeData.name,
        node1_id: edgeData.node1_id,
        node2_id: edgeData.node2_id,
        ckt: edgeData.ckt
      })

      // Deselect all nodes
      this.layoutNodes.forEach(node => node.selected = false)

      // Redraw the network
      await this.computeLayout()

      console.log('Branch added successfully')
    }
  }
}
</script>

<style scoped>
.page-container {
  height: calc(100vh - 64px);
  padding: 0;
}
</style>
