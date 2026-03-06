/**
 * HideMessages — Kettu Plugin (Mobile)
 * Ported from Vencord/Equicord by yash
 *
 * Temporarily hides messages from view until the app is restarted.
 * Uses Kettu's mobile-compatible long-press action sheet API.
 */

import { definePlugin } from "@kettu/core";
import { defineSettings, SettingType } from "@kettu/core/settings";
import { registerMessageAction } from "@kettu/api/messageActions";
import { Dispatcher } from "@kettu/discord/dispatcher";
import type { Message } from "@kettu/discord/types";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const settings = defineSettings({
    enabled: {
        type: SettingType.BOOLEAN,
        label: "Enable Hide button",
        description: "Show a 'Hide' option in the message long-press action sheet.",
        default: true,
    },
});

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Dispatches a local MESSAGE_DELETE so Discord removes the message from
 * the in-memory cache. Nothing is deleted server-side; the message comes
 * back after the app is fully restarted.
 */
function hideMessage(message: Message): void {
    Dispatcher.dispatch({
        type: "MESSAGE_DELETE",
        id: message.id,
        channelId: message.channel_id,
        mlDeleted: true,
    });
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default definePlugin({
    name: "HideMessages",
    description: "Temporarily hide messages until you restart the app.",
    version: "1.0.0",
    authors: ["yash"],
    settings,

    onLoad() {
        // registerMessageAction adds an entry to the long-press action sheet —
        // the mobile equivalent of a context menu / popover button.
        registerMessageAction({
            id: "kettu-hidemessages",
            label: "Hide Message",

            // Only show the action if the setting is enabled
            isVisible: () => settings.get("enabled"),

            onPress: (message: Message) => hideMessage(message),
        });
    },

    onUnload() {
        // Kettu cleans up registered actions automatically on plugin disable.
    },
});
