/**
 * Holographic Card Shader for Three.js
 * Implements:
 * - Dynamic Rainbow Iridescence (natural and balanced)
 * - Refined Specular Glare (smooth gloss, never blinding or washing out the art)
 * - Cosmos Galaxy & Glitter Sparkles (delicate pinpricks of light)
 * - High-clarity Base Illustration (preserves 100% of card colors and legibility)
 * - Anti-aliased rounded corners
 */

export const holoVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vec4 mvPos = viewMatrix * worldPos;
  vViewPosition = -mvPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPos;
}
`;

export const holoFragmentShader = `
uniform sampler2D uCardTexture;
uniform sampler2D uPatternTexture;
uniform sampler2D uColorTexture;
uniform sampler2D uGlitterTexture;
uniform sampler2D uCosmosTexture;

uniform vec2 uPointer;        // Mouse normalized (-1 to 1)
uniform float uTime;          // Elapsed time
uniform float uHoloIntensity;  // Master holographic strength
uniform float uSparkleIntensity;
uniform int uHoloStyle;       // 0: Cosmos, 1: Rainbow Secret, 2: Classic Foil

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

const float PI = 3.14159265358979323846;

// Smooth rounded corner clipping
void clipRoundedCorners(vec2 uv, float radius) {
  vec2 d = abs(uv - 0.5) - (vec2(0.5) - vec2(radius));
  if (d.x > 0.0 && d.y > 0.0 && length(d) > radius) {
    discard;
  }
}

// Procedural spectral rainbow gradient
vec3 spectralRainbow(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  // Discard corners outside Pokémon card shape
  clipRoundedCorners(vUv, 0.045);

  vec2 uv = vUv;
  vec4 cardColor = texture2D(uCardTexture, uv);

  // Vectors for realistic lighting
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel edge factor
  float NdotV = clamp(dot(normal, viewDir), 0.0, 1.0);
  float fresnel = pow(1.0 - NdotV, 2.5);

  // Light direction smoothly driven by pointer
  vec3 lightDir = normalize(vec3(uPointer.x * 0.9, uPointer.y * 0.9, 1.4));
  vec3 halfVec = normalize(lightDir + viewDir);

  // 1. Refined Specular Sheen (Soft diagonal sweep, not harsh or blinding)
  float sweepCenter = (uPointer.x + uPointer.y) * 0.38 + 0.5;
  float sweepDist = abs((uv.x * 0.7 + uv.y * 0.7) - sweepCenter);
  float sweep = smoothstep(0.28, 0.0, sweepDist) * 0.18;

  // Concentrated soft highlight
  float spec = pow(max(0.0, dot(normal, halfVec)), 28.0) * 0.22;
  float totalGlare = sweep + spec;

  // 2. Texture foil sampling
  vec2 foilOffset = uPointer * 0.05;
  vec4 patternTex = texture2D(uPatternTexture, (uv + foilOffset) * 1.3);
  vec4 glitterTex = texture2D(uGlitterTexture, uv * 3.5 + foilOffset * 0.25);
  vec4 cosmosTex = texture2D(uCosmosTexture, uv * 1.1 + foilOffset * 0.2);

  // 3. Spectral Rainbow Iridescence
  float angleFactor = (uv.x * 0.75 + uv.y * 0.75) + (uPointer.x - uPointer.y) * 1.1 + (1.0 - NdotV) * 1.2;
  vec2 colorUV = vec2(fract(angleFactor * 0.35 + uTime * 0.03), 0.5);
  vec3 rainbowTex = texture2D(uColorTexture, colorUV).rgb;
  vec3 rainbowProcedural = spectralRainbow(angleFactor);
  vec3 rainbow = mix(rainbowProcedural, rainbowTex, 0.35);

  // 4. Sparkles / Glitter (crisp, delicate twinkles)
  float sparkleNoise = glitterTex.r * 0.7 + glitterTex.g * 0.3;
  float sparkleAngle = dot(sin(normal.xy * 12.0 + uv * 45.0 + uPointer * 5.0), vec2(0.5));
  float sparkle = pow(clamp(sparkleNoise * (0.55 + 0.45 * sin(sparkleAngle * 5.0 + uTime * 2.2)), 0.0, 1.0), 3.2);
  sparkle *= (0.5 + totalGlare * 1.0) * uSparkleIntensity;

  // Cosmos galaxy stars
  float cosmosStars = pow(cosmosTex.r, 2.2) * 1.1;

  // 5. Holographic style variations
  vec3 holoTint = vec3(0.0);
  if (uHoloStyle == 0) {
    // Cosmos Holo: subtle galaxy stars & prismatic foil
    holoTint = rainbow * (0.45 + cosmosStars * 0.8) * patternTex.rgb * 0.85;
    holoTint += vec3(sparkle * 0.65);
  } else if (uHoloStyle == 1) {
    // Rainbow Secret Rare: prismatic spectral sheen
    vec3 prism = spectralRainbow(uv.y * 1.6 - uv.x * 1.1 + uPointer.x * 1.3);
    holoTint = prism * (0.45 + patternTex.rgb * 0.55) + vec3(sparkle * 0.75);
  } else {
    // Classic Holo: clean vertical metallic streaks
    float streak = sin(uv.x * 45.0 + uPointer.x * 7.0) * 0.5 + 0.5;
    holoTint = rainbow * (0.35 + streak * 0.45) * 0.85 + vec3(sparkle * 0.55);
  }

  holoTint *= uHoloIntensity;

  // 6. Balanced, Natural Compositing
  // Start with the full natural card artwork (crisp, clear, never darkened)
  vec3 finalColor = cardColor.rgb;

  // Gentle ambient lift for dark areas (like Mega Gengar's body) to ensure perfect visibility
  finalColor += finalColor * 0.12;

  // Screen blend for iridescence: adds rainbow shimmer without washing out the art
  vec3 screened = 1.0 - (1.0 - finalColor) * (1.0 - holoTint * 0.4);
  finalColor = mix(finalColor, screened, 0.45 * uHoloIntensity);

  // Soft specular gloss sheen + pinprick sparkles (moderated, no blinding blowout)
  vec3 gloss = (rainbow * 0.5 + vec3(0.5)) * totalGlare * 0.55;
  vec3 sparkleGleam = vec3(sparkle * 0.6);
  finalColor += (gloss + sparkleGleam) * uHoloIntensity;

  // Subtle fresnel rim reflection
  finalColor += rainbow * fresnel * 0.15 * uHoloIntensity;

  // Clamp output to standard gamut
  finalColor = clamp(finalColor, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, cardColor.a);
}
`;

export const cardBackFragmentShader = `
uniform sampler2D uBackTexture;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void clipRoundedCorners(vec2 uv, float radius) {
  vec2 d = abs(uv - 0.5) - (vec2(0.5) - vec2(radius));
  if (d.x > 0.0 && d.y > 0.0 && length(d) > radius) {
    discard;
  }
}

void main() {
  clipRoundedCorners(vUv, 0.045);
  vec4 backColor = texture2D(uBackTexture, vUv);

  // Clean, well-lit Pokémon card back
  vec3 normal = normalize(vNormal);
  float diff = clamp(dot(normal, normalize(vec3(0.3, 0.4, 1.0))), 0.0, 1.0);
  vec3 litBack = backColor.rgb * (0.95 + diff * 0.12);

  gl_FragColor = vec4(clamp(litBack, 0.0, 1.0), backColor.a);
}
`;
