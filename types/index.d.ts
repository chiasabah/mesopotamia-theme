/** What the card of motif buttons draws from. */
export type MesopotamiaView = {
  /** The card is asked for: the command opened it and nothing has closed it since. */
  isCardOpen?: boolean
  /** The card shows above the prompt: the surface draws no placed rows. */
  isCardInBand?: boolean
  /** The motif held, by its name, or `auto` for all of them in turn; absent before any choice. */
  choice?: string
}

declare module 'claude-code' {
  interface PluginState {
    mesopotamia: { view: Shaped<MesopotamiaView> }
  }
}
