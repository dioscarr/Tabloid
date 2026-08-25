import * as THREE from 'three'

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value))

export function mountTopology3D({ container, apps, routes, getMetric, onSelect }) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(0, 0, 13)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x070a11, 0)
  container.replaceChildren(renderer.domElement)

  const brain = new THREE.Group()
  scene.add(brain)
  const nodeMeshes = []
  const labels = []
  const particles = []
  const points = new Map()
  const positions = [
    [-2.7, 1.65, 0.2], [-1.2, 2.8, -0.1], [1.25, 2.8, 0.1], [2.7, 1.65, 0.2],
    [-3.15, -0.15, 0.5], [-1.45, -0.4, 0], [1.45, -0.4, 0], [3.15, -0.15, 0.5],
    [-2.25, -2.05, -0.2], [0, -2.5, 0.15], [2.25, -2.05, -0.2],
  ]
  const byId = new Map(apps.map((app, index) => [app.id, { app, position: positions[index % positions.length] }]))

  const ambient = new THREE.AmbientLight(0x8ba7ff, 1.8)
  scene.add(ambient)
  const key = new THREE.PointLight(0x8b5cf6, 18, 18)
  key.position.set(0, 1, 4)
  scene.add(key)

  const brainMaterial = new THREE.MeshBasicMaterial({ color: 0x6d28d9, transparent: true, opacity: 0.045, wireframe: true })
  const brainShape = new THREE.Mesh(new THREE.SphereGeometry(4.15, 28, 18), brainMaterial)
  brainShape.scale.set(1.05, 0.82, 0.55)
  brain.add(brainShape)

  const makeNode = (app, position) => {
    const color = new THREE.Color(app.color)
    const group = new THREE.Group()
    group.position.set(...position)
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 }))
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), new THREE.MeshBasicMaterial({ color }))
    group.add(glow, core)
    group.userData.appId = app.id
    brain.add(group)
    nodeMeshes.push(group)
    points.set(app.id, group.position)

    const label = document.createElement('button')
    label.type = 'button'
    label.className = 'topology-3d-label'
    label.innerHTML = `<strong>${app.name}</strong><small>${app.role}</small>`
    label.addEventListener('click', () => onSelect(app.id))
    container.append(label)
    labels.push({ element: label, object: group })
  }

  for (const { app, position } of byId.values()) makeNode(app, position)

  const makeEdge = (route) => {
    const source = points.get(route.from)
    const target = points.get(route.to)
    if (!source || !target) return
    const metric = getMetric(route)
    const material = new THREE.LineBasicMaterial({ color: route.health === 'warning' ? 0xfb923c : 0x34d399, transparent: true, opacity: metric ? 0.58 : 0.16 })
    brain.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([source, target]), material))
    if (!metric || !metric.activeConnections) return
    const count = Math.min(12, metric.activeConnections)
    for (let index = 0; index < count; index += 1) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: material.color }))
      particle.userData = { source, target, offset: index / count, speed: 0.00008 + index * 0.000006 }
      brain.add(particle)
      particles.push(particle)
    }
  }

  routes.forEach(makeEdge)
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let dragging = false
  let moved = false
  let lastX = 0
  let lastY = 0
  let targetZoom = 13
  let focusedId = null

  const resize = () => {
    const { width, height } = container.getBoundingClientRect()
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  const pointerPosition = (event) => {
    const bounds = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  }
  const focus = (id) => {
    focusedId = id
    const object = nodeMeshes.find((node) => node.userData.appId === id)
    if (object) {
      brain.userData.focus = object.position.clone().multiplyScalar(-0.28)
      targetZoom = 9
      onSelect(id)
    }
  }
  const down = (event) => { dragging = true; moved = false; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId) }
  const move = (event) => {
    if (!dragging) return
    const deltaX = event.clientX - lastX
    const deltaY = event.clientY - lastY
    moved ||= Math.abs(deltaX) + Math.abs(deltaY) > 3
    brain.rotation.y += deltaX * 0.008
    brain.rotation.x = clamp(brain.rotation.x + deltaY * 0.006, -0.8, 0.8)
    lastX = event.clientX
    lastY = event.clientY
  }
  const up = (event) => {
    dragging = false
    if (!moved) {
      pointerPosition(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(nodeMeshes, true)[0]
      if (hit) focus(hit.object.parent?.userData.appId || hit.object.userData.appId)
    }
  }
  renderer.domElement.addEventListener('pointerdown', down)
  renderer.domElement.addEventListener('pointermove', move)
  renderer.domElement.addEventListener('pointerup', up)
  renderer.domElement.addEventListener('wheel', (event) => { event.preventDefault(); targetZoom = clamp(targetZoom + event.deltaY * 0.012, 7, 18) }, { passive: false })
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  let frame
  const animate = (time) => {
    frame = requestAnimationFrame(animate)
    brain.position.lerp(brain.userData.focus || new THREE.Vector3(), 0.04)
    camera.position.z += (targetZoom - camera.position.z) * 0.06
    for (const particle of particles) {
      const { source, target, offset, speed } = particle.userData
      const progress = (time * speed + offset) % 1
      particle.position.lerpVectors(source, target, progress)
    }
    for (const label of labels) {
      const position = label.object.position.clone()
      label.object.getWorldPosition(position)
      position.project(camera)
      const visible = position.z < 1
      label.element.hidden = !visible
      label.element.style.transform = `translate(${(position.x * 0.5 + 0.5) * container.clientWidth}px,${(-position.y * 0.5 + 0.5) * container.clientHeight}px)`
      label.element.classList.toggle('selected', label.object.userData.appId === focusedId)
    }
    renderer.render(scene, camera)
  }
  animate(0)

  return {
    destroy() {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.dispose()
      container.replaceChildren()
      labels.forEach(({ element }) => element.remove())
    },
    focus,
  }
}
