"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { gsap } from "gsap"
import {
  backgroundFragmentShader,
  backgroundVertexShader,
  particleFragmentShader,
  particleVertexShader,
  fragmentShader,
  vertexShader,
} from "./advanced-shaders"

export function AdvancedSearchOrb() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scene = new THREE.Scene()
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    const clock = new THREE.Clock()

    // Setup
    const width = container.clientWidth
    const height = container.clientHeight
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 10000)
    camera.position.set(0, 0, 8) // Updated camera position

    // Materials
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      wireframe: false,
      uniforms: {
        u_time: { value: 0 },
        u_progress: { value: 0 },
      },
    })

    const pointsMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      wireframe: false,
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        u_time: { value: 0 },
        u_progress: { value: 0 },
      },
    })

    const backgroundMaterial = new THREE.ShaderMaterial({
      vertexShader: backgroundVertexShader,
      fragmentShader: backgroundFragmentShader,
      wireframe: false,
      uniforms: {
        u_time: { value: 0 },
        u_progress: { value: 0 },
      },
    })

    // Geometry
    const geometry = new THREE.SphereGeometry(0.8, 162, 162) // Updated sphere geometry
    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    // Particles
    const N = 30000
    const position = new Float32Array(N * 3)
    const particleGeometry = new THREE.BufferGeometry()

    const inc = Math.PI * (3 - Math.sqrt(5))
    const offset = 2 / N
    const radius = 1.6 // Updated particle radius

    for (let i = 0; i < N; i++) {
      const y = i * offset - 1 + offset / 2
      const r = Math.sqrt(1 - y * y)
      const phi = i * inc

      position[3 * i] = radius * Math.cos(phi) * r
      position[3 * i + 1] = radius * y
      position[3 * i + 2] = radius * Math.sin(phi) * r
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(position, 3))

    const points = new THREE.Points(particleGeometry, pointsMaterial)
    scene.add(points)

    // Animation
    gsap
      .timeline({
        repeat: -1,
        yoyo: true,
      })
      .to(material.uniforms.u_progress, {
        value: 5,
        duration: 5,
        ease: "power3.inOut",
      })
      .to(material.uniforms.u_progress, {
        value: 1,
        duration: 5,
        ease: "power3.inOut",
      })

    gsap.to(pointsMaterial.uniforms.u_progress, {
      value: 0.4,
      duration: 5,
      ease: "power3.inOut",
      repeat: -1,
      yoyo: true,
    })

    // Render loop
    const animate = () => {
      const elapsedTime = clock.getElapsedTime()

      material.uniforms.u_time.value = elapsedTime
      pointsMaterial.uniforms.u_time.value = elapsedTime
      backgroundMaterial.uniforms.u_time.value = elapsedTime

      points.rotation.y += 0.005
      sphere.rotation.y += 0.001

      camera.lookAt(scene.position)
      renderer.render(scene, camera)

      requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      const width = container.clientWidth
      const height = container.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()

      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      particleGeometry.dispose()
      pointsMaterial.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        width: "80px",
        height: "80px",
      }}
    />
  )
}

