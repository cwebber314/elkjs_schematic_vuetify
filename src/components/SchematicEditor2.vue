<template>
  <div class="schematic-editor2">
    <v-row v-if="loading">
      <v-col class="d-flex justify-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <span class="ml-4">Loading schematic...</span>
      </v-col>
    </v-row>

    <v-alert v-else-if="error" type="error" class="mb-4">
      Error: {{ error }}
    </v-alert>

    <v-sheet v-else class="schematic-sheet">
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
          <v-list-item v-if="contextMenu.objectType === 'Node'" @click="handleGrow">
            <v-list-item-title>Grow</v-list-item-title>
          </v-list-item>
          <v-list-item @click="handleHide">
            <v-list-item-title>Hide</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </div>
  </div>
</template>

<script>
import ELK from 'elkjs/lib/elk.bundled.js'

export default {
  name: 'SchematicEditor2',
  props: {
    netlistData: {
      type: Object,
      required: true
    },
    width: {
      type: Number,
      default: () => window.innerWidth - 48
    },
    height: {
      type: Number,
      default: () => window.innerHeight * 0.5 - 80
    }
  },
  emits: [
    'node-click',
    'edge-click',
    'terminal-click',
    'node-right-click',
    'edge-right-click',
    'stage-click',
    'selection-changed',
    'resize',
    'properties-click',
    'grow-click'
  ],
  data() {
    return {
      loading: true,
      error: null,
      layoutNodes: [],
      layoutEdges: [],
      activeTerminals: {},
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
      window.addEventListener('click', this.handleClickOutside)
    } catch (err) {
      this.error = err.message
      this.loading = false
    }
  },
  beforeUnmount() {
    window.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    async computeLayout() {
      const elk = new ELK()

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

      const layout = await elk.layout(graph)

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
          selected: false,
          hidden: false
        }
      })

      this.layoutEdges = layout.edges.map(edge => {
        const originalBranch = this.netlistData.branches.find(b => b.id === parseInt(edge.id))
        const sections = edge.sections || []
        const points = []

        if (sections.length > 0) {
          const section = sections[0]
          points.push(section.startPoint.x, section.startPoint.y)

          if (section.bendPoints) {
            section.bendPoints.forEach(bp => {
              points.push(bp.x, bp.y)
            })
          }

          points.push(section.endPoint.x, section.endPoint.y)
        }

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
          selected: false,
          hidden: false
        }
      })
    },
    getNodeConfig(node) {
      const baseConfig = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        fill: '#000'
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
    getTerminalCaps(edge) {
      const caps = []
      const points = edge.points

      if (points.length < 4) return caps

      const terminals = this.activeTerminals[edge.id] || {}
      const terminalLength = 10
      const terminalStrokeWidth = 7
      const orangeColor = this.terminalStyle.normalColor
      const purpleColor = this.terminalStyle.selectedColor

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

      // Start terminal cap
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

      // End terminal cap
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
        this.layoutNodes.forEach(n => {
          if (n !== node) n.selected = false
        })
        this.layoutEdges.forEach(edge => edge.selected = false)
        Object.keys(this.activeTerminals).forEach(edgeId => {
          this.activeTerminals[edgeId].start = false
          this.activeTerminals[edgeId].end = false
        })
      }

      node.selected = !node.selected

      console.log('Node clicked:', node)
      this.$emit('node-click', node)
      this.emitSelectionChanged()
    },
    handleEdgeClick(edge, e) {
      const shiftKey = e?.evt?.shiftKey || false

      if (!shiftKey) {
        this.layoutNodes.forEach(node => node.selected = false)
        this.layoutEdges.forEach(e => {
          if (e !== edge) e.selected = false
        })
        Object.keys(this.activeTerminals).forEach(edgeId => {
          this.activeTerminals[edgeId].start = false
          this.activeTerminals[edgeId].end = false
        })
      }

      edge.selected = !edge.selected

      console.log('Edge clicked:', edge)
      this.$emit('edge-click', edge)
      this.emitSelectionChanged()
    },
    handleTerminalCapClick(edge, cap, e) {
      const shiftKey = e?.evt?.shiftKey || false

      console.log('Terminal cap clicked:', cap.terminalEnd, 'of edge', edge.name)

      if (!shiftKey) {
        this.layoutNodes.forEach(node => node.selected = false)
        this.layoutEdges.forEach(e => e.selected = false)
        Object.keys(this.activeTerminals).forEach(edgeId => {
          if (edgeId !== edge.id) {
            this.activeTerminals[edgeId].start = false
            this.activeTerminals[edgeId].end = false
          } else {
            const otherEnd = cap.terminalEnd === 'start' ? 'end' : 'start'
            this.activeTerminals[edgeId][otherEnd] = false
          }
        })
      }

      if (!this.activeTerminals[edge.id]) {
        this.activeTerminals[edge.id] = { start: false, end: false }
      }

      const wasSelected = this.activeTerminals[edge.id][cap.terminalEnd]
      this.activeTerminals[edge.id][cap.terminalEnd] = !wasSelected

      console.log(`Terminal ${cap.terminalEnd} ${wasSelected ? 'deselected' : 'selected'}`)

      this.$emit('terminal-click', {
        edge,
        terminalEnd: cap.terminalEnd,
        selected: !wasSelected
      })
      this.emitSelectionChanged()
    },
    handleStageClick(e) {
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.getType() === 'Layer'

      if (clickedOnEmpty) {
        this.layoutNodes.forEach(node => node.selected = false)
        this.layoutEdges.forEach(edge => edge.selected = false)

        Object.keys(this.activeTerminals).forEach(edgeId => {
          this.activeTerminals[edgeId].start = false
          this.activeTerminals[edgeId].end = false
        })

        console.log('Canvas background clicked - deselecting all')
        this.$emit('stage-click')
        this.emitSelectionChanged()
      }
    },
    handleStageRightClick(e) {
      e.evt.preventDefault()
      console.log('Right-click on canvas background - default menu prevented')
    },
    handleNodeRightClick(node, e) {
      e.evt.preventDefault()

      this.layoutNodes.forEach(n => n.selected = false)
      this.layoutEdges.forEach(edge => edge.selected = false)

      node.selected = true

      this.contextMenu.show = false
      this.contextMenu.x = e.evt.clientX
      this.contextMenu.y = e.evt.clientY
      this.contextMenu.objectType = 'Node'
      this.contextMenu.targetObject = node

      this.$nextTick(() => {
        this.contextMenu.show = true
      })

      console.log('Node right-clicked:', node.name, 'at', e.evt.clientX, e.evt.clientY)
      this.$emit('node-right-click', { node, x: e.evt.clientX, y: e.evt.clientY })
    },
    handleEdgeRightClick(edge, e) {
      e.evt.preventDefault()

      this.layoutNodes.forEach(n => n.selected = false)
      this.layoutEdges.forEach(e => e.selected = false)

      edge.selected = true

      this.contextMenu.show = false
      this.contextMenu.x = e.evt.clientX
      this.contextMenu.y = e.evt.clientY
      this.contextMenu.objectType = 'Branch'
      this.contextMenu.targetObject = edge

      this.$nextTick(() => {
        this.contextMenu.show = true
      })

      console.log('Branch right-clicked:', edge.name)
      this.$emit('edge-right-click', { edge, x: e.evt.clientX, y: e.evt.clientY })
    },
    handleClickOutside() {
      this.contextMenu.show = false
    },
    handleProperties() {
      console.log('Properties clicked for:', this.contextMenu.objectType, this.contextMenu.targetObject)

      // Emit event to parent component to handle properties dialog
      this.$emit('properties-click', {
        objectType: this.contextMenu.objectType,
        targetObject: this.contextMenu.targetObject
      })

      this.contextMenu.show = false
    },
    handleGrow() {
      console.log('Grow clicked for:', this.contextMenu.objectType, this.contextMenu.targetObject)

      // Emit event to parent component to handle grow action
      this.$emit('grow-click', {
        objectType: this.contextMenu.objectType,
        targetObject: this.contextMenu.targetObject
      })

      this.contextMenu.show = false
    },
    handleHide() {
      const target = this.contextMenu.targetObject

      if (this.contextMenu.objectType === 'Node') {
        target.hidden = true
        console.log('Hiding node:', target.name)
      } else if (this.contextMenu.objectType === 'Branch') {
        target.hidden = true
        console.log('Hiding branch:', target.name)
      }

      this.contextMenu.show = false
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
    },
    getBranchById(id) {
      return this.netlistData.branches.find(b => b.id === parseInt(id))
    },
    getNodeById(id) {
      return this.netlistData.nodes.find(n => n.id === id)
    },
    emitSelectionChanged() {
      const selectedNodes = this.layoutNodes.filter(n => n.selected)
      const selectedEdges = this.layoutEdges.filter(e => e.selected)
      const selectedTerminals = this.activeTerminals

      this.$emit('selection-changed', {
        nodes: selectedNodes,
        edges: selectedEdges,
        terminals: selectedTerminals
      })
    }
  }
}
</script>

<style scoped>
.schematic-editor2 {
  width: 100%;
  height: 100%;
}

.schematic-sheet {
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
