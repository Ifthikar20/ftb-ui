/**
 * The ONE place that knows how to reach a human.
 *
 * Temporary: a plain support mailbox. When the in-app ticket system
 * lands, the Contact page swaps this mailto for a ticket form and this
 * constant becomes the fallback channel. Keep the address in sync with
 * whatever inbox is actually monitored (currently a placeholder on the
 * same domain as sales@cansee.ai).
 */
export const SUPPORT_EMAIL = 'support@cansee.ai'

/** Prefilled subject so mailbox filters can route these. */
export const SUPPORT_SUBJECT = 'Cansee support request'
