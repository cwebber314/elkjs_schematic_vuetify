<template>
  <div class="schematic-editor">
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
  </div>
</template>

<script>
import ELK from 'elkjs/lib/elk.bundled.js'

export default {
  name: 'SchematicEditor',
  props: {
    netlistData: {
      type: Object,
      required: true
    },
    width: {
      type: Number,
      default: () => window.innerWidth
    },
    height: {
      type: Number,
      default: () => window.innerHeight - 60
    }
  },
  emits: ['node-click', 'edge-click'],
  data() {
    return {
      loading: true,
      error: null,
      layoutNodes: [],
      layoutEdges: [],
      stageConfig: {
        width: this.width,
        height: this.height,
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
      }
    }
  },
  watch: {
    width(newVal) {
      this.stageConfig.width = newVal
    },
    height(newVal) {
      this.stageConfig.height = newVal
    },
    netlistData: {
      handler() {
        this.computeLayout()
      },
      deep: true
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
      const graph = {
        id: "root",
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': '30',
          'elk.layered.spacing.nodeNodeBetweenLayers': '100',
          'elk.spacing.edgeEdge': 20,
          'elk.edgeLabels.placement': 'TAIL',
          'elk.edgeRouting': 'ORTHOGONAL',
        },
        children: this.netlistData.nodes.map(node => ({
          id: String(node.id),
          width: 5,
          height: 100,
          layoutOptions: {
            'elk.nodeLabels.placement': 'OUTSIDE, H_LEFT, V_BOTTOM',
          },
          labels: [{ text: node.name, width: 50, height: 10 }]
        })),
        edges: this.netlistData.branches.map(branch => ({
          id: String(branch.id),
          layoutOptions: {
            'elk.edgeLabels.placement': 'TAIL',
          },
          sources: [String(branch.node1_id)],
          targets: [String(branch.node2_id)],
          labels: [{ text: branch.name, width: 50, height: 10 }]
        }))
      }

      // Compute layout
      const layout = await elk.layout(graph)

      // Process nodes
      this.layoutNodes = layout.children.map(node => {
        const originalNode = this.netlistData.nodes.find(n => n.id === parseInt(node.id))

        const labelX = node.x + node.labels[0].x
        const labelY = node.y + node.labels[0].y

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

      // Process edges
      this.layoutEdges = layout.edges.map(edge => {
        const originalBranch = this.netlistData.branches.find(b => b.id === parseInt(edge.id))
        const sections = edge.sections || []
        const points = []

        if (sections.length > 0) {
          const section = sections[0]

          // Start point
          points.push(section.startPoint.x, section.startPoint.y)

          // Bend points
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
      this.$emit('resize', {
        width: window.innerWidth,
        height: window.innerHeight - 60
      })
    },
    getNodeConfig(node) {
      const baseConfig = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        fill: '#000',
        hitStrokeWidth: 20
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
        hitStrokeWidth: 20
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

      this.$emit('node-click', node)
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

      this.$emit('edge-click', edge)
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
      if (e.evt.button === 0) {
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
    }
  }
}
</script>

<style scoped>
.schematic-editor {
  width: 100%;
  height: 100%;
}
</style>
