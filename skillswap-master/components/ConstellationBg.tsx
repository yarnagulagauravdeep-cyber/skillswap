"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ambient community graph: nodes (people) drift and link up when near
 * (an exchange). Ortho scene, marigold points + teal threads. Subtle by design;
 * renders a single static frame when the viewer prefers reduced motion.
 */
export function ConstellationBg() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let w = mount.clientWidth || 1;
    let h = mount.clientHeight || 1;
    let aspect = w / h;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio?.(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const N = 46;
    const LINK = 0.62; // link distance in world units
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * aspect;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = 0;
      const a = Math.random() * Math.PI * 2;
      const s = 0.0016 + Math.random() * 0.0022;
      vel[i * 2] = Math.cos(a) * s;
      vel[i * 2 + 1] = Math.sin(a) * s;
    }

    // Nodes
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: 0xea8c0c,
      size: 4.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
    });
    const points = new THREE.Points(nodeGeo, nodeMat);
    scene.add(points);

    // Links
    const maxVerts = N * N * 3;
    const linePos = new Float32Array(maxVerts);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x139e8b,
      transparent: true,
      opacity: 0.28,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    function rebuildLinks() {
      let v = 0;
      for (let i = 0; i < N; i++) {
        const ix = pos[i * 3];
        const iy = pos[i * 3 + 1];
        for (let j = i + 1; j < N; j++) {
          const dx = ix - pos[j * 3];
          const dy = iy - pos[j * 3 + 1];
          if (dx * dx + dy * dy < LINK * LINK) {
            linePos[v++] = ix;
            linePos[v++] = iy;
            linePos[v++] = 0;
            linePos[v++] = pos[j * 3];
            linePos[v++] = pos[j * 3 + 1];
            linePos[v++] = 0;
          }
        }
      }
      lineGeo.setDrawRange(0, v / 3);
      (lineGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    function step() {
      for (let i = 0; i < N; i++) {
        pos[i * 3] += vel[i * 2];
        pos[i * 3 + 1] += vel[i * 2 + 1];
        if (pos[i * 3] > aspect) pos[i * 3] = -aspect;
        else if (pos[i * 3] < -aspect) pos[i * 3] = aspect;
        if (pos[i * 3 + 1] > 1) pos[i * 3 + 1] = -1;
        else if (pos[i * 3 + 1] < -1) pos[i * 3 + 1] = 1;
      }
      (nodeGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      rebuildLinks();
      renderer.render(scene, camera);
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    const loop = () => {
      step();
      raf = requestAnimationFrame(loop);
    };
    if (reduced) {
      rebuildLinks();
      renderer.render(scene, camera);
    } else {
      loop();
    }

    function onResize() {
      w = mount!.clientWidth || 1;
      h = mount!.clientHeight || 1;
      aspect = w / h;
      camera.left = -aspect;
      camera.right = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      nodeGeo.dispose();
      nodeMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(120%_90%_at_60%_25%,black,transparent)]"
    />
  );
}
