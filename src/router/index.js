import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Simple from '../views/Simple.vue'
import Grow from '../views/Grow.vue'
import Hide from '../views/Hide.vue'
import AddObject from '../views/AddObject.vue'
import UpdateProperties from '../views/UpdateProperties.vue'
import Related from '../views/Related.vue'
import RightClick from '../views/RightClick.vue'
import Terminal from '../views/Terminal.vue'
import SimpleComponent from '../views/SimpleComponent.vue'
import TerminalCRUD from '../views/TerminalCRUD.vue'
import TerminalCRUDComponent from '../views/TerminalCRUDComponent.vue'
import MutualDetails from '../views/MutualDetails.vue'

const routes = [
  {
    path: '/',
    redirect: '/simple'
  },
  {
    path: '/simple',
    name: 'Simple',
    component: Simple
  },
  {
    path: '/simple-component',
    name: 'SimpleComponent',
    component: SimpleComponent
  },
  {
    path: '/grow',
    name: 'Grow',
    component: Grow
  },
  {
    path: '/hide',
    name: 'Hide',
    component: Hide
  },
  {
    path: '/update-properties',
    name: 'UpdateProperties',
    component: UpdateProperties
  },
  {
    path: '/related',
    name: 'Related',
    component: Related
  },
  {
    path: '/right-click',
    name: 'RightClick',
    component: RightClick
  },
  {
    path: '/add-object',
    name: 'AddObject',
    component: AddObject
  },
  {
    path: '/terminal',
    name: 'Terminal',
    component: Terminal
  },
  {
    path: '/terminal-crud',
    name: 'TerminalCRUD',
    component: TerminalCRUD
  },
  {
    path: '/terminal-crud-component',
    name: 'TerminalCRUDComponent',
    component: TerminalCRUDComponent
  },
  {
    path: '/mutual-details',
    name: 'MutualDetails',
    component: MutualDetails
  }
]

const router = createRouter({
  // history: createWebHistory(),
  // The hash router might play better with static sites, but you can also 
  // just fix it on the hosting platform by redirecting everything it can't find to index.html
  // The hash router is generally useful when there's no server - which makes sense for our static site deploy
  // example: https://localhost/#/simple
  history: createWebHashHistory(),
  routes
})

export default router
