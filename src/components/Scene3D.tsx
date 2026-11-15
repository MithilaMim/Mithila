import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Scene3DProps {
  className?: string;
}

export function Scene3D({ className = '' }: Scene3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Probe for software WebGL (SwiftShader, llvmpipe, WARP) to adjust rendering cost cleanly
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 7.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Studio environment map for realistic PBR reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xeee8fb, 0xd9d4cc, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.8);
    keyLight.position.set(5, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc4b5fd, 1.25);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // Composite 9-part Architectural Kinetic Sculpture (THREE.Group)
    const sculpture = new THREE.Group();
    sculpture.position.set(2.05, 0.15, 0);
    scene.add(sculpture);

    // Materials with varied roughness & metalness (>= 0.25 delta between adjacent parts)
    const brushedCharcoalMat = new THREE.MeshStandardMaterial({
      color: 0x202026,
      metalness: 0.88,
      roughness: 0.24,
    });

    const mattePlasterMat = new THREE.MeshStandardMaterial({
      color: 0xf1eee9,
      metalness: 0.05,
      roughness: 0.78,
    });

    const satinLavenderMat = new THREE.MeshStandardMaterial({
      color: 0xa796d8,
      metalness: 0.52,
      roughness: 0.34,
    });

    const crystalCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0xd9cff7,
      metalness: 0.05,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.78,
      transparent: true,
      opacity: isSoftwareGl ? 0.55 : 1,
      ior: 1.54,
      thickness: 1.2,
      attenuationColor: new THREE.Color(0x9a84d6),
      attenuationDistance: 1.6,
    });

    // 1. Primary Outer Architectural Ring
    const outerRingGeo = new THREE.TorusGeometry(1.52, 0.038, 24, 96);
    const outerRing = new THREE.Mesh(outerRingGeo, brushedCharcoalMat);
    outerRing.rotation.x = Math.PI * 0.16;
    sculpture.add(outerRing);

    // 2. Secondary Tilted Lavender Ring
    const midRingGeo = new THREE.TorusGeometry(1.16, 0.024, 20, 84);
    const midRing = new THREE.Mesh(midRingGeo, satinLavenderMat);
    midRing.rotation.y = Math.PI * 0.32;
    midRing.rotation.x = -Math.PI * 0.18;
    sculpture.add(midRing);

    // 3. Inner Off-White Architectural Frame Ring
    const innerRingGeo = new THREE.TorusGeometry(0.84, 0.022, 16, 72);
    const innerRing = new THREE.Mesh(innerRingGeo, mattePlasterMat);
    innerRing.rotation.z = Math.PI * 0.25;
    sculpture.add(innerRing);

    // 4. Faceted Crystalline Core
    const coreGeo = new THREE.OctahedronGeometry(0.52, 0);
    const coreMesh = new THREE.Mesh(coreGeo, crystalCoreMat);
    sculpture.add(coreMesh);

    // 5. Core Charcoal Collar Frame (around crystal)
    const collarGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.04, 6, 1, true);
    const collarMesh = new THREE.Mesh(collarGeo, brushedCharcoalMat);
    collarMesh.rotation.z = Math.PI * 0.12;
    sculpture.add(collarMesh);

    // 6-9. Four Architectural Satellites / Counterweights
    const satGeoA = new THREE.OctahedronGeometry(0.11, 0);
    const satGeoB = new THREE.BoxGeometry(0.14, 0.14, 0.14);

    const sat1 = new THREE.Mesh(satGeoA, brushedCharcoalMat);
    sat1.position.set(1.52, 0, 0);
    outerRing.add(sat1);

    const sat2 = new THREE.Mesh(satGeoA, satinLavenderMat);
    sat2.position.set(-1.52, 0, 0);
    outerRing.add(sat2);

    const sat3 = new THREE.Mesh(satGeoB, mattePlasterMat);
    sat3.position.set(0, 1.16, 0);
    sat3.rotation.set(0.4, 0.6, 0.2);
    midRing.add(sat3);

    const sat4 = new THREE.Mesh(satGeoB, brushedCharcoalMat);
    sat4.position.set(0, -1.16, 0);
    sat4.rotation.set(0.2, 0.3, 0.5);
    midRing.add(sat4);

    // Secondary floating ambient cluster for parallax depth in lower-left
    const secondaryCluster = new THREE.Group();
    secondaryCluster.position.set(-2.9, -1.65, -2.2);
    scene.add(secondaryCluster);

    const minorRingGeo = new THREE.TorusGeometry(0.65, 0.02, 16, 64);
    const minorRing = new THREE.Mesh(minorRingGeo, satinLavenderMat);
    secondaryCluster.add(minorRing);

    const minorCoreGeo = new THREE.IcosahedronGeometry(0.24, 0);
    const minorCore = new THREE.Mesh(minorCoreGeo, mattePlasterMat);
    secondaryCluster.add(minorCore);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Mouse & Scroll Parallax Targets
    let targetMouseX = 0;
    let targetMouseY = 0;
    let smoothMouseX = 0;
    let smoothMouseY = 0;
    let targetScroll = window.scrollY;
    let smoothScroll = window.scrollY;

    const onPointerMove = (e: PointerEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const onScroll = () => {
      targetScroll = window.scrollY;
    };

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Position adjustment for mobile vs desktop
    const updateResponsivePlacement = () => {
      const isNarrow = width < 900;
      sculpture.position.x = isNarrow ? 0.35 : 2.1;
      sculpture.scale.setScalar(isNarrow ? 0.68 : 1.0);
    };
    updateResponsivePlacement();
    window.addEventListener('resize', updateResponsivePlacement);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      smoothMouseX = THREE.MathUtils.damp(smoothMouseX, targetMouseX, 4.5, delta);
      smoothMouseY = THREE.MathUtils.damp(smoothMouseY, targetMouseY, 4.5, delta);
      smoothScroll = THREE.MathUtils.damp(smoothScroll, targetScroll, 5, delta);

      const scrollFactor = Math.min(smoothScroll / Math.max(window.innerHeight, 1), 4);

      if (!prefersReducedMotion) {
        outerRing.rotation.z = elapsed * 0.14 + scrollFactor * 0.45;
        outerRing.rotation.y = smoothMouseX * 0.28 + Math.sin(elapsed * 0.3) * 0.08;

        midRing.rotation.x = -Math.PI * 0.18 + elapsed * 0.22 - smoothMouseY * 0.25;
        midRing.rotation.z = elapsed * 0.12 + scrollFactor * 0.35;

        innerRing.rotation.y = -elapsed * 0.24 + smoothMouseX * 0.2;
        coreMesh.rotation.y = elapsed * 0.35 + smoothMouseX * 0.45;
        coreMesh.rotation.x = Math.sin(elapsed * 0.5) * 0.25 + smoothMouseY * 0.35;
        collarMesh.rotation.y = -elapsed * 0.2;

        sculpture.position.y = 0.15 + Math.sin(elapsed * 0.8) * 0.08 - scrollFactor * 0.65;
        sculpture.rotation.y = smoothMouseX * 0.18 - scrollFactor * 0.22;
        sculpture.rotation.x = smoothMouseY * 0.14;

        secondaryCluster.rotation.y = -elapsed * 0.18 + smoothMouseX * 0.25;
        secondaryCluster.rotation.x = elapsed * 0.14 + scrollFactor * 0.5;
        secondaryCluster.position.y = -1.65 + scrollFactor * 0.55;
      }

      renderer.render(scene, camera);

      if (prefersReducedMotion) return;

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('resize', updateResponsivePlacement);

      outerRingGeo.dispose();
      midRingGeo.dispose();
      innerRingGeo.dispose();
      coreGeo.dispose();
      collarGeo.dispose();
      satGeoA.dispose();
      satGeoB.dispose();
      minorRingGeo.dispose();
      minorCoreGeo.dispose();

      brushedCharcoalMat.dispose();
      mattePlasterMat.dispose();
      satinLavenderMat.dispose();
      crystalCoreMat.dispose();
      envTarget.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  );
}
