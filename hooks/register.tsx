import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer } from 'claude-code'

import { MOTIFS } from './motifs'
import { CYCLE_SECONDS, SLOT_SECONDS, sceneSvg } from './scene'

// Mesopotamia: a Kurdish rug climbing the right edge of the Claude desktop window, and small dithered ASCII
// motifs that take turns beside the chat. The app keeps its own dark colors; only the ground behind it changes.
//
//   /mesopotamia                 turn it on and open the card of motif buttons
//   /mesopotamia next            the next motif, held
//   /mesopotamia tea | çay | …   one motif by name, held
//   /mesopotamia auto            all ten in turn again, one every two minutes
//   /mesopotamia off             back to the app's own look, for this session

const PLUGIN = 'mesopotamia'
// The app keeps one drawing for each scene name and does not draw a name afresh while it stands. So the name carries
// the look's build: a changed look is a new name and is always drawn anew. Raise it with every change to the scene.
const BUILD = 11
const COMMAND = 'mesopotamia'
const CARD = 'motifs'
// Kept across sessions: `auto`, or a motif's name in plain letters.
const KEPT = 'motif'
const ALT = 'A Kurdish rug on dark charcoal climbing the right edge: red stepped medallions, ram horns and chukar-bar borders; beside the chat, a small dithered ASCII motif, named in a faint caption'
// Frosted glass over the chat and the panels: a deep blur under a thin, slightly warm tint, so the scene's glows and
// the rug melt into soft light behind the words while the tint stays light enough to let that light through.
const GLASS = { blur: 24, tint: '#231f1e', opacity: 0.4 }
// What a person may type for each motif besides its own name, in the motifs' order.
const ENGLISH = ['sun', 'mountains', 'partridge', 'pomegranate', 'fire', 'ram', 'tea', 'oak', 'lute', 'flower'] as const

/** Which motif stands beside the chat: one held, by its place in the round, or all of them in turn. */
type Choice = number | 'auto'
type CardElements = Pick<ReturnType<EngineInterface['ui']['resolve']>, 'Box' | 'Text' | 'Button'>

// What the card draws from. The loader's scan reads this reference: both names are written as string literals.
const view = atom({ plugin: 'mesopotamia', key: 'view' } as const, {}, { shape: 'view-1' })

let choice: Choice = 'auto'
// The person cleared it with /mesopotamia off: nothing puts it back but the command.
let isOff = false
// Another plugin's backdrop was drawn after this one: the person chose it, so this one stays away until the command.
let isYielded = false
// The first prompt since this module loaded has not come yet: the backdrop is set once more then.
let isBeforeFirstPrompt = true
let retries: Timer[] = []
// Each scene as last built, by its name, and when.
const built = new Map<string, { source: string; at: number }>()

/** Plain lower-case letters: `Çay` and `cay` are one word. */
function plain(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const sceneName = (which: Choice): string => `${PLUGIN}-${BUILD}-${which}`

/** What a scene name of this plugin's asks for, any build's; nothing for another plugin's. */
function choiceOf(name: string): Choice | undefined {
  if (!name.startsWith(`${PLUGIN}-`)) return undefined
  const index = Number(name.slice(name.lastIndexOf('-') + 1))

  return Number.isInteger(index) && index >= 0 && index < MOTIFS.length ? index : 'auto'
}

/** The motif a word names, by its Kurdish name, its English one, or its number from 1. */
function motifOf(word: string): number | undefined {
  const index = MOTIFS.findIndex((motif, i) => plain(motif.name) === word || ENGLISH[i] === word || String(i + 1) === word)

  return index < 0 ? undefined : index
}

/** The drawing for a scene name. The round follows the clock, so a kept drawing of it goes stale and is built again. */
function sourceOf(name: string): string | undefined {
  const which = choiceOf(name)
  if (which === undefined) return undefined
  const now = Date.now()
  const kept = built.get(name)
  if (kept !== undefined && (which !== 'auto' || now - kept.at < 60_000)) return kept.source
  const source = which === 'auto' ? sceneSvg((now / 1000) % CYCLE_SECONDS) : sceneSvg(0, which)
  built.set(name, { source, at: now })

  return source
}

/** Sets the backdrop and answers why nothing draws it, if so. */
async function show($: EngineInterface): Promise<string | undefined> {
  const look: ThemeSetArgs = { backdrop: { scene: sceneName(choice), glass: GLASS }, overrideColorScheme: 'dark' }
  const set = await $.theme.set(look)

  return set.isDrawn ? undefined : set.reason
}

/** Sets it unless the person turned it off or chose another backdrop; a failure waits for the next try. */
async function showQuietly($: EngineInterface): Promise<void> {
  if (isOff || isYielded) return

  try {
    await show($)
  } catch {
    // The next try: a timer, a window joining, the first prompt, or the command.
  }
}

/** Takes a choice of motif: kept for the next sessions, marked on the card, and shown. */
async function choose($: EngineInterface, which: Choice): Promise<string> {
  choice = which
  isOff = false
  isYielded = false
  const motif = which === 'auto' ? undefined : MOTIFS[which]
  await $.store.set(KEPT, motif === undefined ? 'auto' : plain(motif.name))
  await update($, view, was => ({ ...was, choice: motif === undefined ? 'auto' : motif.name }))
  const reason = await show($)
  const said = motif === undefined ? 'All ten motifs in turn, one every two minutes.' : `${motif.name}, ${motif.gloss}, held.`

  return reason === undefined ? said : `${said} Nothing draws it here: ${reason}`
}

/** The motif after the one on show: after the held one, or after the one whose turn the clock says it is. */
function nextMotif(): number {
  const now = choice === 'auto' ? Math.floor(((Date.now() / 1000) % CYCLE_SECONDS) / SLOT_SECONDS) : choice

  return (now + 1) % MOTIFS.length
}

/**
 * The card: one button for each motif, in two rows since a row does not wrap in the desktop app, and the round, the
 * next one and Close at its head. The desktop draws a button's `label` and never its children, so both say the same.
 */
function card($: EngineInterface, { Box, Text, Button }: CardElements, chosen: string | undefined) {
  const button = (key: string, word: string, onPress: () => Promise<unknown>) => (
    <Button key={key} label={word} onPress={() => void onPress()}>
      {word}
    </Button>
  )
  const row = (from: number, to: number) => (
    <Box key={`row-${from}`} flexDirection="row" gap={1}>
      {MOTIFS.slice(from, to).map((motif, i) => button(`motif-${from + i}`, `${chosen === motif.name ? '✓ ' : ''}${motif.name}`, () => choose($, from + i)))}
    </Box>
  )

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} gap="xs">
      <Box flexDirection="row" gap={1}>
        <Text bold>Mesopotamia</Text>
        {button('auto', `${chosen === undefined || chosen === 'auto' ? '✓ ' : ''}All in turn`, () => choose($, 'auto'))}
        {button('next', 'Next', () => choose($, nextMotif()))}
        <Button key="close" label="Close" role="dismiss" autoFocus onPress={() => void update($, view, was => ({ ...was, isCardOpen: false, isCardInBand: false }))}>
          Close
        </Button>
      </Box>
      {row(0, 5)}
      {row(5, 10)}
    </Box>
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A refused name must not cost the session its backdrop.
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Mesopotamia backdrop: /mesopotamia opens the motif buttons; next | auto | <motif> | off',
      })
    } catch (error) {
      void $.ui.toast(`mesopotamia: /${COMMAND} is not available (${String(error)})`)
    }

    try {
      const kept = await $.store.get(KEPT)
      choice = typeof kept === 'string' ? (motifOf(kept) ?? 'auto') : 'auto'
    } catch {
      choice = 'auto'
    }

    await showQuietly($)
    // And again a little later, three times: a set made while the session starts, or while an earlier load of this
    // mod is still being taken down, can be lost, and the answer does not say so. A name that stands is not drawn
    // again, so a set that was not needed changes nothing.
    for (const timer of retries) timer.cancel()
    retries = [3_000, 10_000, 30_000].map(ms => $.clock.after(ms, () => void showQuietly($)))

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // Once at the first prompt, for a window that was not there yet when the session started.
    if (isBeforeFirstPrompt) {
      isBeforeFirstPrompt = false
      await showQuietly($)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // A window that opens this session after it started (a session picked in the app's list) joins here: set the
  // backdrop for it then, so it does not wait for a prompt or for the command.
  on('session.attach', async ($, e, next) => {
    const joined = await next(e)

    if (e.surface === 'desktop' || e.surface === 'mobile') {
      await showQuietly($)
    }

    return joined
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const word = plain(e.args.trim())

    if (word === 'off') {
      isOff = true
      await update($, view, was => ({ ...was, isCardOpen: false, isCardInBand: false }))
      await $.theme.clear()

      return { text: 'Mesopotamia is off for this session. /mesopotamia brings it back.' }
    }

    if (word === '') {
      isOff = false
      isYielded = false
      const reason = await show($)
      // A surface that draws no placed rows gets the card above the prompt.
      const placed = await $.ui.place({ id: CARD })
      await update($, view, was => ({ ...was, isCardOpen: true, isCardInBand: !placed.isPlaced }))

      return { text: reason === undefined ? 'Mesopotamia is on. Pick a motif on the card.' : `Mesopotamia is set, but nothing draws it here: ${reason}` }
    }

    if (word === 'auto' || word === 'all') return { text: await choose($, 'auto') }
    if (word === 'next') return { text: await choose($, nextMotif()) }
    if (word === 'list') return { text: MOTIFS.map((motif, i) => `${i + 1}. ${motif.name} (${ENGLISH[i]}): ${motif.gloss}`).join('\n') }

    const motif = motifOf(word)

    return { text: motif === undefined ? `Unknown: ${e.args.trim()}. Use /mesopotamia next | auto | list | off, or a motif's name.` : await choose($, motif) }
  }).catch(() => ({ text: 'Mesopotamia could not be changed.' }))

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const source = sourceOf(e.props.scene)

    if (source === undefined) {
      // Someone else's backdrop stands now.
      isYielded = true

      return next(e)
    }

    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={source} alt={ALT} isInteractive />
  })

  on('ui.render', { component: 'Placed' }, async ($, e, next) => {
    if (e.props.plugin !== PLUGIN || e.props.id !== CARD) {
      return next(e)
    }

    const now = await read($, view)

    // Put away, or shown above the prompt instead: a placed row whose hook passes draws nothing.
    if (now.isCardOpen !== true || now.isCardInBand === true) {
      return next(e)
    }

    return card($, $.ui.resolve(e), now.choice)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, view)

    if (now.isCardOpen !== true || now.isCardInBand !== true) {
      return next(e)
    }

    return card($, $.ui.resolve(e), now.choice)
  })
}
