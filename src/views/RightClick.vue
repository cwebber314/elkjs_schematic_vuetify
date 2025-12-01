<template>
  <v-container fluid class="page-container">
    <v-row>
      <v-col>
        <h1 class="text-h4 text-primary mb-4">Right-Click</h1>
        <p>Add a right click menu to parts in the canvas</p>
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

    <v-stage v-else
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
          @click="handleEdgeClick(edge)"
          @contextmenu="handleEdgeRightClick(edge, $event)"
        />

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
            @click="handleNodeClick(node)"
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
  </v-container>
</template>


<script>
import ELK from 'elkjs/lib/elk.bundled.js'
import netlistData from '../netlist.json'

export default {
  name: 'RightClick',
  data() {
    return {
      loading: true,
      error: null,
      layoutNodes: [],
      layoutEdges: [],
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
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        objectType: '',
        targetObject: null
      }
    }
  },
  computed: {
    visibleNodes() {
      return this.layoutNodes.filter(node => !node.hidden)
    },
    visibleEdges() {
      return this.layoutEdges.filter(edge => !edge.hidden)
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
    handleStageClick(e) {
      // Check if the click was on the stage/layer (background) and not on a shape
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.getType() === 'Layer'

      if (clickedOnEmpty) {
        // Deselect all objects
        this.layoutNodes.forEach(node => node.selected = false)
        this.layoutEdges.forEach(edge => edge.selected = false)
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
    handleEdgeRightClick(edge, e) {
      // Prevent default context menu
      e.evt.preventDefault()

      // Deselect all objects
      this.layoutNodes.forEach(n => n.selected = false)
      this.layoutEdges.forEach(e => e.selected = false)

      // Select the right-clicked edge
      edge.selected = true

      // Set context menu properties
      this.contextMenu.show = false // Hide first to reset position
      this.contextMenu.x = e.evt.clientX
      this.contextMenu.y = e.evt.clientY
      this.contextMenu.objectType = 'Branch'
      this.contextMenu.targetObject = edge

      // Show menu on next tick
      this.$nextTick(() => {
        this.contextMenu.show = true
      })

      console.log('Edge right-clicked:', edge.name, 'at', e.evt.clientX, e.evt.clientY)
    },
    handleClickOutside() {
      // Close context menu when clicking anywhere
      this.contextMenu.show = false
    },
    handleProperties() {
      console.log('Properties clicked for:', this.contextMenu.objectType, this.contextMenu.targetObject)
      // TODO: Implement properties dialog
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
      }

      this.contextMenu.show = false
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
