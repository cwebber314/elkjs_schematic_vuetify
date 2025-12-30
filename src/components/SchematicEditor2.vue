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
              fill: textColor,
              align: 'center'
            }"
          />

          <!-- Draw buses as rectangles -->
          <v-group
            v-for="bus in visibleBuses"
            :key="'bus-' + bus.id">
            <v-rect
              :config="getBusConfig(bus)"
              @click="handleBusClick(bus, $event)"
              @contextmenu="handleBusRightClick(bus, $event)"
            />
            <v-text
              :config="{
                x: bus.labelX,
                y: bus.labelY,
                text: bus.name,
                fontSize: 14,
                fontStyle: 'bold',
                fill: textColor
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
          <v-list-item v-if="contextMenu.objectType === 'Bus'" @click="handleGrow">
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
import colors from 'vuetify/util/colors'

export default {
  name: 'SchematicEditor2',
  props: {
    networkData: {
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
    'bus-click',
    'edge-click',
    'terminal-click',
    'bus-right-click',
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
      layoutBuses: [],
      layoutEdges: [],
      activeTerminals: [],
      stageConfig: {
        width: this.width,
        height: this.height,
        draggable: true,
        x: 50,
        y: 50
      },
      isDragging: false,
      lastMousePos: null,
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
    visibleBuses() {
      return this.layoutBuses.filter(bus => !bus.hidden)
    },
    visibleEdges() {
      return this.layoutEdges.filter(edge => !edge.hidden)
    },
    themeColors() {
      return this.$vuetify.theme.current.colors
    },
    selectionStyle() {
      return {
        // stroke: this.themeColors.secondary,
        stroke: colors.purple.base,
        fill: colors.purple.base,
        strokeWidth: 3
      }
    },
    busStyle() {
      return {
        // stroke: this.themeColors['on-surface'],
        stroke: colors.blue.base,
        fill: colors.blue.base,
        strokeWidth: 1
      }
    },
    edgeStyle() {
      return {
        // stroke: this.themeColors.primary,
        stroke: colors.blue.base,
        strokeWidth: 2
      }
    },
    terminalStyle() {
      return {
        // normalColor: this.themeColors.primary,
        // selectedColor: this.themeColors.secondary
        normalColor: colors.blue.base,
        selectedColor: colors.purple.base
      }
    },
    textColor() {
      return this.themeColors['on-surface']
    }
  },
  watch: {
    width(newVal) {
      this.stageConfig.width = newVal
    },
    height(newVal) {
      this.stageConfig.height = newVal
    },
    networkData: {
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
        children: this.networkData.buses.map(bus => ({
          id: String(bus.id),
          width: 5,
          height: 100,
          layoutOptions: {
            'elk.nodeLabels.placement': 'OUTSIDE, H_LEFT, V_BOTTOM',
          },
          labels: [{ text: bus.name, width: 50, height: 10 }]
        })),
        edges: this.networkData.branches.map(branch => ({
          id: String(branch.id),
          layoutOptions: {
            'elk.edgeLabels.placement': 'TAIL',
          },
          sources: [String(branch.bus1_id)],
          targets: [String(branch.bus2_id)],
          labels: [{ text: branch.name, width: 50, height: 10 }]
        }))
      }

      const layout = await elk.layout(graph)

      this.layoutBuses = layout.children.map(layoutBus => {
        const originalBus = this.networkData.buses.find(b => b.id === parseInt(layoutBus.id))
        const labelX = layoutBus.x + layoutBus.labels[0].x
        const labelY = layoutBus.y + layoutBus.labels[0].y

        return {
          id: layoutBus.id,
          name: originalBus.name,
          x: layoutBus.x,
          y: layoutBus.y,
          width: layoutBus.width,
          height: layoutBus.height,
          labelX,
          labelY,
          selected: false,
          hidden: false
        }
      })

      this.layoutEdges = layout.edges.map(edge => {
        const originalBranch = this.networkData.branches.find(b => b.id === parseInt(edge.id))
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
    getBusConfig(bus) {
      const baseConfig = {
        x: bus.x,
        y: bus.y,
        width: bus.width,
        height: bus.height,
        fill: colors.blue.base,
        stroke: colors.blue.base,
        strokeWidth: 2
        // fill: this.themeColors['on-surface']
      }

      if (bus.selected) {
        return { ...baseConfig, ...this.selectionStyle }
      }
      return { ...baseConfig, ...this.busStyle }
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

      const branch = this.getBranchById(edge.id)
      if (!branch) return caps

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

      // Check if start terminal is selected (branch + bus1)
      const startSelected = this.activeTerminals.some(
        t => t.branch === parseInt(edge.id) && t.bus === branch.bus1_id
      )

      // Check if end terminal is selected (branch + bus2)
      const endSelected = this.activeTerminals.some(
        t => t.branch === parseInt(edge.id) && t.bus === branch.bus2_id
      )

      // Start terminal cap
      const startX = points[0]
      const startY = points[1]
      const nextX = points[2]
      const nextY = points[3]
      const startEndPoint = getPointAtDistance(startX, startY, nextX, nextY, terminalLength)

      caps.push({
        config: {
          points: [startX, startY, startEndPoint.x, startEndPoint.y],
          stroke: startSelected ? purpleColor : orangeColor,
          strokeWidth: terminalStrokeWidth,
          lineJoin: 'miter',
          lineCap: 'round',
          hitStrokeWidth: 20
        },
        terminalEnd: 'start',
        busId: branch.bus1_id
      })

      // End terminal cap
      const len = points.length
      const endX = points[len - 2]
      const endY = points[len - 1]
      const prevX = points[len - 4]
      const prevY = points[len - 3]
      const endStartPoint = getPointAtDistance(endX, endY, prevX, prevY, terminalLength)

      caps.push({
        config: {
          points: [endX, endY, endStartPoint.x, endStartPoint.y],
          stroke: endSelected ? purpleColor : orangeColor,
          strokeWidth: terminalStrokeWidth,
          lineJoin: 'miter',
          lineCap: 'round',
          hitStrokeWidth: 20
        },
        terminalEnd: 'end',
        busId: branch.bus2_id
      })

      return caps
    },
    handleBusClick(bus, e) {
      const shiftKey = e?.evt?.shiftKey || false

      if (!shiftKey) {
        this.layoutBuses.forEach(b => {
          if (b !== bus) b.selected = false
        })
        this.layoutEdges.forEach(edge => edge.selected = false)
        this.activeTerminals = []
      }

      bus.selected = !bus.selected

      console.log('Bus clicked:', bus)
      this.$emit('bus-click', bus)
      this.emitSelectionChanged()
    },
    handleEdgeClick(edge, e) {
      const shiftKey = e?.evt?.shiftKey || false

      if (!shiftKey) {
        this.layoutBuses.forEach(bus => bus.selected = false)
        this.layoutEdges.forEach(e => {
          if (e !== edge) e.selected = false
        })
        this.activeTerminals = []
      }

      edge.selected = !edge.selected

      console.log('Edge clicked:', edge)
      this.$emit('edge-click', edge)
      this.emitSelectionChanged()
    },
    handleTerminalCapClick(edge, cap, e) {
      const shiftKey = e?.evt?.shiftKey || false

      console.log('Terminal cap clicked:', cap.terminalEnd, 'of edge', edge.name)

      const branchId = parseInt(edge.id)
      const busId = cap.busId
      const terminalIndex = this.activeTerminals.findIndex(
        t => t.branch === branchId && t.bus === busId
      )
      const wasSelected = terminalIndex !== -1

      if (!shiftKey) {
        this.layoutBuses.forEach(bus => bus.selected = false)
        this.layoutEdges.forEach(e => e.selected = false)

        // Clear all terminals except the one being clicked if it was selected
        if (wasSelected) {
          this.activeTerminals = [{ branch: branchId, bus: busId }]
        } else {
          this.activeTerminals = []
        }
      }

      // Toggle the terminal
      if (wasSelected) {
        this.activeTerminals.splice(terminalIndex, 1)
      } else {
        this.activeTerminals.push({ branch: branchId, bus: busId })
      }

      console.log(`Terminal ${cap.terminalEnd} ${wasSelected ? 'deselected' : 'selected'}`)

      this.$emit('terminal-click', {
        edge,
        terminalEnd: cap.terminalEnd,
        busId: busId,
        selected: !wasSelected
      })
      this.emitSelectionChanged()
    },
    handleStageClick(e) {
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.getType() === 'Layer'

      if (clickedOnEmpty) {
        this.layoutBuses.forEach(bus => bus.selected = false)
        this.layoutEdges.forEach(edge => edge.selected = false)
        this.activeTerminals = []

        console.log('Canvas background clicked - deselecting all')
        this.$emit('stage-click')
        this.emitSelectionChanged()
      }
    },
    handleStageRightClick(e) {
      e.evt.preventDefault()
      console.log('Right-click on canvas background - default menu prevented')
    },
    handleBusRightClick(bus, e) {
      e.evt.preventDefault()

      this.layoutBuses.forEach(b => b.selected = false)
      this.layoutEdges.forEach(edge => edge.selected = false)

      bus.selected = true

      this.contextMenu.show = false
      this.contextMenu.x = e.evt.clientX
      this.contextMenu.y = e.evt.clientY
      this.contextMenu.objectType = 'Bus'
      this.contextMenu.targetObject = bus

      this.$nextTick(() => {
        this.contextMenu.show = true
      })

      console.log('Bus right-clicked:', bus.name, 'at', e.evt.clientX, e.evt.clientY)
      this.$emit('bus-right-click', { bus, x: e.evt.clientX, y: e.evt.clientY })
    },
    handleEdgeRightClick(edge, e) {
      e.evt.preventDefault()

      this.layoutBuses.forEach(b => b.selected = false)
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

      if (this.contextMenu.objectType === 'Bus') {
        target.hidden = true
        console.log('Hiding bus:', target.name)
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
      return this.networkData.branches.find(b => b.id === parseInt(id))
    },
    getBusById(id) {
      return this.networkData.buses.find(b => b.id === parseInt(id))
    },
    emitSelectionChanged() {
      const selectedBuses = this.layoutBuses.filter(b => b.selected)
      const selectedEdges = this.layoutEdges.filter(e => e.selected)
      const selectedTerminals = this.activeTerminals

      this.$emit('selection-changed', {
        buses: selectedBuses,
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
