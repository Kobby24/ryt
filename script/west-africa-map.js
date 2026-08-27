async function initWestAfricaMap() {
  const stage = document.querySelector('.consar-africa-map-stage');
  if (!stage || stage.dataset.mapReady === '1') {
    return;
  }

  const fallbackImage = stage.querySelector('.consar-africa-map-fallback');
  const svgUrl = stage.dataset.svgSrc || 'src/West-Africa.svg';

  try {
    const [
      THREE,
      { SVGLoader },
    ] = await Promise.all([
      import('https://esm.sh/three@0.176.0'),
      import('https://esm.sh/three@0.176.0/examples/jsm/loaders/SVGLoader.js'),
    ]);

    const response = await fetch(svgUrl, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error('Failed to load West Africa SVG');
    }

    const svgText = await response.text();
    const svgDoc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svgPathNodes = Array.from(svgDoc.querySelectorAll('path'));
    const svgViewBox = svgDoc.documentElement.getAttribute('viewBox') || '0 0 899.2 644.6';
    const [, , viewBoxWidthRaw, viewBoxHeightRaw] = svgViewBox.split(/\s+/);
    const viewBoxWidth = Number.parseFloat(viewBoxWidthRaw) || 899.2;
    const viewBoxHeight = Number.parseFloat(viewBoxHeightRaw) || 644.6;

    const loader = new SVGLoader();
    const svgData = loader.parse(svgText);

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'consar-africa-webgl';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    stage.appendChild(renderer.domElement);

    const overlay = document.createElement('div');
    overlay.className = 'consar-africa-map-overlay';
    overlay.innerHTML = '<div class="consar-africa-chip">Our Presence</div>';
    stage.appendChild(overlay);
    const chip = overlay.querySelector('.consar-africa-chip');
    Object.assign(overlay.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      zIndex: '8',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'translate3d(-9999px, -9999px, 0)',
      transition: 'opacity 140ms ease',
      display: 'block',
    });
    if (chip instanceof HTMLElement) {
      Object.assign(chip.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        padding: '10px 14px',
        border: '1px solid rgba(9, 18, 49, 0.08)',
        borderRadius: '14px',
        background: 'rgba(9, 18, 49, 0.94)',
        color: '#ECEEE9',
        boxShadow: '0 14px 32px rgba(9, 18, 49, 0.2)',
        fontSize: '13px',
        fontWeight: '600',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      });
    }

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);
    scene.add(camera);

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x87958d, 1.28);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.58);
    keyLight.position.set(-240, 360, 560);
    const rimLight = new THREE.DirectionalLight(0xf6f8f6, 1.1);
    rimLight.position.set(320, -200, 420);
    const liftLight = new THREE.DirectionalLight(0xe7ece7, 0.32);
    liftLight.position.set(20, 50, 280);
    scene.add(ambientLight, keyLight, rimLight, liftLight);

    const pivot = new THREE.Group();
    const mapGroup = new THREE.Group();
    mapGroup.scale.y = -1;
    pivot.add(mapGroup);
    pivot.rotation.x = THREE.MathUtils.degToRad(18);
    pivot.rotation.z = THREE.MathUtils.degToRad(-1.2);
    scene.add(pivot);

    const HIGHLIGHT_COLOR = new THREE.Color('#F27A23');
    const HIGHLIGHT_HOVER = new THREE.Color('#F16124');
    const HIGHLIGHT_EDGE = new THREE.Color('#67CADD');
    const HIGHLIGHT_EMISSIVE = new THREE.Color('#091231');
    const HIGHLIGHT_EMISSIVE_HOVER = new THREE.Color('#091231');
    const GREY_COLOR = new THREE.Color('#c7cbc7');
    const GREY_EDGE = new THREE.Color('#777f79');
    const highlightedEntries = [];

    svgData.paths.forEach((svgPath, pathIndex) => {
      const pathNode = svgPathNodes[pathIndex];
      const isHighlighted = (pathNode?.getAttribute('class') || '').includes('st0');
      const shapes = SVGLoader.createShapes(svgPath);

      const countryGroup = new THREE.Group();
      countryGroup.userData.isHighlighted = isHighlighted;

      const extrusionDepth = isHighlighted ? 24 : 6;
      const bevelThickness = isHighlighted ? 2.9 : 0.9;
      const bevelSize = isHighlighted ? 1.45 : 0.55;

      shapes.forEach((shape) => {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: extrusionDepth,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelThickness,
          bevelSize,
          bevelOffset: 0,
        });
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: isHighlighted ? HIGHLIGHT_COLOR.clone() : GREY_COLOR.clone(),
          emissive: isHighlighted ? HIGHLIGHT_EMISSIVE.clone() : new THREE.Color('#111411'),
          emissiveIntensity: isHighlighted ? 0.36 : 0.02,
          roughness: isHighlighted ? 0.33 : 0.86,
          metalness: isHighlighted ? 0.1 : 0.01,
        });

        const mesh = new THREE.Mesh(geometry, material);
        countryGroup.add(mesh);

        const edgeGeometry = new THREE.EdgesGeometry(geometry, 30);
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: isHighlighted ? HIGHLIGHT_EDGE.clone() : GREY_EDGE.clone(),
          transparent: true,
          opacity: isHighlighted ? 0.4 : 0.24,
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.position.z += 0.32;
        countryGroup.add(edges);
      });

      countryGroup.position.z = isHighlighted ? 3.4 : 0;
      countryGroup.userData.baseZ = countryGroup.position.z;
      countryGroup.userData.targetLift = countryGroup.position.z;
      countryGroup.userData.hoverMix = 0;
      countryGroup.userData.materials = countryGroup.children
        .filter((child) => child instanceof THREE.Mesh)
        .map((child) => child.material);
      countryGroup.userData.edgeMaterials = countryGroup.children
        .filter((child) => child instanceof THREE.LineSegments)
        .map((child) => child.material);

      const box = new THREE.Box3().setFromObject(countryGroup);
      const size = box.getSize(new THREE.Vector3());
      countryGroup.userData.meta = {
        center: box.getCenter(new THREE.Vector3()),
        size,
        area: size.x * size.y,
      };

      mapGroup.add(countryGroup);
      if (isHighlighted) {
        highlightedEntries.push(countryGroup);
      }
    });

    assignCountryLabels(highlightedEntries);

    const mapBox = new THREE.Box3().setFromObject(mapGroup);
    const mapCenter = mapBox.getCenter(new THREE.Vector3());
    mapGroup.position.set(-mapCenter.x, -mapCenter.y, -mapCenter.z);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(2, 2);
    let activeCountry = null;

    function entryLabel(entry) {
      return entry?.userData?.label || 'Our Presence';
    }

    function updateOverlay(countryGroup, event) {
      renderer.domElement.style.cursor = countryGroup ? 'pointer' : 'default';
      if (!(chip instanceof HTMLElement)) {
        return;
      }
      if (!countryGroup || !event) {
        overlay.style.opacity = '0';
        overlay.style.transform = 'translate3d(-9999px, -9999px, 0)';
        return;
      }

      const rect = stage.getBoundingClientRect();
      const x = Math.min(Math.max(event.clientX - rect.left + 16, 12), rect.width - 24);
      const y = Math.min(Math.max(event.clientY - rect.top - 52, 12), rect.height - 24);
      chip.textContent = entryLabel(countryGroup);
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
    }

    function setHoveredCountry(countryGroup, event) {
      activeCountry = countryGroup;
      highlightedEntries.forEach((entry) => {
        entry.userData.targetLift = entry.userData.baseZ + (entry === countryGroup ? 12.5 : 0);
      });
      updateOverlay(countryGroup, event || null);
    }

    function syncPointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(highlightedEntries, true);
      const hit = intersects[0]?.object?.parent || null;
      setHoveredCountry(hit instanceof THREE.Group ? hit : null, event);
    }

    renderer.domElement.addEventListener('pointermove', syncPointer);
    renderer.domElement.addEventListener('pointerleave', () => {
      pointer.set(2, 2);
      setHoveredCountry(null, null);
    });

    function fitCamera() {
      const width = stage.clientWidth || viewBoxWidth;
      const height = stage.clientHeight || viewBoxHeight;
      const aspect = width / Math.max(height, 1);

      renderer.setSize(width, height, false);

      const box = new THREE.Box3().setFromObject(pivot);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const padding = 0.96;
      const frustumHeight = Math.max(size.y * padding, size.x * padding / Math.max(aspect, 0.01));
      const frustumWidth = frustumHeight * aspect;

      camera.left = -frustumWidth / 2;
      camera.right = frustumWidth / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = -frustumHeight / 2;
      camera.position.set(center.x, center.y + size.y * 0.02, 1500);
      camera.lookAt(center.x, center.y - size.y * 0.01, center.z);
      camera.updateProjectionMatrix();
    }

    let resizeFrame = 0;
    function scheduleFitCamera() {
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        fitCamera();
      });
    }

    const resizeObserver = new ResizeObserver(scheduleFitCamera);
    resizeObserver.observe(stage);
    fitCamera();

    const clock = new THREE.Clock();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function animate() {
      const elapsed = clock.getElapsedTime();

      highlightedEntries.forEach((entry, index) => {
        const hoverTarget = entry === activeCountry ? 1 : 0;
        entry.userData.hoverMix += (hoverTarget - entry.userData.hoverMix) * 0.14;
        entry.position.z += (entry.userData.targetLift - entry.position.z) * 0.14;

        const ambientPulse = reduceMotion ? 0 : Math.sin(elapsed * 1.8 + index * 0.7) * 0.5 + 0.5;
        const idleMix = activeCountry ? 0 : ambientPulse * 0.04;
        const hoverPulse = reduceMotion ? 0 : (Math.sin(elapsed * 3 + index * 0.35) * 0.5 + 0.5) * entry.userData.hoverMix;
        const animatedMix = Math.min(1, idleMix + entry.userData.hoverMix * 0.3 + hoverPulse * 0.08);
        const liftScale = 1 + animatedMix * 0.008;
        entry.scale.setScalar(liftScale);

        entry.userData.materials.forEach((material) => {
          material.color.copy(HIGHLIGHT_COLOR).lerp(HIGHLIGHT_HOVER, animatedMix);
          material.emissive.copy(HIGHLIGHT_EMISSIVE).lerp(HIGHLIGHT_EMISSIVE_HOVER, animatedMix * 0.96);
          material.emissiveIntensity = 0.18 + animatedMix * 0.12;
          material.roughness = 0.36 - animatedMix * 0.04;
        });

        entry.userData.edgeMaterials.forEach((material) => {
          material.color.copy(HIGHLIGHT_EDGE);
          material.opacity = 0.4 + animatedMix * 0.1;
        });
      });

      renderer.render(scene, camera);
      window.requestAnimationFrame(animate);
    }

    animate();

    stage.dataset.mapReady = '1';
    stage.classList.add('is-ready');
    if (fallbackImage instanceof HTMLImageElement) {
      fallbackImage.style.opacity = '0';
      fallbackImage.style.visibility = 'hidden';
      fallbackImage.style.pointerEvents = 'none';
      fallbackImage.style.transition = 'opacity 220ms ease';
    }
  } catch (error) {
    console.error('West Africa map initialization failed.', error);
  }
}

function assignCountryLabels(highlightedEntries) {
  const entries = [...highlightedEntries];
  if (entries.length !== 6) {
    entries.forEach((entry) => {
      entry.userData.label = 'Our Presence';
    });
    return;
  }

  entries.sort((a, b) => b.userData.meta.area - a.userData.meta.area);
  const mali = entries.shift();
  if (mali) {
    mali.userData.label = 'Mali';
  }

  const byX = entries.sort((a, b) => a.userData.meta.center.x - b.userData.meta.center.x);
  if (byX[0]) byX[0].userData.label = 'Sierra Leone';
  if (byX[1]) byX[1].userData.label = 'Liberia';
  if (byX[2]) byX[2].userData.label = 'Burkina Faso';
  if (byX[3]) byX[3].userData.label = 'Ghana';
  if (byX[4]) byX[4].userData.label = 'Benin';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWestAfricaMap, { once: true });
} else {
  initWestAfricaMap();
}
