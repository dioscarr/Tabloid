import * as THREE from 'three'

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value))

export function mountTopology3D({ container, apps, routes, getMetric, onSelect }) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0.2, 14)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x070a11, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.replaceChildren(renderer.domElement)

  const topology = new THREE.Group()
  scene.add(topology)
  const points = new Map()
  const nodes = []
  const labels = []
  const particles = []
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const positions = [
    [-2.9, 1.45, 0.8], [-1.15, 2.6, -0.3], [1.15, 2.6, 0.1], [2.9, 1.45, 0.6],
    [-3.2, -0.15, -0.2], [-1.35, -0.7, 0.9], [1.35, -0.7, 0.4], [3.2, -0.15, -0.4],
    [-2.15, -2.1, -0.2], [0, -2.5, 0.7], [2.15, -2.1, 0],
  ]
  const byId = new Map(apps.map((app, index) => [app.id, { app, position: positions[index % positions.length] }]))

  scene.add(new THREE.AmbientLight(0x899cff, 1.4))
  const key = new THREE.DirectionalLight(0xd8d2ff, 3.2)
  key.position.set(-4, 5, 7)
  scene.add(key)
  const rim = new THREE.PointLight(0x22d3ee, 18, 18)
  rim.position.set(4, -2, 4)
  scene.add(rim)

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.7, 3),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x4c1d95, emissiveIntensity: 0.85, roughness: 0.3, metalness: 0.35, transparent: true, opacity: 0.62 }),
  )
  topology.add(core)
  const halo = new THREE.Mesh(new THREE.SphereGeometry(2.15, 32, 20), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.055, side: THREE.BackSide }))
  topology.add(halo)
  for (const [tilt, color] of [[0.25, 0x8b5cf6], [-0.4, 0x22d3ee], [0.95, 0xfb7185]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.018, 8, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42 }))
    ring.rotation.set(tilt, tilt * 0.7, tilt * 0.35)
    topology.add(ring)
  }

  const stars = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 180 }, () => new THREE.Vector3((Math.random() - 0.5) * 17, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8))),
    new THREE.PointsMaterial({ color: 0x8b9ac6, size: 0.018, transparent: true, opacity: 0.7 }),
  )
  scene.add(stars)

  const makeNode = (app, position) => {
    const color = new THREE.Color(app.color)
    const group = new THREE.Group()
    group.position.set(...position)
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16 }))
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.25, metalness: 0.2 }))
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 }))
    orbit.rotation.x = Math.PI / 2
    group.add(glow, coreMesh, orbit)
    group.userData.appId = app.id
    topology.add(group)
    nodes.push(group)
    points.set(app.id, group.position)

    const label = document.createElement('button')
    label.type = 'button'
    label.className = 'topology-3d-label'
    label.setAttribute('aria-label', `Focus ${app.name}, ${app.role}`)
    const name = document.createElement('strong')
    name.textContent = app.name
    const role = document.createElement('small')
    role.textContent = app.role
    label.replaceChildren(name, role)
    label.addEventListener('click', () => focus(app.id))
    container.append(label)
    labels.push({ element: label, object: group })
  }
  for (const { app, position } of byId.values()) makeNode(app, position)

  const makeEdge = (route) => {
    const source = points.get(route.from), target = points.get(route.to)
    if (!source || !target) return
    const metric = getMetric(route)
    const midpoint = source.clone().add(target).multiplyScalar(0.5)
    midpoint.z += source.distanceTo(target) > 4 ? 1.1 : 0.55
    const curve = new THREE.QuadraticBezierCurve3(source, midpoint, target)
    const color = route.health === 'warning' ? 0xfb923c : 0x34d399
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: metric ? 0.62 : 0.2 }),
    )
    topology.add(line)
    const count = Math.min(8, metric?.activeConnections || 0)
    for (let index = 0; index < count; index += 1) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color }))
      particle.userData = { curve, offset: index / count, speed: 0.00012 + index * 0.00001 }
      topology.add(particle)
      particles.push(particle)
    }
  }
  routes.forEach(makeEdge)

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let dragging = false, moved = false, lastX = 0, lastY = 0, targetZoom = 14, focusedId = null
  const focus = (id) => {
    focusedId = id
    const object = nodes.find((node) => node.userData.appId === id)
    if (object) {
      topology.userData.focus = object.position.clone().multiplyScalar(-0.22)
      targetZoom = 10.5
      onSelect(id)
    }
  }
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
  const down = (event) => { dragging = true; moved = false; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId) }
  const move = (event) => {
    if (!dragging) return
    const deltaX = event.clientX - lastX, deltaY = event.clientY - lastY
    moved ||= Math.abs(deltaX) + Math.abs(deltaY) > 3
    topology.rotation.y += deltaX * 0.007
    topology.rotation.x = clamp(topology.rotation.x + deltaY * 0.005, -0.7, 0.7)
    lastX = event.clientX; lastY = event.clientY
  }
  const up = (event) => {
    dragging = false
    if (!moved) {
      pointerPosition(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(nodes, true)[0]
      if (hit) focus(hit.object.parent?.userData.appId || hit.object.userData.appId)
    }
  }
  renderer.domElement.addEventListener('pointerdown', down)
  renderer.domElement.addEventListener('pointermove', move)
  renderer.domElement.addEventListener('pointerup', up)
  renderer.domElement.addEventListener('wheel', (event) => { event.preventDefault(); targetZoom = clamp(targetZoom + event.deltaY * 0.012, 7.5, 19) }, { passive: false })
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  let frame
  const animate = (time) => {
    frame = requestAnimationFrame(animate)
    if (!reducedMotion) {
      core.rotation.y += 0.0018
      stars.rotation.y += 0.00015
      topology.rotation.z += 0.00008
    }
    topology.position.lerp(topology.userData.focus || new THREE.Vector3(), 0.045)
    camera.position.z += (targetZoom - camera.position.z) * 0.06
    for (const particle of particles) particle.position.copy(particle.userData.curve.getPointAt((time * particle.userData.speed + particle.userData.offset) % 1))
    for (const label of labels) {
      const position = new THREE.Vector3()
      label.object.getWorldPosition(position).project(camera)
      const visible = position.z < 1 && position.z > -1
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
      renderer.domElement.removeEventListener('pointerdown', down)
      renderer.domElement.removeEventListener('pointermove', move)
      renderer.domElement.removeEventListener('pointerup', up)
      scene.traverse((object) => { object.geometry?.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material?.dispose() })
      renderer.dispose()
      container.replaceChildren()
    },
    focus,
  }
}
