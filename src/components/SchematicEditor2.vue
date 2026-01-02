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
              text: formatEdgeLabel(edge),
              fontSize: 12,
              fill: textColor,
              // fill: 'var(--v-theme-on-surface)',
              align: 'center'
            }"
          />

          <!-- Draw transformer symbols -->
          <template v-for="edge in visibleEdges" :key="'transformer-' + edge.id">
            <v-group v-if="networkData.branches.find(b => b.id === parseInt(edge.id))?.edge_type === 'transformer'">
              <!-- Background-colored line to hide edge behind symbol -->
              <v-line
                :config="{
                  points: [
                    getTransformerSymbolConfig(edge)?.lineStartX,
                    getTransformerSymbolConfig(edge)?.lineStartY,
                    getTransformerSymbolConfig(edge)?.lineEndX,
                    getTransformerSymbolConfig(edge)?.lineEndY
                  ],
                  stroke: backgroundColor,
                  strokeWidth: 6,
                  listening: false
                }"
              />
              <!-- Two overlapping circles for IEC transformer symbol -->
              <v-circle
                :config="{
                  x: getTransformerSymbolConfig(edge)?.circle1X,
                  y: getTransformerSymbolConfig(edge)?.circle1Y,
                  radius: getTransformerSymbolConfig(edge)?.radius,
                  stroke: edge.selected ? selectionStyle.stroke : edgeStyle.stroke,
                  strokeWidth: edge.selected ? 3 : 2,
                  fill: 'transparent'
                }"
                @click="handleEdgeClick(edge, $event)"
                @contextmenu="handleEdgeRightClick(edge, $event)"
              />
              <v-circle
                :config="{
                  x: getTransformerSymbolConfig(edge)?.circle2X,
                  y: getTransformerSymbolConfig(edge)?.circle2Y,
                  radius: getTransformerSymbolConfig(edge)?.radius,
                  stroke: edge.selected ? selectionStyle.stroke : edgeStyle.stroke,
                  strokeWidth: edge.selected ? 3 : 2,
                  fill: 'transparent'
                }"
                @click="handleEdgeClick(edge, $event)"
                @contextmenu="handleEdgeRightClick(edge, $event)"
              />
            </v-group>
          </template>

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
                text: formatBusLabel(bus),
                fontSize: 14,
                fontStyle: 'bold',
                fill: textColor
                // fill: 'var(--v-theme-on-surface)'
              }"
            />
          </v-group>

          <!-- Selection rectangle -->
          <v-rect
            v-if="selectionRect.visible"
            :config="{
              x: selectionRect.x,
              y: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
              fill: 'rgba(0, 123, 255, 0.1)',
              stroke: '#007bff',
              strokeWidth: 1,
              dash: [5, 5],
              listening: false
            }"
          />
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

          <!-- Background context menu -->
          <template v-if="contextMenu.objectType === 'Background'">
            <!-- Add Bus = Show existing bus on the canvas -->
            <v-list-item @click="handleAddBus">
              <v-list-item-title>Add Bus to diagram</v-list-item-title>
            </v-list-item>

            <!-- Create Bus = Create a new bus -->
            <v-list-item v-if="false" @click="handleCreateBus">
              <v-list-item-title>Create Bus</v-list-item-title>
            </v-list-item>

            <v-divider></v-divider>

            <!-- Display Configuration -->
            <v-list-item @click="handleDisplayConfig">
              <v-list-item-title>Display Configuration...</v-list-item-title>
            </v-list-item>
          </template>

          <!-- Multiple Selection context menu -->
          <template v-else-if="contextMenu.objectType === 'Multiple Selection'">
            <v-list-item @click="handleHideSelected">
              <v-list-item-title>Hide (h)</v-list-item-title>
            </v-list-item>
          </template>

          <!-- Bus/Branch context menu -->
          <template v-else>
            <v-list-item @click="handleProperties">
              <v-list-item-title>Properties</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="contextMenu.objectType === 'Bus'" @click="handleGrow">
              <v-list-item-title>Grow (g)</v-list-item-title>
            </v-list-item>
            <v-list-item @click="handleHide">
              <v-list-item-title>Hide (h)</v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
      </v-card>
    </div>

    <!-- Display Configuration Dialog -->
    <v-dialog v-model="showDisplayDialog" max-width="600" scrollable>
      <v-card>
        <v-card-title>Display Configuration</v-card-title>
        <v-card-text style="max-height: 600px;">
          <div class="mb-4">
            <h4>Bus Labels</h4>
            <p class="text-caption">Select which attributes to display on buses</p>
          </div>
          <v-checkbox
            v-model="busDisplayConfig.id"
            label="ID"
            density="compact"
            hide-details></v-checkbox>
          <v-checkbox
            v-model="busDisplayConfig.name"
            label="Name"
            density="compact"
            hide-details></v-checkbox>
          <v-checkbox
            v-model="busDisplayConfig.bus_num"
            label="Bus Number"
            density="compact"
            hide-details></v-checkbox>
          <v-checkbox
            v-model="busDisplayConfig.kv"
            label="kV"
            density="compact"
            hide-details></v-checkbox>

          <v-divider class="my-4"></v-divider>

          <div class="mb-4">
            <h4>Branch Labels</h4>
            <p class="text-caption">Select which attributes to display on branches</p>
          </div>
          <v-checkbox
            v-model="edgeDisplayConfig.id"
            label="ID"
            density="compact"
            hide-details></v-checkbox>
          <v-checkbox
            v-model="edgeDisplayConfig.name"
            label="Name"
            density="compact"
            hide-details></v-checkbox>
          <v-checkbox
            v-model="edgeDisplayConfig.ckt"
            label="Circuit"
            density="compact"
            hide-details></v-checkbox>

          <v-divider class="my-4"></v-divider>

          <div class="mb-4">
            <h4>Bus Voltage Colors 
              <v-btn icon="mdi-reload" title="reset to default" @click="resetVoltageColors"></v-btn>
              <v-btn icon="mdi-abacus" title="load chips colors" @click="setVoltageColorsChip"></v-btn>
            </h4>
            <p class="text-caption">Configure colors for different voltage ranges</p>
          </div>

          <div class="voltage-color-config">
            <div class="voltage-range mb-2">
              <div class="d-flex align-center justify-space-between">
                <span class="voltage-label">< 50kV</span>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <div class="color-swatch" :style="{ backgroundColor: voltageColors.under50 }" v-bind="props"></div>
                  </template>
                  <v-card>
                    <v-color-picker show-swatches :swatches="swatches" v-model="voltageColors.under50" mode="hex"></v-color-picker>
                  </v-card>
                </v-menu>
              </div>
            </div>

            <div class="voltage-range mb-2">
              <div class="d-flex align-center justify-space-between">
                <span class="voltage-label">50kV - 100kV</span>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <div class="color-swatch" :style="{ backgroundColor: voltageColors.range50_100 }" v-bind="props"></div>
                  </template>
                  <v-card>
                    <v-color-picker show-swatches :swatches="swatches" v-model="voltageColors.range50_100" mode="hex"></v-color-picker>
                  </v-card>
                </v-menu>
              </div>
            </div>

            <div class="voltage-range mb-2">
              <div class="d-flex align-center justify-space-between">
                <span class="voltage-label">100kV - 200kV</span>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <div class="color-swatch" :style="{ backgroundColor: voltageColors.range100_200 }" v-bind="props"></div>
                  </template>
                  <v-card>
                    <v-color-picker show-swatches :swatches="swatches"v-model="voltageColors.range100_200" mode="hex"></v-color-picker>
                  </v-card>
                </v-menu>
              </div>
            </div>

            <div class="voltage-range mb-2">
              <div class="d-flex align-center justify-space-between">
                <span class="voltage-label">200kV - 300kV</span>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <div class="color-swatch" :style="{ backgroundColor: voltageColors.range200_300 }" v-bind="props"></div>
                  </template>
                  <v-card>
                    <v-color-picker show-swatches :swatches="swatches"v-model="voltageColors.range200_300" mode="hex"></v-color-picker>
                  </v-card>
                </v-menu>
              </div>
            </div>

            <div class="voltage-range mb-2">
              <div class="d-flex align-center justify-space-between">
                <span class="voltage-label">300kV - 400kV</span>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <div class="color-swatch" :style="{ backgroundColor: voltageColors.range300_400 }" v-bind="props"></div>
                  </template>
                  <v-card>
                    <v-color-picker show-swatches :swatches="swatches"v-model="voltageColors.range300_400" mode="hex"></v-color-picker>
                  </v-card>
                </v-menu>
              </div>
            </div>

            <div class="voltage-range mb-2">
              <div class="d-flex align-center justify-space-between">
                <span class="voltage-label">400kV - 600kV</span>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <div class="color-swatch" :style="{ backgroundColor: voltageColors.range400_600 }" v-bind="props"></div>
                  </template>
                  <v-card>
                    <v-color-picker show-swatches :swatches="swatches"v-model="voltageColors.range400_600" mode="hex"></v-color-picker>
                  </v-card>
                </v-menu>
              </div>
            </div>

            <div class="voltage-range mb-2">
              <div class="d-flex align-center justify-space-between">
                <span class="voltage-label">> 700kV</span>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <div class="color-swatch" :style="{ backgroundColor: voltageColors.over700 }" v-bind="props"></div>
                  </template>
                  <v-card>
                    <v-color-picker show-swatches :swatches="swatches"v-model="voltageColors.over700" mode="hex"></v-color-picker>
                  </v-card>
                </v-menu>
              </div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="showDisplayDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import ELK from 'elkjs/lib/elk.bundled.js'
import colors from 'vuetify/util/colors'
import { useTheme } from 'vuetify'

export default {
  name: 'SchematicEditor2',
  setup() {
    const vuetifyTheme = useTheme()
    return {
      vuetifyTheme
    }
  },
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
    'grow-click',
    'add-bus-click'
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
      isSelecting: false,
      selectionRect: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        visible: false
      },
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        objectType: '',
        targetObject: null
      },
      showDisplayDialog: false,
      busDisplayConfig: {
        id: false,
        name: true,
        bus_num: false,
        kv: false
      },
      edgeDisplayConfig: {
        id: false,
        name: true,
        ckt: false
      },
      voltageColors: {
        under50: colors.brown.base,
        range50_100: colors.deepPurple.base,
        range100_200: colors.red.base,
        range200_300: colors.indigo.base,
        range300_400: colors.green.base,
        range400_600: colors.blue.base,
        over700: colors.orange.base
      },
      voltageColorsDefault: {
        under50: colors.blue.base,
        range50_100: colors.blue.base,
        range100_200: colors.blue.base,
        range200_300: colors.blue.base,
        range300_400: colors.blue.base,
        range400_600: colors.blue.base,
        over700: colors.blue.base
      },
      voltageColorsChip: {
        under50: colors.brown.base,
        range50_100: colors.deepPurple.base,
        range100_200: colors.red.base,
        range200_300: colors.indigo.base,
        range300_400: colors.green.base,
        range400_600: colors.blue.base,
        over700: colors.orange.base
      },

      // first dimension is the columns, second dimension is the rows 
      // this feels backwards
      swatches: [
          [colors.red.base, colors.pink.base, colors.purple.base, colors.deepOrange.base],
          [colors.deepPurple.base, colors.indigo.base, colors.blue.base, colors.brown.base],
          [colors.lightBlue.base, colors.cyan.base, colors.teal.base, colors.blueGrey.base],
          [colors.green.base, colors.lightGreen.base, colors.lime.base, colors.grey.base],
          [colors.yellow.base, colors.amber.base, colors.orange.base],
      ],
    }
  },
  computed: {
    visibleBuses() {
      return this.layoutBuses.filter(bus => !bus.hidden)
    },
    visibleEdges() {
      return this.layoutEdges.filter(edge => !edge.hidden)
    },
    selectionStyle() {
      return {
        stroke: colors.purple.base,
        fill: colors.purple.base,
        strokeWidth: 3
      }
    },
    busStyle() {
      return {
        stroke: colors.blue.base,
        fill: colors.blue.base,
        strokeWidth: 1
      }
    },
    edgeStyle() {
      return {
        stroke: colors.blue.base,
        strokeWidth: 2
      }
    },
    terminalStyle() {
      return {
        normalColor: colors.blue.base,
        selectedColor: colors.purple.base
      }
    },
    textColor() {
      // white: 255, 255, 255
      // black: 0, 0, 0
      // light grey: #EEEEEE
      // you can't return '0,0,0' as a color. You have to return 'rgb(0,0,0)' or '#000000'
      const color1_raw = getComputedStyle(document.documentElement).getPropertyValue('--v-theme-on-surface').trim()
      const color1 = `rgb(${color1_raw})`
      console.log("textColor 1(): ", color1)
      // const color2 = this.vuetifyTheme.current.value.colors['on-surface']
      // console.log("textColor 2(): ", color2)
      return color1
      // return 'rgb(255,4,103)'
      // return '#EEEEEE'
      // Use reactive theme from useTheme() - falls back to on-surface-variant since onSurface isn't in colors
      // return this.vuetifyTheme.current.value.colors['on-surface-variant'] ||
      //        getComputedStyle(document.documentElement).getPropertyValue('--v-theme-on-surface').trim()
    },
    backgroundColor() {
      console.log("backgroundColor()")
      return this.vuetifyTheme.current.value.colors.surface
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
    },
    busDisplayConfig: {
      handler(newVal) {
        // Save display configuration to localStorage
        localStorage.setItem('busDisplayConfig', JSON.stringify(newVal))
        console.log('Saved bus display config to localStorage:', newVal)
      },
      deep: true
    },
    edgeDisplayConfig: {
      handler(newVal) {
        // Save display configuration to localStorage
        localStorage.setItem('edgeDisplayConfig', JSON.stringify(newVal))
        console.log('Saved edge display config to localStorage:', newVal)
      },
      deep: true
    },
    voltageColors: {
      handler(newVal) {
        // Save voltage colors to localStorage
        localStorage.setItem('voltageColors', JSON.stringify(newVal))
        console.log('Saved voltage colors to localStorage:', newVal)
      },
      deep: true
    }
  },
  async mounted() {
    try {
      // Restore bus display configuration from localStorage
      const savedBusConfig = localStorage.getItem('busDisplayConfig')
      if (savedBusConfig) {
        try {
          const config = JSON.parse(savedBusConfig)
          this.busDisplayConfig = { ...this.busDisplayConfig, ...config }
          console.log('Restored bus display config from localStorage:', config)
        } catch (e) {
          console.error('Error parsing saved bus display config:', e)
        }
      }

      // Restore edge display configuration from localStorage
      const savedEdgeConfig = localStorage.getItem('edgeDisplayConfig')
      if (savedEdgeConfig) {
        try {
          const config = JSON.parse(savedEdgeConfig)
          this.edgeDisplayConfig = { ...this.edgeDisplayConfig, ...config }
          console.log('Restored edge display config from localStorage:', config)
        } catch (e) {
          console.error('Error parsing saved edge display config:', e)
        }
      }

      // Restore voltage colors from localStorage
      const savedVoltageColors = localStorage.getItem('voltageColors')
      if (savedVoltageColors) {
        try {
          const colors = JSON.parse(savedVoltageColors)
          this.voltageColors = { ...this.voltageColors, ...colors }
          console.log('Restored voltage colors from localStorage:', colors)
        } catch (e) {
          console.error('Error parsing saved voltage colors:', e)
        }
      }

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
          'elk.layered.spacing.nodeNodeBetweenLayers': '80',
          // only increases spacing for edges running left-right
          // up-down edges are not affected
          'elk.spacing.edgeEdge': 30,
          'elk.edgeLabels.placement': 'CENTER',
          'elk.spacing.edgeLabel': '10',
          'elk.edgeRouting': 'ORTHOGONAL',
          // Allow edge labels to be placed above or below edges
          // When edges are close this makes it less likely for label to overlap edge
          'elk.edgeLabels.sideSelection': 'SMART_DOWN',  
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
            'elk.edgeLabels.placement': 'CENTER',
          },
          sources: [String(branch.bus1_id)],
          targets: [String(branch.bus2_id)],
          labels: [{ text: branch.name, width: 50, height: 10 }]
        }))
      }

      const layout = await elk.layout(graph)

      // Preserve hidden state for existing buses
      const previousBusHiddenStates = new Map(
        this.layoutBuses.map(bus => [bus.id, bus.hidden])
      )

      this.layoutBuses = layout.children.map(layoutBus => {
        const originalBus = this.networkData.buses.find(b => b.id === parseInt(layoutBus.id))
        const labelX = layoutBus.x + layoutBus.labels[0].x
        const labelY = layoutBus.y + layoutBus.labels[0].y

        // Preserve hidden state if bus existed before, otherwise default to visible (false)
        const wasHidden = previousBusHiddenStates.get(layoutBus.id) || false

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
          hidden: wasHidden
        }
      })

      // Preserve hidden state for existing edges
      const previousEdgeHiddenStates = new Map(
        this.layoutEdges.map(edge => [edge.id, edge.hidden])
      )

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

        // Preserve hidden state if edge existed before, otherwise default to visible (false)
        const wasHidden = previousEdgeHiddenStates.get(edge.id) || false

        return {
          id: edge.id,
          name: originalBranch.name,
          points,
          labelX,
          labelY,
          selected: false,
          hidden: wasHidden
        }
      })
    },
    getBusColor(bus) {
      // Get original bus data to access kV value
      const originalBus = this.networkData.buses.find(b => b.id === parseInt(bus.id))
      if (!originalBus || !originalBus.kv) {
        return colors.blue.base // Default color if kV not found
      }

      const kv = originalBus.kv

      if (kv < 50) return this.voltageColors.under50
      if (kv >= 50 && kv < 100) return this.voltageColors.range50_100
      if (kv >= 100 && kv < 200) return this.voltageColors.range100_200
      if (kv >= 200 && kv < 300) return this.voltageColors.range200_300
      if (kv >= 300 && kv < 400) return this.voltageColors.range300_400
      if (kv >= 400 && kv < 700) return this.voltageColors.range400_600
      if (kv >= 700) return this.voltageColors.over700

      return colors.blue.base // Fallback
    },
    getBusConfig(bus) {
      const busColor = this.getBusColor(bus)
      const baseConfig = {
        x: bus.x,
        y: bus.y,
        width: bus.width,
        height: bus.height,
        fill: busColor,
        stroke: busColor,
        strokeWidth: 2
      }

      if (bus.selected) {
        return { ...baseConfig, ...this.selectionStyle }
      }
      return baseConfig
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
      // Only handle left-clicks, ignore right-clicks (handled by contextmenu)
      if (e?.evt?.button !== 0) return

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
      // Only handle left-clicks, ignore right-clicks (handled by contextmenu)
      if (e?.evt?.button !== 0) return

      const shiftKey = e?.evt?.shiftKey || false

      if (!shiftKey) {
        this.layoutBuses.forEach(bus => bus.selected = false)
        this.layoutEdges.forEach(edg => {
          if (edg !== edge) edg.selected = false
        })
        this.activeTerminals = []
      }

      edge.selected = !edge.selected

      console.log('Edge clicked:', edge)
      this.$emit('edge-click', edge)
      this.emitSelectionChanged()
    },
    handleTerminalCapClick(edge, cap, e) {
      // Only handle left-clicks, ignore right-clicks (handled by contextmenu)
      if (e?.evt?.button !== 0) return

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
        this.layoutEdges.forEach(edg => edg.selected = false)

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

      const selectedBuses = this.layoutBuses.filter(b => b.selected)
      const selectedEdges = this.layoutEdges.filter(edge => edge.selected)
      const totalSelected = selectedBuses.length + selectedEdges.length

      this.contextMenu.show = false
      this.contextMenu.x = e.evt.clientX
      this.contextMenu.y = e.evt.clientY

      if (totalSelected > 1) {
        // Multiple objects selected
        this.contextMenu.objectType = 'Multiple Selection'
        this.contextMenu.targetObject = null
      } else {
        // No selection or single selection - show background menu
        this.contextMenu.objectType = 'Background'
        this.contextMenu.targetObject = null
      }

      this.$nextTick(() => {
        this.contextMenu.show = true
      })

      console.log('Background right-clicked at', e.evt.clientX, e.evt.clientY)
    },
    handleBusRightClick(bus, e) {
      e.evt.preventDefault()
      e.evt.stopPropagation() // Prevent event from bubbling to stage
      e.cancelBubble = true // For Konva compatibility

      const selectedBuses = this.layoutBuses.filter(b => b.selected)
      const selectedEdges = this.layoutEdges.filter(edge => edge.selected)
      const totalSelected = selectedBuses.length + selectedEdges.length

      console.log('Bus right-click DEBUG:', {
        busName: bus.name,
        busSelected: bus.selected,
        selectedBuses: selectedBuses.length,
        selectedEdges: selectedEdges.length,
        totalSelected: totalSelected,
        willShowMultiSelect: totalSelected > 1 && bus.selected
      })

      // If multiple objects are selected and this bus is one of them, show multi-select menu
      if (totalSelected > 1 && bus.selected) {
        console.log('Showing multi-select menu')
        this.contextMenu.show = false
        this.contextMenu.x = e.evt.clientX
        this.contextMenu.y = e.evt.clientY
        this.contextMenu.objectType = 'Multiple Selection'
        this.contextMenu.targetObject = null

        this.$nextTick(() => {
          this.contextMenu.show = true
        })
      } else {
        console.log('Showing single-select menu, clearing other selections')
        // Single selection - clear others and select this bus
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
      }

      console.log('Bus right-clicked:', bus.name, 'at', e.evt.clientX, e.evt.clientY)
      this.$emit('bus-right-click', { bus, x: e.evt.clientX, y: e.evt.clientY })
    },
    handleEdgeRightClick(edge, e) {
      e.evt.preventDefault()
      e.evt.stopPropagation() // Prevent event from bubbling to stage
      e.cancelBubble = true // For Konva compatibility

      const selectedBuses = this.layoutBuses.filter(b => b.selected)
      const selectedEdges = this.layoutEdges.filter(edg => edg.selected)
      const totalSelected = selectedBuses.length + selectedEdges.length

      // If multiple objects are selected and this edge is one of them, show multi-select menu
      if (totalSelected > 1 && edge.selected) {
        this.contextMenu.show = false
        this.contextMenu.x = e.evt.clientX
        this.contextMenu.y = e.evt.clientY
        this.contextMenu.objectType = 'Multiple Selection'
        this.contextMenu.targetObject = null

        this.$nextTick(() => {
          this.contextMenu.show = true
        })
      } else {
        // Single selection - clear others and select this edge
        this.layoutBuses.forEach(b => b.selected = false)
        this.layoutEdges.forEach(edg => edg.selected = false)

        edge.selected = true

        this.contextMenu.show = false
        this.contextMenu.x = e.evt.clientX
        this.contextMenu.y = e.evt.clientY
        this.contextMenu.objectType = 'Branch'
        this.contextMenu.targetObject = edge

        this.$nextTick(() => {
          this.contextMenu.show = true
        })
      }

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
    handleAddBus() {
      console.log('Show Bus clicked from context menu')
      // Emit event to parent component to handle add bus action
      this.$emit('add-bus-click')
      this.contextMenu.show = false
    },
    handleDisplayConfig() {
      console.log('Display Configuration clicked')
      this.contextMenu.show = false
      this.showDisplayDialog = true
    },
    resetVoltageColors() {
      this.voltageColors = { ...this.voltageColorsDefault }
      console.log('Reset voltage colors to default')
    },
    setVoltageColorsChip() {
      this.voltageColors = { ...this.voltageColorsChip }
      console.log('Set voltage colors to chip colors')
    },
    handleCreateBus() {
      console.log('Create Bus clicked from context menu')
      // Emit event to parent component to handle add bus action
      this.$emit('create-bus-click')
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
    handleHideSelected() {
      // Hide all selected buses
      const selectedBuses = this.layoutBuses.filter(b => b.selected)
      selectedBuses.forEach(bus => {
        bus.hidden = true
        bus.selected = false
        console.log('Hiding bus:', bus.name)
      })

      // Hide all selected edges
      const selectedEdges = this.layoutEdges.filter(e => e.selected)
      selectedEdges.forEach(edge => {
        edge.hidden = true
        edge.selected = false
        console.log('Hiding branch:', edge.name)
      })

      this.contextMenu.show = false
      this.emitSelectionChanged()
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
      // Shift + left mouse button - rectangle selection on empty canvas
      if (e.evt.button === 0 && e.evt.shiftKey) {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.getType() === 'Layer'

        if (clickedOnEmpty) {
          // Prevent default panning when shift is held
          e.evt.preventDefault()
          const stage = e.target.getStage()

          // Disable stage dragging temporarily for selection
          stage.draggable(false)

          const pointerPos = stage.getPointerPosition()
          const scale = stage.scaleX()

          // Convert pointer position to stage coordinates
          const x = (pointerPos.x - stage.x()) / scale
          const y = (pointerPos.y - stage.y()) / scale

          this.isSelecting = true
          this.selectionRect.x = x
          this.selectionRect.y = y
          this.selectionRect.width = 0
          this.selectionRect.height = 0
          this.selectionRect.visible = true
        }
      }
    },
    handleMouseMove(e) {
      if (this.isSelecting) {
        // Update selection rectangle
        const stage = e.target.getStage()
        const pointerPos = stage.getPointerPosition()
        const scale = stage.scaleX()

        // Convert pointer position to stage coordinates
        const currentX = (pointerPos.x - stage.x()) / scale
        const currentY = (pointerPos.y - stage.y()) / scale

        // Calculate rectangle dimensions (handle dragging in any direction)
        const startX = this.selectionRect.x
        const startY = this.selectionRect.y

        this.selectionRect.width = currentX - startX
        this.selectionRect.height = currentY - startY
      }
    },
    handleMouseUp(e) {
      if (this.isSelecting) {
        // Select all objects within the selection rectangle
        this.layoutBuses.forEach(bus => {
          if (this.isObjectInSelection(bus, this.selectionRect)) {
            bus.selected = true
          }
        })

        this.layoutEdges.forEach(edge => {
          if (this.isObjectInSelection(edge, this.selectionRect)) {
            edge.selected = true
          }
        })

        // Hide selection rectangle
        this.selectionRect.visible = false
        this.isSelecting = false

        // Re-enable stage dragging
        const stage = e.target.getStage()
        stage.draggable(true)

        // Emit selection changed event
        this.emitSelectionChanged()
      }
    },
    getBranchById(id) {
      return this.networkData.branches.find(b => b.id === parseInt(id))
    },
    getBusById(id) {
      return this.networkData.buses.find(b => b.id === parseInt(id))
    },
    formatBusLabel(bus) {
      // Get the original bus data from networkData
      const originalBus = this.networkData.buses.find(b => b.id === parseInt(bus.id))
      if (!originalBus) return bus.name

      const parts = []
      if (this.busDisplayConfig.id) parts.push(originalBus.id)
      if (this.busDisplayConfig.name) parts.push(originalBus.name)
      if (this.busDisplayConfig.bus_num) parts.push(originalBus.bus_num)
      if (this.busDisplayConfig.kv) parts.push(`${originalBus.kv}kV`)

      return parts.length > 0 ? parts.join(' | ') : ''
    },
    formatEdgeLabel(edge) {
      // Get the original branch data from networkData
      const originalBranch = this.networkData.branches.find(b => b.id === parseInt(edge.id))
      if (!originalBranch) return edge.name

      const parts = []
      if (this.edgeDisplayConfig.id) parts.push(originalBranch.id)
      if (this.edgeDisplayConfig.name) parts.push(originalBranch.name)
      if (this.edgeDisplayConfig.ckt) parts.push(originalBranch.ckt)

      return parts.length > 0 ? parts.join(' | ') : ''
    },
    getEdgeMidpoint(edge) {
      // Calculate midpoint and angle for transformer symbol placement
      const points = edge.points
      if (!points || points.length < 4) return null

      // For single segment (4 points), use true midpoint
      if (points.length === 4) {
        const x1 = points[0]
        const y1 = points[1]
        const x2 = points[2]
        const y2 = points[3]

        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)

        return { x: midX, y: midY, angle }
      }

      // For multi-segment edges, find the middle segment
      const numPoints = points.length / 2
      const midPointIndex = Math.floor(numPoints / 2)
      const midIndex = midPointIndex * 2

      const x1 = points[midIndex]
      const y1 = points[midIndex + 1]
      const x2 = points[midIndex + 2] || x1
      const y2 = points[midIndex + 3] || y1

      // Calculate midpoint of the middle segment
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2

      // Calculate angle for perpendicular orientation
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)

      return { x: midX, y: midY, angle }
    },
    getTransformerSymbolConfig(edge) {
      const midpoint = this.getEdgeMidpoint(edge)
      if (!midpoint) return null

      const radius = 8
      const spacing = 8 // Spacing between circles (increased for less overlap)

      // Convert angle to radians for calculation
      const angleRad = (midpoint.angle * Math.PI) / 180

      // Calculate circle positions along the edge direction
      const offsetX = Math.cos(angleRad) * spacing / 2
      const offsetY = Math.sin(angleRad) * spacing / 2

      // Calculate line endpoints to cover the edge behind the symbol
      const lineLength = spacing + radius * 2
      const lineOffsetX = Math.cos(angleRad) * lineLength / 2
      const lineOffsetY = Math.sin(angleRad) * lineLength / 2

      return {
        midX: midpoint.x,
        midY: midpoint.y,
        angle: midpoint.angle,
        radius,
        spacing,
        // Position circles along the edge direction
        circle1X: midpoint.x - offsetX,
        circle1Y: midpoint.y - offsetY,
        circle2X: midpoint.x + offsetX,
        circle2Y: midpoint.y + offsetY,
        // Line to hide edge behind symbol
        lineStartX: midpoint.x - lineOffsetX,
        lineStartY: midpoint.y - lineOffsetY,
        lineEndX: midpoint.x + lineOffsetX,
        lineEndY: midpoint.y + lineOffsetY
      }
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
    },
    unhideBusesAndBranches(busIds, branchIds) {
      // Unhide specific buses and branches (used after grow operation)
      const busIdSet = new Set(busIds.map(id => String(id)))
      const branchIdSet = new Set(branchIds.map(id => String(id)))

      this.layoutBuses.forEach(bus => {
        if (busIdSet.has(bus.id)) {
          bus.hidden = false
        }
      })

      this.layoutEdges.forEach(edge => {
        if (branchIdSet.has(edge.id)) {
          edge.hidden = false
        }
      })

      console.log(`Unhid ${busIds.length} buses and ${branchIds.length} branches from grow operation`)
    },
    isObjectInSelection(obj, selRect) {
      // Normalize selection rectangle to handle negative widths/heights
      const x1 = selRect.width >= 0 ? selRect.x : selRect.x + selRect.width
      const y1 = selRect.height >= 0 ? selRect.y : selRect.y + selRect.height
      const x2 = selRect.width >= 0 ? selRect.x + selRect.width : selRect.x
      const y2 = selRect.height >= 0 ? selRect.y + selRect.height : selRect.y

      // Check if bus is in selection (rectangle intersection)
      if (obj.width !== undefined && obj.height !== undefined) {
        const busX1 = obj.x
        const busY1 = obj.y
        const busX2 = obj.x + obj.width
        const busY2 = obj.y + obj.height

        // Check if rectangles intersect
        return !(busX2 < x1 || busX1 > x2 || busY2 < y1 || busY1 > y2)
      }

      // Check if edge is in selection (any point within bounds)
      if (obj.points !== undefined) {
        const points = obj.points
        for (let i = 0; i < points.length; i += 2) {
          const px = points[i]
          const py = points[i + 1]

          if (px >= x1 && px <= x2 && py >= y1 && py <= y2) {
            return true
          }
        }
      }

      return false
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

.voltage-label {
  font-weight: 500;
}

.voltage-color-config {
  padding: 8px 0;
}

.color-swatch {
  width: 40px;
  height: 30px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.color-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
