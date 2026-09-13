import * as THREE from 'three';
import {
  holoVertexShader,
  holoFragmentShader,
  cardBackFragmentShader
} from './shaders/holoShader.js';

export const resolveAsset = (path) => {
  if (!path || path.startsWith('http') || path.startsWith('data:')) return path;
  const clean = path.replace(/^\.?\//, '');
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${clean}`;
};

export class PokemonCard {
  constructor(options = {}) {
    this.width = options.width || 4.2;
    this.height = options.height || 5.867;
    this.thickness = options.thickness || 0.03;
    this.cornerRadius = 0.22;

    this.group = new THREE.Group();
    this.textureLoader = new THREE.TextureLoader();

    this.cardFrontTextureUrl = resolveAsset(options.frontTexture || 'assets/mega_gengar_ex.png');
    this.cardBackTextureUrl = resolveAsset(options.backTexture || 'assets/card_back.webp');

    this.holoStyle = 0; // 0: Cosmos Holo, 1: Rainbow Secret, 2: Classic Foil
    this.holoIntensity = 0.85;
    this.sparkleIntensity = 0.85;

    this.init();
  }

  init() {
    this.loadTextures();
    this.createMaterials();
    this.createGeometry();
    this.buildCard();
  }

  loadTextures() {
    // Configure texture filtering for crisp card art
    const setupTexture = (tex) => {
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    this.cardFrontTex = setupTexture(this.textureLoader.load(this.cardFrontTextureUrl));
    this.cardBackTex = setupTexture(this.textureLoader.load(this.cardBackTextureUrl));
    this.patternTex = setupTexture(this.textureLoader.load(resolveAsset('assets/pattern.webp')));
    this.colorTex = setupTexture(this.textureLoader.load(resolveAsset('assets/color.webp')));
    this.glitterTex = setupTexture(this.textureLoader.load(resolveAsset('assets/glitter.png')));
    this.cosmosTex = setupTexture(this.textureLoader.load(resolveAsset('assets/cosmos.png')));

    // Enable wrapping for seamless holo shift
    this.patternTex.wrapS = THREE.RepeatWrapping;
    this.patternTex.wrapT = THREE.RepeatWrapping;
    this.colorTex.wrapS = THREE.RepeatWrapping;
    this.colorTex.wrapT = THREE.RepeatWrapping;
    this.glitterTex.wrapS = THREE.RepeatWrapping;
    this.glitterTex.wrapT = THREE.RepeatWrapping;
    this.cosmosTex.wrapS = THREE.RepeatWrapping;
    this.cosmosTex.wrapT = THREE.RepeatWrapping;
  }

  createMaterials() {
    // Front Holographic Material
    this.frontUniforms = {
      uCardTexture: { value: this.cardFrontTex },
      uPatternTexture: { value: this.patternTex },
      uColorTexture: { value: this.colorTex },
      uGlitterTexture: { value: this.glitterTex },
      uCosmosTexture: { value: this.cosmosTex },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uHoloIntensity: { value: this.holoIntensity },
      uSparkleIntensity: { value: this.sparkleIntensity },
      uHoloStyle: { value: this.holoStyle },
      uLightColor: { value: new THREE.Color(0xffffff) }
    };

    this.frontMaterial = new THREE.ShaderMaterial({
      vertexShader: holoVertexShader,
      fragmentShader: holoFragmentShader,
      uniforms: this.frontUniforms,
      transparent: true,
      side: THREE.FrontSide
    });

    // Back Material
    this.backUniforms = {
      uBackTexture: { value: this.cardBackTex }
    };

    this.backMaterial = new THREE.ShaderMaterial({
      vertexShader: holoVertexShader,
      fragmentShader: cardBackFragmentShader,
      uniforms: this.backUniforms,
      transparent: true,
      side: THREE.FrontSide
    });

    // Edge / Cardboard Core Material
    this.edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf6f6f2,
      roughness: 0.85,
      metalness: 0.05
    });
  }

  createGeometry() {
    // Front and Back planes
    this.planeGeometry = new THREE.PlaneGeometry(this.width, this.height, 32, 32);

    // Create 3D Rounded Card Body (core)
    const shape = new THREE.Shape();
    const w = this.width;
    const h = this.height;
    const r = this.cornerRadius;
    const x = -w / 2;
    const y = -h / 2;

    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    const extrudeSettings = {
      depth: this.thickness,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015
    };

    this.coreGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    this.coreGeometry.center();
  }

  buildCard() {
    // Card core (physical edge and body)
    this.coreMesh = new THREE.Mesh(this.coreGeometry, this.edgeMaterial);
    this.coreMesh.castShadow = true;
    this.coreMesh.receiveShadow = true;
    this.group.add(this.coreMesh);

    // Front Face (holographic)
    this.frontMesh = new THREE.Mesh(this.planeGeometry, this.frontMaterial);
    this.frontMesh.position.z = (this.thickness / 2) + 0.016;
    this.group.add(this.frontMesh);

    // Back Face
    this.backMesh = new THREE.Mesh(this.planeGeometry, this.backMaterial);
    this.backMesh.position.z = -(this.thickness / 2) - 0.016;
    this.backMesh.rotation.y = Math.PI; // Face outwards towards the back
    this.group.add(this.backMesh);
  }

  setCardTexture(url) {
    const fullUrl = resolveAsset(url);
    const tex = this.textureLoader.load(fullUrl, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      this.frontUniforms.uCardTexture.value = t;
    });
  }

  setHoloStyle(styleIndex) {
    this.holoStyle = styleIndex;
    this.frontUniforms.uHoloStyle.value = styleIndex;
  }

  setHoloIntensity(intensity) {
    this.holoIntensity = intensity;
    this.frontUniforms.uHoloIntensity.value = intensity;
  }

  update(time, pointer) {
    this.frontUniforms.uTime.value = time;
    this.frontUniforms.uPointer.value.set(pointer.x, pointer.y);
  }
}
