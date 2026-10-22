import { Center, Grid, Sparkles, Text3D } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Glitch,
  Noise,
  Scanline,
  Vignette,
} from "@react-three/postprocessing"
import { easing } from "maath"
import { BlendFunction, GlitchMode } from "postprocessing"
import { Suspense, useLayoutEffect, useRef } from "react"
import { Color, type Group, type MeshStandardMaterial, Vector2 } from "three"
import type { Tone } from "./use-timer"

const FONT = `${import.meta.env.BASE_URL}fonts/chakra-petch-bold.typeface.json`

/** Main colour and its offset "ghost" for each tone: the ctOS cyan/crimson split, then amber, then red. */
const PALETTE: Record<Tone, { main: string; ghost: string }> = {
  calm: { main: "#2cc9f0", ghost: "#ff2e63" },
  warn: { main: "#f5a524", ghost: "#ff2e63" },
  final: { main: "#ff2e63", ghost: "#2cc9f0" },
  done: { main: "#ff4040", ghost: "#2cc9f0" },
}

const SIZE = 1
/** Every digit gets the same slot, so a narrow "1" doesn't shift the clock. */
const DIGIT_SLOT = 0.74
const COLON_SLOT = 0.38
/** Glyphs sit on the baseline; this centres their 0.7 cap height on the origin. */
const BASELINE = -0.35

const EXTRUDE = {
  height: 0.22,
  curveSegments: 2,
  bevelEnabled: true,
  bevelSize: 0.012,
  bevelThickness: 0.02,
  bevelSegments: 1,
} as const

const slotOf = (char: string) => (char === ":" ? COLON_SLOT : DIGIT_SLOT)

interface GlyphProps {
  readonly char: string
  readonly x: number
  readonly tone: Tone
  readonly dim: boolean
}

/** One character, extruded. When it changes it drops in from above, flipping and flaring. */
function Glyph({ char, x, tone, dim }: GlyphProps) {
  const group = useRef<Group>(null)
  const material = useRef<MeshStandardMaterial>(null)
  const ghost = useRef<MeshStandardMaterial>(null)
  const color = useRef(new Color(PALETTE[tone].main))

  useLayoutEffect(() => {
    if (!group.current || !material.current || char === ":") return
    group.current.position.y = 0.55
    group.current.rotation.x = -1.1
    material.current.emissiveIntensity = 5
  }, [char])

  useFrame((state, dt) => {
    const g = group.current
    const m = material.current
    if (!g || !m) return
    easing.damp(g.position, "y", 0, 0.16, dt)
    easing.damp(g.rotation, "x", 0, 0.2, dt)
    // The last ten seconds beat once a second; time's up flickers.
    const t = state.clock.elapsedTime
    const base =
      tone === "final"
        ? 1.6 + Math.max(0, Math.sin(t * Math.PI * 2)) * 1.6
        : tone === "done"
          ? Math.sin(t * 22) > 0
            ? 2.6
            : 0.4
          : 1.4
    easing.damp(m, "emissiveIntensity", dim ? base * 0.25 : base, 0.12, dt)
    easing.dampC(color.current, PALETTE[tone].main, 0.25, dt)
    m.color.copy(color.current)
    m.emissive.copy(color.current)
    if (ghost.current) easing.dampC(ghost.current.emissive, PALETTE[tone].ghost, 0.25, dt)
  })

  return (
    <group position={[x, 0, 0]}>
      <group ref={group}>
        <Center disableY disableZ cacheKey={char} position={[0, BASELINE, 0]}>
          <Text3D font={FONT} size={SIZE} {...EXTRUDE}>
            {char}
            <meshStandardMaterial
              ref={material}
              color={PALETTE[tone].main}
              emissive={PALETTE[tone].main}
              emissiveIntensity={1.4}
              metalness={0.4}
              roughness={0.3}
              toneMapped={false}
            />
          </Text3D>
        </Center>
        {/* The same glyph, offset and translucent behind it: the HUD's RGB split. */}
        <Center disableY disableZ cacheKey={char} position={[-0.045, BASELINE + 0.03, -0.18]}>
          <Text3D font={FONT} size={SIZE} {...EXTRUDE}>
            {char}
            <meshStandardMaterial
              ref={ghost}
              color="#000000"
              emissive={PALETTE[tone].ghost}
              emissiveIntensity={dim ? 0.3 : 1.2}
              transparent
              opacity={0.45}
              depthWrite={false}
              toneMapped={false}
            />
          </Text3D>
        </Center>
      </group>
    </group>
  )
}

interface ClockProps {
  readonly text: string
  readonly tone: Tone
  readonly dim: boolean
  readonly blink: boolean
}

function Clock({ text, tone, dim, blink }: ClockProps) {
  const group = useRef<Group>(null)
  const { viewport } = useThree()
  const chars = [...text]
  const width = chars.reduce((sum, c) => sum + slotOf(c), 0)
  // Fill most of the width, but don't let a short clock get comically big.
  const scale = Math.min(2.1, (viewport.width * 0.86) / width)

  let cursor = -width / 2
  const placed = chars.map((char, index) => {
    const x = cursor + slotOf(char) / 2
    cursor += slotOf(char)
    // Keyed by position, so each slot animates only when its own digit changes.
    return { key: `${index}-${chars.length}`, char, x }
  })

  useFrame((state, dt) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    easing.damp(group.current.rotation, "y", Math.sin(t * 0.35) * 0.08, 0.5, dt)
    easing.damp(group.current.rotation, "x", Math.sin(t * 0.27) * 0.03, 0.5, dt)
  })

  return (
    <group ref={group} scale={scale} position={[0, 0.15, 0]}>
      {placed.map(({ key, char, x }) => (
        <Glyph key={key} char={char} x={x} tone={tone} dim={dim || (char === ":" && !blink)} />
      ))}
    </group>
  )
}

/** The camera leans a little toward the pointer. */
function Rig() {
  useFrame((state, dt) => {
    easing.damp3(
      state.camera.position,
      [state.pointer.x * 0.7, 0.5 + state.pointer.y * 0.35, 9],
      0.6,
      dt,
    )
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

const ABERRATION = new Vector2(0.0012, 0.0008)

export function Scene(props: ClockProps) {
  const { tone } = props
  return (
    <Canvas
      style={{ position: "absolute", inset: 0 }}
      camera={{ position: [0, 0.5, 9], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: false }}
    >
      <color attach="background" args={["#0c0710"]} />
      <fog attach="fog" args={["#0c0710", 9, 26]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[-6, 4, 6]} color="#2cc9f0" intensity={80} />
      <pointLight position={[6, -2, 5]} color="#ff2e63" intensity={80} />

      <Suspense fallback={null}>
        <Clock {...props} />
      </Suspense>

      <Grid
        position={[0, -2.4, 0]}
        args={[10, 10]}
        infiniteGrid
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#2cc9f0"
        sectionSize={3}
        sectionThickness={1.2}
        sectionColor="#ff2e63"
        fadeDistance={28}
        fadeStrength={1.5}
      />
      <Sparkles count={60} scale={[16, 6, 6]} size={2} speed={0.3} color="#2cc9f0" opacity={0.5} />
      <Rig />

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.25} intensity={1.1} radius={0.7} />
        <ChromaticAberration offset={ABERRATION} />
        <Noise opacity={0.07} blendFunction={BlendFunction.OVERLAY} />
        <Scanline density={1.3} opacity={0.12} />
        <Vignette offset={0.25} darkness={0.75} />
        <Glitch
          active={tone === "done"}
          mode={GlitchMode.SPORADIC}
          delay={new Vector2(0.4, 1.2)}
          duration={new Vector2(0.1, 0.3)}
          strength={new Vector2(0.2, 0.5)}
        />
      </EffectComposer>
    </Canvas>
  )
}
