<template>
  <v-dialog v-model="show" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Edit Bus Properties</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="editedNode.id"
                label="ID"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="editedNode.name"
                label="Name"
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="editedNode.bus_num"
                label="Bus Number"
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model="editedNode.kv"
                label="kV"
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="editedNode.x"
                label="X Position"
                type="number"
                variant="outlined"
                disabled
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model.number="editedNode.y"
                label="Y Position"
                type="number"
                variant="outlined"
                disabled
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="editedNode.width"
                label="Width"
                type="number"
                variant="outlined"
                disabled
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model.number="editedNode.height"
                label="Height"
                type="number"
                variant="outlined"
                disabled
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="cancel">
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
  name: 'EditNode',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    node: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'save'],
  data() {
    return {
      saving: false,
      editedNode: {
        id: '',
        name: '',
        bus_num: '',
        kv: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0
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
    }
  },
  watch: {
    node: {
      immediate: true,
      handler(newBus) {
        if (newBus) {
          // Copy all attributes from the bus
          this.editedNode = { ...newBus }
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
        // Mock fetch call to save bus properties
        await this.mockUpdateBus(this.editedNode)

        // Emit save event with updated bus data
        this.$emit('save', { ...this.editedNode })

        this.show = false
      } catch (error) {
        console.error('Error saving bus:', error)
      } finally {
        this.saving = false
      }
    },
    async mockUpdateBus(busData) {
      // Simulate an API call with a delay
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('Mock API: Updating bus with data:', busData)

          // Simulate a successful response
          resolve({
            success: true,
            data: busData,
            message: 'Bus updated successfully'
          })
        }, 500)
      })
    }
  }
}
</script>

<style scoped>
</style>
