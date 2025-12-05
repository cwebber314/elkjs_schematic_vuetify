<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>ELK.js Schematic Sandbox</v-app-bar-title>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      temporary
      location="left">
      <v-list>
        <v-list-item
          prepend-icon="mdi-home"
          title="ELK.js Schematic Sandbox"
          subtitle="Navigation"
        ></v-list-item>
      </v-list>

      <v-divider></v-divider>

      <v-list nav density="compact">
        <v-list-item
          prepend-icon="mdi-gesture-tap"
          title="Simple"
          value="simple"
          to="/simple"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-vector-square"
          title="SimpleComponent"
          value="simple-component"
          to="/simple"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-arrow-expand-all"
          title="Grow"
          value="grow"
          to="/grow"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-eye-off"
          title="Hide"
          value="hide"
          to="/hide"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-cog"
          title="Properties"
          value="properties"
          to="/update-properties"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-relation-many-to-many"
          title="Related"
          value="related"
          to="/related"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-mouse-right-click"
          title="Right Click"
          value="right-click"
          to="/right-click"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-plus-circle"
          title="Add"
          value="add"
          to="/add-object"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-electric-switch"
          title="Terminal"
          value="terminal"
          to="/terminal"
        ></v-list-item>

        <v-list-item
          prepend-icon="mdi-database-edit"
          title="CRUD"
          value="crud"
          to="/terminal-crud"
        ></v-list-item>

                <v-list-item
          prepend-icon="mdi-database-edit"
          title="CRUD (Component)"
          value="crud-component"
          to="/terminal-crud-component"
        ></v-list-item>

      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      drawer: false
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
