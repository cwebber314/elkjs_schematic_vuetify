<template>
  <v-dialog v-model="show" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Edit Edge Properties</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="editedEdge.id"
                label="ID"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="editedEdge.name"
                label="Name"
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="4">
              <v-text-field
                v-model.number="editedEdge.node1_id"
                label="Node 1 ID"
                type="number"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="4">
              <v-text-field
                v-model.number="editedEdge.node2_id"
                label="Node 2 ID"
                type="number"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="4">
              <v-text-field
                v-model="editedEdge.ckt"
                label="Circuit"
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="editedEdge.labelX"
                label="Label X Position"
                type="number"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model.number="editedEdge.labelY"
                label="Label Y Position"
                type="number"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="pointsDisplay"
                label="Points (read-only)"
                disabled
                variant="outlined"
                rows="3"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="cancel">
          Cancel
        </v-btn>
        <v-btn color="primary" variant="text" @click="save" :loading="saving">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'EditEdge',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    edge: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'save'],
  data() {
    return {
      saving: false,
      editedEdge: {
        id: '',
        name: '',
        node1_id: 0,
        node2_id: 0,
        ckt: '',
        labelX: 0,
        labelY: 0,
        points: []
      }
    }
  },
  computed: {
    show: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    },
    pointsDisplay() {
      if (!this.editedEdge.points || this.editedEdge.points.length === 0) {
        return ''
      }
      // Format points array as pairs of coordinates
      const pairs = []
      for (let i = 0; i < this.editedEdge.points.length; i += 2) {
        pairs.push(`(${this.editedEdge.points[i]}, ${this.editedEdge.points[i + 1]})`)
      }
      return pairs.join(' -> ')
    }
  },
  watch: {
    edge: {
      immediate: true,
      handler(newEdge) {
        if (newEdge) {
          // Copy all attributes from the edge
          this.editedEdge = { ...newEdge }
        }
      }
    }
  },
  methods: {
    cancel() {
      this.show = false
    },
    async save() {
      this.saving = true

      try {
        // Mock fetch call to save edge properties
        await this.mockUpdateEdge(this.editedEdge)

        // Emit save event with updated edge data
        this.$emit('save', { ...this.editedEdge })

        this.show = false
      } catch (error) {
        console.error('Error saving edge:', error)
      } finally {
        this.saving = false
      }
    },
    async mockUpdateEdge(edgeData) {
      // Simulate an API call with a delay
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('Mock API: Updating edge with data:', edgeData)

          // Simulate a successful response
          resolve({
            success: true,
            data: edgeData,
            message: 'Edge updated successfully'
          })
        }, 500)
      })
    }
  }
}
</script>

<style scoped>
</style>
