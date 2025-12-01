import { createRouter, createWebHistory } from 'vue-router'
import Simple from '../views/Simple.vue'
import Grow from '../views/Grow.vue'
import Hide from '../views/Hide.vue'
import AddObject from '../views/AddObject.vue'
import UpdateProperties from '../views/UpdateProperties.vue'
import Related from '../views/Related.vue'
import RightClick from '../views/RightClick.vue'

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
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
