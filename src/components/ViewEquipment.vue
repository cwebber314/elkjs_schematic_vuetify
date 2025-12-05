<template>
  <v-dialog v-model="show" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Equipment Details</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="equipment.equip_id"
                label="Equipment ID"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="equipment.equip_name"
                label="Equipment Name"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="equipment.equip_rating"
                label="Rating"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model="equipment.branch_id"
                label="Branch ID"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="equipment.branch_name"
                label="Branch"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="equipment.node_id"
                label="Node ID"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model="equipment.node_name"
                label="Node"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="close">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'ViewEquipment',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    equipment: {
      type: Object,
      default: () => ({
        equip_id: '',
        equip_name: '',
        equip_rating: '',
        branch_id: '',
        branch_name: '',
        node_id: '',
        node_name: ''
      })
    }
  },
  emits: ['update:modelValue'],
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
  methods: {
    close() {
      this.show = false
    }
  }
}
</script>

<style scoped>
</style>
