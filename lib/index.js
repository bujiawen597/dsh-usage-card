/**
 * Host half of the sidebar usage card.
 *
 * The card is pure browser UI: it reads the account balance through the
 * `account` Remote namespace and token totals through Session projections, so
 * the Host contributes no state of its own. The empty `apply` exists only so
 * the plugin owns a Loader row, which is what makes the package's `dsh.client`
 * declaration part of the boot graph.
 */

/** Register nothing on the Host. */
export function apply() {}
